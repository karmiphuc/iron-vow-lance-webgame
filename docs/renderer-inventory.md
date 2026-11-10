# Renderer inventory — issue #6, Phase 0

Baseline: GitHub `f264567f01d0501b11f40e1ffdc15a314f47993d` / Sites v98. References entered main through PR #5 (`2034d9b`). No presentation paths have been replaced or deleted in this phase.

`renderer-inventory.json` is the reproducible file-level audit. Regenerate with `node qa/renderer-inventory.cjs docs/renderer-inventory.json`. It enumerates all 20 `FRAMES`, all 15 GLBs, mesh triangle counts, node names, paint material names, part tags, optional clips and missing root dimensions. These are static file facts; no GLB is certified as rig contract v2 by its presence. Triangle counts exclude node instancing and cannot stand in for `renderer.info`.

## Chassis and runtime paths

Paths in the following tables are relative to `dist/`. GLBs are under `rig-bench/`.

| Frame ID | Chassis | 3D source | Current presentation dependencies to replace |
| --- | --- | --- | --- |
| 0 | Warden | `warden-painted.glb`, original `warden.glb`; live re-rig in `foundry/warden-live.js` | `warden-visuals.js`, `warden-fidelity.js`, `grid-travel-visuals.js`, `foundry/renderer.js`, pixel paint/part masks in `game.js` |
| 1 | Kestrel | `kestrel.glb` | `warden-visuals.js`, `grid-travel-visuals.js`, `game.js` raster paths |
| 2 | Basilisk | `basilisk.glb` | `warden-visuals.js`, `grid-travel-visuals.js`, `game.js` raster paths |
| 3 | Gatecrasher | `prototypes/gatecrasher.glb` | `prototype-combat.js`, `warden-visuals.js`, `grid-travel-visuals.js`, `game.js` native clips |
| 4 | Cicada | `prototypes/cicada.glb` | `prototype-combat.js`, `warden-visuals.js`, `grid-travel-visuals.js`, `game.js` native clips |
| 5 | Valkyrie | `foundry/chassis.js`, kit model 3 | `foundry/renderer.js`, `foundry/baked.js`, `foundry/walk.js`, `grid-travel-visuals.js` |
| 6 | Oni | `foundry/chassis.js`, kit model 4 | Same kit paths; carry/fire data in `foundry/rig-motion.js` |
| 7 | Behemoth | Kit model 5, `foundry/behemoth-core.js` | Same kit paths; artillery brace in `foundry/rig-motion.js` |
| 8 | Aegis | Kit model 0 | Same kit paths plus `foundry/aegis-baked.js` |
| 9 | Shrike | Kit model 1 | Same kit paths |
| 10 | Bastion | `bastion-bst04.glb`, `bastion-carbine.glb`, `bastion-melee.glb`; adapter `foundry/bastion.js` | `foundry/renderer.js` HD context, `foundry/baked.js`, raster paint/parts |
| 11 | Hellbreaker | `prototypes/hellbreaker.glb` | Native clips in `prototype-combat.js`, `warden-visuals.js`, `grid-travel-visuals.js` |
| 12 | Citadel | Kit model 2 | **No separate missing Citadel source:** `FRAMES` copies Bastion stats but sets `rig:null`, so this is procedural Bastion geometry; `foundry/baked.js`, `foundry/walk.js` |
| 13 | Line Infantry LI-01 | No GLB in checkout; external Blender source needed | Foundry art model 6, `foundry/baked.js`, `foundry/roster-destruction.js`, raster masks |
| 14 | Line Infantry LI-02 | No GLB in checkout; external Blender source needed | Foundry art model 7, `foundry/baked.js`, `foundry/roster-destruction.js`, raster masks |
| 15 | Gravemaw / Vanguard | No GLB in checkout; external R10 Blender source needed | Model 8, `foundry/vanguard-baked.js`, `foundry/roster-destruction.js` |
| 16 | Reaver RV-04 | No GLB in checkout; external Blender source needed | Model 9, `foundry/baked.js`, four Reaver arm-state atlases, `foundry/roster-destruction.js` |
| 17 | Bulwark-Aegis | `prototypes/bulwark.glb` | Model 10, `foundry/baked.js`, `foundry/roster-destruction.js` |
| 18 | Ashigaru | `prototypes/scout.glb` | Model 12, `foundry/ashigaru-baked.js`, `foundry/roster-destruction.js` |
| 19 | Aero IV-03 | No GLB in checkout; external Blender source needed | Model 11, `foundry/aero-baked.js`, `aero-strikes.js`, `foundry/roster-destruction.js` |
| Trial only | Lion | Not in `FRAMES`; `Lion-Rigged.blend` is external | `lion-art.js`, trial branches of `game.js`, Lion sprite assets |

