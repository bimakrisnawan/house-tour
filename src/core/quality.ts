export const TIERS = ['rendah', 'sedang', 'tinggi', 'ultra'] as const;
export type Tier = 0 | 1 | 2 | 3;

export interface Device {
  gpuTier: number; // @pmndrs/detect-gpu: 0 = no/blocked WebGL or < 15 fps, 3 = >= 60 fps
  isMobile: boolean;
  deviceMemory?: number; // GB, Chrome only, capped at 8
  maxTextureSize: number;
}

const clamp = (t: number) => Math.max(0, Math.min(3, t)) as Tier;

/** First guess before any frame is measured; the frame-rate monitor corrects it afterwards. */
export function startTier(d: Device): Tier {
  let t = d.gpuTier; // detect-gpu tier 0 still gets 'rendah': WebGL may work, just slowly
  if (d.isMobile && d.deviceMemory !== undefined && d.deviceMemory <= 4) t -= 1;
  if (d.isMobile) t = Math.min(t, 2); // ultra is for desktop GPUs (memory, heat)
  if (d.maxTextureSize < 4096) t = Math.min(t, 1);
  return clamp(t);
}

export const stepTier = (t: Tier, dir: 1 | -1) => clamp(t + dir);

export interface TierSettings {
  dprMax: number;
  textures: '512' | '1k';
  ao: boolean;
  bloom: boolean;
  msaa: number;
}

export const SETTINGS: Record<Tier, TierSettings> = {
  0: { dprMax: 0.75, textures: '512', ao: false, bloom: false, msaa: 0 },
  1: { dprMax: 1, textures: '1k', ao: false, bloom: false, msaa: 0 },
  2: { dprMax: 1.5, textures: '1k', ao: true, bloom: true, msaa: 4 },
  3: { dprMax: 2, textures: '1k', ao: true, bloom: true, msaa: 4 },
};
