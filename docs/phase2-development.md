# Phase 2 development handoff

Preparation on an isolated branch while Phase 1 verification completes. Nothing here is merged, connected to the main runtime, or claimed verified.

`dist/scene/effects.js` ports the final PR #9 reference's actual FX pools, arcing missiles, trails, beams, directional impact profiles, electrical arcs/faults, ground slam, explosion and footfall helpers into a factory owned by the shared battle scene. There is no additional renderer. Terrain sampling replaces the reference bench's constant spark/debris floor and scorch plane. Decals use factor 0 / units −1 and arcs retain the final depth-tested PR #9 correction. Visual random numbers are isolated from game rule draws. Integration and meaningful GPU/action tests remain outstanding.

The current catalog contains {'Workshop': 24, 'built-in': 9, 'shoulder': 1}, rather than the issue's older 22-Workshop count. Every current entry is listed below. A free-hand counter and Behemoth mortar also need explicit coverage. These are the *existing logical attack profiles*, for preserving rule behavior while the reference visual timelines are integrated; they are not final Phase 2 timings or a claim that the old profiles meet the reference. Special action paths still require their dedicated profile lookup.

| Weapon | Source | Reference archetype | Existing beats (s) | Existing raise / travel / recover (s) |
| --- | --- | --- | --- | --- |
| `rifle` | Workshop | rifle | 0, 0.105, 0.21, 0.315, 0.42, 0.525, 0.63, 0.735 | 0.23 / 0.1 / 0.34 |
| `shotgun` | Workshop | shotgun | 0 | 0.28 / 0.12 / 0.43 |
| `missile` | Workshop | missile | 0, 0.17 | 0.35 / 0.42 / 0.39 |
| `rail` | Workshop | rail | 0 | 0.39 / 0.075 / 0.47 |
| `hailstorm` | Workshop | rifle | 0, 0.082, 0.164, 0.246, 0.328, 0.41, 0.492, 0.574, 0.656, 0.738, 0.82, 0.902 | 0.36 / 0.09 / 0.39 |
| `rampart` | Workshop | shotgun | 0 | 0.31 / 0.13 / 0.48 |
| `breaker` | Workshop | blade | 0 | 0.47 / 0.19 / 0.51 |
| `cleaver` | Workshop | blade | 0 | 0.21 / 0.16 / 0.3 |
| `piledriver` | Workshop | blade | 0 | 0.32 / 0.18 / 0.39 |
| `blade` | Workshop | blade | 0 | 0.38 / 0.08 / 0.55 |
| `sidewinder` | Workshop | rifle | 0, 0.082, 0.164, 0.246, 0.328, 0.41, 0.492, 0.574, 0.656, 0.738, 0.82, 0.902 | 0.23 / 0.1 / 0.34 |
| `trident` | Workshop | rifle | 0, 0.105, 0.21, 0.315, 0.42, 0.525, 0.63, 0.735 | 0.23 / 0.1 / 0.34 |
| `forge` | Workshop | shotgun | 0 | 0.31 / 0.13 / 0.48 |
| `ember` | Workshop | rail | 0 | 0.39 / 0.075 / 0.47 |
| `watchman` | Workshop | shotgun | 0 | 0.31 / 0.13 / 0.48 |
| `falcon` | Workshop | shotgun | 0 | 0.31 / 0.13 / 0.48 |
| `cerberus` | Workshop | missile | 0, 0.17 | 0.35 / 0.42 / 0.39 |
| `obelisk` | Workshop | rail | 0 | 0.39 / 0.075 / 0.47 |
| `rivet` | Workshop | rifle | 0, 0.072, 0.144, 0.216, 0.288, 0.36, 0.432, 0.504, 0.576, 0.648, 0.72, 0.792 | 0.28 / 0.095 / 0.38 |
| `parallax` | Workshop | rail | 0 | 0.72 / 0.075 / 0.56 |
| `hatchet` | Workshop | blade | 0 | 0.21 / 0.16 / 0.3 |
| `pike` | Workshop | blade | 0 | 0.32 / 0.18 / 0.39 |
| `tonfa` | Workshop | blade | 0 | 0.21 / 0.16 / 0.3 |
| `anchor-hammer` | Workshop | blade | 0 | 0.47 / 0.19 / 0.51 |
| `morrow` | built-in | shotgun | 0, 0.298667 | 0.784 / 0.14 / 0.48 |
| `locust` | built-in | missile | 0, 0.298667 | 0.784 / 0.46 / 0.39 |
| `breach-gauntlet` | built-in | blade | 0 | 0.357 / 0.21 / 0.41 |
| `pulse-bash` | built-in | blade | 0 | 0.357 / 0.21 / 0.33 |
| `aegis-cleave` | built-in | blade | 0 | 1.08 / 0.29 / 0.7 |
| `aegis-bash` | built-in | blade | 0 | 1.12 / 0.29 / 0.7 |
| `needle-carbine` | built-in | rifle | 0, 0.105, 0.21, 0.315, 0.42, 0.525, 0.63, 0.735 | 0.291667 / 0.095 / 0.36 |
| `flechette-scattergun` | built-in | shotgun | 0 | 0.125 / 0.08 / 0.26 |
| `signal-knife` | built-in | blade | 0 | 0.35 / 0.12 / 0.42 |
| `vesper-shoulder` | shoulder | missile | contact / special action | special action path |

Outstanding integration: per-round real 3D origin/aim and terrain direction impacts; shield interception; all weapon and built-in mappings with actual production sockets; reference melee/rail/rifle timeline and documented compatibility decisions; per-part reactions and plate detachment; 14-second burning wreck smoke; jumpjet/mortar; dynamic reduced motion; migrate floating text only and delete replaced 2D effects/weapon compositing; all nine Phase 2 scene checks and actual-weapon campaigns. Rebase on the final Phase 1 merge before opening or merging the Phase 2 PR.


`weapon-fx.js` now declares all 34 catalog profiles plus free-hand and mortar. The base rifle/missile and common melee visual timelines use the reference numbers; other profiles retain their individual existing beats as the integration starting point. Built-in physical weapon aliases and socket choices are explicit. The mapping is not yet connected to action resolution, and these declarations alone do not satisfy the weapon or timing gates.


Owner direction for Phase 2: pay attention to PR #20 and the existing defects, and trust Claude's work highly as reliable. Use PR #20's corrected gait as the reference baseline and give its recorded evidence substantial weight. Focus new verification on the production port, existing terrain/brace regressions and identified integration bugs. The old preparation must be reconciled with PR #19's plasma/crawl/joint effects and PR #20's gait before integration; preserve real production rules and action timers.

The numerical FX regression reproduced a missile-arrival scratch-vector alias inherited from the reference: smoke emission overwrote the scratch flight position before the arrival callback. The fix adds one position vector per pooled missile and uses it through trail emission, preserving the endpoint without per-frame vector allocation. The fix still needs full real-action integration coverage.

PRs #19 and #20 are merged on main. The prepared FX factory now uses the approved plasma ribbons, random crawl and joint-short mix, with the production terrain floors, camera ownership, exact disposal and per-missile endpoint fix retained. The real Three.js pool regression passes on that combined code. The gait now ports #20’s actual root velocity, reachable swings/landings, catch-up and settling, with per-chassis duty/stride/carry/fire data and the height-aware pelvis/support/brace safeguards retained. The existing real production rig suite passes: zero measured planted-foot slide for all six leg types, three planted Behemoth feet per walk frame, artillery fold and Oni carry/fire checks. Terrain stop/lunge integration and all Phase 2 runtime/action gates remain pending.
