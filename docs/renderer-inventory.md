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

## Rig contract v2 gap table

Exact biped names: `root`, `pelvis`, `spine`, `neck`, `shoulder.L`, `elbow.L`, `wrist.L`, `socket.L`, `shoulder.R`, `elbow.R`, `wrist.R`, `socket.R`, `hip.L`, `knee.L`, `ankle.L`, `hip.R`, `knee.R`, `ankle.R`. Quad legs replace the biped leg list with `mount/hip/knee/ankle.LF/RF/LB/RB`. Both alternatives are audited because every GLB is missing the required `quad` root dimension. Equipment files are listed separately from chassis requirements. Missing paint names use the five exact contract material names. Part coverage counts mesh-level `extras.part`; node-level tags are recorded separately in JSON. Detach counts do not certify which plates should detach. Full present/missing lists, sockets and invalid tags are in `renderer-inventory.json`.

| GLB | Scope | Bones present / required and gaps | Missing paint slots | Mesh part tags; detach | Missing dimensions | Authored clips |
| --- | --- | --- | --- | --- | --- | --- |
| `rig-bench/basilisk.glb` | chassis | 18/18; missing none<br>quad: 12/28; missing mount.LF, hip.LF, knee.LF, ankle.LF, mount.RF, hip.RF, knee.RF, ankle.RF, mount.LB, hip.LB, knee.LB, ankle.LB, mount.RB, hip.RB, knee.RB, ankle.RB | paint_primary, paint_secondary, paint_accent, visor, stack | 0/40; detach meshes/nodes 0/0 | 15/15 | none |
| `rig-bench/bastion-bst04.glb` | chassis | 0/18; missing all<br>quad: 0/28; missing all | paint_primary, paint_secondary, paint_accent, visor, stack | 0/67; detach meshes/nodes 0/0 | 15/15 | `ROOT`, `Pelvis`, `Chest`, `Cockpit`, `Launcher.R`, `Missile.01`, `Exhaust.01`, `Batch Exhaust.01`, `Missile.02`, `Exhaust.02`, `Batch Exhaust.02`, `Missile.03`, `Exhaust.03`, `Batch Exhaust.03`, `Missile.04`, `Exhaust.04`, `Batch Exhaust.04`, `Missile.05`, `Exhaust.05`, `Batch Exhaust.05`, `Missile.06`, `Exhaust.06`, `Batch Exhaust.06`, `Pauldron.L`, `Pauldron.R`, `UpperArm.L`, `Forearm.L`, `Hand.L`, `UpperArm.R`, `Forearm.R`, `Hand.R`, `Claw.Thumb`, `HipArmorBack.L`, `HipArmorBack.R`, `HipArmorFront.L`, `HipArmorFront.R`, `HipArmorOuter.L`, `HipArmorOuter.R`, `Thigh.L`, `Shin.L`, `Foot.L`, `Thigh.R`, `Shin.R`, `Foot.R`, `Piston ankle L1 / cylinder`, `Piston ankle L1 / sliding rod`, `Piston ankle L2 / cylinder`, `Piston ankle L2 / sliding rod`, `Piston ankle R1 / cylinder`, `Piston ankle R1 / sliding rod`, `Piston ankle R2 / cylinder`, `Piston ankle R2 / sliding rod`, `Piston elbow L / cylinder`, `Piston elbow L / sliding rod`, `Piston elbow R / cylinder`, `Piston elbow R / sliding rod`, `Piston knee L1 / cylinder`, `Piston knee L1 / sliding rod`, `Piston knee L2 / cylinder`, `Piston knee L2 / sliding rod`, `Piston knee R1 / cylinder`, `Piston knee R1 / sliding rod`, `Piston knee R2 / cylinder`, `Piston knee R2 / sliding rod`, `Piston waist L1 / cylinder`, `Piston waist L1 / sliding rod`, `Piston waist L2 / cylinder`, `Piston waist L2 / sliding rod`, `Piston waist R1 / cylinder`, `Piston waist R1 / sliding rod`, `Piston waist R2 / cylinder`, `Piston waist R2 / sliding rod` |
| `rig-bench/bastion-carbine.glb` | equipment | Equipment; chassis skeleton not required | paint_primary, paint_secondary, paint_accent, visor, stack | 0/12; detach meshes/nodes 0/0 | 15/15 | none |
| `rig-bench/bastion-melee.glb` | equipment | Equipment; chassis skeleton not required | paint_primary, paint_secondary, paint_accent, visor, stack | 0/32; detach meshes/nodes 0/0 | 15/15 | none |
| `rig-bench/expansion-weapons.glb` | equipment | Equipment; chassis skeleton not required | paint_primary, paint_secondary, paint_accent, visor, stack | 0/119; detach meshes/nodes 0/0 | 15/15 | none |
| `rig-bench/kestrel.glb` | chassis | 18/18; missing none<br>quad: 12/28; missing mount.LF, hip.LF, knee.LF, ankle.LF, mount.RF, hip.RF, knee.RF, ankle.RF, mount.LB, hip.LB, knee.LB, ankle.LB, mount.RB, hip.RB, knee.RB, ankle.RB | paint_primary, paint_secondary, paint_accent, visor, stack | 0/40; detach meshes/nodes 0/0 | 15/15 | none |
| `rig-bench/prototypes/bulwark.glb` | chassis | 0/18; missing all<br>quad: 0/28; missing all | paint_primary, paint_secondary, paint_accent, visor, stack | 0/3; detach meshes/nodes 0/0 | 15/15 | `Idle`, `Strike`, `Bash`, `Grip` |
| `rig-bench/prototypes/cicada.glb` | chassis | 0/18; missing all<br>quad: 0/28; missing all | paint_primary, paint_secondary, paint_accent, visor, stack | 0/31; detach meshes/nodes 0/0 | 15/15 | `Idle`, `Walk`, `Deploy`, `Fire` |
| `rig-bench/prototypes/gatecrasher.glb` | chassis | 0/18; missing all<br>quad: 0/28; missing all | paint_primary, paint_secondary, paint_accent, visor, stack | 0/61; detach meshes/nodes 0/0 | 15/15 | `Idle`, `Walk`, `Deploy`, `Fire`, `Strike` |
| `rig-bench/prototypes/hellbreaker.glb` | chassis | 0/18; missing all<br>quad: 0/28; missing all | paint_primary, paint_secondary, paint_accent, visor, stack | 0/37; detach meshes/nodes 0/0 | 15/15 | `Idle`, `Walk`, `Deploy`, `Fire` |
| `rig-bench/prototypes/scout.glb` | chassis | 3/18; missing neck, shoulder.L, elbow.L, wrist.L, socket.L, shoulder.R, elbow.R, wrist.R, socket.R, hip.L, knee.L, ankle.L, hip.R, knee.R, ankle.R<br>quad: 3/28; missing neck, shoulder.L, elbow.L, wrist.L, socket.L, shoulder.R, elbow.R, wrist.R, socket.R, mount.LF, hip.LF, knee.LF, ankle.LF, mount.RF, hip.RF, knee.RF, ankle.RF, mount.LB, hip.LB, knee.LB, ankle.LB, mount.RB, hip.RB, knee.RB, ankle.RB | paint_primary, paint_secondary, paint_accent, visor, stack | 0/14; detach meshes/nodes 0/0 | 15/15 | `Idle`, `Quickstep`, `Fire`, `Burst`, `Strike` |
| `rig-bench/shields.glb` | equipment | Equipment; chassis skeleton not required | paint_primary, paint_secondary, paint_accent, visor, stack | 0/34; detach meshes/nodes 0/0 | 15/15 | none |
| `rig-bench/warden-painted.glb` | chassis | 0/18; missing all<br>quad: 0/28; missing all | paint_primary, paint_secondary, paint_accent, visor, stack | 0/23; detach meshes/nodes 0/0 | 15/15 | none |
| `rig-bench/warden.glb` | chassis | 18/18; missing none<br>quad: 12/28; missing mount.LF, hip.LF, knee.LF, ankle.LF, mount.RF, hip.RF, knee.RF, ankle.RF, mount.LB, hip.LB, knee.LB, ankle.LB, mount.RB, hip.RB, knee.RB, ankle.RB | paint_primary, paint_secondary, paint_accent, visor, stack | 0/39; detach meshes/nodes 0/0 | 15/15 | none |
| `rig-bench/weapons.glb` | equipment | Equipment; chassis skeleton not required | paint_primary, paint_secondary, paint_accent, visor, stack | 0/82; detach meshes/nodes 0/0 | 15/15 | none |

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

Phase 0 is **not complete**: the full reviewed capture/filmstrip set and native iPad evidence are still being collected. See `design/baseline/README.md`. No claim of visual parity, anomaly soak success, single-context rendering or native Safari performance is made.
