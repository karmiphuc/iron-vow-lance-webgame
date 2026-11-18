# Field finishes, combat stances and Cairn

Production-rendered desktop and narrow-viewport captures are in [the review panel](review.html). Factory and Survey show the same Workshop hull. The Cairn images show the purchased and refitted frame in Workshop and deployed with Valkyrie.

The focused browser gates ran against the checkout with full Chromium rendering. `qa/gate-field-liveries.cjs` checks the four finishes, saved-career reload and deployment, nine desktop equipment combinations, two 390px battlefield cases, finite transforms, a damaged-arm guard transition, and 320px paint overflow. `qa/gate-cairn.cjs` purchases and assigns Cairn and Valkyrie through Workshop, refits Cairn, checks four finishes, reloads the career, compares their generated geometry, and deploys both with Cairn's live rig and ready guard.

`summary.json` records the results and selected runtime hashes; Cairn's browser gate wrote its separate intermediate summary outside the repository, which is incorporated here. Tests used fixture credits and isolated browser storage. Desktop and simulated narrow Chromium are covered; native mobile hardware is unverified.
