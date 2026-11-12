# Commit log before the 2026-11-12 history rewrite

Every commit that existed on any branch or tag of `karmiphuc/iron-vow-lance-webgame` on 2026-11-12, oldest first. The original commits are no longer in this repository.
For each commit: old SHA, date, author, subject, branches that contained it (`main` if merged), and the files it changed. Files under `design/` other than Markdown (screenshots, capture JSON, evidence) are counted, not listed.

### `06895986d2` 2026-11-07 · Codex
Build Iron Vow tactical mech career game  
*main*
- A `.openai/hosting.json`
- A `README.md`
- A `check.cjs`
- A `dist/game.js`
- A `dist/index.html`
- A `dist/style.css`

### `35c44ba7c5` 2026-11-07 · Codex
Rebuild Last Light art direction and 2.5D tactical renderer  
*main*
- A `.gitignore`
- M `README.md`
- M `check.cjs`
- A `design-qa.md`
- A `design/visual-target.md`
- A `dist/assets/barricade.webp`
- A `dist/assets/basilisk.webp`
- A `dist/assets/concrete.webp`
- A `dist/assets/contract-corridor.webp`
- A `dist/assets/contract-frontier.webp`
- A `dist/assets/contract-relay.webp`
- A `dist/assets/fonts/Barlow-OFL.txt`
- A `dist/assets/fonts/Inter-OFL.txt`
- A `dist/assets/fonts/barlow-400.woff2`
- A `dist/assets/fonts/barlow-500.woff2`
- A `dist/assets/fonts/barlow-600.woff2`
- A `dist/assets/fonts/barlow-700.woff2`
- A `dist/assets/fonts/inter-100-900.woff2`
- A `dist/assets/hangar.webp`
- A `dist/assets/icons/LICENSE.txt`
- A `dist/assets/icons/arrow-right.svg`
- A `dist/assets/icons/arrow-u-up-left.svg`
- A `dist/assets/icons/arrows-out-cardinal.svg`
- A `dist/assets/icons/binoculars.svg`
- A `dist/assets/icons/crosshair.svg`
- A `dist/assets/icons/first-aid-kit.svg`
- A `dist/assets/icons/info.svg`
- A `dist/assets/icons/lightning.svg`
- A `dist/assets/icons/shield-chevron.svg`
- A `dist/assets/icons/speaker-high.svg`
- A `dist/assets/icons/speaker-slash.svg`
- A `dist/assets/icons/wrench.svg`
- A `dist/assets/icons/x.svg`
- A `dist/assets/kestrel.webp`
- A `dist/assets/pilot-anchor.webp`
- A `dist/assets/pilot-ghost.webp`
- A `dist/assets/pilot-rook.webp`
- A `dist/assets/warden.webp`
- A `dist/fonts.css`
- M `dist/game.js`
- M `dist/index.html`
- M `dist/style.css`
- A `qa/check-ui.cjs`
- A `qa/package-lock.json`
- A `qa/package.json`
- (3 evidence files under design/)

### `7060aa573e` 2026-11-07 · Codex
Rebuild Last Light art direction and 2.5D tactical renderer  
*main*
- M `README.md`
- M `design-qa.md`
- A `design/release-notes.md`
- M `dist/game.js`
- M `dist/style.css`
- A `qa/check-missions.cjs`
- A `qa/check-resume.cjs`
- M `qa/check-ui.cjs`
- M `qa/package.json`
- A `qa/sim-harness.cjs`
- (3 evidence files under design/)

### `6eb427c4a5` 2026-11-07 · Codex
Animate mech strides, recoil, hit reactions and collapse  
*main*
- M `README.md`
- M `design-qa.md`
- A `dist/assets/motion-preview.mp4`
- M `dist/game.js`
- A `qa/check-animation.cjs`
- M `qa/package.json`
- A `qa/render-animation.cjs`
- M `qa/sim-harness.cjs`
- (5 evidence files under design/)

### `97c4f2d0b0` 2026-11-07 · Codex
Update Site source  
*main*
- M `README.md`
- A `dist/assets/warden-rail-left.webp`
- A `dist/assets/warden-rail-right.webp`
- A `dist/assets/warden-rifle-left.webp`
- A `dist/assets/warden-rifle-right.webp`
- M `dist/game.js`
- M `dist/index.html`
- A `dist/rig-bench/CREDITS.md`
- A `dist/rig-bench/index.html`
- A `dist/rig-bench/vendor/GLTFLoader.js`
- A `dist/rig-bench/vendor/LICENSE.txt`
- A `dist/rig-bench/vendor/three.min.js`
- A `dist/rig-bench/warden.glb`
- A `dist/rig-bench/weapons.glb`
- M `dist/style.css`
- A `dist/warden-visuals.js`
- M `qa/check-ui.cjs`
- A `tools/render_warden.py`

### `b9faeaab68` 2026-11-07 · Codex
Update Site source  
*main*
- M `README.md`
- A `dist/assets/warden-rail-left-motion.webp`
- M `dist/assets/warden-rail-left.webp`
- A `dist/assets/warden-rail-right-motion.webp`
- M `dist/assets/warden-rail-right.webp`
- A `dist/assets/warden-rifle-left-motion.webp`
- M `dist/assets/warden-rifle-left.webp`
- A `dist/assets/warden-rifle-right-motion.webp`
- M `dist/assets/warden-rifle-right.webp`
- A `dist/assets/warden-rig-loop.webp`
- M `dist/game.js`
- M `dist/rig-bench/CREDITS.md`
- M `dist/rig-bench/index.html`
- A `dist/rig-bench/rig-motion.js`
- M `dist/rig-bench/warden.glb`
- M `dist/rig-bench/weapons.glb`
- M `dist/warden-visuals.js`
- M `qa/check-ui.cjs`
- A `tools/authoring/warden/build_warden.py`
- A `tools/authoring/warden/clearance_profile.json`
- A `tools/authoring/weapons/source/build_weapons.py`
- M `tools/render_warden.py`
- A `tools/sample_warden_motion.cjs`

### `a7fd666244` 2026-11-07 · Codex
Rig rigid arm and weapon motion with staged kneeling and reactor destruction  
*main*
- M `README.md`
- M `design-qa.md`
- A `dist/assets/basilisk-base.webp`
- A `dist/assets/kestrel-base.webp`
- M `dist/assets/motion-preview.mp4`
- A `dist/assets/warden-base.webp`
- M `dist/game.js`
- M `qa/check-animation.cjs`
- M `qa/check-ui.cjs`
- A `qa/check-upper-animation.cjs`
- A `qa/fixtures/walk-feet-approved.json`
- M `qa/package.json`
- M `qa/render-animation.cjs`
- (5 evidence files under design/)

### `d3ba8caead` 2026-11-07 · Codex · merge
Merge Warden production rig with jointed attacks and staged destruction  
*main*

### `01dcd59aed` 2026-11-08 · Codex
Update Site source  
*main*
- M `dist/game.js`
- M `dist/style.css`

### `39a62873f0` 2026-11-08 · Codex
Update Site source  
*main*
- M `.gitignore`
- M `README.md`
- A `dist/arsenal-visuals.js`
- A `dist/assets/arsenal-breaker-left.webp`
- A `dist/assets/arsenal-breaker-right.webp`
- A `dist/assets/arsenal-cleaver-left.webp`
- A `dist/assets/arsenal-cleaver-right.webp`
- A `dist/assets/arsenal-hailstorm-left.webp`
- A `dist/assets/arsenal-hailstorm-right.webp`
- A `dist/assets/arsenal-missile-left.webp`
- A `dist/assets/arsenal-missile-right.webp`
- A `dist/assets/arsenal-piledriver-left-extended.webp`
- A `dist/assets/arsenal-piledriver-left.webp`
- A `dist/assets/arsenal-piledriver-right-extended.webp`
- A `dist/assets/arsenal-piledriver-right.webp`
- A `dist/assets/arsenal-rail-left.webp`
- A `dist/assets/arsenal-rail-right.webp`
- A `dist/assets/arsenal-rampart-left.webp`
- A `dist/assets/arsenal-rampart-right.webp`
- A `dist/assets/arsenal-rifle-left.webp`
- A `dist/assets/arsenal-rifle-right.webp`
- A `dist/assets/arsenal-shotgun-left.webp`
- A `dist/assets/arsenal-shotgun-right.webp`
- A `dist/assets/basilisk-chassis-left-motion-paint.webp`
- A `dist/assets/basilisk-chassis-left-motion.webp`
- A `dist/assets/basilisk-chassis-left-paint.webp`
- A `dist/assets/basilisk-chassis-left.webp`
- A `dist/assets/basilisk-chassis-right-motion-paint.webp`
- A `dist/assets/basilisk-chassis-right-motion.webp`
- A `dist/assets/basilisk-chassis-right-paint.webp`
- A `dist/assets/basilisk-chassis-right.webp`
- A `dist/assets/kestrel-chassis-left-motion-paint.webp`
- A `dist/assets/kestrel-chassis-left-motion.webp`
- A `dist/assets/kestrel-chassis-left-paint.webp`
- A `dist/assets/kestrel-chassis-left.webp`
- A `dist/assets/kestrel-chassis-right-motion-paint.webp`
- A `dist/assets/kestrel-chassis-right-motion.webp`
- A `dist/assets/kestrel-chassis-right-paint.webp`
- A `dist/assets/kestrel-chassis-right.webp`
- A `dist/assets/warden-chassis-left-motion-paint.webp`
- A `dist/assets/warden-chassis-left-motion.webp`
- A `dist/assets/warden-chassis-left-paint.webp`
- A `dist/assets/warden-chassis-left.webp`
- A `dist/assets/warden-chassis-right-motion-paint.webp`
- A `dist/assets/warden-chassis-right-motion.webp`
- A `dist/assets/warden-chassis-right-paint.webp`
- A `dist/assets/warden-chassis-right.webp`
- M `dist/game.js`
- M `dist/index.html`
- M `dist/rig-bench/CREDITS.md`
- A `dist/rig-bench/basilisk.glb`
- A `dist/rig-bench/kestrel.glb`
- M `dist/rig-bench/weapons.glb`
- M `dist/style.css`
- A `qa/check-arsenal.cjs`
- M `qa/package.json`
- A `tools/assemble_arsenal.cjs`
- A `tools/authoring/basilisk/build_basilisk.py`
- A `tools/authoring/basilisk/clearance_profile.json`
- A `tools/authoring/kestrel/build_kestrel.py`
- M `tools/authoring/weapons/source/build_weapons.py`
- A `tools/render_arsenal.py`
- M `tools/sample_warden_motion.cjs`

### `39affa80b9` 2026-11-08 · Codex
Update Site source  
*main*
- M `dist/game.js`

### `f414b77388` 2026-11-08 · Codex
Update Site source  
*main*
- M `README.md`
- M `dist/arsenal-visuals.js`
- M `dist/assets/arsenal-hailstorm-left.webp`
- M `dist/assets/arsenal-hailstorm-right.webp`
- M `dist/assets/arsenal-missile-left.webp`
- M `dist/assets/arsenal-missile-right.webp`
- M `dist/assets/arsenal-rampart-left.webp`
- M `dist/assets/arsenal-rampart-right.webp`
- M `dist/assets/arsenal-shotgun-left.webp`
- M `dist/assets/arsenal-shotgun-right.webp`
- M `dist/assets/basilisk-chassis-left-motion-paint.webp`
- M `dist/assets/basilisk-chassis-left-motion.webp`
- M `dist/assets/basilisk-chassis-left-paint.webp`
- M `dist/assets/basilisk-chassis-left.webp`
- M `dist/assets/basilisk-chassis-right-motion-paint.webp`
- M `dist/assets/basilisk-chassis-right-motion.webp`
- M `dist/assets/basilisk-chassis-right-paint.webp`
- M `dist/assets/basilisk-chassis-right.webp`
- A `dist/assets/cover-bunker.webp`
- A `dist/assets/cover-cargo.webp`
- A `dist/assets/cover-conifer.webp`
- A `dist/assets/cover-relay-shield.webp`
- A `dist/assets/cover-ridge-rock.webp`
- A `dist/assets/cover-transformer.webp`
- A `dist/assets/ground-corridor.webp`
- A `dist/assets/ground-frontier.webp`
- A `dist/assets/ground-relay.webp`
- M `dist/assets/kestrel-chassis-left-motion-paint.webp`
- M `dist/assets/kestrel-chassis-left-motion.webp`
- M `dist/assets/kestrel-chassis-left-paint.webp`
- M `dist/assets/kestrel-chassis-left.webp`
- M `dist/assets/kestrel-chassis-right-motion-paint.webp`
- M `dist/assets/kestrel-chassis-right-motion.webp`
- M `dist/assets/kestrel-chassis-right-paint.webp`
- M `dist/assets/kestrel-chassis-right.webp`
- M `dist/assets/warden-chassis-left-motion-paint.webp`
- M `dist/assets/warden-chassis-left-motion.webp`
- M `dist/assets/warden-chassis-left-paint.webp`
- M `dist/assets/warden-chassis-left.webp`
- M `dist/assets/warden-chassis-right-motion-paint.webp`
- M `dist/assets/warden-chassis-right-motion.webp`
- M `dist/assets/warden-chassis-right-paint.webp`
- M `dist/assets/warden-chassis-right.webp`
- M `dist/assets/warden-rig-loop.webp`
- M `dist/game.js`
- M `dist/rig-bench/CREDITS.md`
- M `dist/rig-bench/basilisk.glb`
- M `dist/rig-bench/kestrel.glb`
- M `dist/rig-bench/warden.glb`
- M `dist/rig-bench/weapons.glb`
- M `dist/style.css`
- M `qa/check-arsenal.cjs`
- M `tools/authoring/basilisk/build_basilisk.py`
- M `tools/authoring/kestrel/build_kestrel.py`
- M `tools/authoring/warden/build_warden.py`
- M `tools/authoring/weapons/source/build_weapons.py`
- A `tools/render_battlefields.py`
- A `tools/render_cover.py`

### `8ebea2f05c` 2026-11-08 · Codex
Update Site source  
*main*
- M `README.md`
- M `check.cjs`
- M `dist/assets/ground-corridor.webp`
- M `dist/assets/ground-frontier.webp`
- M `dist/assets/ground-relay.webp`
- A `dist/assets/hostile-helicopter-left.webp`
- A `dist/assets/hostile-helicopter-right.webp`
- A `dist/assets/hostile-tank-left.webp`
- A `dist/assets/hostile-tank-right.webp`
- M `dist/game.js`
- M `dist/index.html`
- M `dist/style.css`
- A `dist/theater-layouts.js`
- M `qa/check-animation.cjs`
- M `qa/check-arsenal.cjs`
- M `qa/check-missions.cjs`
- M `qa/check-resume.cjs`
- A `qa/check-tactical.cjs`
- M `qa/check-ui.cjs`
- M `qa/package.json`
- M `qa/sim-harness.cjs`
- M `tools/render_battlefields.py`
- A `tools/render_vehicles.py`

### `f530260a53` 2026-11-08 · Codex
Update Site source  
*main*
- M `dist/assets/hostile-helicopter-left.webp`
- M `dist/assets/hostile-helicopter-right.webp`
- M `dist/assets/hostile-tank-left.webp`
- M `dist/assets/hostile-tank-right.webp`
- M `dist/game.js`
- M `tools/render_vehicles.py`

### `e8d228b18c` 2026-11-08 · Codex
Update Site source  
*main*
- M `check.cjs`
- A `dist/assets/wreck-helicopter-left.webp`
- A `dist/assets/wreck-helicopter-right.webp`
- A `dist/assets/wreck-tank-left.webp`
- A `dist/assets/wreck-tank-right.webp`
- M `dist/game.js`
- M `dist/style.css`
- M `qa/check-animation.cjs`
- M `qa/check-arsenal.cjs`
- M `qa/check-missions.cjs`
- M `qa/check-resume.cjs`
- M `qa/check-tactical.cjs`
- M `qa/check-ui.cjs`
- A `tools/render_wrecks.py`

### `73f2e51630` 2026-11-08 · Codex
Update Site source  
*main*
- M `dist/arsenal-visuals.js`
- A `dist/assets/basilisk-chassis-left-attack-paint.webp`
- A `dist/assets/basilisk-chassis-left-attack.webp`
- A `dist/assets/basilisk-chassis-right-attack-paint.webp`
- A `dist/assets/basilisk-chassis-right-attack.webp`
- A `dist/assets/kestrel-chassis-left-attack-paint.webp`
- A `dist/assets/kestrel-chassis-left-attack.webp`
- A `dist/assets/kestrel-chassis-right-attack-paint.webp`
- A `dist/assets/kestrel-chassis-right-attack.webp`
- A `dist/assets/warden-chassis-left-attack-paint.webp`
- A `dist/assets/warden-chassis-left-attack.webp`
- A `dist/assets/warden-chassis-right-attack-paint.webp`
- A `dist/assets/warden-chassis-right-attack.webp`
- M `dist/game.js`
- M `qa/check-arsenal.cjs`
- M `qa/check-tactical.cjs`
- M `tools/render_arsenal.py`
- M `tools/sample_warden_motion.cjs`

### `485f2142a9` 2026-11-08 · karmiphuc
Update Site source  
*main*
- M `README.md`
- M `dist/game.js`
- M `dist/rig-bench/index.html`
- A `dist/rig-bench/prototypes/bay.css`
- A `dist/rig-bench/prototypes/bay.js`
- A `dist/rig-bench/prototypes/cicada.glb`
- A `dist/rig-bench/prototypes/cicada.webp`
- A `dist/rig-bench/prototypes/gatecrasher.glb`
- A `dist/rig-bench/prototypes/gatecrasher.webp`
- A `dist/rig-bench/prototypes/index.html`
- A `tools/authoring/prototypes/build_prototypes.py`

### `3ede54415a` 2026-11-08 · Codex
Update Site source  
*main*
- M `dist/game.js`

### `f9ff0ed35f` 2026-11-08 · karmiphuc
Update Site source  
*main*
- M `README.md`
- A `dist/assets/cicada-combat-left-motion-paint.webp`
- A `dist/assets/cicada-combat-left-motion.webp`
- A `dist/assets/cicada-combat-left-paint.webp`
- A `dist/assets/cicada-combat-left.webp`
- A `dist/assets/cicada-combat-right-motion-paint.webp`
- A `dist/assets/cicada-combat-right-motion.webp`
- A `dist/assets/cicada-combat-right-paint.webp`
- A `dist/assets/cicada-combat-right.webp`
- A `dist/assets/gatecrasher-combat-left-motion-paint.webp`
- A `dist/assets/gatecrasher-combat-left-motion.webp`
- A `dist/assets/gatecrasher-combat-left-paint.webp`
- A `dist/assets/gatecrasher-combat-left.webp`
- A `dist/assets/gatecrasher-combat-right-motion-paint.webp`
- A `dist/assets/gatecrasher-combat-right-motion.webp`
- A `dist/assets/gatecrasher-combat-right-paint.webp`
- A `dist/assets/gatecrasher-combat-right.webp`
- M `dist/game.js`
- M `dist/index.html`
- A `dist/prototype-combat.js`
- M `dist/style.css`
- A `qa/check-prototype-combat.cjs`
- M `qa/package.json`
- M `qa/sim-harness.cjs`
- A `tools/render_prototype_combat.py`

### `d4eed82fe3` 2026-11-08 · Codex
Update Site source  
*main*
- M `dist/game.js`

### `391adfc411` 2026-11-08 · Codex
Update Site source  
*main*
- A `dist/assets/audio/armor-hit.wav`
- A `dist/assets/audio/heavy-hit.wav`
- A `dist/assets/audio/missile-hit.wav`
- A `dist/assets/audio/pod-arm.wav`
- A `dist/assets/audio/rocket-launch.wav`
- M `dist/game.js`
- A `qa/check-combat-audio.cjs`
- M `qa/package.json`
- A `tools/render_combat_audio.py`

### `49de9b92b9` 2026-11-08 · Codex
Update Site source  
*main*
- A `dist/assets/audio/hangar-score.mp3`
- A `dist/assets/audio/mission-score.mp3`
- M `dist/game.js`
- M `dist/style.css`
- A `tools/render_music.py`

### `28998adfa2` 2026-11-08 · Codex
Update Site source  
*main*
- M `README.md`
- A `dist/assets/foundry-0-back-paint.webp`
- A `dist/assets/foundry-0-back.webp`
- A `dist/assets/foundry-0-front.webp`
- A `dist/assets/foundry-0-hip.webp`
- A `dist/assets/foundry-0-motion-paint.webp`
- A `dist/assets/foundry-0-motion.webp`
- A `dist/assets/foundry-0-other-side-paint.webp`
- A `dist/assets/foundry-0-other-side.webp`
- A `dist/assets/foundry-0-paint.webp`
- A `dist/assets/foundry-0-side-paint.webp`
- A `dist/assets/foundry-0-side.webp`
- A `dist/assets/foundry-0.webp`
- A `dist/assets/foundry-1-back-paint.webp`
- A `dist/assets/foundry-1-back.webp`
- A `dist/assets/foundry-1-front.webp`
- A `dist/assets/foundry-1-hip.webp`
- A `dist/assets/foundry-1-motion-paint.webp`
- A `dist/assets/foundry-1-motion.webp`
- A `dist/assets/foundry-1-other-side-paint.webp`
- A `dist/assets/foundry-1-other-side.webp`
- A `dist/assets/foundry-1-paint.webp`
- A `dist/assets/foundry-1-side-paint.webp`
- A `dist/assets/foundry-1-side.webp`
- A `dist/assets/foundry-1.webp`
- A `dist/assets/foundry-2-back-paint.webp`
- A `dist/assets/foundry-2-back.webp`
- A `dist/assets/foundry-2-front.webp`
- A `dist/assets/foundry-2-hip.webp`
- A `dist/assets/foundry-2-motion-paint.webp`
- A `dist/assets/foundry-2-motion.webp`
- A `dist/assets/foundry-2-other-side-paint.webp`
- A `dist/assets/foundry-2-other-side.webp`
- A `dist/assets/foundry-2-paint.webp`
- A `dist/assets/foundry-2-side-paint.webp`
- A `dist/assets/foundry-2-side.webp`
- A `dist/assets/foundry-2.webp`
- A `dist/assets/foundry-3-back-paint.webp`
- A `dist/assets/foundry-3-back.webp`
- A `dist/assets/foundry-3-front.webp`
- A `dist/assets/foundry-3-hip.webp`
- A `dist/assets/foundry-3-motion-paint.webp`
- A `dist/assets/foundry-3-motion.webp`
- A `dist/assets/foundry-3-other-side-paint.webp`
- A `dist/assets/foundry-3-other-side.webp`
- A `dist/assets/foundry-3-paint.webp`
- A `dist/assets/foundry-3-side-paint.webp`
- A `dist/assets/foundry-3-side.webp`
- A `dist/assets/foundry-3.webp`
- A `dist/assets/foundry-4-back-paint.webp`
- A `dist/assets/foundry-4-back.webp`
- A `dist/assets/foundry-4-front.webp`
- A `dist/assets/foundry-4-hip.webp`
- A `dist/assets/foundry-4-motion-paint.webp`
- A `dist/assets/foundry-4-motion.webp`
- A `dist/assets/foundry-4-other-side-paint.webp`
- A `dist/assets/foundry-4-other-side.webp`
- A `dist/assets/foundry-4-paint.webp`
- A `dist/assets/foundry-4-side-paint.webp`
- A `dist/assets/foundry-4-side.webp`
- A `dist/assets/foundry-4.webp`
- A `dist/assets/foundry-5-back-paint.webp`
- A `dist/assets/foundry-5-back.webp`
- A `dist/assets/foundry-5-front.webp`
- A `dist/assets/foundry-5-hip.webp`
- A `dist/assets/foundry-5-motion-paint.webp`
- A `dist/assets/foundry-5-motion.webp`
- A `dist/assets/foundry-5-other-side-paint.webp`
- A `dist/assets/foundry-5-other-side.webp`
- A `dist/assets/foundry-5-paint.webp`
- A `dist/assets/foundry-5-side-paint.webp`
- A `dist/assets/foundry-5-side.webp`
- A `dist/assets/foundry-5.webp`
- A `dist/assets/foundry-modular.webp`
- A `dist/assets/foundry-raijin-right.webp`
- A `dist/assets/foundry-raijin.webp`
- A `dist/foundry/baked.js`
- A `dist/foundry/chassis.js`
- A `dist/foundry/renderer.js`
- A `dist/foundry/rig-motion.js`
- A `dist/foundry/studio.html`
- M `dist/game.js`
- M `dist/index.html`
- M `dist/style.css`
- M `qa/check-arsenal.cjs`
- A `qa/check-foundry.cjs`
- M `qa/check-tactical.cjs`
- M `qa/check-ui.cjs`
- M `qa/package.json`
- A `tools/foundry-raster.cpp`
- A `tools/package_offline.py`
- A `tools/render_foundry.cjs`

### `9e9e8201e1` 2026-11-08 · Codex
Update Site source  
*main*
- M `README.md`
- A `dist/assets/foundry-0-back-fit-paint.webp`
- A `dist/assets/foundry-0-back-fit.webp`
- D `dist/assets/foundry-0-back-paint.webp`
- M `dist/assets/foundry-0-back.webp`
- A `dist/assets/foundry-0-fit-paint.webp`
- A `dist/assets/foundry-0-fit.webp`
- M `dist/assets/foundry-0-front.webp`
- M `dist/assets/foundry-0-hip.webp`
- M `dist/assets/foundry-0-motion-paint.webp`
- M `dist/assets/foundry-0-motion.webp`
- A `dist/assets/foundry-0-other-side-fit-paint.webp`
- A `dist/assets/foundry-0-other-side-fit.webp`
- D `dist/assets/foundry-0-other-side-paint.webp`
- M `dist/assets/foundry-0-other-side.webp`
- D `dist/assets/foundry-0-paint.webp`
- A `dist/assets/foundry-0-side-fit-paint.webp`
- A `dist/assets/foundry-0-side-fit.webp`
- D `dist/assets/foundry-0-side-paint.webp`
- M `dist/assets/foundry-0-side.webp`
- M `dist/assets/foundry-0.webp`
- A `dist/assets/foundry-1-back-fit-paint.webp`
- A `dist/assets/foundry-1-back-fit.webp`
- D `dist/assets/foundry-1-back-paint.webp`
- M `dist/assets/foundry-1-back.webp`
- A `dist/assets/foundry-1-fit-paint.webp`
- A `dist/assets/foundry-1-fit.webp`
- M `dist/assets/foundry-1-front.webp`
- M `dist/assets/foundry-1-hip.webp`
- M `dist/assets/foundry-1-motion-paint.webp`
- M `dist/assets/foundry-1-motion.webp`
- A `dist/assets/foundry-1-other-side-fit-paint.webp`
- A `dist/assets/foundry-1-other-side-fit.webp`
- D `dist/assets/foundry-1-other-side-paint.webp`
- M `dist/assets/foundry-1-other-side.webp`
- D `dist/assets/foundry-1-paint.webp`
- A `dist/assets/foundry-1-side-fit-paint.webp`
- A `dist/assets/foundry-1-side-fit.webp`
- D `dist/assets/foundry-1-side-paint.webp`
- M `dist/assets/foundry-1-side.webp`
- M `dist/assets/foundry-1.webp`
- A `dist/assets/foundry-2-back-fit-paint.webp`
- A `dist/assets/foundry-2-back-fit.webp`
- D `dist/assets/foundry-2-back-paint.webp`
- M `dist/assets/foundry-2-back.webp`
- A `dist/assets/foundry-2-fit-paint.webp`
- A `dist/assets/foundry-2-fit.webp`
- M `dist/assets/foundry-2-front.webp`
- M `dist/assets/foundry-2-hip.webp`
- M `dist/assets/foundry-2-motion-paint.webp`
- M `dist/assets/foundry-2-motion.webp`
- A `dist/assets/foundry-2-other-side-fit-paint.webp`
- A `dist/assets/foundry-2-other-side-fit.webp`
- D `dist/assets/foundry-2-other-side-paint.webp`
- M `dist/assets/foundry-2-other-side.webp`
- D `dist/assets/foundry-2-paint.webp`
- A `dist/assets/foundry-2-side-fit-paint.webp`
- A `dist/assets/foundry-2-side-fit.webp`
- D `dist/assets/foundry-2-side-paint.webp`
- M `dist/assets/foundry-2-side.webp`
- M `dist/assets/foundry-2.webp`
- A `dist/assets/foundry-3-back-fit-paint.webp`
- A `dist/assets/foundry-3-back-fit.webp`
- D `dist/assets/foundry-3-back-paint.webp`
- M `dist/assets/foundry-3-back.webp`
- A `dist/assets/foundry-3-fit-paint.webp`
- A `dist/assets/foundry-3-fit.webp`
- M `dist/assets/foundry-3-front.webp`
- M `dist/assets/foundry-3-hip.webp`
- M `dist/assets/foundry-3-motion-paint.webp`
- M `dist/assets/foundry-3-motion.webp`
- A `dist/assets/foundry-3-other-side-fit-paint.webp`
- A `dist/assets/foundry-3-other-side-fit.webp`
- D `dist/assets/foundry-3-other-side-paint.webp`
- M `dist/assets/foundry-3-other-side.webp`
- D `dist/assets/foundry-3-paint.webp`
- A `dist/assets/foundry-3-side-fit-paint.webp`
- A `dist/assets/foundry-3-side-fit.webp`
- D `dist/assets/foundry-3-side-paint.webp`
- M `dist/assets/foundry-3-side.webp`
- M `dist/assets/foundry-3.webp`
- A `dist/assets/foundry-4-back-fit-paint.webp`
- A `dist/assets/foundry-4-back-fit.webp`
- D `dist/assets/foundry-4-back-paint.webp`
- M `dist/assets/foundry-4-back.webp`
- A `dist/assets/foundry-4-fit-paint.webp`
- A `dist/assets/foundry-4-fit.webp`
- M `dist/assets/foundry-4-front.webp`
- M `dist/assets/foundry-4-hip.webp`
- M `dist/assets/foundry-4-motion-paint.webp`
- M `dist/assets/foundry-4-motion.webp`
- A `dist/assets/foundry-4-other-side-fit-paint.webp`
- A `dist/assets/foundry-4-other-side-fit.webp`
- D `dist/assets/foundry-4-other-side-paint.webp`
- M `dist/assets/foundry-4-other-side.webp`
- D `dist/assets/foundry-4-paint.webp`
- A `dist/assets/foundry-4-side-fit-paint.webp`
- A `dist/assets/foundry-4-side-fit.webp`
- D `dist/assets/foundry-4-side-paint.webp`
- M `dist/assets/foundry-4-side.webp`
- M `dist/assets/foundry-4.webp`
- A `dist/assets/foundry-5-back-fit-paint.webp`
- A `dist/assets/foundry-5-back-fit.webp`
- D `dist/assets/foundry-5-back-paint.webp`
- M `dist/assets/foundry-5-back.webp`
- A `dist/assets/foundry-5-fit-paint.webp`
- A `dist/assets/foundry-5-fit.webp`
- M `dist/assets/foundry-5-front.webp`
- M `dist/assets/foundry-5-hip.webp`
- M `dist/assets/foundry-5-motion-paint.webp`
- M `dist/assets/foundry-5-motion.webp`
- A `dist/assets/foundry-5-other-side-fit-paint.webp`
- A `dist/assets/foundry-5-other-side-fit.webp`
- D `dist/assets/foundry-5-other-side-paint.webp`
- M `dist/assets/foundry-5-other-side.webp`
- D `dist/assets/foundry-5-paint.webp`
- A `dist/assets/foundry-5-side-fit-paint.webp`
- A `dist/assets/foundry-5-side-fit.webp`
- D `dist/assets/foundry-5-side-paint.webp`
- M `dist/assets/foundry-5-side.webp`
- M `dist/assets/foundry-5.webp`
- M `dist/foundry/baked.js`
- M `dist/foundry/renderer.js`
- M `dist/foundry/rig-motion.js`
- M `dist/game.js`
- M `qa/check-foundry.cjs`
- M `qa/check-prototype-combat.cjs`
- M `qa/sim-harness.cjs`
- M `tools/render_foundry.cjs`

