# 0001. React Three Fiber on Vite, static on Vercel

Date: 2026-10-26   Status: accepted

## Context

First-person, game-like tour of one house in the browser: walk with collision, fly outside, many interactive
objects (doors, gate, switches, drawers, TV, AC, blind), time of day, before/after, photo mode, sound, a floor
plan with teleport, measuring, hardware-scaled quality. Indonesian UI only. Phones and desktops. No backend.
Vercel Hobby: 100 MB per deployment upload, 100 GB transfer per month (vercel.com/docs/limits, read 2026-10-26).
The owner's other 3D project (`web/3ditya`) already uses three.js + Vite + gltf-transform.

## Options considered

| Option | For | Against |
|---|---|---|
| three.js vanilla | Smallest runtime, same as 3ditya | UI-heavy product (menus, plan card, fact sheet, settings, touch controls) means hand-written DOM state sync |
| **React Three Fiber + drei** | Same three.js engine; UI and scene in one component tree and one store; drei ships PerformanceMonitor, AdaptiveDpr, KeyboardControls, PointerLockControls, KTX2/meshopt loaders | React adds ~45 KB gzip; loaded only after "Masuk" |
| Babylon.js | Built-in scene optimiser and inspector | Smaller UI ecosystem, a second engine to learn next to 3ditya |
| Unity / Unreal WebGL | Editor, lightmapper | Tens of MB before the first frame, weak on phones, no fit for a static budget |
| PlayCanvas | Good lightmapper and editor | Editor-centred workflow in their cloud |

## Decision

React 19 + @react-three/fiber 9 + drei 10 + three 0.186, TypeScript, Vite 8, zustand for state, three-mesh-bvh
for collision (capsule vs BVHs, doors and gate in their current pose; no physics engine), @pmndrs/detect-gpu for the
first tier guess, postprocessing (bloom) for high tiers only. Static build on Vercel with strict headers (`vercel.json`).

The poster (`index.html`) is plain HTML; React and three load only on "Masuk" via dynamic import, so the first
paint is the render and costs almost no JavaScript.

## Consequences

Easier: UI features as components reading one store; drei covers controls and adaptive quality.
Harder: React re-renders must stay out of the frame loop (use refs and `useFrame`, never state per frame).
Revisit if WebGPU becomes the only way to reach a quality target (three's WebGPURenderer works with R3F).
