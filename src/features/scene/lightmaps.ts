import { Color, MeshStandardMaterial, ShaderChunk, type Texture } from 'three';
import type { Atlas } from './assets';

/** Shared per-group uniforms: every lightmapped material reads the same objects, so one write updates all. */
export interface GroupUniform { level: { value: number }; tint: { value: Color } }
export type Rig = Record<string, GroupUniform>;

export const makeRig = (ids: string[]): Rig =>
  Object.fromEntries(ids.map((id) => [id, { level: { value: 0 }, tint: { value: new Color(1, 1, 1) } }]));

export const exposure = { value: 1 };

// three's lightmap block, replaced by the group mix. IBL irradiance is dropped: diffuse light comes only from the
// bake, the environment map only adds reflections.
const LM_BLOCK = `vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;`;
const IBL_LINE = 'iblIrradiance += getIBLIrradiance( geometryNormal );';
if (!ShaderChunk.lights_fragment_maps.includes(LM_BLOCK) || !ShaderChunk.lights_fragment_maps.includes(IBL_LINE)) {
  throw new Error('three.js lightmap shader chunk changed; update lightmaps.ts');
}

/**
 * Turns a glTF MeshStandardMaterial into a group-mixed lightmapped material (ADR 0002):
 * irradiance = PI * sum(decode(texel) * scale * level * tint) per light group.
 */
export function lightmapped(src: MeshStandardMaterial, atlasId: string, atlas: Atlas, textures: Texture[], rig: Rig) {
  const m = src.clone();
  m.lightMap = textures[0]; // enables USE_LIGHTMAP and the vLightMapUv varying (channel 1 = second UV set)
  const ids = Object.keys(atlas.groups).filter((g) => rig[g]);
  const decl = textures.map((_, i) => `uniform sampler2D lmT${i};`).join('\n') +
    ids.map((g) => `\nuniform float lmL_${g};\nuniform vec3 lmC_${g};`).join('') + '\nuniform float lmExposure;';
  const sample = textures.map((_, i) => `vec3 lmS${i} = pow( texture2D( lmT${i}, vLightMapUv ).rgb, vec3( 2.2 ) );`).join('\n');
  const sum = ids.map((g) => {
    const s = atlas.groups[g];
    const texel = s.ch === 'rgb' ? `lmS${s.tex}` : `vec3( lmS${s.tex}.${s.ch} )`;
    const baked = s.tint.map((c) => c.toFixed(4)).join(', '); // lamp colour from the bake, constant per group
    return `${texel} * ${s.scale.toFixed(6)} * lmL_${g} * lmC_${g} * vec3( ${baked} )`;
  }).join(' + ') || 'vec3( 0.0 )';
  const block = `${sample}
		vec3 lightMapIrradiance = ( ${sum} ) * lmExposure;`;

  m.onBeforeCompile = (shader) => {
    textures.forEach((t, i) => (shader.uniforms[`lmT${i}`] = { value: t }));
    for (const g of ids) {
      shader.uniforms[`lmL_${g}`] = rig[g].level;
      shader.uniforms[`lmC_${g}`] = rig[g].tint;
    }
    shader.uniforms.lmExposure = exposure;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lightmap_pars_fragment>', `#include <lightmap_pars_fragment>\n${decl}`)
      .replace('#include <lights_fragment_maps>', ShaderChunk.lights_fragment_maps.replace(LM_BLOCK, block).replace(IBL_LINE, ''));
  };
  m.customProgramCacheKey = () => `lm:${atlasId}:${ids.join(',')}:${textures.length}`;
  return m;
}
