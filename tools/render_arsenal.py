"""Bake independently paintable chassis poses and rigid weapon modules for Canvas2D.

Usage: blender -b --python-exit-code 1 -t 6 -P tools/render_arsenal.py -- warden
Repeat for kestrel, basilisk and weapons, then run tools/assemble_arsenal.cjs.
Append --prime-only to update only the attack atlas and its manifest entry.
With --prime-only, --face-left updates the left-facing atlas alone.
"""
import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path

import bpy
import numpy as np
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Quaternion, Vector
from PIL import Image

HERE = Path(__file__).resolve().parent
DIST = HERE.parent / "dist"
BENCH = DIST / "rig-bench"
ASSETS = DIST / "assets"
model = sys.argv[sys.argv.index("--") + 1]
PRIME_ONLY = "--prime-only" in sys.argv
BODY_TILES = {"warden": [0, 7, 8, 12, 15], "kestrel": [0, 7, 8, 12, 15], "basilisk": [0, 7, 12, 15]}
WEAPON_ROOTS = {"rifle":"kestrel", "rail":"longbow", "shotgun":"breacher", "missile":"vesper",
                "hailstorm":"hailstorm", "rampart":"rampart", "breaker":"breaker", "cleaver":"cleaver", "piledriver":"piledriver"}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(BENCH / f"{model}.glb"))
objects = bpy.data.objects
scene = bpy.context.scene

def point(x,y,z):
    return Vector((x,-z,y))

def rotate(name,x=0,y=0,z=0):
    obj=objects[name]
    obj.rotation_mode="QUATERNION"
    obj.rotation_quaternion=Quaternion((1,0,0),x)@Quaternion((0,0,1),y)@Quaternion((0,-1,0),z)

def aim(obj,target):
    obj.rotation_euler=(target-obj.location).to_track_quat("-Z","Y").to_euler()

def apply_pose(pose):
    pelvis,gun=pose["pelvis"],pose["gun"]
    left=pose.get("left") or {}
    objects["pelvis"].location=point(*pelvis["position"])
    rotate("pelvis",z=pelvis["roll"])
    rotate("spine",x=pose["spinePitch"],y=left.get("ty",0))
    for side,leg in zip("LR",pose["legs"]):
        rotate("hip."+side,*leg["hip"])
        if "footTargets" in pose:
            # Attack IK uses a fixed sagittal knee plane. Apply lateral hip
            # rotation before pitch so the analytical targets are exact.
            objects["hip."+side].rotation_quaternion=(
                Quaternion((0,-1,0),leg["hip"][2]) @
                Quaternion((1,0,0),leg["hip"][0]))
        rotate("knee."+side,x=leg["knee"])
        rotate("ankle."+side,*leg["ankle"])
    rotate("shoulder.R",*gun["shoulder"])
    rotate("elbow.R",x=gun["elbow"])
    rotate("wrist.R",x=gun["wrist"])
    rotate("pauldron.R",x=gun["shoulder"][0]*.28,z=gun["shoulder"][2]*.4)
    rotate("shoulder.L",x=pose["leftShoulder"],z=left.get("lsz",0))
    rotate("elbow.L",x=left.get("lel",-.56))
    rotate("wrist.L",x=left.get("lwr",.06))
    rotate("pauldron.L",x=pose["leftShoulder"]*.28,z=left.get("lsz",0)*.4)
    bpy.context.view_layer.update()
    for anchor in objects:
        if anchor.name.startswith("piston.") and anchor.name.endswith(".a"):
            partner=objects[anchor.name[:-1]+"b"]
            for source,target in ((anchor,partner),(partner,anchor)):
                direction=source.parent.matrix_world.to_quaternion().inverted()@(target.matrix_world.translation-source.matrix_world.translation)
                source.rotation_mode="QUATERNION"
                source.rotation_quaternion=direction.to_track_quat("-Y","Z")
    bpy.context.view_layer.update()

