"""Bake masks for sheets whose original rig revision differs from the current rig."""
import shutil
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parents[1]


def copy_into(work, name, revision=None):
    target = work / name
    target.parent.mkdir(parents=True, exist_ok=True)
    if revision:
        target.write_bytes(subprocess.check_output(["git", "show", f"{revision}:{name}"], cwd=ROOT))
    else:
        shutil.copyfile(ROOT / name, target)


def bake(work, tool, args):
    subprocess.run(["node", f"tools/{tool}.cjs", "-", *args, "--parts-only"], cwd=work, check=True)


def main():
    with TemporaryDirectory(prefix="iron-vow-atlas-") as temp:
        work = Path(temp)
        (work / "dist/assets").mkdir(parents=True)
        shutil.copytree(ROOT / "qa/node_modules/@napi-rs", work / "qa/node_modules/@napi-rs")
        for name in (
            "tools/chassis-part-mask.cjs", "tools/stock-part-map.cjs",
            "tools/render_foundry.cjs", "tools/render_travel.cjs",
            "dist/foundry/baked.js", "dist/foundry/production-arsenal.js",
            "dist/foundry/behemoth-core.js", "dist/grid-travel-visuals.js",
            "dist/rig-bench/vendor/three.min.js", "dist/rig-bench/vendor/GLTFLoader.js",
            "dist/rig-bench/weapons.glb",
        ):
            copy_into(work, name)
        # These revisions last changed the corresponding beauty atlases.
        for revision, tool in (("d3076aa", "render_foundry"), ("8483eec", "render_travel")):
            for name in ("dist/foundry/chassis.js", "dist/foundry/rig-motion.js"):
                copy_into(work, name, revision)
            for model in range(5):
                key = f"foundry-{model}-motion" if tool == "render_foundry" else f"grid-travel-foundry-{model}"
                copy_into(work, f"dist/assets/{key}.webp")
                bake(work, tool, [str(model)] if tool == "render_foundry" else [".", f"foundry-{model}"])
        copy_into(work, "dist/rig-bench/prototypes/gatecrasher.glb", "a961496")
        copy_into(work, "dist/assets/grid-travel-gatecrasher.webp")
        bake(work, "render_travel", [".", "gatecrasher"])
        for mask in (work / "dist/assets").glob("*-parts.webp"):
            shutil.copyfile(mask, ROOT / "dist/assets" / mask.name)


if __name__ == "__main__":
    main()
