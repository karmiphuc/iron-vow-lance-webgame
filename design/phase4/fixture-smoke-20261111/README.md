# Focused Hangar fixture smoke — 2026-11-11

Final result: **PASS** on immutable revision `a11ddcca4620c9cf75116a398290fe54e6fdca57` (source includes `7435c30` and `842f081`). Exact input file hashes and assertion results are in `report.json`.

Run from repository root:

```sh
IRON_VOW_PORT=5198 node tools/dev-server.cjs
NODE_PATH=/workspace/iron-vow-phase2/qa/node_modules node qa/hangar-fixture-smoke.cjs
```

One final Chromium/SwiftShader browser at 960×670, with touch enabled and the fixture animation loop paused. A QA-only renderer shim advances camera and rig CPU state during unseen settling steps; the final frame of each step restores the real renderer and calls `gl.finish()`. Interaction is through actual Playwright mouse/touch input and DOM buttons; projected ray targets only locate reachable screen positions and never call `pick()` or `select()`.

Assertions cover initial 3/5 roster, active click and camera movement, Overview with every reserve reachable, reserve touch Workshop callback, visible and targetable facility hotspot, actual fourth-seat button producing 4/4 roster, fourth-seat touch selection, real `WEBGL_lose_context` loss/restoration, framebuffer readback, selection/roster/camera preservation, and idempotent GPU-resource disposal. No page errors occurred. Framebuffer readback found 766 sampled colors before loss and 764 after restoration, with GL error 0. Disposal released 489 observed resources, removed all rig records, and released nothing on the second call.

`fourth-seat-selected.png` and `context-restored.png` show the real rendered selected view before and after context restoration. Visual inspection of the restored frame found rigs visible on their pads with no obvious foot intersection.

`initial-attempt.json` retains the failed earlier attempt: real interaction checks passed, then screenshot timed out after aggressive unobserved GPU settling draws. The final harness uses the draw shim above and a four-minute browser watchdog. Source hashes remained unchanged through the final run, and the browser closed in `finally`.

This is a focused development-fixture check. It is not a full campaign check, a complete 48-case matrix, or a native GPU performance measurement.
