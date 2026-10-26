import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Euler, Line3, Quaternion, Vector3, type PerspectiveCamera } from 'three';
import { insideHouse, pushOutOfHouse, roomAt } from '../../core/rooms';
import { useStore } from '../../state/store';
import { footstep } from '../audio/audio';
import { cameraDir } from './camera';
import { runtime } from '../scene/registry';
import { resolveCapsule } from './collide';
import { input, keyboardMove } from './input';

const RADIUS = 0.22; // a 2.5 m room must still let you turn around beside the bed
const EYE = 1.62;
const WALK = 1.4; // m/s
const RUN = 3;
const FLY = 6;
const GRAVITY = -9.8;
const STEP_EVERY = 0.62; // metres per footstep sound
export const SPAWN = new Vector3(11.9, 0.1, 4.2); // pavement across from the gate (Blender 11.9, -4.2)

// Signature moment: the scene starts exactly where the poster render was taken (Cam_Hero: Blender (15.4, -7, 1.6),
// rotation (1.5843, 0, 0.245), 28 mm on 36 mm), so the poster dissolves into the live view, then glides to the gate.
const HERO_POS = new Vector3(15.4, 1.6, 7.0);
const HERO_ROT = new Quaternion().setFromEuler(new Euler(1.5843 - Math.PI / 2, 0.245, 0, 'YXZ'));
const HERO_HALF_HFOV = Math.atan(18 / 28);
const INTRO = 2.6; // seconds
export const fovBase = { value: 70 }; // set by the canvas from the aspect ratio
const heroFov = (aspect: number) => // the poster covers the screen (object-fit: cover) like a 16:9 frame
  (2 * Math.atan(Math.tan(HERO_HALF_HFOV) / Math.max(aspect, 16 / 9)) * 180) / Math.PI;
const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Teleport request from the plan card, consumed on the next frame. */
export const teleport = { to: null as null | { x: number; z: number; yaw?: number } };
export const playerPos = SPAWN.clone();

const feet = SPAWN.clone();
const vel = new Vector3();
const move = new Vector3();
const fwd = new Vector3();
const side = new Vector3();
const capsule = new Line3();
const delta = new Vector3();
const euler = new Euler(0, 0, 0, 'YXZ');
const before = new Vector3();
const eye = new Vector3();
const gateRot = new Quaternion(); // identity: facing -z, the gate

export function Player({ touch }: { touch: boolean }) {
  const camera = useThree((s) => s.camera);
  const onGround = useRef(false);
  const stride = useRef(0);
  const intro = useRef(reduceMotion ? INTRO : 0);
  const set = useStore((s) => s.set);

  useEffect(() => {
    camera.rotation.order = 'YXZ';
    camera.rotation.set(0, 0, 0); // facing the gate (-z)
    if (!reduceMotion) { camera.position.copy(HERO_POS); camera.quaternion.copy(HERO_ROT); }
  }, [camera]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05); // a long frame (tab switch) must not tunnel through walls
    const cam = camera as PerspectiveCamera;
    if (intro.current < INTRO) {
      intro.current += dt;
      const k = Math.min(1, Math.max(0, (intro.current - 0.6) / (INTRO - 0.6))); // hold while the poster fades
      const e = k * k * (3 - 2 * k);
      cam.position.lerpVectors(HERO_POS, eye.set(SPAWN.x, SPAWN.y + EYE, SPAWN.z), e);
      cam.quaternion.slerpQuaternions(HERO_ROT, gateRot, e);
      cam.fov = heroFov(cam.aspect) + (fovBase.value - heroFov(cam.aspect)) * e;
      cam.updateProjectionMatrix();
      camera.getWorldDirection(cameraDir);
      return;
    }
    const st = useStore.getState();
    const rt = runtime[st.variant] ?? runtime.renovasi;
    if (!rt) return;

    if (teleport.to) {
      feet.set(teleport.to.x, 0.3, teleport.to.z); vel.set(0, 0, 0);
      if (teleport.to.yaw !== undefined) camera.rotation.set(0, teleport.to.yaw, 0);
      teleport.to = null;
    }

    if (input.lookX || input.lookY) { // touch look; desktop look is PointerLockControls
      euler.setFromQuaternion(camera.quaternion);
      euler.y -= input.lookX * 0.0045;
      euler.x = Math.max(-1.45, Math.min(1.45, euler.x - input.lookY * 0.0045));
      camera.quaternion.setFromEuler(euler);
      input.lookX = input.lookY = 0;
    }

    const kb = keyboardMove();
    const free = !st.menuOpen;
    const mx = free ? Math.max(-1, Math.min(1, kb.x + input.moveX)) : 0;
    const my = free ? Math.max(-1, Math.min(1, kb.y + input.moveY)) : 0;
    const run = kb.run || input.run;
    const fly = st.mode === 'fly';

    camera.getWorldDirection(fwd);
    if (!fly) fwd.setY(0);
    fwd.normalize();
    side.crossVectors(fwd, camera.up).setY(0).normalize();
    move.set(0, 0, 0).addScaledVector(fwd, my).addScaledVector(side, mx);
    if (move.lengthSq() > 1) move.normalize();
    move.multiplyScalar(fly ? FLY * (run ? 2.5 : 1) : run ? RUN : WALK);

    before.copy(feet);
    if (fly) {
      vel.set(0, 0, 0);
      move.y += (+(kb.up || input.up) - +(kb.down || input.down)) * FLY * 0.7;
      feet.addScaledVector(move, dt);
    } else {
      vel.y = onGround.current ? 0 : Math.max(-20, vel.y + GRAVITY * dt);
      feet.addScaledVector(move, dt).addScaledVector(vel, dt);
    }

    capsule.start.set(feet.x, feet.y + RADIUS, feet.z);
    capsule.end.set(feet.x, feet.y + EYE - RADIUS + 0.1, feet.z);
    resolveCapsule(capsule, RADIUS, rt.colliders);
    delta.set(capsule.start.x, capsule.start.y - RADIUS, capsule.start.z).sub(feet);
    onGround.current = !fly && delta.y > Math.abs(dt * vel.y * 0.25);
    feet.add(delta);
    if (feet.y < 0) { feet.y = 0; onGround.current = !fly; } // the ground outside is flat at y = 0 (not in the collider)

    if (fly) { // owner: flying only outside the house; its body pushes you back out
      const [px, py, pz] = pushOutOfHouse(feet.x, feet.y + EYE / 2, feet.z);
      feet.set(px, Math.max(0, py - EYE / 2), pz);
    }
    if (feet.y < -10) { feet.copy(SPAWN); vel.set(0, 0, 0); } // fell out of the world

    camera.position.set(feet.x, feet.y + EYE, feet.z);
    camera.getWorldDirection(cameraDir);
    playerPos.copy(feet);

    if (onGround.current) {
      stride.current += Math.hypot(feet.x - before.x, feet.z - before.z);
      if (stride.current > STEP_EVERY) { stride.current = 0; footstep(); }
    }
    const room = roomAt(feet.x, feet.z)?.id ?? null;
    if (room !== st.room) set({ room });
  });

  return touch ? null : (
    <PointerLockControls selector="#look" onLock={() => set({ locked: true })} onUnlock={() => set({ locked: false })} />
  );
}

/** Fly mode may start only outside the house body. */
export const canFly = () => !insideHouse(playerPos.x, playerPos.y + 1, playerPos.z);
