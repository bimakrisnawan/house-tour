import { PerformanceMonitor } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useState } from 'react';
import { useStore } from '../../state/store';
import { DPR_MAX } from './quality';

/**
 * Runtime correction of the first guess: the frame rate steps render scale down (then bloom off) when it stays
 * low, and back up when there is headroom. After three flips it settles on the lower setting.
 */
export function Adaptive() {
  const tier = useStore((s) => s.tier);
  const set = useStore((s) => s.set);
  const [fx, setFx] = useState(true);
  const max = Math.min(DPR_MAX[tier], window.devicePixelRatio || 1);
  const min = Math.min(max, 0.6);

  return (
    <>
      <PerformanceMonitor
        bounds={() => [45, 58]}
        flipflops={3}
        onDecline={() => {
          const d = useStore.getState().dpr;
          if (d > min + 0.01) set({ dpr: Math.max(min, +(d - 0.25).toFixed(2)) });
          else setFx(false);
        }}
        onIncline={() => {
          const d = useStore.getState().dpr;
          if (!fx && tier >= 2) setFx(true);
          else if (d < max - 0.01) set({ dpr: Math.min(max, +(d + 0.25).toFixed(2)) });
        }}
        onFallback={() => { set({ dpr: min }); setFx(false); }}
      />
      {tier >= 2 && fx && (
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur luminanceThreshold={0.95} intensity={0.55} />
          <ToneMapping mode={ToneMappingMode.AGX} />
        </EffectComposer>
      )}
    </>
  );
}
