"""Export the painted R2 rig for the browser model bay and travel renderer."""
import sys
from pathlib import Path

import bpy

destination = Path(sys.argv[sys.argv.index("--")+1]).resolve()
rig = bpy.data.objects["GATECRASHER / Rig"]
assert not rig["Shoulder missiles"]
for track in rig.animation_data.nla_tracks:
    track.mute = False
bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
for obj in rig.children:
    if obj.type=="MESH" and not obj.name.startswith("Shoulder Missile.L"):
        # The model bay's loader samples the first UV set.
        uv = obj.data.uv_layers
        if len(uv)>1:
            active = next(layer for layer in uv if layer.active_render)
            for layer in tuple(uv):
                if layer!=active:
                    uv.remove(layer)
        obj.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=str(destination), export_format="GLB", use_selection=True,
    export_animations=True, export_animation_mode="NLA_TRACKS",
    export_force_sampling=True, export_yup=True, export_cameras=False, export_lights=False,
    export_image_format="JPEG", export_jpeg_quality=91,
)
