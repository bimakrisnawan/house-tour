# rumah-web

Interactive first-person web tour of the renovated house modelled in `D:\10. Project\blender\rumah`
(`rumah_renovasi_v3.blend`). Blender-side work (fixes, UV2, lightmap bake, GLB export scripts) stays in the
Blender folder; only exported assets land in this project.

Status (2026-10-26): **complete, v1.0.** Gates 1-3 passed; all build slices done; verify.mjs all automatic
checks pass; independent critique: see "Visual proof and critique" below.

Gate 3 picked: **V2 "Denah pemandu"** as the base (floor plan card with "you are here" + view cone, mode rail),
plus V3's fact sheet ("kop gambar") on room click / I and dimension lines in the measure tool.

## Stack
React 19.3 + @react-three/fiber 9.8 + drei 10.7 + three 0.186, TypeScript 7, Vite 8, zustand 5,
three-mesh-bvh 0.9 (collision), @pmndrs/detect-gpu 6 (benchmarks self-hosted), postprocessing (bloom, tier
tinggi+). Asset pipeline: Blender 5.2 Cycles (HIP) + gltf-transform 4.5 + sharp. ADRs 0001-0003.

## Commands
```
dev / test / build:  npm run dev | npm test | npm run build      (build = tsc + vite + 100 MB budget check)
assets:              node scripts/build-assets.mjs               (blender/rumah/web/out -> public/assets)
Blender (in D:. Projectlender
umah, Blender closed or not; runs headless):
  fix z-fighting:    blender -b rumah_renovasi_v3.blend -P web/fix_coplanar.py -- rumah_renovasi_v4.blend
  bake + export:     blender -b rumah_renovasi_v4.blend -P web/build_web.py -- renovasi   (~6 min on RX 7600)
                     blender -b rumah_renovasi_v4.blend -P web/build_web.py -- eksisting  (~1.5 min)
                     add --quick for a low-quality pipeline test (~75 s)
  sky panorama:      blender -b rumah_renovasi_v4.blend -P web/render_sky.py  (poster world only, ~10 s)
headless checks:     open /?debug -> window.__tour {three, runtime, useStore, teleport}
deploy:              vercel --prod (owner; Hobby plan)
```

## Features (as built)
Walk (WASD/joystick, collision, footsteps), fly outside the house only (F; pushed out of the house body),
interactions with prompt + sound (gate 2 panels, front door, K1/K2 swing doors, WC sliding door, living-room and
K1 blinds, K2 curtains, 3 ACs with louvre + hum, TV shows the hero render, washing-machine door, ceiling lamps),
10 lamp switches + time slider 12.00-20.00 (baked light groups), plan card with you-are-here, view cone and
teleport, room fact sheets, measure tool, before/after (old house, lazy-loaded), photo mode (PNG download),
synthesised ambience (wind, birds by day, crickets at night), graphics menu (auto/4 tiers) with FPS adaptation.

Not built (honest): drawers and kitchen cabinets do not open (their fronts are not separate geometry in the
.blend); lamps in the old house; mirrors reflect the panorama, not the live scene.

## Placeholders
None in the shipped UI. Room facts are planned values from `blender/rumah/catatan_loop.md` (labelled "ukuran rencana").

### Gate 1 decisions (owner, 2026-10-26)
- Privacy: unlisted link, `noindex` (meta + `X-Robots-Tag`), no address, map or street names; label
  "Rencana renovasi · visualisasi" and "ukuran rencana".
- Hosting: Vercel **Hobby** (non-commercial). Budget: whole deployment < 100 MB, so every quality tier fits.
- Poster: `render/v3/00_hero.png`.
- Sound: CC0 effects allowed (record source + licence per file in `public/audio/CREDITS.md`).
- Direction sentence below: confirmed.

## Project profile

| Topic | Value | Source |
|---|---|---|
| Job | **Exploration** (primary): walk, open, switch, measure and compare a house that exists only as a design. Persuasion is secondary (the first screen must make a stranger want to step in). | owner, 2026-10-26 |
| Users | Everyone who wants to know the house: family (phones, a link shared in chat, short casual visits) up to architects and contractors (desktop, long sessions, checking sizes, materials, before/after). | owner |
| Device class | Cheap Android to desktop GPU; quality scales with hardware like a game (tier detection + runtime FPS adaptation + manual menu). Touch controls from the first slice. | owner |
| UI language | **Indonesian only.** Deviation from the house default (EN primary, ID second): owner's decision. Strings still go through one i18n file so EN can be added later. | owner |
| Theme | proposed: UI floats over the 3D scene, so it follows the scene, not the system setting (decided at Gate 2) | proposed |
| Motion | Door, gate, blind and drawer animations are content; UI motion functional, under 300 ms; reduced motion respected (camera transitions become cuts) | proposed |
| Audio | Wanted (doors, gate, switches, ambience). Off until the first user gesture (browser autoplay rules), one mute toggle. | owner |
| Features | Walk mode (collision, start at the gate), fly mode outside the house only, doors/gate/blind/drawers/cabinets, light switches per room, TV, AC, time-of-day slider, before/after (existing house), photo mode, info hotspots, floor-plan minimap with teleport, measuring tool | owner + proposed |
| Backend | None. Static site. | owner |
| Hosting | Vercel (owner deploys) | owner |
| Delivery | Final version, not a prototype | owner |
| Risk class | **1** (no accounts, no personal data collected). But see harm case: the content itself describes a real home. | derived |

