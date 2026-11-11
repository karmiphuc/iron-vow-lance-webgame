# Claude reference builds (read-only)

Two single-file builds that set the bar for the renderer rebuild in the linked tracking issue. They are references to port from, not game code. Do not ship them, and do not edit them except to fix a reference bug.

| File | What it is |
| --- | --- |
| `mercenary-command.html` | The Mercenary Command build with a **single shared three.js scene** for the hangar, workshop turntable, thumbnails and battlefield. Its game rules are older and simpler than `dist/game.js`. Port the presentation, not the rules. |
| `rig-bench.html` | Rig Bench v2: all six procedural chassis, legs/core/arms module mixing, paint, per-part damage, camera presets, live metrics, and **War mode**, a seeded 5v5 soak with 17 invariant checks and fault injection. |

Both load three.js r128 from cdnjs. Locally, either serve them over HTTP with network access, or swap the script tag for `dist/rig-bench/vendor/three.min.js` (same r128 build).

## Where things live

Search the file for the quoted name.

### `mercenary-command.html`, script block "Iron Vow 3D layer"

| System | Search for | Notes |
| --- | --- | --- |
| Renderer setup | `/* ---------- renderer` | One WebGLRenderer, sRGB output, ACES tone mapping, exposure 1.05, PCF soft shadows, alpha canvas over the HTML UI. |
| Mech factory | `function makeMech` | Wraps `VowChassis.build`. Holds the spring state (`s.comp`, `pitch`, `arm`, `kx`, `kz`), aim, recoil, gait, part state. |
| Animation | `function animateMech` | Planted-foot gait with 2-bone leg IK, swing arc with toe pitch, settle steps, pelvis bob/sway, spine aim yaw, arm aim with elevation, recoil on shoulder/elbow/weapon carriage, melee keyframes, death topple and pilot-down kneel, visor flicker, pistons. |
| Melee timeline | `const MEL=` / `function meleeKeys` / `function lungeK` | Windup 0–0.38 s, strike to 0.5 s, contact 0.46 s, hold to 0.72 s, recover by 1.1 s, lunge up to 2.6 m. |
| FX pools | `function FX(` | Glow, fire, smoke and missile-flame sprites; spark and debris meshes; tracer streaks; rail beams; shockwave rings; scorch decals; arcing missile meshes with smoke trails; pooled point lights. No per-shot allocation. |
| Weapon FX | `function fireFX` | Per-weapon beats: rifle 3 rounds at 0.085 s, shotgun 9 pellets, missiles 3 arcs at 0.07 s, rail charge then 0.06 s beam, blade starts the melee timeline. |
| Melee contact | `function meleeUpdate` | Blade trail, contact sparks, light, knockback, **hitstop 0.085 s**, camera shake. |
| Explosions | `function explode` | Small and big variants: fire, sparks, debris, smoke, ring, scorch, shake. |
| Footfalls | `function onStep` | Dust, ground ring, pelvis compression, spine pitch, arm dip and camera shake, scaled by chassis weight (`HEAVY`). |
| Battlefield | `function buildBattleScene` / `function buildProps` / `function buildCover` | Per-contract lighting palettes (the second `const PAL=`; the first is the chassis paint table), fog, PMREM environment, wet ground roughness, plate tiles, hazard edge, set dressing. |
| Battle loop | `function battle3D` | Drives every mech from game state each frame. Hit reactions from `hitTime`, part state from HP, burning wrecks, storm lightning, beacons. |
| Battle camera | `function updateBattleCamera` | Board-fitted framing, combat zoom to the attacker–target midpoint during shots, shake. |
| Overlays | `function updateBattleOverlays` / `function drawBattleOverlay` | Reach and range tiles, selection and target rings, path chevrons, HP readouts projected from 3D. |
| Hangar | `function buildHangar` / `function hangar3D` | Live mechs on bays, crane hook, workers (walking, console, welding with sparks and light), dust motes, light shafts, click to select, camera eases between bays. |
| Workshop turntable | `function workshop3D` | Drag to rotate with inertia, live weapon, kits and paint. Note: it creates a second WebGL renderer. Do **not** copy that; use the single renderer (see the issue). |
| Thumbnails | `function thumb` | Renders the live rig to a cached image keyed by frame, team, paint and weapon. Also a separate renderer; same note. |
| Sound | `const SND=` | Procedural WebAudio: step, rifle, shotgun, missile, rail, blade, boom. |
| Paint | `chassisBay` / `bindBay` in the first script; `paint()` in the chassis kit | Three channels (primary, secondary, accent) on real PBR materials with grime and panel-normal maps. 9 named liveries plus a 16-swatch palette per channel. |

### `rig-bench.html`

