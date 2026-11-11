# PR #9 reference effects evidence

The initial PR head (`99e9a7b`) enabled depth testing but used polygon offset factor −8. The real rendered-pixel regression found **196 blue pixels leaking through opaque foreground cover**. The corrected material uses factor 0 and units −1, retaining a small depth bias without the slope-dependent pull through cover. The [contact sheet](occlusion-contact.png) shows the failure and correction.

The final functional run at `81113a8` passes on desktop and touch: all five actual weapon-hit hooks, particle counts, natural critical/collapse arcs, the 0.95-second slam, reduced motion, and the new cover regression. All **24 PNG captures** and their hashes are in [manifest.json](manifest.json). Opaque foreground cover produces zero blue pixels on both viewports; exposed arcs and arcs in front of cover remain visible. The isolated probe renders the real pooled FX with the existing renderer; the full natural-critical captures show the real bench scene.

[before/manifest.json](before/manifest.json) is explicitly incomplete: it records the initial-head failure, its captures and [raw assertion](before/failed.log). It is retained as reproduction evidence, not a passing run.

[seeded-comparison.json](seeded-comparison.json) retains both three-battle seed-4242 reports: 10,915 ticks and two ally wins/one enemy win on each build. All 77 existing correctness anomalies match: footGround 29, footSlide 19, ikReach 28 and stuck 1. Raw frameSpike counts are two before and one after; host scheduling is excluded from deterministic equality. This is not a zero-anomaly or performance claim.

All six inline scripts parse, and all 45 existing simulation suites pass. The raw functional, simulation and soak logs are included. Software WebGL establishes correctness only; native iPad hardware remains untested. These changes affect the reference bench; production integration belongs to Phase 2 (#12).
