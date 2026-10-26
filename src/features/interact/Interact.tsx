import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { Color, Mesh, MeshStandardMaterial, Quaternion, Raycaster, SRGBColorSpace, TextureLoader, Vector2, Vector3, type Object3D } from 'three';
import { insideHouse } from '../../core/rooms';
import { LAMP_LABEL, useStore, type LampGroup } from '../../state/store';
import { gate, play, updateAmbient } from '../audio/audio';
import { playerPos } from '../player/Player';
import { runtime, type Interactive } from '../scene/registry';
import { bus } from './bus';

const REACH = 2.6; // metres
const DURATION: Record<Interactive['kind'], number> = { swing: 0.9, slide: 1.1, roll: 1.2, tv: 0.2, ac: 1, lamp: 0.2 };
const ease = (t: number) => t * t * (3 - 2 * t);
const q = new Quaternion();
const ray = new Raycaster();
const center = new Vector2(0, 0);
const tmp = new Vector3();

function owner(o: Object3D | null): Interactive | undefined {
  const list = runtime[useStore.getState().variant]?.interactives ?? [];
  for (; o; o = o.parent) {
    const hit = list.find((i) => i.obj === o);
    if (hit) return hit;
  }
  return undefined;
}

function actionLabel(i: Interactive): string {
  const st = useStore.getState();
  if (i.kind === 'lamp' && i.group) return `${st.lamps[i.group] ? 'Matikan' : 'Nyalakan'} ${LAMP_LABEL[i.group].toLowerCase()}`;
  const verb = {
    swing: i.open ? 'Tutup' : 'Buka', slide: i.open ? 'Tutup' : 'Buka', roll: i.open ? 'Naikkan' : 'Turunkan',
    tv: i.open ? 'Matikan' : 'Nyalakan', ac: i.open ? 'Matikan' : 'Nyalakan', lamp: '',
  }[i.kind];
  const label = i.label.startsWith('Gorden') ? `${i.open ? 'Buka' : 'Tutup'} ${i.label.toLowerCase()}` : `${verb} ${i.label.toLowerCase()}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

let tvTexture: MeshStandardMaterial['map'] = null;
let current: Interactive | undefined; // under the crosshair, refreshed every frame
let acc = 0; // seconds since the last ambience update

function pick(): Interactive | undefined {
  const rt = runtime[useStore.getState().variant];
  if (!rt) return undefined;
  ray.far = REACH;
  ray.firstHitOnly = true;
  const hits = ray.intersectObjects(rt.pickables, false);
  return hits.length ? owner(hits[0].object) : undefined;
}

export function toggle(i: Interactive) {
  const st = useStore.getState();
  if (i.kind === 'lamp' && i.group) {
    st.toggleLamp(i.group as LampGroup); play('switch', 0.8);
    return;
  }
  const all = (runtime[st.variant]?.interactives ?? []).filter((x) => (i.link ? x.link === i.link : x === i));
  const open = !i.open;
  for (const x of all) x.open = open;
  if (i.sound === 'door') play(open ? 'door-open' : 'door-close', 0.8);
  else if (i.sound === 'gate') gate(DURATION.slide * 1.6);
  else if (i.sound === 'cloth') play('cloth', 0.8);
  else if (i.sound === 'latch') play('latch', 0.8);
  else if (i.sound === 'ac') play('toggle', 0.7);
  else play('click', 0.8);
}

function animate(i: Interactive, dt: number) {
  const dur = DURATION[i.kind] * (i.link === 'gerbang' ? 1.6 : 1);
  const target = i.open ? 1 : 0;
  if (i.t === target) return;
  i.t = Math.min(1, Math.max(0, i.t + Math.sign(target - i.t) * (dt / dur)));
  const e = ease(i.t);
  const o = i.obj;
  if (i.kind === 'swing' && i.axis && i.angle !== undefined) {
    q.setFromAxisAngle(i.axis, i.angle * e);
    o.quaternion.copy(q).multiply(i.base.quaternion);
  } else if (i.kind === 'slide' && i.offset) {
    o.position.copy(i.base.position).addScaledVector(i.offset, e);
  } else if (i.kind === 'roll' && i.scale) {
    o.scale.set(
      i.base.scale.x * (1 + (i.scale.x - 1) * e), i.base.scale.y * (1 + (i.scale.y - 1) * e), i.base.scale.z * (1 + (i.scale.z - 1) * e),
    );
  } else if (i.kind === 'tv') {
    o.traverse((m) => {
      if ((m as Mesh).isMesh) ((m as Mesh).material as MeshStandardMaterial).emissiveIntensity = 1.4 * e;
    });
  }
  o.updateMatrixWorld(true);
}

/** The TV shows the poster render: planar UVs on the screen (its own UVs are the lightmap layout). */
function screenUVs() {
  const tv = runtime.renovasi?.interactives.find((i) => i.kind === 'tv');
  if (!tvTexture) return;
  tv?.obj.traverse((m) => {
    const mesh = m as Mesh;
    if (!mesh.isMesh || mesh.userData.screenUV) return;
    const mat = (mesh.material as MeshStandardMaterial).clone();
    mat.emissiveMap = tvTexture; mat.emissive = new Color(1, 1, 1); mat.emissiveIntensity = 0;
    mesh.material = mat;
    const g = mesh.geometry; g.computeBoundingBox();
    const b = g.boundingBox!; const pos = g.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let k = 0; k < pos.count; k++) {
      uv[k * 2] = (b.max.z - pos.getZ(k)) / (b.max.z - b.min.z); // viewer faces -x: right is -z
      uv[k * 2 + 1] = (pos.getY(k) - b.min.y) / (b.max.y - b.min.y);
    }
    const lm = g.attributes.uv1 ?? g.attributes.uv;
    g.setAttribute('uv', new (lm.constructor as typeof import('three').BufferAttribute)(uv, 2));
    if (!g.attributes.uv1) g.setAttribute('uv1', lm);
    mesh.userData.screenUV = true;
  });
}

export function Interact() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const set = useStore((s) => s.set);
  const loader = useMemo(() => new TextureLoader(), []);

  useEffect(() => {
    loader.load('/poster/hero-960.webp', (t) => { t.colorSpace = SRGBColorSpace; tvTexture = t; });
  }, [loader]);

  // the action under the crosshair (E key, click while looking around, the Aksi button)
  useEffect(() => {
    const act = () => {
      const st = useStore.getState();
      if (st.tool !== 'none' || st.menuOpen) return;
      const i = current; if (i) toggle(i);
    };
    const onKey = (e: KeyboardEvent) => { if (e.code === 'KeyE' && !e.repeat) act(); };
    const onClick = (e: MouseEvent) => { if (document.pointerLockElement && e.button === 0) act(); };
    // touch: tapping an object within reach uses it directly
    const onTap = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || useStore.getState().tool !== 'none') return;
      const r = gl.domElement.getBoundingClientRect();
      ray.setFromCamera(new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const hit = pick(); if (hit) toggle(hit);
    };
    const offAct = bus.on('act', act);
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    gl.domElement.addEventListener('pointerup', onTap);
    return () => { offAct(); window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onClick); gl.domElement.removeEventListener('pointerup', onTap); };
  }, [camera, gl]);


  useFrame((_, dt) => {
    const st = useStore.getState();
    const rt = runtime[st.variant];
    if (!rt) return;
    screenUVs();
    for (const i of rt.interactives) animate(i, Math.min(dt, 0.05));

    ray.setFromCamera(center, camera);
    current = st.tool === 'none' ? pick() : undefined;
    const label = current ? { label: current.label, action: actionLabel(current) } : null;
    if (label?.action !== st.target?.action) set({ target: label });

    acc += dt;
    if (acc > 0.25) {
      acc = 0;
      let ac = 0;
      for (const i of rt.interactives) {
        if (i.kind === 'ac' && i.open) ac = Math.max(ac, 1 - Math.min(1, i.obj.getWorldPosition(tmp).distanceTo(camera.position) / 5));
      }
      updateAmbient(insideHouse(playerPos.x, playerPos.y + 1, playerPos.z), st.time, ac);
    }
  });
  return null;
}
