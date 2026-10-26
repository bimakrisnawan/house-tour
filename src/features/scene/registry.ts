import type { Material, Mesh, MeshStandardMaterial, Object3D, Quaternion, Vector3 } from 'three';
import type { MeshBVH } from 'three-mesh-bvh';
import type { LampGroup } from '../../state/store';

// Plain mutable registry filled when a variant loads; read every frame by player, interaction and lights.
// Kept out of React state on purpose: per-frame data must not trigger renders.

export interface Interactive {
  obj: Object3D;
  kind: 'swing' | 'slide' | 'roll' | 'tv' | 'ac' | 'lamp';
  label: string;
  link?: string;
  sound?: string;
  axis?: Vector3;
  angle?: number;
  offset?: Vector3;
  scale?: Vector3;
  group?: LampGroup;
  base: { position: Vector3; quaternion: Quaternion; scale: Vector3 };
  open: boolean;
  t: number; // 0 closed .. 1 open, eased per frame
}

export interface Emitter { material: MeshStandardMaterial; group: LampGroup; on: number }

export interface Collider { mesh: Mesh; bvh: MeshBVH; dynamic: boolean }

export interface VariantRuntime {
  root: Object3D;
  interactives: Interactive[];
  emitters: Emitter[];
  colliders: Collider[];
  unlit: Material[]; // tree billboards: dimmed with daylight
  pickables: Object3D[]; // everything a measure ray may hit
}

export const runtime: Partial<Record<'renovasi' | 'eksisting', VariantRuntime>> = {};
