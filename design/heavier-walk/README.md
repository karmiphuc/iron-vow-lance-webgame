# Heavier walk

Owner direction (2026-11-18): every hull should walk slow and heavy like Gatecrasher, with no duck-walk. Approved in the
Walk Weight Demo artifact, which ran the shipped rigs with these exact numbers.

Gate: `node qa/check-walk-weight.cjs --out design/heavier-walk` walks every hull's longest straight legal move through the real
move timeline (`__ironVow.move`) and checks the following:

- steps per second per leg pair stay at or under 2.6;
- catch-up steps stay at or under 2.5 per 10 s;
- leg lean stays at or under 12°;
- toe-out stays at or under 4°;
- standing feet stay at least 4 cm apart;
- footfall weight comes from the hull's mass;
- each foot plant gets one footstep sound (±2).

The results are in `summary.json`.

## Regressions this gate now catches (measured on main a5b904e before the fix)

- Speed: Warden ran at 11.6 m/s with 7 steps a second, and Kestrel at 13.5 m/s with 13. The move timeline was tuned for 3.4 m tiles, but the board is 7.4 m. Now 2.4–3.8 m/s at about 2.2 steps/s. Assertion: `stepsPerS`.
- Catch-up steps: LI-01, LI-02, Aero, Gravemaw and Bulwark took more catch-up steps than walking steps. Now 0–2 per 10 s. Assertion: `catchUpsPer10s`.
- A-framed legs: the foot track was wider than the hips, so the leg solver rolled whole legs outward. Before → after:
  - Aero 16° → 3°
  - Citadel 18° → 2°
  - Valkyrie 20° → 7°
  - Shogun 18° → 11°
  - Cairn 20° → 4°

  Assertion: `legTiltDeg`.
- Toe-out: the rigs shipped with 10° toe-out, which read as a duck walk. Now 2°. Assertion: `toeOutDeg`.
- Footfall weight: every GLB hull hit the ground with weight 1, because `HEAVY` only knows the six kit legs. Assertion: `stepMass`.
- Footstep sounds played at fixed tile fractions, not when a foot landed. Assertion: `landSounds` vs `plants`. The paired-walk browser check now asserts sounds alternate feet.

## Pending (owner / Blender)

Cicada (about 13°) and Gravemaw (about 19°, plus 3.8 catch-ups per 10 s) are limited by their models. Their hip joints sit too close together for their feet. The gate reports them as warnings. The fix is to move the hip joints outward in the source models.
