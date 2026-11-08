"""Install separate equipped variants alongside the approved dual-equipped assets."""
import json
import shutil
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
dist = root/"dist"
variants = Path(sys.argv[1]).resolve()
stock_revision = "a773fd254cabe628766a558c4564b3af9d73d1d6"


def stock(relative):
    return subprocess.check_output(["git","show",f"{stock_revision}:dist/{relative}"],cwd=root)


def read_registry(data, marker):
    return json.loads(data.split(marker,1)[1].strip().rstrip(";"))


def install_pair(old, new, source):
    for suffix in (".webp","-paint.webp"):
        (dist/"assets"/(new+suffix)).write_bytes(source("assets/"+old+suffix))


def close_views(mode, views, source):
    for direction, visual in views.items():
        key = f"gatecrasher-{mode}-combat-{direction}"
        install_pair(visual["key"],key,source)
        install_pair(visual["motion"]["key"],key+"-motion",source)
        visual["key"],visual["motion"]["key"] = key,key+"-motion"
    return views


combat_file, travel_file = "prototype-combat.js", "grid-travel-visuals.js"
combat_mark, travel_mark = "window.IRON_VOW_PROTOTYPES = ", "window.IRON_VOW_TRAVEL="
combat = read_registry((dist/combat_file).read_text(encoding="utf8"),combat_mark)
travel = read_registry((dist/travel_file).read_text(encoding="utf8"),travel_mark)
stock_combat = read_registry(stock(combat_file).decode(),combat_mark)["gatecrasher"]
stock_travel = read_registry(stock(travel_file).decode(),travel_mark)["gatecrasher"]

combat["gatecrasher-bare"] = close_views("bare",stock_combat,stock)
bare = stock_travel["grounded"]
for heading,old in enumerate(bare["detail"]["keys"]):
    key = f"grid-travel-gatecrasher-bare-ground-{heading}"
    install_pair(old,key,stock)
    bare["detail"]["keys"][heading] = key
travel["gatecrasher-bare"] = stock_travel

for mode in ("cleaver","vesper"):
    source = variants/mode
    read = lambda relative: (source/relative).read_bytes()
    key = "gatecrasher-"+mode
    combat[key] = close_views(mode,json.loads(read("close.json")),read)
    grounded = json.loads(read("travel.json"))
    for asset in grounded["detail"]["keys"]:
        install_pair(asset,asset,read)
    travel[key] = {**stock_travel,"grounded":grounded}

for filename,marker,data in ((combat_file,combat_mark,combat),(travel_file,travel_mark,travel)):
    (dist/filename).write_text(marker+json.dumps(data,separators=(",",":"))+";\n",encoding="utf8")
shutil.copyfile(dist/"assets/gatecrasher-bare-combat-left.webp",
                dist/"rig-bench/prototypes/gatecrasher.webp")
