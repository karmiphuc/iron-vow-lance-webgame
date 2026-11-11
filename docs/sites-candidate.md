# Sites source candidate

PR #4 is closed at the owner's request and superseded by the 3D reference effects in PR #8. This candidate removes the unshipped 2D VFX module, integration and associated checks. Its runtime matches the renderer Phase 0 preparation in PR #7; the performance overlay remains available with `?perf`.

After withdrawing PR #4, the current runtime passes all **47 simulation suites** with `npm test --prefix qa` (2026-11-11). PR #8 is merged into GitHub main and this candidate's source; it changes the reference and its QA evidence only. The existing Site source matched deployed v98 at `853f1e7510dc2ca5940f09575efea737cfe2ea5a` before the earlier synchronization. The Site identity and public audience are retained.

This is a source candidate, not a release-verification record. Local Playwright screenshots are explicitly approved in AGENTS.md and PR #7. The earlier combined candidate's release check was interrupted after its desktop Rig Bench locator timeout; it did not pass. A new Phase 0 capture matrix is being collected without PR #4's effects. Native iPad Safari/Chrome performance and the context-loss session remain pending. A source push does not imply a saved version or production deployment. Keep `docs/release-verification.json` at the last actually published release until the required checks and deployment complete.

The full shared-scene rebuild in issue #6 remains open. PR #8 changes the read-only Rig Bench reference for a later Phase 2 port; it does not add 3D effects to `dist/`. This candidate adds Phase 0 tooling only; it does not replace the renderer, export the missing Blender chassis or complete later phases. The previous `sites/iron-vow-candidate` branch and its screenshots are historical evidence of the withdrawn candidate.
