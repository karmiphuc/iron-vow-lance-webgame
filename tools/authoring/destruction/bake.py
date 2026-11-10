"""Bake staged biped shutdowns from the approved campaign rigs."""
import json
from math import radians
from pathlib import Path
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector


# Normalized time, body shift, pitch/roll/yaw, rear heel, catch step.
BODY = (
    (0, (0, 0, 0), (0, 0, 0), 0, 0),
    (.10, (-.10, .16, -.03), (-11, -7, -9), .02, 0),
    (.25, (.05, -.20, -.25), (14, 6, 9), .04, .34),
    (.43, (.13, -.39, -.66), (27, 9, 12), .32, .49),
    (.56, (.16, -.57, -.98), (35, 11, 16), .56, .49),
    (.73, (.08, -.94, -1.34), (54, 13, 13), .52, .49),
    (.94, (-.05, -1.46, -1.93), (83, 17, 17), .19, .49),
    (1.09, (-.09, -1.56, -2.00), (88, 18, 19), .14, .49),
    (1.24, (-.12, -1.60, -1.96), (84, 15, 18), .18, .49),
    (1.49, (-.15, -1.64, -2.04), (88, 18, 20), .14, .49),
    (1.92, (-.16, -1.65, -2.05), (88, 18, 20), .14, .49),
)
PILOT = (
    (0, (0, 0, 0), (0, 0, 0), 0, 0),
    (.11, (.08, .02, -.02), (-8, 5, -6), 0, 0),
    (.29, (.04, -.11, -.26), (14, 7, 3), .04, .17),
    (.53, (.11, -.30, -.66), (25, 9, 6), .29, .30),
    (.81, (.18, -.44, -.96), (32, 11, 8), .54, .30),
    (1.07, (.16, -.43, -.94), (28, 10, 8), .53, .30),
    (1.33, (.16, -.44, -.97), (30, 11, 8), .53, .30),
)

Y = Vector((0, 1, 0))


def sample(keys, time):
    for a, b in zip(keys, keys[1:]):
        if time <= b[0]:
            t = (time - a[0]) / (b[0] - a[0])
            t = t*t*(3-2*t)
            return (Vector(a[1]).lerp(Vector(b[1]), t), Vector(a[2]).lerp(Vector(b[2]), t),
                    a[3]+(b[3]-a[3])*t, a[4]+(b[4]-a[4])*t)
    return Vector(keys[-1][1]), Vector(keys[-1][2]), *keys[-1][3:]


def turn(axis, angle):
    return Matrix.Rotation(radians(angle), 4, axis)


def solve(origin, target, a, b, pole):
    direction = target-origin
    length = min(a+b-.004, max(abs(a-b)+.004, direction.length))
    direction.normalize()
    normal = (pole-direction*pole.dot(direction)).normalized()
    u = (length*length+a*a-b*b)/(2*length)
    return origin+direction*u+normal*max(0, a*a-u*u)**.5, origin+direction*length


def aimed(base, head, tail):
    q = base.to_quaternion()
    rot = ((q@Y).rotation_difference((tail-head).normalized())@q).to_matrix().to_4x4()
    rot.translation = head
    return rot


def min_z(objects):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    lowest = float("inf")
    for obj in objects:
        shape = obj.evaluated_get(depsgraph)
        m = shape.matrix_world
        if min((m@Vector(corner)).z for corner in shape.bound_box) < lowest:
            lowest = min(lowest, min((m@v.co).z for v in shape.data.vertices))
    return lowest


