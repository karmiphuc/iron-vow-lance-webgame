"""Install one complete Samurai bake while retaining the live hull and kit keys."""
import json
import shutil
import sys
from pathlib import Path

from PIL import Image

stage = Path(sys.argv[1]).resolve()
dist = Path(__file__).resolve().parents[1]/"dist"
assets = dist/"assets"
bay = dist/"rig-bench/prototypes"


def registry(filename, prefix):
    text = (dist/filename).read_text(encoding="utf8")
    assert text.startswith(prefix)
    return json.loads(text[len(prefix):].strip().rstrip(";"))


def write_registry(filename, prefix, data):
    (dist/filename).write_text(prefix+json.dumps(data,separators=(",",":"))+";\n",encoding="utf8",newline="\n")


combat_marker,travel_marker = "window.IRON_VOW_PROTOTYPES = ","window.IRON_VOW_TRAVEL="
combat = registry("prototype-combat.js",combat_marker)
travel = registry("grid-travel-visuals.js",travel_marker)
part_masks = registry("chassis-part-masks.js","window.IRON_VOW_PART_MASKS=")
keys = {"grid-travel-gatecrasher"}
kits = ("gatecrasher","gatecrasher-bare","gatecrasher-cleaver","gatecrasher-vesper")
for kit in kits:
    close = json.loads((stage/f"{kit}-close.json").read_text(encoding="utf8"))
    ground = json.loads((stage/f"{kit}-ground.json").read_text(encoding="utf8"))
    assert set(close)=={"left","right"}
    for face,visual in close.items():
        assert visual["key"]==combat[kit][face]["key"]
        assert visual["muzzle"]!=visual["muzzle2"]
        keys.update((visual["key"],visual["motion"]["key"]))
    assert ground["detail"]["keys"]==travel[kit]["grounded"]["detail"]["keys"]
    keys.update(ground["detail"]["keys"])
    if kit=="gatecrasher-bare":
        fallback = ground.pop("fallback")
        assert len(fallback)==8
    combat[kit] = close
    travel[kit]["grounded"] = ground
for kit in kits:
    travel[kit]["points"] = fallback

for key in sorted(keys):
    files = [stage/"assets"/(key+suffix+".webp") for suffix in ("","-paint","-parts")]
    assert part_masks[key]==key+"-parts",key
    with Image.open(files[0]) as color,Image.open(files[1]) as paint,Image.open(files[2]) as parts:
        assert color.size==paint.size==parts.size,key
        assert color.getbbox() and paint.convert("L").getextrema()[1]>128,key
        assert all(channel.getextrema()[1]==255 for channel in parts.convert("RGBA").split()),key
    for source in files:
        shutil.copyfile(source,assets/source.name)
shutil.copyfile(stage/"gatecrasher.glb",bay/"gatecrasher.glb")
shutil.copyfile(assets/"gatecrasher-bare-combat-left.webp",bay/"gatecrasher.webp")
write_registry("prototype-combat.js",combat_marker,combat)
write_registry("grid-travel-visuals.js",travel_marker,travel)
print(f"Installed {len(keys)} color, paint and hit-mask sets across four Gatecrasher kits.")
