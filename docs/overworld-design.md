# Overworld design guide

Status: Phases A–C implemented, 2026-11-18. The owner approved transit-day hull service and wound rest, and 0–3 pooled contracts per port for Phase B.

The Halyard's bridge chart puts time, money, lance readiness and opportunity in one view. The map stays visible while the player compares courses, confirms departure, uses port services and responds to transit reports.

## 1. Baseline before this work (`main` at 081f51b)

| Area | Current behavior | Source |
| --- | --- | --- |
| Ports | 4 fixed ports: Karst Anchorage (`picket`), Relay Station (`relay`), Vanta Shipyards (`corridor`), Halcyon Outpost (`frontier`) | `dist/overworld.js` `PORTS` |
| Routes | 4 routes: picket–relay 1 day / 120 fuel, relay–corridor 1 day / 180, corridor–frontier 2 days / 260, picket–corridor 1 day / 850 | `ROUTES` |
| Route choice | One real choice exists: picket→corridor express (1 day, 850 fuel) vs via Relay (2 days, 300 fuel plus a second day of upkeep). Multi-leg trips must be ordered one hop at a time. | `travelQuote`, `findPath` in `overworld-view.js` |
| Daily costs | Wages 70 + 10 × (level − 1) per pilot, reserves included. Hulls 35 + 10 × upgrade (deployed), 15 + 5 × upgrade (reserve). Ship 75 + 20 × total deck levels. | `operatingRates` |
| Calendar | Travel adds its days to `save.day`. Every finished sortie costs one day of upkeep. Unpaid costs carry forward as arrears. | `travelTo`, `settleSortieCosts` |
| Contracts | Exactly one fixed contract per port, sharing the port's id. Only seat count (1–3) rerolls each day. Nothing appears, expires or moves. | `CONTRACTS`, `dispatchSizes` in `game.js` |
| Halyard | "IVS HALYARD. MERCENARY CARRIER", docked at a port. Decks: Drop Control, Contracts Office, Repair Deck, Crew Deck. Deck projects finish after N wins. | `SHIP_DECK`, ship page |
| Repair and wounds | Hull integrity recovers after wins (Repair Deck) and through paid repairs. Wounds heal per rested sortie. Neither is tied to days or travel. | `SHIP_DECK.repair`, `woundLabel` |
| Lore | Thin. Only the "STAR MAP" label, "IVS" and a "recovery shuttle" line suggest space. Every battlefield is on the ground (Karst Basin, Vanta Industrial, Halcyon Outskirts) with tanks and helicopters. | `CONTRACTS`, ship page |
| Presentation | Flat HTML chart on the left, text-heavy cost panel on the right. A modal hides the map on confirm. | `overworld-view.js`, `bindOverworld` |

The baseline map priced hops across four nodes. The phases below added route choices, time-sensitive opportunities and distinct reasons to visit each mooring.

## 2. Lore: the Halyard is a heavy-lift airship carrier

- **The ship.** The IVS Halyard (Iron Vow Ship) is a mercenary airship carrier. A halyard is the line that hoists a sail or flag. In battle, the Halyard hovers over the drop zone and lowers the lance on cables. That cable drop can open every sortie.
- **The setting.** A broken-up continent where city-states, mining holdings and corporate enclaves hire mercenaries for border wars. It's grounded and on one world, closer to Front Mission 3 than BattleTech's space empires. This fits the existing ground battlefields, tanks and helicopters.
- **Ports are mooring towers.** Tower towns where the Halyard ties up at a mast. The four current names already fit: Karst Anchorage, Relay Station, Vanta Shipyards (an airship yard), Halcyon Outpost.
- **The hangar is in the ship's belly.** The Workshop, mech bay and decks are aboard. The bridge, with the chart table, sits above them.

Text changes needed: "STAR MAP" → "CHART TABLE" (5 occurrences), the overworld eyebrow and headings, the ship banner subtitle, and the README "Play" paragraph. Port and contract ids stay stable (`AGENTS.md`).

## 3. Design pillars

1. **The world moves while you travel.** Days matter beyond upkeep. Contracts appear with an expiry day. Storm fronts and hostile patrols drift across the chart. A route choice is a bet on what the world will look like when you arrive.
2. **Travel time is lance readiness.** The player lives in the Workshop, so every route forecast shows which mechs and pilots will be ready on arrival. *Rule change:* transit days should count toward hull service and wound rest. Today those happen only per win or per sortie (section 1).
3. **Ports are worth visiting for different reasons.** Each mooring tower has its own market stock (frames, weapons, parts), repair bay rate and faction standing. You go to Vanta because that's where the replacement arm is, not because its icon looks different.
4. **Intel is a resource.** Contracts show ranges until scouted ("2–4 mechs, heavy likely"). The Halyard's sensor range sets how much of the chart you can see live. A ship upgrade visibly widens the lit area on the table.
5. **Things happen on the way.** Short en-route events such as distress beacons, ambushes, toll blockades and weather damage, each with 2–3 choices. These turn travel into play.
6. **The map is a place on the ship.** A 3D chart table on the Halyard's bridge, rendered through the existing shared WebGL context (`dist/shared-renderer.js`, three.js). It's a room aboard the ship, like the mech bay, not a menu.

