# Blank WebGL capture regression

Visual review found a genuinely black baseline Rig Bench viewport at 1210×834, despite the painted-model DOM marker and visible HTML controls. `black-bench-before.png` retains that original invalid capture; its central viewport pixels are uniformly RGB (2, 3, 5). Its underlying browser/GPU cause was not established.

The final runner checks the existing WebGL context and actual canvas pixels immediately after rendering, then checks the viewport region in the saved PNG. Controlled captures request `preserveDrawingBuffer`; this is QA-only instrumentation and makes no device-performance claim. `png-validation.log` rejects the original bad PNG, accepts the recovered positive control, and validates all 12 new baseline/candidate/reference bench PNGs. The normal pre-retention positive control is preserved separately; it is not a second failure.

`qa/capture-blank.cjs` serves an intentionally black real-WebGL fixture with a painted-ready marker. The older runner accepts it (`before.log`); the final runner rejects every viewport (`passed.log` and the intentionally incomplete fixture manifest). The recovered bench run manifests record both canvas and saved-PNG samples. Only the checked replacements appear in the final 312-image archive.
