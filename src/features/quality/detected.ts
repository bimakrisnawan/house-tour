import type { Detected } from './quality';

/** Result of the start-up detection, kept for the menu ("Otomatis" returns to it). */
export const detected: Detected = { tier: 1, gpu: '', mobile: false };
