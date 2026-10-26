import type { Tier } from '../../core/quality';

// public/assets/scene.json, written by scripts/build-assets.mjs from the Blender manifests.
export interface GroupSlot { tex: number; ch: 'rgb' | 'r' | 'g' | 'b'; scale: number; tint: [number, number, number] }
export interface Atlas { files: string[]; groups: Record<string, GroupSlot> }
export interface Variant { lightmaps: Record<string, Atlas>; groups: { id: string; mode: 'rgb' | 'lum' }[] }
export interface SceneManifest {
  variants: Record<'renovasi' | 'eksisting', Variant>;
  env: { dalam: string; luar: string; langit: string };
  plan: string;
}

export type VariantId = 'renovasi' | 'eksisting';

/** Geometry/texture set and lightmap resolution per quality tier (ADR 0003). */
export const TIER_ASSETS: Record<Tier, { glb: 'lo' | 'md' | 'hi'; lm: '1k' | '2k' | '4k' }> = {
  0: { glb: 'lo', lm: '1k' },
  1: { glb: 'md', lm: '2k' },
  2: { glb: 'hi', lm: '2k' },
  3: { glb: 'hi', lm: '4k' }, // desktop only (startTier caps phones at tinggi)
};

export const glbUrl = (v: VariantId, t: Tier) => `/assets/${v}/${TIER_ASSETS[t].glb}.glb`;
export const lmUrl = (v: VariantId, t: Tier, file: string) => `/assets/${v}/lm/${TIER_ASSETS[t].lm}/${file.replace(/\.png$/, '.webp')}`;

let manifest: Promise<SceneManifest> | null = null;
export const loadManifest = () =>
  (manifest ??= fetch('/assets/scene.json').then((r) => {
    if (!r.ok) throw new Error(`scene.json ${r.status}`);
    return r.json();
  }));
