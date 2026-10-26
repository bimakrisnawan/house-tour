import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FACTS } from './facts';
import { centimetres, roomSize } from './format';
import { planToWorld, worldToPlan } from './plan';
import { startTier, stepTier } from './quality';
import { HOUSE, ROOMS, insideHouse, pushOutOfHouse, roomAt } from './rooms';
import { daylight, formatHour } from './time';

describe('format', () => {
  it('uses a decimal comma and two decimals', () => {
    expect(roomSize(2.8, 4.1)).toBe('2,80 × 4,10 m');
    expect(centimetres(0.755)).toBe('76 cm');
  });
});

describe('quality tiers', () => {
  const desk = { gpuTier: 3, isMobile: false, maxTextureSize: 16384 };
  it('keeps a strong desktop at ultra', () => expect(startTier(desk)).toBe(3));
  it('caps phones at tinggi and lowers low-memory phones', () => {
    expect(startTier({ ...desk, isMobile: true })).toBe(2);
    expect(startTier({ ...desk, isMobile: true, deviceMemory: 4 })).toBe(2);
    expect(startTier({ ...desk, gpuTier: 2, isMobile: true, deviceMemory: 2 })).toBe(1);
  });
  it('never leaves 0..3 and caps small texture limits at sedang', () => {
    expect(startTier({ ...desk, gpuTier: 0, isMobile: true, deviceMemory: 1 })).toBe(0);
    expect(startTier({ ...desk, maxTextureSize: 2048 })).toBe(1);
    expect(stepTier(3, 1)).toBe(3);
    expect(stepTier(0, -1)).toBe(0);
  });
});

describe('rooms', () => {
  it('finds the room at each room centre', () => {
    for (const r of ROOMS) expect(roomAt(r.x, r.z)?.id).toBe(r.id);
  });
  it('is outside every room on the street', () => expect(roomAt(11.9, 3.5)).toBeNull());
  it('has a fact sheet for every room', () => {
    for (const r of ROOMS) expect(FACTS[r.id].length).toBeGreaterThan(2);
  });
  it('pushes a flyer out of the house through the nearest side', () => {
    expect(insideHouse(12, 2, -8)).toBe(true);
    const [x, y, z] = pushOutOfHouse(10.2, 2, -8);
    expect(x).toBeLessThan(HOUSE.minX);
    expect([y, z]).toEqual([2, -8]);
    expect(pushOutOfHouse(12, 2, 3)).toEqual([12, 2, 3]);
  });
});

describe('plan mapping', () => {
  it('round-trips and puts the living room label where denah.json has it', () => {
    const [px, py] = worldToPlan(14.2, -6.35);
    expect(px).toBeCloseTo(863, -1);
    expect(py).toBeCloseTo(663, -1);
    const [x, z] = planToWorld(px, py);
    expect(x).toBeCloseTo(14.2, 5);
    expect(z).toBeCloseTo(-6.35, 5);
  });
});

describe('time of day', () => {
  it('is full sun at midday and dark at night', () => {
    expect(daylight(0).sun).toBe(1);
    expect(daylight(1).sun).toBe(0);
    expect(daylight(1).sky).toBeCloseTo(0.03 / 0.9, 5);
  });
  it('formats the hour in Indonesian style', () => {
    expect(formatHour(daylight(0).hour)).toBe('12.00');
    expect(formatHour(daylight(1).hour)).toBe('20.00');
  });
});

// The same sizes live in the Blender folder; keep them equal (testing.md: same content in two places).
const DENAH = new URL('../../../../blender/rumah/denah.json', import.meta.url);
describe.runIf(existsSync(DENAH))('rooms match denah.json', () => {
  const NAMES: Record<string, string> = {
    teras: 'Teras', carport: 'Carport', tamu: 'R. Tamu', makan: 'R. Makan', k2: 'Kamar 2',
    wc: 'KM/WC', k1: 'Kamar 1', dapur: 'Dapur', jemur: 'R. Jemur',
  };
  const denah = JSON.parse(readFileSync(DENAH, 'utf8'));
  it.each(ROOMS.map((r) => [r.id, r] as const))('%s', (id, r) => {
    const d = denah[NAMES[id]];
    expect({ w: r.w, d: r.d }).toEqual({ w: d.w, d: d.d });
    const [px, py] = worldToPlan(r.x, r.z);
    expect(Math.abs(px - d.px)).toBeLessThan(2);
    expect(Math.abs(py - d.py)).toBeLessThan(2);
  });
});
