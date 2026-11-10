"""Package Vanguard's four transparent combat atlases and intact portrait.

Use pack.py BEAUTY DIST --walk-only PARTS to replace the gait cells and their masks.
"""
import json
import sys
from pathlib import Path

from PIL import Image

source, dist = map(Path, sys.argv[1:3])
atlas = json.loads((source / "atlas.json").read_text(encoding="utf-8"))
size = atlas["cell"]
rows = (len(atlas["frames"])+3)//4
keys = {"full":atlas["key"], "right-down":"foundry-8-right-down", "left-down":"foundry-8-left-down",
        "disarmed":"foundry-8-disarmed"}
p=dist/"foundry"/"vanguard-baked.js"

if "--walk-only" in sys.argv:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from pack_part_pass import part_cell

    mask_source=Path(sys.argv[sys.argv.index("--walk-only")+1])
    prefix="window.IRON_VOW_FOUNDRY_ART[8]="
    original=json.loads(p.read_text(encoding="utf-8").strip().removeprefix(prefix).removesuffix(";"))
    assert size==original["cell"] and len(atlas["frames"])==8
    assert original["variants"]==list(keys.values())
    for variant,key in keys.items():
        beauty=dist/"assets"/f"{key}.webp"
        parts=dist/"assets"/f"{key}-parts.webp"
        with Image.open(beauty) as image, Image.open(parts) as mask:
            sheet, masks=image.convert("RGBA"),mask.convert("RGBA")
        assert sheet.size==masks.size
        for i, frame in enumerate(atlas["frames"]):
            assert frame["name"]==original["frames"][i]["name"]=="walk"
            with Image.open(source/f"{variant}-{i:02}.png") as panel, Image.open(mask_source/f"{variant}-{i:02}.png") as raw:
                assert panel.size==raw.size==(size,size)
                mask, (missed, _, core)=part_cell(raw, panel.getchannel("A"))
                assert core and missed/core<.001,(variant,i,missed,core)
                at=i%4*size,i//4*size
                sheet.paste(panel,at)
                masks.paste(mask,at)
        sheet.save(beauty,lossless=True,exact=True,method=6)
        masks.save(parts,lossless=True,exact=True,method=6)
    original["frames"][:8]=atlas["frames"]
    p.write_text(prefix+json.dumps(original,separators=(",",":"))+";\n",encoding="utf-8")
    sys.exit(0)

for variant,key in keys.items():
    sheet = Image.new("RGBA",(size*4,size*rows))
    for i in range(len(atlas["frames"])):
        panel = Image.open(source/f"{variant}-{i:02}.png").convert("RGBA")
        box = panel.getchannel("A").point(lambda x:255 if x>=24 else 0).getbbox()
        assert box and min(box[0],box[1],size-box[2],size-box[3])>=3,(variant,i,box)
        sheet.paste(panel,(i%4*size,i//4*size))
        if variant=="full" and i==atlas["idle"]:
            panel.save(dist/"assets"/"foundry-8.webp",quality=92,method=6)
    sheet.save(dist/"assets"/f"{key}.webp",quality=89,method=5)
atlas.update(variants=[keys[k] for k in ("full","right-down","left-down","disarmed")],
             views=[{"key":"foundry-8"}], primary=True,secondary=True)
p.write_text("window.IRON_VOW_FOUNDRY_ART[8]="+json.dumps(atlas,separators=(",",":"))+";\n",encoding="utf-8")

