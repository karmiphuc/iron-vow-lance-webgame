# Capture recovery proof

`qa/capture-recovery.cjs` forcibly terminates a real browser capture after its first saved image. The earlier runner at `8c6c422` fails because it leaves no checkpoint manifest (`before.log`). The final runner preserves one completed image, resumes all four viewports without replacing that image, and rejects a modified PNG by checksum. The raw partial/completed manifests, final result and logs are included. These are capture-tool checks, not native performance measurements.

`interrupted-webp-cache.log` records an unreadable generated WebP left by an interrupted archive encoder. Assembly now recovers it from the original PNG, verifies pixel equality, and replaces images/manifests atomically. The completed archive remains the authoritative capture set.
