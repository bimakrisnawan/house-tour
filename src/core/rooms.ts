// Rooms with net sizes from blender/rumah/denah.json (rooms.test keeps them equal). Centres are world positions
// in glTF axes (x = Blender x, z = -Blender y), computed from the plan camera Cam_Denah by build_web.py and
// copied here; w spans x, d spans z.
export const ROOMS = [
  { id: 'teras', name: 'Teras', w: 1.75, d: 1.5, x: 14.73, z: -3.4 },
  { id: 'carport', name: 'Carport', w: 2.5, d: 4.0, x: 11.4, z: -2.15 },
  { id: 'tamu', name: 'Ruang Tamu', w: 2.8, d: 4.1, x: 14.2, z: -6.35 },
  { id: 'makan', name: 'Ruang Makan', w: 2.8, d: 4.15, x: 14.2, z: -10.47 },
  { id: 'k2', name: 'Kamar 2', w: 2.5, d: 2.85, x: 11.4, z: -6.47 },
  { id: 'wc', name: 'Kamar Mandi', w: 2.5, d: 1.5, x: 11.4, z: -8.8 },
  { id: 'k1', name: 'Kamar 1', w: 2.5, d: 2.7, x: 11.4, z: -11.05 },
  { id: 'dapur', name: 'Dapur', w: 1.95, d: 1.55, x: 14.62, z: -13.47 },
  { id: 'jemur', name: 'Ruang Jemur', w: 3.37, d: 1.7, x: 11.84, z: -13.4 },
] as const;

export type Room = (typeof ROOMS)[number];

/** Where a teleport from the plan lands (clear floor just inside the door) and which way it faces (yaw, rad). */
export const ENTRY: Record<Room['id'], [x: number, z: number, yaw: number]> = {
  teras: [14.7, -3.1, 0],
  carport: [11.4, -1.4, 0],
  tamu: [13.4, -4.9, 0],
  makan: [13.3, -9.4, 0],
  dapur: [14.0, -12.7, 0],
  k2: [12.35, -5.8, Math.PI / 2],
  wc: [12.4, -8.6, Math.PI / 2],
  k1: [12.35, -11.6, Math.PI / 2],
  jemur: [12.9, -13.4, Math.PI / 2],
};
export type RoomId = Room['id'];

/** House body without carport and terrace: flying is not allowed inside it (owner: fly only outside). */
export const HOUSE = { minX: 10, maxX: 15.75, minZ: -14.4, maxZ: -3.65, maxY: 5.2 };
export const LOT = { minX: 10, maxX: 15.75, minZ: -14.4, maxZ: 0 };

/** Room containing the point (box test with a 15 cm margin for walls), or null outside every room. */
export function roomAt(x: number, z: number): Room | null {
  for (const r of ROOMS) {
    if (Math.abs(x - r.x) <= r.w / 2 + 0.15 && Math.abs(z - r.z) <= r.d / 2 + 0.15) return r;
  }
  return null;
}

export const insideHouse = (x: number, y: number, z: number) =>
  x > HOUSE.minX && x < HOUSE.maxX && z > HOUSE.minZ && z < HOUSE.maxZ && y < HOUSE.maxY;

/** Push a point out of the house body through the nearest side (fly mode). Returns the same point if outside. */
export function pushOutOfHouse(x: number, y: number, z: number, pad = 0.4): [number, number, number] {
  if (!insideHouse(x, y, z)) return [x, y, z];
  const exits: [number, [number, number, number]][] = [
    [x - HOUSE.minX, [HOUSE.minX - pad, y, z]],
    [HOUSE.maxX - x, [HOUSE.maxX + pad, y, z]],
    [z - HOUSE.minZ, [x, y, HOUSE.minZ - pad]],
    [HOUSE.maxZ - z, [x, y, HOUSE.maxZ + pad]],
    [HOUSE.maxY - y, [x, HOUSE.maxY + pad, z]],
  ];
  return exits.sort((a, b) => a[0] - b[0])[0][1];
}