### `d3076aa130` 2026-11-08 · Codex
Update Site source  
*main*
- M `README.md`
- M `dist/assets/foundry-0-back-fit-paint.webp`
- M `dist/assets/foundry-0-back-fit.webp`
- M `dist/assets/foundry-0-back.webp`
- M `dist/assets/foundry-0-fit-paint.webp`
- M `dist/assets/foundry-0-fit.webp`
- M `dist/assets/foundry-0-front.webp`
- M `dist/assets/foundry-0-hip.webp`
- M `dist/assets/foundry-0-motion-paint.webp`
- M `dist/assets/foundry-0-motion.webp`
- M `dist/assets/foundry-0-other-side-fit-paint.webp`
- M `dist/assets/foundry-0-other-side-fit.webp`
- M `dist/assets/foundry-0-other-side.webp`
- M `dist/assets/foundry-0-side-fit-paint.webp`
- M `dist/assets/foundry-0-side-fit.webp`
- M `dist/assets/foundry-0-side.webp`
- M `dist/assets/foundry-0.webp`
- M `dist/assets/foundry-1-back-fit-paint.webp`
- M `dist/assets/foundry-1-back-fit.webp`
- M `dist/assets/foundry-1-back.webp`
- M `dist/assets/foundry-1-fit-paint.webp`
- M `dist/assets/foundry-1-fit.webp`
- M `dist/assets/foundry-1-front.webp`
- M `dist/assets/foundry-1-hip.webp`
- M `dist/assets/foundry-1-motion-paint.webp`
- M `dist/assets/foundry-1-motion.webp`
- M `dist/assets/foundry-1-other-side-fit-paint.webp`
- M `dist/assets/foundry-1-other-side-fit.webp`
- M `dist/assets/foundry-1-other-side.webp`
- M `dist/assets/foundry-1-side-fit-paint.webp`
- M `dist/assets/foundry-1-side-fit.webp`
- M `dist/assets/foundry-1-side.webp`
- M `dist/assets/foundry-1.webp`
- M `dist/assets/foundry-2-back-fit-paint.webp`
- M `dist/assets/foundry-2-back-fit.webp`
- M `dist/assets/foundry-2-back.webp`
- M `dist/assets/foundry-2-fit-paint.webp`
- M `dist/assets/foundry-2-fit.webp`
- M `dist/assets/foundry-2-front.webp`
- M `dist/assets/foundry-2-hip.webp`
- M `dist/assets/foundry-2-motion-paint.webp`
- M `dist/assets/foundry-2-motion.webp`
- M `dist/assets/foundry-2-other-side-fit-paint.webp`
- M `dist/assets/foundry-2-other-side-fit.webp`
- M `dist/assets/foundry-2-other-side.webp`
- M `dist/assets/foundry-2-side-fit-paint.webp`
- M `dist/assets/foundry-2-side-fit.webp`
- M `dist/assets/foundry-2-side.webp`
- M `dist/assets/foundry-2.webp`
- M `dist/assets/foundry-3-back-fit-paint.webp`
- M `dist/assets/foundry-3-back-fit.webp`
- M `dist/assets/foundry-3-back.webp`
- M `dist/assets/foundry-3-fit-paint.webp`
- M `dist/assets/foundry-3-fit.webp`
- M `dist/assets/foundry-3-front.webp`
- M `dist/assets/foundry-3-hip.webp`
- M `dist/assets/foundry-3-motion-paint.webp`
- M `dist/assets/foundry-3-motion.webp`
- M `dist/assets/foundry-3-other-side-fit-paint.webp`
- M `dist/assets/foundry-3-other-side-fit.webp`
- M `dist/assets/foundry-3-other-side.webp`
- M `dist/assets/foundry-3-side-fit-paint.webp`
- M `dist/assets/foundry-3-side-fit.webp`
- M `dist/assets/foundry-3-side.webp`
- M `dist/assets/foundry-3.webp`
- M `dist/assets/foundry-4-back-fit-paint.webp`
- M `dist/assets/foundry-4-back-fit.webp`
- M `dist/assets/foundry-4-back.webp`
- M `dist/assets/foundry-4-fit-paint.webp`
- M `dist/assets/foundry-4-fit.webp`
- M `dist/assets/foundry-4-front.webp`
- M `dist/assets/foundry-4-hip.webp`
- M `dist/assets/foundry-4-motion-paint.webp`
- M `dist/assets/foundry-4-motion.webp`
- M `dist/assets/foundry-4-other-side-fit-paint.webp`
- M `dist/assets/foundry-4-other-side-fit.webp`
- M `dist/assets/foundry-4-other-side.webp`
- M `dist/assets/foundry-4-side-fit-paint.webp`
- M `dist/assets/foundry-4-side-fit.webp`
- M `dist/assets/foundry-4-side.webp`
- M `dist/assets/foundry-4.webp`
- M `dist/assets/foundry-5-back-fit-paint.webp`
- M `dist/assets/foundry-5-back-fit.webp`
- M `dist/assets/foundry-5-back.webp`
- M `dist/assets/foundry-5-fit-paint.webp`
- M `dist/assets/foundry-5-fit.webp`
- M `dist/assets/foundry-5-front.webp`
- M `dist/assets/foundry-5-hip.webp`
- M `dist/assets/foundry-5-motion-paint.webp`
- M `dist/assets/foundry-5-motion.webp`
- M `dist/assets/foundry-5-other-side-fit-paint.webp`
- M `dist/assets/foundry-5-other-side-fit.webp`
- M `dist/assets/foundry-5-other-side.webp`
- M `dist/assets/foundry-5-side-fit-paint.webp`
- M `dist/assets/foundry-5-side-fit.webp`
- M `dist/assets/foundry-5-side.webp`
- M `dist/assets/foundry-5.webp`
- M `dist/assets/foundry-raijin-right.webp`
- M `dist/assets/foundry-raijin.webp`
- M `dist/foundry/baked.js`
- A `dist/foundry/production-arsenal.js`
- M `dist/foundry/renderer.js`
- M `dist/foundry/rig-motion.js`
- M `dist/foundry/studio.html`
- M `dist/game.js`
- M `dist/index.html`
- M `dist/style.css`
- M `qa/check-foundry.cjs`
- M `tools/package_offline.py`
- M `tools/render_foundry.cjs`

### `c104271db3` 2026-11-08 · Codex
Update Site source  
*main*
- M `README.md`
- A `dist/assets/travel-basilisk-paint.webp`
- A `dist/assets/travel-basilisk.webp`
- A `dist/assets/travel-cicada-paint.webp`
- A `dist/assets/travel-cicada.webp`
- A `dist/assets/travel-foundry-0-paint.webp`
- A `dist/assets/travel-foundry-0.webp`
- A `dist/assets/travel-foundry-1-paint.webp`
- A `dist/assets/travel-foundry-1.webp`
- A `dist/assets/travel-foundry-2-paint.webp`
- A `dist/assets/travel-foundry-2.webp`
- A `dist/assets/travel-foundry-3-paint.webp`
- A `dist/assets/travel-foundry-3.webp`
- A `dist/assets/travel-foundry-4-paint.webp`
- A `dist/assets/travel-foundry-4.webp`
- A `dist/assets/travel-foundry-5-paint.webp`
- A `dist/assets/travel-foundry-5.webp`
- A `dist/assets/travel-gatecrasher-paint.webp`
- A `dist/assets/travel-gatecrasher.webp`
- A `dist/assets/travel-helicopter.webp`
- A `dist/assets/travel-kestrel-paint.webp`
- A `dist/assets/travel-kestrel.webp`
- A `dist/assets/travel-tank.webp`
- A `dist/assets/travel-warden-paint.webp`
- A `dist/assets/travel-warden.webp`
- M `dist/foundry/renderer.js`
- M `dist/game.js`
- M `dist/index.html`
- M `dist/style.css`
- A `dist/travel-visuals.js`
- M `qa/check-animation.cjs`
- M `qa/check-foundry.cjs`
- M `qa/check-missions.cjs`
- A `qa/check-mobility.cjs`
- M `qa/check-prototype-combat.cjs`
- M `qa/check-resume.cjs`
- M `qa/check-tactical.cjs`
- M `qa/package.json`
- M `qa/sim-harness.cjs`
- A `tools/render_travel.cjs`
- M `tools/render_vehicles.py`

### `8483eec538` 2026-11-08 · Codex
Update Site source  
*main*
- M `README.md`
- A `dist/assets/grid-travel-basilisk-paint.webp`
- A `dist/assets/grid-travel-basilisk.webp`
- A `dist/assets/grid-travel-cicada-paint.webp`
- A `dist/assets/grid-travel-cicada.webp`
- A `dist/assets/grid-travel-foundry-0-paint.webp`
- A `dist/assets/grid-travel-foundry-0.webp`
- A `dist/assets/grid-travel-foundry-1-paint.webp`
- A `dist/assets/grid-travel-foundry-1.webp`
- A `dist/assets/grid-travel-foundry-2-paint.webp`
- A `dist/assets/grid-travel-foundry-2.webp`
- A `dist/assets/grid-travel-foundry-3-paint.webp`
- A `dist/assets/grid-travel-foundry-3.webp`
- A `dist/assets/grid-travel-foundry-4-paint.webp`
- A `dist/assets/grid-travel-foundry-4.webp`
- A `dist/assets/grid-travel-foundry-5-paint.webp`
- A `dist/assets/grid-travel-foundry-5.webp`
- A `dist/assets/grid-travel-gatecrasher-paint.webp`
- A `dist/assets/grid-travel-gatecrasher.webp`
- A `dist/assets/grid-travel-helicopter.webp`
- A `dist/assets/grid-travel-kestrel-paint.webp`
- A `dist/assets/grid-travel-kestrel.webp`
- A `dist/assets/grid-travel-tank.webp`
- A `dist/assets/grid-travel-warden-paint.webp`
- A `dist/assets/grid-travel-warden.webp`
- D `dist/assets/travel-basilisk-paint.webp`
- D `dist/assets/travel-basilisk.webp`
- D `dist/assets/travel-cicada-paint.webp`
- D `dist/assets/travel-cicada.webp`
- D `dist/assets/travel-foundry-0-paint.webp`
- D `dist/assets/travel-foundry-0.webp`
- D `dist/assets/travel-foundry-1-paint.webp`
- D `dist/assets/travel-foundry-1.webp`
- D `dist/assets/travel-foundry-2-paint.webp`
- D `dist/assets/travel-foundry-2.webp`
- D `dist/assets/travel-foundry-3-paint.webp`
- D `dist/assets/travel-foundry-3.webp`
- D `dist/assets/travel-foundry-4-paint.webp`
- D `dist/assets/travel-foundry-4.webp`
- D `dist/assets/travel-foundry-5-paint.webp`
- D `dist/assets/travel-foundry-5.webp`
- D `dist/assets/travel-gatecrasher-paint.webp`
- D `dist/assets/travel-gatecrasher.webp`
- D `dist/assets/travel-helicopter.webp`
- D `dist/assets/travel-kestrel-paint.webp`
- D `dist/assets/travel-kestrel.webp`
- D `dist/assets/travel-tank.webp`
- D `dist/assets/travel-warden-paint.webp`
- D `dist/assets/travel-warden.webp`
- M `dist/foundry/renderer.js`
- M `dist/game.js`
- A `dist/grid-travel-visuals.js`
- M `dist/index.html`
- D `dist/travel-visuals.js`
- M `qa/check-animation.cjs`
- M `qa/check-mobility.cjs`
- M `qa/check-ui.cjs`
- M `qa/sim-harness.cjs`
- M `tools/render_travel.cjs`

### `c43875e1db` 2026-11-08 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/style.css`
- M `qa/check-mobility.cjs`

### `e7e85a1b0f` 2026-11-08 · karmiphuc
Update Site source  
*main*
- M `dist/assets/foundry-5-back-fit-paint.webp`
- M `dist/assets/foundry-5-back-fit.webp`
- M `dist/assets/foundry-5-back.webp`
- M `dist/assets/foundry-5-fit-paint.webp`
- M `dist/assets/foundry-5-fit.webp`
- M `dist/assets/foundry-5-front.webp`
- M `dist/assets/foundry-5-hip.webp`
- M `dist/assets/foundry-5-motion-paint.webp`
- M `dist/assets/foundry-5-motion.webp`
- M `dist/assets/foundry-5-other-side-fit-paint.webp`
- M `dist/assets/foundry-5-other-side-fit.webp`
- M `dist/assets/foundry-5-other-side.webp`
- M `dist/assets/foundry-5-side-fit-paint.webp`
- M `dist/assets/foundry-5-side-fit.webp`
- M `dist/assets/foundry-5-side.webp`
- M `dist/assets/foundry-5.webp`
- M `dist/assets/foundry-modular.webp`
- M `dist/foundry/baked.js`
- M `dist/foundry/chassis.js`
- M `dist/foundry/renderer.js`
- M `dist/foundry/rig-motion.js`
- M `dist/game.js`
- M `qa/check-foundry.cjs`
- M `tools/render_foundry.cjs`

### `e9be775276` 2026-11-08 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/index.html`
- M `dist/style.css`
- M `qa/check-mobility.cjs`

### `f59b8685ed` 2026-11-08 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/style.css`
- A `qa/check-training.cjs`
- M `qa/package.json`

### `fa012d07d4` 2026-11-08 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/index.html`
- M `dist/style.css`
- M `qa/check-combat-audio.cjs`
- A `qa/check-doctrine.cjs`
- M `qa/check-ui.cjs`
- M `qa/package.json`

### `3307f8561d` 2026-11-08 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/style.css`
- M `qa/check-doctrine.cjs`
- M `qa/check-foundry.cjs`
- A `qa/check-inn.cjs`
- M `qa/check-missions.cjs`
- M `qa/check-mobility.cjs`
- M `qa/check-tactical.cjs`
- M `qa/check-ui.cjs`
- M `qa/package.json`

### `75035d6ebd` 2026-11-08 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/style.css`
- M `qa/check-doctrine.cjs`
- M `qa/check-foundry.cjs`
- M `qa/check-inn.cjs`
- A `qa/check-new-hires.cjs`
- M `qa/check-tactical.cjs`
- M `qa/check-ui.cjs`
- M `qa/package.json`

### `c80cdc47b7` 2026-11-08 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `qa/check-upper-animation.cjs`

### `a99f0a6bc3` 2026-11-08 · karmiphuc
Update Site source  
*main*
- A `AGENTS.md`
- M `README.md`
- A `qa/README.md`
- A `qa/browser/campaign.cjs`
- A `qa/browser/impact.cjs`
- A `qa/check-browser.cjs`
- A `qa/check-published-saves.cjs`
- A `qa/check-simulation.cjs`
- A `qa/check-site-package.cjs`
- M `qa/check-ui.cjs`
- A `qa/fixtures/v31-corridor.json`
- A `qa/fixtures/v32-picket.json`
- M `qa/package-lock.json`
- M `qa/package.json`
- A `qa/release-check.cjs`
- A `qa/site-package.cjs`

### `f1dda6820a` 2026-11-08 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/style.css`
- M `qa/README.md`
- M `qa/browser/campaign.cjs`
- A `qa/check-counter-training.cjs`
- M `qa/check-doctrine.cjs`
- M `qa/check-mobility.cjs`
- M `qa/check-training.cjs`

### `803d71eb07` 2026-11-08 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/style.css`
- M `qa/README.md`
- A `qa/browser/paint.cjs`
- M `qa/check-browser.cjs`

### `d3051c4831` 2026-11-08 · karmiphuc
Update Site source  
*main*
- A `dist/assets/gatecrasher-r2-combat-left-motion-paint.webp`
- A `dist/assets/gatecrasher-r2-combat-left-motion.webp`
- A `dist/assets/gatecrasher-r2-combat-left-paint.webp`
- A `dist/assets/gatecrasher-r2-combat-left.webp`
- A `dist/assets/gatecrasher-r2-combat-right-motion-paint.webp`
- A `dist/assets/gatecrasher-r2-combat-right-motion.webp`
- A `dist/assets/gatecrasher-r2-combat-right-paint.webp`
- A `dist/assets/gatecrasher-r2-combat-right.webp`
- M `dist/assets/grid-travel-gatecrasher-paint.webp`
- M `dist/assets/grid-travel-gatecrasher.webp`
- A `dist/assets/grid-travel-hellbreaker-paint.webp`
- A `dist/assets/grid-travel-hellbreaker.webp`
- M `dist/game.js`
- M `dist/grid-travel-visuals.js`
- M `dist/prototype-combat.js`
- M `dist/rig-bench/prototypes/bay.js`
- M `dist/rig-bench/prototypes/gatecrasher.glb`
- M `dist/rig-bench/prototypes/gatecrasher.webp`
- A `dist/rig-bench/prototypes/hellbreaker.glb`
- A `dist/rig-bench/prototypes/hellbreaker.webp`
- M `dist/rig-bench/prototypes/index.html`
- M `qa/browser/campaign.cjs`
- M `qa/browser/paint.cjs`
- M `qa/check-arsenal.cjs`
- M `qa/check-foundry.cjs`
- A `qa/check-gatecrasher.cjs`
- M `qa/check-mobility.cjs`
- M `qa/check-published-saves.cjs`
- A `qa/fixtures/v35-frontier.json`
- A `tools/export_gatecrasher.py`
- A `tools/install_gatecrasher_r2.py`
- M `tools/render_prototype_combat.py`
- M `tools/render_travel.cjs`

### `c361511b86` 2026-11-08 · karmiphuc
Update Site source  
*main*
- A `dist/assets/grid-travel-warden-stance-paint.webp`
- A `dist/assets/grid-travel-warden-stance.webp`
- A `dist/assets/warden-detail-field-0-paint.webp`
- A `dist/assets/warden-detail-field-0.webp`
- A `dist/assets/warden-detail-field-1-paint.webp`
- A `dist/assets/warden-detail-field-1.webp`
- A `dist/assets/warden-detail-field-2-paint.webp`
- A `dist/assets/warden-detail-field-2.webp`
- A `dist/assets/warden-detail-field-3-paint.webp`
- A `dist/assets/warden-detail-field-3.webp`
- A `dist/assets/warden-detail-left-motion-paint.webp`
- A `dist/assets/warden-detail-left-motion.webp`
- A `dist/assets/warden-detail-left-paint.webp`
- A `dist/assets/warden-detail-left.webp`
- A `dist/assets/warden-detail-right-motion-paint.webp`
- A `dist/assets/warden-detail-right-motion.webp`
- A `dist/assets/warden-detail-right-paint.webp`
- A `dist/assets/warden-detail-right.webp`
- M `dist/game.js`
- M `dist/index.html`
- A `dist/warden-fidelity.js`
- M `qa/README.md`
- A `qa/browser/warden.cjs`
- M `qa/check-browser.cjs`

### `7104d9e7d4` 2026-11-08 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/style.css`
- M `qa/README.md`
- A `qa/browser/ship.cjs`
- M `qa/check-browser.cjs`
- A `qa/check-ship.cjs`
- M `qa/check-ui.cjs`

### `a961496195` 2026-11-08 · karmiphuc
Update Site source  
*main*
- M `dist/assets/gatecrasher-r2-combat-left-motion-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-left-motion.webp`
- M `dist/assets/gatecrasher-r2-combat-left-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-left.webp`
- M `dist/assets/gatecrasher-r2-combat-right-motion-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-right-motion.webp`
- M `dist/assets/gatecrasher-r2-combat-right-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-right.webp`
- M `dist/assets/grid-travel-gatecrasher-paint.webp`
- M `dist/assets/grid-travel-gatecrasher.webp`
- M `dist/game.js`
- M `dist/rig-bench/prototypes/gatecrasher.glb`
- M `dist/rig-bench/prototypes/gatecrasher.webp`
- M `qa/browser/impact.cjs`
- M `qa/check-gatecrasher.cjs`
- M `tools/render_prototype_combat.py`
- M `tools/render_travel.cjs`

### `a2ad112097` 2026-11-08 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/index.html`
- M `dist/style.css`
- M `qa/README.md`
- A `qa/browser/hangar.cjs`
- M `qa/browser/ship.cjs`
- M `qa/check-browser.cjs`
- A `qa/check-hangar.cjs`
- M `qa/check-ui.cjs`

### `1ac514875f` 2026-11-08 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/style.css`
- M `qa/README.md`
- A `qa/browser/career-tabs.cjs`
- M `qa/check-browser.cjs`
- M `qa/check-resume.cjs`

### `a773fd254c` 2026-11-08 · karmiphuc
Update Site source  
*main*
- M `dist/assets/gatecrasher-combat-left-motion-paint.webp`
- M `dist/assets/gatecrasher-combat-left-motion.webp`
- M `dist/assets/gatecrasher-combat-left-paint.webp`
- M `dist/assets/gatecrasher-combat-left.webp`
- M `dist/assets/gatecrasher-combat-right-motion-paint.webp`
- M `dist/assets/gatecrasher-combat-right-motion.webp`
- M `dist/assets/gatecrasher-combat-right-paint.webp`
- M `dist/assets/gatecrasher-combat-right.webp`
- M `dist/assets/gatecrasher-r2-combat-left-motion-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-left-motion.webp`
- M `dist/assets/gatecrasher-r2-combat-left-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-left.webp`
- M `dist/assets/gatecrasher-r2-combat-right-motion-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-right-motion.webp`
- M `dist/assets/gatecrasher-r2-combat-right-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-right.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-0-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-0.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-1-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-1.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-2-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-2.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-3-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-3.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-0-paint.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-0.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-1-paint.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-1.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-2-paint.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-2.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-3-paint.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-3.webp`
- M `dist/game.js`
- M `dist/grid-travel-visuals.js`
- M `dist/prototype-combat.js`
- M `qa/browser/paint.cjs`
- M `qa/check-gatecrasher.cjs`
- A `tools/render_breach_gait.py`
- M `tools/render_prototype_combat.py`

### `edf9defb1f` 2026-11-08 · karmiphuc
Update Site source  
*main*
- A `dist/assets/bastion-bst04.webp`
- A `dist/foundry/bastion.js`
- M `dist/foundry/renderer.js`
- M `dist/game.js`
- M `dist/index.html`
- A `dist/rig-bench/bastion-bst04.glb`
- A `dist/rig-bench/bastion-carbine.glb`
- A `dist/rig-bench/bastion-melee.glb`
- A `qa/browser/bastion.cjs`
- M `qa/browser/paint.cjs`
- M `qa/check-browser.cjs`
- M `qa/check-foundry.cjs`
- M `qa/check-mobility.cjs`
- A `tools/authoring/bastion/export_bastion.py`

### `b9598c2969` 2026-11-08 · karmiphuc
Update Site source  
*main*
- A `dist/assets/grid-travel-warden-hands-paint.webp`
- A `dist/assets/grid-travel-warden-hands.webp`
- A `dist/assets/warden-hands-field-0-paint.webp`
- A `dist/assets/warden-hands-field-0.webp`
- A `dist/assets/warden-hands-field-1-paint.webp`
- A `dist/assets/warden-hands-field-1.webp`
- A `dist/assets/warden-hands-field-2-paint.webp`
- A `dist/assets/warden-hands-field-2.webp`
- A `dist/assets/warden-hands-field-3-paint.webp`
- A `dist/assets/warden-hands-field-3.webp`
- A `dist/assets/warden-hands-left-motion-paint.webp`
- A `dist/assets/warden-hands-left-motion.webp`
- A `dist/assets/warden-hands-left-paint.webp`
- A `dist/assets/warden-hands-left-strike-paint.webp`
- A `dist/assets/warden-hands-left-strike.webp`
- A `dist/assets/warden-hands-left.webp`
- A `dist/assets/warden-hands-right-motion-paint.webp`
- A `dist/assets/warden-hands-right-motion.webp`
- A `dist/assets/warden-hands-right-paint.webp`
- A `dist/assets/warden-hands-right-strike-paint.webp`
- A `dist/assets/warden-hands-right-strike.webp`
- A `dist/assets/warden-hands-right.webp`
- A `dist/assets/warden-hands-strike-0-paint.webp`
- A `dist/assets/warden-hands-strike-0.webp`
- A `dist/assets/warden-hands-strike-1-paint.webp`
- A `dist/assets/warden-hands-strike-1.webp`
- A `dist/assets/warden-hands-strike-2-paint.webp`
- A `dist/assets/warden-hands-strike-2.webp`
- A `dist/assets/warden-hands-strike-3-paint.webp`
- A `dist/assets/warden-hands-strike-3.webp`
- M `dist/game.js`
- M `dist/rig-bench/index.html`
- A `dist/rig-bench/painted-warden.js`
- A `dist/rig-bench/warden-painted-motion.json`
- A `dist/rig-bench/warden-painted.glb`
- M `dist/warden-fidelity.js`
- A `qa/browser/warden-melee.cjs`
- A `qa/browser/warden-rig-bench.cjs`
- M `qa/browser/warden.cjs`
- M `qa/check-browser.cjs`

### `b68121caf0` 2026-11-08 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `qa/README.md`
- M `qa/browser/career-tabs.cjs`
- M `qa/browser/ship.cjs`

### `5dbfe6f61c` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `qa/browser/impact.cjs`
- M `qa/browser/paint.cjs`
- M `qa/browser/warden-melee.cjs`
- M `qa/browser/warden.cjs`

### `c0907635df` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/index.html`
- M `qa/browser/bastion.cjs`

### `9f6bcbd458` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/assets/pilot-marshal.png`
- A `dist/assets/pilot-portraits.LICENSE.txt`
- A `dist/assets/pilot-retriever.png`
- A `dist/assets/pilot-sapper.png`
- A `dist/assets/pilot-scout.png`
- A `dist/assets/pilot-signal.png`
- M `dist/game.js`
- M `dist/style.css`
- M `qa/README.md`
- A `qa/browser/duty-roster.cjs`
- M `qa/browser/hangar.cjs`
- M `qa/check-browser.cjs`
- A `qa/check-duty-roster.cjs`
- M `qa/check-ui.cjs`

### `431d84af64` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/assets/gatecrasher-r2-combat-left-motion-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-left-motion.webp`
- M `dist/assets/gatecrasher-r2-combat-left-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-left.webp`
- M `dist/assets/gatecrasher-r2-combat-right-motion-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-right-motion.webp`
- M `dist/assets/gatecrasher-r2-combat-right-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-right.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-0-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-0.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-1-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-1.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-2-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-2.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-3-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-3.webp`
- M `dist/game.js`
- M `dist/grid-travel-visuals.js`
- M `dist/prototype-combat.js`
- M `dist/rig-bench/prototypes/bay.js`
- M `dist/rig-bench/prototypes/gatecrasher.glb`
- M `dist/rig-bench/prototypes/gatecrasher.webp`
- M `dist/rig-bench/prototypes/index.html`
- M `qa/README.md`
- A `qa/browser/gatecrasher-armed.cjs`
- M `qa/check-browser.cjs`
- M `qa/check-gatecrasher.cjs`
- M `qa/check-mobility.cjs`
- M `qa/check-prototype-combat.cjs`
- A `tools/arm_gatecrasher_local.py`
- A `tools/bake_cleaver_strike.py`
- A `tools/install_armed_gatecrasher.py`
- A `tools/rebuild_cleaver_strike.py`
- M `tools/render_breach_gait.py`
- M `tools/render_prototype_combat.py`

### `ea09d144c1` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/assets/pilot-marshal.png`
- M `dist/assets/pilot-portraits.LICENSE.txt`
- M `dist/assets/pilot-retriever.png`
- M `dist/assets/pilot-sapper.png`
- M `dist/assets/pilot-scout.png`
- M `dist/assets/pilot-signal.png`
- M `dist/game.js`
- M `dist/style.css`
- M `qa/browser/duty-roster.cjs`

### `ceee92b35e` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/assets/gatecrasher-bare-combat-left-motion-paint.webp`
- A `dist/assets/gatecrasher-bare-combat-left-motion.webp`
- A `dist/assets/gatecrasher-bare-combat-left-paint.webp`
- A `dist/assets/gatecrasher-bare-combat-left.webp`
- A `dist/assets/gatecrasher-bare-combat-right-motion-paint.webp`
- A `dist/assets/gatecrasher-bare-combat-right-motion.webp`
- A `dist/assets/gatecrasher-bare-combat-right-paint.webp`
- A `dist/assets/gatecrasher-bare-combat-right.webp`
- A `dist/assets/gatecrasher-cleaver-combat-left-motion-paint.webp`
- A `dist/assets/gatecrasher-cleaver-combat-left-motion.webp`
- A `dist/assets/gatecrasher-cleaver-combat-left-paint.webp`
- A `dist/assets/gatecrasher-cleaver-combat-left.webp`
- A `dist/assets/gatecrasher-cleaver-combat-right-motion-paint.webp`
- A `dist/assets/gatecrasher-cleaver-combat-right-motion.webp`
- A `dist/assets/gatecrasher-cleaver-combat-right-paint.webp`
- A `dist/assets/gatecrasher-cleaver-combat-right.webp`
- A `dist/assets/gatecrasher-vesper-combat-left-motion-paint.webp`
- A `dist/assets/gatecrasher-vesper-combat-left-motion.webp`
- A `dist/assets/gatecrasher-vesper-combat-left-paint.webp`
- A `dist/assets/gatecrasher-vesper-combat-left.webp`
- A `dist/assets/gatecrasher-vesper-combat-right-motion-paint.webp`
- A `dist/assets/gatecrasher-vesper-combat-right-motion.webp`
- A `dist/assets/gatecrasher-vesper-combat-right-paint.webp`
- A `dist/assets/gatecrasher-vesper-combat-right.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-0-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-0.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-1-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-1.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-2-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-2.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-3-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-3.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-0-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-0.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-1-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-1.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-2-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-2.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-3-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-3.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-0-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-0.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-1-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-1.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-2-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-2.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-3-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-3.webp`
- M `dist/game.js`
- M `dist/grid-travel-visuals.js`
- M `dist/prototype-combat.js`
- M `dist/rig-bench/prototypes/bay.css`
- M `dist/rig-bench/prototypes/bay.js`
- M `dist/rig-bench/prototypes/gatecrasher.webp`
- M `dist/rig-bench/prototypes/index.html`
- M `qa/README.md`
- M `qa/browser/gatecrasher-armed.cjs`
- M `qa/check-gatecrasher.cjs`
- M `qa/check-mobility.cjs`
- M `qa/check-prototype-combat.cjs`
- A `tools/install_gatecrasher_kits.py`

### `70637adde5` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/armory-visuals.js`
- A `dist/assets/armory-anchor-hammer-left-impact.webp`
- A `dist/assets/armory-anchor-hammer-left.webp`
- A `dist/assets/armory-anchor-hammer-right-impact.webp`
- A `dist/assets/armory-anchor-hammer-right.webp`
- A `dist/assets/armory-cerberus-left.webp`
- A `dist/assets/armory-cerberus-right.webp`
- A `dist/assets/armory-ember-left.webp`
- A `dist/assets/armory-ember-right.webp`
- A `dist/assets/armory-falcon-left.webp`
- A `dist/assets/armory-falcon-right.webp`
- A `dist/assets/armory-forge-left.webp`
- A `dist/assets/armory-forge-right.webp`
- A `dist/assets/armory-hatchet-left.webp`
- A `dist/assets/armory-hatchet-right.webp`
- A `dist/assets/armory-obelisk-left.webp`
- A `dist/assets/armory-obelisk-right.webp`
- A `dist/assets/armory-pike-left-impact.webp`
- A `dist/assets/armory-pike-left.webp`
- A `dist/assets/armory-pike-right-impact.webp`
- A `dist/assets/armory-pike-right.webp`
- A `dist/assets/armory-sidewinder-left.webp`
- A `dist/assets/armory-sidewinder-right.webp`
- A `dist/assets/armory-tonfa-left.webp`
- A `dist/assets/armory-tonfa-right.webp`
- A `dist/assets/armory-trident-left.webp`
- A `dist/assets/armory-trident-right.webp`
- A `dist/assets/armory-watchman-left.webp`
- A `dist/assets/armory-watchman-right.webp`
- M `dist/foundry/bastion.js`
- M `dist/foundry/production-arsenal.js`
- M `dist/foundry/renderer.js`
- M `dist/foundry/rig-motion.js`
- M `dist/game.js`
- M `dist/index.html`
- A `dist/rig-bench/expansion-weapons-manifest.json`
- A `dist/rig-bench/expansion-weapons.glb`
- M `dist/style.css`
- M `qa/README.md`
- A `qa/browser/armory.cjs`
- M `qa/browser/bastion.cjs`
- M `qa/browser/campaign.cjs`
- M `qa/check-arsenal.cjs`
- M `qa/check-browser.cjs`
- M `qa/check-mobility.cjs`
- A `qa/check-weapon-expansion.cjs`
- M `qa/release-check.cjs`
- A `tools/authoring/weapons/source/build_expansion.py`

