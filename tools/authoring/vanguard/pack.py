"""Package Vanguard's four transparent combat atlases and intact portrait."""
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
p=dist/"foundry"/"vanguard-baked.js"
p.write_text("window.IRON_VOW_FOUNDRY_ART[8]="+json.dumps(atlas,separators=(",",":"))+";\n",encoding="utf-8")

