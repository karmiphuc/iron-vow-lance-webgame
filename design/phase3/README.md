# Phase 3 export checkpoint

[Gatecrasher with Vesper and Citadel shield](gatecrasher.webp) · [Cicada with both factory launchers](cicada.webp) · [Javelin tank and Kite gunship](vehicles.webp) · [Chromium results](summary.json)

The static rig-v2 validator and its fixtures passed. Chromium rendered eight loadouts at 49,882–56,608 triangles. Each count matched the default-scene geometry plus the equipped parts. The integral muzzle moved 0.657 units when its elbow rotated. Both shield grips aligned with the wrist socket, and the grip moved 0.172 units during wrist articulation. WebGL reported zero errors.

The shield marker assertion reproduces a loader mismatch. Three.js strips dots from imported node names, so shield attachment lookup now accepts its sanitized names.

Cicada rendered all 49,978 triangles with 116 skinned and tagged primitives. Each Locust launch anchor moved 0.320 units during its rack rotation while the other anchor held still.

The tank draws 4,028 triangles in six primitives and the gunship draws 5,156 in five. The desktop and touch battle checks exercised picking, ground contact, hover, heading, damage, grounded wrecks and fire from the exported muzzles. Leaving the sortie detached the vehicles and disposed their shared geometry once. Both runs used one WebGL context and reported zero WebGL errors. The screenshot arranges both vehicles in a seeded test battle.

The sortie-exit assertion caught a cleanup call unavailable in the vendored Three.js. Cleanup now removes the instance from its parent before disposing shared geometry.

Run the [Phase 3 gate](../../docs/phase3-export-gate.md) for the commands. Gatecrasher and Cicada are verified in the browser asset scene. Their live sortie integration, the full chassis roster, and native iPad performance are pending.