### `18b7729ed9` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/assets/armory-anchor-hammer-left-impact.webp`
- M `dist/assets/armory-anchor-hammer-left.webp`
- M `dist/assets/armory-anchor-hammer-right-impact.webp`
- M `dist/assets/armory-anchor-hammer-right.webp`
- M `dist/assets/armory-cerberus-left.webp`
- M `dist/assets/armory-cerberus-right.webp`
- M `dist/assets/armory-ember-left.webp`
- M `dist/assets/armory-ember-right.webp`
- M `dist/assets/armory-falcon-left.webp`
- M `dist/assets/armory-falcon-right.webp`
- M `dist/assets/armory-forge-left.webp`
- M `dist/assets/armory-forge-right.webp`
- M `dist/assets/armory-hatchet-left.webp`
- M `dist/assets/armory-hatchet-right.webp`
- M `dist/assets/armory-obelisk-left.webp`
- M `dist/assets/armory-obelisk-right.webp`
- M `dist/assets/armory-pike-left-impact.webp`
- M `dist/assets/armory-pike-left.webp`
- M `dist/assets/armory-pike-right-impact.webp`
- M `dist/assets/armory-pike-right.webp`
- M `dist/assets/armory-sidewinder-left.webp`
- M `dist/assets/armory-sidewinder-right.webp`
- M `dist/assets/armory-tonfa-left.webp`
- M `dist/assets/armory-tonfa-right.webp`
- M `dist/assets/armory-trident-left.webp`
- M `dist/assets/armory-trident-right.webp`
- M `dist/assets/armory-watchman-left.webp`
- M `dist/assets/armory-watchman-right.webp`
- M `dist/game.js`
- M `dist/rig-bench/expansion-weapons-manifest.json`
- M `dist/rig-bench/expansion-weapons.glb`
- M `dist/rig-bench/index.html`
- M `qa/browser/armory.cjs`
- M `qa/browser/warden-rig-bench.cjs`
- M `qa/check-weapon-expansion.cjs`
- M `tools/authoring/weapons/source/build_expansion.py`

### `b2f1c2854f` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/assets/foundry-6-front.webp`
- A `dist/assets/foundry-6-motion.webp`
- A `dist/assets/foundry-6-unarmed.webp`
- A `dist/assets/foundry-6.webp`
- M `dist/foundry/baked.js`
- M `dist/game.js`
- M `dist/index.html`
- M `qa/README.md`
- M `qa/browser/impact.cjs`
- A `qa/browser/line-infantry.cjs`
- M `qa/browser/paint.cjs`
- M `qa/check-arsenal.cjs`
- M `qa/check-browser.cjs`
- M `qa/check-foundry.cjs`
- A `qa/check-line-infantry.cjs`
- M `qa/check-mobility.cjs`
- M `qa/check-new-hires.cjs`
- M `qa/check-published-saves.cjs`
- A `qa/fixtures/v53-picket.json`
- M `qa/release-check.cjs`

### `38f0ba1d3f` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/assets/armory-bulwark-shield-left.webp`
- A `dist/assets/armory-bulwark-shield-right.webp`
- A `dist/assets/armory-citadel-shield-left.webp`
- A `dist/assets/armory-citadel-shield-right.webp`
- M `dist/foundry/bastion.js`
- M `dist/foundry/production-arsenal.js`
- M `dist/foundry/renderer.js`
- M `dist/game.js`
- M `dist/index.html`
- A `dist/rig-bench/shields.glb`
- A `dist/shield-visuals.js`
- M `dist/style.css`
- A `qa/browser/shields.cjs`
- M `qa/check-browser.cjs`
- A `qa/check-shields.cjs`
- M `qa/check-ui.cjs`
- A `qa/fixtures/shields-arm-lost.json`
- M `qa/release-check.cjs`
- A `tools/authoring/weapons/source/build_shields.py`

### `1eaff42e0b` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/index.html`
- A `qa/browser/attack-exchange.cjs`
- M `qa/check-browser.cjs`
- M `qa/check-tactical.cjs`

### `8ba64f2a62` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/foundry/bastion.js`
- M `dist/game.js`
- M `dist/index.html`
- M `qa/README.md`
- M `qa/browser/paint.cjs`
- M `qa/check-arsenal.cjs`

### `16b384d975` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/rig-bench/index.html`
- M `dist/rig-bench/prototypes/bay.js`
- A `dist/rig-bench/prototypes/bulwark.glb`
- A `dist/rig-bench/prototypes/bulwark.webp`
- M `dist/rig-bench/prototypes/index.html`
- A `qa/browser/bulwark-bench.cjs`
- M `qa/check-browser.cjs`
- M `qa/release-check.cjs`

### `c9f1e20462` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/assets/foundry-7-front-paint.webp`
- A `dist/assets/foundry-7-front.webp`
- A `dist/assets/foundry-7-motion-paint.webp`
- A `dist/assets/foundry-7-motion.webp`
- A `dist/assets/foundry-7-paint.webp`
- A `dist/assets/foundry-7-unarmed-paint.webp`
- A `dist/assets/foundry-7-unarmed.webp`
- A `dist/assets/foundry-7.webp`
- M `dist/foundry/baked.js`
- M `dist/game.js`
- M `dist/index.html`
- M `qa/README.md`
- M `qa/browser/impact.cjs`
- A `qa/browser/line-elite.cjs`
- M `qa/browser/paint.cjs`
- M `qa/check-browser.cjs`
- M `qa/check-foundry.cjs`
- M `qa/check-inn.cjs`
- A `qa/check-line-elite.cjs`
- M `qa/check-published-saves.cjs`
- A `qa/fixtures/v55-corridor.json`
- M `qa/release-check.cjs`

### `d3603e62fd` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/assets/foundry-6-front-paint.webp`
- A `dist/assets/foundry-6-motion-paint.webp`
- A `dist/assets/foundry-6-unarmed-paint.webp`
- M `dist/foundry/baked.js`
- M `dist/foundry/rig-motion.js`
- M `dist/game.js`
- M `dist/index.html`
- M `qa/README.md`
- M `qa/browser/line-elite.cjs`
- M `qa/browser/line-infantry.cjs`
- M `qa/browser/paint.cjs`
- M `qa/check-arsenal.cjs`
- A `qa/check-hostile-liveries.cjs`

### `b227dd1a73` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/assets/foundry-8-disarmed.webp`
- A `dist/assets/foundry-8-left-down.webp`
- A `dist/assets/foundry-8-motion.webp`
- A `dist/assets/foundry-8-right-down.webp`
- A `dist/assets/foundry-8.webp`
- A `dist/foundry/vanguard-baked.js`
- M `dist/game.js`
- M `dist/index.html`
- M `qa/browser/impact.cjs`
- M `qa/browser/paint.cjs`
- A `qa/browser/vanguard.cjs`
- M `qa/check-browser.cjs`
- M `qa/check-foundry.cjs`
- M `qa/check-hostile-liveries.cjs`
- M `qa/check-missions.cjs`
- A `qa/check-vanguard.cjs`
- M `qa/release-check.cjs`
- M `qa/sim-harness.cjs`
- A `tools/authoring/vanguard/bake.py`
- A `tools/authoring/vanguard/pack.py`

### `0d015d1efd` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/assets/foundry-9.webp`
- A `dist/assets/reaver-bare.webp`
- A `dist/assets/reaver-dual.webp`
- A `dist/assets/reaver-front.webp`
- A `dist/assets/reaver-left.webp`
- A `dist/assets/reaver-right.webp`
- M `dist/foundry/baked.js`
- M `dist/game.js`
- M `dist/index.html`
- M `qa/README.md`
- M `qa/browser/paint.cjs`
- A `qa/browser/reaver.cjs`
- M `qa/check-browser.cjs`
- M `qa/check-foundry.cjs`
- M `qa/check-hostile-liveries.cjs`
- A `qa/check-reaver.cjs`
- A `qa/fixtures/reaver-corridor.json`
- A `qa/fixtures/v56-corridor.json`
- M `qa/release-check.cjs`

### `6164897d3e` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/index.html`
- M `qa/browser/vanguard.cjs`
- M `qa/check-vanguard.cjs`

### `4267b21df0` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/rig-bench/index.html`
- M `dist/rig-bench/prototypes/bay.js`
- M `dist/rig-bench/prototypes/index.html`
- A `dist/rig-bench/prototypes/scout.glb`
- A `dist/rig-bench/prototypes/scout.webp`
- M `qa/browser/bulwark-bench.cjs`
- A `qa/browser/scout-bench.cjs`
- M `qa/check-browser.cjs`
- M `qa/release-check.cjs`
- A `tools/authoring/scout/export_bench.py`

### `e96543c88a` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/assets/foundry-9.webp`
- M `dist/assets/reaver-bare.webp`
- M `dist/assets/reaver-dual.webp`
- M `dist/assets/reaver-front.webp`
- M `dist/assets/reaver-left.webp`
- M `dist/assets/reaver-right.webp`
- M `dist/foundry/baked.js`
- M `qa/browser/reaver.cjs`
- M `qa/check-browser.cjs`

### `2d1d7f0e5e` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/assets/aegis-combat.webp`
- A `dist/assets/aegis-disarmed.webp`
- A `dist/assets/aegis-left-down.webp`
- A `dist/assets/aegis-right-down.webp`
- A `dist/assets/foundry-10.webp`
- A `dist/foundry/aegis-baked.js`
- M `dist/game.js`
- M `dist/index.html`
- A `qa/browser/bulwark-combat.cjs`
- M `qa/browser/paint.cjs`
- M `qa/check-browser.cjs`
- A `qa/check-bulwark.cjs`
- M `qa/check-foundry.cjs`
- A `qa/fixtures/v61-frontier.json`
- M `qa/release-check.cjs`
- M `qa/sim-harness.cjs`

### `b98493961c` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/index.html`
- M `qa/browser/bastion.cjs`
- M `qa/browser/campaign.cjs`
- M `qa/browser/duty-roster.cjs`
- M `qa/browser/gatecrasher-armed.cjs`
- M `qa/browser/hangar.cjs`
- M `qa/browser/ship.cjs`
- M `qa/check-duty-roster.cjs`
- M `qa/check-foundry.cjs`
- M `qa/check-gatecrasher.cjs`
- M `qa/check-hangar.cjs`
- A `qa/check-hull-prices.cjs`
- M `qa/check-inn.cjs`
- M `qa/check-mobility.cjs`
- M `qa/check-prototype-combat.cjs`
- M `qa/check-shields.cjs`
- M `qa/check-ship.cjs`

### `6769bac32d` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/assets/foundry-6-death-paint.webp`
- A `dist/assets/foundry-6-death.webp`
- A `dist/assets/foundry-7-death-paint.webp`
- A `dist/assets/foundry-7-death.webp`
- M `dist/foundry/baked.js`
- M `dist/game.js`
- M `dist/index.html`
- M `qa/README.md`
- A `qa/browser/infantry-destruction.cjs`
- M `qa/check-browser.cjs`

### `0565104722` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/index.html`
- M `qa/browser/infantry-destruction.cjs`

### `686a69c63e` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/assets/aegis-0-disarmed.webp`
- A `dist/assets/aegis-0-full.webp`
- A `dist/assets/aegis-0-left-down.webp`
- A `dist/assets/aegis-0-right-down.webp`
- A `dist/assets/aegis-1-disarmed.webp`
- A `dist/assets/aegis-1-full.webp`
- A `dist/assets/aegis-1-left-down.webp`
- A `dist/assets/aegis-1-right-down.webp`
- A `dist/assets/aegis-2-disarmed.webp`
- A `dist/assets/aegis-2-full.webp`
- A `dist/assets/aegis-2-left-down.webp`
- A `dist/assets/aegis-2-right-down.webp`
- A `dist/assets/aegis-3-disarmed.webp`
- A `dist/assets/aegis-3-full.webp`
- A `dist/assets/aegis-3-left-down.webp`
- A `dist/assets/aegis-3-right-down.webp`
- D `dist/assets/aegis-combat.webp`
- D `dist/assets/aegis-disarmed.webp`
- A `dist/assets/aegis-idle.webp`
- D `dist/assets/aegis-left-down.webp`
- D `dist/assets/aegis-right-down.webp`
- M `dist/assets/foundry-10.webp`
- M `dist/foundry/aegis-baked.js`
- M `dist/game.js`
- M `dist/index.html`
- M `qa/browser/bulwark-combat.cjs`
- M `qa/release-check.cjs`

### `ddeba20291` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/assets/ashigaru-combat.webp`
- A `dist/assets/ashigaru.webp`
- A `dist/foundry/ashigaru-baked.js`
- M `dist/game.js`
- M `dist/index.html`
- M `dist/rig-bench/index.html`
- M `dist/rig-bench/prototypes/bay.js`
- M `dist/rig-bench/prototypes/index.html`
- A `qa/browser/ashigaru.cjs`
- M `qa/browser/paint.cjs`
- M `qa/browser/scout-bench.cjs`
- A `qa/check-ashigaru.cjs`
- M `qa/check-browser.cjs`
- M `qa/check-foundry.cjs`
- M `qa/check-published-saves.cjs`
- M `qa/check-tactical.cjs`
- A `qa/fixtures/ashigaru-picket.json`
- M `qa/release-check.cjs`
- M `qa/sim-harness.cjs`
- A `tools/authoring/scout/bake_combat.py`
- A `tools/authoring/scout/pack_combat.py`

### `14ab9a3f6b` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/aero-strikes.js`
- A `dist/assets/aero-blade.webp`
- A `dist/assets/aero-breaker.webp`
- A `dist/assets/aero-cleaver.webp`
- A `dist/assets/aero-motion.webp`
- A `dist/assets/aero-piledriver.webp`
- A `dist/assets/foundry-11.webp`
- A `dist/foundry/aero-baked.js`
- M `dist/game.js`
- M `dist/index.html`
- A `dist/rig-bench/aero.css`
- A `dist/rig-bench/aero.html`
- A `dist/rig-bench/aero.js`
- M `dist/rig-bench/index.html`
- M `qa/README.md`
- A `qa/browser/aero.cjs`
- A `qa/check-aero.cjs`
- M `qa/check-browser.cjs`
- M `qa/check-foundry.cjs`
- M `qa/check-hangar.cjs`
- M `qa/check-inn.cjs`
- M `qa/check-missions.cjs`
- M `qa/check-new-hires.cjs`
- A `qa/fixtures/aero-jumpjet.json`
- A `qa/fixtures/aero-relay.json`
- M `qa/release-check.cjs`
- M `qa/sim-harness.cjs`

### `f144722300` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `qa/browser/ashigaru.cjs`

### `0b78ed8385` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/index.html`
- A `qa/browser/chassis-scale.cjs`
- M `qa/check-browser.cjs`

### `6ae984e787` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/assets/foundry-10-death-0.webp`
- A `dist/assets/foundry-10-death-1.webp`
- A `dist/assets/foundry-10-death-2.webp`
- A `dist/assets/foundry-10-death-3.webp`
- A `dist/assets/foundry-11-death.webp`
- A `dist/assets/foundry-12-death.webp`
- A `dist/assets/foundry-8-death.webp`
- A `dist/assets/foundry-9-death.webp`
- M `dist/foundry/bastion.js`
- M `dist/foundry/renderer.js`
- M `dist/foundry/rig-motion.js`
- A `dist/foundry/roster-destruction.js`
- M `dist/game.js`
- M `dist/index.html`
- A `qa/browser/roster-destruction.cjs`
- M `qa/check-browser.cjs`
- A `qa/check-roster-destruction.cjs`
- M `qa/release-check.cjs`
- M `qa/sim-harness.cjs`
- A `tools/authoring/destruction/bake.py`
- A `tools/authoring/destruction/pack.py`

### `9e560ab548` 2026-11-09 · Codex
Widen Basilisk hip and foot stance across combat renders  
*main*
- M `dist/arsenal-visuals.js`
- M `dist/assets/basilisk-chassis-left-attack-paint.webp`
- M `dist/assets/basilisk-chassis-left-attack.webp`
- M `dist/assets/basilisk-chassis-left-motion-paint.webp`
- M `dist/assets/basilisk-chassis-left-motion.webp`
- M `dist/assets/basilisk-chassis-left-paint.webp`
- M `dist/assets/basilisk-chassis-left.webp`
- M `dist/assets/basilisk-chassis-right-attack-paint.webp`
- M `dist/assets/basilisk-chassis-right-attack.webp`
- M `dist/assets/basilisk-chassis-right-motion-paint.webp`
- M `dist/assets/basilisk-chassis-right-motion.webp`
- M `dist/assets/basilisk-chassis-right-paint.webp`
- M `dist/assets/basilisk-chassis-right.webp`
- M `dist/assets/grid-travel-basilisk-paint.webp`
- M `dist/assets/grid-travel-basilisk.webp`
- M `dist/grid-travel-visuals.js`
- M `dist/rig-bench/basilisk.glb`
- A `qa/check-basilisk-stance.cjs`
- M `qa/check-browser.cjs`
- M `tools/authoring/basilisk/build_basilisk.py`
- M `tools/render_arsenal.py`
- M `tools/render_travel.cjs`
- M `tools/sample_warden_motion.cjs`

### `eabc27c771` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/index.html`

### `e55a1eccac` 2026-11-09 · Karmi Nguyen
Fit Gatecrasher torso to Behemoth and enlarge core by 10%  
*main*
- M `README.md`
- M `dist/assets/foundry-5-back-fit-paint.webp`
- M `dist/assets/foundry-5-back-fit.webp`
- M `dist/assets/foundry-5-back.webp`
- M `dist/assets/foundry-5-fit-paint.webp`
- M `dist/assets/foundry-5-fit.webp`
- M `dist/assets/foundry-5-front.webp`
- M `dist/assets/foundry-5-hip.webp`
- M `dist/assets/foundry-5-motion-paint.webp`
- M `dist/assets/foundry-5-motion.webp`
- M `dist/assets/foundry-5-other-side-fit-paint.webp`
- M `dist/assets/foundry-5-other-side-fit.webp`
- M `dist/assets/foundry-5-other-side.webp`
- M `dist/assets/foundry-5-side-fit-paint.webp`
- M `dist/assets/foundry-5-side-fit.webp`
- M `dist/assets/foundry-5-side.webp`
- M `dist/assets/foundry-5.webp`
- M `dist/assets/grid-travel-foundry-5-paint.webp`
- M `dist/assets/grid-travel-foundry-5.webp`
- M `dist/foundry/baked.js`
- A `dist/foundry/behemoth-core.js`
- M `dist/foundry/chassis.js`
- M `dist/foundry/rig-motion.js`
- M `dist/grid-travel-visuals.js`
- M `dist/index.html`
- M `qa/README.md`
- M `qa/browser/ashigaru.cjs`
- M `qa/browser/bastion.cjs`
- M `qa/browser/warden-melee.cjs`
- M `qa/browser/warden.cjs`
- M `qa/check-browser.cjs`
- M `qa/check-foundry.cjs`
- A `tools/extract_behemoth_core.cjs`
- M `tools/render_foundry.cjs`
- M `tools/render_travel.cjs`
- (1 evidence files under design/)

### `78a8b3e2e7` 2026-11-09 · Karmi Nguyen · merge
Merge current attack-camera HP display into Behemoth release  
*main*

### `e1a93df5f1` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/index.html`
- M `qa/browser/impact.cjs`

### `79ac4ee9bf` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/index.html`
- M `qa/browser/armory.cjs`
- A `qa/browser/volley.cjs`
- M `qa/check-browser.cjs`
- A `qa/check-burst-salvage.cjs`
- M `qa/check-resume.cjs`
- M `qa/check-shields.cjs`
- M `qa/check-training.cjs`
- M `qa/check-weapon-expansion.cjs`

### `85d8bee88b` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/index.html`
- M `qa/browser/aero.cjs`
- M `qa/browser/chassis-scale.cjs`
- M `qa/check-aero.cjs`
- M `qa/check-burst-salvage.cjs`
- M `qa/check-training.cjs`
- M `qa/check-weapon-expansion.cjs`

### `b99295fa81` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `.gitignore`
- A `dist/assets/aegis-0-disarmed-parts.webp`
- A `dist/assets/aegis-0-full-parts.webp`
- A `dist/assets/aegis-0-left-down-parts.webp`
- A `dist/assets/aegis-0-right-down-parts.webp`
- A `dist/assets/aegis-1-disarmed-parts.webp`
- A `dist/assets/aegis-1-full-parts.webp`
- A `dist/assets/aegis-1-left-down-parts.webp`
- A `dist/assets/aegis-1-right-down-parts.webp`
- A `dist/assets/aegis-2-disarmed-parts.webp`
- A `dist/assets/aegis-2-full-parts.webp`
- A `dist/assets/aegis-2-left-down-parts.webp`
- A `dist/assets/aegis-2-right-down-parts.webp`
- A `dist/assets/aegis-3-disarmed-parts.webp`
- A `dist/assets/aegis-3-full-parts.webp`
- A `dist/assets/aegis-3-left-down-parts.webp`
- A `dist/assets/aegis-3-right-down-parts.webp`
- A `dist/assets/aegis-idle-parts.webp`
- A `dist/assets/aero-blade-parts.webp`
- A `dist/assets/aero-breaker-parts.webp`
- A `dist/assets/aero-cleaver-parts.webp`
- A `dist/assets/aero-motion-parts.webp`
- A `dist/assets/aero-piledriver-parts.webp`
- A `dist/assets/ashigaru-combat-parts.webp`
- A `dist/assets/basilisk-chassis-left-attack-parts.webp`
- A `dist/assets/basilisk-chassis-left-motion-parts.webp`
- A `dist/assets/basilisk-chassis-left-parts.webp`
- A `dist/assets/basilisk-chassis-right-attack-parts.webp`
- A `dist/assets/basilisk-chassis-right-motion-parts.webp`
- A `dist/assets/basilisk-chassis-right-parts.webp`
- A `dist/assets/bastion-bst04-parts.webp`
- A `dist/assets/cicada-combat-left-motion-parts.webp`
- A `dist/assets/cicada-combat-left-parts.webp`
- A `dist/assets/cicada-combat-right-motion-parts.webp`
- A `dist/assets/cicada-combat-right-parts.webp`
- A `dist/assets/foundry-0-motion-parts.webp`
- A `dist/assets/foundry-1-motion-parts.webp`
- A `dist/assets/foundry-10-death-0-parts.webp`
- A `dist/assets/foundry-10-death-1-parts.webp`
- A `dist/assets/foundry-10-death-2-parts.webp`
- A `dist/assets/foundry-10-death-3-parts.webp`
- A `dist/assets/foundry-10-parts.webp`
- A `dist/assets/foundry-11-death-parts.webp`
- A `dist/assets/foundry-12-death-parts.webp`
- A `dist/assets/foundry-2-motion-parts.webp`
- A `dist/assets/foundry-3-motion-parts.webp`
- A `dist/assets/foundry-4-motion-parts.webp`
- A `dist/assets/foundry-5-motion-parts.webp`
- A `dist/assets/foundry-6-death-parts.webp`
- A `dist/assets/foundry-6-motion-parts.webp`
- A `dist/assets/foundry-6-unarmed-parts.webp`
- A `dist/assets/foundry-7-death-parts.webp`
- A `dist/assets/foundry-7-motion-parts.webp`
- A `dist/assets/foundry-7-unarmed-parts.webp`
- A `dist/assets/foundry-8-death-parts.webp`
- A `dist/assets/foundry-8-disarmed-parts.webp`
- A `dist/assets/foundry-8-left-down-parts.webp`
- A `dist/assets/foundry-8-motion-parts.webp`
- A `dist/assets/foundry-8-right-down-parts.webp`
- A `dist/assets/foundry-9-death-parts.webp`
- A `dist/assets/gatecrasher-bare-combat-left-motion-parts.webp`
- A `dist/assets/gatecrasher-bare-combat-left-parts.webp`
- A `dist/assets/gatecrasher-bare-combat-right-motion-parts.webp`
- A `dist/assets/gatecrasher-bare-combat-right-parts.webp`
- A `dist/assets/gatecrasher-cleaver-combat-left-motion-parts.webp`
- A `dist/assets/gatecrasher-cleaver-combat-left-parts.webp`
- A `dist/assets/gatecrasher-cleaver-combat-right-motion-parts.webp`
- A `dist/assets/gatecrasher-cleaver-combat-right-parts.webp`
- A `dist/assets/gatecrasher-combat-left-motion-parts.webp`
- A `dist/assets/gatecrasher-combat-left-parts.webp`
- A `dist/assets/gatecrasher-combat-right-motion-parts.webp`
- A `dist/assets/gatecrasher-combat-right-parts.webp`
- A `dist/assets/gatecrasher-r2-combat-left-motion-parts.webp`
- A `dist/assets/gatecrasher-r2-combat-left-parts.webp`
- A `dist/assets/gatecrasher-r2-combat-right-motion-parts.webp`
- A `dist/assets/gatecrasher-r2-combat-right-parts.webp`
- A `dist/assets/gatecrasher-vesper-combat-left-motion-parts.webp`
- A `dist/assets/gatecrasher-vesper-combat-left-parts.webp`
- A `dist/assets/gatecrasher-vesper-combat-right-motion-parts.webp`
- A `dist/assets/gatecrasher-vesper-combat-right-parts.webp`
- A `dist/assets/grid-travel-basilisk-parts.webp`
- A `dist/assets/grid-travel-cicada-parts.webp`
- A `dist/assets/grid-travel-foundry-0-parts.webp`
- A `dist/assets/grid-travel-foundry-1-parts.webp`
- A `dist/assets/grid-travel-foundry-2-parts.webp`
- A `dist/assets/grid-travel-foundry-3-parts.webp`
- A `dist/assets/grid-travel-foundry-4-parts.webp`
- A `dist/assets/grid-travel-foundry-5-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-0-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-1-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-2-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-3-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-0-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-1-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-2-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-3-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-0-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-1-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-2-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-3-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-0-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-1-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-2-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-3-parts.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-0-parts.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-1-parts.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-2-parts.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-3-parts.webp`
- A `dist/assets/grid-travel-hellbreaker-parts.webp`
- A `dist/assets/grid-travel-kestrel-parts.webp`
- A `dist/assets/grid-travel-warden-hands-parts.webp`
- A `dist/assets/grid-travel-warden-parts.webp`
- A `dist/assets/kestrel-chassis-left-attack-parts.webp`
- A `dist/assets/kestrel-chassis-left-motion-parts.webp`
- A `dist/assets/kestrel-chassis-left-parts.webp`
- A `dist/assets/kestrel-chassis-right-attack-parts.webp`
- A `dist/assets/kestrel-chassis-right-motion-parts.webp`
- A `dist/assets/kestrel-chassis-right-parts.webp`
- A `dist/assets/reaver-bare-parts.webp`
- A `dist/assets/reaver-dual-parts.webp`
- A `dist/assets/reaver-left-parts.webp`
- A `dist/assets/reaver-right-parts.webp`
- A `dist/assets/warden-chassis-left-attack-parts.webp`
- A `dist/assets/warden-chassis-left-motion-parts.webp`
- A `dist/assets/warden-chassis-left-parts.webp`
- A `dist/assets/warden-chassis-right-attack-parts.webp`
- A `dist/assets/warden-chassis-right-motion-parts.webp`
- A `dist/assets/warden-chassis-right-parts.webp`
- A `dist/assets/warden-hands-field-0-parts.webp`
- A `dist/assets/warden-hands-field-1-parts.webp`
- A `dist/assets/warden-hands-field-2-parts.webp`
- A `dist/assets/warden-hands-field-3-parts.webp`
- A `dist/assets/warden-hands-left-motion-parts.webp`
- A `dist/assets/warden-hands-left-parts.webp`
- A `dist/assets/warden-hands-left-strike-parts.webp`
- A `dist/assets/warden-hands-right-motion-parts.webp`
- A `dist/assets/warden-hands-right-parts.webp`
- A `dist/assets/warden-hands-right-strike-parts.webp`
- A `dist/assets/warden-hands-strike-0-parts.webp`
- A `dist/assets/warden-hands-strike-1-parts.webp`
- A `dist/assets/warden-hands-strike-2-parts.webp`
- A `dist/assets/warden-hands-strike-3-parts.webp`
- A `dist/assets/warden-rail-left-motion-parts.webp`
- A `dist/assets/warden-rail-left-parts.webp`
- A `dist/assets/warden-rail-right-motion-parts.webp`
- A `dist/assets/warden-rail-right-parts.webp`
- A `dist/assets/warden-rifle-left-motion-parts.webp`
- A `dist/assets/warden-rifle-left-parts.webp`
- A `dist/assets/warden-rifle-right-motion-parts.webp`
- A `dist/assets/warden-rifle-right-parts.webp`
- A `dist/chassis-part-masks.js`
- M `dist/foundry/baked.js`
- M `dist/game.js`
- M `dist/grid-travel-visuals.js`
- M `dist/index.html`
- M `qa/README.md`
- M `qa/browser/impact.cjs`
- A `qa/browser/part-masks.cjs`
- M `qa/check-browser.cjs`
- M `qa/check-upper-animation.cjs`
- M `qa/release-check.cjs`
- A `tools/authoring/blender_death_parts.py`
- A `tools/authoring/blender_part_pass.py`
- A `tools/authoring/pack_aegis_parts.py`
- A `tools/authoring/pack_extended_parts.py`
- A `tools/authoring/pack_part_pass.py`
- A `tools/bake_native_parts.py`
- A `tools/bake_warden_fidelity_parts.py`
- A `tools/blender_part_mask.py`
- A `tools/chassis-part-mask.cjs`
- A `tools/record_part_masks.py`
- M `tools/render_arsenal.py`
- A `tools/render_bastion_parts.cjs`
- M `tools/render_foundry.cjs`
- M `tools/render_travel.cjs`
- M `tools/render_warden.py`
- A `tools/replay_part_masks.py`
- A `tools/stock-part-map.cjs`

### `832fe093b2` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/assets/theater-tiles.webp`
- M `dist/game.js`
- M `dist/index.html`
- M `dist/style.css`
- M `dist/theater-layouts.js`
- M `qa/browser/gatecrasher-armed.cjs`
- A `qa/browser/terrain.cjs`
- M `qa/check-browser.cjs`
- A `qa/check-shield-depth.cjs`
- A `qa/check-terrain.cjs`
- M `qa/check-ui.cjs`
- A `qa/fixtures/terrain-sortie.json`
- M `qa/release-check.cjs`
- A `tools/authoring/build_theater_tiles.py`

### `5faec4ce99` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/index.html`
- M `dist/style.css`
- M `qa/browser/ashigaru.cjs`
- M `qa/browser/line-infantry.cjs`
- A `qa/browser/ridge-combat.cjs`
- M `qa/browser/terrain.cjs`
- M `qa/browser/warden.cjs`
- M `qa/check-browser.cjs`
- M `qa/check-line-infantry.cjs`
- M `qa/check-missions.cjs`
- A `qa/check-ridge-combat.cjs`
- M `qa/check-training.cjs`
- M `qa/check-ui.cjs`
- M `qa/check-upper-animation.cjs`

### `3b0da1480b` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/index.html`
- M `dist/style.css`
- A `qa/browser/move-preview.cjs`
- M `qa/browser/terrain.cjs`
- M `qa/browser/warden.cjs`
- M `qa/check-browser.cjs`

### `7fd5716307` 2026-11-09 · Karmi Nguyen
Export complete Iron Vow Sites project with local development entrypoint  
*main*
- M `AGENTS.md`
- M `README.md`
- A `docs/sites-export.json`
- A `package-lock.json`
- A `package.json`
- A `tools/dev-server.cjs`

### `551646f20d` 2026-11-09 · Karmi Nguyen · merge
Sync Iron Vow Sites v85 and refresh export provenance  
*main*

### `e1c6b389be` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/index.html`
- M `dist/style.css`
- M `qa/browser/move-preview.cjs`

### `901aa07021` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/game.js`
- M `dist/index.html`
- M `dist/style.css`
- M `qa/browser/aero.cjs`
- M `qa/browser/bulwark-combat.cjs`
- A `qa/browser/mech-computer.cjs`
- M `qa/browser/vanguard.cjs`
- M `qa/check-ashigaru.cjs`
- M `qa/check-browser.cjs`
- M `qa/check-bulwark.cjs`
- M `qa/check-foundry.cjs`
- A `qa/check-mech-computer.cjs`
- M `qa/check-reaver.cjs`
- M `qa/check-vanguard.cjs`
- A `qa/fixtures/mech-mastery.json`

