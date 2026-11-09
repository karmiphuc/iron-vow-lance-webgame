"""Pack approved death poses and their projected hit anchors into campaign art."""
import json
from pathlib import Path
import sys

from PIL import Image


source, dist = map(Path, sys.argv[1:])
art = {}
for model, name in ((8, "gravemaw"), (9, "reaver"), (10, "bulwark"), (11, "aero"), (12, "ashigaru")):
    folder = source/name
    atlas = json.loads((folder/"atlas.json").read_text())
    atlas["paint"] = False
    cell = atlas["cell"]
    for angle, view in enumerate(atlas.get("directions", [atlas])):
        count = len(view["frames"])
        sheet = Image.new("RGBA", (4*cell, ((count+3)//4)*cell))
        for index in range(count):
            with Image.open(folder/str(angle)/f"{index:02}.png") as im:
                assert im.size == (cell, cell)
                frame = im.convert("RGBA")
                x0, y0, x1, y1 = frame.getbbox()
                assert min(x0, y0, cell-x1, cell-y1) >= 4, (name,angle,index,frame.getbbox())
                sheet.paste(frame, ((index%4)*cell, (index//4)*cell))
        sheet.save(dist/"assets"/f"{view['key']}.webp", quality=91, method=6)
    art[model] = atlas
(dist/"foundry/roster-destruction.js").write_text(
    "window.IRON_VOW_ROSTER_DESTRUCTION="+json.dumps(art,separators=(",",":"))+";\n",
    encoding="utf-8",
)
