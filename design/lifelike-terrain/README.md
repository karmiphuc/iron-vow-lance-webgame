# Battlefield terrain

Astra 6.2 reworked the terrain across all three theaters. Level one stands 2.8 m above the
valley floor and level two reaches 5.6 m. Graded access, the ground under the
mech, the rock faces and the tactical projection use the same elevation.
The seeded layouts, cover assignments and legal routes retain their existing
rules.

The soil, moss, gravel and exposed stone blend across tile boundaries.
Fractured rock cover shares the cliff strata texture. Dark conifers cluster
along the outer board and on existing forest cover. Separate mountain massifs
leave open valleys between the near and distant ridges.

Release v120 captures. [Karst terraces](karst-terraces.webp) · [Frontier overview](frontier-overview.webp)
· [Frontier attack camera](frontier-attack-camera.webp) · [390 px overview](frontier-touch.webp)

The phase checks exercised the real desktop and touch game. They confirmed the
1024 px soil texture is loaded, level-two movement samples the rendered ground,
the forest and mountains stay outside the board, and the attack camera completes.
The three-theater comparison checked ramps, rock faces, cover, and raycast picking.

## Site release

Iron Vow v120 was published from Site source
`c05261428bf753fea7fc33176bb229b1b37b1e15`, which includes the previously
published v119 changes. All 71 simulation suites and 106 desktop and touch
browser checks passed before packaging. The public Site serves 159 checked
runtime files matching that source when v120 was first published.

Site v121, source `57abc3af3526723933f6fce3ee0c76ce9028acb4`, incorporated
v120 before adding equipment and cinematic changes. It went live during the
v120 browser run. A fresh v121 check matched all 159 public runtime files
and passed 14 desktop and touch checks for field art, cliff picking, uphill
movement, ridge combat, camera framing, and War mode. War mode observed 3,013
frames across desktop and touch with zero anomalies.

The taller cliffs exposed an unequal-leg reach limit when a mech straddled a
ledge. The regression fixture measured an ankle-to-target error of 0.123 before
the pelvis adjustment and less than 0.000001 afterward. The adjustment keeps
the foot targets fixed.

## Soil asset

`dist/assets/terrain/karst-soil.webp` was generated with the built-in ImageGen tool
and encoded as a 1024 × 1024 WebP. The prompt requested a seamless, unlit,
orthographic albedo of temperate alpine ground across roughly six meters,
with weathered gray-brown mineral dirt, dark umber mottles, angular shale
and limestone chips, and sparse olive moss and stubble. It excluded shadows,
roads, props and UI.
