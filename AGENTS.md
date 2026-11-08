# Iron Vow source and releases

- Open the existing Iron Vow Site through the Sites source helper. Compare its deployed source SHA with the checkout before editing.
- Keep frame and pilot IDs stable. Add a new save fixture for schema changes and keep the published fixtures runnable.
- When fixing a regression, add an assertion for the visible behavior or save state that failed. Reproduce the failure with the prior build or an isolated failing fixture.
- Package releases through `node qa/site-package.cjs <path to site-workflow.mjs>` from the checked-out source. It inserts the release checks into the Sites helper before source commit, push and archive. Resolve any failure before saving or deploying a version.
- After publishing, run `node qa/release-check.cjs --live <public HTTPS URL>` from the published checkout. Record the version and the result.

See [Release checks](qa/README.md) for setup and covered behavior.
