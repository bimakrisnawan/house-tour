// Time of day as one slider t: 0 = midday, 1 = night. The sun direction is fixed by the bake (ADR 0002), so
// time changes only the strength and colour of the baked sun and sky groups and the background.

export type RGB = [number, number, number];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const x = clamp01((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

const SUN_DAY: RGB = [1, 1, 1];
const SUN_DUSK: RGB = [1, 0.62, 0.36];
const SKY_NIGHT: RGB = [0.55, 0.65, 1];
// sky dome colours (linear), day sampled from render/v3/00_hero.png
const TOP_DAY: RGB = [0.1, 0.24, 0.49];
const TOP_DUSK: RGB = [0.12, 0.13, 0.3];
const TOP_NIGHT: RGB = [0.004, 0.006, 0.018];
const BG_DAY: RGB = [0.62, 0.72, 0.82];
const BG_DUSK: RGB = [0.9, 0.48, 0.26];
const BG_NIGHT: RGB = [0.02, 0.026, 0.05];

export interface Daylight {
  sun: number;
  sunTint: RGB;
  sky: number; // world strength relative to the bake (night 0.03 / day 0.9, as in tour_full.py)
  skyTint: RGB;
  background: RGB; // horizon
  zenith: RGB;
  hour: number; // shown to the user
}

export function daylight(t: number): Daylight {
  t = clamp01(t);
  const dusk = smooth(0.25, 0.55, t) * (1 - smooth(0.6, 0.85, t));
  return {
    sun: 1 - smooth(0.35, 0.7, t),
    sunTint: mix(SUN_DAY, SUN_DUSK, smooth(0.2, 0.55, t)),
    sky: 1 - smooth(0.3, 0.9, t) * (1 - 0.03 / 0.9),
    skyTint: mix([1, 1, 1], SKY_NIGHT, smooth(0.5, 1, t)),
    background: mix(mix(BG_DAY, BG_DUSK, dusk), BG_NIGHT, smooth(0.55, 0.95, t)),
    zenith: mix(mix(TOP_DAY, TOP_DUSK, dusk), TOP_NIGHT, smooth(0.55, 0.95, t)),
    hour: 12 + 8 * t,
  };
}

export const formatHour = (h: number) => {
  const m = Math.round(h * 4) * 15; // quarter hours
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}.${String(m % 60).padStart(2, '0')}`;
};