## 4. Plotting a course (the core screen)

What the player sees after tapping a destination, all at once and without leaving the map:

- The Halyard model at its current mast, with the route drawn as a glowing line over terrain.
- **Two route options** whenever both exist (express and stopover), shown together on the table.
- A **route forecast strip** for the selected option, using icons with numbers:
  - days and the arrival day,
  - total cost and the credits left on arrival (red if this puts the company into arrears),
  - lance readiness on arrival: one pip per mech (ready / under 30% condition / pilot wounded),
  - hazards along the route (storm, patrol), shown as icons on the line itself.
- One **DEPART** control. Confirming happens on the table: the strip locks and the ship lifts off. No modal hides the map.

What the player decides: faster and cheaper vs a healthier lance vs catching a contract before it expires.

## 5. iPad and touch rules

The owner mostly plays on iPad Pro in Safari or Chrome.

- Icons and numbers over sentences. Each label is 3 words or fewer. Detail goes in a tap-to-expand card, never in a permanent panel.
- One-finger drag pans the table, pinch zooms, two-finger twist tilts. Tapping a mast selects it. Tapping a route line selects that option.
- The forecast strip docks to the bottom edge in landscape and portrait, and never pushes the map below the fold.
- Touch targets at least 44 pt. No hover-only information.
- No menus the owner doesn't use. The Contract Board opens from the selected port's card.

## 6. Phased plan

**Phase A: first playable pass.** Proves pillars 2 and 6 on the existing 4 ports.
- Chart table scene: terrain slab, 4 masts, route lines and the Halyard model, in the shared WebGL context.
- Route forecast strip with both options for picket→corridor, cash on arrival and lance readiness pips.
- Airship lore copy (section 2).
- Rule change: transit days apply Repair Deck service to parked hulls and tick wound rest. Behind a save-schema fixture (`AGENTS.md`). **Approved by the owner, 2026-11-18.**
- Fast gate `node qa/check-overworld-chart.cjs`: forecast numbers match `travelQuote`, the map stays visible on confirm, touch targets meet the minimum, and saves round-trip.

**Phase B: living world.** Pillars 1 and 4. Contracts are decoupled from ports into a pool with expiry days, plus drifting storm and patrol markers. Intel ranges. Add 2–4 more mooring towers so routes branch and more than one real route choice exists.

The Phase B implementation adds Ridge Mast and Haven Reach, branching courses, four-day contract postings with 0–3 unique offers per port, inclusive expiry forecasts, paid scouting, live sensor coverage and day-indexed storm/patrol movement. An accepted offer keeps its original terms in the sortie checkpoint. A paid one-day hold advances dispatch and maintenance, with unpaid upkeep carried as arrears.

**Phase C: port identity and events.** Pillars 3 and 5. Tap the selected mooring name to open Services or Market over the chart. Each port stocks four weapons and three chassis, with its own repair rate and faction. Company inventory and owned equipment remain shared. The carrier Workshop keeps its existing catalogue; visiting a local market offers a 10% base discount, adjusted from 0% to 20% by local standing from −100 to +100. Local repairs combine the installed Repair Deck discount, the port's 85–115% rate and a standing modifier from 120% to 80%. The displayed quote is the amount charged, including for stored hulls. Remote ports offer a read-only preview.

Approximately one-third of route legs generate a deterministic incident. Storm and patrol incidents correspond to markers on that leg's scheduled day; other incidents are distress calls, salvage or tolls. Each has two or three responses and at least one choice requiring no cash. Hull wear, payment, local standing and delay upkeep appear beside each response. A delay incurs one day of operating costs and applies service/rest once, carrying unpaid costs as arrears.

The crossing and its base costs commit atomically. Reports appear after the ship reaches its mast and reopen after a reload. An optional itinerary-and-choice checkpoint binds the pending incidents to that crossing and enforces route order. Each response saves its effects and updated pending list together. New travel, port purchases and sorties wait until the reports close. Incident delays do not reschedule the remaining encounters from the original crossing. Existing version-1 careers and published sortie checkpoints retain their IDs and terms.

Out of scope for now: procedural world generation, real-time travel, and multiple ships.

## 7. Owner decisions

1. **Transit days count as rest.** Approved by the owner. All hulls aboard receive the installed Repair Deck service per travel day, and pilots recover from wounds. Forecast and commit share the same rule.
2. **Contract count per port in Phase B.** The owner chose 0–3 offers drawn from a pool.
3. **Halyard model.** Authored in Blender for the chart table. Runtime asset `dist/assets/overworld/halyard.glb` has 11,928 triangles. Its reproducible source is `tools/authoring/halyard/create_halyard.py`; the editable Blender scene is kept in the private source library.
