# IRON VOW — Mercenary Command

A self-contained, original browser tactical mech game inspired by part-based strategy games such as Front Mission 3. No original game assets are used.

This repository contains the game source, assets, authoring tools, tests and fixtures. The original Site version 98 import provenance is recorded in [docs/sites-export.json](docs/sites-export.json). The latest verified production release is **Site version 104**, recorded in [release verification](docs/release-verification.json). GitHub changes are published through the Sites release workflow.

## Run locally

Install Node.js 22 or newer, then:

```sh
git clone https://github.com/karmiphuc/iron-vow-lance-webgame.git
cd iron-vow-lance-webgame
npm run dev
```

Open **http://127.0.0.1:5173**. No dependency installation, build step, API key, or Sites connection is required to play. Fonts, models, artwork, and audio are included locally. The server also serves the Rig Bench and the archived animation clips.

Set `IRON_VOW_PORT` or `IRON_VOW_HOST` to change the local address. Alternatively, serve `dist/` with any static HTTP server. Using HTTP allows browser model and asset loading to work consistently.

Career saves belong to each browser origin. To move an existing career from the live Site, export it from Career there, then import the backup in your local game.

The current game includes a persistent company and pilot roster, part-based mech combat, modular equipment, terrain and elevation, the Workshop, and model inspection tools. The existing live game is at [Iron Vow Sites](https://iron-vow-mercenary-command.karmi-nguyen.chatgpt.site).

## Play

Open the Halyard's Chart Table to compare ports, routes, and travel costs. Deploy from the port hosting the contract. Compare express and stopover courses on the bridge chart. Travel advances the company calendar, costs fuel, wages and upkeep, and gives the parked lance time for Repair Deck service and wound rest. Every finished sortie costs a day of wages and upkeep. Any unpaid operating costs carry forward and are settled from later earnings.

Each of the six moorings posts 0–3 contracts with expiry dates. Scout for exact contacts, or weigh the forecast before travelling. Tap a mooring name for local repairs and discounted stock. Storms, patrols and other transit reports offer short choices whose costs and delays are shown before you respond. Reports resume after reload.

After deploying, select a unit, and click highlighted tiles to move. Choose Fire and click an enemy to shoot it; there is no part aiming, and every round that hits rolls its own location (about 55% body, 25% arms, 20% legs). Each attack that hits the body has a 1–5% chance to redirect one body round into the cockpit. Destroy the body to neutralize an enemy. Destroy its weapon arm to disable firing, legs to stop movement, or shield arm to reduce armor. Cover lowers hit chance except for missiles. Actions use the unit's movement and AP allowances. Each pilot has a unique once-per-battle skill. End Turn advances the enemy lance.

Keyboard: 1–3 selects a unit; M moves; F fires; Q activates a skill; E ends the turn. Mouse/touch supports every action. Sound is opt-in.

Ship and Hangar show one selected upgrade at a time. Workshop keeps the selected mech beside one weapon refit, with comparison, statistics and paint available on demand. Contracts use a compact offer list with one preparation panel. Combat target details open explicitly on desktop, tablets and phones.

Contract rewards fund weapons, chassis, upgrades, and repairs. Pilot experience unlocks training and improves combat performance. Career state saves to browser localStorage. Career screen supports backup export/import. Free field patches prevent an economy dead end.

## Verification

Run `npm run setup:qa`, then `npm test` for the simulation suites. `npm run test:browser` checks desktop and touch behavior; `npm run test:release` runs the complete release gate. Browser checks require Chromium as described in [Release checks](qa/README.md). QA dependencies are development-only.

The same release gate runs through `qa/site-package.cjs` before a Sites publication. `.openai/hosting.json` retains the existing Site identity. GitHub pushes do not automatically deploy the Site; use the Sites source and publication workflow when a deployment is requested.

The Sites v98 verification and the local renderer release results are recorded in [docs/release-verification.json](docs/release-verification.json).

## Scope

An original tactical browser game with a persistent mercenary career, recruitable pilots, multiple chassis and weapons, repeatable contracts, and saved sorties. Source is in `dist/`; asset generators and exporters are in `tools/`; regression checks and save fixtures are in `qa/`; design records are in `design/` and `design-qa.md`.

All game assets and fonts are local. Phosphor icon and font licenses are included beside their files. Earlier milestones are recorded in [the project history](docs/HISTORY.md).

## Playability update

Completed actions now checkpoint the active sortie in the career save. Reloading restores positions, part HP, AP, pilot skills and the selected action. An interrupted enemy phase replays from its start; completed mission rewards cannot be paid twice. Invalid sortie checkpoints preserve the valid career record. Existing version-1 career backups still load.

On mobile, tap a hostile to acquire it and tap it again to fire. The target button opens a read-only drawer with its part health. Escape closes a manual or target details. Field repair cannot be spent on an already healthy body.

Free emergency field patches now restore 50% condition. Seeded recovery tests found the original 35% patch insufficient for a zero-reserve company. Repairs to 100% remain useful for harder contracts.

`npm test --prefix qa` now also plays complete seeded missions, an earned-money career through all three contracts, zero-reserve recovery, exact sortie reloads, interrupted enemy phases, corrupt checkpoint recovery, single victory payouts and level-100 save compatibility. It does not provide browser layout or visual certification.

## Live rig rendering

The battlefield renders all 21 campaign chassis, tanks, gunships, and cover with three.js. Mechs use their rig-v2 GLBs or the procedural kit. The shared animator drives the planted gait, weapon priming and recoil, bracing, part damage, and destruction. Shots and strikes use the actual muzzle and contact anchors. Existing career saves and in-progress sorties retain their format.

The Mech Bay shows the active seats and reserves in the hangar. Select a deployed mech to inspect it or open a reserve in Workshop Storage. The Workshop turntable shows the equipped guns, melee weapon, shield, pod, and reinforcement. Drag to rotate, pinch to zoom, and double-tap to reset. Armor paint and trim change the model materials. Workshop, Ship, and combat UI mech images use cached 640×640 renders.

Rig Bench uses the campaign renderer and combat rules. Its controls cover equipment, kit assemblies, materials, damage states, cameras, and IK. Use the clip scrubber to inspect the archived Blender sequences. War mode can play seeded campaign encounters with the real roster, rules, and terrain. Both Workshop and Career link to the Bench.

See the [export gate and source inventory](docs/phase3-export-gate.md) and [release checks](qa/README.md).

## Terrain and equipment

The relay basin, refinery yard, and frozen frontier each use a ground texture and live cover. They retain the same cover coordinates, adjacency bonus, and movement costs. Reachable tiles that grant cover show a small shield. Painted roads, tracks, and water are visual.

The Workshop uses the production weapon GLBs. Basilisk's factory Vesper shots launch from its integral pod sockets. Kestrel and Basilisk have editable Blender generators under `tools/authoring/`.

## Expanded tactical theater

New sorties use an 18×20 board. Drag the battlefield to pan, tap the tactical map to jump, use Overview to see the full field, and use the center control to return to the selected pilot. Older active sorties resume on their original 10×10 board. Existing careers can deploy to the larger maps on their next contract.

Each field has separate mech positions and light armor and air support. Tanks and gunships have hull HP and a single weapon. Gunships can cross ground cover and require ranged attacks. Destroying a vehicle awards the attacking pilot XP.

The attack camera shows the attacker and target together, then holds on the result. It plays for each player attack and the first hostile attack per round. Escape or Skip Attack returns to the map. Career offers a persistent attack camera setting, and reduced motion uses the standard tactical view.

## Chassis ownership and Foundry saves

Buy or rebuild a chassis in the Workshop, then assign it to a pilot. Primary, secondary and accent colors belong to the machine, as do its weapon slots, condition and reinforcement. Pilot XP and level follow the pilot. Mech pilots are targetable independently of the chassis body. An incapacitated pilot leaves a powered-down mech in the field.

Foundry backups exported by the donor's v2 game can be imported from Career. The importer maps the donor's frame IDs to the six Foundry frames and carries over assignments, reserves, armaments, paint, condition, experience and the campaign record. The donor's in-progress sortie uses a different map and enemy roster. An imported career starts its next sortie on the Sites ruleset.

## Mobility and reactions

Each mech can move up to its Mobility before its first action without spending AP. It can take one extra tile for 1 AP. The map marks free destinations in cyan and the paid extension in amber. A spent mech does not block selection of a reachable tile behind it.

Each surviving mech has one reaction per round. It uses an operational melee weapon against an adjacent ground attacker, or returns ranged fire if its weapon arm works and the attacker is in range. Reactions spend no AP and cannot trigger another reaction.

Mechs and vehicles ease toward the next heading before crossing a tile. Each step uses a hydraulic lift cue and a weighted contact cue. The attack preparation uses the same sequence with a separate mechanical lock cue.