scene.world=bpy.data.worlds.new("Cool hangar")
scene.world.use_nodes=True
background=scene.world.node_tree.nodes["Background"]
background.inputs["Color"].default_value=(.24,.32,.40,1)
background.inputs["Strength"].default_value=.50
for name,pos,energy,size,color in [
    ("Key",(3,9,7),1500,5,(1,.92,.81)),
    ("Fill",(-7,6,4),1250,6,(.61,.76,1)),
    ("Rim",(4,7,-6),1750,5,(.57,.75,1))
]:
    data=bpy.data.lights.new(name,"AREA")
    data.energy,data.size,data.color=energy,size,color
    lamp=objects.new(name,data)
    scene.collection.objects.link(lamp)
    lamp.location=point(*pos)
    aim(lamp,point(0,3,.2) if model!="weapons" else point(0,0,1))

camera_data=bpy.data.cameras.new("Tactical camera")
camera=objects.new("Tactical camera",camera_data)
scene.collection.objects.link(camera)
scene.camera=camera
camera_data.type="ORTHO"
scene.render.engine="CYCLES"
scene.cycles.use_denoising=False
scene.render.resolution_percentage=100
scene.render.resolution_x=scene.render.resolution_y=512
scene.render.film_transparent=True
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGBA"
scene.view_settings.view_transform="AgX"

def setup_mask():
    # Use the same atlas UVs as the albedo to identify paintable ceramics.
    mat=next(m for m in bpy.data.materials if m.name.endswith("_atlas"))
    atlas=bpy.data.images.new("Paintable ceramics",256,256,alpha=True)
    atlas.colorspace_settings.name="Non-Color"
    pixels=np.zeros((256,256,4),dtype=np.float32);pixels[:,:,3]=1
    for tile in BODY_TILES[model]:
        row,col=3-tile//4,tile%4
        pixels[row*64:(row+1)*64,col*64:(col+1)*64,:3]=1
    atlas.pixels.foreach_set(pixels.ravel())
    nodes,links=mat.node_tree.nodes,mat.node_tree.links
    texture=nodes.new("ShaderNodeTexImage");texture.image=atlas;texture.interpolation="Closest"
    out=nodes.new("ShaderNodeOutputAOV");out.aov_name="PaintMask"
    links.new(texture.outputs["Color"],out.inputs["Value"])
    aov=scene.view_layers[0].aovs.add();aov.name="PaintMask";aov.type="VALUE"
    scene.use_nodes=True
    tree=scene.node_tree;tree.nodes.clear()
    render=tree.nodes.new("CompositorNodeRLayers")
    mask=tree.nodes.new("CompositorNodeOutputFile")
    mask.format.file_format="PNG";mask.format.color_mode="BW"
    mask.file_slots[0].path="paint-"
    tree.links.new(render.outputs["PaintMask"],mask.inputs[0])
    composite=tree.nodes.new("CompositorNodeComposite")
    tree.links.new(render.outputs["Image"],composite.inputs[0])
    return mask

mask=setup_mask() if model!="weapons" else None
def render_sprite(tmp,size):
    scene.cycles.samples=28 if size>=480 else 12
    scene.render.resolution_x=scene.render.resolution_y=size
    scene.render.filepath=str(tmp/"color.png")
    if mask: mask.base_path=str(tmp)
    bpy.ops.render.render(write_still=True)
    with Image.open(scene.render.filepath) as im: color=im.convert("RGBA")
    if not mask:return color
    with Image.open(tmp/"paint-0001.png") as im: return color,im.convert("L")

def project(p):
    c=world_to_camera_view(scene,camera,p)
    return [round(c.x,5),round(1-c.y,5)]

def position(name):
    return objects[name].matrix_world.translation

