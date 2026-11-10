# Sites source candidate

This branch combines the VFX changes from PR #4 and the renderer Phase 0 preparation from PR #7, on top of main after reference-build PR #5. It resolves the shared `game.js` frame-loop and `index.html` script-order conflicts, preserving both the 440 ms VFX lifetime and performance frame hooks. The game script revision is bumped for the combined source.

The combined runtime passed all **48 simulation suites** with `npm test --prefix qa` on 2026-11-10. The existing Site source was opened with a native Sites write credential and matched deployed v98 at `853f1e7510dc2ca5940f09575efea737cfe2ea5a` before synchronization. The Site identity and public audience are retained.

This is a source candidate, not a release-verification record. Browser captures, the browser release gate, native iPad Safari/Chrome performance and the context-loss session remain pending. The original Sites source/packaging helper is unavailable in this session; direct authenticated Git handles source synchronization. No saved Sites version or production deployment is implied by a source push. Keep `docs/release-verification.json` at the last actually published release until the required checks and deployment complete.

The full shared-scene rebuild in issue #6 remains open. This candidate adds its Phase 0 tooling only; it does not replace the renderer, export the missing Blender chassis or complete later phases.
