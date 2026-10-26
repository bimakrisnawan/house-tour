import { create } from 'zustand';
import type { Tier } from '../core/quality';
import type { RoomId } from '../core/rooms';
import type { VariantId } from '../features/scene/assets';

export type Mode = 'walk' | 'fly';
export type Tool = 'none' | 'measure' | 'photo';

// Lamp groups (ADR 0002). Daytime default matches the renders: room lights on, outdoor lights off (round 29).
export const LAMP_GROUPS = ['tamu', 'makan', 'sofa', 'dapur', 'k1', 'k2', 'wc', 'jemur', 'teras', 'carport'] as const;
export type LampGroup = (typeof LAMP_GROUPS)[number];
export const LAMP_LABEL: Record<LampGroup, string> = {
  tamu: 'Lampu ruang tamu', makan: 'Lampu ruang makan', sofa: 'Lampu meja sofa', dapur: 'Lampu dapur',
  k1: 'Lampu Kamar 1', k2: 'Lampu Kamar 2', wc: 'Lampu kamar mandi', jemur: 'Lampu ruang jemur',
  teras: 'Lampu teras & fasad', carport: 'Lampu carport & pagar',
};
/** The switch a room's light button toggles. */
export const ROOM_LAMP: Record<RoomId, LampGroup> = {
  tamu: 'tamu', makan: 'makan', dapur: 'dapur', k1: 'k1', k2: 'k2', wc: 'wc', jemur: 'jemur', teras: 'teras', carport: 'carport',
};

const PREFS_KEY = 'rumah-web:prefs';
interface Prefs { quality: Tier | 'auto'; sound: boolean }
function readPrefs(): Prefs {
  try {
    return { quality: 'auto', sound: true, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') };
  } catch {
    return { quality: 'auto', sound: true };
  }
}

export interface State {
  quality: Tier | 'auto'; // menu choice
  tier: Tier; // tier in use (auto: detected, then corrected by frame rate)
  dpr: number;
  sound: boolean;
  time: number; // 0 = midday, 1 = night
  lamps: Record<LampGroup, boolean>;
  mode: Mode;
  variant: VariantId;
  tool: Tool;
  room: RoomId | null;
  area: 'depan' | 'halaman'; // outside every room: on the street side or in the yard
  measured: boolean; // a finished two-point measurement is on screen
  planOpen: boolean; // enlarged plan
  factsOpen: boolean;
  menuOpen: boolean;
  locked: boolean; // pointer lock (desktop look)
  target: { label: string; action: string } | null; // what Aksi/E would do now
  loading: string | null;
  notice: string | null;
  set: (p: Partial<State>) => void;
  toggleLamp: (g: LampGroup) => void;
}

const prefs = readPrefs();

export const useStore = create<State>((set, get) => ({
  quality: prefs.quality,
  tier: 1,
  dpr: 1,
  sound: prefs.sound,
  time: 0,
  lamps: Object.fromEntries(LAMP_GROUPS.map((g) => [g, g !== 'teras' && g !== 'carport'])) as Record<LampGroup, boolean>,
  mode: 'walk',
  variant: 'renovasi',
  tool: 'none',
  room: null,
  area: 'depan',
  measured: false,
  planOpen: false,
  factsOpen: false,
  menuOpen: false,
  locked: false,
  target: null,
  loading: null,
  notice: null,
  set: (p) => {
    set(p);
    if ('quality' in p || 'sound' in p) {
      const { quality, sound } = get();
      try { localStorage.setItem(PREFS_KEY, JSON.stringify({ quality, sound })); } catch { /* private mode: not remembered */ }
    }
  },
  toggleLamp: (g) => set((s) => ({ lamps: { ...s.lamps, [g]: !s.lamps[g] } })),
}));
