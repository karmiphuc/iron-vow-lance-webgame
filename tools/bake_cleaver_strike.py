"""Refresh the strike cells at the production atlas resolution."""
import json
import math
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

import bpy
from mathutils import Vector
from PIL import Image

sys.path.insert(0,str(Path(__file__).resolve().parent))
from render_breach_gait import ELEVATION, GROUND, SPAN, project, sample
from render_prototype_combat import (
    CLEAVER_CLOSE_LEVELS, CLEAVER_FIELD_LEVELS, configure_render, hardpoints, render_sprite,
)

root = Path(__file__).resolve().parent.parent
dist = root/"dist"
output = Path(sys.argv[-1]).resolve()
assets = output/"assets"
assets.mkdir(parents=True,exist_ok=True)
scene = bpy.context.scene
rig = bpy.data.objects["GATECRASHER / Rig"]
bpy.data.collections["Studio | Four reference views"].hide_render = True


def registry(filename, marker):
    return json.loads((dist/filename).read_text(encoding="utf8").split(marker,1)[1].strip().rstrip(";"))


def write_registry(filename, marker, data):
    (output/filename).write_text(marker+json.dumps(data,separators=(",",":"))+";\n",encoding="utf8")


def sheet_pair(key, cell, columns, keep, total):
    size = (cell*columns,cell*math.ceil(total/columns))
    result = []
    for suffix,mode in (("","RGBA"),("-paint","L")):
        original = Image.open(dist/"assets"/(key+suffix+".webp")).convert(mode)
        sheet = Image.new(mode,size)
        rows, remainder = divmod(keep,columns)
        sheet.paste(original.crop((0,0,size[0],rows*cell)),(0,0))
        if remainder:
            sheet.paste(original.crop((0,rows*cell,remainder*cell,(rows+1)*cell)),(0,rows*cell))
        result.append(sheet)
    return result


def save(key, pair):
    color, paint = pair
    color.save(assets/(key+".webp"),quality=96,method=6,exact=True,alpha_quality=100)
    paint.save(assets/(key+"-paint.webp"),lossless=True,method=3,exact=True)


def bake_frames(camera, tmp, key, cell, columns, first, levels):
    sheets = sheet_pair(key,cell,columns,first,first+len(levels))
    points = []
    for index,level in enumerate(levels,first):
        sample(scene,rig,"Strike",level)
        rendered = render_sprite(scene,tmp,cell)
        box = (index%columns*cell,index//columns*cell)
        for sheet,sprite in zip(sheets,rendered):
            sheet.paste(sprite,box)
        anchors = hardpoints(scene,camera,rig,True)
        points.append({"index":index,"level":level,**anchors})
    save(key,sheets)
    return points


combat_file, combat_marker = "prototype-combat.js", "window.IRON_VOW_PROTOTYPES = "
field_file, field_marker = "grid-travel-visuals.js", "window.IRON_VOW_TRAVEL="
combat, travel = registry(combat_file,combat_marker), registry(field_file,field_marker)
field = travel["gatecrasher"]["grounded"]
with TemporaryDirectory() as directory:
    tmp = Path(directory)
    camera = configure_render(scene,tmp)
    scene.cycles.samples = 10
    for face,sign in (("left",1),("right",-1)):
        camera.location = (sign*11,-12.5,9.2)
        camera.rotation_euler = (Vector((0,0,3.17))-camera.location).to_track_quat("-Z","Y").to_euler()
        bpy.context.view_layer.update()
        atlas = combat["gatecrasher"][face]["motion"]
        atlas["strike"] = bake_frames(camera,tmp,atlas["key"],atlas["cell"],atlas["columns"],
                                      atlas["strike"][0]["index"],CLEAVER_CLOSE_LEVELS)
    write_registry(combat_file,combat_marker,combat)

    camera.data.ortho_scale = SPAN
    target = Vector((0,0,(GROUND-.5)*SPAN/math.cos(ELEVATION)))
    first = field["strike"]["first"]
    field["points"] = field["points"][:first]+[[] for _ in CLEAVER_FIELD_LEVELS]
    for heading,key in enumerate(field["detail"]["keys"]):
        angle = (1+2*heading)*math.pi/4
        camera.location = target+Vector((-math.sin(angle),-math.cos(angle),math.tan(ELEVATION)))*14
        camera.rotation_euler = (target-camera.location).to_track_quat("-Z","Y").to_euler()
        bpy.context.view_layer.update()
        points = bake_frames(camera,tmp,key,field["detail"]["cell"],field["detail"]["columns"],
                             first,CLEAVER_FIELD_LEVELS)
        for point in points:
            index,level = point.pop("index"),point.pop("level")
            sample(scene,rig,"Strike",level)
            for side in "LR":
                ankle = rig.matrix_world @ rig.pose.bones["Foot."+side].head
                point["foot"+side] = project(scene,camera,ankle-Vector((0,0,.43)))
            field["points"][index].append(point)
    field["strike"].update(samples=len(CLEAVER_FIELD_LEVELS),levels=CLEAVER_FIELD_LEVELS)
    write_registry(field_file,field_marker,travel)
