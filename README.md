# IRON VOW — Mercenary Command

A self-contained, original browser tactical mech game inspired by part-based strategy games such as Front Mission 3. No original game assets are used.

This repository includes the complete Iron Vow Sites project through **Site version 97**, including its source history, game assets, 3D models, authoring tools, tests, and fixtures. Import provenance is recorded in [docs/sites-export.json](docs/sites-export.json). GitHub development can include changes beyond that published snapshot; use the Sites publication workflow to deploy them.

## Run locally

Install Node.js 22 or newer, then:

```sh
git clone https://github.com/karmiphuc/iron-vow-lance-webgame.git
cd iron-vow-lance-webgame
npm run dev
```

Open **http://127.0.0.1:5173**. No dependency installation, build step, API key, or Sites connection is required to play. Fonts, models, artwork, and audio are included locally. The server also serves the Rig Bench, Prototype Bay, and Foundry Studio.

Set `IRON_VOW_PORT` or `IRON_VOW_HOST` to change the local address. Alternatively, serve `dist/` with any static HTTP server. Using HTTP allows browser model and asset loading to work consistently.

Career saves belong to each browser origin. To move an existing career from the live Site, export it from Career there, then import the backup in your local game.

The current game includes a persistent company and pilot roster, part-based mech combat, modular equipment, terrain and elevation, the Workshop, and model inspection tools. The existing live game is at [Iron Vow Sites](https://iron-vow-mercenary-command.karmi-nguyen.chatgpt.site).

## Play

Choose a contract, deploy your lance, select a unit, and click highlighted tiles to move. Choose Fire and click an enemy to attack its selected subsystem. Destroy the body to neutralize an enemy. Destroy its weapon arm to disable firing, legs to stop movement, or shield arm to reduce armor. Cover lowers hit chance except for missiles. Actions use the unit's movement and AP allowances. Each pilot has a unique once-per-battle skill. End Turn advances the enemy lance.

Keyboard: 1–3 selects a unit; M moves; F fires; Q activates a skill; E ends the turn. Mouse/touch supports every action. Sound is opt-in.

Contract rewards fund weapons, chassis, upgrades, and repairs. Pilot experience unlocks training and improves combat performance. Career state saves to browser localStorage. Career screen supports backup export/import. Free field patches prevent an economy dead end.

## Verification

The canvas renderer detects filter support on pixels and uses offscreen compositing when filters are ignored, including Safari-style contexts. Spent units, wrecks, damage shading and hit flashes preserve the sprite silhouette and the current subsystem masks. Live Warden movement uses continuous paired strides; its per-rig materials and cached damage variants are released after combat. Software WebGL uses the baked Warden to keep combat responsive. Foundry fallback and directional art is rebuilt from the corrected rigs.

Run `npm run setup:qa`, then `npm test` for the simulation suites. `npm run test:browser` checks desktop and touch behavior; `npm run test:release` runs the complete release gate. Browser checks require Chromium as described in [Release checks](qa/README.md). QA dependencies are development-only.

The same release gate runs through `qa/site-package.cjs` before a Sites publication. `.openai/hosting.json` retains the existing Site identity. GitHub pushes do not automatically deploy the Site; use the Sites source and publication workflow when a deployment is requested.

## Scope

An original tactical browser game with a persistent mercenary career, recruitable pilots, multiple chassis and weapons, repeatable contracts, and saved sorties. Source is in `dist/`; asset generators and exporters are in `tools/`; regression checks and save fixtures are in `qa/`; design records are in `design/` and `design-qa.md`.

## Development history

The sections below record earlier milestones, including the original smaller roster and renderer. The current game combines live Foundry rigs with baked fallback art.

## Visual rebuild

The Last Light edition replaces the initial geometric placeholder rendering with original generated hangar artwork, three separate detailed mech sprites, three pilot portraits, contract environments, concrete terrain and cover assets. Combat uses a pre-rendered 2.5D renderer with depth sorting, live targeting, route-following movement, distinct weapon effects, impact shake and close combat camera. It does not use real-time 3D models. Workshop chassis art shows factory equipment; operational weapon statistics use the equipped loadout.

All game assets and fonts are local. Existing version-1 careers remain compatible. Phosphor icon and font licenses are included beside their files.

`design-qa.md` records the verification boundary: simulation, actual DOM interactions and native canvas rendering were checked; browser CSS/layout/visual QA remains blocked because the browser-control tool is unavailable. The native canvas images in `design/` are renderer evidence, not browser screenshots.

For the optional actual-DOM/native-renderer check, install the isolated tools in `qa/` (`npm install --prefix qa`) and run `npm test --prefix qa`. These are development-only checks; the web game has no package dependencies or build step.

## Playability update

Completed actions now checkpoint the active sortie in the career save. Reloading restores positions, part HP, AP, pilot skills and the selected action. An interrupted enemy phase replays from its start; completed mission rewards cannot be paid twice. Invalid sortie checkpoints preserve the valid career record. Existing version-1 career backups still load.

On mobile, tap a hostile to acquire it, open its subsystem details, choose a part, and tap the hostile again to fire. The target drawer has larger controls and closes after choosing a subsystem. Escape closes a manual or target details. Field repair cannot be spent on an already healthy body.

Free emergency field patches now restore 50% condition. Seeded recovery tests found the original 35% patch insufficient for a zero-reserve company. Repairs to 100% remain useful for harder contracts.

`npm test --prefix qa` now also plays complete seeded missions, an earned-money career through all three contracts, zero-reserve recovery, exact sortie reloads, interrupted enemy phases, corrupt checkpoint recovery, single victory payouts and level-100 save compatibility. It does not provide browser layout or visual certification.

## Mech animation update

Movement now uses frame-independent timed steps, alternating foot lift and torso motion, weight-specific stride durations, landing splashes and synchronized footfalls. The existing raster chassis are articulated through a small skinned 2.5D mesh; they are not real-time 3D models. Weapon-specific recoil moves the upper body while the feet remain planted. Muzzles and subsystem impact points follow the same deformation. Hit reactions, bracing, pilot-skill pulses, collapse and wreck smoke are animated. Facing is retained in new sortie checkpoints; older checkpoints remain compatible.

The motion tests cover 30/60/144 Hz stepping, landing/AP timing, recoil recovery, foot planting, collapse and reduced-motion preferences. `node qa/render-animation.cjs <output-folder>` produces native canvas animation frames, and `design/animation-preview.mp4` records that renderer output. This is animation evidence, not a browser capture or UI/layout certification.

## Arms, attacks and destruction

Upper-body animation now uses rigid arm, shoulder-pad and weapon layers over clean torso plates. Shoulder/elbow joints aim and absorb recoil while the weapon remains rigid. Existing leg/foot motion is retained, with 90 approved foot samples checked against the previous release. The clean torso plates are original generated edits; visible source torso pixels and original lower-leg artwork are retained when building the rig cache.

Attacks prepare before firing: rifle bursts, shotgun discharge, rail charging/release, and alternating missile pods have separate timing. Muzzle origins and impact points use camera-relative attachment coordinates so they remain aligned during combat zooms.

Destroyed chassis buckle into a supported kneel or fall. The knee impact precedes secondary reactor bursts, the main detonation, flying armor and a scorched debris pile. The final kill waits for the destruction sequence before showing the contract result. Reduced-motion behavior and existing career/sortie saves remain supported.

`qa/check-upper-animation.cjs` checks preserved feet, rigid weapon geometry, independent arm aim, knee contact, supported stance, fall rotation and one-shot explosion cues. The refreshed native preview demonstrates the three weapon styles and both death variants. Browser visual QA is still pending.

## Warden production rig

The Workshop links to `dist/rig-bench/index.html`, the interactive WebGL bench with the original Warden and six weapon modules. Both GLBs and the exact three.js r128 scripts are served beside the bench. When WebGL is unavailable, the bench plays a short baked Warden loop. Reduced-motion mode shows a still.

Combat remains on the existing canvas renderer. `tools/render_warden.py` reads those same GLBs and bakes two independently rendered facings for each of the game's matching weapon IDs, `rifle` (Kestrel) and `rail` (Longbow). The script projects the muzzle, body, arms, legs and floor registration into sprite coordinates. It also bakes twelve gait poses and three recoil levels per facing. Both the bake and the live bench use `dist/rig-bench/rig-motion.js` for leg IK, gait and weapon recoil. The battlefield selects poses from the same atlas it uses to resolve muzzle and subsystem effects. Workshop displays the matching weapon on Warden when its render is ready.

The legacy art remains the fallback for load failures, Warden's Breacher and Vesper loadouts, and the other two chassis. The hangar illustration remains separate. Combat AP, damage, mission pacing, controls and career/checkpoint data use the existing game code. The main game loads stills up front and requests the motion sheets on demand in combat. WebGL scripts and GLBs are loaded only by the bench.

To refresh the renders after updating the bench GLBs, run `blender -b -t 6 -P tools/render_warden.py` with Node.js on the path and Pillow installed for Blender. Run the same command with `-- --loop-only` for the higher-resolution bench preview. Commit the resulting stills, motion sheets, fallback loop and `dist/warden-visuals.js` together. The bench's original asset and runtime credits are in `dist/rig-bench/CREDITS.md`.

The Mark II armor and upgraded rifle/rail meshes have editable Blender generators under `tools/authoring/`. Run `blender -b -P tools/authoring/warden/build_warden.py` and `blender -b -P tools/authoring/weapons/source/build_weapons.py` to rebuild the source GLBs. Keep `clearance_profile.json` beside the Warden script. Copy the rebuilt GLBs to `dist/rig-bench/` before baking. A rebuild also writes the editable Blender files.

The merged Warden rig now adds three ready/aim poses and five authored kneeling poses per weapon/facing. Recoil uses shorter socket travel and smaller counter-rotating shoulder/elbow angles. The twelve approved gait samples retain their original leg kinematics. Death poses and effects share the projected hardpoints. Legacy Kestrel/Basilisk and other Warden loadouts use the layered 2.5D upper rig described above.

## Workshop arsenal and chassis paint

The Workshop saves a free ceramic plate color and separate primary and melee slots for each chassis. Weapons unlock across the company. Strike (X) spends AP to attack an adjacent hostile with the left arm. Hailstorm and Rampart join the ranged catalogue. Breaker, Arc Cleaver and Piledriver use the bench's existing melee poses. Hostiles use red identification paint.

The Kestrel and Basilisk model sources are under `tools/authoring/`. Their body pivots match Warden's shared rig. Kestrel has a slimmer recon profile and Basilisk launches Vesper missiles from its integral pod sockets. The game uses separately rendered chassis sheets and weapon modules, with UV-derived paint masks. It loads the model pose sheets during combat and keeps the GLBs alongside the 3D bench.

To refresh the game renders, run `blender -b --python-exit-code 1 -t 6 -P tools/render_arsenal.py -- <model>` once per model (`warden`, `kestrel`, `basilisk`, `weapons`). Then run `node tools/assemble_arsenal.cjs`. Commit the generated WebPs and `dist/arsenal-visuals.js` together. The intermediate JSON files stay local.

## Battlefield and armory visual pass

The Workshop displays all nine weapon models on their equipment cards. The four revised ranged modules use the same attachment and effects hooks. The three revised chassis retain their current paint masks and shared animation pivots.

The relay basin, refinery yard, and frozen frontier each load one projected ground texture and two local cover models. They retain the same cover coordinates, adjacency bonus, and movement costs. Reachable tiles that grant cover show a small shield. Painted roads, tracks, and water are visual.

Run `python tools/render_battlefields.py` with Pillow and NumPy to rebuild the three ground textures. Run `blender -b -t 6 -P tools/render_cover.py` to bake the six cover sprites. Chassis and weapon sprite rebuilds use `tools/render_arsenal.py` as described above.

## Expanded tactical theater

New sorties use an 18×20 board. Drag the battlefield to pan, tap the tactical map to jump, use Overview to see the full field, and use the center control to return to the selected pilot. Older active sorties resume on their original 10×10 board. Existing careers can deploy to the larger maps on their next contract.

Each field has separate mech positions and light armor and air support. Tanks and gunships have hull HP and a single weapon. Gunships can cross ground cover and require ranged attacks. Destroying a vehicle awards the attacking pilot XP.

The attack camera shows the attacker and target together, then holds on the result. It plays for each player attack and the first hostile attack per round. Escape or Skip Attack returns to the map. Career offers a persistent attack camera setting, and reduced motion uses the standard tactical view.

Run `blender -b -t 5 -P tools/render_vehicles.py` to reproduce the four original vehicle views. The expanded ground textures and cover layouts are generated by `tools/render_battlefields.py`.

## Prototype Bay

Open Prototype Bay from the Workshop or Rig Bench to inspect Gatecrasher HV-09 and Cicada ML-14. Both use rigid bone weights, pole-controlled two-bone leg IK, and four telescoping rams. Gatecrasher has a separate cannon recoil carriage and an articulated gripper. Cicada has independently elevated twelve-cell launchers and hinged blast shutters. The browser shows the rendered triangle count and can scrub each of the four Blender-authored clips.

Build with `blender -b --factory-startup --python-exit-code 1 -P tools/authoring/prototypes/build_prototypes.py -- <output-directory>`. This generates the editable Blender files, the baked GLBs, and the still WebP previews. Copy the GLBs and WebPs to `dist/rig-bench/prototypes/`. The build checks foot IK and piston alignment at every authored frame. In Blender, solo an NLA track to inspect a clip, or mute all four tracks to pose the controls directly.

The Workshop also assigns any reserve frame to one of the three pilots. Pilot level and XP follow the pilot. Loadout, paint, condition, and reinforcement follow the chassis. Gatecrasher is a slow breach frame with the Morrow AC-2 and Breach Gauntlet. Cicada is a lightly armored fire support frame with the guided Locust MRL-24 and Pulse Bash. Both use factory armaments.

The battlefield and attack camera play Blender-baked Walk, Fire, and Strike poses, with two facing directions and projected weapon and subsystem locations. Run `blender -b --factory-startup --python-use-system-env --python-exit-code 1 -P tools/render_prototype_combat.py -- <rig-directory> <output-directory>` with Pillow available to Blender. The rig directory should contain the two Blender files from the authoring build, named `iron-vow-gatecrasher.blend` and `iron-vow-cicada.blend`. Copy the resulting `prototype-combat.js` and its `assets/*-combat-*.webp` files into `dist/`. `node qa/check-prototype-combat.cjs` checks the campaign assignments, per-frame motion and firing sockets, damage, and sortie reload.

## Foundry chassis merge

The company has eleven chassis. Existing frame IDs and career assignments are stable. The Foundry Bay adds Valkyrie, Oni, Behemoth, Aegis, Shrike and Bastion. The last three are the plate-harness, reverse-joint and reactive-armored variants from the supplied procedural kit. Their frame IDs are independent of Warden, Kestrel and Basilisk.

Buy a Foundry chassis in the Workshop, then swap it between pilots without a fee. Primary, secondary and accent colors belong to the machine, as do its weapon slots, condition and reinforcement. Pilot XP and level follow the pilot. Oni comes with the Raijin HB-9, which strikes through cover at one tile. Mech pilots are targetable independently of the chassis body. An incapacitated pilot leaves a powered-down mech in the field. Older checkpoints restore their original enemy roster and receive default pilot HP.

The Sites renderer remains responsible for the theater, vehicles, combat camera, UI and audio. Foundry chassis use a Three.js r128 rig rendered into that compositor. Devices without WebGL use painted sprite atlases baked from the same rig, with separate walk, attack, pilot-down and wreck poses. Foundry Studio shows the front, side, tactical angle, hip armor and a Valkyrie/Behemoth module mix.

To rebuild the fallback art:

```sh
npm ci --prefix qa
c++ -O3 -std=c++17 tools/foundry-raster.cpp -o /tmp/foundry-raster
node tools/render_foundry.cjs /tmp/foundry-raster
```

Behemoth uses Gatecrasher R2's authored torso and inset crew cabin on its original
tetrapod undercarriage. The torso and cabin are 10% larger than the approved local
fit (1.012× the Gatecrasher source); the mortar saddle follows the enlarged rear
deck. Its arms, arsenal mounts, kneeling supports, and independent
rear-deck mortar remain Behemoth's. The imported armor uses the chassis's primary,
secondary, and accent paint; the forward viewing slit is the pilot target.
Run `node tools/extract_behemoth_core.cjs` after changing Gatecrasher's source GLB.
This emits the synchronous geometry asset `dist/foundry/behemoth-core.js`, with its
source hash and fitting measurements. Then rebuild Behemoth's stills and 19-pose
fallback atlas with `node tools/render_foundry.cjs /tmp/foundry-raster 5`, and its
four directional field views with
`node tools/render_travel.cjs /tmp/foundry-raster /tmp/unused-vehicles foundry-5`.

Run `npm test --prefix qa` for the simulation and renderer suite. `python3 tools/package_offline.py /path/to/Iron-Vow-Foundry.html` creates a single-file campaign with local assets embedded. The Rig Bench and Foundry Studio links open the hosted reference tools.

Foundry backups exported by the donor's v2 game can be imported from Career. The importer maps the donor's frame IDs to the six Foundry frames and carries over assignments, reserves, armaments, paint, condition, experience and the campaign record. The donor's in-progress sortie uses a different map and enemy roster. An imported career starts its next sortie on the Sites ruleset.

Foundry previews and combat mount the equipped arsenal assets at projected hand sockets. Baked armor remains available if WebGL is unavailable or fails during a render. Gatecrasher and Cicada now take a visible lead step before their authored firing and strike clips. The Foundry Studio module mix is a model preview.

The Foundry uses the same production weapon GLB as the Rig Bench. The baked renderer and preview use the production arsenal renders at the same hand sockets. Raijin uses the production blade geometry with an amber heated edge.

## Mobility and reactions

Each mech can move up to its Mobility before its first action without spending AP. It can take one extra tile for 1 AP. The map marks free destinations in cyan and the paid extension in amber. A mech with no AP or reachable movement is dimmed and its sprite lets taps reach the ground behind it.

Each surviving mech has one reaction per round. It uses an operational melee weapon against an adjacent ground attacker, or returns ranged fire if its weapon arm works and the attacker is in range. Reactions spend no AP and cannot trigger another reaction.

Mechs and vehicles snap to their next tile’s facing before moving. The field renderer has four map facings of the original models, with directional gait poses for the mechs. The Foundry WebGL rigs also use the map heading. Each step uses a hydraulic lift cue and a weighted contact cue. The attack preparation uses the same sequence with a separate mechanical lock cue.

To rebuild the directional assets:

```sh
blender -b --python-exit-code 1 -t 4 -P tools/render_vehicles.py -- --export-motion /tmp/iron-vow-travel
c++ -O3 -std=c++17 tools/foundry-raster.cpp -o /tmp/foundry-raster
node tools/render_travel.cjs /tmp/foundry-raster /tmp/iron-vow-travel
```
