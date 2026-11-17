# Port identity and transit reports — Phase C

Tap a mooring name for Services and Market. Each port has local stock, a faction and its own repair profile. Standing improves local prices. Repairs cover active and stored hulls. Purchases unlock company inventory once. The carrier catalogue remains available at its existing prices.

Roughly one-third of route legs generate a deterministic incident, including storms and patrols tied to the scheduled route/day. Distress, salvage and toll reports offer short choices. Every incident has a response requiring no cash. Delays apply daily upkeep, Repair Deck service and wound rest once, carrying unpaid upkeep as arrears.

Pending reports resume after reload or import. An itinerary checkpoint binds each incident to its crossing and records choices in order. The final response clears it. Rewards, payments and delay days cannot replay. The new world-pending-transit fixture joins the seven existing career/sortie fixtures.

The combined chart gate passed from the clean committed source in summary.json, with identical source hashes afterward. All six desktop/touch browser cases passed on their first attempt. The 65 simulation suites passed, and the final gate includes the expanded Phase C checks and all eight published-save fixtures. Three final captures were inspected at phone, iPad portrait and landscape sizes. Controls meet 44 CSS pixels, sheets retain the map and forecast, and the app uses one shared WebGL context. Native iPad performance remains unverified.

Review found two regressions now covered by assertions. Fractional legacy credit balances could not resolve incidents. Saves could claim a later incident choice before an earlier report. Both are fixed. The original transit-rest browser fixture now declines its deterministic distress report through the native UI and still matches the original rest/cost result.
