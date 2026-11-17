# Iron Vow release checks

Run the release gate from the checkout with Node.js 22 or newer and Git.

```sh
npm ci --prefix qa
npm run test:release --prefix qa
```

The release gate runs the simulation suites and the maintained desktop and touch Chromium scenarios. It hashes the working source before and after testing. `npm test --prefix qa` runs simulation only. `npm run test:browser --prefix qa` runs the browser suite against a temporary loopback server. Browser failures save screenshots outside the checkout.

Playwright uses its Chromium installation or a supported local Chrome. Set `IRON_VOW_CHROME` to select an executable. For software rendering, `IRON_VOW_QA_SERIAL=1` gives each device profile its own GPU time. `IRON_VOW_QA_TIMEOUT_MS` can extend the default 15-second wait up to 120 seconds. `IRON_VOW_QA_SCENARIOS` selects cases for a focused rerun. The ordinary release gate runs the full maintained set.

| Area | Verification |
| --- | --- |
| Career and combat | Open and published saves, 10×10 and 18×20 sorties, enemy phase replay, payouts, AP and damage rules, crew and reserve rosters, tracks, map navigation, and keyboard and touch input. |
| Shared battle scene | Live rig matrices and draw output, terrain raycasts, muzzle and strike anchors, vehicle height and wreck placement, shield interception, detach states, context recovery and sortie resource disposal. |
| Hangar and Workshop | Fourth seat, reserve selection into Workshop Storage, camera easing and projected HTML controls, workers, condition-driven maintenance, live loadouts and material paint, turntable gestures, and 640×640 mech renders. |
| Rig Bench | Shared campaign roster and rules, production weapon and shield mounts, articulated kit mixes, original clip scrubber, real seeded War battles, fault injection, and reports. |

## Renderer gates

The phase gates write a compact summary and selected WebP captures with `--out`. The production checks are in `qa/gate-phase3.cjs` through `qa/gate-phase6.cjs`. Use `qa/check-rig-v2.cjs` for the static GLB contract and `qa/renderer-inventory.cjs` for the roster audit. See the [renderer inventory](../docs/renderer-inventory.md).

Run `qa/check-scene.cjs` once on the final committed runtime and campaign checker, served on a local HTTP origin. The default is port 5176, with `IRON_VOW_URL` available to select the current address. The campaign reads real bone transforms at 30 Hz, verifies injected faults, and drives 30 legal seeded battles. It records equipped items and commanded attacks separately. Successful seeds are cached by source and seed in `IRON_VOW_SCENE_CAMPAIGN_DIR` outside the repository. Resume with the same source and command to reuse them.

`qa/scene-combat.cjs` exercises real commands across the weapon catalogue and observes launches, impacts and HP changes. `IRON_VOW_COMBAT_MOTION=full` uses normal motion. `IRON_VOW_COMBAT_MOTION=reduce` uses a touch context with reduced motion. `qa/check-production-weapons.cjs` verifies GLB mounts, emitters, and moving weapon geometry separately.

The campaign and selected behavioral browser cases may omit unobserved GPU submissions while keeping animation, raycasts, commands and bone updates. Visual cases and `qa/capture.cjs` submit real frames. Capture presets use fixed viewports. Keep final evidence under the phase directory and raw logs in scratch. See the [pace and evidence rules](../AGENTS.md).

Desktop and simulated touch runs verify behavior. Record native iPad Safari and Chrome frame times and the 20-minute context result in `docs/release-verification.json` when measured. Leave those measurements unverified until the owner supplies them.

## Package and verify the Site

Open the current Site with the installed Sites helper and retain its opening result. Use the repository packaging entry point to run the release gate before committing the Site source or packaging the archive.

```sh
node qa/site-package.cjs /absolute/path/to/sites/scripts/site-workflow.mjs
```

Send the source result, credential and absolute `archivePath` as a JSON object on hidden stdin. Save and deploy when the authorized release has a verified source SHA and archive.

After deploying, verify the public build from that checkout with `qa/release-check.cjs --live` and the Site URL. The check compares deployed runtime files to the checkout, then repeats the maintained browser scenarios. The HTML comparison strips the hosting platform's injected challenge bootstrap. Test careers use isolated browser storage.
