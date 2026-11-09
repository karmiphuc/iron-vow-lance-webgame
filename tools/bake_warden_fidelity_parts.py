"""Bake the fidelity Warden from its original authored Blender pose pipeline.

blender -b <rig.blend> --python-use-system-env -P tools/bake_warden_fidelity_parts.py -- <bake-painted-warden.py>
"""
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bake_native_parts import registry, sheet, verify_and_save
from blender_part_mask import render_part_mask

authored = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
definition = authored.read_text(encoding="utf-8").split("scene.render.resolution_x=scene.render.resolution_y=384", 1)
if len(definition) != 2:
    raise ValueError("Expected the original Warden authoring script")
scope = {"__file__": str(authored)}
exec(compile(definition[0], str(authored), "exec"), scope)
scene, pose, travel, set_view = (scope[key] for key in ("scene", "pose", "travel", "set_view"))
art = registry("warden-fidelity.js", "window.WARDEN_FIDELITY=")
field = art["travel"]
staged = [("idle", 0)]
count = field["samples"]
for kind, start in field["walk"].items():
    assert start == len(staged)
    staged.extend((kind, i / (count - 1)) for i in range(count))
for kind, levels in (("aim", (.33, .67, 1)), ("kick", (.3, .65, 1)),
                     ("brace", scope["brace_levels"]), ("braceKick", (.3, .65, 1)), ("braceAim", (.33, .67, 1))):
    assert field["special"][kind] == len(staged)
    staged.extend((kind, level) for level in levels)
assert len(staged) == len(field["points"])


def add(sheet_image, cell, columns, index, mask):
    assert mask.size == (cell, cell)
    sheet_image.paste(mask, (index % columns * cell, index // columns * cell))


fallback = sheet(field["key"])
detail, strikes = field["detail"], field["strikes"]
strike_plan = [(kind, level) for kind in strikes["clips"] for level in strikes["levels"]]
for heading, key in enumerate(detail["keys"]):
    set_view(heading)
    image = sheet(key)
    for index, (kind, level) in enumerate(staged):
        pose(kind, level, travel)
        mask = render_part_mask(scene, detail["cell"])
        add(image, detail["cell"], detail["columns"], index, mask)
        size = field["cell"]
        add(fallback, size, field["columns"], index * 4 + heading,
            mask.resize((size, size), Image.Resampling.NEAREST))
    verify_and_save(image, key)
    key = strikes["keys"][heading]
    image = sheet(key)
    for index, (kind, level) in enumerate(strike_plan):
        pose(kind, level, travel)
        add(image, strikes["cell"], strikes["columns"], index, render_part_mask(scene, strikes["cell"]))
    verify_and_save(image, key)
verify_and_save(fallback, field["key"])

for side, heading in (("left", 3), ("right", 0)):
    view = art["views"][side]
    set_view(heading, close=True)
    pose("idle", 0, travel)
    verify_and_save(render_part_mask(scene, view["cell"]), view["key"])
    for prop in ("motion", "strikeMotion"):
        layout = view[prop]
        image = sheet(layout["key"])
        for kind, frames in layout.items():
            if not isinstance(frames, list):
                continue
            for frame in frames:
                pose(kind, frame["level"], travel)
                add(image, layout["cell"], layout["columns"], frame["index"], render_part_mask(scene, layout["cell"]))
        verify_and_save(image, layout["key"])
