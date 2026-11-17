# Phase 3 export checkpoint

[Gatecrasher in a sortie with Vesper and Citadel shield](gatecrasher-sortie.webp) · [Gatecrasher asset](gatecrasher.webp) · [Cicada](cicada.webp) · [LI-01](li-01.webp) · [LI-02](li-02.webp) · [Reaver](reaver.webp) · [Tank and gunship](vehicles.webp) · [Chromium results](summary.json)

The static rig-v2 validator and its fixtures passed. Chromium rendered eight loadouts at 49,882–56,608 triangles. Each count matched the default-scene geometry plus the equipped parts. The integral muzzle moved 0.657 units when its elbow rotated. Both shield grips aligned with the wrist socket, and the grip moved 0.172 units during wrist articulation. WebGL reported zero errors.

The shield marker assertion reproduces a loader mismatch. Three.js strips dots from imported node names, so shield attachment lookup now accepts its sanitized names.

Gatecrasher also passed a live seeded sortie on desktop and touch Chromium. A legal move swung and planted its authored ankles. Both Morrow barrels and the body-mounted Vesper emitted from their native muzzle positions. Left-arm loss removed the shield or cleaver, right-arm loss removed the tagged plates and disabled the Morrow, and Vesper stayed eligible. The sortie used one WebGL context. The capture shows an equipped Gatecrasher against a stationary test opponent.

The real sortie-exit assertion found that debrief cleared the Foundry instances while leaving the battle scene resident. Debrief now clears the whole battle scene and the rig geometry is disposed once.

Cicada rendered all 49,978 triangles with 116 skinned and tagged primitives. The desktop and touch sorties each fired from both authored Locust racks and used the left emitter for Pulse Bash. Right-arm loss removed the tagged armor and disabled Locust fire.

LI-01 rendered 49,790 triangles in 146 primitives and LI-02 rendered 50,466 in 152. Desktop and touch sorties exercised two-hand carry, planted feet, 16 aimed carbine launches per variant and the loss of the right-arm armor and weapon.

The dual-autocannon Reaver asset rendered 16,340 triangles. The right muzzle followed its authored elbow, moving 0.612 units during the pose probe. Its four-legged sortie animation and arm-damage states are pending.

The tank draws 4,028 triangles in six primitives and the gunship draws 5,156 in five. The desktop and touch battle checks exercised picking, ground contact, hover, heading, damage, grounded wrecks and fire from the exported muzzles. Leaving the sortie detached the vehicles and disposed their shared geometry once. Both runs used one WebGL context and reported zero WebGL errors. The screenshot arranges both vehicles in a seeded test battle.

The sortie-exit assertion caught a cleanup call unavailable in the vendored Three.js. Cleanup now removes the instance from its parent before disposing shared geometry.

See the [Phase 3 gate](../../docs/phase3-export-gate.md) for commands. Remaining chassis conversion and the final 30-seed campaign are pending. Native iPad performance is unverified.
