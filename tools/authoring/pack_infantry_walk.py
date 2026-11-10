"""Replace only Infantry walk cells and their projected grip anchors."""
import json
import sys
from pathlib import Path

from PIL import Image, ImageOps

from pack_part_pass import part_cell


CELL = 320
KEYS = ("gripR", "axisR", "muzzle", "right", "gripL", "axisL")


def image(path, mirror):
    with Image.open(path) as source:
        frame = source.convert("RGBA")
    assert frame.size == (CELL, CELL), path
    return ImageOps.mirror(frame) if mirror else frame


def pack(assets, atlas, source, mirror):
    for sprite, unarmed in ((atlas["key"], ""), (atlas["unarmedKey"], "-unarmed")):
        paths = [assets / f"{sprite}{suffix}.webp" for suffix in ("", "-paint", "-parts")]
        sheets = [Image.open(path).convert("RGBA") for path in paths]
        assert all(sheet.size == (4 * CELL, 5 * CELL) for sheet in sheets)
        later = (0, 2 * CELL, 4 * CELL, 5 * CELL)
        originals = [sheet.crop(later).tobytes() for sheet in sheets]
        misses = core = 0
        for index in range(8):
            key = f"{index:02d}{unarmed}"
            color = image(source / f"{key}.png", mirror)
            paint = image(source / f"{key}-paint.png", mirror)
            part, (missing, _, pixels) = part_cell(image(source / f"{key}-parts.png", mirror), color.getchannel("A"))
            assert all(sum(paint.getchannel(channel).histogram()[217:]) > 100 for channel in "RG"), key
            misses += missing
            core += pixels
            position = (index % 4 * CELL, index // 4 * CELL)
            for sheet, layer in zip(sheets, (color, paint, part)):
                sheet.paste(layer, position)
        assert core and misses / core < .002, (sprite, misses, core)
        for path, sheet, original in zip(paths, sheets, originals):
            # Existing attack and death rows retain their original decoded pixels.
            sheet.save(path, lossless=True, exact=True, method=6)
            with Image.open(path) as saved:
                assert saved.convert("RGBA").crop(later).tobytes() == original, path
        print(f"{sprite}: 8 aligned walk cells, {misses}/{core} unlabelled core pixels")


def main():
    dist, *sources = map(Path, sys.argv[1:])
    manifest = dist / "foundry" / "baked.js"
    body = manifest.read_text(encoding="utf-8")
    prefix = "window.IRON_VOW_FOUNDRY_ART="
    assert body.startswith(prefix)
    atlases, end = json.JSONDecoder().raw_decode(body[len(prefix):])
    for source in sources:
        walk = json.loads((source / "walk.json").read_text(encoding="utf-8"))
        model = walk["model"]
        atlas = atlases[model]
        assert model in (6, 7) and atlas["cell"] == CELL and len(atlas["frames"]) == 19
        assert len(walk["frames"]) == 8 and walk["mirror"] == atlas.get("mirror", True)
        pack(dist / "assets", atlas, source, walk["mirror"])
        for frame, revised in zip(atlas["frames"], walk["frames"]):
            assert frame["name"] == "walk" and set(revised) == set(KEYS)
            frame.update(revised)
    manifest.write_text(prefix + json.dumps(atlases, separators=(",", ":")) + body[len(prefix) + end:],
                        encoding="utf-8")


if __name__ == "__main__":
    main()
