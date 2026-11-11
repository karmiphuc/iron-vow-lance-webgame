# Visual baseline status

Capture collection is in progress. Phase 0 remains a draft until the complete matrix and device checks satisfy issue #6's visual gate.

The owner explicitly approved local Playwright screenshots for this work in [PR #7](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/7#issuecomment-6785288934). AGENTS.md links that approval. Local browser operation is authorized, including in the hosted environment.

Actual baseline, candidate and reference screenshots have been captured. Hangar, paint, attack and reference Rig Bench images have been inspected. A [reviewed local subset](local-proof-20261111/manifest.json) records image hashes, source commits and the unchanged runtime tree across QA-only commits. It includes [the performance overlay](local-proof-20261111/hangar-perf.png), [paint controls](local-proof-20261111/paint.png), [a shotgun impact](local-proof-20261111/attack-shotgun.png), and [actual body/cockpit kill captures](local-proof-20261111/desktop-contact.png). The full matrix is still running; this subset does not establish a complete visual gate.

Use `node qa/capture.cjs --plan` to inspect the matrix, then run against an explicitly supplied local or hosted preview URL:

```sh
node qa/capture.cjs --origin <current-preview-url> --label baseline --out design/baseline \
  --reference-game <served-mercenary-command-reference-url> \
  --reference-bench <served-rig-bench-reference-url>
```

The runner takes all 19 current presets at 1366×1024, 1194×834, 1376×1032 and 1210×834 with fixed RNG, full motion, isolated storage and a fixed animation clock. It includes each of the three starting lance Workshop chassis, paint, all three theaters, selected movement, six attack cameras, damaged armor, a burning wreck and Rig Bench. Reference game captures use matching non-attack presets; the reference bench uses its entry view. The source helper/dev server does not serve `docs/`; provide separately supported URLs for the read-only reference HTML files.

`manifest.json` records the exact commit and per-preset failures; failed/partial matrices fail the command. `contact-sheet.html` shows available sources side by side. For comparisons across PRs, retain the baseline directory and capture the PR into a separate directory; combine the same preset/viewport images for PR review. Commit actual captures only after visually checking them. Browser operation, GLB readiness and screenshot fidelity of this new runner still need end-to-end validation; fixture tests are not screenshots.

Run device tests with `?perf` on K's iPad Pro in Safari and Chrome, including the 20-minute context-loss session. Record device model, browser version, fps and p95 in release evidence. Headless/software WebGL cannot establish those results.
