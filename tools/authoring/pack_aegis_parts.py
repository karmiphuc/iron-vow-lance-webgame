"""Pack the Aegis flat render pass using the existing combat atlas layout."""
import json
import sys
from pathlib import Path

from PIL import Image
from pack_part_pass import pack_frames, part_cell


def save_sheet(sheet, assets, key):
    with Image.open(assets / f"{key}.webp") as beauty:
        if sheet.size != beauty.size:
            raise ValueError(f"Layout mismatch for {key}: {sheet.size} vs {beauty.size}")
        mask, _ = part_cell(sheet, beauty.convert("RGBA").getchannel("A"))
    mask.save(assets / f"{key}-parts.webp", lossless=True, method=6)


def main():
    source, dist = map(Path, sys.argv[1:3])
    assets = dist / "assets"
    prefix = "window.IRON_VOW_FOUNDRY_ART[10]="
    atlas = json.loads((dist / "foundry" / "aegis-baked.js").read_text(encoding="utf-8")
                       .strip().removeprefix(prefix).removesuffix(";"))
    render = json.loads((source / "atlas.json").read_text(encoding="utf-8"))
    cell, small = atlas["cell"], atlas["fallbackCell"]
    if cell != render["cell"] or atlas["idle"] != render["idle"]:
        raise ValueError("Aegis render and sprite manifest use different layouts")
    fallback = Image.new("RGBA", (4 * small, 4 * small))
    for direction, view in enumerate(atlas["directions"]):
        for arm, variant in enumerate(("full", "right-down", "left-down", "disarmed")):
            key = view["variants"][arm]
            files = sorted((source / str(direction)).glob(f"{variant}-*.png"))
            if not files:
                raise ValueError(f"No frames for {key}")
            for slot, path in enumerate(files):
                index = int(path.stem.rsplit("-", 1)[1])
                if atlas["layouts"][arm][index] != slot:
                    raise ValueError(f"Unexpected slot {slot} for {path}")
                if index == atlas["idle"]:
                    with Image.open(path) as raw:
                        frame = raw.convert("RGBA")
                        fallback.paste(frame.resize((small, small), Image.Resampling.NEAREST),
                                       (arm * small, direction * small))
                        if (direction, arm) == (3, 0):
                            save_sheet(frame, assets, "foundry-10")
            pack_frames(assets, key, cell, files)
    save_sheet(fallback, assets, atlas["key"])


if __name__ == "__main__":
    main()
