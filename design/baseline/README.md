# Visual baseline status

Not captured. Phase 0 is a draft and does not satisfy issue #6's visual gate yet.

The current session has no `cua_repl.js` browser tool. The Sites skill prohibits replacing that missing managed browser path with another preview/browser route. The installed `site-workflow.mjs` source/packaging helper is also absent. No screenshot, contact sheet or native Safari performance evidence is fabricated.

Once supported browser QA is available, use `node qa/capture.cjs --plan` to inspect the matrix, then run against the supported preview URL:

```sh
node qa/capture.cjs --origin <current-preview-url> --label baseline --out design/baseline \
  --reference-game <served-mercenary-command-reference-url> \
  --reference-bench <served-rig-bench-reference-url>
```

The runner takes all 19 current presets at 1366×1024, 1194×834, 1376×1032 and 1210×834 with fixed RNG, full motion, isolated storage and a fixed animation clock. It includes each of the three starting lance Workshop chassis, paint, all three theaters, selected movement, six attack cameras, damaged armor, a burning wreck and Rig Bench. Reference game captures use matching non-attack presets; the reference bench uses its entry view. The source helper/dev server does not serve `docs/`; provide separately supported URLs for the read-only reference HTML files.

`manifest.json` records the exact commit and per-preset failures; failed/partial matrices fail the command. `contact-sheet.html` shows available sources side by side. For comparisons across PRs, retain the baseline directory and capture the PR into a separate directory; combine the same preset/viewport images for PR review. Commit actual captures only after visually checking them. Browser operation, GLB readiness and screenshot fidelity of this new runner still need end-to-end validation; fixture tests are not screenshots.

Run device tests with `?perf` on K's iPad Pro in Safari and Chrome, including the 20-minute context-loss session. Record device model, browser version, fps and p95 in release evidence. Headless/software WebGL cannot establish those results.
