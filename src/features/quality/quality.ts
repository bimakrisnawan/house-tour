import { startTier, type Tier } from '../../core/quality';

export interface Detected { tier: Tier; gpu: string; mobile: boolean }

/**
 * First guess before any frame is drawn (ADR 0003): GPU benchmark tier from @pmndrs/detect-gpu (data served from
 * /benchmarks, no CDN), device memory and texture limits. The frame-rate monitor corrects it while touring.
 */
export async function detect(): Promise<Detected> {
  const gl = document.createElement('canvas').getContext('webgl2');
  const maxTextureSize = gl ? (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number) : 2048;
  const touch = matchMedia('(pointer: coarse)').matches;
  try {
    const { getGPUTier } = await import('@pmndrs/detect-gpu');
    const r = await getGPUTier({ benchmarksURL: '/benchmarks' });
    const mobile = r.isMobile ?? touch;
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    return { tier: startTier({ gpuTier: r.tier, isMobile: mobile, deviceMemory, maxTextureSize }), gpu: r.gpu ?? '', mobile };
  } catch {
    return { tier: touch ? 1 : 2, gpu: '', mobile: touch }; // benchmark data unreachable: a safe middle
  }
}

export const DPR_MAX: Record<Tier, number> = { 0: 0.75, 1: 1, 2: 1.5, 3: 2 };
