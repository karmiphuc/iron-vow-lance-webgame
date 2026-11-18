# Combat presentation

Owner feedback (2026-11-18) on the attack camera and combat effects. The gate is `node qa/check-combat-presentation.cjs`, also run by `npm test`. Each assertion names the behaviour that failed before; on main a5b904e the gate fails at its first assertion with a 10.5 m round.

| Feedback | Before (main) | Now | Assertion |
|---|---|---|---|
| Camera showed the defender's front and only the attacker's shoulder | Camera 6.5 m behind the attacker | Aim: over the defender's shoulder at the attacker's front, with the defender's raised guard in the foreground. Fire/result: side two-shot sized to the horizontal FOV, with both mechs in frame and the defender's front taking the hits. Side picked clear of cover and props; return fire gets its own framing. | Captures below |
| Brace, step-up and priming too fast | Rifle about 0.6 s, missile about 1.0 s, from the attack starting to the first round | About 1.6 s and 1.8 s. The step-up runs 1.6x and the gun holds raised 0.45 s longer. The result beat is unchanged. | `CINEMATIC_PACE`; `check-tactical` timings |
| Health bars too big and not immersive | Boxed three-row table over every mech, with numbers on the focused one | One thin body bar; the focused mech gets a slim five-part row; nothing during the duel | Captures below |
| Bullets look like lasers | Tail 35% of the path (10.5 m on a 30 m shot), every round | A 2.2 m warm tracer on every third round; others are faint 0.9 m flicks | Streak length and opacity |
| Impacts barely visible | Bench-sized flash (0.14 s) and sparks read as specks 15–30 m out | Flash x1.7, held x1.6; sparks x1.3; grey kinetic puff | Spark count, size and flash width |
| Missiles flew a low arc | Control point 4–6.5 m up, so a flat arc in 0.42 s | 45° launch, about 7 m climb, dropping onto the target over 1.0 s | Launch angle and apex |
| Destroyed mechs could be targeted | Wreck hit proxies resolved to the dead unit | Never picked; `engage` refuses wrecks; a destroyed target releases the lock | Pick, lock and `engage` |
| Hide other mechs during the duel | — | Bystanders and the selection and target rings are hidden while the duel camera plays | Captures below |
| FM3-style evade on total misses | Only Aero's authored dodge, after the volley | Every rig: a dodge hops about 1.6 m back and aside, a miss sways and ducks, both timed to the rounds; rule tiles never move | Evade offset and settle |

## Why the impacts "weren't merged"

The impact work was merged, through a different route than the one that comes to mind:

- **#4** (2D PixelFX canvas impacts) was closed in favour of the 3D Rig Bench version in **#8**.
- **#21** ported that 3D version into the game.
- The game's `impact()` is byte-identical to the bench's (`docs/reference/claude/rig-bench.html:1742`).

The problem was scale: the bench views a mech from a few metres away, while the board camera sits 15–30 m out.

## Captures

All captures are 1100×680 SwiftShader frames from a Warden vs Jackal fixture, timed by the page clock.

| File | Shows |
|---|---|
| `rifle-before-main.webp` / `rifle-after.webp` | Rifle volley; the after sheet ends with the return fire |
| `missile-before-main.webp` / `missile-after.webp` | Cerberus missiles |
| `dodge-after.webp` | Dodge, cropped to the defender at 0.15 s steps |
