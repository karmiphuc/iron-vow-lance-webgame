# Phase 2 combat visual evidence

The formal capture runs against detached production source `6786df4` served at local port 5178. The capture runner is `qa/capture-phase2.cjs`; its SHA-256 and the served document hash are recorded in `design/phase2/combat/manifest.json`. The production tree stays frozen independently of ongoing QA changes.

Open `design/phase2/combat/contact-sheet.html` to review actual-command frames. Each linked WebP retains full viewport resolution. The `filmstrips/` directory contains labeled derivative overview strips. Refer to the manifest status and individual case records for completed coverage; an interrupted batch is not a pass.

## Current checkpoint

The batch is paused for the shared four-CPU host's GPU scheduling slot. Thirteen full-resolution desktop images are saved across three completed actual-command cases: rifle (four), shotgun (four), and missile (five, including arrival). All thirteen WebP file hashes and decoded RGBA hashes were reverified after the pause. The prior failed manifest is retained: an early compositor screenshot timed out under host oversubscription; that infrastructure failure is not reported as a source defect or a completed visual gate.

The rifle contact and missile sequence were visually inspected. The contact flash is visibly on the target torso; the missile strip shows launch, a traveling missile and smoke, contact and recovery. The production attack camera uses a close foreground shoulder view and crops the actor. These cases retain the existing legacy target sprite while live actor weapon presentation is rendered in 3D. Further archetypes, tablet, reduced-motion, status effects, and matching-preset comparisons remain pending at this checkpoint.

## Capture policy

The runner invokes actual `__ironVow.attack` commands with the existing AP, timing, roll, contact, and HP rules. It uses deterministic hit rolls, an unobstructed two-actor fixture, and 1000 HP per target part for catalog coverage so an early kill cannot truncate a burst. It records first observed launch, impact and missile arrival frames and representative recovery frames. Part-damage scenarios explicitly adjust initial HP and then use real attacks; target damage and combat events are recorded alongside the image.

Every CPU animation update executes at controlled 30 Hz. Unrecorded intermediate GPU submissions/readbacks are omitted; scene and camera matrices still update. Every saved frame restores the original GPU renderer and readback methods, executes the scene render, and captures at device scale 1. QA-only `preserveDrawingBuffer` retains that actual render for the screenshot. This is software WebGL image correctness evidence, without native iPad performance claims.

Screenshots are encoded as lossless WebP using FFmpeg, decoded and compared byte for byte in RGBA against the raw PNG before the PNG is discarded. Each entry records the raw PNG SHA-256, WebP SHA-256, RGBA SHA-256, equality result, dimensions and a nonblank sample check. Filmstrips are derived review aids; the full-resolution files are the evidence.

## Intended coverage and interpretation

- All 34 catalog entries: actual landed-contact image and HP/event record at desktop resolution.
- Rifle, shotgun, missile, rail, blade and Parallax: actual action sequences on desktop and touch-capable tablet viewport.
- Rail, blade and missile: reduced-motion desktop sequences.
- Shield interception, mixed critical faults, right-arm destruction, body death with long-lived smoke, and pilot kneel: real attacks against declared HP fixtures.
- Jumpjet: actual `useJumpjet` operation, with AP expenditure and landing assertions.
- Behemoth mortar: the explicitly named `mortar-future-presentation` hook. It demonstrates the existing future muzzle/brace/recoil presentation and asserts no damage events. It does not claim a game action or invent a mortar damage rule.

The action fixtures intentionally differ from Phase 0's static preset fixtures, so their images do not support pixel-difference claims against Phase 0. Matching-preset static comparisons must be identified separately. No Phase 0 reference capture is repeated.
