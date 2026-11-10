"""Install baked Gatecrasher R2 and retain the original rig and atlases as Hellbreaker."""
import json
import shutil
import struct
import sys
from pathlib import Path


def load_registry(file, marker):
    return json.loads(file.read_text(encoding="utf8").split(marker, 1)[1].strip().rstrip(";"))


def write_registry(file, marker, entries):
    file.write_text(marker+json.dumps(entries,separators=(",",":"))+";\n",encoding="utf8")


def rename_rig(source, target):
    old = source.read_bytes()
    tag,version,_,length,kind = struct.unpack_from("<4sIIII",old)
    assert tag==b"glTF" and version==2 and kind==0x4E4F534A
    gltf = json.loads(old[20:20+length])
    for node in gltf["nodes"]:
        if node.get("name","").startswith("GATECRASHER / Rig"):
            node["name"] = "HELLBREAKER / Rig"
    new = json.dumps(gltf,separators=(",",":")).encode()
    new += b" "*(-len(new)%4)
    tail = old[20+length:]
    target.write_bytes(struct.pack("<4sIIII",tag,version,20+len(new)+len(tail),len(new),kind)+new+tail)


stage = Path(sys.argv[1]).resolve()
dist = Path(__file__).resolve().parent.parent/"dist"
bay = dist/"rig-bench/prototypes"
assets = dist/"assets"
combat = dist/"prototype-combat.js"
travel = dist/"grid-travel-visuals.js"
combat_marker = "window.IRON_VOW_PROTOTYPES = "
travel_marker = "window.IRON_VOW_TRAVEL="
combat_data = load_registry(combat,combat_marker)
travel_data = load_registry(travel,travel_marker)
if "hellbreaker" not in combat_data:
    combat_data["hellbreaker"] = combat_data["gatecrasher"]
    rename_rig(bay/"gatecrasher.glb",bay/"hellbreaker.glb")
    shutil.copyfile(bay/"gatecrasher.webp",bay/"hellbreaker.webp")
if "hellbreaker" not in travel_data:
    travel_data["hellbreaker"] = {**travel_data["gatecrasher"],"key":"grid-travel-hellbreaker"}
    for suffix in (".webp","-paint.webp"):
        shutil.copyfile(assets/("grid-travel-gatecrasher"+suffix),assets/("grid-travel-hellbreaker"+suffix))
combat_data["gatecrasher"] = json.loads((stage/"gatecrasher-r2-combat.json").read_text(encoding="utf8"))
for asset in (stage/"assets").glob("gatecrasher-r2-combat-*.webp"):
    shutil.copyfile(asset,assets/asset.name)
shutil.copyfile(stage/"gatecrasher.glb",bay/"gatecrasher.glb")
shutil.copyfile(stage/"assets/gatecrasher-r2-combat-left.webp",bay/"gatecrasher.webp")
write_registry(combat,combat_marker,combat_data)
write_registry(travel,travel_marker,travel_data)
