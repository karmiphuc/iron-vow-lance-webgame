"""Bake R12's four loadouts into the existing Iron Vow sprite contracts."""
import json
import math
import os
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

import bpy
from mathutils import Matrix, Vector

if os.environ.get("IRON_VOW_PIL_SITE"):
    sys.path.append(os.environ["IRON_VOW_PIL_SITE"])
sys.path.insert(0, str(Path(__file__).resolve().parent))
from PIL import Image, ImageChops
import render_breach_gait as field
import render_prototype_combat as combat


def sample(scene, rig, clip, level):
    animation = rig.animation_data
    animation.action = None
    for bone in rig.pose.bones:
        bone.matrix_basis.identity()
    field.sample(scene, rig, clip, level)


def field_walk(scene, rig, kind, side, level):
    sample(scene, rig, "Walk", ((.5 if side=="L" else 0)+level*.5)%1)
    rig.animation_data.action = None
    previous, following = field.STAGES[kind]
    root = (-previous+(previous+following)*level)/2
    ease = level**3*(10+level*(-15+6*level))
    lift = math.sin(math.pi*level)**2
    swing = -previous+(previous+following)*ease-root
    load = min(1, 2*level) if not previous else min(1, 2*(1-level)) if not following else 1
    for name in ("Torso","Optics","Pelvis",*(base+"."+leg for base in ("Shoulder","Pauldron","Elbow","Wrist") for leg in "LR")):
        bone = rig.pose.bones[name]
        bone.matrix_basis = Matrix.Identity(4).lerp(bone.matrix_basis, load)
    pelvis = rig.pose.bones["Pelvis"]
    shift = pelvis.bone.matrix_local.to_3x3() @ pelvis.location
    field.move(pelvis, x=shift.x, y=shift.y, z=-.103*load-.032*lift)
    for leg in "LR":
        is_swing = leg==side
        field.move(rig.pose.bones["Foot IK."+leg],y=-swing if is_swing else root,
                   z=-.0075+(.287*lift if is_swing else 0))
    bpy.context.view_layer.update()
    for leg in "LR":
        foot, target = (rig.pose.bones[base+"."+leg].head for base in ("Foot","Foot IK"))
        assert (foot-target).length<.002, (kind,side,level,leg,foot[:],target[:])
    return "R" if side=="L" else "L"


def damage_part(obj):
    owner = obj.get("rig_attachment", obj.parent_bone)
    if owner.startswith("Optics"):
        return 2
    if obj.get("weighted_skirt") or obj.get("skirt_hardware") or owner.startswith(("Hip","Knee","Foot","Toe","Ankle ram","Leg ram")):
        return 5
    if owner.startswith(("Shoulder","Pauldron","Elbow","Wrist","Finger","Thumb","Arm ram","Hardpoint","Cannon Slide")):
        return 4 if owner.endswith(".L") or ".L " in owner else 3
    return 1


def configure(scene, rig, tmp):
    camera = combat.configure_render(scene,tmp)
    scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 12
    scene.view_layers[0].aovs["Plates"].type = "COLOR"
    scene.view_layers[0].aovs.add().name = "HitParts"
    tree = scene.compositing_node_group
    layer = next(n for n in tree.nodes if n.type=="R_LAYERS")
    output = tree.nodes.new("CompositorNodeOutputFile")
    output.directory, output.file_name = str(tmp),"parts"
    output.format.media_type,output.format.file_format = "IMAGE","PNG"
    output.format.color_mode,output.save_as_render = "RGB",False
    output.file_output_items.new("RGBA","HitParts")
    tree.links.new(layer.outputs["HitParts"],output.inputs["HitParts"])
    for obj in rig.children:
        if obj.type!="MESH":
            continue
        part = damage_part(obj)
        obj.color = (*(float(bool(part & bit)) for bit in (1,2,4)),1)
    materials = {m for o in rig.children if o.type=="MESH" for m in o.data.materials if m and m.use_nodes}
    for material in materials:
        nodes = material.node_tree.nodes
        node = nodes.new("ShaderNodeOutputAOV")
        node.aov_name = "HitParts"
        info = nodes.new("ShaderNodeObjectInfo")
        material.node_tree.links.new(info.outputs["Color"],node.inputs["Color"])
        if material.name.startswith("HV-09 Paint | ") and "ceramic" in material.name:
            paint = nodes.new("ShaderNodeOutputAOV")
            paint.aov_name = "Plates"
            color = nodes.new("ShaderNodeRGB")
            color.outputs[0].default_value = (.9,.9,.9,1)
            material.node_tree.links.new(color.outputs[0],paint.inputs["Color"])
    return camera


