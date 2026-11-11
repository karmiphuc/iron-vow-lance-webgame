# Phase 2 combat visual evidence

The current checkpoint contains 124 main images across 49 source-scoped cases, plus three natural critical-fault images. The main manifest remains `partial`: touch Parallax and the newly discovered minimum-range Parallax regression require a later frozen source. These artifacts do not claim a final catalog or clearance gate pass.

Thirteen original nonairborne images retain source `6786df4` / dist tree `76ac81ff753ae6ebbfa45a093f794588cf919764`. The other 111 main images and the three fault images use detached `f68b5df` / dist tree `613bc118b314340e3ab63d5101a27c89a2c98080`, including its airborne ankle fix. Each image and case records its actual source; historical files are never relabeled as a later build. A subsequent campaign identified a separate close-Parallax clearance failure on this source, so its earlier three-tile Parallax fixture is historical evidence within that narrower scope.

Open `design/phase2/combat/contact-sheet.html` for the linked full-resolution files and individual action sequences. The three `contact-*.png` files provide compact contact overviews. `filmstrips/` contains labeled derivative strips. Natural B/C/D dispatch captures have their own manifest and contact sheet under `design/phase2/fault-mix/`.

## Completed checkpoint coverage

| Scope | Cases | Actual GPU images |
| --- | ---: | ---: |
| Desktop catalog fixtures, including built-ins and shoulder item | 34 | 52 |
| Shield, critical damage, arm destruction, body death, pilot kneel, jumpjet and future mortar presentation | 7 | 40 |
| Reduced-motion missile, rail and blade | 3 | 12 |
| Touch-capable 1194×834 rifle, shotgun, missile, rail and blade | 5 | 20 |
| Natural plasma / crawl / joint dispatch supplement | 1 | 3 |

The 34-entry row records actual attacks in the declared controlled fixtures; it does not cover the subsequently identified minimum-range Parallax campaign state. Matching Phase 0 static presets and final-source close-Parallax evidence remain pending. No Phase 0 capture is repeated.

## Capture policy and verification

The runner invokes actual `__ironVow.attack` commands, preserving AP, action timing, rolls, landed contacts and HP rules. Catalog fixtures use deterministic hit rolls, an unobstructed two-actor field, and 1000 HP per target part so an early kill cannot truncate a burst. Damage scenarios declare their initial HP before issuing real attacks. Body-death and pilot-kneel fixtures retain an offscreen live hostile witness to prevent normal mission completion from clearing the battlefield before the aftermath is recorded.

Every CPU animation update executes at controlled 30 Hz. Every saved frame uses the original main GPU render at device scale 1 with QA-only `preserveDrawingBuffer`. The current runner omits only unrecorded main-canvas GPU draws; native render-target draws and readbacks remain active so cached preview art is populated.

Forty retained main images used an earlier policy that also omitted intermediate render-target draws/readbacks. Their final main-scene frames still render with the real GPU. Battle `registerWeapon` returns before the cached `adapter.image` preview path, and inspected live meshes/contact effects remain valid within that main-scene scope. These forty images do **not** establish UI-preview correctness. Each image retains its original render policy and runner hash; the other 84 main images and all three natural-fault images preserve native render-target work.

All full-resolution screenshots are encoded as lossless WebP, decoded and compared byte for byte in RGBA with the raw PNG before that PNG is discarded. Entries retain raw PNG, WebP and decoded RGBA SHA-256 hashes, dimensions, original equality results and a nonblank sample. Offline verification passed all 127 WebP file hashes and decoded RGBA hashes; see the two `artifact-verification.json` reports. Filmstrips and compact contact sheets are derived review aids.

Software WebGL provides image correctness evidence. None of these measurements establishes native iPad performance. The prior compositor timeout under host oversubscription remains in the retained history and is not classified as a source defect.

## Visual observations and limits

- The inspected rifle contact is visibly on the target torso. The missile sequence shows the actual missile, smoke trail, arrival/contact and recovery.
- The production shoulder camera crops the actor and can hide the exact weapon silhouette. The brief melee contact bloom clips white and obscures part of the target. Those single frames cannot prove the complete body pose.
- The Aero jumpjet frame at 400 ms visibly separates the body/feet from the ground ring and shadow. Its temporary sprite adapter casts a broad rectangular shadow; this is an adapter limitation for Phase 3 review.
- The natural-fault supplement observes the original `fx.arc`, `fx.crawl` and `fx.joint` calls after a real rail hit changes body HP from 180 to 114 while the arm and legs remain disabled. No variant or effect is fabricated. Plasma is visible; crawl and joint effects are subtle or self-occluded by Bastion armor from this azimuth, so the images do not establish that every shader is clearly visible.
- Body-death aftermath samples record actual death ages approximately 3, 6, 13.8 and 14.2 seconds. Existing particles may linger after the emission cutoff; the images are not an assertion that all smoke disappears exactly at 14 seconds.
- `mortar-future-presentation` calls the explicitly named presentation hook and records no combat events. It shows the future brace/elevation/muzzle/recoil presentation without inventing a gameplay action or damage rule.

The actual-command fixtures differ from Phase 0's static presets and therefore support no cross-phase pixel-equality claim. The separate matching-preset runner uses the unchanged preset IDs and existing reviewed Phase 0 files.

## Reproduction

The prepared detached source server is at port 5179 in `/workspace/iron-vow-phase2-visual-fixed`. While the Parallax source hold remains, retain that frozen snapshot and skip new Parallax cases:

```sh
IRON_VOW_URL=http://127.0.0.1:5179/ \
IRON_VOW_VISUAL_SOURCE_ROOT=/workspace/iron-vow-phase2-visual-fixed \
IRON_VOW_VISUAL_MIXED_SOURCE=1 IRON_VOW_VISUAL_RESUME=1 \
IRON_VOW_VISUAL_SKIP_WEAPONS=parallax node qa/capture-phase2.cjs
```

After the next freeze, use the new detached snapshot for touch Parallax and the matching-preset supplement. The minimum-range automatic counter will be captured directly inside the mandatory seed-4264 replay, preserving its real state and rule RNG. A restored far player-attack fixture is not a substitute for that counter event. `SIGTERM`/`SIGINT` records a scheduling pause and closes the browser. Resume validates each retained file hash and retains its original source, render policy and runner hash.

Offline verification and contact overview generation require no browser:

```sh
node qa/summarize-phase2-visuals.cjs
IRON_VOW_VISUAL_OUT=design/phase2/fault-mix node qa/summarize-phase2-visuals.cjs
```