The procedural kit has six source models; Bastion's ordinary live path substitutes its GLB. Citadel retains kit model 2. Kit dimensions live in `VowChassis.DIMS`; current GLBs do not export all 15 required dimensions on a node named `root`.

The static GLB audit also finds several mesh totals above 60k, not just Gatecrasher: Bastion 215,478; Ashigaru/scout 184,382; Gatecrasher 162,386; Bulwark 151,221; Cicada 127,172; Hellbreaker 89,106. These are unique mesh totals, not measured per-frame GPU work. Optimisation and rig export need the prescribed Blender MCP, which is not connected in this session.

## Weapons and equipment

`rig-bench/weapons.glb`, `expansion-weapons.glb` and `shields.glb` contain the shared equipment geometry; Bastion also uses its two dedicated GLBs. Existing live attachments use `foundry/production-arsenal.js`. Replacement candidates are `arsenal-visuals.js`, sprite sections of `armory-visuals.js`, `shield-visuals.js`, `drawWeaponModule` / `foundryMount` in `game.js`, and their sheet/paint/part assets. Keep the GLBs and build/export scripts. The 22 Workshop cards are not the entire `WEAPONS` array: it also includes built-ins and a shoulder pod, all of which need effect mappings.

## Vehicles, cover and terrain

| Subject | Current source and art | Shared-scene work / delete candidates |
| --- | --- | --- |
| Tank, helicopter/gunship | Procedural Blender construction in `tools/render_vehicles.py`; raster vehicles in `dist/assets`; `drawVehicle` and `VEHICLES` in `game.js` | No vehicle GLB exists. Export geometry or port construction, then remove only the sprite draw path/assets |
| Ridge rock, relay shield | `tools/render_cover.py`; `assets/cover-*.webp`; theater `relay` | Port reference `buildCover`, preserving heights; remove 2D cover drawing after migration |
| Cargo, transformer | Same cover authoring script; theater `corridor` | Same |
| Conifer, bunker | Same cover authoring script; theater `frontier` | Same |
| Relay / corridor / frontier ground | `theater-layouts.js` generator and legacy layouts in `game.js`; `assets/theater-tiles.webp`; `tools/authoring/build_theater_tiles.py`; older battlefield art from `tools/render_battlefields.py` | Port elevation/material/cell links and 18×20 boards while retaining 10×10 saved checkpoints; replace Canvas terrain drawing |
| Hangar | `assets/hangar.webp`, `rain()` / `hangar()` in `game.js` | Port live hangar. Keep backdrop only if needed as social art |

## Contexts, compositor and disposal

`#scene` is Canvas 2D. `foundry/renderer.js` owns a standard offscreen `WebGLRenderer` and a lazily created HD renderer used for Bastion/live Warden. Cached canvases are composited into the board; warm cached frames can legitimately have zero new WebGL calls. The Warden Rig Bench, Prototype Bay and Foundry studio are separate pages with their own contexts. They are not a shared game scene today.

`?perf` now reports rolling rAF fps and p50/p95 over 120 samples. It sums calls and triangles immediately after **every** offscreen render in that game frame, and reads active geometry/texture/context counts from both Foundry renderers. Canvas work contributes to frame intervals but is not mislabeled as WebGL draw calls. Hidden-tab time is reset. This is a baseline instrument, not evidence of iPad performance.

## Delete and release sequencing

Do not delete assets in Phase 0. For each later phase, search the runtime, HTML pages, authoring tools and QA for each candidate before deletion. Retire sprite assertions only when their corresponding renderer is replaced. Keep pilot portraits, contract/UI art, fonts, audio, saves and published fixtures.

Phase 0 is **not complete**: no browser baseline/reference captures or iPad evidence have been collected. See `design/baseline/README.md`. No claim of visual parity, anomaly soak success, single-context rendering or native Safari performance is made.
