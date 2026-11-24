"""Export IV-03 R10 with Kestrel and four switchable melee variants via Blender MCP.

Call export_aero(source, output). The export is an isolated rest pose; the
source and the active scene remain unchanged. Runtime must provide jump/dodge
motion and use jet.nozzle.L/R for effects. Gait values require tuning.
"""
import re
from pathlib import Path
import bpy
from mathutils import Matrix, Vector

DATA_COLLECTIONS = ('actions', 'armatures', 'cameras', 'collections', 'curves', 'images', 'lights', 'materials', 'meshes', 'node_groups', 'objects', 'scenes', 'textures', 'worlds')
MATERIAL_NAMES = {'01 | Deep reconnaissance green ceramic':'paint_primary', '02 | Black-green panel trim':'paint_secondary', '03 | Carbon black armor':'paint_accent', '08 | Smoked ruby visor':'visor', '11 | Jet exhaust':'stack'}
BONE_NAMES = {'upper_arm.L':'shoulder.L', 'upper_arm.R':'shoulder.R', 'forearm.L':'elbow.L', 'forearm.R':'elbow.R', 'hand.L':'wrist.L', 'hand.R':'wrist.R', 'thigh.L':'hip.L', 'thigh.R':'hip.R', 'shin.L':'knee.L', 'shin.R':'knee.R', 'foot.L':'ankle.L', 'foot.R':'ankle.R'}

def base(name): return re.sub(r'\.\d{3}$', '', name)

def part_for(bone):
    if bone == 'head': return 'pilot'
    if bone in ('root', 'pelvis', 'spine', 'abdomen', 'chest', 'neck', 'pack') or bone.startswith(('nacelle.', 'nozzle.', 'vane')): return 'body'
    if bone.startswith(('thigh.', 'link.', 'shin.', 'foot.', 'toe.')): return 'legs'
    if bone.endswith('.L'): return 'left'
    if bone.endswith('.R'): return 'right'
    raise ValueError(f'Unclassified Aero bone {bone}')

def flight_armor(scene, rig, objects):
    """Fit faceted castings to the R10 rest joints. Ring dimensions are in chassis space."""
    ceramic = objects['Shoulder | curved pauldron.L'].data.materials[0]
    trim = next(mat for obj in objects.values() if obj.type == 'MESH'
                for mat in obj.data.materials if mat and base(mat.name) == '02 | Black-green panel trim')
    # Each section is (center X, center Y, height, half-width, half-depth).
    # The clipped corners expose the lower lamination and leave clearance at each hinge.
    sections = [
        ('Shoulder | pivot skirt', 'pauldron', trim, [
            (.76, .00, 3.39, .19, .21), (.74, -.02, 3.48, .28, .28),
            (.65, -.01, 3.59, .21, .22)]),
        ('Shoulder | swept flight cap', 'pauldron', ceramic, [
            (.75, -.04, 3.495, .27, .265), (.74, -.04, 3.55, .34, .32),
            (.66, -.01, 3.73, .23, .24), (.61, .01, 3.77, .15, .16)]),
        ('Shoulder | leading rub rail', 'pauldron', trim, [
            (.74, -.307, 3.52, .14, .013), (.74, -.34, 3.55, .16, .017),
            (.72, -.32, 3.58, .12, .013)]),
        ('Chest | lower intake cheek', 'chest', ceramic, [
            (.28, -.39, 3.10, .10, .09), (.35, -.36, 3.23, .19, .14),
            (.39, -.32, 3.29, .13, .10)]),
        ('Forearm | outer gauntlet', 'forearm', ceramic, [
            (1.00, -.02, 2.38, .12, .14), (.98, .00, 2.50, .17, .19),
            (.93, .08, 2.83, .23, .21), (.90, .12, 2.92, .16, .15)]),
        ('Forearm | inset cuff rail', 'forearm', trim, [
            (.99, -.164, 2.48, .038, .016), (.96, -.175, 2.62, .053, .020),
            (.93, -.145, 2.81, .041, .018)]),
        ('Shin | outboard landing guard', 'shin', ceramic, [
            (.75, .11, .38, .10, .12), (.70, .10, .65, .17, .18),
            (.65, .14, .99, .21, .22), (.62, .18, 1.10, .17, .17)]),
        ('Shin | replaceable skid', 'shin', trim, [
            (.74, -.027, .46, .048, .017), (.70, -.089, .69, .068, .027),
            (.65, -.086, .94, .065, .025), (.64, -.073, 1.01, .052, .018)]),
    ]
    outline = [(-.64, -1), (.53, -1), (1, -.52), (1, .52),
               (.58, 1), (-.61, 1), (-1, .62), (-1, -.60)]
    result = []
    for side, sign in (('L', 1), ('R', -1)):
        for name, joint, material, rings in sections:
            vertices = [(sign * (x + u * width), y + v * depth, z)
                        for x, y, z, width, depth in rings for u, v in outline]
            n = len(outline)
            faces = [tuple(reversed(range(n)))]
            for row in range(len(rings)-1):
                for j in range(n):
                    a, b = row*n+j, row*n+(j+1)%n
                    faces.append((a, b, b+n, a+n))
            faces.append(tuple(range(len(vertices)-n, len(vertices))))
            if sign < 0:
                faces = [tuple(reversed(face)) for face in faces]
            mesh = bpy.data.meshes.new(name+'.'+side)
            mesh.from_pydata(vertices, [], faces)
            mesh.materials.append(material)
            mesh.update()
            obj = bpy.data.objects.new(mesh.name, mesh)
            scene.collection.objects.link(obj)
            obj.parent, obj.parent_type = rig, 'BONE'
            obj.parent_bone = 'chest' if joint == 'chest' else joint+'.'+side
            result.append((obj, obj.parent_bone))
    bpy.context.view_layer.update()
    for obj, _ in result:
        obj.data.transform(obj.matrix_world.inverted() @ rig.matrix_world)
    return result


