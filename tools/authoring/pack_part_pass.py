"""Pack a flat color Blender pass against the unchanged sprite sheet."""
from pathlib import Path

from PIL import Image, ImageChops, ImageOps


def solid(channel):
    return channel.point(lambda value: 255 if value >= 128 else 0)


def part_cell(raw, alpha):
    r, g, b, a = raw.convert("RGBA").split()
    r, g, b, a = map(solid, (r, g, b, a))
    # 0 is outside a damage part. 6 and 7 are outside the part palette.
    has_part = ImageChops.lighter(ImageChops.lighter(r, g), b)
    invalid = ImageChops.darker(g, b)
    has_part = ImageChops.subtract(has_part, invalid)
    coverage = ImageChops.darker(has_part, a)
    mask = Image.merge("RGBA", (r, g, b, ImageChops.multiply(alpha, coverage)))
    core = alpha.point(lambda value: 255 if value >= 240 else 0)
    missed = ImageChops.subtract(core, coverage).histogram()[255]
    outside = ImageChops.subtract(coverage, solid(alpha)).histogram()[255]
    return mask, (missed, outside, core.histogram()[255])


def pack_frames(assets, key, cell, frames, mirror=False):
    assets = Path(assets)
    with Image.open(assets / f"{key}.webp") as original:
        alpha = original.convert("RGBA").getchannel("A")
    columns = 4
    frames = list(frames)
    expected = (columns*cell, ((len(frames)+columns-1)//columns)*cell)
    if alpha.size != expected:
        raise ValueError(f"{key}: expected {expected}, existing sprite sheet is {alpha.size}")
    sheet = Image.new("RGBA", alpha.size)
    totals = [0, 0, 0]
    worst = (0, 0)
    for index, frame in enumerate(frames):
        x, y = index % columns * cell, index // columns * cell
        with Image.open(frame) as raw:
            if raw.size != (cell, cell):
                raise ValueError(f"{frame} does not have cell size {cell}")
            mask, metrics = part_cell(ImageOps.mirror(raw) if mirror else raw,
                                      alpha.crop((x, y, x+cell, y+cell)))
        sheet.paste(mask, (x, y))
        totals = [a+b for a, b in zip(totals, metrics)]
        worst = max(worst, ((metrics[0]+metrics[1])/max(1, metrics[2]), index))
    print(f"{key} {len(frames)} frames. Missing core {totals[0]/max(1, totals[2]):.2%}; "
          f"outside {totals[1]/max(1, totals[2]):.2%}; worst {worst[0]:.2%} at frame {worst[1]}.")
    sheet.save(assets / f"{key}-parts.webp", lossless=True, method=6)
    return totals, worst
