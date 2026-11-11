"""Install the Samurai bake as Shogun alongside the original Gatecrasher."""
import json
import shutil
import struct
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
part_marker = "window.IRON_VOW_PART_MASKS="
combat = registry("prototype-combat.js",combat_marker)
travel = registry("grid-travel-visuals.js",travel_marker)
part_masks = registry("chassis-part-masks.js",part_marker)
keys = {}


def shogun_key(key):
    new = key.replace("gatecrasher-r2","shogun").replace("gatecrasher","shogun")
    keys[key] = new
    return new


fallback_key = shogun_key("grid-travel-gatecrasher")
kits = ("gatecrasher","gatecrasher-bare","gatecrasher-cleaver","gatecrasher-vesper")
for kit in kits:
    new_kit = kit.replace("gatecrasher","shogun")
    close = json.loads((stage/f"{kit}-close.json").read_text(encoding="utf8"))
    ground = json.loads((stage/f"{kit}-ground.json").read_text(encoding="utf8"))
    assert set(close)=={"left","right"}
    for face,visual in close.items():
        assert visual["key"]==combat[kit][face]["key"]
        assert visual["muzzle"]!=visual["muzzle2"]
        visual["key"] = shogun_key(visual["key"])
        visual["motion"]["key"] = shogun_key(visual["motion"]["key"])
    assert ground["detail"]["keys"]==travel[kit]["grounded"]["detail"]["keys"]
    ground["detail"]["keys"] = [shogun_key(key) for key in ground["detail"]["keys"]]
    if kit=="gatecrasher-bare":
        fallback = ground.pop("fallback")
        assert len(fallback)==8
    combat[new_kit] = close
    travel[new_kit] = {
        **travel[kit], "key": fallback_key, "partMask": fallback_key+"-parts", "grounded": ground,
    }
for kit in kits:
    travel[kit.replace("gatecrasher","shogun")]["points"] = fallback

for key,new in sorted(keys.items()):
    suffixes = ("","-paint","-parts")
    files = [stage/"assets"/(key+suffix+".webp") for suffix in suffixes]
    with Image.open(files[0]) as color,Image.open(files[1]) as paint,Image.open(files[2]) as parts:
        assert color.size==paint.size==parts.size,key
        assert color.getbbox() and paint.convert("L").getextrema()[1]>128,key
        assert all(channel.getextrema()[1]==255 for channel in parts.convert("RGBA").split()),key
        target = assets/(new+".webp")
        # Keep the large color atlases within the Sites archive limit.
        if files[0].stat().st_size>750_000:
            color.save(target,quality=87,alpha_quality=100)
        else:
            shutil.copyfile(files[0],target)
    for source,suffix in zip(files[1:],suffixes[1:]):
        shutil.copyfile(source,assets/(new+suffix+".webp"))
    part_masks[new] = new+"-parts"

glb = (stage/"gatecrasher.glb").read_bytes()
tag,version,_,length,kind = struct.unpack_from("<4sIIII",glb)
assert tag==b"glTF" and version==2 and kind==0x4E4F534A
model = json.loads(glb[20:20+length])
rig, = (node for node in model["nodes"] if node.get("name")=="GATECRASHER / Rig")
rig["name"] = "SHOGUN / Rig"
body = json.dumps(model,separators=(",",":")).encode()
body += b" "*(-len(body)%4)
binary = glb[20+length:]
(bay/"shogun.glb").write_bytes(struct.pack("<4sIIII",tag,version,20+len(body)+len(binary),len(body),kind)+body+binary)
shutil.copyfile(assets/"shogun-bare-combat-left.webp",bay/"shogun.webp")
write_registry("prototype-combat.js",combat_marker,combat)
write_registry("grid-travel-visuals.js",travel_marker,travel)
write_registry("chassis-part-masks.js",part_marker,part_masks)
print(f"Installed {len(keys)} color, paint and hit-mask sets across four Shogun kits.")
