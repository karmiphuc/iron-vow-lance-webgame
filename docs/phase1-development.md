# Phase 1 development handoff

PR #18 is a draft. This document records development findings, not final verification or permission to merge.

Implemented so far:

- One WebGL owner for the board, live rigs and render-target UI previews. The eight live frame IDs are 0, 5, 6, 7, 8, 9, 10 and 12; the other twelve and vehicles use `dist/scene/billboards.js`.
- Shared reference environment/cover helpers, actual terrain elevation, reference ground roughness and lightning, raycast proxies, projected HP, range/reach tiles, path chevrons, mouse pan, wheel/pinch, map and attack-camera integration.
- Warden and Bastion share a measured-pivot rigid adapter and the kit animator. Bastion's authored stance is only a binding source; its separate runtime clip renderer is deleted. Combat uses the specified 0.9 scale; the old 1.415 Warden image-framing scale stays limited to UI previews.
- Deleted the replaced 2D board, terrain, cover, attack panes, picking fallback, `drawToned`, filter detection and live-frame travel data. `foundry/renderer.js` was replaced by shared-scene/preview support in `scene-rigs.js`. Twelve-frame data in `foundry/baked.js` and `walk.js` remains until Phase 3.
- PMREM targets, shadow maps and cached preview resources are disposed/rebuilt on scene/context changes. Quality sampling lowers the DPR cap to 1.5 and shadows to 1024 after measured frame times exceed the budget; software tests make no performance claim.

The new actual-bone campaign checker found startup/turn overreach and a quad idle pose that overwrote world-space anchors. Fixes start a standing biped at mid-stance, compress the pelvis for uneven terrain and use an actual recovery step before a stance anchor exceeds reach. Recovery uses the reference swing duration and 0.03 m IK margin. Behemoth's folding front feet are explicitly airborne; a knee-pad contact is checked only while both hull and fold are fully planted.

`qa/check-scene-regressions.cjs` reproduces the old gait failure using the animator from `18f34e1`: model 0's planted ankle was 0.405 m off the floor. The current six-kit start/stop/right-angle fixture passes the unchanged 0.15 m ground and 0.30 m slide limits, with numerical-scale residuals. The campaign checker also reads real GLB bones and exact campaign commands.

The latest three-seed development run (4242–4244) completed all battles with no foot-ground/foot-slide errors, but a footprint overlap remains during a legal move near Behemoth. This is unresolved. A test-only 4.5 m grid experiment still reported overlap and is not a production change. The checker now enforces the reference 80% footprint radii as well as actual ankle-mesh hulls and cover bounds. The owner approved spacing and clearance adjustments. A 6.8 m horizontal pitch, with terrain heights kept at the original 3.4 m scale, cleared the three-seed trial (13,989 ticks). The 30-seed gate is still pending.

Most recent complete pure suite run: 45 suites passed after retiring four obsolete sprite/filter test files and adding actual rigid-binding and world-gait checks. Procurement, saves, migration, combat/AP, campaign completion, roster and DOM checks remain. Rendering assertions moved from the Node canvas tests to Chromium. Additional edits after that run still require final verification.

Outstanding before merge:

1. Complete the full clearance soak at the owner-approved spacing, preserving rules and action timings.
2. Finish/run `qa/browser/shared-scene.cjs`: actual context count, raycasts, controls, overlays, Skip, real `WEBGL_lose_context` recovery, and a 10×10 checkpoint fixture.
3. Verify delayed billboard image loads redraw correctly; captures exposed a cached shadow-only vehicle before invalidation/readiness was added.
4. Retire or adapt the remaining browser tests that assert replaced 2D paths; wire the shared-scene case into the maintained browser entrypoint.
5. Run at least 30 seeded battles with every live frame and zero required anomalies. Add cover overlap checks and retain failure evidence/fault-injection validation.
6. Run the capture workflow at all four viewports, inspect the baseline/reference/candidate contact sheet, commit raw reports/hashes, and rerun final suites on the immutable head.
7. Update #11/#18 and `renderer-progress.json`, then merge only the validated exact head. Proceed to Phase 2 afterward.

Native iPad Safari/Chrome measurements remain untested. The owner's “Dont care, just cont” direction makes waiting for those measurements nonblocking; it does not certify native performance.

Phase 3 still requires the owner's Blender MCP and external `.blend` files. Their absence does not block completing Phases 1–2. No Site deployment has been made.

