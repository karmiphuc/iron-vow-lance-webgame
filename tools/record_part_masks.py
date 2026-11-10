"""Validate paired atlas dimensions and write the runtime damage mask manifest."""
import json
from pathlib import Path

from PIL import Image, ImageChops


def main():
    dist = Path(__file__).resolve().parents[1] / "dist"
    masks = {}
    for mask in sorted((dist / "assets").glob("*-parts.webp")):
        key = mask.stem.removesuffix("-parts")
        with Image.open(mask.with_name(f"{key}.webp")) as sprite, Image.open(mask) as parts:
            if sprite.size != parts.size or parts.mode != "RGBA":
                raise ValueError(f"{mask.name} must be RGBA and match {key}.webp dimensions")
            outside = sprite.convert("RGBA").getchannel("A").point(lambda value: 0 if value else 255)
            if ImageChops.multiply(parts.getchannel("A"), outside).getbbox():
                raise ValueError(f"{mask.name} extends past the source sprite silhouette")
        masks[key] = mask.stem
    if not masks:
        raise ValueError("No paired chassis masks found")
    script = "window.IRON_VOW_PART_MASKS=" + json.dumps(masks, separators=(",", ":")) + ";\n"
    (dist / "chassis-part-masks.js").write_text(script, encoding="ascii")
    print(f"Recorded {len(masks)} paired chassis mask sheets")


if __name__ == "__main__":
    main()
