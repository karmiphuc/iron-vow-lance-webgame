# PR #9 reference VFX evidence

Source: `docs/reference/claude/rig-bench.html` at sha256 `8578da6c…` (branch head `99e9a7b`). Headless Chromium on software WebGL. These are correctness captures, not device performance.

- `manifest.json`: output of `qa/reference-vfx.cjs --baseline <main's rig-bench.html>`. All checks passed on desktop and touch: five landed-hit hooks, touch particle counts, natural critical and collapse arcs, one ground-slam dust wall and air shockwave, reduced motion. The 3-battle seed-4242 soak gives identical ticks (10,915), sim seconds (180.6), winners (ally 2, enemy 1) and raw anomaly counts to the baseline (footGround 29, footSlide 19, ikReach 28, stuck 1).
- `arcs-exposed-vs-cover.png`: held arcs on desktop (1366×1024) and touch (1194×834), first exposed, then with an opaque cover container (`RB.coverMesh(1,…)`) in front. The arc segments behind the container are hidden; the ones above it stay visible.
- `arcs-before-after.png`: arcs on `main` versus this PR's blue colours.
- `collapse-ground-slam.png`: the script's collapse capture.

Local-run note: this sandbox blocks fonts.googleapis.com, so the run used a temporary copy of the script outside the repo that serves an empty stylesheet for font requests. Only label typography in captures is affected; every check is unchanged.
