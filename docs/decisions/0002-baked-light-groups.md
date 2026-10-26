# 0002. Baked lightmaps per light group, mixed in the shader

Date: 2026-10-26   Status: accepted

## Context

Interior quality depends on global illumination; real-time browser lights look flat and cost the most on
phones. The owner wants every room light switchable and a day-to-night slider. The scene has one sun, a sky and
15 point/spot lights (`Pencahayaan` collection: L_Tamu, L_Keluarga, L_Makan, L_Dapur, L_K1, L_K2, L_WC,
L_Jemur, L_Teras, L_Carport, L_lampu_sofa, L_fasad0/1, L_pagar0/1).

## Options considered

| Option | For | Against |
|---|---|---|
| Real-time lights + SSAO | Fully dynamic | Flat look, heavy on phones, shadow cost per light |
| One baked lightmap (day) | Cheapest, best look | Lights and time of day cannot change |
| Two baked sets (day, night) | Simple | No per-room switches |
| **One lightmap per light group, packed 3 groups per RGB texture** | Per-room switches and a continuous time slider at near-zero runtime cost | Bake time × groups; groups stored as luminance, light colour applied as a uniform tint |

## Decision

Bake in Cycles (`blender/rumah/web/build_web.py`), 12 groups: `sun` (sun lamp + fill), `sky` (world) in full
RGB, and 10 lamp groups (tamu, makan, sofa, dapur, k1, k2, wc, jemur, teras, carport) as luminance, three per
RGB texture, with the average lamp colour stored as a tint. Values are stored as `(L / scale)^(1/2.2)` in 8-bit
with a per-group scale in the manifest, multiplied by pi (Cycles diffuse light = E/pi). Runtime: one patched
`MeshStandardMaterial` chunk (`src/features/scene/lightmaps.ts`) sums `texel * scale * level * tint` per group;
the environment map adds only reflections. Two atlases: `main` (house, 2048 px) and `ground` (80 x 80 m top
projection). Procedural and box-projected materials are baked to one 4096 px albedo atlas.
Moving parts (doors, gate, blinds, AC louvres) are baked in their closed pose; when open their shading is
slightly off, which is not noticeable at these sizes. This replaced the probe idea: zero extra runtime cost.

## Consequences

Easier: switches, time of day and before/after all reuse one mechanism.
Harder: needs a second UV set on every static mesh (Blender script), a bake per group, and 8-bit storage limits
dynamic range (encode with a fixed exposure per group, recorded in the asset manifest).
Measured 2026-10-26 (RX 7600, HIP): 15 s per group at 128 samples, ~1 min at 512; Blender bakes selected
objects one by one, so the pipeline joins copies into one proxy mesh per atlas before baking.
