# Visual baseline status

Phase 0 of [issue #6](https://github.com/karmiphuc/iron-vow-lance-webgame/issues/6) is tracked in [issue #10](https://github.com/karmiphuc/iron-vow-lance-webgame/issues/10) and [PR #7](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/7). The PR remains a draft: the complete reviewed capture archive has not been committed.

The owner explicitly approved local Playwright screenshots, including in the hosted environment, in [PR #7](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/7#issuecomment-6785288934). AGENTS.md links that approval.

## Capture coverage

`qa/capture.cjs` now has 28 presets at 1366×1024, 1194×834, 1376×1032 and 1210×834. These cover 27 game fixtures and Rig Bench, including all three paint channels with their controls visible, healthy/damaged/destroyed body, right-arm and leg close-ups, all three theaters, six weapon cameras, and a centered wreck after two seconds of actual animation. Reference theaters match by contract name. The full comparison target is 312 stills: 112 baseline, 112 Phase 0, 84 matching reference-game views and four reference-bench views.

The runner waits for live images through weak references, prewarms lazy hit-mask assets, retries a failed capture once in a fresh context, and records failures and PNG hashes. `--resume` reuses only successful entries with matching source and served-document provenance. For reference stills, all 30 Hz CPU animation updates run, intermediate unrecorded WebGL draws are omitted, and the final frame renders normally; the manifest discloses this policy.

`qa/capture-motion.cjs` records actual action sequences with 16 distinct frames per filmstrip: all six game weapons, walking, hit reaction and destruction, plus the five reference-bench weapons and its walk/hit/destruction sequences. It advances timers and actual animation frames at 30 Hz and records source/document/runner provenance. The reference hit sequence invokes actual War damage through temporary QA instrumentation.

```sh
node qa/capture.cjs --plan
node qa/capture.cjs --origin <preview-url> --label baseline --out <output-directory> \
  --reference-game <served-reference-game-url> \
  --reference-bench <served-reference-bench-url>
node qa/capture-motion.cjs --origin <preview-url> --label phase0 \
  --kind game --out <motion-output-directory>
```

Use a separately served URL for the read-only reference HTML files if the preview server does not serve `docs/`. Use `--details` for the 11 paint/part-state/wreck presets, or `--preset <id>` for one preset. Commit captures only after checking the images and their provenance.

## Committed evidence and interrupted work

The [14-image historical subset](local-proof-20261111/manifest.json) records its source commits and hashes. It depicts the earlier combined candidate, including the now-withdrawn PR #4 effects; it is historical evidence, not the current Phase 0 baseline.

The [four delayed-image loading captures](loading-proof/) reproduce and verify the lazy hit-mask loading fix across the four viewports. The separate PR #8 reference-VFX evidence is committed under [design/reference-vfx/pr8](../reference-vfx/pr8/manifest.json).

Before the execution environment disconnected on 2026-11-11, local runs completed the original 204 stills, 44 enhanced Phase 0 detail captures, and all 26 motion filmstrips. These final batches were collected locally but are **not committed**. The 88-image enhanced baseline/reference detail batch was interrupted, and its final manifest was not completed. The 312-image archive and filmstrip contact sheets therefore remain unfinished. Do not treat local collection as a completed or reviewable gate.

The pushed capture/inventory code through `96b4629216607fee6ee87580e2bd85ece8542d90` is preserved. All 47 simulation suites passed before the disconnect; inventory JSON regeneration was byte-for-byte identical. Those results do not replace the missing visual archive.

Resume by recovering the local batch directories if available, verifying their manifests and image hashes, completing the baseline/reference details, then assembling and visually checking the final archive. If the workspace cannot be recovered, rerun the batches using the committed runners.

Per issue #10, native iPad Pro Safari/Chrome battle and hangar `?perf` baselines may land after PR #7 merges but must land before Phase 1 merges. Headless WebGL does not establish native device performance. The 20-minute context-loss session remains a release check. Blender exports block Phase 3, not Phases 0–2.

PR #7 is unmerged. The full release gate is incomplete. The published Site remains v98.
