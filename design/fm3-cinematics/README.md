# FM3 duel cinematics

Owner approval (2026-11-22): the demo was approved, with three changes. The HUD health strip is removed. Missed rounds in a burst must strike the ground. Deaths play slower and open in slow motion.

## What ships

- **Camera.** Each beat frames one mech, low and big:
  - brace, then release with a 5° Dutch tilt;
  - a lane-side flight shot when rounds are in the air ≥ 0.4 s;
  - the hit shot on the defender.

  The ally stays screen-left facing right through return fire. The flight shot caps its distance to the defender from the live vertical FOV and keeps it inside the horizontal FOV, so the framing holds on portrait touch screens too.
- **Feedback.**
  - No HP strip.
  - Damage numbers pop at each impact. Each number takes its own slot, three across with rows climbing, so a burst cascades instead of overprinting.
  - A destroyed part names itself in red. MISS / DODGE text and Deadeye / Failsafe banners also show.
- **Hits and misses.**
  - Hits are fireball bursts.
  - Each missed round flies on and strikes the ground. Every third falls short, in front of the target where the hit camera sees it; the rest carry past, wide of the hull, on alternating sides.
  - Each miss lands when its flight distance says it does, and kicks up a dark earth plume, a dust ring, clods and a scorch.
  - Skip drops rounds still in the air.
- **Deaths.**
  - The whole destruction timeline runs 1.35× longer.
  - Its first 0.55 s plays at 30% speed, and particle FX slow with it.
  - Reduced motion keeps the old pace.
- A sky dome shows during the duel only.

## Evidence

| File | Shows |
|---|---|
| burst-release.webp | Release beat, tilted, muzzle bloom |
| burst-hit-numbers.webp | Hit beat, damage numbers in a row |
| burst-miss-short-ground.webp, burst-miss-dirt.webp | A short miss throwing dirt in front of the target |
| kill-hit-body.webp → kill-wreck.webp | Killing hit, slow-motion opening, sag, collapse, cook-off, wreck |

See `summary.json` for commands and results.

## Failures that motivated fixes

- Touch flight shot framed the defender at 22% of frame height, then off-screen: caught by `qa/browser/combat-duel.cjs` "The flight shot holds the defender ahead".
- Burst damage numbers overprinted: caught by `check-combat-presentation` "Simultaneous damage numbers never share a position" (fails on the prior layout).
- Overshooting misses were hidden behind the hull from the hit camera: caught by `check-combat-presentation` "Every third falls short".
