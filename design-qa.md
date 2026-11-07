# IRON VOW visual rebuild — verification record

- Source visual truth: `/workspace/generated_images/exec-526049d2-af5d-4cf2-a4d7-30ea885fb5c9.png`, third displayed concept (Last Light), selected from the user's authorization to use any of the presented directions.
- Target viewport: desktop 1440 × 1024 CSS px, mobile responsive adaptation 390 × 844 CSS px.
- Source pixels: 1488 × 1056. Source density: concept raster, no browser density metadata.
- Implementation browser screenshot: unavailable.
- State: hangar / first deployment / workshop / pilots / career.

## Findings

- [P1 / verification blocker] The cloud browser's `cua_repl.js` tool is not available in this chat. Tool discovery and managed environment status were checked. The environment reports remote desktop enabled, but exposes no callable browser-control tool. Following Sites managed-preview instructions, no substitute browser server or browser automation path was launched.
- The source image was opened and used to generate clean environment art and matching individual game assets. Full-view and focused browser comparisons remain blocked. Typography, spacing, layout rhythm, final colors/contrast and responsive CSS cannot be certified from source code or native canvas images.

## Checks completed

- JavaScript syntax check.
- Simulation tests: five screens, save validation, pathfinding, destroyed legs, skills, damage, brace, enemy turn, victory/withdrawal rewards and career persistence.
- Actual DOM tests using Linkedom: hangar unit selection/details, navigation, contract deployment, manual modal, unit controls, skills, brace, subsystem targeting and damage, withdrawal, weapon purchase, reinforcement, pilot pages and career history.
- Real image decode / native canvas renderer captures at 1440 × 1024 and 390 × 844. All required game images decoded. These are the actual canvas drawing output, without browser-rendered HTML overlays or CSS; they are not browser screenshots.
- Native canvas evidence: `design/battlefield-native-desktop.png`, `design/battlefield-native-engaged.png`, `design/battlefield-native-mobile.png`.
- Application warning collection in DOM/native tests: no warnings. Browser console: not checked.
- All generated art, fonts and Phosphor icons are hosted locally. Generated original assets preserved outside deployed output. Image art direction inspected directly.

## Required fidelity surfaces

- Fonts/typography: local Barlow Condensed and Inter integrated; browser rendering not compared.
- Spacing/layout rhythm: semantic HTML/CSS implemented from the selected composition; browser comparison blocked.
- Colors/tokens: graphite, ivory, slate-blue and amber palette implemented; browser contrast/compositing unverified.
- Image quality: clean reference-based hangar, transparent original chassis, portraits, terrain and cover assets inspected. Pre-rendered 2.5D art; no claim of real-time 3D geometry.
- Copy/content: game terminology and controls retained and tested in DOM. Large marketing copy removed.

## Comparison history

- Previous primitive geometry and green marketing layout replaced with reference-based art and restrained game UI.
- Native renderer inspection found the art correctly loaded and depth-sorted; route animation now follows the same cover-aware path as the movement calculation.
- These checks do not establish a browser design-QA pass.

## Continued playability work

- User replied `Cont` after the pending browser-QA limitation and publication question. This iteration continues with that limitation disclosed; it is not a claimed visual-QA pass.
- Complete mission tests: 12/12 starter-contract victories across fixed random seeds; an earned-money career completed all three contracts after repair, weapon purchase and reinforcement.
- Recovery test: 35% emergency condition lost 12/12 attempts; the revised 50% patch won 11/12 with the same tactical driver and random seeds.
- Active-sortie checkpoints preserve AP, damaged subsystems, skills and position. Interrupted enemy phases replay once from their saved start. Completed rewards are not paid again after reload. Invalid combat checkpoints do not reset the career. Level-100 career persistence is tested.
- Mobile target details now use an explicit drawer with larger subsystem controls instead of the former tiny permanent panel. Actual DOM opening, selection and closing were checked; CSS and touch layout still require browser review.
- All these functional and native-renderer checks pass. Browser-rendered comparison and browser-console review remain unavailable.

## Animation iteration

- Added timed, frame-independent movement; alternating foot lift; torso articulation; chassis-specific pace and footfall effects.
- Added weapon-specific upper-body recoil with planted feet, attachments for muzzle/subsystem impact points, hit reactions, smooth collapse and wreck smoke. Facing persists in compatible sortie checkpoints.
- Animation checks pass at 30/60/144 Hz, including AP/landing timing and reduced-motion behavior. Existing mission, career, reload and DOM checks remain passing.
- Native renderer evidence: `design/animation-contact-sheet.png`, `design/animation-preview.mp4`. The preview contains 144 frames at 960 × 640, 24 fps. It uses the game renderer and a staged scene, without the browser-rendered HTML interface.
- One native benchmark of three animated units measured approximately 1.7 ms median / 6.1 ms p95 per rendered frame on this executor. This is not a browser/device FPS claim.
- Supported browser-control tools remain unavailable; the visual-QA result remains blocked.

## Remaining checklist

1. Open the rebuilt game in the supported cloud browser at 1440 × 1024 and 390 × 844.
2. Capture hangar and primary combat/engineering interactions with HTML overlays visible.
3. Compare the hangar capture and source together, including focused typography/control crops.
4. Check browser errors, image loading, contrast, target sizes and viewport overflow.
5. Fix observed P0/P1/P2 findings and repeat browser captures before certifying visual fidelity.

final result: blocked
