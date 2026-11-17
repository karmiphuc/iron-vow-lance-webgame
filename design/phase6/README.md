# Phase 6 · Rig Bench and War

[Desktop Rig Bench](rig-bench.webp), [desktop War](war.webp), and the [desktop and touch gate report](summary.json) cover the integrated runtime from `d2db55df0b160b4efee48f8b4f928722785f8777`, with `dist` tree `0a86fcda372000ad5bc99d356d332a1c0129c749`.

- The Workbench exercised 22 chassis, including Lion Trial, all 34 mounted weapon entries, both shields, Vesper, reinforcement levels, all three paint channels, all camera views, part damage and per-foot IK. The gate swapped separately authored Bastion upper and Basilisk lower assemblies at the animated pelvis, and separately checked kit leg, core and arm modules.
- The shared scrubber opened all six Prototype Bay assets and the seven Warden archive clips. Node compared 10,790 Warden poses against the approved data. The packaged offline build opened the live Warden from Workshop and scrubbed the archive with Chromium networking disabled.
- War and the game run the same terrain, action, damage and reaction rules. Live Chromium and the VM matched the seeded command and event reports for Picket Sweep and the Iron Corridor, including the tank, gunship and reactions. The career storage probe saw zero opens. All 19 isolated diagnostic faults were detected on desktop and touch. Both soaks reached 10 natural outcomes, with seven allied wins and three enemy wins on each device. The observer sampled 3,528 desktop and 3,546 touch frames with zero anomalies. The report records the observed chassis × weapon, legs × weapon and theater × chassis cells.
- The same source passed all 58 Node suites and separate desktop and touch checks for Hangar navigation and context restoration, the Workshop turntable, painting, live portraits and Bastion's fitted launcher and hand sockets.

The [QA guide](../../qa/README.md#rig-bench-and-war) describes the gate and report format.