| System | Search for |
| --- | --- |
| Chassis kit (same code as `dist/foundry/chassis.js` before Codex's edits) | `/* ---- chassis.js ---- */` |
| Game animation layer | `/* ---- anim.js ---- */` |
| Renderer, hangar pad, arena, audio, orbit camera, rig overlay, metrics | `/* ---- core.js ---- */` |
| Bench mode: build, paint, damage, views, metrics, lineup, IK markers | `/* ---- bench.js ---- */` |
| War mode: seeded sim, draft, cover, AI, anomaly checks, fault injection, soak, headless API | `/* ---- war.js ---- */` |
| Boot, sheets, keyboard, render loop | `/* ---- main.js ---- */` |

The War-mode anomaly checks are `const CHECKS=` and `function checkUnit` / `function checkWorld`. The headless API is `window.__bench` (`runSoak`, `inject`, `step`, `runUntil`, `eventLog`, `report`).

## Directional impacts and electrical faults (3D version of PR #4)

`rig-bench.html` adds the two ideas from PR #4 to the 3D effects. **Port these in Phase 2; do not port the 2D canvas version.**

| Piece | Search for | What it does |
| --- | --- | --- |
| Impact profiles | `const IMPACT=` / `function impact` | A white-hot flash, a coloured glow and a point light, then a spark spray thrown **back out of the hit toward the shooter**. Also molten blobs, plus armour chips and smoke on heavy hits. Profiles: rifle 13 sparks, shotgun 20 wide, missile 28 wide with chips, rail 16 fast and narrow in blue-white, blade 18. `BT.lowFx` (on for touch devices) also cuts footfall dust, slam dust and arc sparks. Impact and fault effects return early under the soak stub (`NULLFX.isNull`). |
| Spark spray | `f.spray=` | A cone-shaped directional burst in the shared spark pool. The first 30% are fast white-hot streaks. Sparks are sized to read at battle-camera distance: about 15 cm × 1 m for hot streaks, 10 cm × 0.6 m for the rest. At the base 5 × 38 cm size they were invisible beyond close range. |
| Arcs | `f.arc=` and the `arcs` loop in `f.update` | A 7-segment jagged bolt between two points: an electric-blue core (`0x4fa2ff`) inside a saturated blue halo (`0x1f5cff`), re-jittered every 45 ms, with random flicker. Depth-tested with a small units-only depth bias (factor 0, units −1), so cover and other mechs hide it while the hull-surface endpoints keep it visible on its own mech. Pooled; no allocation per arc. |
| Fault driver | `function faultFX` / `function surfacePoint` | **Critical** (body under 24%, weapon arm or legs destroyed): one arc every 1.35–1.75 s between part pairs. **Collapse:** arcs on fixed beats (0.07–1.75 s), then a **ground slam** at 0.95 s (`function groundSlam`: one rolling dust wall, translucent air shockwave, smoke, scraping sparks, shake). `surfacePoint` pushes the internal part anchors out to the hull so the arcs sit on the armour. Off under reduced motion. Input: `bodyRatio` on `animateMech`. |
| Hooks | `droneHit`, `applyDamage` (War), `meleeUpdate` | Every landed round and every blade contact calls `impact()` with the direction back to the attacker. |
| Dust and air shockwave | `f.dustwave` / `f.airwave` | These replace the flat additive `f.ring` that read as a halo, for footfalls, the collapse ground slam and big explosions. `f.dustwave` is a **single** dust wall: soft puffs launched outward from the contact point, slowed by drag so they roll out and settle. `f.airwave` is a clear expanding hemisphere drawn only at its rim (a fresnel shader), so the air shock is translucent, not a white band. Footfalls use dust only. Rail muzzle rings keep `f.ring` because they're energy, not dust. |
| Spark floor | `BT.floor` | Sparks bounce at the actual ground height (the bench pad sits 0.35 m up). Debris bounces at the same floor. In the game, use the terrain height under the hit. |

Local verification and [captures](../../../design/reference-vfx/pr8/manifest.json) are committed, including a [profile contact sheet](../../../design/reference-vfx/pr8/contact-sheet.png) and the raw [seeded comparison](../../../design/reference-vfx/pr8/seeded-comparison.json). `node qa/reference-vfx.cjs --out <directory>` checks the actual Fire hooks for all five profiles, desktop/touch particle counts, natural critical/collapse arcs, the 0.95-second slam and reduced motion. The review fixed a missing missile hook: the prior PR head produced no directional missile spray; it now produces three profile bursts per salvo.

To compare simulation outcomes, supply `--baseline <previous-rig-bench.html>`; `--soak-only` repeats only that comparison. Three battles at seed 4242 matched at 10,915 ticks, two ally wins and one enemy win, including all 77 pre-existing correctness anomalies. Raw host-timing `frameSpike` counts (3 before, 2 after) are retained separately from deterministic equality. No page/console errors occurred in the browser checks. These are software-WebGL results; iPad hardware performance and the future shared-scene zero-anomaly gate remain unverified.

## Fixed in this copy

Minification had swallowed two statements behind `//` comments. They are restored on their own lines here:

1. `meleeUpdate`: blade contact sparks, glow and light did not fire in the bench.
2. `inject()`: the `if(!u)return null;` guard after the `stuck` comment.

## Known limits

- Rig Bench War mode uses bench-only stand-in combat numbers, not `dist/game.js` rules.
- `mercenary-command.html` creates extra WebGL contexts for the workshop and thumbnails, and its Export Career button relies on a download link.
