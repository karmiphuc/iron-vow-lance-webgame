# Rock-cut elevations

The paired captures use the same terrain seed (101), mech position, and battle camera in v108 and the revised renderer. Move is active in both views, so reachable tiles are highlighted.

| Relay | Iron Corridor | Frontier |
| --- | --- | --- |
| [Tactical and face-on views](relay-comparison.webp) | [Tactical view](corridor-comparison.webp) | [Tactical view](frontier-comparison.webp) |

The old elevation edge had a pale cap and a ramp cut into the middle of every tile. The revised renderer follows the ridge across tile boundaries and places access cuts at intervals. It samples the visible rock where a ledge projects over the lower tile so feet can plant on the crest.

The cliff color texture comes from the CC0 *Cliff Side* photograph by Dario Barresi and James Ray Cock, processed by Jenelle van Heerden. The game uses a reduced, desaturated WebP so each theater can tint the stone locally. [Poly Haven asset and license](https://polyhaven.com/a/cliff_side)

The terrain shipped in Site v109. Site v111 added the navigation update and retained the same cliff renderer and texture. All 168 files served by v111 matched its source. Desktop and tablet-touch checks crossed both a ramp and a bluff in each of the three published theaters. The terrain release also passed 30 seeded campaign battles with zero reported scene anomalies or browser errors. See [the verification record](summary.json).
