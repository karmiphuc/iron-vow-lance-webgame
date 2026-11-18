# Contextual navigation

The previous screen cleanup left eight unrelated departments in the global bar. This change makes Bridge, Mech Bay and Company the three primary destinations. Contracts and services are reached from a port; refitting follows the selected mech; hiring and career records belong to Company. Ship Upgrades and Facilities remain contextual. Journal is a separate utility that returns to the same selection, focus and chart position.

The nine captures show Bridge, Refit and Company at 320×700, 1024×1366 and 1366×1024. The frozen layout gate checks exactly three visible primary controls, 44px targets, viewport bounds, all secondary routes, parent highlighting, Journal return and Escape. A separate narrow Mech Bay check verifies a 9px status/control gap with and without Reserves.

`summary.json` identifies the source commit and runtime tree. The package gate passed all 70 simulation suites and desktop/touch navigation. Existing field finishes, Cairn and the already deployed rock cliffs are preserved. Browser touch is emulated; native iPad performance remains unverified.

The old global bar failed the exact-three assertion (`8 !== 3`). Enforcing 44px touch controls also exposed the former 320px status overlap; the unchanged Career Tabs bounds assertion passes after the spacing correction.

Published as Site v111. All 168 deployed runtime files matched the candidate, and seven affected browser scenarios passed on desktop and emulated touch (14 checks).
