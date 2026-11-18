# Battlefield scale and readability

The terrain is a continuous place with a tactical grid, rather than a set of decorated square slabs. Worn ground uses world-aligned texture coordinates; only the actual road links receive dashed paint. Idle grid marks are low-contrast corners. Move and Fire retain their existing reachable-area and route overlays.

Normal combat framing is about 14% closer on desktop/phones and 50% closer on portrait tablets. Tablet framing biases inward near board edges; phones keep the selected unit centered so adjacent destinations remain reachable. Overview and player camera controls remain available. Physical cell pitch stays at 7.4: smaller pitches failed the existing actual long-gun and shield endpoint checks. Camera, architecture and ground composition provide scale without breaking the mounted weapons.

Visible terrain rises 1.55 world units per level, up from 0.646. Crowns are flat, retaining faces expose the height, and central graded crossings follow the existing cardinal movement routes. Feet sample the actual rendered triangles. Helicopter hover uses the same vertical scale so its clearance agrees with the unchanged terrain rules. Terrain seeds, movement costs, ridge obstruction, hit chance, damage and save data are unchanged.

Every claimed cover cell renders its authored type: rock outcrop, buttressed relay barrier, corrugated cargo, twin-bushing transformer, conifer cluster or embrasured bunker. Bounds remain inside the claimed cell. Picking the actual obstacle reports that it blocks movement; nearby-cover and ridge-shot rules retain their original behavior.

Kenney's [City Kit Industrial](https://kenney.nl/assets/city-kit-industrial), distributed by the creator on [OpenGameArt](https://opengameart.org/content/city-kit-industrial), provides three genuine factory/office/warehouse GLBs under CC0. A few claimed cargo cells become warehouses; larger buildings compose the surrounding yard outside the playable board. Original models, their relative texture dependency, license and hashes are stored together under `dist/assets/environment/industrial/`. `tools/authoring/prepare_industrial_assets.py` deterministically prepares that selection from the verified original archive. Existing Blender scenes and production mech assets are untouched.

Shotgun presentation adapts Claude's reference fan at `docs/reference/claude/rig-bench.html:1875–1883`. The existing scatter contacts provide all twelve outcomes. A deterministic muzzle-normal disk separates their paths, with range-scaled spread and matching individual impacts. The renderer consumes no gameplay RNG and leaves single-slug weapons centered.

The compact phase gate is `node qa/check-combat-readability.cjs --out /tmp/iron-vow-combat-readability`. It checks real pooled shotgun geometry, model dependencies, terrain rules, six actual WebGL views, authored cover bounds, mech size, targeting and mouse/touch ramp traversal. Native iPad performance remains unverified.
