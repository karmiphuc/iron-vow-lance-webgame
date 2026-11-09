"""Pack the original Blender pose and variant layouts into damage-part sheets."""
import json
import sys
from pathlib import Path

from pack_part_pass import pack_frames


def metadata(folder, name="atlas.json"):
    return json.loads((folder / name).read_text(encoding="utf-8"))


def pack_assets(source, assets, selected):
    def pack(group, key, atlas, folder, frame_name, mirror=False):
        if not selected or group in selected:
            paths = (folder / frame_name(i) for i in range(len(atlas["frames"])))
            pack_frames(assets, key, atlas["cell"], paths, mirror)

    aero = source / "aero"
    if not selected or "aero" in selected:
        atlas = metadata(aero)
        for name, motion in [("base", atlas), *atlas["strikes"].items()]:
            pack("aero", motion["key"], {**motion, "cell": atlas["cell"]}, aero,
                 lambda i: f"{name}-{i:02}.png")

    ashigaru = source / "ashigaru"
    if not selected or "ashigaru" in selected:
        atlas = metadata(ashigaru, "frames.json")
        pack("ashigaru", atlas["key"], atlas, ashigaru, lambda i: f"{i:03}.png")

    gravemaw = source / "gravemaw"
    if not selected or "gravemaw" in selected:
        atlas = metadata(gravemaw)
        for variant in ("full", "right-down", "left-down", "disarmed"):
            key = atlas["key"] if variant == "full" else f"foundry-8-{variant}"
            pack("gravemaw", key, atlas, gravemaw, lambda i: f"{variant}-{i:02}.png")

    reaver = source / "reaver" / "game-bake-hd"
    if not selected or "reaver" in selected:
        atlas = metadata(reaver)
        for variant in ("dual", "left", "right", "bare"):
            pack("reaver", f"reaver-{variant}", atlas, reaver, lambda i: f"{variant}-{i:02}.png")

    for label in ("line", "elite"):
        folder = source / label / "game-bake"
        if not selected or label in selected:
            atlas = metadata(folder)
            pack(label, atlas["key"], atlas, folder, lambda i: f"{i:02}.png",
                 atlas.get("mirror", True))
            unarmed = atlas["key"].replace("-motion", "-unarmed")
            pack(label, unarmed, atlas, folder, lambda i: f"{i:02}{'-unarmed' if i < 17 else ''}.png",
                 atlas.get("mirror", True))
        if not selected or "death" in selected:
            folder = source / f"{label}-death"
            atlas = metadata(folder)
            pack("death", atlas["key"], atlas, folder, lambda i: f"{i:02}.png", atlas["mirror"])

    if not selected or "roster-death" in selected:
        for folder in sorted((source / "death").iterdir()):
            key = folder.name
            with (assets / f"{key}.webp").open("rb") as file:
                from PIL import Image
                with Image.open(file) as original:
                    cell = original.width // 4
            atlas = {"cell": cell, "frames": range(42)}
            pack("roster-death", key, atlas, folder, lambda i: f"{i:02}.png")


if __name__ == "__main__":
    source, assets = map(Path, sys.argv[1:3])
    pack_assets(source, assets, sys.argv[3:])
