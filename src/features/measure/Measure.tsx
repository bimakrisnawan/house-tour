import { Html, Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { Raycaster, Vector2, Vector3 } from 'three';
import { centimetres, metres } from '../../core/format';
import { useStore } from '../../state/store';
import { play } from '../audio/audio';
import { bus } from '../interact/bus';
import { runtime } from '../scene/registry';

const ray = new Raycaster();
const INK = '#4d6b47'; // --accent-ink (light set): reads on white walls and grey floors alike

/** Two clicks (or taps) on any surface: a dimension line with the distance, like on a working drawing. */
export function Measure() {
  const tool = useStore((s) => s.tool);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const [pts, setPts] = useState<Vector3[]>([]);

  useEffect(() => bus.on('measure-clear', () => setPts([])), []);
  useEffect(() => { useStore.getState().set({ measured: pts.length === 2 }); }, [pts]);
  useEffect(() => { if (tool !== 'measure') setPts([]); }, [tool]);

  useEffect(() => {
    if (tool !== 'measure') return;
    const place = (ndc: Vector2) => {
      const rt = runtime[useStore.getState().variant];
      if (!rt) return;
      ray.setFromCamera(ndc, camera); ray.firstHitOnly = true;
      const hit = ray.intersectObjects(rt.pickables, false)[0];
      if (!hit) return;
      play('click', 0.5);
      setPts((p) => (p.length >= 2 ? [hit.point.clone()] : [...p, hit.point.clone()]));
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (document.pointerLockElement) return place(new Vector2(0, 0)); // crosshair
      if (e.pointerType !== 'touch' && e.target !== gl.domElement) return;
      const r = gl.domElement.getBoundingClientRect();
      place(new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1));
    };
    // touch: a tap places a point; a drag looks around (handled by the touch controls)
    let start: [number, number] | null = null;
    const onTouchDown = (e: PointerEvent) => { if (e.pointerType === 'touch') start = [e.clientX, e.clientY]; };
    const onTouchUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || !start) return;
      if (Math.hypot(e.clientX - start[0], e.clientY - start[1]) < 10) onDown(e);
      start = null;
    };
    const mouse = (e: PointerEvent) => e.pointerType !== 'touch' && onDown(e);
    window.addEventListener('pointerdown', mouse);
    gl.domElement.addEventListener('pointerdown', onTouchDown);
    gl.domElement.addEventListener('pointerup', onTouchUp);
    return () => {
      window.removeEventListener('pointerdown', mouse);
      gl.domElement.removeEventListener('pointerdown', onTouchDown);
      gl.domElement.removeEventListener('pointerup', onTouchUp);
    };
  }, [tool, camera, gl]);

  if (tool !== 'measure' || !pts.length) return null;
  const d = pts.length === 2 ? pts[0].distanceTo(pts[1]) : 0;
  const mid = pts.length === 2 ? pts[0].clone().lerp(pts[1], 0.5) : pts[0];
  return (
    <group>
      {pts.map((p, i) => (
        <mesh key={i} position={p} renderOrder={10}>
          <sphereGeometry args={[0.02, 12, 8]} />
          <meshBasicMaterial color={INK} depthTest={false} />
        </mesh>
      ))}
      {pts.length === 2 && (
        <>
          <Line points={pts} color={INK} lineWidth={3} depthTest={false} renderOrder={10} />
          <Html position={mid} center zIndexRange={[20, 10]}>
            <span className="measure-label mono">{d < 1 ? centimetres(d) : `${metres(d)} m`}</span>
          </Html>
        </>
      )}
    </group>
  );
}