def sprite(scene, tmp, size):
    for path in tmp.glob("parts*.png"):
        path.unlink()
    color, paint = combat.render_sprite(scene,tmp,size)
    path, = tmp.glob("parts*.png")
    with Image.open(path) as image:
        bands = [channel.point(lambda x: 255 if x>=128 else 0) for channel in image.convert("RGB").split()]
    parts = Image.merge("RGBA",(*bands,color.getchannel("A")))
    return color,paint,parts


def save(images, assets, key):
    for image,suffix in zip(images,("", "-paint", "-parts")):
        image.save(assets/(key+suffix+".webp"),quality=91,lossless=bool(suffix),method=3)


def canvases(cell, columns, count):
    size = (cell*columns,cell*math.ceil(count/columns))
    return [Image.new(mode,size) for mode in ("RGBA","L","RGBA")]


def paste(dest, images, cell, columns, index):
    for canvas,image in zip(dest,images):
        canvas.paste(image,(index%columns*cell,index//columns*cell))


def open_atlas(assets,key):
    result = []
    for suffix,mode in (("","RGBA"),("-paint","L"),("-parts","RGBA")):
        with Image.open(assets/(key+suffix+".webp")) as image:
            result.append(image.convert(mode))
    return result


def aim(camera, location, target):
    camera.location = location
    camera.rotation_euler = (Vector(target)-camera.location).to_track_quat("-Z","Y").to_euler()
    bpy.context.view_layer.update()


def anchors(scene, camera, rig, blade, pod):
    points = combat.hardpoints(scene,camera,rig,True)
    if not blade:
        points["meleeTip"] = field.project(scene,camera,rig.pose.bones["Finger 2 tip.L"].tail)
    if not pod:
        points.pop("shoulderMuzzle",None)
        points.pop("shoulderMuzzle2",None)
    return points


def close_atlas(scene, rig, camera, tmp, assets, key, blade, pod):
    cell, columns = 448, 8
    camera.data.ortho_scale = 8.4
    gait = [i/18 for i in range(18)]
    fire = sorted({i/18 for i in range(19)} | set(combat.FIRE_CUES))
    strike = combat.CLEAVER_CLOSE_LEVELS if blade else sorted({i/12 for i in range(13)} | {combat.STRIKE_CUE,.54})
    levels = (("gait","Walk",gait),("fire","Fire",fire),("strike","Strike",strike))
    result = {}
    for name, sign in (("left",1),("right",-1)):
        aim(camera,(sign*11,-12.5,9.2),(0,0,3.17))
        sample(scene,rig,"Fire",0)
        portrait_key = f"{key}-combat-{name}"
        save(sprite(scene,tmp,768),assets,portrait_key)
        ground = field.project(scene,camera,Vector())
        atlas_key = portrait_key+"-motion"
        visual = dict(key=portrait_key,native=True,ground=ground[1],groundX=ground[0],scale=1.26,
                      hip=.58,split=.5,foot=[.89,.89],mass=1.56,**anchors(scene,camera,rig,blade,pod))
        visual["timing"] = {"fire":{"duration":56/scene.render.fps,"cue":combat.FIRE_CUES[0],
                                    "beatGap":round((combat.FIRE_CUES[1]-combat.FIRE_CUES[0])*56/scene.render.fps,6)},
                            "strike":{"duration":combat.STRIKE_DURATION,"cue":combat.STRIKE_CUE}}
        motion = visual["motion"] = dict(key=atlas_key,cell=cell,columns=columns)
        atlas = canvases(cell,columns,sum(len(v) for _,_,v in levels))
        index = 0
        for kind,clip,frames in levels:
            motion[kind] = []
            for level in frames:
                if kind=="strike" and not blade:
                    sample(scene,rig,"Fire",0)
                    rig.animation_data.action = None
                    combat.strike(rig,level,True)
                    bpy.context.view_layer.update()
                else:
                    sample(scene,rig,clip,level)
                paste(atlas,sprite(scene,tmp,cell),cell,columns,index)
                motion[kind].append(dict(index=index,level=round(level,6),**anchors(scene,camera,rig,blade,pod)))
                index+=1
        save(atlas,assets,atlas_key)
        result[name] = visual
        print("Baked",atlas_key,index,flush=True)
    return result


def ground_atlas(scene, rig, camera, tmp, assets, key, blade, pod):
    cell, columns, samples = field.CELL, field.COLUMNS, field.SAMPLES
    camera.data.ortho_scale = field.SPAN
    plan = [(None,None,0),(None,None,.42)]
    starts = {}
    for kind in field.STAGES:
        for side in "LR":
            starts[kind+side] = len(plan)
            plan.extend((kind,side,i/(samples-1)) for i in range(samples))
    strike_start = len(plan)
    if blade:
        plan.extend(("Strike",None,level) for level in combat.CLEAVER_FIELD_LEVELS)
    points = [[] for _ in plan]
    keys = []
    fallback = canvases(176,4,32) if key=="gatecrasher-bare" else None
    fallback_rows = (0,4,8,13,26,32,54,1)
    for heading in range(4):
        angle = (1+2*heading)*math.pi/4
        target = Vector((0,0,(field.GROUND-.5)*field.SPAN/math.cos(field.ELEVATION)))
        aim(camera,target+Vector((-math.sin(angle),-math.cos(angle),math.tan(field.ELEVATION)))*14,target)
        atlas = canvases(cell,columns,len(plan))
        for index,(kind,side,level) in enumerate(plan):
            plant = None
            if kind=="Strike":
                sample(scene,rig,kind,level)
            elif kind:
                plant = field_walk(scene,rig,kind,side,level)
            else:
                sample(scene,rig,"Fire",level)
            frames = sprite(scene,tmp,cell)
            paste(atlas,frames,cell,columns,index)
            values = anchors(scene,camera,rig,blade,pod)
            for foot in "LR":
                ankle = rig.pose.bones["Foot."+foot].head
                values["foot"+foot] = field.project(scene,camera,ankle-Vector((0,0,.43)))
            if plant:
                values["planted"] = values["foot"+plant]
            if fallback and index in fallback_rows:
                values["pilot"] = field.project(scene,camera,rig.pose.bones["Optics"].head)
            points[index].append(values)
            if fallback and index in fallback_rows:
                row = fallback_rows.index(index)
                images = [frames[0].resize((176,176),Image.Resampling.LANCZOS),
                          frames[1].resize((176,176),Image.Resampling.LANCZOS),
                          frames[2].resize((176,176),Image.Resampling.NEAREST)]
                paste(fallback,images,176,4,row*4+heading)
        asset = f"grid-travel-{key}-ground-{heading}"
        save(atlas,assets,asset)
        keys.append(asset)
        print("Baked",asset,len(plan),flush=True)
    result = dict(span=field.SPAN,ground=field.GROUND,samples=samples,walk=starts,points=points,
                  detail=dict(cell=cell,columns=columns,keys=keys))
    if blade:
        result["strike"] = dict(first=strike_start,samples=len(combat.CLEAVER_FIELD_LEVELS),
                                levels=combat.CLEAVER_FIELD_LEVELS)
    if fallback:
        save(fallback,assets,"grid-travel-gatecrasher")
        result["fallback"] = [points[index] for index in fallback_rows]
    return result


def export_glb(scene,rig,path):
    rig.animation_data.action = None
    rig.animation_data.use_nla = True
    for track in rig.animation_data.nla_tracks:
        track.mute = False
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for obj in rig.children:
        if obj.type=="MESH":
            obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format="GLB",use_selection=True,export_extras=True,
                              export_animations=True,export_animation_mode="NLA_TRACKS",export_force_sampling=True,
                              export_yup=True,export_cameras=False,export_lights=False)


def replace_strike(scene,rig,camera,tmp,assets,output,key,pod):
    close_path = output/f"{key}-close.json"
    close = json.loads(close_path.read_text(encoding="utf8"))
    camera.data.ortho_scale = 8.4
    for face,sign in (("left",1),("right",-1)):
        aim(camera,(sign*11,-12.5,9.2),(0,0,3.17))
        motion = close[face]["motion"]
        cell,columns = motion["cell"],motion["columns"]
        atlas = open_atlas(assets,motion["key"])
        for frame in motion["strike"]:
            sample(scene,rig,"Strike",frame["level"])
            paste(atlas,sprite(scene,tmp,cell),cell,columns,frame["index"])
            frame.update(anchors(scene,camera,rig,True,pod))
        save(atlas,assets,motion["key"])
    close_path.write_text(json.dumps(close,separators=(",",":")),encoding="utf8")
    field_path = output/f"{key}-ground.json"
    ground = json.loads(field_path.read_text(encoding="utf8"))
    camera.data.ortho_scale = field.SPAN
    detail = ground["detail"]
    cell,columns = detail["cell"],detail["columns"]
    for heading,asset in enumerate(detail["keys"]):
        angle = (1+2*heading)*math.pi/4
        target = Vector((0,0,(field.GROUND-.5)*field.SPAN/math.cos(field.ELEVATION)))
        aim(camera,target+Vector((-math.sin(angle),-math.cos(angle),math.tan(field.ELEVATION)))*14,target)
        atlas = open_atlas(assets,asset)
        for offset,level in enumerate(ground["strike"]["levels"]):
            index = ground["strike"]["first"]+offset
            sample(scene,rig,"Strike",level)
            paste(atlas,sprite(scene,tmp,cell),cell,columns,index)
            ground["points"][index][heading].update(anchors(scene,camera,rig,True,pod))
        save(atlas,assets,asset)
    field_path.write_text(json.dumps(ground,separators=(",",":")),encoding="utf8")


def main():
    destination, mode, lane = sys.argv[sys.argv.index("--")+1:]
    output = Path(destination).resolve()
    assets = output/"assets"
    assets.mkdir(parents=True,exist_ok=True)
    scene = bpy.context.scene
    rig = next(o for o in scene.objects if o.type=="ARMATURE")
    blade,pod = mode in ("both","cleaver"),mode in ("both","vesper")
    key = "gatecrasher" if mode=="both" else "gatecrasher-"+mode
    for obj in rig.children:
        obj.hide_render = (obj.get("equipment")=="cleaver" and not blade or obj.get("equipment")=="vesper" and not pod)
    combat.add_strike_track(scene,rig,True,limit_reach=True)
    if lane=="export":
        export_glb(scene,rig,output/"gatecrasher.glb")
        return
    with TemporaryDirectory(prefix="gatecrasher-sprites-") as directory:
        tmp = Path(directory)
        camera = configure(scene,rig,tmp)
        if lane=="strike":
            assert blade
            replace_strike(scene,rig,camera,tmp,assets,output,key,pod)
            return
        if lane=="probe":
            sample(scene,rig,"Fire",.42)
            aim(camera,(11,-12.5,9.2),(0,0,3.17))
            save(sprite(scene,tmp,768),assets,"samurai-preflight")
            for kind in field.STAGES:
                for side in "LR":
                    for i in range(11):
                        field_walk(scene,rig,kind,side,i/10)
            return
        if lane in ("close","all"):
            close_key = "gatecrasher-r2" if mode=="both" else key
            result = close_atlas(scene,rig,camera,tmp,assets,close_key,blade,pod)
            (output/f"{key}-close.json").write_text(json.dumps(result,separators=(",",":")),encoding="utf8")
        if lane in ("ground","all"):
            result = ground_atlas(scene,rig,camera,tmp,assets,key,blade,pod)
            (output/f"{key}-ground.json").write_text(json.dumps(result,separators=(",",":")),encoding="utf8")


if __name__=="__main__":
    main()
