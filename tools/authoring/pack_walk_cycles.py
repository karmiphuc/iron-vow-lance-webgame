"""Pack the dedicated walking sprites without modifying combat or idle sheets."""
import argparse
import json
import shutil
from pathlib import Path

from PIL import Image, ImageOps

from pack_part_pass import part_cell


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def panel(path, mirror):
    with Image.open(path) as image:
        frame = image.convert("RGBA")
    return ImageOps.mirror(frame) if mirror else frame


def pack(assets, key, size, frames, paths, mirror=False, paint=False):
    dimensions = (4 * size, ((len(frames) + 3) // 4) * size)
    beauty, parts = (Image.new("RGBA", dimensions) for _ in range(2))
    palette = Image.new("RGBA", dimensions) if paint else None
    for index, (sprite, mask, paint_path) in enumerate(paths):
        frame, raw = panel(sprite, mirror), panel(mask, mirror)
        assert frame.size == raw.size == (size, size), sprite
        damage, (missing, _, core) = part_cell(raw, frame.getchannel("A"))
        assert core and missing / core < .003, (key, index, missing, core)
        at = (index % 4 * size, index // 4 * size)
        beauty.paste(frame, at)
        parts.paste(damage, at)
        if palette is not None:
            palette.paste(panel(paint_path, mirror), at)
    beauty.save(assets / f"{key}.webp", quality=91, method=5, exact=True)
    parts.save(assets / f"{key}-parts.webp", lossless=True, method=5)
    if palette is not None:
        palette.save(assets / f"{key}-paint.webp", lossless=True, method=5)
    print(f"{key}: {len(frames)} walk poses")
    return {"key": key, "partMask": key + "-parts", "cell": size, "frames": frames, "paint": paint}


def infantry(assets, source):
    data = read_json(source / "walk.json")
    model, frames, mirror = data["model"], data["frames"], data["mirror"]
    assert model in (6, 7) and len(frames) == 24
    assert max(row["drift"] for row in data["grip"]) < .00001
    assert max(max(row["gripDistances"].values()) for row in data["grip"]) < .008
    variants = []
    for suffix in ("", "-unarmed"):
        paths = [(source / f"{i:02}{suffix}.png", source / f"{i:02}{suffix}-parts.png",
                  source / f"{i:02}{suffix}-paint.png") for i in range(len(frames))]
        variants.append(pack(assets, f"foundry-{model}-walk{suffix}", 320, frames, paths, mirror, paint=True))
    return model, {"variants": variants * 2}


def gravemaw(assets, source, masks):
    data = read_json(source / "atlas.json")
    frames, size = data["frames"], data["cell"]
    assert len(frames) == 24
    variants = []
    for label in ("full", "right-down", "left-down", "disarmed"):
        paths = [(source / f"{label}-{i:02}.png", masks / f"{label}-{i:02}.png", None)
                 for i in range(len(frames))]
        variants.append(pack(assets, f"foundry-8-walk-{label}", size, frames, paths))
    return {"variants": variants}


def copy_atlas(assets, manifest, sprites):
    def copy_clip(clip):
        if "directions" in clip:
            return {"directions": [copy_clip(view) for view in clip["directions"]]}
        if "variants" in clip:
            return {"variants": [copy_clip(view) for view in clip["variants"]]}
        expected = (4 * clip["cell"], ((len(clip["frames"]) + 3) // 4) * clip["cell"])
        for key in (clip["key"], clip["partMask"]):
            source = sprites / f"{key}.webp"
            with Image.open(source) as image:
                assert image.size == expected, (source, image.size, expected)
            shutil.copyfile(source, assets / source.name)
        return {key: clip[key] for key in ("key", "partMask", "cell", "frames")}

    return copy_clip(read_json(manifest))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dist", type=Path)
    parser.add_argument("--infantry", type=Path, nargs="+", required=True)
    parser.add_argument("--gravemaw", type=Path, nargs=2, required=True)
    parser.add_argument("--atlas", nargs=3, action="append", default=[], metavar=("MODEL", "JSON", "SPRITES"))
    args = parser.parse_args()
    assets = args.dist / "assets"
    atlases = dict(infantry(assets, source) for source in args.infantry)
    atlases[8] = gravemaw(assets, *args.gravemaw)
    for model, source, sprites in args.atlas:
        atlases[int(model)] = copy_atlas(assets, Path(source), Path(sprites))
    output = args.dist / "foundry" / "walk.js"
    output.write_text("window.IRON_VOW_WALK=" + json.dumps(atlases, separators=(",", ":")) + ";\n", encoding="utf-8")
