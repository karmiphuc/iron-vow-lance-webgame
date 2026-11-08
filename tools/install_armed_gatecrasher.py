"""Install the local R2 bakes without rewriting the other chassis entries."""
import json
import shutil
from pathlib import Path

root = Path(__file__).resolve().parent.parent
dist, bake = root/"dist", root/"bake"


def replace_entry(file, marker, key, replacement, nested=None):
    data = json.loads(file.read_text(encoding="utf8").split(marker, 1)[1].strip().rstrip(";"))
    if nested:
        data[key][nested] = replacement
    else:
        data[key] = replacement
    file.write_text(marker+json.dumps(data,separators=(",",":"))+";\n", encoding="utf8")


ground = json.loads((bake/"ground/gatecrasher-ground.json").read_text(encoding="utf8"))
close = json.loads((bake/"close/gatecrasher-r2-combat.json").read_text(encoding="utf8"))
assert ground["strike"]["samples"] == len(ground["strike"]["levels"])
for art in (*ground["points"][0], *close.values()):
    assert art["shoulderMuzzle"] != art["shoulderMuzzle2"]
    assert art["meleeTip"]
for folder in (bake/"ground", bake/"close/assets"):
    for art in folder.glob("*.webp"):
        shutil.copyfile(art, dist/"assets"/art.name)
shutil.copyfile(dist/"assets/gatecrasher-r2-combat-left.webp",dist/"rig-bench/prototypes/gatecrasher.webp")
replace_entry(dist/"grid-travel-visuals.js","window.IRON_VOW_TRAVEL=","gatecrasher",ground,"grounded")
replace_entry(dist/"prototype-combat.js","window.IRON_VOW_PROTOTYPES = ","gatecrasher",close)
