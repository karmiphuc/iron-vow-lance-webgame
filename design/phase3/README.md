# Phase 3 export checkpoint

[Gatecrasher in a sortie with Vesper and Citadel shield](gatecrasher-sortie.webp) · [Gatecrasher asset](gatecrasher.webp) · [Cicada](cicada.webp) · [LI-01](li-01.webp) · [LI-02](li-02.webp) · [Reaver in a sortie](reaver.webp) · [Gravemaw](vanguard.webp) · [Aero in a sortie](aero-sortie.webp) · [Lion trial](lion-trial.webp) · [Tank and gunship](vehicles.webp) · [Hellbreaker sortie](hellbreaker-sortie.webp) · [Shogun loadout preview](shogun.webp) · [Chromium results](summary.json)

The static rig-v2 validator and its fixtures passed. Chromium rendered eight loadouts at 49,882–56,608 triangles. Each count matched the default-scene geometry plus the equipped parts. The integral muzzle moved 0.657 units when its elbow rotated. Both shield grips aligned with the wrist socket, and the grip moved 0.172 units during wrist articulation. WebGL reported zero errors.

The shield marker assertion reproduces a loader mismatch. Three.js strips dots from imported node names, so shield attachment lookup now accepts its sanitized names.

Gatecrasher also passed a live seeded sortie on desktop and touch Chromium. A legal move swung and planted its authored ankles. Both Morrow barrels and the body-mounted Vesper emitted from their native muzzle positions. Left-arm loss removed the shield or cleaver, right-arm loss removed the tagged plates and disabled the Morrow, and Vesper stayed eligible. The sortie used one WebGL context. The capture shows an equipped Gatecrasher against a stationary test opponent.

The real sortie-exit assertion found that debrief cleared the Foundry instances while leaving the battle scene resident. Debrief now clears the whole battle scene and the rig geometry is disposed once.

Cicada rendered all 49,978 triangles with 116 skinned and tagged primitives. The desktop and touch sorties each fired from both authored Locust racks and used the left emitter for Pulse Bash. Right-arm loss removed the tagged armor and disabled Locust fire.

LI-01 rendered 49,790 triangles in 146 primitives and LI-02 rendered 50,466 in 152. Desktop and touch sorties exercised two-hand carry, planted feet, 16 aimed carbine launches per variant and the loss of the right-arm armor and weapon.

The live dual-autocannon Reaver draws 16,340 triangles. The desktop and touch runs checked four-leg gait and planting, both authored muzzle origins, six reports each in dual- and right-cannon configurations, and all four arm states. Sortie cleanup disposed each of its 109 geometry buffers once.

Gravemaw's 20,158-triangle rig passed desktop and touch checks for planted feet, Piledriver pursuit and damage, the moving auger, six individual Hailstorm muzzle origins, and firing after left-arm loss.

Aero passed desktop and touch checks for all four Relay strikes, rail and carbine launch origins, Pike and shield fit, a pointer-selected Jumpjet and reload, and damage-free dodges with planted feet. The Hailstorm and Citadel shield loadout totals 59,592 triangles after the export reduced the dense meshes. The offline HTML loaded Aero, rail and Pike with network access blocked after the shared arsenal began resolving its embedded assets.

Lion's Cleaver, Hatchet and Breaker strikes retained their AP costs, authored contact timing and damage on desktop and touch. Sampled runtime joint and tip positions differed from the approved source by at most 0.044 source units. Planted foot drift stayed below 0.00011 world units. The practice target sits closer within its original tile, with a 0.030–0.131 world-unit tip gap at the contact frame and zero grip-to-tip intersections with Lion's torso. The trial left the saved career intact.

Kestrel and Basilisk passed desktop and touch checks for planted feet, alignment of all ten piston pairs, atlas paint channels, arm damage, Workshop weapon and shield fit, rail attacks and asset disposal. Basilisk's default volley used both authored pod positions. Their heaviest loadouts draw 38,421 and 46,321 triangles.

Hellbreaker's 57,726-triangle field rig passed desktop and touch checks for four alternating Morrow launches, two Breach Gauntlet hits after right-arm loss, salvage and disposal. Shogun passed both device profiles for its Morrow, Vesper and Cleaver, shield grip placement, weighted skirt, armor damage and disposal. All eight Shogun loadouts passed, peaking at 49,472 equipped triangles. The offline package embeds both GLBs byte for byte.

Ashigaru's desktop and touch runs exercised Needle from range 8, Flechette from range 2, and Signal Knife from range 1. The tests checked the sole plane, planted gait, both muzzle origins, knife contact damage, equipment visibility after arm loss, and exactly-once geometry disposal. The highest equipped count is 54,354 triangles.

Painted Warden uses its original Aim bind, measured joint pivots and standard arsenal. Desktop and touch runs verified that the game only requests the GLB when needed. Launching a sortie releases Workshop instances, and withdrawing releases sortie geometry exactly once. The checks also exercised paint, shield alignment, and the seven Rig Bench clips.

A one-seed campaign smoke completed 2,240 observed ticks with zero anomalies. A second invocation reused the completed seed. The final 30-seed campaign remains pending.

The tank draws 4,028 triangles in six primitives and the gunship draws 5,156 in five. The desktop and touch battle checks exercised picking, ground contact, hover, heading, damage, grounded wrecks and fire from the exported muzzles. Leaving the sortie detached the vehicles and disposed their shared geometry once. Both runs used one WebGL context and reported zero WebGL errors. The screenshot arranges both vehicles in a seeded test battle.

The sortie-exit assertion caught a cleanup call unavailable in the vendored Three.js. Cleanup now removes the instance from its parent before disposing shared geometry.

See the [Phase 3 gate](../../docs/phase3-export-gate.md) for commands. Remaining chassis conversion and the final 30-seed campaign are pending. Native iPad performance is unverified.
