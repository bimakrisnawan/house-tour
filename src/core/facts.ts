import type { RoomId } from './rooms';

// Facts per room, taken from the design log blender/rumah/catatan_loop.md (rounds 1-42 and the 2026-10-23 audit).
// Planned values, not as-built measurements.
export type Fact = [label: string, value: string];

export const FACTS: Record<RoomId, Fact[]> = {
  tamu: [
    ['Lantai', 'HT 60 × 60, pola lurus'],
    ['Sofa', 'Greige 200 × 86 cm, dinding timur'],
    ['TV + konsol', 'Melayang di dinding barat'],
    ['Jalur barat', '≥ 90 cm'],
    ['Dinding aksen', 'Sage'],
    ['Lampu', 'LED wall-washer di drop ceiling, lampu meja di samping sofa'],
    ['Area masuk', 'Rak sepatu melayang 100 × 33 cm, 15 cm dari lantai'],
    ['AC', 'Split, di atas TV'],
  ],
  makan: [
    ['Meja', '140 × 75 cm, tinggi 75 cm'],
    ['Duduk', 'Bangku built-in dengan 3 laci + 2 kursi'],
    ['Atap', 'Skylight di atas meja'],
    ['Titik fokus', 'Lukisan abstrak sage-terakota'],
  ],
  dapur: [
    ['Kitchen set', 'Built-in, kabinet putih tanpa handel'],
    ['Tinggi kerja', '89 cm, top quartz 3 cm'],
    ['Masak', 'Kompor induksi tanam + oven tanam'],
    ['Jarak kompor–sink', '51 cm'],
    ['Kabinet atas', 'Putih 190 cm, lis LED di bawahnya'],
    ['Kulkas', 'Built-in, panel rata kabinet'],
  ],
  k1: [
    ['Ranjang', 'Platform oak 160 × 200 cm, 4 laci'],
    ['Sisi ranjang', '55–62 cm'],
    ['Dinding', 'Sage di belakang kepala ranjang'],
    ['Simpan', 'Kabinet atas putih di atas kepala ranjang'],
    ['Jendela', 'Jendela tinggi ke ruang jemur, roller blind'],
    ['Pintu', 'Ayun, membuka keluar'],
    ['AC', 'Split, meniup ke arah kaki ranjang'],
  ],
  k2: [
    ['Ranjang', 'Platform oak 160 × 200 cm, 4 laci'],
    ['Sisi ranjang', '55–62 cm'],
    ['Nakas', 'Oak melayang + lampu meja'],
    ['Jendela', 'Gorden wave linen 2 panel'],
    ['Pintu', 'Ayun, membuka keluar'],
    ['AC', 'Split, meniup ke arah kaki ranjang'],
  ],
  wc: [
    ['Lantai', '30 × 30 abu hangat, doff anti-licin'],
    ['Dinding', 'Keramik 30 × 60 horizontal, nat 2 mm'],
    ['Wastafel', 'Vanity oak melayang, basin putih, kran hitam'],
    ['Kloset', 'Gantung dengan tangki tanam'],
    ['Shower', 'Rain shower hitam, celah masuk kaca 75 cm'],
    ['Pintu', 'Geser ke belakang'],
  ],
  jemur: [
    ['Cuci', 'Mesin cuci front-load + 2 rak oak'],
    ['Jemur', 'Rak gantung 4 batang di plafon'],
    ['Air', 'Toren stainless ±1.000 L di menara besi, puncak 4,58 m'],
    ['AC outdoor', 'Di atas atap galvalum dapur'],
  ],
  teras: [
    ['Duduk', '2 kursi lounge rangka hitam + meja bulat oak'],
    ['Lantai', 'Dek kayu oak keabu-abuan'],
    ['Pintu depan', 'Oak, membuka 90° (door stop)'],
    ['Lampu', 'Lampu dinding hitam di kiri-kanan pintu'],
  ],
  carport: [
    ['Gerbang', 'Geser teleskopik 2 panel, parkir di balik pagar kanan'],
    ['Lantai', 'Paving abu'],
    ['Listrik', 'Inverter hybrid 3 kW + baterai LiFePO4 ±5 kWh'],
    ['Taman', 'Planter beton 30 cm dengan pakis'],
  ],
};

export const HOUSE_FACTS: Fact[] = [
  ['Lahan', '14,40 × 5,75 m'],
  ['Atap', 'Panel surya 4 × ±500 Wp menghadap utara, skylight'],
];
