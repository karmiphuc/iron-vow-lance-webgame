# Warden field finish and battlefield art

The Workshop's **Paint → Field worn** finish uses the approved olive and
graphite Warden palette, matte paint and fine wear. The finish follows the
hull through save, reload and deployment. The lower sun, cool sky fill and
warmer ground are strongest in Karst Basin. Corridor and Frontier keep their
own palettes. World-space dust, strata and soft ripples shade the existing
terrain and leave traversal and cover geometry intact.

- Workshop [desktop](workshop-desktop.webp) and [touch](workshop-touch.webp).
- Picket Sweep [desktop](sortie-desktop.webp) and [touch](sortie-touch.webp).

The GitHub checkout passed 72 simulation suites. The focused Chromium gate
passed Workshop paint, field-art deployment and terrain picking and movement
on desktop and 390 px emulated touch. The rendered sortie checks for WebGL
shader errors. The four captures use the Workshop and Picket Sweep controls
at full viewport resolution.

## Published verification

Public Sites version **118** serves source commit
`f17d6fa8d649973efb526c6d3cfee455c680a2bd`. The package passed 71 simulation
suites and 52 browser scenarios on each of desktop and emulated touch.
Post-deployment checks matched all 158 served runtime files to the
release checkout. The live Workshop, field-art deployment and terrain scenarios
passed on both layouts.

The release exposed a pre-existing false failure in Ashigaru's browser test.
On version 117 the rotated bounding box reached 0.0516 m below the floor,
while the lowest actual sole vertex reached 0.0307 m. The test now measures
the rendered geometry against the original 0.05 m limit.