### Direction (design/thinking.md §0b)
1. Job: exploration, persuasive first screen.
2. People and moment: family on phones opening a shared link once or twice; architects on desktop checking
   for a long time, more than once.
3. Topic's own character: a single-storey Indonesian row house on a narrow lot (rooms 2.50 x 2.70 and
   2.50 x 2.85 m, carport + teras behind a telescopic sliding gate, one-sided WC, rooftop solar 4 x ~500 Wp,
   1,000 L water tower). Every centimetre is a decision (catatan_loop.md: 75-90 cm paths, 75 cm table, 160 bed
   with 55-62 cm sides). It is a renovation: the point is the change from the existing house. Tropical sun,
   skylight over the dining table.
4. Category today (looked at 2026-10-26): Matterport: full-bleed 3D, one small pill toolbar bottom-left
   (guided play, dollhouse, floor plan, walk, measure), share/more bottom-right, identical on phone.
   Shapespark: a pre-rendered poster with one large "3D" play button, nothing heavy loads until the click,
   small title chip top-left.
5. Direction sentence (confirmed): *It should feel like walking through the finished house on your own with the
   architect next to you who can answer any size, because visitors come both to feel the space and to check
   its numbers; it must never feel like a video game or a property brochure.*

## Design language

```
Design language (picked by the owner 2026-10-26)
Message:            feel the space, check the numbers / feeling: calm confidence
Axes:               order 2, abundance 1-2, warmth 3, organic 2, dimension 5 (scene) / 1 (UI), moment 2
Category scan:      Matterport, Shapespark share full-bleed 3D + one compact toolbar + poster-first start;
                    avoid floating marketing panels and game HUD
Primary language:   Swiss minimal ("Gambar kerja") because both families and architects read it, and it
                    stays out of the scene
Borrowed device:    dimension lines (Tactile industrial) for the measuring tool and size callouts
Carried by:         the Cycles renders (poster), the live baked scene, real sizes from denah.json/catatan
Hue:                sage, sampled from the living-room feature wall; tokens in src/shared/ui/tokens.css
                    (contrast.mjs exit 0, light + dark). Accent meaning: "where you are / what is active".
Grammar here:       IBM Plex Sans + IBM Plex Mono (sizes, keys); radius 6/4 px; paper panels with hairline;
                    UI flat, the scene carries depth; motion functional < 300 ms
Signature moment:   poster render dissolves into the live scene from the same camera, then the camera
                    lowers to eye height at the gate
Not here:           glass blur panels, crosshair HUD, gradients, mascots
Options shown:      Warm organic (house palette), Translucent material
```

## Research brief

```
Category leaders:   Matterport (scanned real spaces; walk/dollhouse/floor plan/measure in one small toolbar,
                    same on phone). Shapespark (baked path-traced GI in WebGL; poster + "3D" button so the
                    first paint is a render, not a loader). Community three.js walkthroughs (WASD + pointer
                    lock, raycast click-to-move, dollhouse view) are functional but visually flat.
Conventions kept:   Full-bleed 3D, chrome in one compact toolbar; poster-first start; walk + floor plan +
                    measure as modes; click-to-move on touch.
Clichés avoided:    Floating marketing panels over the scene; tutorial walls of text; game HUD (health bars,
                    crosshair clutter); 360-photo hopping between fixed points.
Insider facts:      Sizes in cm are the content for architects (plan values, not as-built). The renovation is
                    understood only against the existing house. Narrow rooms make collision and FOV critical
                    (a 2.5 m room with a wide FOV feels like a corridor). Lighting sells the interior; real-time
                    browser lighting looks flat, so it must be baked.
Real assets:        rumah_renovasi_v3.blend (renovated), rumah_renovasi.blend (existing), 29 Cycles renders
                    in render/v3 (00_hero.png = poster candidate), floor plans 11_denah_*, dimension log in
                    catatan_loop.md, presentation PDF v3. Missing: UV2 + baked lightmaps, web-sized GLBs,
                    sound effects (need CC0 sources), check of how complete the existing model is inside.
Focal candidate:    00_hero.png render as the poster, then the gate in first person.
Abuse cases:        Static site: hotlinking the GLBs drains the bandwidth allotment; anyone can download and
                    reuse the model (accepted for a public site, or obfuscate nothing and say so).
Harm cases:         A public, indexed site showing the full layout of a real family home (doors, gate type,
                    where the battery/inverter sits) plus its location helps a burglar. -> No address, no map,
                    no street names; proposed: unlisted link + noindex. Renders could be read as the built
                    house -> label "rencana renovasi, visualisasi" and "ukuran rencana".
Open risks:         Vercel Hobby: CLI upload max 100 MB per deployment, 100 GB Fast Data Transfer per month,
                    non-commercial use only (vercel.com/docs/limits, /fair-use-guidelines, read 2026-10-26).
                    All quality tiers together must fit 100 MB or assets move to another host.
                    @pmndrs/detect-gpu benchmark data stopped updating Dec 2025 (newer GPUs unknown -> runtime
                    FPS adaptation is mandatory). Lightmap bake time for ~10 light groups is unmeasured.
                    Roof-to-wall joint geometry must be fixed before baking.
```