### `4a430612e4` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/armory-visuals.js`
- A `dist/assets/armory-parallax-left.webp`
- A `dist/assets/armory-parallax-right.webp`
- A `dist/assets/armory-rivet-left.webp`
- A `dist/assets/armory-rivet-right.webp`
- M `dist/foundry/renderer.js`
- M `dist/game.js`
- M `dist/index.html`
- M `dist/rig-bench/expansion-weapons-manifest.json`
- M `dist/rig-bench/expansion-weapons.glb`
- M `qa/browser/armory.cjs`
- M `qa/check-arsenal.cjs`
- M `qa/check-weapon-expansion.cjs`
- M `tools/authoring/weapons/source/build_expansion.py`

### `2edb19d5a7` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/assets/lion-breaker-left.webp`
- A `dist/assets/lion-breaker-right.webp`
- A `dist/assets/lion-cleaver-left.webp`
- A `dist/assets/lion-cleaver-right.webp`
- A `dist/assets/lion-hatchet-left.webp`
- A `dist/assets/lion-hatchet-right.webp`
- M `dist/game.js`
- M `dist/index.html`
- A `dist/lion-art.js`
- M `dist/rig-bench/prototypes/index.html`
- M `dist/style.css`
- A `qa/browser/lion-trial.cjs`
- M `qa/check-browser.cjs`
- A `qa/check-lion-trial.cjs`
- A `qa/fixtures/lion-export.json`
- M `qa/release-check.cjs`
- M `qa/sim-harness.cjs`
- A `tools/bake_lion.py`

### `f3cd60ba68` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/assets/foundry-6-motion-paint.webp`
- M `dist/assets/foundry-6-motion-parts.webp`
- M `dist/assets/foundry-6-motion.webp`
- M `dist/assets/foundry-6-unarmed-paint.webp`
- M `dist/assets/foundry-6-unarmed-parts.webp`
- M `dist/assets/foundry-6-unarmed.webp`
- M `dist/assets/foundry-7-motion-paint.webp`
- M `dist/assets/foundry-7-motion-parts.webp`
- M `dist/assets/foundry-7-motion.webp`
- M `dist/assets/foundry-7-unarmed-paint.webp`
- M `dist/assets/foundry-7-unarmed-parts.webp`
- M `dist/assets/foundry-7-unarmed.webp`
- M `dist/assets/foundry-8-disarmed-parts.webp`
- M `dist/assets/foundry-8-disarmed.webp`
- M `dist/assets/foundry-8-left-down-parts.webp`
- M `dist/assets/foundry-8-left-down.webp`
- M `dist/assets/foundry-8-motion-parts.webp`
- M `dist/assets/foundry-8-motion.webp`
- M `dist/assets/foundry-8-right-down-parts.webp`
- M `dist/assets/foundry-8-right-down.webp`
- M `dist/foundry/baked.js`
- M `dist/foundry/vanguard-baked.js`
- M `dist/game.js`
- M `dist/index.html`
- A `qa/browser/infantry-carry.cjs`
- M `qa/browser/vanguard.cjs`
- M `qa/check-browser.cjs`
- A `tools/authoring/infantry_walk_grip.py`
- A `tools/authoring/pack_infantry_walk.py`
- M `tools/authoring/vanguard/bake.py`
- M `tools/authoring/vanguard/pack.py`

### `b9bf129613` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/assets/audio/cannon-report.wav`
- A `dist/assets/audio/credits.txt`
- A `dist/assets/audio/plate-strike.wav`
- A `dist/assets/audio/rail-report.wav`
- A `dist/assets/audio/rifle-report.wav`
- A `dist/assets/audio/rotary-report.wav`
- A `dist/assets/audio/shield-strike.wav`
- A `dist/assets/audio/shotgun-report.wav`
- M `dist/game.js`
- M `dist/index.html`
- M `qa/browser/volley.cjs`
- M `qa/check-arsenal.cjs`
- M `qa/check-burst-salvage.cjs`
- M `qa/check-combat-audio.cjs`
- M `qa/check-tactical.cjs`
- M `qa/release-check.cjs`
- A `tools/render_ballistic_audio.py`

### `cf1288eee5` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/armory-visuals.js`
- A `dist/assets/armory-parallax-left-charge.webp`
- A `dist/assets/armory-parallax-left-charged.webp`
- A `dist/assets/armory-parallax-left-kick.webp`
- M `dist/assets/armory-parallax-left.webp`
- A `dist/assets/armory-parallax-right-charge.webp`
- A `dist/assets/armory-parallax-right-charged.webp`
- A `dist/assets/armory-parallax-right-kick.webp`
- M `dist/assets/armory-parallax-right.webp`
- A `dist/assets/armory-rivet-left-feed.webp`
- A `dist/assets/armory-rivet-left-kick.webp`
- M `dist/assets/armory-rivet-left.webp`
- A `dist/assets/armory-rivet-right-feed.webp`
- A `dist/assets/armory-rivet-right-kick.webp`
- M `dist/assets/armory-rivet-right.webp`
- M `dist/foundry/production-arsenal.js`
- M `dist/foundry/renderer.js`
- M `dist/game.js`
- M `dist/index.html`
- M `dist/rig-bench/expansion-weapons-manifest.json`
- M `dist/rig-bench/expansion-weapons.glb`
- M `qa/browser/armory.cjs`
- M `tools/authoring/weapons/source/build_expansion.py`

### `b350b5dcc3` 2026-11-09 · karmiphuc
Update Site source  
*main*
- A `dist/assets/aegis-walk-d0-disarmed-parts.webp`
- A `dist/assets/aegis-walk-d0-disarmed.webp`
- A `dist/assets/aegis-walk-d0-full-parts.webp`
- A `dist/assets/aegis-walk-d0-full.webp`
- A `dist/assets/aegis-walk-d0-left-down-parts.webp`
- A `dist/assets/aegis-walk-d0-left-down.webp`
- A `dist/assets/aegis-walk-d0-right-down-parts.webp`
- A `dist/assets/aegis-walk-d0-right-down.webp`
- A `dist/assets/aegis-walk-d1-disarmed-parts.webp`
- A `dist/assets/aegis-walk-d1-disarmed.webp`
- A `dist/assets/aegis-walk-d1-full-parts.webp`
- A `dist/assets/aegis-walk-d1-full.webp`
- A `dist/assets/aegis-walk-d1-left-down-parts.webp`
- A `dist/assets/aegis-walk-d1-left-down.webp`
- A `dist/assets/aegis-walk-d1-right-down-parts.webp`
- A `dist/assets/aegis-walk-d1-right-down.webp`
- A `dist/assets/aegis-walk-d2-disarmed-parts.webp`
- A `dist/assets/aegis-walk-d2-disarmed.webp`
- A `dist/assets/aegis-walk-d2-full-parts.webp`
- A `dist/assets/aegis-walk-d2-full.webp`
- A `dist/assets/aegis-walk-d2-left-down-parts.webp`
- A `dist/assets/aegis-walk-d2-left-down.webp`
- A `dist/assets/aegis-walk-d2-right-down-parts.webp`
- A `dist/assets/aegis-walk-d2-right-down.webp`
- A `dist/assets/aegis-walk-d3-disarmed-parts.webp`
- A `dist/assets/aegis-walk-d3-disarmed.webp`
- A `dist/assets/aegis-walk-d3-full-parts.webp`
- A `dist/assets/aegis-walk-d3-full.webp`
- A `dist/assets/aegis-walk-d3-left-down-parts.webp`
- A `dist/assets/aegis-walk-d3-left-down.webp`
- A `dist/assets/aegis-walk-d3-right-down-parts.webp`
- A `dist/assets/aegis-walk-d3-right-down.webp`
- A `dist/assets/aero-walk-parts.webp`
- A `dist/assets/aero-walk.webp`
- A `dist/assets/foundry-6-walk-paint.webp`
- A `dist/assets/foundry-6-walk-parts.webp`
- A `dist/assets/foundry-6-walk-unarmed-paint.webp`
- A `dist/assets/foundry-6-walk-unarmed-parts.webp`
- A `dist/assets/foundry-6-walk-unarmed.webp`
- A `dist/assets/foundry-6-walk.webp`
- A `dist/assets/foundry-7-walk-paint.webp`
- A `dist/assets/foundry-7-walk-parts.webp`
- A `dist/assets/foundry-7-walk-unarmed-paint.webp`
- A `dist/assets/foundry-7-walk-unarmed-parts.webp`
- A `dist/assets/foundry-7-walk-unarmed.webp`
- A `dist/assets/foundry-7-walk.webp`
- A `dist/assets/foundry-8-walk-disarmed-parts.webp`
- A `dist/assets/foundry-8-walk-disarmed.webp`
- A `dist/assets/foundry-8-walk-full-parts.webp`
- A `dist/assets/foundry-8-walk-full.webp`
- A `dist/assets/foundry-8-walk-left-down-parts.webp`
- A `dist/assets/foundry-8-walk-left-down.webp`
- A `dist/assets/foundry-8-walk-right-down-parts.webp`
- A `dist/assets/foundry-8-walk-right-down.webp`
- A `dist/assets/reaver-walk-bare-parts.webp`
- A `dist/assets/reaver-walk-bare.webp`
- A `dist/assets/reaver-walk-dual-parts.webp`
- A `dist/assets/reaver-walk-dual.webp`
- A `dist/assets/reaver-walk-left-parts.webp`
- A `dist/assets/reaver-walk-left.webp`
- A `dist/assets/reaver-walk-right-parts.webp`
- A `dist/assets/reaver-walk-right.webp`
- M `dist/foundry/bastion.js`
- M `dist/foundry/renderer.js`
- M `dist/foundry/rig-motion.js`
- A `dist/foundry/walk.js`
- M `dist/game.js`
- M `dist/index.html`
- M `qa/browser/ashigaru.cjs`
- A `qa/browser/paired-walk.cjs`
- M `qa/check-browser.cjs`
- M `qa/release-check.cjs`
- M `tools/authoring/infantry_walk_grip.py`
- A `tools/authoring/pack_walk_cycles.py`
- M `tools/authoring/vanguard/bake.py`

### `48e960d266` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/assets/audio/credits.txt`
- A `dist/assets/audio/mech-arm.wav`
- A `dist/assets/audio/mech-boot.wav`
- A `dist/assets/audio/mech-foot-a.wav`
- A `dist/assets/audio/mech-foot-b.wav`
- A `dist/assets/audio/mech-foot-heavy.wav`
- A `dist/assets/audio/mech-idle.wav`
- A `dist/assets/audio/mech-servo.wav`
- A `dist/assets/audio/mech-vent.wav`
- M `dist/game.js`
- M `dist/index.html`
- M `qa/browser/paired-walk.cjs`
- M `qa/check-combat-audio.cjs`
- A `tools/render_machinery_audio.py`

### `3ddba1c6e4` 2026-11-09 · karmiphuc
Update Site source  
*main*
- M `dist/armory-visuals.js`
- M `dist/assets/armory-parallax-left-charge.webp`
- M `dist/assets/armory-parallax-left-charged.webp`
- M `dist/assets/armory-parallax-left-kick.webp`
- M `dist/assets/armory-parallax-left.webp`
- M `dist/assets/armory-parallax-right-charge.webp`
- M `dist/assets/armory-parallax-right-charged.webp`
- M `dist/assets/armory-parallax-right-kick.webp`
- M `dist/assets/armory-parallax-right.webp`
- M `dist/assets/armory-rivet-left-feed.webp`
- M `dist/assets/armory-rivet-left-kick.webp`
- M `dist/assets/armory-rivet-left.webp`
- M `dist/assets/armory-rivet-right-feed.webp`
- M `dist/assets/armory-rivet-right-kick.webp`
- M `dist/assets/armory-rivet-right.webp`
- M `dist/foundry/bastion.js`
- M `dist/foundry/production-arsenal.js`
- M `dist/foundry/renderer.js`
- M `dist/index.html`
- M `dist/rig-bench/expansion-weapons-manifest.json`
- M `dist/rig-bench/expansion-weapons.glb`
- M `qa/browser/armory.cjs`
- M `tools/authoring/weapons/source/build_expansion.py`

### `9eecddafac` 2026-11-10 · karmiphuc
Update Site source  
*main*
- M `dist/assets/audio/credits.txt`
- M `dist/assets/audio/mech-boot.wav`
- M `dist/game.js`
- M `dist/index.html`
- M `qa/check-combat-audio.cjs`
- M `tools/render_machinery_audio.py`

### `82f22a5f10` 2026-11-10 · karmiphuc
Update Site source  
*main*
- M `dist/rig-bench/prototypes/bay.js`
- M `dist/rig-bench/prototypes/bulwark.glb`
- M `dist/rig-bench/prototypes/cicada.glb`
- M `dist/rig-bench/prototypes/hellbreaker.glb`
- M `dist/rig-bench/prototypes/index.html`
- M `dist/rig-bench/prototypes/scout.glb`
- A `dist/rig-bench/vendor/meshopt-decoder-LICENSE.md`
- A `dist/rig-bench/vendor/meshopt-decoder.js`
- M `qa/browser/scout-bench.cjs`

### `b297e89a75` 2026-11-10 · Claude
Fix Foundry leg IK, Behemoth kneel fold and Oni blade strike  
*main*
- M `dist/foundry/chassis.js`
- M `dist/foundry/rig-motion.js`
- A `qa/check-foundry-motion.cjs`

### `5962dc650b` 2026-11-10 · Claude
Oni: forward stance, two-hand rifle carry and randomised ready guards  
*main*
- M `dist/foundry/chassis.js`
- M `dist/foundry/renderer.js`
- M `dist/foundry/rig-motion.js`
- M `qa/check-foundry-motion.cjs`

### `53c0fc7113` 2026-11-10 · Claude
Oni: clear gun-up guard and a left-foot firing stance for the free hand  
*main*
- M `dist/foundry/chassis.js`
- M `dist/foundry/renderer.js`
- M `dist/foundry/rig-motion.js`
- M `qa/check-foundry-motion.cjs`

### `4e58de6d5e` 2026-11-10 · Karmi Nguyen · merge
Sync Iron Vow Sites v86 through v97  
*main*

### `17497b6f9a` 2026-11-10 · Claude
Live Warden: re-rig the painted Warden onto the Foundry skeleton for combat  
*main*
- M `dist/foundry/renderer.js`
- M `dist/foundry/rig-motion.js`
- A `dist/foundry/warden-live.js`
- M `dist/game.js`
- M `dist/index.html`
- M `qa/browser/warden-melee.cjs`
- M `qa/browser/warden.cjs`
- A `qa/check-live-warden.cjs`

### `faba4de408` 2026-11-10 · Claude
Fix Foundry leg IK, Behemoth kneel fold and Oni blade strike  
*main*
- M `dist/foundry/chassis.js`
- M `dist/foundry/rig-motion.js`
- A `qa/check-foundry-motion.cjs`

### `a1761c2081` 2026-11-10 · Claude
Oni: forward stance, two-hand rifle carry and randomised ready guards  
*main*
- M `dist/foundry/chassis.js`
- M `dist/foundry/renderer.js`
- M `dist/foundry/rig-motion.js`
- M `qa/check-foundry-motion.cjs`

### `05850484a0` 2026-11-10 · Claude
Oni: clear gun-up guard and a left-foot firing stance for the free hand  
*main*
- M `dist/foundry/chassis.js`
- M `dist/foundry/renderer.js`
- M `dist/foundry/rig-motion.js`
- M `qa/check-foundry-motion.cjs`

### `44fe5f12b7` 2026-11-10 · Claude
Live Warden: re-rig the painted Warden onto the Foundry skeleton for combat  
*main*
- M `dist/foundry/renderer.js`
- M `dist/foundry/rig-motion.js`
- A `dist/foundry/warden-live.js`
- M `dist/game.js`
- M `dist/index.html`
- M `qa/browser/warden-melee.cjs`
- M `qa/browser/warden.cjs`
- A `qa/check-live-warden.cjs`

### `f73e05248b` 2026-11-10 · Karmi Nguyen · merge
Merge main v97 into Foundry motion fixes  
*main*

### `609d15ae93` 2026-11-10 · Karmi Phuc · merge
Merge pull request #1 from karmiphuc/fix/oni-behemoth-rigs  
*main*