def main():
    mode, source, output = sys.argv[sys.argv.index("--")+1:][:3]
    output = Path(output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    if mode == "ashigaru":
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete(use_global=False)
        bpy.ops.import_scene.gltf(filepath=str(Path(source).resolve()))
    rig = next(o for o in scene.objects if o.type == "ARMATURE")
    anim = rig.animation_data
    anim.use_nla = False
    quad, aero = mode == "reaver", mode == "aero"
    if mode == "ashigaru":
        anim.use_nla = False
        anim.action = bpy.data.actions["Idle"]
        anim.action_slot = anim.action.slots[0]
        scene.frame_set(0)
        body = [o for o in scene.objects if o.type == "MESH" and o.name.startswith("IV-S07 armor")]
        names = "root pelvis chest head thigh shin foot upper_arm forearm hand"
        views, lens, cell, key = [(.72,-1,.31)], 8.9, 304, "foundry-12-death"
    elif mode == "bulwark":
        scene.frame_set(1)
        body = [o for o in scene.objects if o.type == "MESH" and o.parent == rig]
        names = "Root Pelvis Torso Head Thigh Shin Foot Upper-arm Forearm Hand"
        views = [(-1,-1,.784),(-1,1,.784),(1,1,.784),(1,-1,.784)]
        lens, cell, key = 11.2, 320, "foundry-10-death"
    elif quad:
        scene.frame_set(1)
        body = [o for o in scene.objects if o.type == "MESH" and o.parent == rig
                and not o.name.startswith("Autocannon.")]
        names = "Root Chassis Torso.Turret Optic Thigh Greave Foot Shoulder Elbow Hand"
        views, lens, cell, key = [(16,-5,3.6)], 10.6, 352, "foundry-9-death"
    elif aero:
        scene.frame_set(1)
        body = [o for group in scene.collection.children if group.name[:2] in ("01","02","03","04")
                for o in group.all_objects if o.type=="MESH"]
        names = "root pelvis chest head thigh shin foot upper_arm forearm hand"
        views, lens, cell, key = [(14,-5.3,2.8)], 7.25, 336, "foundry-11-death"
    else:
        assert mode == "gravemaw"
        scene.frame_set(1)
        body = [o for o in scene.objects if o.type == "MESH" and o.parent == rig and o.get("rigid_driver")]
        names = "root pelvis torso head thigh shin foot upper fore hand"
        views, lens, cell, key = [(.54,-.84,.185)], 8.72, 320, "foundry-8-death"
    assert body
    root, pelvis, torso, head, thigh, shin, foot, upper, fore, hand = names.replace("Upper-arm","Upper_arm").split()
    upper = upper.replace("Upper_arm","Upper arm")
    for obj in scene.objects:
        if obj.type == "MESH":
            obj.animation_data_clear()
            obj.hide_render = obj not in body
    bpy.context.view_layer.update()
    pb = rig.pose.bones
    original = {b.name:b.matrix.copy() for b in pb}
    rest = {b.name:b.bone.matrix_local.copy() for b in pb}
    relative = {b.name:rest[b.parent.name].inverted()@rest[b.name] if b.parent else rest[b.name] for b in pb}
    bases = {b.name:relative[b.name].inverted()@(original[b.parent.name].inverted()@original[b.name]
             if b.parent else original[b.name]) for b in pb}
    ground = min_z(body)
    size = (original[head].translation.z-original[root].translation.z)/4.45
    if mode == "ashigaru":
        center = Vector((0,-.25,ground+3.05))
    elif mode == "bulwark":
        center = Vector((0,0,3.02))
    elif quad:
        center = Vector((0,-.53,2.81))
    elif aero:
        center = Vector((0,-.39,2.58))
    else:
        center = Vector((0,-.12,3))
    for action in bpy.data.actions:
        action.use_fake_user = True
    anim.action = None
    for b in pb:
        for con in b.constraints:
            con.influence = 0
        b.rotation_mode = "QUATERNION"
        b.matrix_basis = bases[b.name]
    clip_data = (("body", BODY, 25), ("pilot", PILOT, 17))
    legs = (("Front.R",-1,-1),("Front.L",1,-1),("Rear.R",-1,1),("Rear.L",1,1)) if quad else (("R",-1,-1),("L",1,1))
    for reason, keys, _ in clip_data:
        if anim.action:
            anim.action.use_fake_user = True
        anim.action = None
        prev = {}
        for f in range(round(keys[-1][0]*24)+1):
            age = f/24
            shift, angles, heel, step = sample(keys, age)
            shift *= size
            drop = min(1, max(0, (age-.49)/.47)) if reason == "body" else 0
            world = {}

            def parent(name):
                p = pb[name].parent
                return get(p.name)@relative[name] if p else relative[name]

            def get(name):
                if name not in world:
                    world[name] = parent(name)@bases[name]
                return world[name]

            def put(name, matrix):
                world[name] = matrix
                pb[name].matrix_basis = parent(name).inverted()@matrix

            for b in pb:
                b.matrix_basis = bases[b.name]
            put(root, original[root])
            hips = original[pelvis].copy()
            if quad:
                hips = turn("Y",angles.y*1.45)@turn("X",angles.x*.26)@hips
                shift.y *= .39
                shift.z *= .86
                hips.translation = original[pelvis].translation
            put(pelvis, Matrix.Translation(shift)@hips)
            chest = get(torso).copy()
            if quad:
                angles *= .26
            turned = turn("Z",angles.z)@turn("Y",angles.y)@turn("X",angles.x)@chest
            turned.translation = chest.translation
            put(torso,turned)
            helmet = get(head).copy()
            nod = turn("X", min(19,angles.x*.36))@helmet
            nod.translation = helmet.translation
            put(head,nod)
            for side, sign, axial in legs:
                a,b,c = (n+"."+side for n in (thigh,shin,foot))
                hip = get(a).translation
                if quad:
                    target = original[c].translation+size*Vector((sign*(.28*step+.17*drop),
                             axial*(.26*step+.32*drop),drop*(.06 if axial<0 else .21)))
                    pole = Vector((sign,axial*.80,.10))
                else:
                    target = original[c].translation+size*(Vector((-.10*step,-step-.58*drop,.03*drop))
                             if side == "R" else Vector((.16*heel,.45*heel-.18*drop,heel+.30*drop)))
                    pole = Vector((sign*.17,-1,0))
                if aero:
                    link = "link."+side
                    rear = turn("X",-17*heel+19*drop).to_3x3()@(original[b].translation-original[c].translation)
                    knee, hock = solve(hip,target+rear,pb[a].length,pb[link].length,pole)
                    ankle = hock-rear
                    put(a,aimed(original[a],hip,knee))
                    put(link,aimed(original[link],knee,hock))
                    put(b,aimed(original[b],hock,ankle))
                else:
                    knee, ankle = solve(hip,target,pb[a].length,pb[b].length,pole)
                    put(a,aimed(original[a],hip,knee))
                    put(b,aimed(original[b],knee,ankle))
                boot = turn("X",axial*drop*17 if quad else -heel*43 if side=="L" else drop*16)@original[c]
                boot.translation = ankle
                put(c,boot)
            for side, sign in (("R",-1),("L",1)):
                a,b,c = (n+"."+side for n in (upper,fore,hand))
                shoulder = get(a).translation
                loose = original[c].translation+shift+size*Vector((sign*.22*step,-step*.8,-heel*.5))
                catch = (original[c].translation+shift+Vector((sign*.22,-.34,-.62)) if quad
                         else Vector((sign*1.72,-2.88 if side=="R" else -2.6,.44))*size)
                pole = Vector((sign*.85,.27,-.67))
                elbow, wrist = solve(shoulder,loose.lerp(catch,drop),pb[a].length,pb[b].length,pole)
                put(a,aimed(original[a],shoulder,elbow))
                put(b,aimed(original[b],elbow,wrist))
                palm = turn("X",drop*51+heel*17)@original[c]
                palm.translation = wrist
                put(c,palm)
            bpy.context.view_layer.update()
            lift = max(0,ground-min_z(body))
            if lift:
                put(root,Matrix.Translation((0,0,lift))@original[root])
            for n in world:
                b = pb[n]
                q = b.rotation_quaternion.copy()
                if n in prev:
                    q.make_compatible(prev[n])
                prev[n] = q.copy()
                b.rotation_quaternion = q
                b.keyframe_insert("rotation_quaternion",frame=f,group=n)
                b.keyframe_insert("location",frame=f,group=n)
        anim.action.name = "Destruction / "+reason
        anim.action.use_fake_user = True
    camera = scene.camera
    if not camera:
        camera = bpy.data.objects.new("Death bake camera",bpy.data.cameras.new("Death bake camera"))
        scene.collection.objects.link(camera)
        scene.camera = camera
    camera.data.type = "ORTHO"
    span = 1.24
    camera.data.ortho_scale = lens*span
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = scene.render.resolution_y = cell
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.color_mode = "RGBA"
    scene.display.render_aa = "8"
    shading = scene.display.shading
    shading.color_type = "MATERIAL"
    shading.show_cavity = True
    shading.cavity_type = "BOTH"
    shading.curvature_ridge_factor = 1.25 if mode == "ashigaru" else 1.1
    shading.curvature_valley_factor = .9 if mode == "ashigaru" else .85
    if aero:
        scene.view_settings.exposure = 1.12
        shading.show_shadows = False
        shading.curvature_ridge_factor = 1.2
        shading.curvature_valley_factor = 1.3
    scene.frame_start = 0
    scene.frame_end = 46
    meta = dict(cell=cell, span=span, clips={}, directions=[])
    for direction, position in enumerate(views):
        folder = output/str(direction)
        folder.mkdir(exist_ok=True)
        camera.location = center+Vector(position).normalized()*18
        camera.rotation_euler = (center-camera.location).to_track_quat("-Z","Y").to_euler()
        view = dict(key=f"{key}-{direction}" if len(views)>1 else key, frames=[])
        meta["directions"].append(view)
        for reason, keys, count in clip_data:
            anim.action = bpy.data.actions["Destruction / "+reason]
            anim.action_slot = anim.action.slots[0]
            last = round(keys[-1][0]*24)
            meta["clips"][reason] = dict(start=len(view["frames"]),count=count,duration=last/24)
            for i in range(count):
                scene.frame_set(round(i*last/(count-1)))
                bpy.context.view_layer.update()

                def point(n,t=0):
                    b = pb[n]
                    return rig.matrix_world@b.head.lerp(b.tail,t)

                forward = pb[torso].matrix.to_quaternion()@original[torso].to_quaternion().inverted()@Vector((0,-.58,0))
                leg_side = ".Front." if quad else "."
                parts = dict(body=point(torso,.43)+forward,pilot=point(head,.32),
                             right=point(fore+".R",.47),left=point(fore+".L",.47),
                             legs=point(shin+leg_side+"L",.3).lerp(point(shin+leg_side+"R",.3),.5),
                             leadFoot=point(foot+leg_side+"R",.55))
                view["frames"].append({name:[round(p.x,5),round(1-p.y,5)] for name,v in parts.items()
                                       for p in [world_to_camera_view(scene,camera,v)]})
                scene.render.filepath = str(folder/f"{len(view['frames'])-1:02}.png")
                bpy.ops.render.render(write_still=True)
        if direction==0:
            anim.action = bpy.data.actions["Destruction / body"]
            anim.action_slot = anim.action.slots[0]
            scene.frame_set(0)
            bpy.context.preferences.filepaths.save_version = 0
            bpy.ops.wm.save_as_mainfile(filepath=str(output/f"{mode}-destruction.blend"),compress=True)
    if len(views)==1:
        meta.update(meta.pop("directions")[0])
    (output/"atlas.json").write_text(json.dumps(meta,separators=(",",":")),encoding="utf-8")


if __name__=="__main__":
    main()
