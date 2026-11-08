# Iron Vow release checks

Run from the Site checkout with Node.js 22 or newer and Git.

```sh
npm ci --prefix qa
npm run test:release --prefix qa
```

The browser runner uses Playwright Chromium when installed, or a supported local Chrome installation. Set `IRON_VOW_CHROME` to a Chromium executable for a custom installation. To install Playwright Chromium, run `npx playwright install chromium` from `qa/`. A missing browser fails the gate. The browser runner starts and stops its own loopback server. The release run hashes the source before and after testing and fails if it changed.

| Area | Regression checks |
| --- | --- |
| Hit visuals | Localized flash, expiry and damage shading on travel sprites, native cinematics, baked fallback and live Foundry. Four battlefield facings, a real desktop attack-camera shot and a real mobile touch shot. |
| Enemy paint | Crimson plate masks for all 11 travel sprites, close views, baked Foundry fallback and target portraits. Pixel checks on bare materials catch full-body tints. |
| Combat | AP, free and paid movement, range, limb damage, missile counter lockout, free-hand counter damage and limits, facing, gait and weapons, reduced motion, audio cues and destruction. |
| Company | Hiring and reserves, shared level-1 training prerequisites and the Pilot Wiki, Workshop stats and storage, salvage, contract rewards, and saved random 1–3 mech offers. |
| Ship | Persisted engineering queue, rank and cost gates, contract premiums, maintenance and crew recovery, optional reserve deployment across all contract sizes, and exact auxiliary checkpoint restoration. Desktop and touch check construction, the mech bay and a fourth combat seat. |
| Hangar | Separate construction and reload, reserve skill trees, medical treatment, salvage integrity, storage patches and enemy manifests that match deployment. Desktop and touch exercise facilities, Workshop and contract resurvey. |
| Saves | Published v31 and v32 fixtures, current checkpoints, interrupted enemy phases, corrupt checkpoints and duplicate payout checks. |
| Browser UI | Desktop and phone-size Chromium with touch input, layouts, controls, hold tooltips, default music and mute preference. |
| Warden upgrade | Four distinct high resolution field atlases, a real two-tile move, a right-foot brace, planted recoil and the firing close-up. |

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

This compares served HTML, JavaScript and CSS to the checkout and repeats the browser scenarios. Hosted HTML is compared after removing the platform's injected challenge bootstrap. Test careers use isolated browser storage. Keep the published save fixtures and the reproduction for each future fix in this folder.
