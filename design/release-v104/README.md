# Sites production release 104

Production is https://iron-vow-mercenary-command.karmi-nguyen.chatgpt.site. The source commit, saved version and successful deployment are recorded in summary.json. The Sites source tree exactly matches the backed-up GitHub release source. The existing Site identity and public audience were preserved, and no existing runtime assets were removed.

The release includes the merged combat/UI and overworld changes through PR #39. Release QA also restored purchased Recon perks on pooled boards, actual paid scouting rosters, local once-per-day surveys, the auxiliary-lance indication and a 44-pixel contact disclosure.

All 66 simulation suites passed, including eight career/sortie fixtures. All 46 maintained browser cases passed on desktop and touch. To avoid repeating completed work, 25 desktop rig/combat cases were retained after verifying unchanged JS/asset blobs and scenario hashes. The only subsequent runtime difference was the scoped contact disclosure height; final desktop/touch overworld assertions cover it. Two touch infantry-carry sampling attempts retried through the existing runner before passing with unchanged assertions.

The Site was packaged through qa/site-package.cjs, saved as version 104 and deployed successfully. The post-deployment qa/release-check.cjs --live run compared 153 deployed runtime files byte-for-byte and passed Campaign, Ship, Overworld, Living World, Port Events and Hangar on desktop and touch. Raw logs and reports remain outside the repository; their hashes are in the compact summary. No new screenshots were needed. Native iPad performance remains unverified.

The fixed regressions have focused assertions. qa/check-overworld-living.cjs catches missing Recon/scouted rosters and surveys. qa/check-contract-fixture.cjs catches the Frontier contract appearing later in the pool. qa/browser/overworld-living.cjs catches the contact disclosure falling below 44px. Published save fixtures preserve the old careers and prevent repeated transit charges.
