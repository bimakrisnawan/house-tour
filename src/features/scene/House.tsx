import { useGLTF } from '@react-three/drei';
import { useEffect } from 'react';
import type { Object3D } from 'three';

export const HOUSE_URL = '/assets/1k/rumah.glb';

/** The static house. Calls onReady with the scene root once it is in the graph (for the collider). */
export function House({ onReady }: { onReady: (root: Object3D) => void }) {
  const { scene } = useGLTF(HOUSE_URL, false, true); // meshopt decoder, no draco
  useEffect(() => onReady(scene), [scene, onReady]);
  return <primitive object={scene} />;
}
