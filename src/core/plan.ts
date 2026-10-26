// World <-> floor-plan image (render/v3/11_denah_atas.png, 1920 x 1080, orthographic Cam_Denah rotated 90°).
// Image x grows with Blender +y (glTF -z); image y grows with Blender +x (glTF +x).
export const PLAN = { camX: 13.125, camY: 7.2, mPerPx: 16.8 / 1920, w: 1920, h: 1080 };
// The card shows the lot plus the street strip on its left (the render has no more road than that).
export const PLAN_CROP = { x0: 0, y0: 80, x1: 1920, y1: 980 };

export function worldToPlan(x: number, z: number): [number, number] {
  return [PLAN.w / 2 + (-z - PLAN.camY) / PLAN.mPerPx, PLAN.h / 2 + (x - PLAN.camX) / PLAN.mPerPx];
}

export function planToWorld(px: number, py: number): [number, number] {
  return [PLAN.camX + (py - PLAN.h / 2) * PLAN.mPerPx, -(PLAN.camY + (px - PLAN.w / 2) * PLAN.mPerPx)];
}

/** Heading on the plan (radians, 0 = image +x) for a camera looking along (fx, fz) in world space. */
export const planHeading = (fx: number, fz: number) => Math.atan2(fx, -fz);
