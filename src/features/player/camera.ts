import { Vector3 } from 'three';

/** Camera forward direction, written each frame by the canvas and read by DOM widgets (plan marker). */
export const cameraDir = new Vector3(0, 0, -1);
