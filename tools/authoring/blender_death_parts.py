"""Bake part colors from an authored destruction blend and its original atlas metadata."""
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).parent))
from blender_part_pass import render_parts


def bake(atlas_path, output):
    scene = bpy.context.scene
    rig = next(obj for obj in scene.objects if obj.type == "ARMATURE")
    animation = rig.animation_data
    atlas = json.loads(atlas_path.read_text(encoding="utf-8"))
    directions = atlas.get("directions", [atlas])
    scene.render.image_settings.file_format = "PNG"
    scene.render.resolution_x = scene.render.resolution_y = atlas["cell"]
    scene.render.resolution_percentage = 100
    camera = scene.camera
    for angle, view in enumerate(directions):
        if len(directions) > 1:
            center = Vector((0, 0, 3.02))
            axis = [(-1,-1,.784), (-1,1,.784), (1,1,.784), (1,-1,.784)][angle]
            camera.location = center + Vector(axis).normalized()*18
            camera.rotation_euler = (center-camera.location).to_track_quat("-Z", "Y").to_euler()
        folder = output / view["key"]
        folder.mkdir(parents=True, exist_ok=True)
        for reason, clip in atlas["clips"].items():
            action = bpy.data.actions["Destruction / "+reason]
            animation.action = action
            animation.action_slot = action.slots[0]
            last = round(clip["duration"] * 24)
            for i in range(clip["count"]):
                scene.frame_set(round(i*last/(clip["count"]-1)))
                scene.render.filepath = str(folder / f"{clip['start']+i:02}.png")
                render_parts(write_still=True)


if __name__ == "__main__":
    bake(*map(Path, sys.argv[sys.argv.index("--")+1:]))
