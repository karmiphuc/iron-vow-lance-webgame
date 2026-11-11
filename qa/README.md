# Iron Vow release checks

Run from the Site checkout with Node.js 22 or newer and Git.

```sh
npm ci --prefix qa
npm run test:release --prefix qa
```

The browser runner uses Playwright Chromium when installed, or a supported local Chrome installation. Set `IRON_VOW_CHROME` to a Chromium executable for a custom installation. To install Playwright Chromium, run `npx playwright install chromium` from `qa/`. A missing browser fails the gate. The browser runner starts and stops its own loopback server. The release run hashes the source before and after testing and fails if it changed.

On a software renderer, set `IRON_VOW_QA_SERIAL=1` and
`IRON_VOW_QA_TIMEOUT_MS=60000` to give each device suite its own GPU time and allow
for slower model-bench rendering. These settings preserve every scenario and
assertion. The default remains parallel device checks with a 15-second wait limit.
The supported maximum is `IRON_VOW_QA_TIMEOUT_MS=120000` for slower hosted model benches.

| Area | Regression checks |
| --- | --- |
| Hit visuals | Localized flash, expiry and damage shading on travel sprites, native cinematics, baked fallback and live Foundry. The browser checks sample three chassis in four headings across walk, attack and death with `?tintdebug`, and fire real desktop and touch shots. |
| Chassis finish | Save-stable hostile livery mixes, muted crimson, untouched bare materials, and paired colors in live Foundry, baked combat, and portraits. |
| Combat | AP, free and paid movement, range, limb damage, missile counter lockout, free-hand counter damage and limits, facing, gait and weapons, reduced motion, audio cues and destruction. |
| Company | Hiring and reserves, shared level-1 training prerequisites and the Pilot Wiki, Workshop stats and storage, salvage, contract rewards, and saved random 1–3 mech offers. |
| Ship | Persisted engineering queue, rank and cost gates, contract premiums, maintenance and crew recovery, optional reserve deployment across all contract sizes, and exact auxiliary checkpoint restoration. Desktop and touch check construction, the mech bay and a fourth combat seat. |
| Hangar | Separate construction and reload, reserve skill trees, medical treatment, salvage integrity, storage patches and enemy manifests that match deployment. Desktop and touch exercise facilities, Workshop and contract resurvey. |
| Open tabs | Older careers load into transactional storage. Stale or simultaneous writes cannot replace a newer Ship/Hangar project or active sortie checkpoint. Compact navigation and Mech Bay controls fit at 320 pixels. |
| Crew Cabins | Three expansion tiers, active roster caps, hired portrait decoding, relief training, crew and hull identity, duplicate pilot prevention, auxiliary compatibility and exact mid-sortie reload. |
| Saves | Published v31 and v32 fixtures, current checkpoints, interrupted enemy phases, corrupt checkpoints and duplicate payout checks. |
| Browser UI | Desktop and phone-size Chromium with touch input, layouts, controls, hold tooltips, default music and mute preference. |
| Shared battle scene | One real WebGL context, eight live rigs, actual framebuffer pixels, raycast terrain/units, pan/pinch/wheel, tactical map, Overview/centre, reach/paid paths, over-shoulder attack/Skip, real context loss/restoration and playable legacy 10×10 saves. |
| Live previews | All eight live frames apply their material colors and render real 640×640 target images through the shared renderer. Bastion's UI motion tests use the same animator and native paired pistons. |
| Temporary sheets | The remaining twelve frames and vehicles use one camera-facing adapter. Delayed image readiness, visible bodies, GPU texture updates, sprite-plane attachments and expiring hit flashes are checked. Infantry/elite/carry/paired gait sheet data remains covered while those dependencies exist. |
| Armory/shields | Cards, trained stats, prices, equip/remove, tooltips, save resume and actual GLB socket fitting in the shared preview; limb-health shield visibility and real guarded exchanges remain covered. |

The replaced eight-frame baked/cinematic/filter scenarios, old `drawUnit` tint and staged-compositor destruction cases are retired with that compositor. Their renderer assertions are covered by the shared scene, live previews and actual-bone checker. Rules/AP, destruction outcomes and all published save migrations remain in the 45 simulation suites. Phase 2 adds the full reference 3D effects/damage-motion coverage.

For behavioral software-WebGL runs, set `IRON_VOW_SOFTWARE_QA=1` to use 0.5 DPR. Capture runs retain their declared full-resolution viewports. This setting makes no device performance claim. `IRON_VOW_QA_SCENARIOS` selects named scenarios for focused reruns; the normal browser command runs the complete maintained set.

`node qa/check-scene.cjs` checks 30 real seeded campaign battles, every live frame and actual bones at 30 Hz. It validates NaN, foot-ground, foot-slide, bounds, overlap and stuck detection against deliberate real-state/bone faults in separate disposable scenes before the normal run. The report keeps those negative controls separate. The formal run requires committed immutable application source and records its commit, dist tree and checker digest. Initial GPU drawing uses 0.5 DPR; the rest of the bone soak suppresses unobserved GPU submissions and does not measure performance.

`npm test --prefix qa` runs the simulation suites. New `qa/check-*.cjs` files are picked up automatically. `npm run test:browser --prefix qa` runs the local browser suite. Browser failures save a screenshot in the temporary directory. Set `IRON_VOW_QA_OUTPUT` when running the simulation alone to request native canvas captures in a separate folder.

## Package and verify the Site

Open the current Site with the installed Sites helper and retain its opening result. Install the QA dependencies, then launch the repository's packaging entry point with a terminal.

```sh
node qa/site-package.cjs /absolute/path/to/sites/scripts/site-workflow.mjs
```

Send the `credential`, original `source` result and absolute `archivePath` as one JSON object over hidden stdin. The entry point supplies the release check to Sites before it commits, pushes or packages. Save and deploy only after it returns the verified SHA and archive. The gate is enforced through this packaging entry point.

After deploying, verify the public copy from the same checkout.

```sh
node qa/release-check.cjs --live https://iron-vow-mercenary-command.karmi-nguyen.chatgpt.site/
```

This compares served HTML, JavaScript, CSS and the expansion weapon assets to the checkout, then repeats the browser scenarios. Hosted HTML is compared after removing the platform's injected challenge bootstrap. Test careers use isolated browser storage. Keep the published save fixtures and the reproduction for each future fix in this folder.

## Renderer Phase 0 (draft; issue #6)

`node qa/capture.cjs --plan` lists fixed capture presets and the four iPad viewport sizes without launching a browser. `node qa/capture.cjs --origin <supported-preview-url> --out <capture-directory>` captures an explicitly supplied preview; it never launches its own server. Reference URLs are optional `--reference-game` and `--reference-bench` inputs. See `design/baseline/README.md` for capture status and known limits. The new fixture checks are not browser or visual evidence.

To check the lazy hit-mask readiness regression, add `--preset attack-shotgun --asset-delay-ms 400`. The hit state must warm before the final capture even when part-mask responses arrive late. The runner reports exact asset URLs if image readiness still fails.

`node qa/renderer-inventory.cjs docs/renderer-inventory.json` regenerates the static GLB/roster audit. `docs/renderer-inventory.md` maps current rendering dependencies and corrects the Citadel/Lion source inventory. `?perf` instruments the current Canvas compositor and its offscreen Foundry renderers; it does not imply that the shared-scene migration has happened.
