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

## Battlefield readability gate

`node qa/check-combat-readability.cjs --out /tmp/iron-vow-combat-readability` runs actual shotgun-pool assertions, licensed GLB dependency checks, terrain/ridge rules, and three theater views each at desktop and iPad portrait. It verifies actual projected mech size, physical elevation, cover identity and claimed bounds, road links, shared rendering, mouse/touch movement and target details. The standard browser suite also includes a phone/desktop case. Evidence is kept under `design/combat-readability/`.

## Menu and iPad UI gate

`node qa/check-decision-ui.cjs --out /tmp/iron-vow-ui` checks real player flows at 1024×1366 and 1366×1024 with touch. It verifies one selected facility/refit/contract, preserved preparation and target state, 44-pixel controls, movement-hint clearance and one shared renderer. The maintained browser suite also runs the scenario on desktop and touch. Paint receives an additional 320-pixel overflow check. Evidence is kept compact under `design/decision-ui/`.

## Overworld gate

`node qa/check-overworld-chart.cjs --out /tmp/iron-vow-overworld` runs the focused chart, living-world and port/event checks on desktop and touch. It records the committed source and working-tree hashes. Pending transit has its own career fixture, including exact reload/import and one-time payment checks. The phase evidence lives in `design/overworld-a/`, `design/overworld-b/` and `design/overworld-c/`. Native iPad performance remains unverified.

## Renderer gates

The phase gates write a compact summary and selected WebP captures with `--out`. The production checks are in `qa/gate-phase3.cjs` through `qa/gate-phase6.cjs`. Use `qa/check-rig-v2.cjs` for the static GLB contract and `qa/renderer-inventory.cjs` for the roster audit. See the [renderer inventory](../docs/renderer-inventory.md).

Run `qa/check-scene.cjs` once on the final committed runtime and campaign checker, served on a local HTTP origin. The default is port 5176, with `IRON_VOW_URL` available to select the current address. The campaign reads real bone transforms at 30 Hz, verifies injected faults, and drives 30 legal seeded battles. It records equipped items and commanded attacks separately. Successful seeds are cached by source and seed in `IRON_VOW_SCENE_CAMPAIGN_DIR` outside the repository. Resume with the same source and command to reuse them.

`qa/scene-combat.cjs` exercises real commands across the weapon catalogue and observes launches, impacts and HP changes. `IRON_VOW_COMBAT_MOTION=full` uses normal motion. `IRON_VOW_COMBAT_MOTION=reduce` uses a touch context with reduced motion. `qa/check-production-weapons.cjs` verifies GLB mounts, emitters, and moving weapon geometry separately.

The campaign and selected behavioral browser cases may omit unobserved GPU submissions while keeping animation, raycasts, commands and bone updates. Visual cases and `qa/capture.cjs` submit real frames. Capture presets use fixed viewports. Keep final evidence under the phase directory and raw logs in scratch. See the [pace and evidence rules](../AGENTS.md).

Desktop and simulated touch runs verify behavior. Record native iPad Safari and Chrome frame times and the 20-minute context result in `docs/release-verification.json` when measured. Leave those measurements unverified until the owner supplies them.


## Rig Bench and War

The [Phase 6 acceptance criteria](https://github.com/karmiphuc/iron-vow-lance-webgame/issues/16) are exercised through the shared Workbench and production game board.

| Area | Implementation and verification |
| --- | --- |
| Reference Bench | `/rig-bench/` opens the shared Workbench using the vendored Three.js. Workshop opens the selected chassis, Career opens the Bench directly, and the Bench links to War. |
| Chassis and modules | The 22 campaign frames and Lion Trial appear in the roster. Kit frames mix leg, core and arm assemblies. Compatible authored bipeds combine separately animated upper and lower meshes at the source pelvis, preserving the lower rig's skin and IK. Reaver retains its own quadruped assembly. |
| Controls | The gate checks all 34 catalog weapon entries, Vesper, both shields, three kit levels, material paint channels, per-part state and shield visibility, all cameras and the six-frame lineup, live specifications, per-foot IK and target markers. It also checks Warden rig lines, sound, hand/socket fit, weapon fire and strike contact. |
| Authored clips | The shared clip scrubber opens the six Prototype Bay GLBs and the seven Warden clips. Bulwark and Scout browser checks verify the original grip, pose and attachment cues, and the Warden archive test compares all 10,790 sampled local transforms against the approved poses. |
| Combat parity | The game and War use `dist/combat-simulation.js` for terrain paths and line of fire, movement and attack costs, volleys and HP changes, reactions, round progression, enemy decisions and seeded command driving. The game host supplies the current board, animation timing, UI and career persistence. The VM and Chromium checks compare the same two real boards, including reactions, tank and gunship damage and career storage isolation. |
| Diagnostics and soak | The desktop and touch gate validates all 19 War probes, event reporting, coverage matrices and clean final frame samples. The 10-battle gate completed 20 encounters across the two devices with seven allied wins and three enemy wins per device. The report counts observed coverage by matrix cell. |

The Rig Bench War link opens a temporary encounter on the game board. Run War issues the game's legal move, attack and end-turn commands. The same runner drives `qa/war-driver.cjs`. Browser automation can use `window.__bench.newBattle(options)`, `step()`, `run()`, `runBattle(options)`, `state`, `eventLog()`, `runSoak(count, seed, options)`, `diagnostics()`, `inject(check, unit)` and `report()`. Soak rotates real theaters and checks loadouts through the same hull validation used by the campaign. The report includes chassis × weapon, legs × weapon and theater × chassis counts.

The shared observer samples the live rig and combat events after rendering. War's 19 isolated fault probes pass perturbed copies of those observations through the same predicates. The existing scene checker also exercises 16 physical negative controls.

`node qa/gate-phase6.cjs --out /tmp/iron-vow-phase6` runs the focused desktop and touch Bench/War gate and writes one summary and two real WebP captures. `node qa/check-war-driver.cjs` checks a completed seeded encounter, alternate seeds and the turn limit. `IRON_VOW_QA_SCENARIOS=checkWarMode node qa/check-browser.cjs` compares the live browser and VM reports on Picket Sweep and the corridor, including reactions, the tank and gunship, and the career isolation boundary.

## Mech pose regression

The desktop and touch release suite runs `checkMechLoadoutPoses` against the production rigs and weapon meshes. It samples hand positions through the first step, sustained gait, Brace, aim, takeoff, limb loss and repair. It also checks that an unreachable rifle grip falls back to a lowered hand, and that mounted shields and melee attacks retain their poses.

When adding a loadout stance, cover a compatible mount, an empty hand or unsupported weapon, and a transition out of the stance. Assert the result in world space: a lowered empty hand, a reachable gun contact or a shield raised with its actual mount. Finite joint matrices and a nonzero stance blend alone can pass with the wrong pose.

## Package and verify the Site

Open the current Site with the installed Sites helper and retain its opening result. Use the repository packaging entry point to run the release gate before committing the Site source or packaging the archive.

```sh
node qa/site-package.cjs /absolute/path/to/sites/scripts/site-workflow.mjs
```

Send the source result, credential and absolute `archivePath` as a JSON object on hidden stdin. Save and deploy when the authorized release has a verified source SHA and archive.

After deploying, verify the public build from that checkout with `qa/release-check.cjs --live` and the Site URL. The check compares deployed runtime files to the checkout, then repeats the maintained browser scenarios. The HTML comparison strips the hosting platform's injected challenge bootstrap. Test careers use isolated browser storage.
