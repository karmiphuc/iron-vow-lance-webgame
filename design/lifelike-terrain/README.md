# Battlefield terrain

Astra 6.2 reworked the three battlefields. Level one stands 2.8 m above the
valley floor and level two reaches 5.6 m. Graded access, the ground under the
mech, the rock faces and the tactical projection use the same elevation.
The seeded layouts, cover assignments and legal routes retain their existing
rules.

The soil, moss, gravel and exposed stone blend across tile boundaries.
Fractured rock cover shares the cliff strata texture. Dark conifers cluster
along the outer board and on existing forest cover. Separate mountain massifs
leave open valleys between the near and distant ridges.

[Karst terraces](karst-terraces.webp) · [Frontier overview](frontier-overview.webp)
· [Frontier attack camera](frontier-attack-camera.webp) · [390 px overview](frontier-touch.webp)

The phase checks exercised the real desktop and touch game. They confirmed the
1024 px soil texture is loaded, level-two movement samples the rendered ground,
the forest and mountains stay outside the board, and the attack camera completes.
The three-theater comparison checked ramps, rock faces, cover, and raycast picking.

## Soil asset

`dist/assets/terrain/karst-soil.webp` was generated with the built-in ImageGen tool
and encoded as a 1024 × 1024 WebP. The prompt requested a seamless, unlit,
orthographic albedo of temperate alpine ground across roughly six meters,
with weathered gray-brown mineral dirt, dark umber mottles, angular shale
and limestone chips, and sparse olive moss and stubble. It excluded shadows,
roads, props and UI.
