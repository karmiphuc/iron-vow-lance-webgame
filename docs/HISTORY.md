# Project history

## 2026-11-12: history rewrite

The owner approved shrinking the repository. Before the rewrite, `.git` was about 654 MB (611 MB packed), mostly screenshots and capture JSON under `design/` (about 428 MB in the working tree at the time). Every fresh agent session had to clone all of it.

What was done:
- History was replaced with two commits:
  1. **`sites-v98` source** – the tree of the deployed Sites v98 source (old commit `853f1e7510dc2ca5940f09575efea737cfe2ea5a`). The `dist/` tree hash is unchanged (`a716bb2c2645a813b0ef6f0cb360e41cf6071f54`, as recorded in `docs/sites-export.json`). Tag `sites-v98` points here. This is also the pre-renderer game; check it out to recapture the old 2D baseline if ever needed.
  2. **main** – the tree of old main `57d854f68e02317cd824ecef309136f269b1caba`, plus this file and `docs/history/`.
- Removed from both trees: every file under `design/` except Markdown. Screenshots, capture JSON, campaign shards and manifests are gone; the Markdown READMEs that describe the evidence remain. QA scripts that wrote to or compared against `design/...` still work if they regenerate their inputs; `qa/assemble-phase1.py` and `qa/capture-phase2-matched.cjs` read the deleted Phase 0 baseline captures and need a fresh `qa/capture.cjs` run (against `sites-v98`) first.
- Open PR branches `renderer/phase3` (#22), `renderer/phase4` (#23) and `claude/agents-pace-rules` (#24) were rebuilt as one commit each on the new main, carrying the same changes (minus `design/` binaries).
- Deleted: merged branches, the stale unpublished Sites branches, the closed PR #4 branch, and tags `sites-v84`…`sites-v97`. They are recorded below.
- GitHub still keeps each pull request's original commits and diffs on its PR page, so the PR links below remain the most detailed record.
- Every commit (old SHA, date, author, subject, files touched) is listed in [history/commits.md](history/commits.md).

**Agents:** clones made before 2026-11-12 are on the old history. Re-clone. Never push a branch whose base is a pre-rewrite commit; that would re-upload the old history.

## Pull requests

| # | State | Branch | Title |
|---|---|---|---|
| [#1](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/1) | merged 2026-11-10 | `fix/oni-behemoth-rigs` | Fix Foundry leg IK; Behemoth kneel; Oni stance, carry and firing poses |
| [#2](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/2) | merged 2026-11-10 | `feat/live-warden` | Live Warden: re-rigged painted Warden drawn live in combat |
| [#3](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/3) | closed, not merged | `rigs/oni-behemoth-warden` | Integrate replacement live Warden branch |
| [#4](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/4) | closed, not merged | `feat/pixelfx-impact-electrical-collapse` | feat(vfx): directional armor sparks and rig-anchored electrical collapse |
| [#5](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/5) | merged 2026-11-10 | `claude/reference-3d-builds` | Add Claude reference builds for the 3D renderer rebuild |
| [#7](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/7) | merged 2026-11-11 | `renderer/phase0` | Renderer Phase 0: capture matrix, perf overlay and source inventory |
| [#8](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/8) | merged 2026-11-11 | `claude/impact-arcs-3d` | 3D directional impacts and electrical faults in the Rig Bench reference |
| [#9](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/9) | merged 2026-11-11 | `claude/effects-review-fixes` | Effects review fixes and bluer electrical arcs |
| [#18](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/18) | merged 2026-11-11 | `renderer/phase1` | Phase 1: shared WebGL battle scene and eight live rigs |
| [#19](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/19) | merged 2026-11-11 | `claude/arc-plasma-mix` | Plasma tendril arcs with random spark crawl / joint shorts |
| [#20](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/20) | merged 2026-11-11 | `fix/reference-walk` | Reference walk: planted feet, reachable legs, zero War soak anomalies |
| [#21](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/21) | merged 2026-11-11 | `renderer/phase2` | Phase 2: live combat effects and physical weapon mounts |
| [#22](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/22) | open | `renderer/phase3` | Phase 3 preparation: validate rig-v2 exports and skeleton ancestry |
| [#23](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/23) | open | `renderer/phase4` | Phase 4 preparation: shared-renderer hangar scene and fixture |
| [#24](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/24) | open | `claude/agents-pace-rules` | AGENTS.md: pace and evidence rules for renderer phases |

## Sites releases (tags)

Each `sites-vNN` tag marked the source of a published Iron Vow Site version. All were on main.

| Tag | Old commit | Date | Subject |
|---|---|---|---|
| sites-v84 | `5faec4ce99676df98f9a7d84978956cc6cd7cfee` | 2026-11-09 | Update Site source |
| sites-v85 | `3b0da1480b0c66b05ca65d639b65d8a4eb320286` | 2026-11-09 | Update Site source |
| sites-v86 | `e1c6b389be5178331a9b1b446a53ab54bd85c26d` | 2026-11-09 | Update Site source |
| sites-v87 | `901aa07021c644ec7f3d2e41f82eb9a5128693af` | 2026-11-09 | Update Site source |
| sites-v88 | `4a430612e40d860ceeb00b205baf8d8949e36855` | 2026-11-09 | Update Site source |
| sites-v89 | `2edb19d5a7132d1cdd2900067358f888bea68d66` | 2026-11-09 | Update Site source |
| sites-v90 | `f3cd60ba689df82916b47c925e2db311b2912f7d` | 2026-11-09 | Update Site source |
| sites-v91 | `b9bf129613c3612817ff8b4aeb5ae10ab5246c9d` | 2026-11-09 | Update Site source |
| sites-v92 | `cf1288eee5a4ca7e06b62f03734ea58c2faf8e9a` | 2026-11-09 | Update Site source |
| sites-v93 | `b350b5dcc320ffffc515adda4cbe8f8a4ad6da7e` | 2026-11-09 | Update Site source |
| sites-v94 | `48e960d266d514a12c252af6e501efc56a59a7ac` | 2026-11-09 | Update Site source |
| sites-v95 | `3ddba1c6e402b93d3545143b7e7e74aafb2afb8a` | 2026-11-09 | Update Site source |
| sites-v96 | `9eecddafac064f724889d1ebbb51b82da37dc715` | 2026-11-10 | Update Site source |
| sites-v97 | `82f22a5f10df4d975d96fd197b8e6de32a10c79c` | 2026-11-10 | Update Site source |
| sites-v98 | `853f1e7510dc2ca5940f09575efea737cfe2ea5a` | 2026-11-10 | Port filterless canvas rendering and repair live rig regressions |

Site: `https://iron-vow-mercenary-command.karmi-nguyen.chatgpt.site`, project `appgprj_6aeeef176ee08191afe74f9556b02484` (see `docs/sites-export.json`). Only `sites-v98` was kept.

## Branches at the rewrite

| Branch | Head (old) | State |
|---|---|---|
| `claude/agents-pace-rules` | `021ea2caa2` | 1 commits not in main |
| `claude/arc-plasma-mix` | `cab15a1f3e` | merged into main |
| `claude/effects-review-fixes` | `71bac94348` | merged into main |
| `claude/impact-arcs-3d` | `2e795ef74a` | merged into main |
| `claude/reference-3d-builds` | `06a0b33418` | merged into main |
| `feat/live-warden` | `f85a327666` | merged into main |
| `feat/pixelfx-impact-electrical-collapse` | `ea807cd650` | 8 commits not in main |
| `fix/oni-behemoth-rigs` | `f73e05248b` | merged into main |
| `fix/reference-walk` | `b6a7437ebd` | merged into main |
| `main` | `57d854f68e` | merged into main |
| `renderer/phase0` | `1a67e6eafb` | merged into main |
| `renderer/phase1` | `c70020f620` | merged into main |
| `renderer/phase2` | `e0c7ede5ea` | merged into main |
| `renderer/phase3` | `a78ec2b608` | 8 commits not in main |
| `renderer/phase4` | `1ec2403ac6` | 17 commits not in main |
| `rewrite/claude/agents-pace-rules` | `05a1566ec3` | 3 commits not in main |
| `rewrite/main` | `87cccf9665` | 2 commits not in main |
| `rewrite/renderer/phase3` | `90b22a5829` | 3 commits not in main |
| `rewrite/renderer/phase4` | `e36775c563` | 3 commits not in main |
| `rewrite/sites-v98` | `a1a9b7f0a4` | 1 commits not in main |
| `rigs/oni-behemoth-warden` | `ba88e173ed` | merged into main |
| `sites/iron-vow-candidate` | `7cb066a58c` | 13 commits not in main |
| `sites/iron-vow-next` | `e45e8cd503` | 18 commits not in main |

### Unmerged work that was dropped

- **`feat/pixelfx-impact-electrical-collapse`** (closed PR #4): Codex's 2D canvas directional sparks and electrical collapse. Withdrawn by the owner and superseded by the 3D effects in #8, #9 and #19. Its 8 commits and files are in `history/commits.md`.
- **`sites/iron-vow-candidate`** and **`sites/iron-vow-next`**: unpublished Sites source candidates from the Phase 0 period. `candidate` merged PR #4 (later withdrawn); `next` withdrew it again. Their only change against main was `docs/sites-candidate.md`, which said: PR #4 withdrawn; 47 simulation suites passed on 2026-11-11; the candidate release check had not passed (desktop Rig Bench locator timeout); native iPad performance pending; `docs/release-verification.json` stays at the last published release. None of it was published.
