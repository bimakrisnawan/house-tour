import { useProgress } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { StrictMode, Suspense, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AgXToneMapping, type PerspectiveCamera } from 'three';
import { Hud } from '../features/hud/Hud';
import { Interact } from '../features/interact/Interact';
import { Measure } from '../features/measure/Measure';
import { Photo } from '../features/photo/Photo';
import { Player, SPAWN, teleport } from '../features/player/Player';
import { Adaptive } from '../features/quality/Adaptive';
import { detected } from '../features/quality/detected';
import { DPR_MAX, detect } from '../features/quality/quality';
import { Loading, Scene } from '../features/scene/Scene';
import { runtime } from '../features/scene/registry';
import { t } from '../shared/i18n/id';
import { useStore } from '../state/store';
import './tour.css';

const touch = matchMedia('(pointer: coarse)').matches;

/** Wider vertical field of view on portrait phones, so a 2.5 m room does not feel like a corridor. */
function Fov() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const aspect = useThree((s) => s.size.width / s.size.height);
  useEffect(() => {
    camera.fov = Math.min(90, 70 / Math.min(1, aspect * 1.4));
    camera.updateProjectionMatrix();
  }, [camera, aspect]);
  return null;
}

function Progress({ status }: { status: (m: string) => void }) {
  const { progress, active } = useProgress();
  useEffect(() => { if (active) status(t.loadingPct(Math.round(progress))); }, [progress, active, status]);
  return null;
}

/** ?debug exposes the live scene for the headless checks (scripts/probe). */
function Debug() {
  const three = useThree();
  useEffect(() => {
    if (location.search.includes('debug')) Object.assign(window, { __tour: { three, runtime, useStore, teleport } });
  }, [three]);
  return null;
}

function Tour({ onReady, status }: { onReady: () => void; status: (m: string) => void }) {
  const tier = useStore((s) => s.tier);
  const dpr = useStore((s) => s.dpr);
  const [ready, setReady] = useState(false);
  const done = useCallback(() => { setReady(true); onReady(); }, [onReady]);

  return (
    <>
      <Canvas
        className="tour-canvas"
        dpr={dpr}
        gl={{ antialias: tier >= 1, powerPreference: 'high-performance' }}
        camera={{ fov: 70, near: 0.05, far: 900, position: [SPAWN.x, SPAWN.y + 1.62, SPAWN.z], rotation: [0, 0, 0] }}
        onCreated={({ gl }) => { gl.toneMapping = AgXToneMapping; }}
      >
        <Fov />
        <Debug />
        <Progress status={status} />
        <Suspense fallback={ready ? <Loading text={t.loading} /> : null}>
          <Scene tier={tier} onReady={done} />
        </Suspense>
        {ready && <Player touch={touch} />}
        {ready && <Interact />}
        {ready && <Measure />}
        {ready && <Photo />}
        {ready && <Adaptive />}
      </Canvas>
      {ready && <Hud />}
    </>
  );
}

function hasWebGL2() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

export async function mountTour(el: HTMLElement, status: (msg: string) => void) {
  if (!hasWebGL2()) throw new Error(t.noWebgl);
  status(t.loading);
  const d = await detect();
  Object.assign(detected, d);
  const st = useStore.getState();
  const tier = st.quality === 'auto' ? d.tier : st.quality;
  st.set({ tier, dpr: Math.min(DPR_MAX[tier], window.devicePixelRatio || 1) });
  return new Promise<void>((resolve, reject) => {
    const root = createRoot(el, { onUncaughtError: (err) => { root.unmount(); reject(err); } });
    root.render(<StrictMode><Tour onReady={resolve} status={status} /></StrictMode>);
  });
}
