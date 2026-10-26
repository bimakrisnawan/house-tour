import { useGLTF } from '@react-three/drei';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { Suspense, use, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackSide, BufferGeometry, Color, DoubleSide, ShaderMaterial, EquirectangularReflectionMapping, SRGBColorSpace, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, NoColorSpace, Object3D, TextureLoader,
  Vector3, type Texture,
} from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree, type MeshBVH } from 'three-mesh-bvh';
import type { Tier } from '../../core/quality';
import { insideHouse } from '../../core/rooms';
import { daylight } from '../../core/time';
import { LAMP_GROUPS, useStore, type LampGroup } from '../../state/store';
import { t } from '../../shared/i18n/id';
import { glbUrl, lmUrl, loadManifest, type Atlas, type VariantId } from './assets';
import { lightmapped, makeRig, type Rig } from './lightmaps';
import { runtime, type VariantRuntime } from './registry';

Mesh.prototype.raycast = acceleratedRaycast;
BufferGeometry.prototype.computeBoundsTree = computeBoundsTree as never; // drei bundles an older three-mesh-bvh typing
BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree as never;

export const rig: Rig = makeRig(['sun', 'sky', ...LAMP_GROUPS]);

/** Nearest ancestor-or-self value of a glTF extra (multi-material nodes put their meshes one level below). */
export function extra<T = unknown>(o: Object3D | null, key: string): T | undefined {
  for (; o; o = o.parent) if (o.userData[key] !== undefined) return o.userData[key] as T;
  return undefined;
}

const v3 = (a?: number[]) => (a ? new Vector3(a[0], a[1], a[2]) : undefined);
type Atlases = Record<string, { atlas: Atlas; textures: Texture[] }>;

/** The Cycles grass mixes the leafy texture with green noise; glTF keeps only the texture, so tint it to the
 *  render's olive (render/v3/00_hero.png lawn ~ sRGB 98,104,57 in sun). */
function tintGrass(m: MeshStandardMaterial) {
  m.userData.tinted = true;
  const img = m.map?.image as CanvasImageSource | undefined;
  if (!img) return;
  const c = document.createElement('canvas'); c.width = c.height = 8;
  const g = c.getContext('2d'); if (!g) return;
  g.drawImage(img, 0, 0, 8, 8);
  const px = g.getImageData(0, 0, 8, 8).data; const mean = [0, 0, 0];
  for (let i = 0; i < px.length; i += 4) for (let k = 0; k < 3; k++) mean[k] += px[i + k] / 64;
  const target = [92, 112, 52];
  m.color.setRGB(...(target.map((v, k) => Math.min(2, (v / Math.max(1, mean[k])) ** 2.2)) as [number, number, number]));
}

function prepare(variant: VariantId, root: Object3D, atlases: Atlases): VariantRuntime {
  const rt: VariantRuntime = { root, interactives: [], emitters: [], colliders: [], unlit: [], pickables: [] };
  const cache = new Map<string, MeshStandardMaterial>();
  root.updateMatrixWorld(true);

  root.traverse((o) => {
    const u = o.userData;
    if (u.interact || u.link) {
      rt.interactives.push({
        obj: o, kind: u.interact ?? 'ac', label: u.label ?? '', link: u.link, sound: u.sound,
        axis: v3(u.axis), angle: u.angle, offset: v3(u.offset), scale: v3(u.scale), group: u.emit,
        base: { position: o.position.clone(), quaternion: o.quaternion.clone(), scale: o.scale.clone() },
        open: false, t: 0,
      });
    }
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.computeBoundsTree();
    rt.pickables.push(mesh);
    if (!mesh.geometry.attributes.uv1 && mesh.geometry.attributes.uv) mesh.geometry.setAttribute('uv1', mesh.geometry.attributes.uv);

    const src = mesh.material as MeshStandardMaterial;
    if (extra(mesh, 'unlit')) {
      const m = new MeshBasicMaterial({ map: src.map, alphaTest: 0.5, side: DoubleSide });
      mesh.material = m; rt.unlit.push(m);
      return;
    }
    const atlasId = extra<string>(mesh, 'lm');
    if (atlasId && atlases[atlasId]) {
      const key = `${src.uuid}:${atlasId}`;
      let m = cache.get(key);
      if (!m) {
        m = lightmapped(src, `${variant}:${atlasId}`, atlases[atlasId].atlas, atlases[atlasId].textures, rig);
        const phys = m as MeshPhysicalMaterial;
        if (phys.transmission > 0) { phys.transmission = 0; m.transparent = true; m.opacity = 0.85; } // curtains: skip the transmission pass
        if (m.transparent) m.depthWrite = false;
        cache.set(key, m);
      }
      mesh.material = m;
      if (src.name.includes('leafy_grass') && !m.userData.tinted) tintGrass(m);
    }
    const emit = extra<LampGroup>(mesh, 'emit');
    const mat = mesh.material as MeshStandardMaterial;
    if (emit && mat.emissiveIntensity > 0 && mat.emissive.getHex() !== 0) {
      const own = mat.clone(); mesh.material = own; // switched per group, so one material per mesh
      rt.emitters.push({ material: own, group: emit, on: own.emissiveIntensity });
    }
    // ground planes (up to 800 m) break the capsule maths and are flat anyway: the player clamps to y = 0 instead
    if (extra(mesh, 'collide') === false || atlasId === 'ground') return;
    const dynamic = !!extra(mesh, 'interact') || !!extra(mesh, 'link');
    rt.colliders.push({ mesh, bvh: mesh.geometry.boundsTree as unknown as MeshBVH, dynamic });
  });
  runtime[variant] = rt;
  return rt;
}

