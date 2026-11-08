"""Replace only the local armed Gatecrasher's Strike track."""
from pathlib import Path
import sys

import bpy

sys.path.insert(0,str(Path(__file__).resolve().parent))
from render_prototype_combat import add_strike_track

rig = bpy.data.objects["GATECRASHER / Rig"]
assert "Cleaver Tip.L" in rig.pose.bones
anim = rig.animation_data
track = anim.nla_tracks["Strike"]
old = track.strips[0].action
anim.nla_tracks.remove(track)
if old.users == 0:
    bpy.data.actions.remove(old)
scene = bpy.context.scene
add_strike_track(scene,rig,True)
scene.frame_set(1)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(Path(sys.argv[-1]).resolve()))
