"""Pack rendered Ashigaru frames for the Iron Vow Foundry renderer."""
import json
from pathlib import Path
import sys

from PIL import Image

source, dist = map(Path, sys.argv[1:3])
meta = json.loads((source / "frames.json").read_text(encoding="utf-8"))
cell = meta["cell"]
count = len(meta["frames"])
sheet = Image.new("RGBA", (4 * cell, ((count + 3) // 4) * cell))
for i in range(count):
    with Image.open(source / f"{i:03}.png") as frame:
        sheet.paste(frame, (i % 4 * cell, i // 4 * cell))
        if i == meta["idle"]:
            frame.save(dist / "assets/ashigaru.webp", quality=92)
sheet.save(dist / "assets/ashigaru-combat.webp", quality=88, method=5)
(dist / "foundry/ashigaru-baked.js").write_text(
    "window.IRON_VOW_ASHIGARU_ART=" + json.dumps(meta, separators=(",", ":")) + ";\n",
    encoding="utf-8")
