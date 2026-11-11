# Phase 2 weapon mapping and timing compatibility

All 34 current catalog entries are covered (24 Workshop, nine built-ins, one shoulder item). The game owns AP, hit rolls, per-part damage, burst counts, audio IDs, and native/Aero/Lion clip timing. The new scene consumes those actual beats and contacts. A free-hand counter uses blade/fist contact, and the existing future Behemoth mortar presenter remains a separate body emitter.

The table lists nominal production action timing, in seconds. Existing native clips, Aero and Lion keep their authored overrides from `attackProfile`/`shoot`. These are explicit compatibility departures from the reference bench: rifle keeps eight rounds at .105 instead of three at .085; standard missiles keep two launches at .17 instead of three at .07; shotgun keeps twelve logical pellets instead of nine visual examples. This preserves hit/damage accounting for every logical round. Individual weapon anticipation and recovery remain as listed rather than changing action timers during the renderer port.

Melee uses the common reference pose keys (.38 wind, .46 contact, .50 strike, .72 hold, 1.10 end) mapped onto each existing logical attack, with collision-aware visual lunge capped at 2.6 m. Every landed melee contact has exactly .085 s hitstop; the old .095/.13 powered overrides are replaced. Reduced motion retains 3D and exact barrel aim, while dropping shake, zoom and hitstop. Rail visuals have the reference .06 s charge before the double beam; the existing logical travel/contact stays unchanged.

Physical aliases below are deliberate interim compatibility mounts for built-ins on a live kit. Their native hulls keep their own integral geometry and sockets in the temporary adapter pending Phase 3.

| Entry | Source | Archetype | Physical asset | Raise | Firing beats | Travel | Recover |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `rifle` | Workshop | rifle | rifle | 0.23 | 0, 0.105, 0.21, 0.315, 0.42, 0.525, 0.63, 0.735 | 0.1 | 0.34 |
| `shotgun` | Workshop | shotgun | shotgun | 0.28 | 0 | 0.12 | 0.43 |
| `missile` | Workshop | missile | missile | 0.35 | 0, 0.17 | 0.42 | 0.39 |
| `rail` | Workshop | rail | rail | 0.39 | 0 | 0.075 | 0.47 |
| `hailstorm` | Workshop | rifle | hailstorm | 0.36 | 0, 0.082, 0.164, 0.246, 0.328, 0.41, 0.492, 0.574, 0.656, 0.738, 0.82, 0.902 | 0.09 | 0.39 |
| `rampart` | Workshop | shotgun | rampart | 0.31 | 0 | 0.13 | 0.48 |
| `breaker` | Workshop | blade | breaker | 0.47 | 0 | 0.19 | 0.51 |
| `cleaver` | Workshop | blade | cleaver | 0.21 | 0 | 0.16 | 0.3 |
| `piledriver` | Workshop | blade | piledriver | 0.32 | 0 | 0.18 | 0.39 |
| `blade` | Workshop | blade | blade | 0.38 | 0 | 0.08 | 0.55 |
| `sidewinder` | Workshop | rifle | sidewinder | 0.23 | 0, 0.082, 0.164, 0.246, 0.328, 0.41, 0.492, 0.574, 0.656, 0.738, 0.82, 0.902 | 0.1 | 0.34 |
| `trident` | Workshop | rifle | trident | 0.23 | 0, 0.105, 0.21, 0.315, 0.42, 0.525, 0.63, 0.735 | 0.1 | 0.34 |
| `forge` | Workshop | shotgun | forge | 0.31 | 0 | 0.13 | 0.48 |
| `ember` | Workshop | rail | ember | 0.39 | 0 | 0.075 | 0.47 |
| `watchman` | Workshop | shotgun | watchman | 0.31 | 0 | 0.13 | 0.48 |
| `falcon` | Workshop | shotgun | falcon | 0.31 | 0 | 0.13 | 0.48 |
| `cerberus` | Workshop | missile | cerberus | 0.35 | 0, 0.17 | 0.42 | 0.39 |
| `obelisk` | Workshop | rail | obelisk | 0.39 | 0 | 0.075 | 0.47 |
| `rivet` | Workshop | rifle | rivet | 0.28 | 0, 0.072, 0.144, 0.216, 0.288, 0.36, 0.432, 0.504, 0.576, 0.648, 0.72, 0.792 | 0.095 | 0.38 |
| `parallax` | Workshop | rail | parallax | 0.72 | 0 | 0.075 | 0.56 |
| `hatchet` | Workshop | blade | hatchet | 0.21 | 0 | 0.16 | 0.3 |
| `pike` | Workshop | blade | pike | 0.32 | 0 | 0.18 | 0.39 |
| `tonfa` | Workshop | blade | tonfa | 0.21 | 0 | 0.16 | 0.3 |
| `anchor-hammer` | Workshop | blade | anchor-hammer | 0.47 | 0 | 0.19 | 0.51 |
| `morrow` | built-in | shotgun | rampart | 0.784 | 0, 0.298667 | 0.14 | 0.48 |
| `locust` | built-in | missile | missile | 0.784 | 0, 0.298667 | 0.46 | 0.39 |
| `breach-gauntlet` | built-in | blade | integral / hand | 0.357 | 0 | 0.21 | 0.41 |
| `pulse-bash` | built-in | blade | integral / hand | 0.357 | 0 | 0.21 | 0.33 |
| `aegis-cleave` | built-in | blade | cleaver | 1.08 | 0 | 0.29 | 0.7 |
| `aegis-bash` | built-in | blade | integral / hand | 1.12 | 0 | 0.29 | 0.7 |
| `needle-carbine` | built-in | rifle | rifle | 0.291667 | 0, 0.105, 0.21, 0.315, 0.42, 0.525, 0.63, 0.735 | 0.095 | 0.36 |
| `flechette-scattergun` | built-in | shotgun | shotgun | 0.125 | 0 | 0.08 | 0.26 |
| `signal-knife` | built-in | blade | cleaver | 0.35 | 0 | 0.12 | 0.42 |
| `vesper-shoulder` | shoulder | missile | missile | 0.35 | 0, 0.17 | 0.42 | 0.39 |

The shoulder item resolves through the actual `missile` attack, from the compatible native hull shoulder marker. Locust uses shoulder markers; Behemoth’s named `mortarMuzzle` is retained without inventing a new damage rule for the future body skill. The production free-hand counter uses the left fist.