Owner direction: “Allow spacing and clearance adjustments” (reply to the documented grid study). The current 6.8 m pitch keeps the required 0.9 chassis scale and adds room for full planted strides on legal adjacent tiles. Terrain height is decoupled from that horizontal pitch. Close-camera scale and overview zoom transition are adapted to preserve legibility; final captures remain pending.


Latest candidate after `63b7574`: the first complete 30-battle run checked 131,459 ticks with one actual WebGL context, zero browser errors and zero overlap/NaN/bounds/stuck findings. Ten Behemoth rear-foot ground/slide findings remained. The raw failed report is retained in `design/phase1/development/campaign-30-before-brace-fix.json`. The brace fix caps pelvis height at the solved support height, lets rear feet settle in parallel and limits each continuous turn step to the planted feet's reach. Folding waits for the supported turn, without changing game action timers. Both the six-kit start/stop/turn fixture and the new four-heading artillery brace/return fixture pass the unchanged limits. All 45 pure suites pass this candidate; final browser/soak/capture evidence is still pending.

The temporary adapter now animates attacks, flashes and wrecks at 24 Hz, waits for all requested images, maps its own pixel attachments onto the actual camera-facing sprite plane, and derives picking bounds from visible alpha. Lion's trial remains in that adapter until its Phase 3 asset is ready. All mounted left-hand weapons stay visible while their live arm exists. Delayed-image/body coverage has passed on desktop, and material/640-pixel real render-target preview coverage has passed for all eight live frames on desktop; touch and the remainder of the browser gate are pending.

Browser maintenance retains campaign, company, armory, shield, training, save and pointer flows. The old eight-frame baked/cinematic/filter scenarios and the `drawUnit`-based tint/destruction scenarios are retired with their removed compositor. Their replacement is actual shared-scene framebuffer/context/raycast/camera verification, all-eight live material previews, actual-bone campaign/gait checks, and the single temporary-adapter coverage. Temporary infantry/carry/elite/vehicle sheet checks remain until Phase 3. Pure arsenal checks retain the moving-piece, grip, muzzle, tip and firing-timing assertions; browser armory fittings now use the shared preview API.


Correction from the observer negative-control work: the previous `__ironVow.start` called `createBattle` directly, omitting `deploy`'s terrain survey. The earlier 30-battle report covers flat constructor fixtures, not full elevated campaign terrain. The test seam now invokes real `deploy`, closes only the onboarding modal, and records/asserts the terrain seed. All formal terrain/clearance results must be rerun. Existing fixed baseline captures remain comparable flat fixtures; new per-live-frame captures survey actual terrain with seed 101.


A browser regression exposed stale loading UI on scene changes: if the previous battle was ready and cached assets made the next scene ready on its first draw, `battlefieldReady` could remain true while the newly rendered controls stayed disabled. `renderBattle` now records the loading state it actually displayed, so the next draw observes the transition and enables the controls. The adapter browser case checks the actual End Turn button after each cached-scene replacement, with an isolated old-behavior route for the negative control. The real-terrain run was stopped after seven clean battles (partial raw report retained) to include this source fix in the immutable final gate. No passing 30-battle result is claimed yet.


The next terrain run completed seven battles without scene findings, then exhausted the QA driver's decision budget at a Citadel's same-round barrage lock. The driver used `canUseWeapon` but omitted the existing `barrageStatus` restriction, so it repeatedly issued a no-op marked-barrage command. It now respects `BARRAGE NEXT ROUND` / `FIRE AT MARKER`, without changing game rules. A failed incomplete battle will retain commands and a real snapshot for diagnosis. The raw partial report is preserved as `terrain-driver-barrage-limit.json`. The bounds check also reads the actual rendered root, with a real-root-only negative probe. A separate one-seed study omitted unobserved render-target readbacks and reproduced the identical command list, outcome and 1,983 actual-bone ticks; this CPU-soak optimization is now recorded explicitly. The full 30-battle result is still pending.

Current status: execution access failed during final verification. Read [the runtime recovery handoff](renderer-runtime-handoff-20261111.md) for current results, incomplete gates, unpublished local work, source identities and exact recovery paths. Seven real-terrain battles had zero required anomalies before a Citadel barrage-lock QA loop; the driver is corrected, and the restarted 30-battle gate remains incomplete. Bastion, Lion and the temporary adapter passed desktop and touch, including separate negative controls. No merge or Site deployment has been made.


Execution access recovered. Continue from the preserved checks and reconcile the newer main/Gatecrasher imports before the final immutable gates. Phase 2 follows the owner's instruction to trust Claude's work highly, using PR #20 as the gait baseline and focusing checks on the actual production port and existing defects.