def export_aero(source, output):
    source, output = Path(source).expanduser().resolve(strict=True), Path(output).expanduser().resolve()
    if source.suffix != '.blend' or output.suffix != '.glb' or output.exists(): raise ValueError('Use an existing source and a new GLB')
    window = bpy.context.window
    if not window or bpy.context.mode != 'OBJECT': raise RuntimeError('Run in Object Mode')
    previous = window.scene
    existing = {key: set(getattr(bpy.data, key)) for key in DATA_COLLECTIONS}
    displaced = []
    try:
        for name in MATERIAL_NAMES.values():
            mat = bpy.data.materials.get(name)
            if mat: displaced.append((mat, name)); mat.name = '__aero_saved_' + name
        with bpy.data.libraries.load(str(source), link=False) as (available, staged):
            if len(available.scenes) != 1: raise ValueError('Expected one source scene')
            staged.scenes = available.scenes
        scene = staged.scenes[0]; window.scene = scene
        rigs = [o for o in scene.objects if o.type == 'ARMATURE']
        if len(rigs) != 1 or base(rigs[0].name) != 'IV-03 | Skirmisher-Aero rig': raise ValueError('Expected IV-03 R10 Aero rig')
        rig = rigs[0]; objects = {base(o.name): o for o in scene.objects}
        rig.animation_data_clear(); rig.data.pose_position = 'REST'
        for pb in rig.pose.bones:
            for constraint in list(pb.constraints): pb.constraints.remove(constraint)
        meshes = [(o, o.parent_bone) for o in scene.objects if o.type == 'MESH' and o.parent == rig]
        if len(meshes) < 500: raise ValueError(f'Unexpected chassis assembly {len(meshes)}')
        bpy.context.view_layer.update()
        meshes.extend(flight_armor(scene, rig, objects))
        # Lengthen the two toe shoes together around their metatarsal hinge.
        # Preserve the ankle, planted tread plane, and heel clearance.
        for obj, bone in meshes:
            if bone.startswith('toe.'):
                pivot = rig.matrix_world @ rig.data.bones[bone].head_local
                stretch = Matrix.Translation(pivot) @ Matrix.Diagonal(Vector((1.10, 1.34, 1., 1.))) @ Matrix.Translation(-pivot)
                obj.data = obj.data.copy()
                obj.data.transform(obj.matrix_world.inverted() @ stretch @ obj.matrix_world)
        # Nozzle lip centers preserve the authored jet exit in the rest pose.
        anchors = []
        for side in ('L', 'R'):
            lip = objects[f'Jetpack | nozzle lip heat ring.{side}']
            anchor = bpy.data.objects.new(f'jet.nozzle.{side}', None); scene.collection.objects.link(anchor)
            anchor.parent = rig; anchor.parent_type = 'BONE'; anchor.parent_bone = f'nozzle.{side}'
            bpy.context.view_layer.update()
            position = lip.matrix_world.translation.copy()
            throat = objects[f'Jetpack | articulated hot throat.{side}'].matrix_world.translation
            direction = position - throat
            if direction.length < 1e-5: raise ValueError(f'Invalid jet nozzle direction {side}')
            # Blender local +Z exports to glTF local +Y, pointing outward.
            anchor.matrix_world = Matrix.Translation(position) @ direction.to_track_quat('Z', 'Y').to_matrix().to_4x4()
            anchors.append(anchor)
        # Original grip sockets define the +Y forward, +Z up convention. The
        # two modules are constraint-driven in the source; snap each to its
        # corresponding rest grip and preserve separately switchable variants.
        selected = [rig] + anchors
        for side, name in (('L', 'MODULE | Shrike vibroblade'), ('R', 'MODULE | Kestrel scout carbine')):
            socket, module = objects[f'Socket.Weapon.{side}'], objects[name]
            if socket.parent != rig or socket.parent_bone != f'hand.{side}': raise ValueError('Unexpected grip socket')
            module.animation_data_clear()
            for c in list(module.constraints): module.constraints.remove(c)
            module.parent = socket; module.matrix_parent_inverse = Matrix.Identity(4); module.matrix_basis = Matrix.Identity(4)
            selected.extend((socket, module))
            if side == 'L':
                # Each game variant has its own authored grip group. The saved
                # action hides inactive groups with zero scale, so restore each.
                for variant in ('cleaver', 'breaker', 'piledriver', 'blade'):
                    grip = objects[f'Melee grip | {variant}']
                    if grip.parent != module: raise ValueError('Unexpected melee hierarchy')
                    grip.animation_data_clear(); grip.scale = (1., 1., 1.)
                    grip.hide_viewport = grip.hide_render = False
                    grip.name = f'melee.{variant}'
                    selected.append(grip)
                    pieces = [o for o in grip.children if o.type == 'MESH']
                    if len(pieces) < 5: raise ValueError(f'Missing {variant} geometry')
                    for obj in pieces:
                        obj.animation_data_clear()
                        if min(abs(v) for v in obj.scale) < 1e-5: raise ValueError(f'Degenerate {variant} piece')
                    meshes.extend((o, 'hand.L') for o in pieces)
                    bpy.context.view_layer.update()
                    # +Y is forward in the common grip convention. Center the
                    # tip at the furthest 5% of authored strike geometry.
                    points = [grip.matrix_world.inverted() @ obj.matrix_world @ v.co for obj in pieces for v in obj.data.vertices]
                    lo, hi = min(p.y for p in points), max(p.y for p in points)
                    front = [p for p in points if p.y >= hi - .05 * (hi-lo)]
                    tip = bpy.data.objects.new(f'strike.tip.{variant}', None); scene.collection.objects.link(tip)
                    tip.parent = grip; tip.location = Vector((sum(p.x for p in front)/len(front), hi, sum(p.z for p in front)/len(front)))
                    tip.rotation_mode = 'QUATERNION'; tip.rotation_quaternion = Vector((0., 1., 0.)).to_track_quat('Z', 'Y')
                    selected.append(tip)
            else:
                weapon_meshes = [o for o in module.children if o.type == 'MESH' and not o.name.startswith('FX |')]
                if not weapon_meshes or any(min(abs(v) for v in obj.scale) < 1e-5 for obj in weapon_meshes):
                    raise ValueError('Degenerate Kestrel geometry')
                meshes.extend((o, 'hand.R') for o in weapon_meshes)
            if side == 'R':
                muzzle = bpy.data.objects.new('muzzle.main', None); scene.collection.objects.link(muzzle)
                muzzle.parent = module; bpy.context.view_layer.update()
                brake = objects['Kestrel | open muzzle brake']
                points = [module.matrix_world.inverted() @ brake.matrix_world @ v.co for v in brake.data.vertices]
                muzzle.location = Vector(((min(p.x for p in points)+max(p.x for p in points))/2, max(p.y for p in points), (min(p.z for p in points)+max(p.z for p in points))/2))
                muzzle.rotation_mode = 'QUATERNION'; muzzle.rotation_quaternion = Vector((0., 1., 0.)).to_track_quat('Z', 'Y')
                selected.append(muzzle)
        # Calf struts retain their rest position; animated constraints are not exported.
        for side in ('L', 'R'):
            for name in (f'Calf | barrel clevis.{side}', f'Calf | rod clevis.{side}'):
                anchor = objects[name]; selected.append(anchor)
                for c in list(anchor.constraints): anchor.constraints.remove(c)
                meshes.extend((o, f'foot.{side}') for o in anchor.children if o.type == 'MESH')
        bones = rig.data.bones
        hip, knee, ankle = (bones[n].head_local.copy() for n in ('thigh.L', 'shin.L', 'foot.L'))
        pelvis, spine = (bones[n].head_local.copy() for n in ('pelvis', 'spine'))
        dimensions = dict(py=pelvis.z, spY=spine.z-pelvis.z, legA=(hip-knee).length, legB=(knee-ankle).length, ankleH=ankle.z, restX=abs(ankle.x), restZ=-ankle.y, lift=.5, stance=.86, toe=.17, reverse=False, quad=False, reach=0., phases=[0., .5], sway=.16)
        bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); bpy.context.view_layer.objects.active = rig
        for old, new in BONE_NAMES.items(): bones[old].name = new
        for key, value in dimensions.items(): bones['root'][key] = value
        bpy.ops.object.mode_set(mode='EDIT')
        for side in ('L', 'R'):
            wrist = rig.data.edit_bones[f'wrist.{side}']; socket = rig.data.edit_bones.new(f'socket.{side}')
            socket.parent = wrist; socket.head = wrist.tail; socket.tail = wrist.tail + (wrist.tail-wrist.head).normalized() * .1; socket.use_deform = False
        bpy.ops.object.mode_set(mode='OBJECT')
        for obj, bone in meshes:
            part = part_for(bone); obj['part'] = obj.data['part'] = part
            if bone.startswith('pauldron.'): obj['detach'] = obj.data['detach'] = True
            obj.hide_viewport = obj.hide_render = False
            for slot in obj.material_slots:
                if slot.material and base(slot.material.name) in MATERIAL_NAMES: slot.material.name = MATERIAL_NAMES[base(slot.material.name)]
            obj.data.calc_loop_triangles()
            if len(obj.data.loop_triangles) >= 300:
                modifier = obj.modifiers.new('Aero web triangle budget', 'DECIMATE')
                # Leave room for 9,556 triangles of Workshop equipment.
                modifier.ratio = .255; modifier.use_collapse_triangulate = True
                obj.modifiers.move(len(obj.modifiers)-1, 0)
                bpy.context.view_layer.objects.active = obj
                if bpy.ops.object.modifier_apply(modifier=modifier.name) != {'FINISHED'}: raise RuntimeError('Decimation failed')
        # Only batch meshes sharing an attachment, damage part and detach flag.
        groups = {}
        for obj, bone in meshes:
            groups.setdefault((obj.parent, obj.parent_type, obj.parent_bone, obj['part'], bool(obj.get('detach', False))), []).append(obj)
        for group in groups.values():
            if len(group) < 2: continue
            bpy.ops.object.select_all(action='DESELECT')
            for obj in group: obj.select_set(True)
            if min(abs(v) for v in group[0].scale) < 1e-5: raise ValueError(f'Degenerate batch donor {group[0].name}')
            bpy.context.view_layer.objects.active = group[0]
            if bpy.ops.object.join() != {'FINISHED'}: raise RuntimeError('Batch join failed')
        bpy.ops.object.select_all(action='DESELECT')
        for obj in selected: obj.select_set(True)
        for obj in scene.objects:
            if obj.type == 'MESH' and obj.get('part'): obj.select_set(True)
        bpy.context.view_layer.objects.active = rig
        result = bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', use_selection=True, use_active_scene=True, export_meshopt_compression_enable=True, export_animations=False, export_extras=True, export_yup=True, export_def_bones=False, export_rest_position_armature=True, export_cameras=False, export_lights=False)
        if result != {'FINISHED'} or not output.is_file(): raise RuntimeError(f'Export failed: {result}')
    finally:
        window.scene = previous
        added = [block for key, prior in existing.items() for block in getattr(bpy.data, key) if block not in prior]
        bpy.data.batch_remove(ids=added)
        for material, name in displaced: material.name = name
