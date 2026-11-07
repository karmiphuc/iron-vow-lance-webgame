# IRON VOW — Mercenary Command

A self-contained, original browser tactical mech game inspired by part-based strategy games such as Front Mission 3. No original game assets are used.

Open `dist/index.html` in a modern browser, or serve `dist/` through any static web server. No build step or dependencies are required. Fonts, icons and artwork are included locally.

## Play

Choose a contract, select one of three mechs, and click highlighted tiles to move. Choose Fire and click an enemy to attack its selected subsystem. Destroy the body to neutralize an enemy. Destroy its weapon arm to disable firing, legs to stop movement, or shield arm to reduce armor. Cover lowers hit chance except for missiles. Every action spends AP. Each pilot has a unique once-per-battle skill. End Turn advances the enemy lance.

Keyboard: 1–3 selects a unit; M moves; F fires; Q activates a skill; E ends the turn. Mouse/touch supports every action. Sound is opt-in.

Contract rewards fund four weapons, chassis upgrades, and repairs. Pilot experience increases damage. Career state saves to browser localStorage. Career screen supports backup export/import. Free field patches prevent an economy dead end.

## Verification

`node --check dist/game.js`

`node check.cjs` runs simulation checks with a minimal DOM/canvas stub: five screens, save validation, pathfinding, limb loss, skills, combat damage, bracing, enemy turns, victory and withdrawal, persistent rewards, and renderer smoke at mobile/tablet/desktop sizes. This is not browser visual QA.

## Scope

Three pilots, three chassis, four weapons, three repeatable contracts, and an ongoing mercenary progression loop. This is an original compact tactical game, not a reproduction of the full Front Mission 3 campaign, narrative, roster, or mechanics.

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
