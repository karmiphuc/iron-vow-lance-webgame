# Phase 4 hangar evidence

The production gate passed on source commit `93a7e2a3670add8ab158d340c753ca0f120cb985`, application tree `351c029b6f3aa3be2bd1efb35e92b4e650d14bb2`. This evidence-only commit retains that application tree. [summary.json](summary.json) is the unmodified gate report: four desktop and touch checks passed on the first attempt with full rendering. The gate was run with:

```sh
IRON_VOW_CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' IRON_VOW_QA_ATTEMPTS=1 node qa/gate-phase4.cjs --out /private/tmp/iron-vow-phase4-visual
```

[hangar.webp](hangar.webp) is the desktop capture from that run (SHA-256 `5b6a64a6fe609ff04471c0d65b70db4cf80873682d9adc21ed8963fb7605754b`). It shows the fourth empty bay, two reserves, a maintenance gantry, and projected Ship, Facilities and Crew Cabin controls. The gate checks actual desktop and touch selection, reserve navigation, camera easing and projection, animated workers and welding, a selected live neck's controlled look-around, the same hull at 30% and 29% with scorch material and gantry, and context restoration and disposal. The neck cycle advances CPU transforms without submitting unseen intermediate frames; the screenshot and ordinary scene checks use the real renderer.

The separately preserved development fixture passed its seven physical interaction, restore and disposal checks at `2ea99d5d9f3520414a7e736da743a0aee4fce5d9`, with the same application tree. Its post-restoration framebuffer was nonblank and reported zero GL errors before and after rendering. The initial restored-context run reported `1282`; the assertion now catches the resource-lifecycle fix. [Historical fixture preparation](../../docs/phase4-fixture-history.md) records the earlier scope.

Native iPad Pro frame rate and device-session measurements are **unverified**. Software-rendered browser correctness is not a performance measurement.

The merged-Phase-3 integration retained the verified application tree and passed all 54 simulation suites.
