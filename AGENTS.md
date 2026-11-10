# Iron Vow repository

- The development repository is `https://github.com/karmiphuc/iron-vow-lance-webgame`. Its `origin` remote is GitHub.
- `npm run dev` serves the complete game from `dist/` without runtime dependencies or a build step. Optional QA dependencies are installed with `npm run setup:qa`.
- `docs/sites-export.json` records the imported Sites source and version. Preserve `.openai/hosting.json`; it identifies the existing Iron Vow Site.
- Ordinary GitHub development and source synchronization do not publish the Site. For a requested Sites deployment, use a dedicated Sites source checkout and the release workflow below, keeping the GitHub repository synchronized with the resulting source.

## Sites source and releases

- Open the existing Iron Vow Site through the Sites source helper. Compare its deployed source SHA with the checkout before editing.
- Keep frame and pilot IDs stable. Add a new save fixture for schema changes and keep the published fixtures runnable.
- When fixing a regression, add an assertion for the visible behavior or save state that failed. Reproduce the failure with the prior build or an isolated failing fixture.
- Package releases through `node qa/site-package.cjs <path to site-workflow.mjs>` from the checked-out source. It inserts the release checks into the Sites helper before source commit, push and archive. Resolve any failure before saving or deploying a version.
- After publishing, run `node qa/release-check.cjs --live <public HTTPS URL>` from the published checkout. Record the version and the result.

See [Release checks](qa/README.md) for setup and covered behavior.
