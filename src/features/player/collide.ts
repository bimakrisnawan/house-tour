import { Box3, Line3, Matrix4, Vector3 } from 'three';
import type { Collider } from '../scene/registry';

const inv = new Matrix4();
const seg = new Line3();
const box = new Box3();
const wbox = new Box3();
const tri = new Vector3();
const cap = new Vector3();
const push = new Vector3();
const prev = new Vector3();

/**
 * Pushes a capsule (segment + radius, world space) out of every collider it overlaps (three-mesh-bvh character
 * pattern). Moving parts (doors, gate) are tested in their current pose, so an open door no longer blocks.
 * Returns true when anything was hit. Meshopt quantisation puts a dequantisation scale on mesh nodes, so the
 * radius is converted into each collider's local units.
 */
export function resolveCapsule(capsule: Line3, radius: number, colliders: Collider[]): boolean {
  let hit = false;
  for (const c of colliders) {
    if (!c.mesh.visible && !c.dynamic) continue;
    if (!isShown(c.mesh)) continue;
    c.mesh.geometry.boundingBox ?? c.mesh.geometry.computeBoundingBox();
    wbox.copy(c.mesh.geometry.boundingBox!).applyMatrix4(c.mesh.matrixWorld).expandByScalar(radius);
    box.makeEmpty().expandByPoint(capsule.start).expandByPoint(capsule.end);
    if (!wbox.intersectsBox(box)) continue;

    inv.copy(c.mesh.matrixWorld).invert();
    seg.copy(capsule).applyMatrix4(inv);
    const r = radius / c.mesh.matrixWorld.getMaxScaleOnAxis();
    box.makeEmpty().expandByPoint(seg.start).expandByPoint(seg.end).expandByScalar(r);
    c.bvh.shapecast({
      intersectsBounds: (b) => b.intersectsBox(box),
      intersectsTriangle: (t) => {
        const d = t.closestPointToSegment(seg, tri, cap);
        if (d < r) {
          push.copy(cap).sub(tri).normalize().multiplyScalar(r - d);
          seg.start.add(push); seg.end.add(push);
          hit = true;
        }
      },
    });
    prev.copy(capsule.start);
    capsule.copy(seg).applyMatrix4(c.mesh.matrixWorld);
    // guard: a real contact moves the capsule by about its radius; a jump of metres is a numerical outlier
    if (prev.distanceTo(capsule.start) > 1) { prev.sub(capsule.start); capsule.start.add(prev); capsule.end.add(prev); }
  }
  return hit;
}

function isShown(o: { visible: boolean; parent: unknown }): boolean {
  for (let p: any = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}
