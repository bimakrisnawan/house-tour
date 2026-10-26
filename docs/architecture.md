# Architecture

```
 Blender (D:\10. Project\blender\rumah)                      rumah-web (this project)
 ──────────────────────────────────────                      ──────────────────────────────────────────────
 rumah_renovasi_v3.blend
   └─ web/fix_coplanar.py ──► rumah_renovasi_v4.blend   (z-fighting fix: gable vs side walls, trims, skylight)
        └─ web/build_web.py -- renovasi | eksisting
             tour_full.py setup (door hinges), tag interactives,
             UV0 + LM UVs, albedo atlas bake, 12 light-group bakes
             (OIDN), panoramas, tree impostors, join statics
             ──► web/out/<variant>/ rumah.glb, lm_*.png, manifest.json
                                            │
                     scripts/build-assets.mjs ──► public/assets/<variant>/{lo,md,hi}.glb, lm/{1k,2k}/*.webp,
                     (gltf-transform + sharp)      env/{dalam,luar}.webp, denah.webp, scene.json; public/benchmarks

 index.html (poster, plain HTML, 7 KB JS) ── "Masuk" ── import('app/tour') ── detect tier ── R3F canvas + HUD
```

Static only. Nothing leaves the browser; no analytics, no cookies. Preferences (quality, sound) in
`localStorage`. Headers in `vercel.json`: CSP `default-src 'self'`, `X-Robots-Tag: noindex`.

## Source layout

| Path | Role |
|---|---|
| `index.html`, `src/app/main.ts` | Poster (LCP ~0.5 s on a throttled phone) and the tiny entry; lazy-loads the tour |
| `src/app/tour.tsx` | Composition root: tier detection, canvas, HUD; `?debug` exposes `window.__tour` for headless checks |
| `src/core/` | Pure logic, unit-tested: `format`, `quality` (tiers), `rooms` (boxes, entries, fly limit), `plan` (world <-> plan pixels), `time` (daylight curve), `facts` |
| `src/state/store.ts` | zustand store: tier, time, lamps, mode, variant, tool, UI panels |
| `src/features/scene/` | Manifest/URLs, GLB + lightmap loading, the lightmap shader patch, light rig, sky, reflections, runtime registry |
| `src/features/player/` | Capsule walker and flyer, collision against static and moving BVHs, keyboard/touch input |
| `src/features/interact/` | Crosshair/tap targeting and the open/close animations |
| `src/features/measure/`, `photo/`, `audio/`, `quality/`, `hud/` | Tools, sound, adaptive quality, all DOM UI |
| `public/audio/` | CC0 sounds (`CREDITS.md`) |

## Asset contract (Blender -> web, glTF node extras)

| Extra | Values | Meaning on the web |
|---|---|---|
| `lm` | `main`, `ground` | Which lightmap atlas the node's TEXCOORD_1 points into |
| `interact` | `swing` (`axis`, `angle`), `slide` (`offset`), `roll` (`scale`), `tv`, `ac`, `lamp` | Clickable; animated about the node origin (hinge, rail, roller) |
| `link` | `gerbang`, `gorden_k2`, `ac_tamu`, ... | Nodes that toggle together |
| `label`, `sound` | text, `door` / `gate` / `cloth` / `latch` / `ac` | Prompt text ("Buka pintu kamar 1") and sound |
| `emit` | lamp group id | Emissive surfaces switched with that group |
| `collide` | `false` | Not in the collider (plants, rugs, curtains); ground planes are never in it (flat floor at y = 0) |
| `unlit` | `true` | Tree impostor cards (MeshBasicMaterial, dimmed with daylight) |

Coordinates: Blender Z-up metres -> glTF Y-up (x, z, -y). Rooms (`src/core/rooms.ts`) and plan mapping
(`src/core/plan.ts`) come from `denah.json` and Cam_Denah; a unit test compares them with `denah.json`.

## Rendering

- Diffuse light = sum over 12 baked groups (ADR 0002); reflections from two Cycles panoramas (living room,
  front yard) switched by whether the camera is inside the house body.
- Tone mapping AgX (Blender renders use AgX Medium High Contrast). Bloom only from tier tinggi.
- Meshopt quantisation puts a dequantisation scale on mesh nodes: collision converts the capsule radius into
  each collider's local units (`player/collide.ts`).

## Failure and loading states

- No JavaScript: poster plus a message. No WebGL2: message on the poster, the render stays visible.
- Load progress on the poster; failure: message and the button re-enabled.
- The old house (before/after) loads in the background with a status chip; the current view stays until it is
  ready. Changing the quality tier in the menu reloads the house (status chip while loading).
