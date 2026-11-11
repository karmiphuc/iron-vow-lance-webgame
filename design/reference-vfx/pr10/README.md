# PR #10 electrical-fault arcs: plasma tendril mix

Source: `docs/reference/claude/rig-bench.html` on branch `claude/arc-plasma-mix`. Headless Chrome on software WebGL (SwiftShader): correctness and look captures, not device performance.

The old chunky box arcs are replaced by three looks mixed at random in `faultFX` (visual `Math.random` only; the simulation RNG is untouched):

- **B plasma tendril (60% while critical):** two camera-facing soft ribbons on smooth wavering paths, blue-white band texture, additive. `f.arc(a,b,life,strength)` keeps its signature.
- **C spark crawl (25%):** `f.crawl(a,b,strength)`, 11 sparks and small glows walk the path over 0.15-0.25 s.
- **D joint short (15%):** `f.joint(p,dir,strength)` at an elbow/knee: thin blue streaks, short plasma flick, 0.08 s core glow, blue light, a wisp of smoke.
- Collapse: mostly B, C/D on some beats; the first and last two beats are always B at full strength.

## Evidence

- `manifest.json`: output of `reference-vfx.cjs --baseline <main's rig-bench.html>` (log in `qa-passed.log`), plus sha256 of every PNG below in `plasma_mix_captures`. Desktop and touch pass, reduced motion produces 0 arcs, and the 3-battle seed-4242 soak is identical to main (10,915 ticks, 180.6 sim s, ally 2 / enemy 1, footGround 29, footSlide 19, ikReach 28, stuck 1).
- (a) `a-plasma-B-close.png`, `a-plasma-B-far.png`: three held plasma arcs.
- (b) `b-crawl-mid-close.png`, `b-crawl-mid-far.png`: three crawls 110 ms in (about half the points have fired).
- (c) `c-joint-close.png`, `c-joint-far.png`: joint shorts at the right shoulder and a knee, 90 ms in.
- (d) `d-occlusion-exposed-*.png` vs `d-occlusion-cover-*.png`: the same arcs without and with an opaque `RB.coverMesh` container in front; the part of the arc behind the container is hidden (depth test intact).
- (e) `natural-mix-log.json`: the real `faultFX` on a mech with the body below 24%; the log lists which variant fired, and the event order for one critical run and one collapse run (first and last two beats B).
- `collapse-ground-slam.png` comes from the QA script. Its per-weapon impact captures are not committed (impacts are unchanged here); their particle counts are in `manifest.json`.

Review pass: C and D first rendered as chunky white sticks, too close to the old cartoon look. Crawl sparks are now 0.6x size and saturated blue with slightly larger glows; joint-short streaks are 0.3x size, 16 of them, mostly saturated blue. (b) and (c) were recaptured after that change and the QA run above is on the final file.

Local-run note: this sandbox blocks the fonts host, so the QA run used a copy of the script that serves an empty stylesheet for font requests. Only label typography is affected.
