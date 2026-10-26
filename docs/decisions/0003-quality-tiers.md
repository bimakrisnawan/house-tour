# 0003. Four quality tiers: guessed at start, corrected by measured frame rate

Date: 2026-10-26   Status: accepted

## Context

Visitors range from cheap Android phones to desktop GPUs. Browsers expose little hardware detail: the GPU name
(`WEBGL_debug_renderer_info`, often masked on Safari/Firefox), `hardwareConcurrency`, `deviceMemory` (Chrome
only, capped at 8), screen size and DPR, pointer type, `MAX_TEXTURE_SIZE`. @pmndrs/detect-gpu maps GPU names to
benchmark tiers but its data stopped updating in December 2025, so newer GPUs are unknown.

Measured on 2026-10-26 (test export, no lightmaps, two 1.6 M-triangle trees left out): raw GLB 67.9 MB;
meshopt + WebP 1K textures 6.25 MB; meshopt + WebP 512 px 3.15 MB. The rest of the house is ~92 k triangles.

## Decision

Tiers `rendah`, `sedang`, `tinggi`, `ultra`:
1. Start tier = detect-gpu tier, lowered by one on phones with `deviceMemory <= 4`, capped by `MAX_TEXTURE_SIZE`.
2. A frame-rate monitor (drei PerformanceMonitor, bounds 45-58 fps) lowers the render scale by 0.25 per sustained
   drop (then turns bloom off) and raises it again with headroom; after three flips it settles on the lower one.
3. The menu "Grafik" overrides with a fixed tier or "Otomatis"; the choice is stored in `localStorage`.

What a tier changes (as built): DPR cap 0.75 / 1 / 1.5 / 2; GLB texture cap 1024 / 2048 / 4096 / 4096 px
(the albedo atlas is what changes); lightmaps 1024 / 2048 / 2048 / 2048 px; MSAA from sedang; bloom +
4x multisampled composer from tinggi. Ambient occlusion is in the bake, so N8AO was not needed.
Only the tier's files are downloaded (one renovated-house GLB 4.8-5.3 MB + its lightmaps). The whole deployment must stay under 100 MB
(`scripts/check-budget.mjs` fails the build otherwise).

## Consequences

The tier logic is a pure function in `src/core/quality.ts` with unit tests; the monitor only feeds it numbers.
KTX2 (GPU-compressed) textures would cut GPU memory ~4-6x versus WebP; it needs the `ktx` tool from
KTX-Software in the asset pipeline. Revisit when phones show memory crashes.