### `3219a9ed5d` 2026-11-10 · Claude · merge
Merge main (PR #1 merged) into live Warden branch  
*main*

### `f85a327666` 2026-11-10 · Karmi Nguyen · merge
Merge main into live Warden and fix startup and Jumpjet rendering  
*main*

### `240af77be8` 2026-11-10 · Karmi Phuc · merge
Merge pull request #2 from karmiphuc/feat/live-warden  
*main*

### `ba88e173ed` 2026-11-10 · Karmi Nguyen · merge
Integrate merged live Warden while preserving tested fixes  
*main*

### `853f1e7510` 2026-11-10 · Karmi Nguyen
Port filterless canvas rendering and repair live rig regressions  
*main*
- M `README.md`
- M `dist/assets/foundry-0-back-fit-paint.webp`
- M `dist/assets/foundry-0-back-fit.webp`
- M `dist/assets/foundry-0-back.webp`
- M `dist/assets/foundry-0-fit-paint.webp`
- M `dist/assets/foundry-0-fit.webp`
- M `dist/assets/foundry-0-front.webp`
- M `dist/assets/foundry-0-hip.webp`
- M `dist/assets/foundry-0-motion-paint.webp`
- M `dist/assets/foundry-0-motion-parts.webp`
- M `dist/assets/foundry-0-motion.webp`
- M `dist/assets/foundry-0-other-side-fit-paint.webp`
- M `dist/assets/foundry-0-other-side-fit.webp`
- M `dist/assets/foundry-0-other-side.webp`
- M `dist/assets/foundry-0-side-fit-paint.webp`
- M `dist/assets/foundry-0-side-fit.webp`
- M `dist/assets/foundry-0-side.webp`
- M `dist/assets/foundry-0.webp`
- M `dist/assets/foundry-1-back-fit-paint.webp`
- M `dist/assets/foundry-1-back-fit.webp`
- M `dist/assets/foundry-1-back.webp`
- M `dist/assets/foundry-1-fit-paint.webp`
- M `dist/assets/foundry-1-fit.webp`
- M `dist/assets/foundry-1-front.webp`
- M `dist/assets/foundry-1-hip.webp`
- M `dist/assets/foundry-1-motion-paint.webp`
- M `dist/assets/foundry-1-motion-parts.webp`
- M `dist/assets/foundry-1-motion.webp`
- M `dist/assets/foundry-1-other-side-fit-paint.webp`
- M `dist/assets/foundry-1-other-side-fit.webp`
- M `dist/assets/foundry-1-other-side.webp`
- M `dist/assets/foundry-1-side-fit-paint.webp`
- M `dist/assets/foundry-1-side-fit.webp`
- M `dist/assets/foundry-1-side.webp`
- M `dist/assets/foundry-1.webp`
- M `dist/assets/foundry-2-back-fit-paint.webp`
- M `dist/assets/foundry-2-back-fit.webp`
- M `dist/assets/foundry-2-back.webp`
- M `dist/assets/foundry-2-fit-paint.webp`
- M `dist/assets/foundry-2-fit.webp`
- M `dist/assets/foundry-2-front.webp`
- M `dist/assets/foundry-2-hip.webp`
- M `dist/assets/foundry-2-motion-paint.webp`
- M `dist/assets/foundry-2-motion-parts.webp`
- M `dist/assets/foundry-2-motion.webp`
- M `dist/assets/foundry-2-other-side-fit-paint.webp`
- M `dist/assets/foundry-2-other-side-fit.webp`
- M `dist/assets/foundry-2-other-side.webp`
- M `dist/assets/foundry-2-side-fit-paint.webp`
- M `dist/assets/foundry-2-side-fit.webp`
- M `dist/assets/foundry-2-side.webp`
- M `dist/assets/foundry-2.webp`
- M `dist/assets/foundry-3-back-fit-paint.webp`
- M `dist/assets/foundry-3-back-fit.webp`
- M `dist/assets/foundry-3-back.webp`
- M `dist/assets/foundry-3-fit-paint.webp`
- M `dist/assets/foundry-3-fit.webp`
- M `dist/assets/foundry-3-front.webp`
- M `dist/assets/foundry-3-hip.webp`
- M `dist/assets/foundry-3-motion-paint.webp`
- M `dist/assets/foundry-3-motion-parts.webp`
- M `dist/assets/foundry-3-motion.webp`
- M `dist/assets/foundry-3-other-side-fit-paint.webp`
- M `dist/assets/foundry-3-other-side-fit.webp`
- M `dist/assets/foundry-3-other-side.webp`
- M `dist/assets/foundry-3-side-fit-paint.webp`
- M `dist/assets/foundry-3-side-fit.webp`
- M `dist/assets/foundry-3-side.webp`
- M `dist/assets/foundry-3.webp`
- M `dist/assets/foundry-4-back-fit-paint.webp`
- M `dist/assets/foundry-4-back-fit.webp`
- M `dist/assets/foundry-4-back.webp`
- M `dist/assets/foundry-4-fit-paint.webp`
- M `dist/assets/foundry-4-fit.webp`
- M `dist/assets/foundry-4-front.webp`
- M `dist/assets/foundry-4-hip.webp`
- M `dist/assets/foundry-4-motion-paint.webp`
- M `dist/assets/foundry-4-motion-parts.webp`
- M `dist/assets/foundry-4-motion.webp`
- M `dist/assets/foundry-4-other-side-fit-paint.webp`
- M `dist/assets/foundry-4-other-side-fit.webp`
- M `dist/assets/foundry-4-other-side.webp`
- M `dist/assets/foundry-4-side-fit-paint.webp`
- M `dist/assets/foundry-4-side-fit.webp`
- M `dist/assets/foundry-4-side.webp`
- M `dist/assets/foundry-4.webp`
- M `dist/assets/foundry-5-back-fit-paint.webp`
- M `dist/assets/foundry-5-back-fit.webp`
- M `dist/assets/foundry-5-back.webp`
- M `dist/assets/foundry-5-fit-paint.webp`
- M `dist/assets/foundry-5-fit.webp`
- M `dist/assets/foundry-5-front.webp`
- M `dist/assets/foundry-5-hip.webp`
- M `dist/assets/foundry-5-motion-paint.webp`
- M `dist/assets/foundry-5-motion-parts.webp`
- M `dist/assets/foundry-5-motion.webp`
- M `dist/assets/foundry-5-other-side-fit-paint.webp`
- M `dist/assets/foundry-5-other-side-fit.webp`
- M `dist/assets/foundry-5-other-side.webp`
- M `dist/assets/foundry-5-side-fit-paint.webp`
- M `dist/assets/foundry-5-side-fit.webp`
- M `dist/assets/foundry-5-side.webp`
- M `dist/assets/foundry-5.webp`
- M `dist/assets/foundry-modular.webp`
- M `dist/assets/grid-travel-foundry-0-paint.webp`
- M `dist/assets/grid-travel-foundry-0-parts.webp`
- M `dist/assets/grid-travel-foundry-0.webp`
- M `dist/assets/grid-travel-foundry-1-paint.webp`
- M `dist/assets/grid-travel-foundry-1-parts.webp`
- M `dist/assets/grid-travel-foundry-1.webp`
- M `dist/assets/grid-travel-foundry-2-paint.webp`
- M `dist/assets/grid-travel-foundry-2-parts.webp`
- M `dist/assets/grid-travel-foundry-2.webp`
- M `dist/assets/grid-travel-foundry-3-paint.webp`
- M `dist/assets/grid-travel-foundry-3-parts.webp`
- M `dist/assets/grid-travel-foundry-3.webp`
- M `dist/assets/grid-travel-foundry-4-paint.webp`
- M `dist/assets/grid-travel-foundry-4-parts.webp`
- M `dist/assets/grid-travel-foundry-4.webp`
- M `dist/assets/grid-travel-foundry-5-paint.webp`
- M `dist/assets/grid-travel-foundry-5-parts.webp`
- M `dist/assets/grid-travel-foundry-5.webp`
- M `dist/foundry/baked.js`
- M `dist/foundry/chassis.js`
- M `dist/foundry/renderer.js`
- M `dist/foundry/warden-live.js`
- M `dist/game.js`
- M `dist/grid-travel-visuals.js`
- M `dist/index.html`
- A `docs/canvas-rendering-reference.json`
- M `qa/README.md`
- A `qa/browser/canvas-toning.cjs`
- A `qa/browser/live-warden.cjs`
- M `qa/check-browser.cjs`
- A `qa/check-canvas-toning.cjs`
- A `qa/check-live-warden-runtime.cjs`
- M `qa/check-live-warden.cjs`
- M `tools/render_foundry.cjs`
- M `tools/render_travel.cjs`

### `5e382555db` 2026-11-10 · Karmi Nguyen
Record published Sites v98 source provenance  
*main*
- M `README.md`
- M `docs/sites-export.json`
- M `qa/README.md`

### `f264567f01` 2026-11-10 · Karmi Nguyen
Record v98 local and live release verification  
*main*
- M `README.md`
- A `docs/release-verification.json`
- M `qa/README.md`

### `1ca48d7f8e` 2026-11-11 · Karmi Phuc
feat(vfx): add deterministic directional sparks and electrical arcs  
*unmerged: feat/pixelfx-impact-electrical-collapse, sites/iron-vow-candidate, sites/iron-vow-next*
- A `dist/pixelfx-vfx.js`

### `62a8348f95` 2026-11-11 · Karmi Phuc
feat(vfx): attach directional impacts and rig-anchored electrical failures  
*unmerged: feat/pixelfx-impact-electrical-collapse, sites/iron-vow-candidate, sites/iron-vow-next*
- M `dist/game.js`

### `9c262b8f8d` 2026-11-11 · Karmi Phuc
feat(vfx): load procedural effects before main combat runtime  
*unmerged: feat/pixelfx-impact-electrical-collapse, sites/iron-vow-candidate, sites/iron-vow-next*
- M `dist/index.html`

### `70373ec465` 2026-11-11 · Karmi Phuc
test(vfx): load impact module in simulation harness  
*unmerged: feat/pixelfx-impact-electrical-collapse, sites/iron-vow-candidate, sites/iron-vow-next*
- M `qa/sim-harness.cjs`

### `fd3c4f1a9d` 2026-11-11 · Karmi Phuc
test(vfx): add deterministic effect and combat integration checks  
*unmerged: feat/pixelfx-impact-electrical-collapse, sites/iron-vow-candidate, sites/iron-vow-next*
- A `qa/check-pixelfx.cjs`

### `94a1ab1bc2` 2026-11-11 · Karmi Phuc
fix(vfx): match arc re-jitter cadence to 45 ms pulses  
*unmerged: feat/pixelfx-impact-electrical-collapse, sites/iron-vow-candidate, sites/iron-vow-next*
- M `dist/pixelfx-vfx.js`

### `3f4d182279` 2026-11-11 · Karmi Phuc
perf(vfx): cap particle count by CSS viewport width on Retina phones  
*unmerged: feat/pixelfx-impact-electrical-collapse, sites/iron-vow-candidate, sites/iron-vow-next*
- M `dist/pixelfx-vfx.js`

### `06a0b33418` 2026-11-11 · Claude
Add Claude reference builds for the single-scene 3D renderer rebuild  
*main*
- A `docs/reference/claude/README.md`
- A `docs/reference/claude/mercenary-command.html`
- A `docs/reference/claude/rig-bench.html`

### `2034d9b66e` 2026-11-11 · Karmi Phuc · merge
Merge pull request #5 from karmiphuc/claude/reference-3d-builds  
*main*

### `ea807cd650` 2026-11-10 · Karmi Nguyen
Fix VFX contact-flash boundary assertion  
*unmerged: feat/pixelfx-impact-electrical-collapse, sites/iron-vow-candidate, sites/iron-vow-next*
- M `qa/check-pixelfx.cjs`

### `3ef14a32a0` 2026-11-10 · Karmi Nguyen
Prepare renderer Phase 0 capture matrix, perf overlay and source inventory  
*main*
- A `design/baseline/README.md`
- M `dist/foundry/renderer.js`
- M `dist/game.js`
- M `dist/index.html`
- A `dist/performance.js`
- A `docs/renderer-inventory.json`
- A `docs/renderer-inventory.md`
- M `qa/README.md`
- A `qa/capture-presets.cjs`
- A `qa/capture.cjs`
- A `qa/check-capture-presets.cjs`
- A `qa/check-performance.cjs`
- A `qa/renderer-inventory.cjs`

### `067e1ba8a3` 2026-11-10 · Karmi Nguyen · merge
Merge remote-tracking branch 'origin/feat/pixelfx-impact-electrical-collapse' into sites/iron-vow-candidate  
*unmerged: sites/iron-vow-candidate, sites/iron-vow-next*

### `75901a03c1` 2026-11-10 · Karmi Nguyen · merge
Merge remote-tracking branch 'origin/renderer/phase0' into sites/iron-vow-candidate  
*unmerged: sites/iron-vow-candidate, sites/iron-vow-next*

### `a593ebedb1` 2026-11-10 · Karmi Nguyen
Record combined Sites source candidate and validation limits  
*unmerged: sites/iron-vow-candidate, sites/iron-vow-next*
- A `docs/sites-candidate.md`

### `1016691baa` 2026-11-11 · Karmi Nguyen
Poll image readiness with timers while capture animation frames are frozen  
*main*
- M `qa/capture.cjs`

### `1ed26a2941` 2026-11-11 · Karmi Nguyen
Wait for explicit capture assets instead of frozen-frame network-idle events  
*main*
- M `qa/capture.cjs`

### `ec1f4bfc8f` 2026-11-11 · Karmi Nguyen
Complete reference capture adapters and seeded impact screenshots  
*main*
- M `qa/capture.cjs`

### `91bdc0b69e` 2026-11-11 · Karmi Nguyen
Scroll paint controls into the fixed capture viewport  
*main*
- M `qa/capture-presets.cjs`
- M `qa/capture.cjs`

### `2144ff0330` 2026-11-11 · Karmi Nguyen
Record owner approval for local Playwright screenshots  
*main*
- M `AGENTS.md`

### `16072a97bb` 2026-11-11 · Karmi Nguyen
Read current bench identity directly after chassis swaps  
*main*
- M `qa/browser/bulwark-bench.cjs`

### `b5a44f0bca` 2026-11-11 · Claude
Add 3D directional impacts and electrical faults to the Rig Bench reference  
*main*
- M `docs/reference/claude/README.md`
- M `docs/reference/claude/rig-bench.html`

### `015a99e3bd` 2026-11-11 · Karmi Nguyen
Use current-document identity reads for scout chassis swaps  
*main*
- M `qa/browser/scout-bench.cjs`

### `9950787fec` 2026-11-11 · Karmi Nguyen · merge
Merge remote-tracking branch 'origin/renderer/phase0' into sites/iron-vow-candidate  
*unmerged: sites/iron-vow-candidate, sites/iron-vow-next*

### `f8a7b853ad` 2026-11-11 · Karmi Nguyen
Drive attack exchange camera checks frame by frame in Playwright  
*main*
- M `qa/browser/attack-exchange.cjs`

### `7cb066a58c` 2026-11-11 · Karmi Nguyen · merge
Merge branch 'renderer/phase0' into sites/iron-vow-candidate  
*unmerged: sites/iron-vow-candidate, sites/iron-vow-next*

### `14bae356d5` 2026-11-11 · Karmi Nguyen
Replace stale browser blocker with owner approval and capture status  
*main*
- M `design/baseline/README.md`

### `c2fdf7591d` 2026-11-11 · Claude
Replace halo-like ground rings with dust walls and soft shockwaves  
*main*
- M `docs/reference/claude/README.md`
- M `docs/reference/claude/rig-bench.html`

### `4ff775ce4b` 2026-11-11 · Karmi Nguyen
Use matching Playwright browser for approved screenshot captures  
*main*
- M `qa/capture.cjs`

### `016d68cd97` 2026-11-11 · Karmi Nguyen
Record approved local Playwright screenshot evidence with source hashes  
*main*
- M `design/baseline/README.md`
- (15 evidence files under design/)

### `5abf889828` 2026-11-11 · Claude
Use one dust wall and a translucent air shockwave for ground impacts  
*main*
- M `docs/reference/claude/README.md`
- M `docs/reference/claude/rig-bench.html`

### `1a3dd8dbd3` 2026-11-11 · Karmi Nguyen · merge
Merge branch 'renderer/phase0' into sites/iron-vow-next  
*unmerged: sites/iron-vow-next*

### `7eb9a76661` 2026-11-11 · Karmi Nguyen
Withdraw superseded PR 4 from the unpublished Sites candidate  
*unmerged: sites/iron-vow-next*
- M `dist/game.js`
- M `dist/index.html`
- D `dist/pixelfx-vfx.js`
- M `docs/sites-candidate.md`
- D `qa/check-pixelfx.cjs`
- M `qa/sim-harness.cjs`

### `3a01fe1d0f` 2026-11-11 · Karmi Nguyen
Fix missing missile impact hook and verify 3D reference effects  
*main*
- M `docs/reference/claude/README.md`
- M `docs/reference/claude/rig-bench.html`
- A `qa/reference-vfx.cjs`
- (22 evidence files under design/)

### `2e795ef74a` 2026-11-11 · Karmi Nguyen
Require a baseline for seeded comparison verification  
*main*
- M `qa/reference-vfx.cjs`

### `973567c572` 2026-11-11 · Karmi Phuc · merge
Merge pull request #8 from karmiphuc/claude/impact-arcs-3d  
*main*

### `c0a1c61710` 2026-11-11 · Karmi Nguyen
Warm lazy hit masks before fixed-clock combat captures  
*main*
- M `qa/README.md`
- M `qa/capture.cjs`

### `cd7c16d56b` 2026-11-11 · Karmi Nguyen · merge
Merge remote-tracking branch 'origin/main' into sites/iron-vow-next  
*unmerged: sites/iron-vow-next*

### `77455b6af6` 2026-11-11 · Karmi Nguyen · merge
Merge remote-tracking branch 'origin/main' into renderer/phase0  
*main*

### `cdf6ce62e2` 2026-11-11 · Karmi Nguyen
Record delayed part-mask capture regression proof  
*main*
- (8 evidence files under design/)

### `d539a46f24` 2026-11-11 · Karmi Nguyen
Record verified post-withdrawal candidate and merged PR 8  
*unmerged: sites/iron-vow-next*
- M `docs/sites-candidate.md`

### `e45e8cd503` 2026-11-11 · Karmi Nguyen · merge
Merge branch 'renderer/phase0' into sites/iron-vow-next  
*unmerged: sites/iron-vow-next*

### `6139d6dd0c` 2026-11-11 · Karmi Nguyen
Audit exact rig contract bones, materials, part tags and clips per GLB  
*main*
- M `docs/renderer-inventory.json`
- M `docs/renderer-inventory.md`
- M `qa/renderer-inventory.cjs`

### `137348b21a` 2026-11-11 · Karmi Nguyen
Capture advancing-clock action filmstrips from real game and reference paths  
*main*
- A `qa/capture-motion.cjs`

### `093a3c2315` 2026-11-11 · Karmi Nguyen
Frame damage, wrecks and separate paint channels for baseline review  
*main*
- M `qa/capture-presets.cjs`
- M `qa/capture.cjs`
- M `qa/check-capture-presets.cjs`

### `537b4ad812` 2026-11-11 · Karmi Nguyen
Render newly decoded destruction art at the advanced capture time  
*main*
- M `qa/capture.cjs`

### `ca95a0b24e` 2026-11-11 · Karmi Nguyen
Keep wrecks and destruction targets clear of cover and the attacker  
*main*
- M `qa/capture-motion.cjs`
- M `qa/capture-presets.cjs`

### `fac45d1cd6` 2026-11-11 · Karmi Nguyen
Support focused reruns of paint and damage review presets  
*main*
- M `qa/capture.cjs`

### `76230a71a4` 2026-11-11 · Karmi Nguyen
Match reference theaters by contract name  
*main*
- M `qa/capture.cjs`

### `ea7fd0ce7a` 2026-11-11 · Karmi Nguyen
Wait on live image references and retry interrupted captures once  
*main*
- M `qa/capture.cjs`

### `cabb03dd2a` 2026-11-11 · Karmi Nguyen
Capture reference hit reactions through real War damage handling  
*main*
- M `qa/capture-motion.cjs`

### `99e9a7b90d` 2026-11-11 · Claude
Fix effects review findings and make arcs clearly blue  
*main*
- M `docs/reference/claude/README.md`
- M `docs/reference/claude/rig-bench.html`

### `f8be66c542` 2026-11-11 · Karmi Nguyen
Hold a stable close camera for the reference hit filmstrip  
*main*
- M `qa/capture-motion.cjs`

### `b8336a3e34` 2026-11-11 · Karmi Nguyen
Resume verified captures and render reference fast-forward only at its final frame  
*main*
- M `qa/capture.cjs`

### `96b4629216` 2026-11-11 · Karmi Nguyen
Record PNG hashes and validate source before starting resumed browsers  
*main*
- M `qa/capture.cjs`

### `8c6c422495` 2026-11-11 · Karmi Phuc
docs: record capture coverage and interrupted evidence handoff  
*main*
- M `design/baseline/README.md`

### `3c4081095c` 2026-11-11 · Karmi Nguyen
Checkpoint each capture and verify resumed image hashes  
*main*
- M `qa/capture.cjs`

### `9875a9443c` 2026-11-11 · Karmi Nguyen
Add a real-browser capture interruption and resume proof  
*main*
- A `qa/capture-recovery.cjs`

### `8d47f55b07` 2026-11-11 · Karmi Nguyen
Test blue arc visibility and opaque-cover occlusion with rendered pixels  
*main*
- M `qa/reference-vfx.cjs`

### `03b2fa0ec5` 2026-11-11 · Claude
Record PR #9 reference VFX evidence  
*main*
- A `design/reference-vfx/pr9/README.md`
- (4 evidence files under design/)

### `13ab99b9cc` 2026-11-11 · Karmi Nguyen
Preserve reproducible baseline assembly and raw interrupted attempts  
*main*
- A `qa/assemble-baseline.py`

### `81113a835c` 2026-11-11 · Karmi Nguyen
Prevent steep arc faces from leaking through cover under polygon offset  
*main*
- M `docs/reference/claude/README.md`
- M `docs/reference/claude/rig-bench.html`
- M `qa/reference-vfx.cjs`

### `492c1cd0e8` 2026-11-11 · Karmi Nguyen
Reject blank or lost WebGL Rig Bench captures  
*main*
- A `qa/capture-blank.cjs`
- M `qa/capture.cjs`

### `d52c4f5494` 2026-11-11 · Karmi Nguyen
Observe the existing WebGL context without requesting another context type  
*main*
- M `qa/capture.cjs`

### `b7b3404670` 2026-11-11 · Karmi Nguyen
Commit failed and corrected arc captures with full seeded comparison  
*main*
- A `design/reference-vfx/pr9/README.md`
- (50 evidence files under design/)

### `3e988d942e` 2026-11-11 · Karmi Nguyen
Replace the invalid historical bench row with checked WebGL captures  
*main*
- M `qa/assemble-baseline.py`

### `621af5258e` 2026-11-11 · Karmi Nguyen
Keep independent arc regression evidence separate from concurrent author captures  
*main*
- A `design/reference-vfx/pr9-independent/README.md`
- D `design/reference-vfx/pr9/README.md`
- (100 evidence files under design/)

### `b24587a9f2` 2026-11-11 · Karmi Nguyen · merge
Merge remote-tracking branch 'origin/claude/effects-review-fixes' into review/pr9  
*main*

### `a9c8f750ff` 2026-11-11 · Karmi Nguyen
Reuse only pixel-identical archive images and retain checked bench overrides  
*main*
- M `qa/assemble-baseline.py`

### `71bac94348` 2026-11-11 · Karmi Nguyen
Link author evidence to the subsequent independent occlusion correction  
*main*
- M `design/reference-vfx/pr9/README.md`

### `d8afef601b` 2026-11-11 · Karmi Phuc · merge
Merge pull request #9 from karmiphuc/claude/effects-review-fixes  
*main*

### `c27aeebb37` 2026-11-11 · Karmi Nguyen · merge
Merge remote-tracking branch 'origin/main' into renderer/phase0  
*main*

### `76034ec5a1` 2026-11-11 · Karmi Nguyen
Retain controlled WebGL frames and verify the actual saved PNG viewport  
*main*
- M `qa/capture.cjs`

### `d6964e9e53` 2026-11-11 · Karmi Nguyen
Reject historical bench resumes without final-image validity evidence  
*main*
- M `qa/capture.cjs`

### `efb4cd2d48` 2026-11-11 · Karmi Nguyen
Guard prior pixel checks by both image hashes and save archive manifests atomically  
*main*
- M `qa/assemble-baseline.py`

### `7ea60508bd` 2026-11-11 · Karmi Nguyen
Recover truncated archive images and replace WebP files atomically  
*main*
- M `qa/assemble-baseline.py`

### `3a914d26e5` 2026-11-11 · Karmi Nguyen
Record complete baseline review, recovery proofs and phase handoff  
*main*
- M `design/baseline/README.md`
- A `design/baseline/recovery-proof/README.md`
- A `design/baseline/webgl-proof/README.md`
- A `docs/renderer-progress.json`
- (17 evidence files under design/)

### `eda1ba07d7` 2026-11-11 · Karmi Nguyen
Capture baseline evidence: baseline/1194x834  
*main*
- (28 evidence files under design/)

### `d4c9b58957` 2026-11-11 · Karmi Nguyen
Capture baseline evidence: baseline/1210x834  
*main*
- (28 evidence files under design/)

### `f6c97e83cd` 2026-11-11 · Karmi Nguyen
Capture baseline evidence: baseline/1366x1024  
*main*
- (28 evidence files under design/)

### `bd4117cfb1` 2026-11-11 · Karmi Nguyen
Capture baseline evidence: baseline/1376x1032  
*main*
- (28 evidence files under design/)

### `ab862179d6` 2026-11-11 · Karmi Nguyen
Capture baseline evidence: phase0/1194x834  
*main*
- (28 evidence files under design/)

### `d7b57e9a8e` 2026-11-11 · Karmi Nguyen
Capture baseline evidence: phase0/1210x834  
*main*
- (28 evidence files under design/)

### `9376dfea41` 2026-11-11 · Karmi Nguyen
Capture baseline evidence: phase0/1366x1024  
*main*
- (28 evidence files under design/)

### `5727a0e55c` 2026-11-11 · Karmi Nguyen
Capture baseline evidence: phase0/1376x1032  
*main*
- (28 evidence files under design/)

### `8e21f8f756` 2026-11-11 · Karmi Nguyen
Capture baseline evidence: reference-game/1194x834  
*main*
- (21 evidence files under design/)

### `c6f20156a7` 2026-11-11 · Karmi Nguyen
Capture baseline evidence: reference-game/1210x834  
*main*
- (21 evidence files under design/)

### `4d3b61bf07` 2026-11-11 · Karmi Nguyen
Capture baseline evidence: reference-game/1366x1024  
*main*
- (21 evidence files under design/)

### `878c942302` 2026-11-11 · Karmi Nguyen
Capture baseline evidence: reference-game/1376x1032  
*main*
- (21 evidence files under design/)

### `34a515d589` 2026-11-11 · Karmi Nguyen
Capture baseline evidence: reference-bench  
*main*
- (4 evidence files under design/)

### `1a67e6eafb` 2026-11-11 · Karmi Nguyen
Index all 312 reviewed stills and 26 action filmstrips with provenance  
*main*
- (67 evidence files under design/)

### `bfc45fbd05` 2026-11-11 · Karmi Phuc · merge
Merge pull request #7 from karmiphuc/renderer/phase0  
*main*

### `2c28e2e74f` 2026-11-11 · Karmi Nguyen
Begin Phase 1 with shared WebGL ownership and ported environment helpers  
*main*
- D `dist/foundry/renderer.js`
- A `dist/foundry/scene-rigs.js`
- M `dist/index.html`
- A `dist/scene/environment.js`
- A `dist/shared-renderer.js`

### `c44428b707` 2026-11-11 · Karmi Nguyen · merge
Merge remote-tracking branch 'origin/main' into renderer/phase1  
*main*

### `18f34e1547` 2026-11-11 · Karmi Nguyen
Draw the battle board and rig world positions through the shared renderer  
*main*
- M `.gitignore`
- M `dist/foundry/scene-rigs.js`
- M `dist/game.js`
- M `dist/index.html`
- A `dist/scene/battle.js`
- A `dist/scene/billboards.js`
- M `dist/shared-renderer.js`
- M `docs/renderer-progress.json`

### `cab15a1f3e` 2026-11-11 · Claude
Replace box arcs with a plasma tendril / spark crawl / joint short mix  
*main*
- A `design/reference-vfx/pr10/README.md`
- M `docs/reference/claude/README.md`
- M `docs/reference/claude/rig-bench.html`
- (14 evidence files under design/)

### `480d775dd7` 2026-11-11 · Karmi Nguyen
Unify eight battle rigs and previews, remove replaced sprite paths, and add scene regression probes  
*main*
- M `dist/foundry/bastion.js`
- M `dist/foundry/rig-motion.js`
- A `dist/foundry/rigid-adapter.js`
- M `dist/foundry/scene-rigs.js`
- M `dist/foundry/warden-live.js`
- M `dist/game.js`
- M `dist/grid-travel-visuals.js`
- M `dist/index.html`
- M `dist/performance.js`
- M `dist/scene/battle.js`
- M `dist/scene/billboards.js`
- M `dist/scene/environment.js`
- M `dist/shared-renderer.js`
- M `dist/warden-fidelity.js`
- A `docs/phase1-development.md`
- M `docs/renderer-progress.json`
- A `qa/browser/shared-scene.cjs`
- M `qa/check-animation.cjs`
- M `qa/check-arsenal.cjs`
- D `qa/check-canvas-toning.cjs`
- M `qa/check-foundry.cjs`
- D `qa/check-live-warden-runtime.cjs`
- D `qa/check-live-warden.cjs`
- M `qa/check-mobility.cjs`
- M `qa/check-performance.cjs`
- M `qa/check-prototype-combat.cjs`
- A `qa/check-rigid-adapter.cjs`
- A `qa/check-scene-regressions.cjs`
- A `qa/check-scene.cjs`
- M `qa/check-simulation.cjs`
- M `qa/check-tactical.cjs`
- M `qa/check-terrain.cjs`
- M `qa/check-ui.cjs`
- D `qa/check-upper-animation.cjs`
- A `qa/fixtures/legacy-10x10-scene.json`
- M `qa/sim-harness.cjs`
- (5 evidence files under design/)

### `aacc5af130` 2026-11-11 · karmiphuc
Update Site source  
*main*
- M `dist/assets/gatecrasher-bare-combat-left-motion-paint.webp`
- M `dist/assets/gatecrasher-bare-combat-left-motion-parts.webp`
- M `dist/assets/gatecrasher-bare-combat-left-motion.webp`
- M `dist/assets/gatecrasher-bare-combat-left-paint.webp`
- M `dist/assets/gatecrasher-bare-combat-left-parts.webp`
- M `dist/assets/gatecrasher-bare-combat-left.webp`
- M `dist/assets/gatecrasher-bare-combat-right-motion-paint.webp`
- M `dist/assets/gatecrasher-bare-combat-right-motion-parts.webp`
- M `dist/assets/gatecrasher-bare-combat-right-motion.webp`
- M `dist/assets/gatecrasher-bare-combat-right-paint.webp`
- M `dist/assets/gatecrasher-bare-combat-right-parts.webp`
- M `dist/assets/gatecrasher-bare-combat-right.webp`
- M `dist/assets/gatecrasher-cleaver-combat-left-motion-paint.webp`
- M `dist/assets/gatecrasher-cleaver-combat-left-motion-parts.webp`
- M `dist/assets/gatecrasher-cleaver-combat-left-motion.webp`
- M `dist/assets/gatecrasher-cleaver-combat-left-paint.webp`
- M `dist/assets/gatecrasher-cleaver-combat-left-parts.webp`
- M `dist/assets/gatecrasher-cleaver-combat-left.webp`
- M `dist/assets/gatecrasher-cleaver-combat-right-motion-paint.webp`
- M `dist/assets/gatecrasher-cleaver-combat-right-motion-parts.webp`
- M `dist/assets/gatecrasher-cleaver-combat-right-motion.webp`
- M `dist/assets/gatecrasher-cleaver-combat-right-paint.webp`
- M `dist/assets/gatecrasher-cleaver-combat-right-parts.webp`
- M `dist/assets/gatecrasher-cleaver-combat-right.webp`
- M `dist/assets/gatecrasher-r2-combat-left-motion-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-left-motion-parts.webp`
- M `dist/assets/gatecrasher-r2-combat-left-motion.webp`
- M `dist/assets/gatecrasher-r2-combat-left-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-left-parts.webp`
- M `dist/assets/gatecrasher-r2-combat-left.webp`
- M `dist/assets/gatecrasher-r2-combat-right-motion-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-right-motion-parts.webp`
- M `dist/assets/gatecrasher-r2-combat-right-motion.webp`
- M `dist/assets/gatecrasher-r2-combat-right-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-right-parts.webp`
- M `dist/assets/gatecrasher-r2-combat-right.webp`
- M `dist/assets/gatecrasher-vesper-combat-left-motion-paint.webp`
- M `dist/assets/gatecrasher-vesper-combat-left-motion-parts.webp`
- M `dist/assets/gatecrasher-vesper-combat-left-motion.webp`
- M `dist/assets/gatecrasher-vesper-combat-left-paint.webp`
- M `dist/assets/gatecrasher-vesper-combat-left-parts.webp`
- M `dist/assets/gatecrasher-vesper-combat-left.webp`
- M `dist/assets/gatecrasher-vesper-combat-right-motion-paint.webp`
- M `dist/assets/gatecrasher-vesper-combat-right-motion-parts.webp`
- M `dist/assets/gatecrasher-vesper-combat-right-motion.webp`
- M `dist/assets/gatecrasher-vesper-combat-right-paint.webp`
- M `dist/assets/gatecrasher-vesper-combat-right-parts.webp`
- M `dist/assets/gatecrasher-vesper-combat-right.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-0-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-0-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-0.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-1-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-1-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-1.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-2-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-2-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-2.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-3-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-3-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-3.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-0-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-0-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-0.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-1-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-1-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-1.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-2-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-2-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-2.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-3-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-3-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-3.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-0-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-0-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-0.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-1-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-1-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-1.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-2-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-2-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-2.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-3-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-3-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-3.webp`
- M `dist/assets/grid-travel-gatecrasher-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-0-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-0-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-0.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-1-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-1-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-1.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-2-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-2-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-2.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-3-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-3-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-3.webp`
- M `dist/assets/grid-travel-gatecrasher.webp`
- M `dist/game.js`
- M `dist/grid-travel-visuals.js`
- M `dist/prototype-combat.js`
- M `dist/rig-bench/prototypes/gatecrasher.glb`
- M `dist/rig-bench/prototypes/gatecrasher.webp`
- M `qa/browser/gatecrasher-armed.cjs`
- M `qa/check-gatecrasher.cjs`
- M `qa/release-check.cjs`
- A `tools/bake_samurai_gatecrasher.py`
- A `tools/fit_samurai_gatecrasher.py`
- A `tools/install_samurai_gatecrasher.py`
- M `tools/render_prototype_combat.py`

### `63b7574fd5` 2026-11-11 · Karmi Nguyen
Apply approved visual clearance spacing and preserve real terrain contacts  
*main*
- M `dist/foundry/bastion.js`
- M `dist/foundry/rig-motion.js`
- M `dist/foundry/warden-live.js`
- M `dist/game.js`
- M `dist/scene/battle.js`
- M `dist/scene/environment.js`
- M `docs/phase1-development.md`
- M `docs/renderer-progress.json`
- M `qa/browser/shared-scene.cjs`
- M `qa/check-scene.cjs`

### `fbd04293ec` 2026-11-11 · karmiphuc
Update Site source  
*main*
- M `dist/assets/gatecrasher-bare-combat-left-motion-paint.webp`
- M `dist/assets/gatecrasher-bare-combat-left-motion-parts.webp`
- M `dist/assets/gatecrasher-bare-combat-left-motion.webp`
- M `dist/assets/gatecrasher-bare-combat-left-paint.webp`
- M `dist/assets/gatecrasher-bare-combat-left-parts.webp`
- M `dist/assets/gatecrasher-bare-combat-left.webp`
- M `dist/assets/gatecrasher-bare-combat-right-motion-paint.webp`
- M `dist/assets/gatecrasher-bare-combat-right-motion-parts.webp`
- M `dist/assets/gatecrasher-bare-combat-right-motion.webp`
- M `dist/assets/gatecrasher-bare-combat-right-paint.webp`
- M `dist/assets/gatecrasher-bare-combat-right-parts.webp`
- M `dist/assets/gatecrasher-bare-combat-right.webp`
- M `dist/assets/gatecrasher-cleaver-combat-left-motion-paint.webp`
- M `dist/assets/gatecrasher-cleaver-combat-left-motion-parts.webp`
- M `dist/assets/gatecrasher-cleaver-combat-left-motion.webp`
- M `dist/assets/gatecrasher-cleaver-combat-left-paint.webp`
- M `dist/assets/gatecrasher-cleaver-combat-left-parts.webp`
- M `dist/assets/gatecrasher-cleaver-combat-left.webp`
- M `dist/assets/gatecrasher-cleaver-combat-right-motion-paint.webp`
- M `dist/assets/gatecrasher-cleaver-combat-right-motion-parts.webp`
- M `dist/assets/gatecrasher-cleaver-combat-right-motion.webp`
- M `dist/assets/gatecrasher-cleaver-combat-right-paint.webp`
- M `dist/assets/gatecrasher-cleaver-combat-right-parts.webp`
- M `dist/assets/gatecrasher-cleaver-combat-right.webp`
- M `dist/assets/gatecrasher-r2-combat-left-motion-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-left-motion-parts.webp`
- M `dist/assets/gatecrasher-r2-combat-left-motion.webp`
- M `dist/assets/gatecrasher-r2-combat-left-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-left-parts.webp`
- M `dist/assets/gatecrasher-r2-combat-left.webp`
- M `dist/assets/gatecrasher-r2-combat-right-motion-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-right-motion-parts.webp`
- M `dist/assets/gatecrasher-r2-combat-right-motion.webp`
- M `dist/assets/gatecrasher-r2-combat-right-paint.webp`
- M `dist/assets/gatecrasher-r2-combat-right-parts.webp`
- M `dist/assets/gatecrasher-r2-combat-right.webp`
- M `dist/assets/gatecrasher-vesper-combat-left-motion-paint.webp`
- M `dist/assets/gatecrasher-vesper-combat-left-motion-parts.webp`
- M `dist/assets/gatecrasher-vesper-combat-left-motion.webp`
- M `dist/assets/gatecrasher-vesper-combat-left-paint.webp`
- M `dist/assets/gatecrasher-vesper-combat-left-parts.webp`
- M `dist/assets/gatecrasher-vesper-combat-left.webp`
- M `dist/assets/gatecrasher-vesper-combat-right-motion-paint.webp`
- M `dist/assets/gatecrasher-vesper-combat-right-motion-parts.webp`
- M `dist/assets/gatecrasher-vesper-combat-right-motion.webp`
- M `dist/assets/gatecrasher-vesper-combat-right-paint.webp`
- M `dist/assets/gatecrasher-vesper-combat-right-parts.webp`
- M `dist/assets/gatecrasher-vesper-combat-right.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-0-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-0-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-0.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-1-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-1-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-1.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-2-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-2-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-2.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-3-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-3-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-bare-ground-3.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-0-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-0-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-0.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-1-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-1-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-1.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-2-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-2-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-2.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-3-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-3-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-cleaver-ground-3.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-0-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-0-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-0.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-1-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-1-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-1.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-2-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-2-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-2.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-3-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-3-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-ground-3.webp`
- M `dist/assets/grid-travel-gatecrasher-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-0-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-0-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-0.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-1-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-1-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-1.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-2-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-2-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-2.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-3-paint.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-3-parts.webp`
- M `dist/assets/grid-travel-gatecrasher-vesper-ground-3.webp`
- M `dist/assets/grid-travel-gatecrasher.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-0-paint.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-0-parts.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-0.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-1-paint.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-1-parts.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-1.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-2-paint.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-2-parts.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-2.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-3-paint.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-3-parts.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-3.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-0-paint.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-0-parts.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-0.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-1-paint.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-1-parts.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-1.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-2-paint.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-2-parts.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-2.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-3-paint.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-3-parts.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-3.webp`
- A `dist/assets/grid-travel-shogun-ground-0-paint.webp`
- A `dist/assets/grid-travel-shogun-ground-0-parts.webp`
- A `dist/assets/grid-travel-shogun-ground-0.webp`
- A `dist/assets/grid-travel-shogun-ground-1-paint.webp`
- A `dist/assets/grid-travel-shogun-ground-1-parts.webp`
- A `dist/assets/grid-travel-shogun-ground-1.webp`
- A `dist/assets/grid-travel-shogun-ground-2-paint.webp`
- A `dist/assets/grid-travel-shogun-ground-2-parts.webp`
- A `dist/assets/grid-travel-shogun-ground-2.webp`
- A `dist/assets/grid-travel-shogun-ground-3-paint.webp`
- A `dist/assets/grid-travel-shogun-ground-3-parts.webp`
- A `dist/assets/grid-travel-shogun-ground-3.webp`
- A `dist/assets/grid-travel-shogun-paint.webp`
- A `dist/assets/grid-travel-shogun-parts.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-0-paint.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-0-parts.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-0.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-1-paint.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-1-parts.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-1.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-2-paint.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-2-parts.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-2.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-3-paint.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-3-parts.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-3.webp`
- A `dist/assets/grid-travel-shogun.webp`
- A `dist/assets/shogun-bare-combat-left-motion-paint.webp`
- A `dist/assets/shogun-bare-combat-left-motion-parts.webp`
- A `dist/assets/shogun-bare-combat-left-motion.webp`
- A `dist/assets/shogun-bare-combat-left-paint.webp`
- A `dist/assets/shogun-bare-combat-left-parts.webp`
- A `dist/assets/shogun-bare-combat-left.webp`
- A `dist/assets/shogun-bare-combat-right-motion-paint.webp`
- A `dist/assets/shogun-bare-combat-right-motion-parts.webp`
- A `dist/assets/shogun-bare-combat-right-motion.webp`
- A `dist/assets/shogun-bare-combat-right-paint.webp`
- A `dist/assets/shogun-bare-combat-right-parts.webp`
- A `dist/assets/shogun-bare-combat-right.webp`
- A `dist/assets/shogun-cleaver-combat-left-motion-paint.webp`
- A `dist/assets/shogun-cleaver-combat-left-motion-parts.webp`
- A `dist/assets/shogun-cleaver-combat-left-motion.webp`
- A `dist/assets/shogun-cleaver-combat-left-paint.webp`
- A `dist/assets/shogun-cleaver-combat-left-parts.webp`
- A `dist/assets/shogun-cleaver-combat-left.webp`
- A `dist/assets/shogun-cleaver-combat-right-motion-paint.webp`
- A `dist/assets/shogun-cleaver-combat-right-motion-parts.webp`
- A `dist/assets/shogun-cleaver-combat-right-motion.webp`
- A `dist/assets/shogun-cleaver-combat-right-paint.webp`
- A `dist/assets/shogun-cleaver-combat-right-parts.webp`
- A `dist/assets/shogun-cleaver-combat-right.webp`
- A `dist/assets/shogun-combat-left-motion-paint.webp`
- A `dist/assets/shogun-combat-left-motion-parts.webp`
- A `dist/assets/shogun-combat-left-motion.webp`
- A `dist/assets/shogun-combat-left-paint.webp`
- A `dist/assets/shogun-combat-left-parts.webp`
- A `dist/assets/shogun-combat-left.webp`
- A `dist/assets/shogun-combat-right-motion-paint.webp`
- A `dist/assets/shogun-combat-right-motion-parts.webp`
- A `dist/assets/shogun-combat-right-motion.webp`
- A `dist/assets/shogun-combat-right-paint.webp`
- A `dist/assets/shogun-combat-right-parts.webp`
- A `dist/assets/shogun-combat-right.webp`
- A `dist/assets/shogun-vesper-combat-left-motion-paint.webp`
- A `dist/assets/shogun-vesper-combat-left-motion-parts.webp`
- A `dist/assets/shogun-vesper-combat-left-motion.webp`
- A `dist/assets/shogun-vesper-combat-left-paint.webp`
- A `dist/assets/shogun-vesper-combat-left-parts.webp`
- A `dist/assets/shogun-vesper-combat-left.webp`
- A `dist/assets/shogun-vesper-combat-right-motion-paint.webp`
- A `dist/assets/shogun-vesper-combat-right-motion-parts.webp`
- A `dist/assets/shogun-vesper-combat-right-motion.webp`
- A `dist/assets/shogun-vesper-combat-right-paint.webp`
- A `dist/assets/shogun-vesper-combat-right-parts.webp`
- A `dist/assets/shogun-vesper-combat-right.webp`
- M `dist/chassis-part-masks.js`
- M `dist/game.js`
- M `dist/grid-travel-visuals.js`
- M `dist/prototype-combat.js`
- M `dist/rig-bench/prototypes/bay.js`
- M `dist/rig-bench/prototypes/gatecrasher.glb`
- M `dist/rig-bench/prototypes/gatecrasher.webp`
- M `dist/rig-bench/prototypes/index.html`
- A `dist/rig-bench/prototypes/shogun.glb`
- A `dist/rig-bench/prototypes/shogun.webp`
- M `qa/browser/chassis-scale.cjs`
- M `qa/browser/gatecrasher-armed.cjs`
- M `qa/check-foundry.cjs`
- M `qa/check-gatecrasher.cjs`
- M `qa/check-hull-prices.cjs`
- M `qa/check-mobility.cjs`
- M `qa/release-check.cjs`
- M `tools/install_samurai_gatecrasher.py`

### `b6a7437ebd` 2026-11-11 · Claude
Reference walk: planted feet, reachable legs and unstuck War units (zero soak anomalies)  
*main*
- A `design/reference-walk/README.md`
- M `docs/reference/claude/README.md`
- M `docs/reference/claude/mercenary-command.html`
- M `docs/reference/claude/rig-bench.html`
- A `qa/reference-walk.cjs`
- (5 evidence files under design/)

### `5e3752337f` 2026-11-11 · Karmi Nguyen
Keep artillery supports planted and complete shared sprite attachments and regression checks  
*main*
- M `dist/foundry/rig-motion.js`
- M `dist/foundry/scene-rigs.js`
- M `dist/game.js`
- M `dist/scene/battle.js`
- M `dist/scene/billboards.js`
- M `docs/phase1-development.md`
- M `docs/renderer-progress.json`
- M `qa/browser/armory.cjs`
- D `qa/browser/ashigaru.cjs`
- D `qa/browser/attack-exchange.cjs`
- M `qa/browser/bastion.cjs`
- A `qa/browser/billboards.cjs`
- D `qa/browser/bulwark-combat.cjs`
- M `qa/browser/campaign.cjs`
- D `qa/browser/canvas-toning.cjs`
- D `qa/browser/chassis-scale.cjs`
- D `qa/browser/gatecrasher-armed.cjs`
- D `qa/browser/impact.cjs`
- D `qa/browser/infantry-destruction.cjs`
- M `qa/browser/line-elite.cjs`
- M `qa/browser/line-infantry.cjs`
- M `qa/browser/lion-trial.cjs`
- A `qa/browser/live-paint.cjs`
- D `qa/browser/live-warden.cjs`
- M `qa/browser/move-preview.cjs`
- D `qa/browser/paint.cjs`
- M `qa/browser/paired-walk.cjs`
- D `qa/browser/part-masks.cjs`
- M `qa/browser/reaver.cjs`
- M `qa/browser/ridge-combat.cjs`
- D `qa/browser/roster-destruction.cjs`
- M `qa/browser/shared-scene.cjs`
- M `qa/browser/shields.cjs`
- M `qa/browser/terrain.cjs`
- D `qa/browser/volley.cjs`
- D `qa/browser/warden-melee.cjs`
- D `qa/browser/warden.cjs`
- M `qa/check-browser.cjs`
- M `qa/check-scene-regressions.cjs`
- M `qa/check-scene.cjs`
- (1 evidence files under design/)

### `b9dca9160f` 2026-11-11 · Karmi Nguyen
Allow software GL startup time and trace native Bastion browser checks  
*main*
- M `qa/browser/bastion.cjs`
- M `qa/check-scene.cjs`

### `0c8030e295` 2026-11-11 · karmiphuc
Update Site source  
*main*
- M `dist/assets/grid-travel-shogun-bare-ground-0.webp`
- M `dist/assets/grid-travel-shogun-bare-ground-1.webp`
- M `dist/assets/grid-travel-shogun-bare-ground-2.webp`
- M `dist/assets/grid-travel-shogun-bare-ground-3.webp`
- M `dist/assets/grid-travel-shogun-cleaver-ground-0.webp`
- M `dist/assets/grid-travel-shogun-cleaver-ground-1.webp`
- M `dist/assets/grid-travel-shogun-cleaver-ground-2.webp`
- M `dist/assets/grid-travel-shogun-cleaver-ground-3.webp`
- M `dist/assets/grid-travel-shogun-ground-0.webp`
- M `dist/assets/grid-travel-shogun-ground-1.webp`
- M `dist/assets/grid-travel-shogun-ground-2.webp`
- M `dist/assets/grid-travel-shogun-ground-3.webp`
- M `dist/assets/grid-travel-shogun-vesper-ground-0.webp`
- M `dist/assets/grid-travel-shogun-vesper-ground-1.webp`
- M `dist/assets/grid-travel-shogun-vesper-ground-2.webp`
- M `dist/assets/grid-travel-shogun-vesper-ground-3.webp`
- M `dist/assets/shogun-bare-combat-left-motion.webp`
- M `dist/assets/shogun-bare-combat-right-motion.webp`
- M `dist/assets/shogun-cleaver-combat-left-motion.webp`
- M `dist/assets/shogun-cleaver-combat-right-motion.webp`
- M `dist/assets/shogun-combat-left-motion.webp`
- M `dist/assets/shogun-combat-right-motion.webp`
- M `dist/assets/shogun-vesper-combat-left-motion.webp`
- M `dist/assets/shogun-vesper-combat-right-motion.webp`
- M `tools/install_samurai_gatecrasher.py`

### `105a98c10a` 2026-11-11 · Karmi Nguyen
Use a real continuous five-tile move for the stuck-observer negative control  
*main*
- M `qa/check-scene.cjs`

### `c4b3de7f8a` 2026-11-11 · Karmi Nguyen
Capture all live frames and reject blank shared battle output  
*main*
- M `qa/README.md`
- M `qa/capture-presets.cjs`
- M `qa/capture.cjs`

### `6dcb90cbb4` 2026-11-11 · Karmi Nguyen
Run scene campaigns through real deployment and assert surveyed terrain  
*main*
- M `dist/game.js`
- M `docs/phase1-development.md`
- M `qa/capture-presets.cjs`
- M `qa/check-scene.cjs`

### `770fa20644` 2026-11-11 · Karmi Nguyen
Preserve the Phase 0 capture catalog and verify supported turns converge  
*main*
- M `qa/capture-presets.cjs`
- M `qa/capture.cjs`
- M `qa/check-capture-presets.cjs`
- M `qa/check-scene-regressions.cjs`

### `c0f99d71ed` 2026-11-11 · Karmi Nguyen
Prepare shared reference FX factory and inventory all weapon timelines  
*main*
- A `dist/scene/effects.js`
- A `docs/phase2-development.md`

### `170575e1cb` 2026-11-11 · Karmi Nguyen
Refresh action controls when cached assets make a replacement battle ready  
*main*
- M `dist/game.js`
- M `docs/phase1-development.md`
- M `qa/browser/billboards.cjs`
- M `qa/browser/lion-trial.cjs`
- M `qa/check-browser.cjs`
- (1 evidence files under design/)

### `b198fdce14` 2026-11-11 · Karmi Nguyen
Run Phase 1 terrain captures first and allow one-attempt negative controls  
*main*
- M `qa/capture.cjs`
- M `qa/check-browser.cjs`

### `ecffd3af23` 2026-11-11 · Karmi Nguyen
Drive Lion sheet timing deterministically and construct matching live-frame capture loadouts  
*main*
- M `qa/browser/lion-trial.cjs`
- M `qa/capture-presets.cjs`
- M `qa/check-capture-presets.cjs`

### `a7507d15a6` 2026-11-11 · Karmi Nguyen
Dispose owned FX pool resources and sample elevated footfall ground  
*main*
- M `dist/scene/effects.js`

### `9589a318f4` 2026-11-11 · Karmi Nguyen
Record browser source evidence and hold Bastion preview samples on a controlled clock  
*main*
- M `qa/browser/bastion.cjs`
- M `qa/check-browser.cjs`

### `b0eb719f6c` 2026-11-11 · Karmi Nguyen
Declare explicit 3D archetypes for all catalog weapons, counter and mortar  
*main*
- A `dist/scene/weapon-fx.js`
- M `docs/phase2-development.md`

### `7582eb6e37` 2026-11-11 · Karmi Nguyen
Respect Citadel barrage locks in the real-campaign driver and check rendered root bounds  
*main*
- M `docs/phase1-development.md`
- M `qa/README.md`
- M `qa/browser/paired-walk.cjs`
- M `qa/check-browser.cjs`
- M `qa/check-scene.cjs`
- (1 evidence files under design/)

### `035ce3549d` 2026-11-11 · Karmi Phuc
Preserve verified Phase 1 QA work after workspace interruption: qa/capture-presets.cjs  
*main*
- M `qa/capture-presets.cjs`

### `67838f4eb5` 2026-11-11 · Karmi Phuc
Preserve verified Phase 1 QA work after workspace interruption: qa/check-capture-presets.cjs  
*main*
- M `qa/check-capture-presets.cjs`

### `6bf5b584a4` 2026-11-11 · Karmi Phuc
Preserve verified Phase 1 QA work after workspace interruption: qa/check-scene.cjs  
*main*
- M `qa/check-scene.cjs`

### `bb4f1bf427` 2026-11-11 · Karmi Phuc
Preserve verified Phase 1 QA work after workspace interruption: qa/browser/lion-trial.cjs  
*main*
- M `qa/browser/lion-trial.cjs`

### `648782a49f` 2026-11-11 · Karmi Phuc
Preserve verified Phase 1 QA work after workspace interruption: qa/browser/bastion.cjs  
*main*
- M `qa/browser/bastion.cjs`

### `8934736f6f` 2026-11-11 · Karmi Phuc
Record completed checks, interrupted gates and exact renderer recovery steps  
*main*
- A `docs/renderer-runtime-handoff-20261111.md`

### `fd4e4c0793` 2026-11-11 · Karmi Phuc
Record verification interruption and preserve owner-authorized renderer progress  
*main*
- M `docs/renderer-progress.json`

### `4ce07203b7` 2026-11-11 · Karmi Phuc
Point Phase 1 development notes to the current verification and recovery state  
*main*
- M `docs/phase1-development.md`

### `ddc991be5a` 2026-11-11 · Karmi Phuc
Record new reference PR reviews and concurrent Gatecrasher source imports  
*main*
- M `docs/renderer-runtime-handoff-20261111.md`

### `9ead3a1748` 2026-11-11 · Karmi Nguyen
Make Aero jumpjet fixture use a clear raycastable landing tile  
*main*
- M `qa/browser/aero.cjs`

### `38768135fe` 2026-11-11 · Karmi Nguyen · merge
Merge remote-tracking branch 'origin/renderer/phase1' into renderer/phase1  
*main*

### `98c1693f93` 2026-11-11 · Karmi Nguyen
Fix pooled missile arrivals and record PR 20 as the trusted gait baseline  
*main*
- M `dist/scene/effects.js`
- M `docs/phase2-development.md`
- A `qa/check-combat-fx.cjs`
- (2 evidence files under design/)

### `62feebbbcd` 2026-11-11 · Karmi Phuc · merge
Merge pull request #19 from karmiphuc/claude/arc-plasma-mix  
*main*

### `5770d8cb66` 2026-11-11 · Karmi Phuc · merge
Merge pull request #20 from karmiphuc/fix/reference-walk  
*main*

### `207b809315` 2026-11-11 · Karmi Nguyen · merge
Merge latest main and preserve SHOGUN in temporary scene adapter  
*main*

### `35e33b1dc2` 2026-11-11 · Karmi Nguyen · merge
Merge remote-tracking branch 'origin/main' into renderer/phase1  
*main*

### `0a785e9755` 2026-11-11 · Karmi Nguyen · merge
Merge branch 'renderer/phase1' into renderer/phase2  
*main*

### `2ca3951631` 2026-11-11 · Karmi Nguyen
Keep real raycast matrices and await contract assets in controlled QA  
*main*
- M `docs/phase1-development.md`
- M `qa/browser/paired-walk.cjs`
- M `qa/check-browser.cjs`
- M `qa/check-scene.cjs`

### `5ca9ec0199` 2026-11-11 · Karmi Nguyen
Port merged Claude plasma effects and corrected gait with production safeguards  
*main*
- M `dist/foundry/chassis.js`
- M `dist/foundry/rig-motion.js`
- M `dist/scene/effects.js`
- M `docs/phase2-development.md`
- M `qa/check-combat-fx.cjs`

### `62d1f58f41` 2026-11-11 · Karmi Nguyen
Keep the touch jumpjet destination visible in its pointer fixture  
*main*
- M `qa/browser/aero.cjs`

### `7f6cc03aec` 2026-11-11 · Karmi Nguyen
Connect shared 3D combat pools to real firing and damage contacts  
*main*
- M `dist/foundry/scene-rigs.js`
- M `dist/game.js`
- M `dist/index.html`
- M `dist/scene/battle.js`
- A `dist/scene/combat.js`
- M `docs/phase2-development.md`
- M `qa/check-foundry-motion.cjs`

### `021d3a4b1f` 2026-11-11 · Karmi Nguyen · merge
Merge branch 'renderer/phase1' into renderer/phase2  
*main*

### `744b64633f` 2026-11-11 · Karmi Nguyen
Wait on visual assets and preserve identical-source capture checkpoints  
*main*
- M `docs/phase1-development.md`
- M `qa/browser/shields.cjs`
- M `qa/capture.cjs`

### `a7735c2432` 2026-11-11 · Karmi Nguyen
Use PR 20 corrected gait to fix actual campaign shove drift  
*main*
- M `dist/foundry/chassis.js`
- M `dist/foundry/rig-motion.js`
- M `docs/phase1-development.md`
- M `qa/check-browser.cjs`
- A `qa/check-foundry-walk.cjs`
- (1 evidence files under design/)

### `e4f81c6b07` 2026-11-11 · Karmi Nguyen
Advance capture animation on CPU and render the final full-resolution frame  
*main*
- M `qa/capture.cjs`

### `6786df4d77` 2026-11-11 · Karmi Nguyen
Integrate Phase 2 combat presentation  
*main*
- M `dist/foundry/production-arsenal.js`
- M `dist/foundry/scene-rigs.js`
- M `dist/game.js`
- M `dist/index.html`
- A `dist/scene/adapter-weapons.js`
- M `dist/scene/battle.js`
- M `dist/scene/billboards.js`
- M `dist/scene/combat.js`
- M `dist/scene/effects.js`
- M `dist/scene/weapon-fx.js`

### `d6b27198fe` 2026-11-11 · Karmi Nguyen
docs: record Phase 2 source requirements review  
*main*
- A `docs/phase2-requirements-review.md`

### `a92cda50a3` 2026-11-11 · Karmi Nguyen
Add Phase 3 rig export validation gate  
*unmerged: renderer/phase3*
- A `docs/phase3-export-gate.md`
- A `qa/check-rig-v2-test.cjs`
- A `qa/check-rig-v2.cjs`

### `7934470923` 2026-11-11 · Karmi Nguyen
docs: reconcile Phase 2 review with integrated fixes  
*main*
- M `docs/phase2-requirements-review.md`

### `8aad694cfe` 2026-11-11 · Karmi Nguyen
Gate Phase 2 combat with real scene and command evidence  
*main*
- A `qa/check-production-weapons.cjs`
- M `qa/check-scene.cjs`
- A `qa/scene-combat.cjs`

### `e141aee0b3` 2026-11-11 · Karmi Nguyen
Document Phase 2 scene gate coverage and render policies  
*main*
- M `qa/README.md`

### `deccf296da` 2026-11-11 · Karmi Nguyen
Skip unrecorded capture warmup GPU submissions  
*main*
- M `qa/capture.cjs`

### `73ac69ef75` 2026-11-11 · Karmi Nguyen
Record Phase 2 compatibility mapping and physical renderer regressions  
*main*
- M `docs/phase2-development.md`
- A `docs/phase2-weapon-mapping.md`
- M `qa/check-arsenal.cjs`
- A `qa/check-foundry-walk.cjs`
- M `qa/check-foundry.cjs`
- M `qa/check-prototype-combat.cjs`
- M `qa/check-shield-depth.cjs`
- (3 evidence files under design/)

### `3523e24dc1` 2026-11-11 · Karmi Nguyen
Add actual-command Phase 2 visual capture tooling  
*main*
- A `docs/phase2-visual-review.md`
- A `qa/capture-phase2-matched.cjs`
- A `qa/capture-phase2.cjs`

### `272be7d070` 2026-11-11 · Karmi Nguyen
Resume completed visual cases and retry compositor capture  
*main*
- M `qa/capture-phase2.cjs`

### `ca7b64e3c5` 2026-11-11 · Karmi Nguyen
Prepare shared-renderer hangar scene  
*unmerged: renderer/phase4*
- A `dist/scene/hangar-fixture.html`
- A `dist/scene/hangar-fixture.js`
- A `dist/scene/hangar.js`
- A `docs/phase4-hangar-preparation.md`

### `c914d5d7eb` 2026-11-11 · Karmi Nguyen
Revert "Skip unrecorded capture warmup GPU submissions"  
*main*
- M `qa/capture.cjs`

### `0833e51850` 2026-11-11 · Karmi Nguyen
Record frozen-source Phase 2 full-motion action evidence  
*main*
- (2 evidence files under design/)

### `29575f2196` 2026-11-11 · Karmi Nguyen
Preserve partial visual captures across scheduling pauses  
*main*
- M `qa/capture-phase2.cjs`

### `78ba042856` 2026-11-11 · Karmi Nguyen
Checkpoint first three actual combat visual sequences  
*main*
- M `docs/phase2-visual-review.md`
- (19 evidence files under design/)

### `f40c2ada7e` 2026-11-11 · Karmi Nguyen
Avoid unobserved software GPU draws in Warden bench checks  
*main*
- M `qa/check-browser.cjs`

### `0d33344b6e` 2026-11-11 · Karmi Nguyen
Document capture resume and preserve living critical fault fixture  
*main*
- M `docs/phase2-visual-review.md`
- M `qa/capture-phase2.cjs`

### `dc58642ee6` 2026-11-11 · Karmi Nguyen
Apply software bench policy to prototype rig checks  
*main*
- M `qa/check-browser.cjs`

### `9af2015f8f` 2026-11-11 · Karmi Nguyen
Keep jumpjet feet with airborne chassis  
*main*
- M `dist/foundry/rig-motion.js`
- M `dist/foundry/scene-rigs.js`

### `cc65255b86` 2026-11-11 · Karmi Nguyen · merge
Merge Phase 1 prerequisite history without changing frozen Phase 2 runtime  
*main*

### `1b6535e918` 2026-11-11 · Karmi Nguyen
Wait for deployed sortie save before stale-tab reload  
*main*
- M `qa/browser/career-tabs.cjs`

### `45d384a60c` 2026-11-11 · Karmi Nguyen
Record catalog coverage and strengthened airborne action evidence  
*main*
- (7 evidence files under design/)

### `95638e218c` 2026-11-11 · Karmi Nguyen
Assert airborne ankle clearance and grounded landing in action gate  
*main*
- M `qa/scene-combat.cjs`

### `b3cadb82b8` 2026-11-11 · Karmi Nguyen
Exclude argument-driven rig validator from simulation discovery  
*unmerged: renderer/phase3*
- M `qa/check-simulation.cjs`

### `c3dd7b63f2` 2026-11-11 · Karmi Nguyen
Correct Phase 4 base frame provenance  
*unmerged: renderer/phase4*
- M `docs/phase4-hangar-preparation.md`

### `d5aec52e2b` 2026-11-11 · Karmi Nguyen
Validate rig skeleton attachment ancestry  
*unmerged: renderer/phase3*
- M `qa/check-rig-v2-test.cjs`
- M `qa/check-rig-v2.cjs`

### `1a2e9ce7eb` 2026-11-11 · Karmi Nguyen
Reapply "Skip unrecorded capture warmup GPU submissions"  
*main*
- M `qa/capture.cjs`

### `3b745fc9a7` 2026-11-11 · Karmi Nguyen
Check background-tab battle controls without requiring visibility  
*main*
- M `qa/browser/career-tabs.cjs`

### `e61753327b` 2026-11-11 · Karmi Nguyen
Apply browser timeout to career second tab  
*main*
- M `qa/browser/career-tabs.cjs`

### `64c1279714` 2026-11-11 · Karmi Nguyen
docs: reconcile review with frozen airborne evidence  
*main*
- M `docs/phase2-requirements-review.md`

### `d0763ea1fc` 2026-11-11 · Karmi Nguyen
Record final Phase 2 runtime and action evidence scope  
*main*
- M `docs/phase2-development.md`

### `2e88a50246` 2026-11-11 · Karmi Nguyen
Validate and gate optional output-raster omission for scene correctness  
*main*
- M `qa/README.md`
- M `qa/check-scene.cjs`

### `094962cf29` 2026-11-11 · Karmi Nguyen
Record paired raster-omission equivalence evidence  
*main*
- (2 evidence files under design/)

### `30941b4208` 2026-11-11 · Karmi Nguyen
Track per-image frozen production sources in resumed visual evidence  
*main*
- M `docs/phase2-visual-review.md`
- M `qa/capture-phase2.cjs`

### `d31a2348b1` 2026-11-11 · Karmi Nguyen
Record frame HP and sample smoke around actual death-age cutoff  
*main*
- M `qa/capture-phase2.cjs`

### `2a960ad1dc` 2026-11-11 · Karmi Nguyen
Check firing beats and folded support poses with formal shard aggregation  
*main*
- M `qa/check-scene.cjs`
- A `qa/combine-scene.cjs`

### `33a63a6b3f` 2026-11-11 · Karmi Nguyen
Document formal shard guards and physical pose semantics  
*main*
- M `qa/README.md`

### `3c078c4b6e` 2026-11-11 · Karmi Nguyen
Capture paint controls after workshop settles  
*main*
- M `qa/capture.cjs`

### `e884d90e59` 2026-11-11 · Karmi Nguyen
Capture an actual paid movement path  
*main*
- M `qa/capture.cjs`

### `8af1915b82` 2026-11-11 · Karmi Nguyen
Use overview to expose range-ten target on narrow screens  
*main*
- M `qa/browser/terrain.cjs`

### `cfa1f40770` 2026-11-11 · Karmi Nguyen
Verify final paint and movement capture frames  
*main*
- M `qa/capture.cjs`

### `955497b542` 2026-11-11 · Karmi Nguyen
Version reviewed capture checks  
*main*
- M `qa/capture.cjs`

### `0725d3ef46` 2026-11-11 · Karmi Nguyen
Expose paid route in overview capture  
*main*
- M `qa/capture.cjs`

### `e0c6649332` 2026-11-11 · Karmi Nguyen
Settle overview camera before path capture  
*main*
- M `qa/capture.cjs`

### `59d8fc2ce5` 2026-11-11 · Karmi Nguyen
Version settled overview capture  
*main*
- M `qa/capture.cjs`

### `82fa000f68` 2026-11-11 · Karmi Nguyen
Keep capture clock monotonic during overview  
*main*
- M `qa/capture.cjs`

### `e6c9a076ca` 2026-11-11 · Karmi Nguyen
Version monotonic overview capture  
*main*
- M `qa/capture.cjs`

### `f68b5dff18` 2026-11-11 · Karmi Nguyen
Solve close-range barrel alignment geometrically  
*main*
- M `dist/foundry/scene-rigs.js`

### `40192d9ebc` 2026-11-11 · Karmi Nguyen
Freeze remaining visual coverage on verified barrel alignment source  
*main*
- M `docs/phase2-visual-review.md`
- M `qa/capture-phase2.cjs`

### `3264230555` 2026-11-11 · Karmi Nguyen
Recover verified unvisited captures from checkpoints  
*main*
- M `qa/capture.cjs`

### `67420de77a` 2026-11-11 · Karmi Nguyen
Prove close-range firing regression and record real pivot feasibility  
*main*
- M `qa/check-production-weapons.cjs`
- M `qa/check-scene.cjs`
- M `qa/combine-scene.cjs`
- (3 evidence files under design/)

### `3cdbe21926` 2026-11-11 · Karmi Nguyen
Document close-range aiming regression and fixed production source  
*main*
- M `docs/phase2-development.md`

### `64227adda4` 2026-11-11 · Karmi Nguyen
Identify matching-preset orchestration and frozen dist tree  
*main*
- M `qa/capture-phase2-matched.cjs`

### `391af9ee5e` 2026-11-11 · Karmi Nguyen
Record 48 passing suites against frozen Phase 2 aiming fix  
*main*
- (2 evidence files under design/)

### `b4be642f81` 2026-11-11 · Karmi Nguyen
Preserve native render-target previews during visual time advances  
*main*
- M `qa/capture-phase2.cjs`

### `0fefc6f1e2` 2026-11-11 · Karmi Nguyen
Expose Cerberus target before touch firing  
*main*
- M `qa/browser/armory.cjs`

### `fe4c8eb37e` 2026-11-11 · Karmi Nguyen
Retain battlefield after real death commands for aftermath captures  
*main*
- M `docs/phase2-visual-review.md`
- M `qa/capture-phase2.cjs`

### `a4fc0ac64c` 2026-11-11 · Karmi Nguyen
Allow source-scoped capture coverage while a weapon fix is held  
*main*
- M `qa/capture-phase2.cjs`

### `cc714b3cda` 2026-11-11 · Karmi Nguyen
Capture naturally emitted critical fault variants after real damage  
*main*
- A `qa/capture-phase2-faults.cjs`
- M `qa/capture-phase2.cjs`

### `c70020f620` 2026-11-11 · Karmi Nguyen
Record Phase 1 visual and verification evidence  
*main*
- A `design/phase1/reviewed-20261111/independent-review.md`
- A `design/phase1/reviewed-20261111/verification/README.md`
- M `docs/renderer-progress.json`
- A `qa/assemble-phase1.py`
- (195 evidence files under design/)

### `2426326abf` 2026-11-11 · Karmi Phuc · merge
Merge pull request #18 from karmiphuc/renderer/phase1  
*main*

### `d3c94f10b6` 2026-11-11 · Karmi Nguyen
Verify saved visual hashes and assemble source-scoped contact overviews  
*main*
- A `qa/summarize-phase2-visuals.cjs`

### `d913b7461b` 2026-11-11 · Karmi Nguyen
Review and smoke test hangar fixture  
*unmerged: renderer/phase4*
- M `dist/scene/hangar-fixture.js`
- M `dist/scene/hangar.js`
- M `docs/phase4-hangar-preparation.md`
- A `qa/hangar-fixture-smoke.cjs`
- (1 evidence files under design/)

### `10f301b6c6` 2026-11-11 · Karmi Nguyen
Checkpoint source-scoped combat, status, touch and natural fault evidence  
*main*
- M `docs/phase2-visual-review.md`
- (146 evidence files under design/)

### `93e8812e7d` 2026-11-11 · Karmi Nguyen
Prepare actual-command captures from recorded campaign preattack state  
*main*
- A `qa/capture-phase2-regression.cjs`

### `25b3f03e35` 2026-11-11 · Karmi Nguyen
Support actual enemy engagement that triggers a captured counter  
*main*
- M `qa/capture-phase2-regression.cjs`

### `0b025ff5b4` 2026-11-11 · Karmi Nguyen
Replay observed rule rolls for faithful automatic counter evidence  
*main*
- M `qa/capture-phase2-regression.cjs`

### `287db825ac` 2026-11-11 · Karmi Nguyen
Remove unused state reconstruction in favor of a direct real-counter capture  
*main*
- D `qa/capture-phase2-regression.cjs`

### `16d82cae1a` 2026-11-11 · Karmi Nguyen
Scope final regression evidence to the actual replay counter event  
*main*
- M `docs/phase2-visual-review.md`

### `99f5594f77` 2026-11-11 · Karmi Nguyen
Archive the actual near Parallax counter frame and exact working source  
*main*
- M `docs/phase2-visual-review.md`
- (5 evidence files under design/)

### `6206060dcd` 2026-11-11 · Karmi Nguyen
Preserve exact observer code for the real automatic counter capture  
*main*
- (2 evidence files under design/)

### `bbb8c76b62` 2026-11-11 · Karmi Nguyen
Combine four disjoint formal campaign batches with strict coverage guards  
*main*
- M `qa/combine-scene.cjs`

### `fa9f83576f` 2026-11-11 · Karmi Nguyen
Preserve physical weapon clearance at close range  
*main*
- M `dist/foundry/scene-rigs.js`
- M `dist/scene/battle.js`
- M `dist/scene/environment.js`

### `95f97fb71b` 2026-11-11 · Karmi Nguyen
Document measured legal clearance and final Phase 2 source  
*main*
- M `docs/phase2-development.md`

### `5ea727c219` 2026-11-11 · Karmi Nguyen
Gate legal long-weapon clearance and preserve the real counter regression  
*main*
- M `qa/README.md`
- M `qa/check-production-weapons.cjs`
- M `qa/check-scene.cjs`
- A `qa/fixtures/phase2-aim-clearance.json`
- (4 evidence files under design/)

### `b802d8599a` 2026-11-11 · Karmi Nguyen · merge
Merge remote-tracking branch 'origin/main' into renderer/phase2  
*main*

### `02ef40a07f` 2026-11-11 · Karmi Nguyen
docs: reconcile requirements with final clearance runtime  
*main*
- M `docs/phase2-requirements-review.md`

### `fb1bf4b5e1` 2026-11-11 · Karmi Nguyen
Compare the native weapon Workshop preview with the reviewed baseline  
*main*
- M `qa/capture-phase2-matched.cjs`

### `1119a2c7d5` 2026-11-11 · Karmi Nguyen
Record final immutable thirty-battle campaign and physical firing proof  
*main*
- (11 evidence files under design/)

### `bd1f43c6d2` 2026-11-11 · Karmi Nguyen
Record final weapon execution, GPU recovery and Phase 2 acceptance evidence  
*main*
- M `docs/phase2-development.md`
- M `docs/phase2-requirements-review.md`
- M `docs/renderer-progress.json`
- (6 evidence files under design/)

### `f4834ecb6e` 2026-11-11 · Karmi Nguyen
Document completed Phase 2 gates and four-batch verification workflow  
*main*
- M `docs/renderer-progress.json`
- M `qa/README.md`

### `e0c7ede5ea` 2026-11-11 · Karmi Nguyen
Finalize reviewed Phase 2 GPU, UI and counter evidence  
*main*
- M `docs/phase2-visual-review.md`
- M `qa/capture-phase2-matched.cjs`
- (34 evidence files under design/)

### `968dfc68fb` 2026-11-11 · Karmi Phuc · merge
Merge pull request #21 from karmiphuc/renderer/phase2  
*main*

### `ad8bda4cbe` 2026-11-11 · Karmi Nguyen · merge
Merge remote-tracking branch 'origin/main' into renderer/phase3  
*unmerged: renderer/phase3*

### `895f04dfa9` 2026-11-11 · Karmi Nguyen · merge
Merge remote-tracking branch 'origin/main' into renderer/phase4  
*unmerged: renderer/phase4*

### `57d854f68e` 2026-11-11 · Karmi Nguyen
Require GitHub backup after every completed phase  
*main*
- M `AGENTS.md`

### `4506c21520` 2026-11-11 · Karmi Nguyen · merge
Merge remote-tracking branch 'origin/main' into renderer/phase4  
*unmerged: renderer/phase4*

### `0628a34ff0` 2026-11-11 · Karmi Nguyen · merge
Merge remote-tracking branch 'origin/main' into renderer/phase3  
*unmerged: renderer/phase3*

### `db5fdde428` 2026-11-11 · Karmi Nguyen
Make hangar roster navigable from overview  
*unmerged: renderer/phase4*
- M `dist/scene/hangar-fixture.html`
- M `dist/scene/hangar.js`

### `c071118e76` 2026-11-11 · Karmi Nguyen
Reject rig nodes outside default scene  
*unmerged: renderer/phase3*
- M `qa/check-rig-v2-test.cjs`
- M `qa/check-rig-v2.cjs`

### `93bbcda53f` 2026-11-11 · Karmi Nguyen
Extract live hangar rig catalog  
*unmerged: renderer/phase4*
- A `dist/scene/hangar-catalog.js`
- M `dist/scene/hangar-fixture.js`

### `efe9876675` 2026-11-11 · Karmi Nguyen
Load hangar fixture weapon dependencies  
*unmerged: renderer/phase4*
- M `dist/scene/hangar-fixture.html`

### `2003639128` 2026-11-11 · Karmi Nguyen
Guard unarmed hangar loadouts  
*unmerged: renderer/phase4*
- M `dist/scene/hangar-catalog.js`

### `f2226fbab1` 2026-11-11 · Karmi Nguyen
Add hangar catalog lifecycle resource checks  
*unmerged: renderer/phase4*
- A `qa/check-hangar-catalog.cjs`

### `842f081d85` 2026-11-11 · Karmi Nguyen
Place active rigs on hangar pads  
*unmerged: renderer/phase4*
- M `dist/scene/hangar.js`

### `7435c30c20` 2026-11-11 · Karmi Nguyen
Match equipped hangar carry poses  
*unmerged: renderer/phase4*
- M `dist/scene/hangar-catalog.js`

### `a11ddcca46` 2026-11-11 · Karmi Nguyen
Assert real hangar fixture interactions and GPU recovery  
*unmerged: renderer/phase4*
- M `qa/hangar-fixture-smoke.cjs`

### `0a31461237` 2026-11-11 · Karmi Nguyen
Scope rig names to the default scene  
*unmerged: renderer/phase3*
- M `qa/check-rig-v2-test.cjs`
- M `qa/check-rig-v2.cjs`

### `21e5b7d120` 2026-11-11 · Karmi Nguyen
Record focused hangar pointer and GPU recovery evidence  
*unmerged: renderer/phase4*
- A `design/phase4/fixture-smoke-20261111/README.md`
- (4 evidence files under design/)

### `63ad7cec56` 2026-11-11 · Karmi Nguyen
Prepare career roster bridge for hangar  
*unmerged: renderer/phase4*
- A `dist/scene/hangar-roster.js`
- M `docs/phase4-hangar-preparation.md`

### `48a0fdbdbe` 2026-11-11 · Karmi Nguyen
Verify read-only career hangar roster mapping  
*unmerged: renderer/phase4*
- A `qa/check-hangar-roster.cjs`

### `1ec2403ac6` 2026-11-11 · Karmi Nguyen
Record focused hangar recovery and roster preparation results  
*unmerged: renderer/phase4*
- M `docs/phase4-hangar-preparation.md`

### `a78ec2b608` 2026-11-11 · Karmi Nguyen
Document active-scene rig validation regressions  
*unmerged: renderer/phase3*
- M `docs/phase3-export-gate.md`

### `021ea2caa2` 2026-11-12 · Claude
Add pace and evidence rules for renderer phases  
*unmerged: claude/agents-pace-rules*
- M `AGENTS.md`

### `a1a9b7f0a4` 2026-11-12 · Karmi Nguyen
Sites v98 source (history rewritten 2026-11-12)  
*unmerged: rewrite/claude/agents-pace-rules, rewrite/main, rewrite/renderer/phase3, rewrite/renderer/phase4, rewrite/sites-v98*
- A `.gitignore`
- A `.openai/hosting.json`
- A `AGENTS.md`
- A `README.md`
- A `check.cjs`
- A `design-qa.md`
- A `design/release-notes.md`
- A `design/visual-target.md`
- A `dist/aero-strikes.js`
- A `dist/armory-visuals.js`
- A `dist/arsenal-visuals.js`
- A `dist/assets/aegis-0-disarmed-parts.webp`
- A `dist/assets/aegis-0-disarmed.webp`
- A `dist/assets/aegis-0-full-parts.webp`
- A `dist/assets/aegis-0-full.webp`
- A `dist/assets/aegis-0-left-down-parts.webp`
- A `dist/assets/aegis-0-left-down.webp`
- A `dist/assets/aegis-0-right-down-parts.webp`
- A `dist/assets/aegis-0-right-down.webp`
- A `dist/assets/aegis-1-disarmed-parts.webp`
- A `dist/assets/aegis-1-disarmed.webp`
- A `dist/assets/aegis-1-full-parts.webp`
- A `dist/assets/aegis-1-full.webp`
- A `dist/assets/aegis-1-left-down-parts.webp`
- A `dist/assets/aegis-1-left-down.webp`
- A `dist/assets/aegis-1-right-down-parts.webp`
- A `dist/assets/aegis-1-right-down.webp`
- A `dist/assets/aegis-2-disarmed-parts.webp`
- A `dist/assets/aegis-2-disarmed.webp`
- A `dist/assets/aegis-2-full-parts.webp`
- A `dist/assets/aegis-2-full.webp`
- A `dist/assets/aegis-2-left-down-parts.webp`
- A `dist/assets/aegis-2-left-down.webp`
- A `dist/assets/aegis-2-right-down-parts.webp`
- A `dist/assets/aegis-2-right-down.webp`
- A `dist/assets/aegis-3-disarmed-parts.webp`
- A `dist/assets/aegis-3-disarmed.webp`
- A `dist/assets/aegis-3-full-parts.webp`
- A `dist/assets/aegis-3-full.webp`
- A `dist/assets/aegis-3-left-down-parts.webp`
- A `dist/assets/aegis-3-left-down.webp`
- A `dist/assets/aegis-3-right-down-parts.webp`
- A `dist/assets/aegis-3-right-down.webp`
- A `dist/assets/aegis-idle-parts.webp`
- A `dist/assets/aegis-idle.webp`
- A `dist/assets/aegis-walk-d0-disarmed-parts.webp`
- A `dist/assets/aegis-walk-d0-disarmed.webp`
- A `dist/assets/aegis-walk-d0-full-parts.webp`
- A `dist/assets/aegis-walk-d0-full.webp`
- A `dist/assets/aegis-walk-d0-left-down-parts.webp`
- A `dist/assets/aegis-walk-d0-left-down.webp`
- A `dist/assets/aegis-walk-d0-right-down-parts.webp`
- A `dist/assets/aegis-walk-d0-right-down.webp`
- A `dist/assets/aegis-walk-d1-disarmed-parts.webp`
- A `dist/assets/aegis-walk-d1-disarmed.webp`
- A `dist/assets/aegis-walk-d1-full-parts.webp`
- A `dist/assets/aegis-walk-d1-full.webp`
- A `dist/assets/aegis-walk-d1-left-down-parts.webp`
- A `dist/assets/aegis-walk-d1-left-down.webp`
- A `dist/assets/aegis-walk-d1-right-down-parts.webp`
- A `dist/assets/aegis-walk-d1-right-down.webp`
- A `dist/assets/aegis-walk-d2-disarmed-parts.webp`
- A `dist/assets/aegis-walk-d2-disarmed.webp`
- A `dist/assets/aegis-walk-d2-full-parts.webp`
- A `dist/assets/aegis-walk-d2-full.webp`
- A `dist/assets/aegis-walk-d2-left-down-parts.webp`
- A `dist/assets/aegis-walk-d2-left-down.webp`
- A `dist/assets/aegis-walk-d2-right-down-parts.webp`
- A `dist/assets/aegis-walk-d2-right-down.webp`
- A `dist/assets/aegis-walk-d3-disarmed-parts.webp`
- A `dist/assets/aegis-walk-d3-disarmed.webp`
- A `dist/assets/aegis-walk-d3-full-parts.webp`
- A `dist/assets/aegis-walk-d3-full.webp`
- A `dist/assets/aegis-walk-d3-left-down-parts.webp`
- A `dist/assets/aegis-walk-d3-left-down.webp`
- A `dist/assets/aegis-walk-d3-right-down-parts.webp`
- A `dist/assets/aegis-walk-d3-right-down.webp`
- A `dist/assets/aero-blade-parts.webp`
- A `dist/assets/aero-blade.webp`
- A `dist/assets/aero-breaker-parts.webp`
- A `dist/assets/aero-breaker.webp`
- A `dist/assets/aero-cleaver-parts.webp`
- A `dist/assets/aero-cleaver.webp`
- A `dist/assets/aero-motion-parts.webp`
- A `dist/assets/aero-motion.webp`
- A `dist/assets/aero-piledriver-parts.webp`
- A `dist/assets/aero-piledriver.webp`
- A `dist/assets/aero-walk-parts.webp`
- A `dist/assets/aero-walk.webp`
- A `dist/assets/armory-anchor-hammer-left-impact.webp`
- A `dist/assets/armory-anchor-hammer-left.webp`
- A `dist/assets/armory-anchor-hammer-right-impact.webp`
- A `dist/assets/armory-anchor-hammer-right.webp`
- A `dist/assets/armory-bulwark-shield-left.webp`
- A `dist/assets/armory-bulwark-shield-right.webp`
- A `dist/assets/armory-cerberus-left.webp`
- A `dist/assets/armory-cerberus-right.webp`
- A `dist/assets/armory-citadel-shield-left.webp`
- A `dist/assets/armory-citadel-shield-right.webp`
- A `dist/assets/armory-ember-left.webp`
- A `dist/assets/armory-ember-right.webp`
- A `dist/assets/armory-falcon-left.webp`
- A `dist/assets/armory-falcon-right.webp`
- A `dist/assets/armory-forge-left.webp`
- A `dist/assets/armory-forge-right.webp`
- A `dist/assets/armory-hatchet-left.webp`
- A `dist/assets/armory-hatchet-right.webp`
- A `dist/assets/armory-obelisk-left.webp`
- A `dist/assets/armory-obelisk-right.webp`
- A `dist/assets/armory-parallax-left-charge.webp`
- A `dist/assets/armory-parallax-left-charged.webp`
- A `dist/assets/armory-parallax-left-kick.webp`
- A `dist/assets/armory-parallax-left.webp`
- A `dist/assets/armory-parallax-right-charge.webp`
- A `dist/assets/armory-parallax-right-charged.webp`
- A `dist/assets/armory-parallax-right-kick.webp`
- A `dist/assets/armory-parallax-right.webp`
- A `dist/assets/armory-pike-left-impact.webp`
- A `dist/assets/armory-pike-left.webp`
- A `dist/assets/armory-pike-right-impact.webp`
- A `dist/assets/armory-pike-right.webp`
- A `dist/assets/armory-rivet-left-feed.webp`
- A `dist/assets/armory-rivet-left-kick.webp`
- A `dist/assets/armory-rivet-left.webp`
- A `dist/assets/armory-rivet-right-feed.webp`
- A `dist/assets/armory-rivet-right-kick.webp`
- A `dist/assets/armory-rivet-right.webp`
- A `dist/assets/armory-sidewinder-left.webp`
- A `dist/assets/armory-sidewinder-right.webp`
- A `dist/assets/armory-tonfa-left.webp`
- A `dist/assets/armory-tonfa-right.webp`
- A `dist/assets/armory-trident-left.webp`
- A `dist/assets/armory-trident-right.webp`
- A `dist/assets/armory-watchman-left.webp`
- A `dist/assets/armory-watchman-right.webp`
- A `dist/assets/arsenal-breaker-left.webp`
- A `dist/assets/arsenal-breaker-right.webp`
- A `dist/assets/arsenal-cleaver-left.webp`
- A `dist/assets/arsenal-cleaver-right.webp`
- A `dist/assets/arsenal-hailstorm-left.webp`
- A `dist/assets/arsenal-hailstorm-right.webp`
- A `dist/assets/arsenal-missile-left.webp`
- A `dist/assets/arsenal-missile-right.webp`
- A `dist/assets/arsenal-piledriver-left-extended.webp`
- A `dist/assets/arsenal-piledriver-left.webp`
- A `dist/assets/arsenal-piledriver-right-extended.webp`
- A `dist/assets/arsenal-piledriver-right.webp`
- A `dist/assets/arsenal-rail-left.webp`
- A `dist/assets/arsenal-rail-right.webp`
- A `dist/assets/arsenal-rampart-left.webp`
- A `dist/assets/arsenal-rampart-right.webp`
- A `dist/assets/arsenal-rifle-left.webp`
- A `dist/assets/arsenal-rifle-right.webp`
- A `dist/assets/arsenal-shotgun-left.webp`
- A `dist/assets/arsenal-shotgun-right.webp`
- A `dist/assets/ashigaru-combat-parts.webp`
- A `dist/assets/ashigaru-combat.webp`
- A `dist/assets/ashigaru.webp`
- A `dist/assets/audio/armor-hit.wav`
- A `dist/assets/audio/cannon-report.wav`
- A `dist/assets/audio/credits.txt`
- A `dist/assets/audio/hangar-score.mp3`
- A `dist/assets/audio/heavy-hit.wav`
- A `dist/assets/audio/mech-arm.wav`
- A `dist/assets/audio/mech-boot.wav`
- A `dist/assets/audio/mech-foot-a.wav`
- A `dist/assets/audio/mech-foot-b.wav`
- A `dist/assets/audio/mech-foot-heavy.wav`
- A `dist/assets/audio/mech-idle.wav`
- A `dist/assets/audio/mech-servo.wav`
- A `dist/assets/audio/mech-vent.wav`
- A `dist/assets/audio/missile-hit.wav`
- A `dist/assets/audio/mission-score.mp3`
- A `dist/assets/audio/plate-strike.wav`
- A `dist/assets/audio/pod-arm.wav`
- A `dist/assets/audio/rail-report.wav`
- A `dist/assets/audio/rifle-report.wav`
- A `dist/assets/audio/rocket-launch.wav`
- A `dist/assets/audio/rotary-report.wav`
- A `dist/assets/audio/shield-strike.wav`
- A `dist/assets/audio/shotgun-report.wav`
- A `dist/assets/barricade.webp`
- A `dist/assets/basilisk-base.webp`
- A `dist/assets/basilisk-chassis-left-attack-paint.webp`
- A `dist/assets/basilisk-chassis-left-attack-parts.webp`
- A `dist/assets/basilisk-chassis-left-attack.webp`
- A `dist/assets/basilisk-chassis-left-motion-paint.webp`
- A `dist/assets/basilisk-chassis-left-motion-parts.webp`
- A `dist/assets/basilisk-chassis-left-motion.webp`
- A `dist/assets/basilisk-chassis-left-paint.webp`
- A `dist/assets/basilisk-chassis-left-parts.webp`
- A `dist/assets/basilisk-chassis-left.webp`
- A `dist/assets/basilisk-chassis-right-attack-paint.webp`
- A `dist/assets/basilisk-chassis-right-attack-parts.webp`
- A `dist/assets/basilisk-chassis-right-attack.webp`
- A `dist/assets/basilisk-chassis-right-motion-paint.webp`
- A `dist/assets/basilisk-chassis-right-motion-parts.webp`
- A `dist/assets/basilisk-chassis-right-motion.webp`
- A `dist/assets/basilisk-chassis-right-paint.webp`
- A `dist/assets/basilisk-chassis-right-parts.webp`
- A `dist/assets/basilisk-chassis-right.webp`
- A `dist/assets/basilisk.webp`
- A `dist/assets/bastion-bst04-parts.webp`
- A `dist/assets/bastion-bst04.webp`
- A `dist/assets/cicada-combat-left-motion-paint.webp`
- A `dist/assets/cicada-combat-left-motion-parts.webp`
- A `dist/assets/cicada-combat-left-motion.webp`
- A `dist/assets/cicada-combat-left-paint.webp`
- A `dist/assets/cicada-combat-left-parts.webp`
- A `dist/assets/cicada-combat-left.webp`
- A `dist/assets/cicada-combat-right-motion-paint.webp`
- A `dist/assets/cicada-combat-right-motion-parts.webp`
- A `dist/assets/cicada-combat-right-motion.webp`
- A `dist/assets/cicada-combat-right-paint.webp`
- A `dist/assets/cicada-combat-right-parts.webp`
- A `dist/assets/cicada-combat-right.webp`
- A `dist/assets/concrete.webp`
- A `dist/assets/contract-corridor.webp`
- A `dist/assets/contract-frontier.webp`
- A `dist/assets/contract-relay.webp`
- A `dist/assets/cover-bunker.webp`
- A `dist/assets/cover-cargo.webp`
- A `dist/assets/cover-conifer.webp`
- A `dist/assets/cover-relay-shield.webp`
- A `dist/assets/cover-ridge-rock.webp`
- A `dist/assets/cover-transformer.webp`
- A `dist/assets/fonts/Barlow-OFL.txt`
- A `dist/assets/fonts/Inter-OFL.txt`
- A `dist/assets/fonts/barlow-400.woff2`
- A `dist/assets/fonts/barlow-500.woff2`
- A `dist/assets/fonts/barlow-600.woff2`
- A `dist/assets/fonts/barlow-700.woff2`
- A `dist/assets/fonts/inter-100-900.woff2`
- A `dist/assets/foundry-0-back-fit-paint.webp`
- A `dist/assets/foundry-0-back-fit.webp`
- A `dist/assets/foundry-0-back.webp`
- A `dist/assets/foundry-0-fit-paint.webp`
- A `dist/assets/foundry-0-fit.webp`
- A `dist/assets/foundry-0-front.webp`
- A `dist/assets/foundry-0-hip.webp`
- A `dist/assets/foundry-0-motion-paint.webp`
- A `dist/assets/foundry-0-motion-parts.webp`
- A `dist/assets/foundry-0-motion.webp`
- A `dist/assets/foundry-0-other-side-fit-paint.webp`
- A `dist/assets/foundry-0-other-side-fit.webp`
- A `dist/assets/foundry-0-other-side.webp`
- A `dist/assets/foundry-0-side-fit-paint.webp`
- A `dist/assets/foundry-0-side-fit.webp`
- A `dist/assets/foundry-0-side.webp`
- A `dist/assets/foundry-0.webp`
- A `dist/assets/foundry-1-back-fit-paint.webp`
- A `dist/assets/foundry-1-back-fit.webp`
- A `dist/assets/foundry-1-back.webp`
- A `dist/assets/foundry-1-fit-paint.webp`
- A `dist/assets/foundry-1-fit.webp`
- A `dist/assets/foundry-1-front.webp`
- A `dist/assets/foundry-1-hip.webp`
- A `dist/assets/foundry-1-motion-paint.webp`
- A `dist/assets/foundry-1-motion-parts.webp`
- A `dist/assets/foundry-1-motion.webp`
- A `dist/assets/foundry-1-other-side-fit-paint.webp`
- A `dist/assets/foundry-1-other-side-fit.webp`
- A `dist/assets/foundry-1-other-side.webp`
- A `dist/assets/foundry-1-side-fit-paint.webp`
- A `dist/assets/foundry-1-side-fit.webp`
- A `dist/assets/foundry-1-side.webp`
- A `dist/assets/foundry-1.webp`
- A `dist/assets/foundry-10-death-0-parts.webp`
- A `dist/assets/foundry-10-death-0.webp`
- A `dist/assets/foundry-10-death-1-parts.webp`
- A `dist/assets/foundry-10-death-1.webp`
- A `dist/assets/foundry-10-death-2-parts.webp`
- A `dist/assets/foundry-10-death-2.webp`
- A `dist/assets/foundry-10-death-3-parts.webp`
- A `dist/assets/foundry-10-death-3.webp`
- A `dist/assets/foundry-10-parts.webp`
- A `dist/assets/foundry-10.webp`
- A `dist/assets/foundry-11-death-parts.webp`
- A `dist/assets/foundry-11-death.webp`
- A `dist/assets/foundry-11.webp`
- A `dist/assets/foundry-12-death-parts.webp`
- A `dist/assets/foundry-12-death.webp`
- A `dist/assets/foundry-2-back-fit-paint.webp`
- A `dist/assets/foundry-2-back-fit.webp`
- A `dist/assets/foundry-2-back.webp`
- A `dist/assets/foundry-2-fit-paint.webp`
- A `dist/assets/foundry-2-fit.webp`
- A `dist/assets/foundry-2-front.webp`
- A `dist/assets/foundry-2-hip.webp`
- A `dist/assets/foundry-2-motion-paint.webp`
- A `dist/assets/foundry-2-motion-parts.webp`
- A `dist/assets/foundry-2-motion.webp`
- A `dist/assets/foundry-2-other-side-fit-paint.webp`
- A `dist/assets/foundry-2-other-side-fit.webp`
- A `dist/assets/foundry-2-other-side.webp`
- A `dist/assets/foundry-2-side-fit-paint.webp`
- A `dist/assets/foundry-2-side-fit.webp`
- A `dist/assets/foundry-2-side.webp`
- A `dist/assets/foundry-2.webp`
- A `dist/assets/foundry-3-back-fit-paint.webp`
- A `dist/assets/foundry-3-back-fit.webp`
- A `dist/assets/foundry-3-back.webp`
- A `dist/assets/foundry-3-fit-paint.webp`
- A `dist/assets/foundry-3-fit.webp`
- A `dist/assets/foundry-3-front.webp`
- A `dist/assets/foundry-3-hip.webp`
- A `dist/assets/foundry-3-motion-paint.webp`
- A `dist/assets/foundry-3-motion-parts.webp`
- A `dist/assets/foundry-3-motion.webp`
- A `dist/assets/foundry-3-other-side-fit-paint.webp`
- A `dist/assets/foundry-3-other-side-fit.webp`
- A `dist/assets/foundry-3-other-side.webp`
- A `dist/assets/foundry-3-side-fit-paint.webp`
- A `dist/assets/foundry-3-side-fit.webp`
- A `dist/assets/foundry-3-side.webp`
- A `dist/assets/foundry-3.webp`
- A `dist/assets/foundry-4-back-fit-paint.webp`
- A `dist/assets/foundry-4-back-fit.webp`
- A `dist/assets/foundry-4-back.webp`
- A `dist/assets/foundry-4-fit-paint.webp`
- A `dist/assets/foundry-4-fit.webp`
- A `dist/assets/foundry-4-front.webp`
- A `dist/assets/foundry-4-hip.webp`
- A `dist/assets/foundry-4-motion-paint.webp`
- A `dist/assets/foundry-4-motion-parts.webp`
- A `dist/assets/foundry-4-motion.webp`
- A `dist/assets/foundry-4-other-side-fit-paint.webp`
- A `dist/assets/foundry-4-other-side-fit.webp`
- A `dist/assets/foundry-4-other-side.webp`
- A `dist/assets/foundry-4-side-fit-paint.webp`
- A `dist/assets/foundry-4-side-fit.webp`
- A `dist/assets/foundry-4-side.webp`
- A `dist/assets/foundry-4.webp`
- A `dist/assets/foundry-5-back-fit-paint.webp`
- A `dist/assets/foundry-5-back-fit.webp`
- A `dist/assets/foundry-5-back.webp`
- A `dist/assets/foundry-5-fit-paint.webp`
- A `dist/assets/foundry-5-fit.webp`
- A `dist/assets/foundry-5-front.webp`
- A `dist/assets/foundry-5-hip.webp`
- A `dist/assets/foundry-5-motion-paint.webp`
- A `dist/assets/foundry-5-motion-parts.webp`
- A `dist/assets/foundry-5-motion.webp`
- A `dist/assets/foundry-5-other-side-fit-paint.webp`
- A `dist/assets/foundry-5-other-side-fit.webp`
- A `dist/assets/foundry-5-other-side.webp`
- A `dist/assets/foundry-5-side-fit-paint.webp`
- A `dist/assets/foundry-5-side-fit.webp`
- A `dist/assets/foundry-5-side.webp`
- A `dist/assets/foundry-5.webp`
- A `dist/assets/foundry-6-death-paint.webp`
- A `dist/assets/foundry-6-death-parts.webp`
- A `dist/assets/foundry-6-death.webp`
- A `dist/assets/foundry-6-front-paint.webp`
- A `dist/assets/foundry-6-front.webp`
- A `dist/assets/foundry-6-motion-paint.webp`
- A `dist/assets/foundry-6-motion-parts.webp`
- A `dist/assets/foundry-6-motion.webp`
- A `dist/assets/foundry-6-unarmed-paint.webp`
- A `dist/assets/foundry-6-unarmed-parts.webp`
- A `dist/assets/foundry-6-unarmed.webp`
- A `dist/assets/foundry-6-walk-paint.webp`
- A `dist/assets/foundry-6-walk-parts.webp`
- A `dist/assets/foundry-6-walk-unarmed-paint.webp`
- A `dist/assets/foundry-6-walk-unarmed-parts.webp`
- A `dist/assets/foundry-6-walk-unarmed.webp`
- A `dist/assets/foundry-6-walk.webp`
- A `dist/assets/foundry-6.webp`
- A `dist/assets/foundry-7-death-paint.webp`
- A `dist/assets/foundry-7-death-parts.webp`
- A `dist/assets/foundry-7-death.webp`
- A `dist/assets/foundry-7-front-paint.webp`
- A `dist/assets/foundry-7-front.webp`
- A `dist/assets/foundry-7-motion-paint.webp`
- A `dist/assets/foundry-7-motion-parts.webp`
- A `dist/assets/foundry-7-motion.webp`
- A `dist/assets/foundry-7-paint.webp`
- A `dist/assets/foundry-7-unarmed-paint.webp`
- A `dist/assets/foundry-7-unarmed-parts.webp`
- A `dist/assets/foundry-7-unarmed.webp`
- A `dist/assets/foundry-7-walk-paint.webp`
- A `dist/assets/foundry-7-walk-parts.webp`
- A `dist/assets/foundry-7-walk-unarmed-paint.webp`
- A `dist/assets/foundry-7-walk-unarmed-parts.webp`
- A `dist/assets/foundry-7-walk-unarmed.webp`
- A `dist/assets/foundry-7-walk.webp`
- A `dist/assets/foundry-7.webp`
- A `dist/assets/foundry-8-death-parts.webp`
- A `dist/assets/foundry-8-death.webp`
- A `dist/assets/foundry-8-disarmed-parts.webp`
- A `dist/assets/foundry-8-disarmed.webp`
- A `dist/assets/foundry-8-left-down-parts.webp`
- A `dist/assets/foundry-8-left-down.webp`
- A `dist/assets/foundry-8-motion-parts.webp`
- A `dist/assets/foundry-8-motion.webp`
- A `dist/assets/foundry-8-right-down-parts.webp`
- A `dist/assets/foundry-8-right-down.webp`
- A `dist/assets/foundry-8-walk-disarmed-parts.webp`
- A `dist/assets/foundry-8-walk-disarmed.webp`
- A `dist/assets/foundry-8-walk-full-parts.webp`
- A `dist/assets/foundry-8-walk-full.webp`
- A `dist/assets/foundry-8-walk-left-down-parts.webp`
- A `dist/assets/foundry-8-walk-left-down.webp`
- A `dist/assets/foundry-8-walk-right-down-parts.webp`
- A `dist/assets/foundry-8-walk-right-down.webp`
- A `dist/assets/foundry-8.webp`
- A `dist/assets/foundry-9-death-parts.webp`
- A `dist/assets/foundry-9-death.webp`
- A `dist/assets/foundry-9.webp`
- A `dist/assets/foundry-modular.webp`
- A `dist/assets/foundry-raijin-right.webp`
- A `dist/assets/foundry-raijin.webp`
- A `dist/assets/gatecrasher-bare-combat-left-motion-paint.webp`
- A `dist/assets/gatecrasher-bare-combat-left-motion-parts.webp`
- A `dist/assets/gatecrasher-bare-combat-left-motion.webp`
- A `dist/assets/gatecrasher-bare-combat-left-paint.webp`
- A `dist/assets/gatecrasher-bare-combat-left-parts.webp`
- A `dist/assets/gatecrasher-bare-combat-left.webp`
- A `dist/assets/gatecrasher-bare-combat-right-motion-paint.webp`
- A `dist/assets/gatecrasher-bare-combat-right-motion-parts.webp`
- A `dist/assets/gatecrasher-bare-combat-right-motion.webp`
- A `dist/assets/gatecrasher-bare-combat-right-paint.webp`
- A `dist/assets/gatecrasher-bare-combat-right-parts.webp`
- A `dist/assets/gatecrasher-bare-combat-right.webp`
- A `dist/assets/gatecrasher-cleaver-combat-left-motion-paint.webp`
- A `dist/assets/gatecrasher-cleaver-combat-left-motion-parts.webp`
- A `dist/assets/gatecrasher-cleaver-combat-left-motion.webp`
- A `dist/assets/gatecrasher-cleaver-combat-left-paint.webp`
- A `dist/assets/gatecrasher-cleaver-combat-left-parts.webp`
- A `dist/assets/gatecrasher-cleaver-combat-left.webp`
- A `dist/assets/gatecrasher-cleaver-combat-right-motion-paint.webp`
- A `dist/assets/gatecrasher-cleaver-combat-right-motion-parts.webp`
- A `dist/assets/gatecrasher-cleaver-combat-right-motion.webp`
- A `dist/assets/gatecrasher-cleaver-combat-right-paint.webp`
- A `dist/assets/gatecrasher-cleaver-combat-right-parts.webp`
- A `dist/assets/gatecrasher-cleaver-combat-right.webp`
- A `dist/assets/gatecrasher-combat-left-motion-paint.webp`
- A `dist/assets/gatecrasher-combat-left-motion-parts.webp`
- A `dist/assets/gatecrasher-combat-left-motion.webp`
- A `dist/assets/gatecrasher-combat-left-paint.webp`
- A `dist/assets/gatecrasher-combat-left-parts.webp`
- A `dist/assets/gatecrasher-combat-left.webp`
- A `dist/assets/gatecrasher-combat-right-motion-paint.webp`
- A `dist/assets/gatecrasher-combat-right-motion-parts.webp`
- A `dist/assets/gatecrasher-combat-right-motion.webp`
- A `dist/assets/gatecrasher-combat-right-paint.webp`
- A `dist/assets/gatecrasher-combat-right-parts.webp`
- A `dist/assets/gatecrasher-combat-right.webp`
- A `dist/assets/gatecrasher-r2-combat-left-motion-paint.webp`
- A `dist/assets/gatecrasher-r2-combat-left-motion-parts.webp`
- A `dist/assets/gatecrasher-r2-combat-left-motion.webp`
- A `dist/assets/gatecrasher-r2-combat-left-paint.webp`
- A `dist/assets/gatecrasher-r2-combat-left-parts.webp`
- A `dist/assets/gatecrasher-r2-combat-left.webp`
- A `dist/assets/gatecrasher-r2-combat-right-motion-paint.webp`
- A `dist/assets/gatecrasher-r2-combat-right-motion-parts.webp`
- A `dist/assets/gatecrasher-r2-combat-right-motion.webp`
- A `dist/assets/gatecrasher-r2-combat-right-paint.webp`
- A `dist/assets/gatecrasher-r2-combat-right-parts.webp`
- A `dist/assets/gatecrasher-r2-combat-right.webp`
- A `dist/assets/gatecrasher-vesper-combat-left-motion-paint.webp`
- A `dist/assets/gatecrasher-vesper-combat-left-motion-parts.webp`
- A `dist/assets/gatecrasher-vesper-combat-left-motion.webp`
- A `dist/assets/gatecrasher-vesper-combat-left-paint.webp`
- A `dist/assets/gatecrasher-vesper-combat-left-parts.webp`
- A `dist/assets/gatecrasher-vesper-combat-left.webp`
- A `dist/assets/gatecrasher-vesper-combat-right-motion-paint.webp`
- A `dist/assets/gatecrasher-vesper-combat-right-motion-parts.webp`
- A `dist/assets/gatecrasher-vesper-combat-right-motion.webp`
- A `dist/assets/gatecrasher-vesper-combat-right-paint.webp`
- A `dist/assets/gatecrasher-vesper-combat-right-parts.webp`
- A `dist/assets/gatecrasher-vesper-combat-right.webp`
- A `dist/assets/grid-travel-basilisk-paint.webp`
- A `dist/assets/grid-travel-basilisk-parts.webp`
- A `dist/assets/grid-travel-basilisk.webp`
- A `dist/assets/grid-travel-cicada-paint.webp`
- A `dist/assets/grid-travel-cicada-parts.webp`
- A `dist/assets/grid-travel-cicada.webp`
- A `dist/assets/grid-travel-foundry-0-paint.webp`
- A `dist/assets/grid-travel-foundry-0-parts.webp`
- A `dist/assets/grid-travel-foundry-0.webp`
- A `dist/assets/grid-travel-foundry-1-paint.webp`
- A `dist/assets/grid-travel-foundry-1-parts.webp`
- A `dist/assets/grid-travel-foundry-1.webp`
- A `dist/assets/grid-travel-foundry-2-paint.webp`
- A `dist/assets/grid-travel-foundry-2-parts.webp`
- A `dist/assets/grid-travel-foundry-2.webp`
- A `dist/assets/grid-travel-foundry-3-paint.webp`
- A `dist/assets/grid-travel-foundry-3-parts.webp`
- A `dist/assets/grid-travel-foundry-3.webp`
- A `dist/assets/grid-travel-foundry-4-paint.webp`
- A `dist/assets/grid-travel-foundry-4-parts.webp`
- A `dist/assets/grid-travel-foundry-4.webp`
- A `dist/assets/grid-travel-foundry-5-paint.webp`
- A `dist/assets/grid-travel-foundry-5-parts.webp`
- A `dist/assets/grid-travel-foundry-5.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-0-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-0-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-0.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-1-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-1-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-1.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-2-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-2-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-2.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-3-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-3-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-bare-ground-3.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-0-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-0-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-0.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-1-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-1-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-1.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-2-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-2-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-2.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-3-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-3-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-cleaver-ground-3.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-0-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-0-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-0.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-1-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-1-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-1.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-2-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-2-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-2.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-3-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-3-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-ground-3.webp`
- A `dist/assets/grid-travel-gatecrasher-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-0-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-0-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-0.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-1-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-1-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-1.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-2-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-2-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-2.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-3-paint.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-3-parts.webp`
- A `dist/assets/grid-travel-gatecrasher-vesper-ground-3.webp`
- A `dist/assets/grid-travel-gatecrasher.webp`
- A `dist/assets/grid-travel-helicopter.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-0-paint.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-0-parts.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-0.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-1-paint.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-1-parts.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-1.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-2-paint.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-2-parts.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-2.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-3-paint.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-3-parts.webp`
- A `dist/assets/grid-travel-hellbreaker-ground-3.webp`
- A `dist/assets/grid-travel-hellbreaker-paint.webp`
- A `dist/assets/grid-travel-hellbreaker-parts.webp`
- A `dist/assets/grid-travel-hellbreaker.webp`
- A `dist/assets/grid-travel-kestrel-paint.webp`
- A `dist/assets/grid-travel-kestrel-parts.webp`
- A `dist/assets/grid-travel-kestrel.webp`
- A `dist/assets/grid-travel-tank.webp`
- A `dist/assets/grid-travel-warden-hands-paint.webp`
- A `dist/assets/grid-travel-warden-hands-parts.webp`
- A `dist/assets/grid-travel-warden-hands.webp`
- A `dist/assets/grid-travel-warden-paint.webp`
- A `dist/assets/grid-travel-warden-parts.webp`
- A `dist/assets/grid-travel-warden-stance-paint.webp`
- A `dist/assets/grid-travel-warden-stance.webp`
- A `dist/assets/grid-travel-warden.webp`
- A `dist/assets/ground-corridor.webp`
- A `dist/assets/ground-frontier.webp`
- A `dist/assets/ground-relay.webp`
- A `dist/assets/hangar.webp`
- A `dist/assets/hostile-helicopter-left.webp`
- A `dist/assets/hostile-helicopter-right.webp`
- A `dist/assets/hostile-tank-left.webp`
- A `dist/assets/hostile-tank-right.webp`
- A `dist/assets/icons/LICENSE.txt`
- A `dist/assets/icons/arrow-right.svg`
- A `dist/assets/icons/arrow-u-up-left.svg`
- A `dist/assets/icons/arrows-out-cardinal.svg`
- A `dist/assets/icons/binoculars.svg`
- A `dist/assets/icons/crosshair.svg`
- A `dist/assets/icons/first-aid-kit.svg`
- A `dist/assets/icons/info.svg`
- A `dist/assets/icons/lightning.svg`
- A `dist/assets/icons/shield-chevron.svg`
- A `dist/assets/icons/speaker-high.svg`
- A `dist/assets/icons/speaker-slash.svg`
- A `dist/assets/icons/wrench.svg`
- A `dist/assets/icons/x.svg`
- A `dist/assets/kestrel-base.webp`
- A `dist/assets/kestrel-chassis-left-attack-paint.webp`
- A `dist/assets/kestrel-chassis-left-attack-parts.webp`
- A `dist/assets/kestrel-chassis-left-attack.webp`
- A `dist/assets/kestrel-chassis-left-motion-paint.webp`
- A `dist/assets/kestrel-chassis-left-motion-parts.webp`
- A `dist/assets/kestrel-chassis-left-motion.webp`
- A `dist/assets/kestrel-chassis-left-paint.webp`
- A `dist/assets/kestrel-chassis-left-parts.webp`
- A `dist/assets/kestrel-chassis-left.webp`
- A `dist/assets/kestrel-chassis-right-attack-paint.webp`
- A `dist/assets/kestrel-chassis-right-attack-parts.webp`
- A `dist/assets/kestrel-chassis-right-attack.webp`
- A `dist/assets/kestrel-chassis-right-motion-paint.webp`
- A `dist/assets/kestrel-chassis-right-motion-parts.webp`
- A `dist/assets/kestrel-chassis-right-motion.webp`
- A `dist/assets/kestrel-chassis-right-paint.webp`
- A `dist/assets/kestrel-chassis-right-parts.webp`
- A `dist/assets/kestrel-chassis-right.webp`
- A `dist/assets/kestrel.webp`
- A `dist/assets/lion-breaker-left.webp`
- A `dist/assets/lion-breaker-right.webp`
- A `dist/assets/lion-cleaver-left.webp`
- A `dist/assets/lion-cleaver-right.webp`
- A `dist/assets/lion-hatchet-left.webp`
- A `dist/assets/lion-hatchet-right.webp`
- A `dist/assets/motion-preview.mp4`
- A `dist/assets/pilot-anchor.webp`
- A `dist/assets/pilot-ghost.webp`
- A `dist/assets/pilot-marshal.png`
- A `dist/assets/pilot-portraits.LICENSE.txt`
- A `dist/assets/pilot-retriever.png`
- A `dist/assets/pilot-rook.webp`
- A `dist/assets/pilot-sapper.png`
- A `dist/assets/pilot-scout.png`
- A `dist/assets/pilot-signal.png`
- A `dist/assets/reaver-bare-parts.webp`
- A `dist/assets/reaver-bare.webp`
- A `dist/assets/reaver-dual-parts.webp`
- A `dist/assets/reaver-dual.webp`
- A `dist/assets/reaver-front.webp`
- A `dist/assets/reaver-left-parts.webp`
- A `dist/assets/reaver-left.webp`
- A `dist/assets/reaver-right-parts.webp`
- A `dist/assets/reaver-right.webp`
- A `dist/assets/reaver-walk-bare-parts.webp`
- A `dist/assets/reaver-walk-bare.webp`
- A `dist/assets/reaver-walk-dual-parts.webp`
- A `dist/assets/reaver-walk-dual.webp`
- A `dist/assets/reaver-walk-left-parts.webp`
- A `dist/assets/reaver-walk-left.webp`
- A `dist/assets/reaver-walk-right-parts.webp`
- A `dist/assets/reaver-walk-right.webp`
- A `dist/assets/theater-tiles.webp`
- A `dist/assets/warden-base.webp`
- A `dist/assets/warden-chassis-left-attack-paint.webp`
- A `dist/assets/warden-chassis-left-attack-parts.webp`
- A `dist/assets/warden-chassis-left-attack.webp`
- A `dist/assets/warden-chassis-left-motion-paint.webp`
- A `dist/assets/warden-chassis-left-motion-parts.webp`
- A `dist/assets/warden-chassis-left-motion.webp`
- A `dist/assets/warden-chassis-left-paint.webp`
- A `dist/assets/warden-chassis-left-parts.webp`
- A `dist/assets/warden-chassis-left.webp`
- A `dist/assets/warden-chassis-right-attack-paint.webp`
- A `dist/assets/warden-chassis-right-attack-parts.webp`
- A `dist/assets/warden-chassis-right-attack.webp`
- A `dist/assets/warden-chassis-right-motion-paint.webp`
- A `dist/assets/warden-chassis-right-motion-parts.webp`
- A `dist/assets/warden-chassis-right-motion.webp`
- A `dist/assets/warden-chassis-right-paint.webp`
- A `dist/assets/warden-chassis-right-parts.webp`
- A `dist/assets/warden-chassis-right.webp`
- A `dist/assets/warden-detail-field-0-paint.webp`
- A `dist/assets/warden-detail-field-0.webp`
- A `dist/assets/warden-detail-field-1-paint.webp`
- A `dist/assets/warden-detail-field-1.webp`
- A `dist/assets/warden-detail-field-2-paint.webp`
- A `dist/assets/warden-detail-field-2.webp`
- A `dist/assets/warden-detail-field-3-paint.webp`
- A `dist/assets/warden-detail-field-3.webp`
- A `dist/assets/warden-detail-left-motion-paint.webp`
- A `dist/assets/warden-detail-left-motion.webp`
- A `dist/assets/warden-detail-left-paint.webp`
- A `dist/assets/warden-detail-left.webp`
- A `dist/assets/warden-detail-right-motion-paint.webp`
- A `dist/assets/warden-detail-right-motion.webp`
- A `dist/assets/warden-detail-right-paint.webp`
- A `dist/assets/warden-detail-right.webp`
- A `dist/assets/warden-hands-field-0-paint.webp`
- A `dist/assets/warden-hands-field-0-parts.webp`
- A `dist/assets/warden-hands-field-0.webp`
- A `dist/assets/warden-hands-field-1-paint.webp`
- A `dist/assets/warden-hands-field-1-parts.webp`
- A `dist/assets/warden-hands-field-1.webp`
- A `dist/assets/warden-hands-field-2-paint.webp`
- A `dist/assets/warden-hands-field-2-parts.webp`
- A `dist/assets/warden-hands-field-2.webp`
- A `dist/assets/warden-hands-field-3-paint.webp`
- A `dist/assets/warden-hands-field-3-parts.webp`
- A `dist/assets/warden-hands-field-3.webp`
- A `dist/assets/warden-hands-left-motion-paint.webp`
- A `dist/assets/warden-hands-left-motion-parts.webp`
- A `dist/assets/warden-hands-left-motion.webp`
- A `dist/assets/warden-hands-left-paint.webp`
- A `dist/assets/warden-hands-left-parts.webp`
- A `dist/assets/warden-hands-left-strike-paint.webp`
- A `dist/assets/warden-hands-left-strike-parts.webp`
- A `dist/assets/warden-hands-left-strike.webp`
- A `dist/assets/warden-hands-left.webp`
- A `dist/assets/warden-hands-right-motion-paint.webp`
- A `dist/assets/warden-hands-right-motion-parts.webp`
- A `dist/assets/warden-hands-right-motion.webp`
- A `dist/assets/warden-hands-right-paint.webp`
- A `dist/assets/warden-hands-right-parts.webp`
- A `dist/assets/warden-hands-right-strike-paint.webp`
- A `dist/assets/warden-hands-right-strike-parts.webp`
- A `dist/assets/warden-hands-right-strike.webp`
- A `dist/assets/warden-hands-right.webp`
- A `dist/assets/warden-hands-strike-0-paint.webp`
- A `dist/assets/warden-hands-strike-0-parts.webp`
- A `dist/assets/warden-hands-strike-0.webp`
- A `dist/assets/warden-hands-strike-1-paint.webp`
- A `dist/assets/warden-hands-strike-1-parts.webp`
- A `dist/assets/warden-hands-strike-1.webp`
- A `dist/assets/warden-hands-strike-2-paint.webp`
- A `dist/assets/warden-hands-strike-2-parts.webp`
- A `dist/assets/warden-hands-strike-2.webp`
- A `dist/assets/warden-hands-strike-3-paint.webp`
- A `dist/assets/warden-hands-strike-3-parts.webp`
- A `dist/assets/warden-hands-strike-3.webp`
- A `dist/assets/warden-rail-left-motion-parts.webp`
- A `dist/assets/warden-rail-left-motion.webp`
- A `dist/assets/warden-rail-left-parts.webp`
- A `dist/assets/warden-rail-left.webp`
- A `dist/assets/warden-rail-right-motion-parts.webp`
- A `dist/assets/warden-rail-right-motion.webp`
- A `dist/assets/warden-rail-right-parts.webp`
- A `dist/assets/warden-rail-right.webp`
- A `dist/assets/warden-rifle-left-motion-parts.webp`
- A `dist/assets/warden-rifle-left-motion.webp`
- A `dist/assets/warden-rifle-left-parts.webp`
- A `dist/assets/warden-rifle-left.webp`
- A `dist/assets/warden-rifle-right-motion-parts.webp`
- A `dist/assets/warden-rifle-right-motion.webp`
- A `dist/assets/warden-rifle-right-parts.webp`
- A `dist/assets/warden-rifle-right.webp`
- A `dist/assets/warden-rig-loop.webp`
- A `dist/assets/warden.webp`
- A `dist/assets/wreck-helicopter-left.webp`
- A `dist/assets/wreck-helicopter-right.webp`
- A `dist/assets/wreck-tank-left.webp`
- A `dist/assets/wreck-tank-right.webp`
- A `dist/chassis-part-masks.js`
- A `dist/fonts.css`
- A `dist/foundry/aegis-baked.js`
- A `dist/foundry/aero-baked.js`
- A `dist/foundry/ashigaru-baked.js`
- A `dist/foundry/baked.js`
- A `dist/foundry/bastion.js`
- A `dist/foundry/behemoth-core.js`
- A `dist/foundry/chassis.js`
- A `dist/foundry/production-arsenal.js`
- A `dist/foundry/renderer.js`
- A `dist/foundry/rig-motion.js`
- A `dist/foundry/roster-destruction.js`
- A `dist/foundry/studio.html`
- A `dist/foundry/vanguard-baked.js`
- A `dist/foundry/walk.js`
- A `dist/foundry/warden-live.js`
- A `dist/game.js`
- A `dist/grid-travel-visuals.js`
- A `dist/index.html`
- A `dist/lion-art.js`
- A `dist/prototype-combat.js`
- A `dist/rig-bench/CREDITS.md`
- A `dist/rig-bench/aero.css`
- A `dist/rig-bench/aero.html`
- A `dist/rig-bench/aero.js`
- A `dist/rig-bench/basilisk.glb`
- A `dist/rig-bench/bastion-bst04.glb`
- A `dist/rig-bench/bastion-carbine.glb`
- A `dist/rig-bench/bastion-melee.glb`
- A `dist/rig-bench/expansion-weapons-manifest.json`
- A `dist/rig-bench/expansion-weapons.glb`
- A `dist/rig-bench/index.html`
- A `dist/rig-bench/kestrel.glb`
- A `dist/rig-bench/painted-warden.js`
- A `dist/rig-bench/prototypes/bay.css`
- A `dist/rig-bench/prototypes/bay.js`
- A `dist/rig-bench/prototypes/bulwark.glb`
- A `dist/rig-bench/prototypes/bulwark.webp`
- A `dist/rig-bench/prototypes/cicada.glb`
- A `dist/rig-bench/prototypes/cicada.webp`
- A `dist/rig-bench/prototypes/gatecrasher.glb`
- A `dist/rig-bench/prototypes/gatecrasher.webp`
- A `dist/rig-bench/prototypes/hellbreaker.glb`
- A `dist/rig-bench/prototypes/hellbreaker.webp`
- A `dist/rig-bench/prototypes/index.html`
- A `dist/rig-bench/prototypes/scout.glb`
- A `dist/rig-bench/prototypes/scout.webp`
- A `dist/rig-bench/rig-motion.js`
- A `dist/rig-bench/shields.glb`
- A `dist/rig-bench/vendor/GLTFLoader.js`
- A `dist/rig-bench/vendor/LICENSE.txt`
- A `dist/rig-bench/vendor/meshopt-decoder-LICENSE.md`
- A `dist/rig-bench/vendor/meshopt-decoder.js`
- A `dist/rig-bench/vendor/three.min.js`
- A `dist/rig-bench/warden-painted-motion.json`
- A `dist/rig-bench/warden-painted.glb`
- A `dist/rig-bench/warden.glb`
- A `dist/rig-bench/weapons.glb`
- A `dist/shield-visuals.js`
- A `dist/style.css`
- A `dist/theater-layouts.js`
- A `dist/warden-fidelity.js`
- A `dist/warden-visuals.js`
- A `docs/canvas-rendering-reference.json`
- A `docs/sites-export.json`
- A `package-lock.json`
- A `package.json`
- A `qa/README.md`
- A `qa/browser/aero.cjs`
- A `qa/browser/armory.cjs`
- A `qa/browser/ashigaru.cjs`
- A `qa/browser/attack-exchange.cjs`
- A `qa/browser/bastion.cjs`
- A `qa/browser/bulwark-bench.cjs`
- A `qa/browser/bulwark-combat.cjs`
- A `qa/browser/campaign.cjs`
- A `qa/browser/canvas-toning.cjs`
- A `qa/browser/career-tabs.cjs`
- A `qa/browser/chassis-scale.cjs`
- A `qa/browser/duty-roster.cjs`
- A `qa/browser/gatecrasher-armed.cjs`
- A `qa/browser/hangar.cjs`
- A `qa/browser/impact.cjs`
- A `qa/browser/infantry-carry.cjs`
- A `qa/browser/infantry-destruction.cjs`
- A `qa/browser/line-elite.cjs`
- A `qa/browser/line-infantry.cjs`
- A `qa/browser/lion-trial.cjs`
- A `qa/browser/live-warden.cjs`
- A `qa/browser/mech-computer.cjs`
- A `qa/browser/move-preview.cjs`
- A `qa/browser/paint.cjs`
- A `qa/browser/paired-walk.cjs`
- A `qa/browser/part-masks.cjs`
- A `qa/browser/reaver.cjs`
- A `qa/browser/ridge-combat.cjs`
- A `qa/browser/roster-destruction.cjs`
- A `qa/browser/scout-bench.cjs`
- A `qa/browser/shields.cjs`
- A `qa/browser/ship.cjs`
- A `qa/browser/terrain.cjs`
- A `qa/browser/vanguard.cjs`
- A `qa/browser/volley.cjs`
- A `qa/browser/warden-melee.cjs`
- A `qa/browser/warden-rig-bench.cjs`
- A `qa/browser/warden.cjs`
- A `qa/check-aero.cjs`
- A `qa/check-animation.cjs`
- A `qa/check-arsenal.cjs`
- A `qa/check-ashigaru.cjs`
- A `qa/check-basilisk-stance.cjs`
- A `qa/check-browser.cjs`
- A `qa/check-bulwark.cjs`
- A `qa/check-burst-salvage.cjs`
- A `qa/check-canvas-toning.cjs`
- A `qa/check-combat-audio.cjs`
- A `qa/check-counter-training.cjs`
- A `qa/check-doctrine.cjs`
- A `qa/check-duty-roster.cjs`
- A `qa/check-foundry-motion.cjs`
- A `qa/check-foundry.cjs`
- A `qa/check-gatecrasher.cjs`
- A `qa/check-hangar.cjs`
- A `qa/check-hostile-liveries.cjs`
- A `qa/check-hull-prices.cjs`
- A `qa/check-inn.cjs`
- A `qa/check-line-elite.cjs`
- A `qa/check-line-infantry.cjs`
- A `qa/check-lion-trial.cjs`
- A `qa/check-live-warden-runtime.cjs`
- A `qa/check-live-warden.cjs`
- A `qa/check-mech-computer.cjs`
- A `qa/check-missions.cjs`
- A `qa/check-mobility.cjs`
- A `qa/check-new-hires.cjs`
- A `qa/check-prototype-combat.cjs`
- A `qa/check-published-saves.cjs`
- A `qa/check-reaver.cjs`
- A `qa/check-resume.cjs`
- A `qa/check-ridge-combat.cjs`
- A `qa/check-roster-destruction.cjs`
- A `qa/check-shield-depth.cjs`
- A `qa/check-shields.cjs`
- A `qa/check-ship.cjs`
- A `qa/check-simulation.cjs`
- A `qa/check-site-package.cjs`
- A `qa/check-tactical.cjs`
- A `qa/check-terrain.cjs`
- A `qa/check-training.cjs`
- A `qa/check-ui.cjs`
- A `qa/check-upper-animation.cjs`
- A `qa/check-vanguard.cjs`
- A `qa/check-weapon-expansion.cjs`
- A `qa/fixtures/aero-jumpjet.json`
- A `qa/fixtures/aero-relay.json`
- A `qa/fixtures/ashigaru-picket.json`
- A `qa/fixtures/lion-export.json`
- A `qa/fixtures/mech-mastery.json`
- A `qa/fixtures/reaver-corridor.json`
- A `qa/fixtures/shields-arm-lost.json`
- A `qa/fixtures/terrain-sortie.json`
- A `qa/fixtures/v31-corridor.json`
- A `qa/fixtures/v32-picket.json`
- A `qa/fixtures/v35-frontier.json`
- A `qa/fixtures/v53-picket.json`
- A `qa/fixtures/v55-corridor.json`
- A `qa/fixtures/v56-corridor.json`
- A `qa/fixtures/v61-frontier.json`
- A `qa/fixtures/walk-feet-approved.json`
- A `qa/package-lock.json`
- A `qa/package.json`
- A `qa/release-check.cjs`
- A `qa/render-animation.cjs`
- A `qa/sim-harness.cjs`
- A `qa/site-package.cjs`
- A `tools/arm_gatecrasher_local.py`
- A `tools/assemble_arsenal.cjs`
- A `tools/authoring/basilisk/build_basilisk.py`
- A `tools/authoring/basilisk/clearance_profile.json`
- A `tools/authoring/bastion/export_bastion.py`
- A `tools/authoring/blender_death_parts.py`
- A `tools/authoring/blender_part_pass.py`
- A `tools/authoring/build_theater_tiles.py`
- A `tools/authoring/destruction/bake.py`
- A `tools/authoring/destruction/pack.py`
- A `tools/authoring/infantry_walk_grip.py`
- A `tools/authoring/kestrel/build_kestrel.py`
- A `tools/authoring/pack_aegis_parts.py`
- A `tools/authoring/pack_extended_parts.py`
- A `tools/authoring/pack_infantry_walk.py`
- A `tools/authoring/pack_part_pass.py`
- A `tools/authoring/pack_walk_cycles.py`
- A `tools/authoring/prototypes/build_prototypes.py`
- A `tools/authoring/scout/bake_combat.py`
- A `tools/authoring/scout/export_bench.py`
- A `tools/authoring/scout/pack_combat.py`
- A `tools/authoring/vanguard/bake.py`
- A `tools/authoring/vanguard/pack.py`
- A `tools/authoring/warden/build_warden.py`
- A `tools/authoring/warden/clearance_profile.json`
- A `tools/authoring/weapons/source/build_expansion.py`
- A `tools/authoring/weapons/source/build_shields.py`
- A `tools/authoring/weapons/source/build_weapons.py`
- A `tools/bake_cleaver_strike.py`
- A `tools/bake_lion.py`
- A `tools/bake_native_parts.py`
- A `tools/bake_warden_fidelity_parts.py`
- A `tools/blender_part_mask.py`
- A `tools/chassis-part-mask.cjs`
- A `tools/dev-server.cjs`
- A `tools/export_gatecrasher.py`
- A `tools/extract_behemoth_core.cjs`
- A `tools/foundry-raster.cpp`
- A `tools/install_armed_gatecrasher.py`
- A `tools/install_gatecrasher_kits.py`
- A `tools/install_gatecrasher_r2.py`
- A `tools/package_offline.py`
- A `tools/rebuild_cleaver_strike.py`
- A `tools/record_part_masks.py`
- A `tools/render_arsenal.py`
- A `tools/render_ballistic_audio.py`
- A `tools/render_bastion_parts.cjs`
- A `tools/render_battlefields.py`
- A `tools/render_breach_gait.py`
- A `tools/render_combat_audio.py`
- A `tools/render_cover.py`
- A `tools/render_foundry.cjs`
- A `tools/render_machinery_audio.py`
- A `tools/render_music.py`
- A `tools/render_prototype_combat.py`
- A `tools/render_travel.cjs`
- A `tools/render_vehicles.py`
- A `tools/render_warden.py`
- A `tools/render_wrecks.py`
- A `tools/replay_part_masks.py`
- A `tools/sample_warden_motion.cjs`
- A `tools/stock-part-map.cjs`

### `87cccf9665` 2026-11-12 · Claude
Current main after history rewrite (2026-11-12)  
*unmerged: rewrite/claude/agents-pace-rules, rewrite/main, rewrite/renderer/phase3, rewrite/renderer/phase4*
- M `.gitignore`
- M `AGENTS.md`
- M `README.md`
- A `design/baseline/README.md`
- A `design/baseline/recovery-proof/README.md`
- A `design/baseline/webgl-proof/README.md`
- A `design/phase1/reviewed-20261111/independent-review.md`
- A `design/phase1/reviewed-20261111/verification/README.md`
- A `design/reference-vfx/pr10/README.md`
- A `design/reference-vfx/pr9-independent/README.md`
- A `design/reference-vfx/pr9/README.md`
- A `design/reference-walk/README.md`
- A `dist/assets/grid-travel-shogun-bare-ground-0-paint.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-0-parts.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-0.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-1-paint.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-1-parts.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-1.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-2-paint.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-2-parts.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-2.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-3-paint.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-3-parts.webp`
- A `dist/assets/grid-travel-shogun-bare-ground-3.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-0-paint.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-0-parts.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-0.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-1-paint.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-1-parts.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-1.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-2-paint.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-2-parts.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-2.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-3-paint.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-3-parts.webp`
- A `dist/assets/grid-travel-shogun-cleaver-ground-3.webp`
- A `dist/assets/grid-travel-shogun-ground-0-paint.webp`
- A `dist/assets/grid-travel-shogun-ground-0-parts.webp`
- A `dist/assets/grid-travel-shogun-ground-0.webp`
- A `dist/assets/grid-travel-shogun-ground-1-paint.webp`
- A `dist/assets/grid-travel-shogun-ground-1-parts.webp`
- A `dist/assets/grid-travel-shogun-ground-1.webp`
- A `dist/assets/grid-travel-shogun-ground-2-paint.webp`
- A `dist/assets/grid-travel-shogun-ground-2-parts.webp`
- A `dist/assets/grid-travel-shogun-ground-2.webp`
- A `dist/assets/grid-travel-shogun-ground-3-paint.webp`
- A `dist/assets/grid-travel-shogun-ground-3-parts.webp`
- A `dist/assets/grid-travel-shogun-ground-3.webp`
- A `dist/assets/grid-travel-shogun-paint.webp`
- A `dist/assets/grid-travel-shogun-parts.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-0-paint.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-0-parts.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-0.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-1-paint.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-1-parts.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-1.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-2-paint.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-2-parts.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-2.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-3-paint.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-3-parts.webp`
- A `dist/assets/grid-travel-shogun-vesper-ground-3.webp`
- A `dist/assets/grid-travel-shogun.webp`
- A `dist/assets/shogun-bare-combat-left-motion-paint.webp`
- A `dist/assets/shogun-bare-combat-left-motion-parts.webp`
- A `dist/assets/shogun-bare-combat-left-motion.webp`
- A `dist/assets/shogun-bare-combat-left-paint.webp`
- A `dist/assets/shogun-bare-combat-left-parts.webp`
- A `dist/assets/shogun-bare-combat-left.webp`
- A `dist/assets/shogun-bare-combat-right-motion-paint.webp`
- A `dist/assets/shogun-bare-combat-right-motion-parts.webp`
- A `dist/assets/shogun-bare-combat-right-motion.webp`
- A `dist/assets/shogun-bare-combat-right-paint.webp`
- A `dist/assets/shogun-bare-combat-right-parts.webp`
- A `dist/assets/shogun-bare-combat-right.webp`
- A `dist/assets/shogun-cleaver-combat-left-motion-paint.webp`
- A `dist/assets/shogun-cleaver-combat-left-motion-parts.webp`
- A `dist/assets/shogun-cleaver-combat-left-motion.webp`
- A `dist/assets/shogun-cleaver-combat-left-paint.webp`
- A `dist/assets/shogun-cleaver-combat-left-parts.webp`
- A `dist/assets/shogun-cleaver-combat-left.webp`
- A `dist/assets/shogun-cleaver-combat-right-motion-paint.webp`
- A `dist/assets/shogun-cleaver-combat-right-motion-parts.webp`
- A `dist/assets/shogun-cleaver-combat-right-motion.webp`
- A `dist/assets/shogun-cleaver-combat-right-paint.webp`
- A `dist/assets/shogun-cleaver-combat-right-parts.webp`
- A `dist/assets/shogun-cleaver-combat-right.webp`
- A `dist/assets/shogun-combat-left-motion-paint.webp`
- A `dist/assets/shogun-combat-left-motion-parts.webp`
- A `dist/assets/shogun-combat-left-motion.webp`
- A `dist/assets/shogun-combat-left-paint.webp`
- A `dist/assets/shogun-combat-left-parts.webp`
- A `dist/assets/shogun-combat-left.webp`
- A `dist/assets/shogun-combat-right-motion-paint.webp`
- A `dist/assets/shogun-combat-right-motion-parts.webp`
- A `dist/assets/shogun-combat-right-motion.webp`
- A `dist/assets/shogun-combat-right-paint.webp`
- A `dist/assets/shogun-combat-right-parts.webp`
- A `dist/assets/shogun-combat-right.webp`
- A `dist/assets/shogun-vesper-combat-left-motion-paint.webp`
- A `dist/assets/shogun-vesper-combat-left-motion-parts.webp`
- A `dist/assets/shogun-vesper-combat-left-motion.webp`
- A `dist/assets/shogun-vesper-combat-left-paint.webp`
- A `dist/assets/shogun-vesper-combat-left-parts.webp`
- A `dist/assets/shogun-vesper-combat-left.webp`
- A `dist/assets/shogun-vesper-combat-right-motion-paint.webp`
- A `dist/assets/shogun-vesper-combat-right-motion-parts.webp`
- A `dist/assets/shogun-vesper-combat-right-motion.webp`
- A `dist/assets/shogun-vesper-combat-right-paint.webp`
- A `dist/assets/shogun-vesper-combat-right-parts.webp`
- A `dist/assets/shogun-vesper-combat-right.webp`
- M `dist/chassis-part-masks.js`
- M `dist/foundry/bastion.js`
- M `dist/foundry/chassis.js`
- M `dist/foundry/production-arsenal.js`
- D `dist/foundry/renderer.js`
- M `dist/foundry/rig-motion.js`
- A `dist/foundry/rigid-adapter.js`
- A `dist/foundry/scene-rigs.js`
- M `dist/foundry/warden-live.js`
- M `dist/game.js`
- M `dist/grid-travel-visuals.js`
- M `dist/index.html`
- A `dist/performance.js`
- M `dist/prototype-combat.js`
- M `dist/rig-bench/prototypes/bay.js`
- M `dist/rig-bench/prototypes/index.html`
- A `dist/rig-bench/prototypes/shogun.glb`
- A `dist/rig-bench/prototypes/shogun.webp`
- A `dist/scene/adapter-weapons.js`
- A `dist/scene/battle.js`
- A `dist/scene/billboards.js`
- A `dist/scene/combat.js`
- A `dist/scene/effects.js`
- A `dist/scene/environment.js`
- A `dist/scene/weapon-fx.js`
- A `dist/shared-renderer.js`
- M `dist/warden-fidelity.js`
- A `docs/HISTORY.md`
- A `docs/history/commits.md`
- A `docs/phase1-development.md`
- A `docs/phase2-development.md`
- A `docs/phase2-requirements-review.md`
- A `docs/phase2-visual-review.md`
- A `docs/phase2-weapon-mapping.md`
- A `docs/reference/claude/README.md`
- A `docs/reference/claude/mercenary-command.html`
- A `docs/reference/claude/rig-bench.html`
- A `docs/release-verification.json`
- A `docs/renderer-inventory.json`
- A `docs/renderer-inventory.md`
- A `docs/renderer-progress.json`
- A `docs/renderer-runtime-handoff-20261111.md`
- M `docs/sites-export.json`
- M `qa/README.md`
- A `qa/assemble-baseline.py`
- A `qa/assemble-phase1.py`
- M `qa/browser/aero.cjs`
- M `qa/browser/armory.cjs`
- D `qa/browser/ashigaru.cjs`
- D `qa/browser/attack-exchange.cjs`
- M `qa/browser/bastion.cjs`
- A `qa/browser/billboards.cjs`
- M `qa/browser/bulwark-bench.cjs`
- D `qa/browser/bulwark-combat.cjs`
- M `qa/browser/campaign.cjs`
- D `qa/browser/canvas-toning.cjs`
- M `qa/browser/career-tabs.cjs`
- D `qa/browser/chassis-scale.cjs`
- D `qa/browser/gatecrasher-armed.cjs`
- D `qa/browser/impact.cjs`
- D `qa/browser/infantry-destruction.cjs`
- M `qa/browser/line-elite.cjs`
- M `qa/browser/line-infantry.cjs`
- M `qa/browser/lion-trial.cjs`
- A `qa/browser/live-paint.cjs`
- D `qa/browser/live-warden.cjs`
- M `qa/browser/move-preview.cjs`
- D `qa/browser/paint.cjs`
- M `qa/browser/paired-walk.cjs`
- D `qa/browser/part-masks.cjs`
- M `qa/browser/reaver.cjs`
- M `qa/browser/ridge-combat.cjs`
- D `qa/browser/roster-destruction.cjs`
- M `qa/browser/scout-bench.cjs`
- A `qa/browser/shared-scene.cjs`
- M `qa/browser/shields.cjs`
- M `qa/browser/terrain.cjs`
- D `qa/browser/volley.cjs`
- D `qa/browser/warden-melee.cjs`
- D `qa/browser/warden.cjs`
- A `qa/capture-blank.cjs`
- A `qa/capture-motion.cjs`
- A `qa/capture-phase2-faults.cjs`
- A `qa/capture-phase2-matched.cjs`
- A `qa/capture-phase2.cjs`
- A `qa/capture-presets.cjs`
- A `qa/capture-recovery.cjs`
- A `qa/capture.cjs`
- M `qa/check-animation.cjs`
- M `qa/check-arsenal.cjs`
- M `qa/check-browser.cjs`
- D `qa/check-canvas-toning.cjs`
- A `qa/check-capture-presets.cjs`
- A `qa/check-combat-fx.cjs`
- M `qa/check-foundry-motion.cjs`
- A `qa/check-foundry-walk.cjs`
- M `qa/check-foundry.cjs`
- M `qa/check-gatecrasher.cjs`
- M `qa/check-hull-prices.cjs`
- D `qa/check-live-warden-runtime.cjs`
- D `qa/check-live-warden.cjs`
- M `qa/check-mobility.cjs`
- A `qa/check-performance.cjs`
- A `qa/check-production-weapons.cjs`
- M `qa/check-prototype-combat.cjs`
- A `qa/check-rigid-adapter.cjs`
- A `qa/check-scene-regressions.cjs`
- A `qa/check-scene.cjs`
- M `qa/check-shield-depth.cjs`
- M `qa/check-simulation.cjs`
- M `qa/check-tactical.cjs`
- M `qa/check-terrain.cjs`
- M `qa/check-ui.cjs`
- D `qa/check-upper-animation.cjs`
- A `qa/combine-scene.cjs`
- A `qa/fixtures/legacy-10x10-scene.json`
- A `qa/fixtures/phase2-aim-clearance.json`
- A `qa/reference-vfx.cjs`
- A `qa/reference-walk.cjs`
- M `qa/release-check.cjs`
- A `qa/renderer-inventory.cjs`
- A `qa/scene-combat.cjs`
- M `qa/sim-harness.cjs`
- A `qa/summarize-phase2-visuals.cjs`
- A `tools/bake_samurai_gatecrasher.py`
- A `tools/fit_samurai_gatecrasher.py`
- A `tools/install_samurai_gatecrasher.py`
- M `tools/render_prototype_combat.py`

### `90b22a5829` 2026-11-12 · Karmi Nguyen
Phase 3 preparation: validate rig-v2 exports and skeleton ancestry  
*unmerged: rewrite/renderer/phase3*
- A `docs/phase3-export-gate.md`
- A `qa/check-rig-v2-test.cjs`
- A `qa/check-rig-v2.cjs`
- M `qa/check-simulation.cjs`

### `e36775c563` 2026-11-12 · Karmi Nguyen
Phase 4 preparation: shared-renderer hangar scene and fixture  
*unmerged: rewrite/renderer/phase4*
- A `design/phase4/fixture-smoke-20261111/README.md`
- A `dist/scene/hangar-catalog.js`
- A `dist/scene/hangar-fixture.html`
- A `dist/scene/hangar-fixture.js`
- A `dist/scene/hangar-roster.js`
- A `dist/scene/hangar.js`
- A `docs/phase4-hangar-preparation.md`
- A `qa/check-hangar-catalog.cjs`
- A `qa/check-hangar-roster.cjs`
- A `qa/hangar-fixture-smoke.cjs`

### `05a1566ec3` 2026-11-12 · Claude
AGENTS.md: pace and evidence rules for renderer phases  
*unmerged: rewrite/claude/agents-pace-rules*
- M `AGENTS.md`
