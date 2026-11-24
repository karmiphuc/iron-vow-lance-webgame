# Roster scale

[Compare all 27 campaign mech frames and the Lion trial](roster.webp). Each rig uses the same orthographic camera, lighting, floor grid and Workshop world scale. The grid is one 7.4-unit battle tile. The two Line Infantry models are piloted mech frames and can join the player's roster after capture. The tank and gunship are separate unit types.

The measurements use visible posed mesh vertices with each frame's stock equipment. Width and depth follow the chassis axes. Standing footprint is the width-by-depth rectangle, and the ankle measurements track the spacing of the planted feet.

| Battle measurement | Previous | Revised |
| --- | ---: | ---: |
| Reaver height | 5.09 | 4.28 |
| Reaver width × depth | 6.09 × 6.01 | 5.12 × 5.05 |
| Reaver footprint | 36.59 | 25.82 |
| Reaver ankle width × depth | 5.02 × 5.00 | 4.22 × 4.20 |
| Behemoth footprint | 26.13 | 26.08 |
| Saltjack footprint | 27.50 | 27.50 |
| Aero height | 3.87 | 4.85 |
| Husky height | 5.03 | 5.09 |

Reaver's dimensions are 16% smaller, reducing its footprint by about 29%. Its stance is still wider and deeper than Behemoth's. Aero's approved 1.25× chassis scale now carries through to combat, the Workshop and the hangar. Warden stands closer to Aero on the field and uses the shared portrait camera. Basilisk, Aegis, Giza and Vyzov had the tallest stock silhouettes and received smaller proportional adjustments.

The `checkRosterScale` browser scenario measures the battle, Workshop and rendered portrait for every frame. It passed on desktop and emulated touch. It can write the dimensions as JSON via `IRON_VOW_ROSTER_REPORT` and render this sheet via `IRON_VOW_ROSTER_SHEET`. The Warden rig adapter check also passed its armor-clearance, gait, melee and framing checks.
