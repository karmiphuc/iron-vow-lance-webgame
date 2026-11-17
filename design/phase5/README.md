# Phase 5 evidence

Run the gate from the repo after setting up the optional QA dependencies.

```sh
IRON_VOW_SOFTWARE_QA=1 IRON_VOW_QA_SERIAL=1 IRON_VOW_QA_ATTEMPTS=1 IRON_VOW_QA_TIMEOUT_MS=45000 node qa/gate-phase5.cjs --out /tmp/iron-vow-phase5
npm --prefix qa test
```

The gate exercises desktop pointer input and iPhone 13 Chromium touch emulation with real WebGL rendering. It checks inertial drag, pinch and double-tap reset, fitted gear and reinforcement, damage, context restoration and scope release. The 640×640 checks cover Workshop bay cards, the duty roster, combat target, attack-camera inset and Ship seats. They verify one shared WebGL context and separate cache changes for paint, trim, weapons, kit and damage. [Workshop capture](workshop.webp)

The palette combines nine reference liveries, seven legacy plate liveries and Factory. The original Workshop shipped six named colors and used `#b0a88d` for the displayed Factory chip in `a1a9b7f:dist/game.js`. Neutral plates retains that visible shade with the Workshop's default secondary and accent colors. Factory restores the chassis's native materials. Saves retain `paint` and `trim {s,a}`.

A late equipment-load event previously reset the touch scroll position by rebuilding the page. The touch turntable gate now exercises the startup path while equipment images fill in place. Native iPad Pro frame rate is unverified.
