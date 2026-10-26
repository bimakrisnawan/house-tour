// Indonesian number formatting for sizes: decimal comma, metres with 2 decimals, centimetres whole.
export const metres = (v: number) => v.toFixed(2).replace('.', ',');
export const roomSize = (w: number, d: number) => `${metres(w)} × ${metres(d)} m`;
export const centimetres = (v: number) => `${Math.round(v * 100)} cm`;
