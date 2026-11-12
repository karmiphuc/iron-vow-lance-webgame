# Iron Vow repository

- The development repository is `https://github.com/karmiphuc/iron-vow-lance-webgame`. Its `origin` remote is GitHub.
- After completing each phase, commit that phase's changes and verification evidence, push to GitHub, and verify the remote branch head before reporting the phase complete. Do not wait for later phases or a final merge to back up completed work.
- History was rewritten on 2026-11-12 to shrink the repository (see `docs/HISTORY.md`). Re-clone if your copy predates that, and never push a branch based on a pre-rewrite commit. Screenshots and capture JSON under `design/` are not kept in git history; commit only what the current phase needs.
- `npm run dev` serves the complete game from `dist/` without runtime dependencies or a build step. Optional QA dependencies are installed with `npm run setup:qa`.
- Owner approval for this work: local Playwright screenshots are approved, including in the hosted environment ([PR #7 approval](https://github.com/karmiphuc/iron-vow-lance-webgame/pull/7#issuecomment-6785288934)).
- `docs/sites-export.json` records the imported Sites source and version. Preserve `.openai/hosting.json`; it identifies the existing Iron Vow Site.
- Ordinary GitHub development and source synchronization do not publish the Site. For a requested Sites deployment, use a dedicated Sites source checkout and the release workflow below, keeping the GitHub repository synchronized with the resulting source.

## Sites source and releases

- Open the existing Iron Vow Site through the Sites source helper. Compare its deployed source SHA with the checkout before editing.
- Keep frame and pilot IDs stable. Add a new save fixture for schema changes and keep the published fixtures runnable.
- When fixing a regression, add an assertion for the visible behavior or save state that failed. Reproduce the failure with the prior build or an isolated failing fixture.
- Package releases through `node qa/site-package.cjs <path to site-workflow.mjs>` from the checked-out source. It inserts the release checks into the Sites helper before source commit, push and archive. Resolve any failure before saving or deploying a version.
- After publishing, run `node qa/release-check.cjs --live <public HTTPS URL>` from the published checkout. Record the version and the result.

See [Release checks](qa/README.md) for setup and covered behavior.

<!-- pace-rules:start (owner, 2026-11-12; replace this block as a whole when revising) -->
## Pace and evidence

These rules set how much verification output a phase produces. Where a phase issue's "Done when" asks for captures, evidence or a 30-battle campaign, meet it with the minimum below and add no further layers. They do not relax correctness checks, regression assertions, owner approvals, the per-phase GitHub backup or the release steps above. Native iPad numbers stay "unverified" until the owner supplies them.

1. **One fast gate per phase.** A single command (for example `node qa/check-phaseN.cjs`) that exits non-zero on failure and finishes in about 10 minutes on headless SwiftShader. It is the merge gate and runs on every push.
2. **Long runs once, resumable.** The 30-seed `check-scene.cjs` campaign and similar long runs happen once, on the final head before merge, not per commit. Write per-seed results to a scratch directory outside the repo, keyed by commit and seed, and skip seeds already finished for that commit, so a lost environment resumes instead of restarting. Combine at the end.
3. **Evidence is overwritten, not accumulated.** `design/phaseN/` holds only the final state: one `summary.json` (commit, commands, pass/fail, counts, seeds, failures; under about 200 KB), at most about 12 WebP screenshots, and one `README.md`. Keep the whole phase under about 10 MB. Do not commit dated, `development/`, `prior-*`, superseded or before-fix copies, shard dumps, per-tick logs or image-equality records. Git history keeps earlier states.
4. **Failures.** A failing run is recorded only when it motivated a fix, as one line in the README next to the regression assertion that now catches it.
5. **Reuse before re-deriving.** Working Rig Bench code in `docs/reference/claude/` (FX, rigs, paint, War sim) is the starting point. Adapt it and cite the source line range in a comment.
6. **Blocked phases.** If a phase needs something only the owner can supply (for example Blender sources or Blender MCP for Phase 3), post one comment on that phase issue listing exactly what is needed, then move to the next unblocked phase. Preparation PRs are fine; keep them small and mergeable.
7. **Idempotent scripts.** Check and capture scripts take `--out`, overwrite their outputs, use fixed seeds and fetch nothing from the network at run time. Re-running on the same commit gives the same summary apart from timing fields.
8. **Short PR descriptions.** About 40 lines at most: what changed, the gate output, and what remains unverified.
<!-- pace-rules:end -->
