# Visual baseline and capture workflow

Phase 0 is tracked in [issue #10](https://github.com/karmiphuc/iron-vow-lance-webgame/issues/10) and [PR #7](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/7). The reviewed archive contains **312 stills and 26 real-action filmstrips** across the deployed-v98 baseline, Phase 0 and the two references.

Open the [still contact sheet](reviewed-20261111/contact-sheet.html), [motion contact sheet](reviewed-20261111/motion-contact-sheet.html) or [manifest](reviewed-20261111/manifest.json). Sixteen category posters cover all four requested viewport sizes. Nine [motion review posters](reviewed-20261111/motion-review/) compare the 16-frame sequences by action. Each lossless WebP was pixel-checked against its original PNG; file/pixel hashes and raw run manifests are retained. Verified prior pixel checks are reused only when both file hashes still match.

The 28 presets cover 27 game fixtures plus Rig Bench at 1366×1024, 1194×834, 1376×1032 and 1210×834. Separate primary/secondary/accent paint controls are visible; body, right-arm and legs have healthy/damaged/destroyed close-ups. Reference theaters match by contract name. Stills total 112 baseline + 112 candidate + 84 reference-game + four reference-bench views. Filmstrips cover all six game weapons, walk, real hit reaction and destruction; the reference has five weapon profiles and the same three motion cases. Its hit strip invokes actual War damage through temporary QA instrumentation, and its walk is the bench treadmill demonstration. Reference weapon strips record sequential bench actions, so lingering pooled particles may remain from preceding actions.

```sh
node qa/capture.cjs --plan
node qa/capture.cjs --origin <preview-url> --label phase0 --out <output-directory>
node qa/capture.cjs --origin <baseline-url> --source-root <baseline-checkout> --label baseline --out <output-directory> --reference-game <reference-game-url> --reference-bench <reference-bench-url>
node qa/capture-motion.cjs --origin <preview-url> --label phase0 --kind game --out <motion-directory>
python qa/assemble-baseline.py --runs-root <directory-containing-the-recorded-runs>
```

Use `--details` for the 11 paint/part-state/wreck presets, `--preset <id>` for one preset, and `--resume` for an interrupted still run. Resume requires matching source/document/image hashes; older bench captures lacking saved-image validity evidence are recaptured. Capture runners operate against explicitly supplied servers. The assembler uses Pillow and records all input run names; retain those directories when repeating the assembly.

The runner waits for live images with weak references, prewarms lazy hit masks, retries once in a fresh context, and atomically checkpoints every completed image. [Recovery evidence](recovery-proof/) demonstrates actual forced termination, successful resumption and modified-image rejection. [WebGL evidence](webgl-proof/) retains the genuinely blank historical bench screenshot and its replacement: a painted-ready DOM marker is insufficient. Both the actual WebGL canvas and the saved PNG viewport are checked. QA-only `preserveDrawingBuffer` retains controlled frames; reference stills run all CPU animation updates but omit intermediate unrecorded WebGL draws. The manifests disclose these capture policies. Motion uses its actual render path.

All 47 simulation suites pass. Inventory JSON regeneration is byte-for-byte identical and its Markdown contract table regenerates identically. The screenshots establish the current renderer's baseline; they do not certify the future shared scene, planted feet, true aiming, 640px images or zero anomalies. The current two-second wreck has faint embers rather than Phase 2's required 14-second burn, and that gap is preserved.

The earlier [14-image subset](local-proof-20261111/manifest.json) is historical and includes the withdrawn PR #4 candidate. The [four delayed-image loading captures](loading-proof/) remain separate regression evidence. PR #8 and #9 reference-VFX checks and captures live under `design/reference-vfx/`. The reference baseline in this archive is frozen at PR #8; PR #9's later correction has separate evidence.

The owner explicitly approved [local Playwright screenshots in the hosted environment](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/7#issuecomment-6785288934). On 2026-11-11 the owner directed continuation without waiting for native iPad measurements. Native Safari/Chrome fps, p95 and the 20-minute device session remain **untested**, with no hardware performance claim. Blender exports are a Phase 3 dependency.