def hardpoints(pose):
    right=objects["socket.R"].matrix_world
    left=objects["socket.L"].matrix_world
    offset=pose["gun"]["offset"]
    data={
        "gripR":project(right@point(0,-offset,0)),
        "axisR":project(right@point(0,-1-offset,0)),
        "gripL":project(left.translation),
        "axisL":project(left@point(0,0,1)),
        "ramL":project(left@point(0,-1,0)),
        "body":project(objects["spine"].matrix_world@point(0,1.1,.63)),
        "right":project(position("shoulder.R").lerp(position("elbow.R"),.55)),
        "left":project(position("shoulder.L").lerp(position("elbow.L"),.55)),
        "legs":project(position("knee.L").lerp(position("knee.R"),.50))
    }
    if "pod.R" in objects and "pod.L" in objects:
        data.update(podR=project(position("pod.R")),podL=project(position("pod.L")))
    if "footTargets" in pose:
        lead=pose.get("leadSide","L");rear="R" if lead=="L" else "L"
        data.update(leadFoot=project(position("ankle."+lead)-Vector((0,0,.30))),
                    rearFoot=project(position("ankle."+rear)-Vector((0,0,.30))))
    return data

def body_sheets(tmp):
    motion=json.loads(subprocess.check_output(["node",str(HERE/"sample_warden_motion.cjs"),"--arsenal","--model",model]))
    poses=[("gait",None,p) for p in motion["gait"]]
    for name,rows in [("kick",motion["kicks"]),("aim",motion["aims"]),("death",motion["deaths"]),*motion["strikes"].items()]:
        poses.extend((name,row["level"],row["pose"]) for row in rows)
    manifest=HERE/f"{model}-arsenal.json"
    output=json.loads(manifest.read_text()) if PRIME_ONLY else {}
    cell,cols=256,6
    ground=.88
    camera_data.ortho_scale=9.65
    for face,sign in [("left",1),("right",-1)]:
        if PRIME_ONLY and "--face-left" in sys.argv and face!="left":continue
        camera.location=point(10.2,8.2,13.5) if sign==1 else point(-14,8.2,10)
        aim(camera,point(0,3.45,.35))
        camera_data.shift_x=camera_data.shift_y=0
        bpy.context.view_layer.update()
        ground_x=.52 if sign==1 else .48
        base=project(point(0,.10,.2))
        camera_data.shift_x,camera_data.shift_y=base[0]-ground_x,ground-base[1]
        bpy.context.view_layer.update()
        key=f"{model}-chassis-{face}"
        attack_rows=motion["attackLeft" if face=="left" else "attack"]
        if PRIME_ONLY:
            bake_attack(tmp,key,output[face],attack_rows,cell,cols)
            continue
        apply_pose(motion["idle"])
        color,paint=render_sprite(tmp,512)
        color.save(ASSETS/f"{key}.webp",quality=89,method=4)
        paint.save(ASSETS/f"{key}-paint.webp",lossless=True,method=4)
        hip=project(position("pelvis"))
        feet=sorted(project(position(f"ankle.{s}")-Vector((0,0,.30))) for s in "LR")
        visual={"key":key,"ground":ground,"groundX":ground_x,"scale":1.24,"ortho":camera_data.ortho_scale,
                "modular":True,"hip":hip[1],"split":hip[0],"foot":[max(.90,p[1]) for p in feet],
                **hardpoints(motion["idle"])}
        visual["motion"]={"key":f"{key}-motion","cell":cell,"columns":cols}
        dims=(cell*cols,cell*math.ceil(len(poses)/cols))
        atlas=Image.new("RGBA",dims);matte=Image.new("L",dims)
        for i,(kind,level,pose) in enumerate(poses):
            apply_pose(pose)
            color,paint=render_sprite(tmp,cell)
            pos=(i%cols*cell,i//cols*cell)
            atlas.paste(color,pos);matte.paste(paint,pos)
            frame={"index":i,**hardpoints(pose)}
            if level is not None:frame["level"]=level
            visual["motion"].setdefault(kind,[]).append(frame)
        atlas.save(ASSETS/f"{key}-motion.webp",quality=83,method=4)
        matte.save(ASSETS/f"{key}-motion-paint.webp",lossless=True,method=4)
        bake_attack(tmp,key,visual,attack_rows,cell,cols)
        output[face]=visual
    return output

def bake_attack(tmp,key,visual,rows,cell,cols):
    poses=[(kind,row["level"],row["pose"]) for kind,frames in rows.items() for row in frames]
    data={"key":f"{key}-attack","cell":cell,"columns":cols}
    dims=(cell*cols,cell*math.ceil(len(poses)/cols))
    atlas=Image.new("RGBA",dims);matte=Image.new("L",dims)
    checks=[]
    for i,(kind,level,pose) in enumerate(poses):
        apply_pose(pose)
        for side,target in zip("LR",pose["footTargets"]):
            error=(position(f"ankle.{side}")-point(*target)).length
            if error>1e-5:
                raise ValueError(f"Attack foot drift: {key}/{kind}/{level}/{side}: {error}")
        color,paint=render_sprite(tmp,cell)
        box=color.getbbox()
        if not box or min(box[:2])<2 or max(box[2:])>cell-2:
            raise ValueError(f"Attack frame cropped: {key}/{kind}/{level}: {box}")
        pos=(i%cols*cell,i//cols*cell)
        atlas.paste(color,pos);matte.paste(paint,pos)
        frame={"index":i,"level":level,**hardpoints(pose)}
        data.setdefault(kind,[]).append(frame)
        checks.append({"kind":kind,"level":level,"bounds":box,
                       "ankles":[list(position(f"ankle.{s}")) for s in "LR"],
                       "targets":pose["footTargets"]})
    atlas.save(ASSETS/f"{key}-attack.webp",quality=87,method=4)
    matte.save(ASSETS/f"{key}-attack-paint.webp",lossless=True,method=4)
    visual["attackMotion"]=data
    qa_dir=Path(tempfile.gettempdir())/"iron-vow-attack-qa"
    qa_dir.mkdir(exist_ok=True)
    (qa_dir/f"{key}.json").write_text(json.dumps(checks,indent=2))

def weapon_sprites(tmp):
    output={}
    camera_data.ortho_scale=6.4
    for face,sign in [("left",1),("right",-1)]:
        # Match chassis camera direction. Socket offsets stay in the shared projection.
        delta=point(10.2,8.2-3.45,13.5-.35) if sign==1 else point(-14,8.2-3.45,10-.35)
        focus=point(0,.1,1.1);camera.location=focus+delta;aim(camera,focus)
        for id,name in WEAPON_ROOTS.items():
            root=objects[name]
            for other in WEAPON_ROOTS.values():
                for obj in objects[other].children_recursive:obj.hide_render=other!=name
            def render_variant(key):
                bpy.context.view_layer.update()
                size=448
                color=render_sprite(tmp,size)
                box=color.getbbox()
                if not box: raise ValueError(name)
                color.crop(box).save(ASSETS/f"{key}.webp",quality=88,method=4)
                def xy(p):
                    x,y=project(p)
                    return [round(x*size-box[0],2),round(y*size-box[1],2)]
                hooks={obj.name.split(".")[0]:xy(obj.matrix_world.translation) for obj in root.children_recursive
                       if obj.name.split(".")[0] in ("muzzle","muzzle2","tip")}
                return {"key":key,"grip":xy(root.matrix_world.translation),
                        "axis":xy(root.matrix_world@point(0,0,1)),"pixelsPerMetre":size/camera_data.ortho_scale,**hooks}
            key=f"arsenal-{id}-{face}"
            slot=render_variant(key)
            if id=="piledriver":
                spike=objects["spike"]
                original=spike.location.copy()
                spike.location+=point(0,0,1.25)
                slot["extended"]=render_variant(key+"-extended")
                spike.location=original
            output.setdefault(id,{})[face]=slot
    return output

with tempfile.TemporaryDirectory() as tmp:
    data=weapon_sprites(Path(tmp)) if model=="weapons" else body_sheets(Path(tmp))
(HERE/f"{model}-arsenal.json").write_text(json.dumps(data,separators=(",",":")))
