#!/usr/bin/env bash
# Export Warden from the recovered .blend with Blender 5.2.4 and Node.
# Pass a scratch output directory for the final warden.glb and intermediate binds.
set -euo pipefail
if [ "$#" -ne 2 ]; then
  printf 'Usage: %s WARDEN_SOURCE_BLEND SCRATCH_OUTPUT_DIRECTORY\n' "$0" >&2
  exit 2
fi
tools_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
repo="$(cd -- "$tools_dir/../../.." && pwd)"
source_blend="$1"
out_dir="$2"
blender="${BLENDER_EXECUTABLE:-blender}"
mkdir -p "$out_dir"
"$blender" --background --factory-startup --disable-autoexec "$source_blend" --python-exit-code 1 \
  --python "$tools_dir/export_v2.py" -- bench "$out_dir"
node "$tools_dir/warden-bind.cjs" bind "$repo" "$out_dir" "$source_blend"
"$blender" --background --factory-startup --disable-autoexec --python-exit-code 1 \
  --python "$tools_dir/export_v2.py" -- compress "$out_dir"
node "$tools_dir/warden-bind.cjs" pack "$repo" "$out_dir"
node "$repo/qa/check-rig-v2.cjs" "$out_dir/warden.glb"
