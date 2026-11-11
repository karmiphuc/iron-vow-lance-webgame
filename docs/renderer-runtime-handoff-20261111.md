# Renderer runtime handoff — 2026-11-11

PR #18 remains a draft. Phase 1 needs its complete final gates before merge. The selected execution environment became unavailable during the checks and full capture batch. The Cloud Environment API later reported the instance running/connected, while `exec_command` still rejected calls with “No usable execution environment is available.” No complete 30-battle result or final contact sheet is claimed.

## Authorization and completed PR work

- The owner approved local Playwright screenshots, including this hosted environment (AGENTS.md links the PR #7 approval).
- “Dont care, just cont” makes native iPad measurements nonblocking. They remain untested.
- “Allow spacing and clearance adjustments” authorizes the 6.8 m horizontal pitch and supported stride/turn clearance. Chassis scale is 0.9, vertical terrain scale is 3.4 m, and game rules/action timers are unchanged.
- PR #4 is closed unmerged. PR #8 merged at `973567c5726a836e827fbe85b3b34675a769fc0b`; #9 at `d8afef601b5eea3e0f35eee5864e7cf81d3f728a`; Phase 0/#7 at `bfc45fbd055c897ec04f88d1a8408b9e31be5b41`.
- Phase 0 evidence is complete: 312 stills, 26 real-action filmstrips, four viewports and 47 suites. Do not redo it or mark it as future renderer certification.

## Phase 1 implementation

The shared renderer, board/environment, eight live frames, actual rigid bindings, common animator, 640×640 render-target previews, raycasts, overlays, camera controls and context recovery are implemented. The remaining twelve frames and vehicles use only `dist/scene/billboards.js`. Replaced board/terrain/cover/cinematic panes, filter toning, picking fallback and eight-frame travel paths were removed.

The brace fix keeps the solved pelvis support height, settles rear feet in parallel and limits continuous turns to supported reach. The actual-bone regression passes the original ground/slide limits and verifies that requested headings converge. The temporary adapter waits for images, invalidates late image caches, animates at 24 Hz, maps pixel attachments to its real sprite plane and derives proxies from visible alpha. A stale ready-state UI bug on cached scene replacements is fixed in `renderBattle`.

The application dist tree observed for the last renderer candidate is `d9894dfbe54dea02e3bc6f33748e43f255d394b4`. Subsequent rescue writes through the GitHub connector change QA only. Recheck this tree after recovering execution access.

## Observed verification and its limits

- All 45 simulation suites passed after the real-deployment test seam was corrected, before the final cached-controls UI fix. Run the final suite again.
- Six-kit start/stop/turn and four-heading Behemoth brace/return regressions passed unchanged 0.15 m ground and 0.30 m slide limits. Heading errors converged to numerical-scale values.
- Shared-scene controls, raycasts, actual framebuffer, attack camera/Skip, real WEBGL_lose_context recovery and a playable 10×10 checkpoint passed desktop on the corrected deployment candidate. An earlier candidate passed desktop and touch. Final complete rerun remains pending.
- Every live frame passed actual material-color and 640-pixel render-target checks on desktop.
- Bastion's shared socket/piston fittings, actual Test Strike image changes, and raycast selection passed desktop and touch. Lion's real Strike/finish/recovery sequence and career isolation passed desktop and touch using a controlled 30 Hz clock.
- Temporary-adapter body, attachment, GPU-upload, cached-control and expiring-flash checks passed desktop and touch. Separate old-behavior negative fixtures failed the intended delayed-body and disabled-control assertions.
- Desktop Mech Computer, move preview, ridge combat, terrain/save reload, LI-01, LI-02, infantry carry, Vanguard and Reaver UI/data checks passed. These flow checks used actual game animation/geometry/input with unobserved GPU work omitted after the first scene frame. They do not certify rendering performance. Aero's later jumpjet pointer fixture failed; see recovery notes below.
- The first complete 30-battle report was a flat-constructor run: 131,459 ticks, zero overlaps/NaN/bounds/stuck, ten Behemoth rear-foot brace errors. The errors motivated the fix. This report is not elevated-terrain coverage.
- The real terrain run completed seven battles and 30,051 ticks without required anomalies, then hit the driver's 1,000-decision limit at a Citadel same-round barrage lock. This was a QA driver no-op loop. The driver now filters the existing BARRAGE NEXT ROUND / FIRE AT MARKER statuses.
- The last restarted run passed all six real bone/state negative controls and the first campaign (seed 4242, 1,983 ticks, zero anomalies) before execution access failed. Its 30-battle gate remains incomplete.
- A one-seed study that omitted unobserved render-target readbacks reproduced the exact command list, result and 1,983 bone ticks. The checker records this CPU-soak policy. It also checks actual rendered-root bounds.
- Four full-resolution selected-move probes were captured and inspected. The corrected 144-view Phase 1 batch was interrupted during its first viewport. Full baseline/reference/candidate assembly and visual review remain pending.

## Recover files and runs

Selected environment ID: `ccarenv_b64_Y2NhcmVudl8zZWFiMTgzOWRkN2M4MTkxYjMwZTdiYzRhNDA4NDM5NQ`. Desktop is declared enabled with state unknown. No desktop JavaScript or open_in_codex tool was offered. The environment wait call reported “neither ready nor starting”; the executor first timed out reconnecting, then reported no usable environment. This is an execution-access block, not a browser approval requirement.

The active worktree was `/workspace/iron-vow-phase1`, branch `renderer/phase1`, local commit `7582eb6`. Native servers and test processes may have stopped; inspect them before restarting. Port 5176 served Phase 1. Preserve local edits and compare/merge the later GitHub QA rescue commits before pushing. Do not reset the worktree over unpublished changes.

Useful workspace paths, if retained:

- `/tmp/phase1-suites-deploy.log`
- `/tmp/phase1-native-ui-and-negative.log`
- `/tmp/phase1-browser-other-flows.log` and `/workspace/scratch/phase1-browser-other-flows.json`
- `/tmp/phase1-campaign-barrage-aware.log` and `/workspace/scratch/phase1-final/campaign-30-barrage-aware.json`
- `/workspace/scratch/phase1-final/campaign-30-terrain-controls.json`: the seven-battle driver-limit run
- `/tmp/phase1-captures-matched.log` and `/workspace/scratch/phase1-captures-matched/manifest.json`
- `/workspace/scratch/phase1-readback-study.json`

The earlier `phase1-captures-final` batch used an incorrect frame fixture (model changed after construction, leaving old stats/name). Use the later `phase1-captures-matched` batch, which sets the saved frame before constructing the unit. Do not mix invalid captures into final evidence.

The default capture catalog stays at the original 28 presets. `--phase1` adds eight actual-terrain live-frame views, producing 144 candidate stills at the four declared full-resolution viewports. Preserve raw manifests and source hashes. Resume requires the recorded source identity; verify unchanged app and runner content before reusing any image.

Some later QA changes were committed only locally before the interruption: browser JSON source evidence/CPU-flow policy and a controlled-clock temporary-sheet paired-walk case. The controlled paired-walk update still needs its first run. Aero's local uncommitted fixture correction clears the intended landing tile, rebuilds the scene and chooses a rounded, exposed point whose real raycast returns tile 4,16; it still needs verification. Recover those changes before rebuilding them.

## Phase 2 preparation

An isolated `/workspace/iron-vow-phase2` worktree existed on `renderer/phase2`. Local commits were `c0f99d7`, `a7507d1` and `b0eb719`; they were not pushed. Recover that worktree before assuming these files are available:

- `dist/scene/effects.js`: reference FX/impacts/faults factory, owned resources, terrain floors, final PR #9 arc/decal depth bias.
- `dist/scene/weapon-fx.js`: explicit 34-entry catalog plus counter/mortar mapping.
- `docs/phase2-development.md`: exact inventory and pending integration.
- Uncommitted `qa/check-combat-fx.cjs`: real Three.js pool/geometry regression.

The current catalog has 24 Workshop weapons, nine built-ins and one shoulder pod. There are also free-hand and mortar paths. This corrects the issue's older 22-Workshop count without excluding any entry.

The pool regression exposed an inherited missile-arrival scratch-vector alias: smoke emission overwrites the flight position before the callback. The current test fails the endpoint assertion. Use a per-pooled-missile position vector, then rerun the test. The attempted fix coincided with the rejected executor call and its application/result was not verified. The library is not imported by the runtime; no Phase 2 integration or gate is complete. Rebase preparation on the final Phase 1 merge.

## Remaining sequence

1. Recover execution access, workspace changes and run provenance.
2. Finish the maintained desktop/touch suite, final 45 suites and immutable 30 real-terrain campaigns. Preserve faults/failures separately from clean runs.
3. Complete the full-resolution capture batch, compare the original 28 matching presets against the committed Phase 0/reference evidence, inspect all eight new frame views, and commit manifests/contact sheets.
4. Update #11/#18 and merge only the validated Phase 1 head. Continue full Phase 2 integration and its weapon/aim/damage/popSwap gates.
5. Phase 3 needs the owner's Blender MCP and missing external .blend sources. No Blender tools were available. This does not block completing Phase 2. Phase 4 depends on the live-chassis phase.
6. GitHub-first source sync remains pending. The last confirmed Site version was v98; no Site save or deployment was made by this agent. Refresh the Site's published source/version before synchronization.


## New PRs and concurrent main changes found during recovery

The open-PR list now also contains #19 and #20. Both remain open and unmerged by this agent. Their patches and recorded evidence were reviewed through GitHub while execution was unavailable.

- #19, head `cab15a1f3ee28754b79a5dfa11ec95f555879207`: plasma tendril ribbons, spark crawl and joint-short mix. The actual reference HTML SHA-256 matches the committed VFX manifest: `4e80cf73b23a0586706a91dd58d86c8b864c63ffc976a71f2f934400ed085695`. Representative far-plasma and close-joint PNGs were inspected directly from the immutable head. Arc materials retain depth testing with factor 0 / units -1. Fresh functional and occlusion runs remain pending.
- #20, head `b6a7437ebd5d4a81de419ee163fe1cffb7a001c3`: reference gait/IK and bench-only War movement corrections. The actual HTML SHA-256 matches its walk manifest: `b7bd5f74ffa45a10812cb5592058a2e60922eecb96f17feaebf92f9b5c0a7828`. The reported 150-battle result is the author's evidence, run through a CDP-backed Playwright API stand-in; it is not an independent run by this agent. The PR explicitly requests real Playwright reruns of `qa/reference-walk.cjs` and `qa/reference-vfx.cjs`. The large walk contact sheet could not be read through the available GitHub binary API and remains uninspected here.
- Production `VowChassis.solveLeg` already uses ZXY. Reconcile the new reference gait with the height-aware Phase 1 solver; do not reintroduce an obsolete XYZ diagnosis or lose the supported brace/terrain fixes. The reference War AI/melee reach changes are bench-only and must not be copied into production gameplay.
- Review/verify #19 and #20 before the final Phase 2 port. The isolated preparation predates these PRs and contains the previous box-arc reference.
- Current main was observed at `0c8030e29519a1129434fef747951f97d7a3243d`, following Site-source import `aacc5af1300d5fb05f18e9aa452b0a2763acbe4a`. These add the samurai Gatecrasher assets/install scripts and alter `dist/game.js`, travel/prototype data, the Gatecrasher GLB and related QA. Preserve and reconcile those owner changes before final Phase 1 validation/merge. This task's agent made no Site deployment.

Execution was retried after the provider reported connected/running and still returned “No usable execution environment is available.” No further permission or browser approval is required; usable execution access is the immediate dependency.