function Variant({ id, tier, visible, onReady }: { id: VariantId; tier: Tier; visible: boolean; onReady?: () => void }) {
  const manifest = use(loadManifest());
  const v = manifest.variants[id];
  const { scene } = useGLTF(glbUrl(id, tier), false, true);
  const names = useMemo(
    () => (Object.entries(v.lightmaps) as [string, Atlas][]).flatMap(([a, at]) => at.files.map((f) => [a, lmUrl(id, tier, f)] as const)),
    [v, id, tier],
  );
  const textures = useLoader(TextureLoader, names.map((n) => n[1]));
  const gl = useThree((s) => s.gl);

  const rt = useMemo(() => {
    const atlases: Atlases = {};
    textures.forEach((t, i) => {
      t.colorSpace = NoColorSpace; t.flipY = false; t.channel = 1;
      t.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
      t.needsUpdate = true;
      const a = names[i][0];
      (atlases[a] ??= { atlas: v.lightmaps[a], textures: [] }).textures.push(t);
    });
    return prepare(id, scene, atlases);
  }, [scene, textures, names, v, id, gl]);

  useEffect(() => { onReady?.(); }, [rt, onReady]);
  useEffect(() => () => { delete runtime[id]; }, [id]);
  return <primitive object={rt.root} visible={visible} />;
}

/** Lights follow the store: time of day drives sun and sky, switches fade lamp groups in and out. */
function LightRig() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useFrame((_, dt) => {
    const { time, lamps, variant } = useStore.getState();
    const d = daylight(time);
    rig.sun.level.value = d.sun; rig.sun.tint.value.setRGB(...d.sunTint);
    rig.sky.level.value = d.sky; rig.sky.tint.value.setRGB(...d.skyTint);
    const k = 1 - Math.exp(-dt * 10);
    let lampSum = 0;
    for (const g of LAMP_GROUPS) {
      const target = variant === 'renovasi' && lamps[g] ? 1 : 0;
      rig[g].level.value += (target - rig[g].level.value) * k;
      lampSum += rig[g].level.value;
    }
    const rt = runtime[variant];
    rt?.emitters.forEach((e) => (e.material.emissiveIntensity = e.on * rig[e.group].level.value));
    // impostor leaves render ~sRGB 18 in Cycles vs ~50 in the hero render: x6 (linear) matches the poster
    rt?.unlit.forEach((m) => (m as MeshBasicMaterial).color.setScalar(6 * (0.08 + 0.92 * Math.max(d.sun, d.sky))));
    (scene.background as Color).setRGB(...d.background);
    const p = camera.position;
    scene.environmentIntensity = insideHouse(p.x, p.y, p.z) ? 0.2 + 0.6 * Math.min(1, d.sky + lampSum * 0.1) : 0.1 + 0.9 * d.sky;
  });
  return null;
}

const skyMat = new ShaderMaterial({
  side: BackSide, depthWrite: false,
  uniforms: { top: { value: new Color() }, horizon: { value: new Color() } },
  vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }',
  fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vDir; void main() { float h = clamp(vDir.y, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.6)), 1.0); }',
});

/** Gradient sky that follows the time slider (the ground hides the lower half). */
function Sky() {
  const camera = useThree((s) => s.camera);
  const ref = useRef<Mesh>(null);
  useFrame(() => {
    const d = daylight(useStore.getState().time);
    skyMat.uniforms.top.value.setRGB(...d.zenith); skyMat.uniforms.horizon.value.setRGB(...d.background);
    ref.current?.position.copy(camera.position);
  });
  return (
    <mesh ref={ref} material={skyMat} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[500, 24, 12]} />
    </mesh>
  );
}

/** Reflections: a panorama of the living room inside the house, of the front yard outside (plain LDR equirect). */
function Reflections() {
  const manifest = use(loadManifest());
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const [dalam, luar] = useLoader(TextureLoader, [`/assets/${manifest.env.dalam}`, `/assets/${manifest.env.luar}`]);
  useMemo(() => {
    for (const tex of [dalam, luar]) { tex.mapping = EquirectangularReflectionMapping; tex.colorSpace = SRGBColorSpace; }
  }, [dalam, luar]);
  useFrame(() => {
    const env = insideHouse(camera.position.x, camera.position.y, camera.position.z) ? dalam : luar;
    if (scene.environment !== env) scene.environment = env;
  });
  return null;
}

/** Shown while a variant or a new quality tier loads; the previous view stays on screen meanwhile. */
export function Loading({ text }: { text: string }) {
  useEffect(() => {
    useStore.getState().set({ loading: text });
    return () => useStore.getState().set({ loading: null });
  }, [text]);
  return null;
}

export function Scene({ tier, onReady }: { tier: Tier; onReady: () => void }) {
  const variant = useStore((s) => s.variant);
  const [eksWanted, setWanted] = useState(false);
  const [eksReady, setEksReady] = useState(false);
  useEffect(() => { if (variant === 'eksisting') setWanted(true); }, [variant]);
  const showOld = variant === 'eksisting' && eksReady;
  return (
    <>
      <color attach="background" args={[0.62, 0.74, 0.88]} />
      <Sky />
      <Reflections />
      <LightRig />
      <Variant id="renovasi" tier={tier} visible={!showOld} onReady={onReady} />
      {eksWanted && (
        <Suspense fallback={<Loading text={t.loadingOld} />}>
          <Variant id="eksisting" tier={tier} visible={showOld} onReady={() => setEksReady(true)} />
        </Suspense>
      )}
    </>
  );
}
