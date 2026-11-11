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
| Canvas compatibility | Pixel-tested filter detection, filter-disabled spent units and wrecks, transformed crops, silhouette alpha, and hit flashes over persistent part damage. |
| Live Warden | Actual WebGL loading, desktop and touch movement, continuous tile seams, Jumpjet altitude, reduced-motion behavior, baked fallback, and owned-material/cache cleanup. |
| Warden upgrade | Four distinct high resolution field atlases, a real two-tile move, a right-foot brace, planted recoil and the firing close-up. |
| Gatecrasher R2 | Workshop purchase, equip and remove, all four loadout routes, and real pointer and touch input for the optional shoulder salvo and cleaver strike. |
| Armory | 22 classified weapon cards, 12 new attacks and paired sprites, trained stats, purchase and save resume, missile restrictions, desktop and touch browse, and grip, muzzle, tip and pivot checks on the mounted GLB. |
| LI-01 R32 | Picket Sweep deployment and enemy AI fire on desktop and touch, both baked weapon states, market and salvage exclusion, and new and pre-R32 checkpoint recovery. |
| RV-04 Reaver | Medium+ hostile deployment, braced AI fire on desktop and touch, four arm states, player acquisition exclusions, and pre-Reaver and Reaver checkpoints. |
| LI-02 Elite | Iron Corridor AI fire, separate paint channels in both weapon states, heavier armor, acquisition exclusion and pre-Elite checkpoint recovery. |
| Infantry destruction | Lethal body and cockpit shots, staged falls on the field and in the attack camera, timed detonation, and settled wrecks after resume. |
| IV-03 Aero | Premium purchase and assignment, Jumpjet landing and checkpoint recovery, passive dodge, four Rig Bench replays and live Relay strikes. |

The live-Warden browser scenario explicitly enables the HD rig so it is still exercised on software WebGL. Ordinary software-rendered sessions use the baked Warden to preserve combat frame rate; the rest of the scenarios retain their existing animation assertions.

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
