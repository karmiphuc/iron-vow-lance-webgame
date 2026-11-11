# Reference walk and IK fix: evidence

Applies to `docs/reference/claude/rig-bench.html` and the identical gait in `mercenary-command.html`. These are correctness results from headless Chrome for Testing 153 with software WebGL. They make no performance claim.

## Before (`main`, rig-bench sha256 `97f30254…`)

- **Three War battles at seed 4242:** 77 correctness anomalies. That is 29 `footGround`, 19 `footSlide`, 28 `ikReach` and 1 `stuck`. The soak logs only the first anomaly per unit and type. Counted frame by frame, planted feet slid more than 0.3 m in 3,738 leg-frames and left the floor by more than 0.15 m in 4,415.
- **Bench mode walk:** ankle-to-IK-target error peaked at 26.8–52.4 cm, depending on the leg type.
- **Game-style tile walk:** this drives `VowAnim.animateMech` directly, with 90° corners at game speed, a stop, a restart and a blade lunge. The worst planted-foot slide was 75–231 cm, and foot targets overshot thigh + shin by up to 2.46 m (Behemoth legs).
- `qa/reference-walk.cjs` fails on this copy: see [`before-failed.log`](before-failed.log).

## After (this change, rig-bench sha256 `b7bd5f74…`)

- **War soak:** 150 seeded battles (3 × 50 at seeds 4242, 77 and 90210, about 573,000 ticks) logged **zero correctness anomalies** across all 17 checks. The run also logged one `frameSpike`, which measures host timing; it is reported, not asserted. Coverage: all 30 legs × weapon and all 30 core × weapon pairs.
- **Bench mode walk:** 0 cm on all six leg types.
- **Game-style tile walk:** 0 cm slide, 0 cm ankle error and no overshoot past reach, on all six leg types.
- **Catch-up steps:** about 145 in three battles, against roughly 1,370 regular steps. About a third come while walking (around 4% of steps), a third while standing (after shoves and collisions), and a third in blade lunges.
- Results are in [`walk-manifest.json`](walk-manifest.json) and [`after-passed.log`](after-passed.log).
- **Effects checks:** `qa/reference-vfx.cjs` (without `--baseline`) still passes all 19 checks on desktop and touch, with 24 captures; see [`vfx-functional-manifest.json`](vfx-functional-manifest.json). Its seeded comparison against the previous copy does not apply here, because the walk and the War AI now change outcomes on purpose.

[`walk-contact-sheet.png`](walk-contact-sheet.png) shows the same seeded moments before and after: Behemoth legs walking, a Warden starting to walk, and a blade lunge.

## Smoke test of `mercenary-command.html`

The test deployed a sortie and played five enemy turns, which moves units through `battle3D`. There were no page errors, and the old and new files gave identical rules outcomes. The gait code in this file is identical to the Rig Bench copy tested above.

## How these were run

Playwright could not be installed in this environment (package installs were off). `qa/reference-walk.cjs` and `qa/reference-vfx.cjs` were run unchanged through a minimal stand-in for the parts of the Playwright API they use, driving Chrome over the DevTools protocol. As a control, `reference-vfx.cjs` was also run on `main`'s copy and passed there too. Re-running both checks with real Playwright (`npm run setup:qa`) is the next confirmation.
