"""Build the staged Warden GLB from Blender. Invoke through export-v2.sh."""
import json
import struct
import sys
from math import pi, sqrt
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


def export_bench(folder):
    # Adapt the recovered Warden-Local-Preview/work/export-warden-bench.py.
    # Preserve its evaluated assembly, authored poses and rifle clearance.
    rig = bpy.data.objects['WARDEN / Pose Rig']
    scene = bpy.context.scene
    def attached_bone(obj):
        while obj.parent and obj.parent != rig:
            obj = obj.parent
        return obj.parent_bone if obj.parent == rig else ''


    parts = [obj for obj in scene.objects if obj.type in {'MESH', 'FONT'} and attached_bone(obj)]
    pins = [obj for obj in parts if obj.name.startswith('Knee guard / sliding pin')]
    parts = [obj for obj in parts if obj not in pins and attached_bone(obj) != 'Rifle']
    convert = Matrix.Rotation(-pi/2, 4, 'X')


    def name(bone):
        return 'Bench_' + bone.replace('.', '_')


    def empty(label, parent=None, matrix=None):
        obj = bpy.data.objects.new(label, None)
        scene.collection.objects.link(obj)
        obj.parent = parent
        if matrix is not None:
            obj.matrix_basis = matrix
        return obj


    root = empty('Painted_Warden')
    nodes = {}
    rest = {bone.name: bone.matrix.copy() for bone in rig.pose.bones}
    for bone in rig.pose.bones:
        parent = bone.parent
        local = rest[parent.name].inverted() @ rest[bone.name] if parent else rest[bone.name]
        nodes[bone.name] = empty(name(bone.name), nodes[parent.name] if parent else root, local)


    # Keep the authored PBR values. The inset apron inherits the base graphite
    # until an accent is specified. The two existing lower exhausts mark the stack.
    accent = bpy.data.materials['Warden / blue graphite armor'].copy()
    accent.name = 'paint_accent'
    stack = bpy.data.materials['Warden / rubber and gaskets'].copy()
    stack.name = 'stack'
    shader = next(node for node in stack.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    shader.inputs['Emission Color'].default_value = (.055, .014, .003, 1)
    shader.inputs['Emission Strength'].default_value = 1


    def merge_geometry(label, objects, parent, world, detachable=False):
        graph = bpy.context.evaluated_depsgraph_get()
        vertices, faces, normals, slots, indices = [], [], [], [], []
        for obj in objects:
            rendered = obj.evaluated_get(graph)
            mesh = rendered.to_mesh()
            transform = world.inverted() @ rendered.matrix_world
            normal = transform.to_3x3().inverted().transposed()
            start = len(vertices)
            vertices.extend(transform @ v.co for v in mesh.vertices)
            for polygon in mesh.polygons:
                faces.append([start + i for i in polygon.vertices])
                normals.extend((normal @ mesh.corner_normals[i].vector).normalized() for i in polygon.loop_indices)
                mat = mesh.materials[polygon.material_index]
                if obj.name.startswith('Pauldron / inset apron plate'):
                    mat = accent
                elif obj.name.startswith('Back / lower exhaust'):
                    mat = stack
                if mat not in slots:
                    slots.append(mat)
                indices.append(slots.index(mat))
            rendered.to_mesh_clear()
        data = bpy.data.meshes.new(label)
        data.from_pydata(vertices, [], faces)
        for mat in slots:
            data.materials.append(mat)
        for face, index in zip(data.polygons, indices):
            face.material_index = index
            face.use_smooth = True
        data.normals_split_custom_set(normals)
        obj = bpy.data.objects.new(label, data)
        scene.collection.objects.link(obj)
        obj.parent = parent
        if detachable:
            obj['detach'] = True
        return obj


    for bone, node in nodes.items():
        meshes = [obj for obj in parts if attached_bone(obj) == bone]
        # Break away the apron shell, inset and its stencil, leaving the separate
        # structural load coupling and all limb mechanics in place.
        outer = [obj for obj in meshes if obj.name.startswith((
            'Pauldron / large sloped apron', 'Pauldron / inset apron plate',
            'Pauldron / shingled side', 'WDN-07 / left shoulder stencil'))]
        armor = [obj for obj in meshes if obj not in outer]
        if armor:
            merge_geometry(node.name + '_armor', armor, node, rest[bone])
        if outer:
            merge_geometry(node.name + '_apron', outer, node, rest[bone], detachable=True)

    for side in ('R', 'L'):
        hand = rig.data.bones['Hand.' + side]
        wrist = hand.matrix_local.inverted() @ rig.data.bones['Elbow.' + side].tail_local
        empty('WristContact_' + side, nodes[hand.name], Matrix.Translation(wrist))
        # The fingers curl around the X axis. The handle sits under the palm,
        # inside the bend from the proximal fingers to the fingertips.
        empty('GripContact_' + side, nodes[hand.name], Matrix.Translation((0,.235,-.135)))

    pin_nodes = {}
    for i, pin in enumerate(pins):
        parent = pin.parent_bone
        node = empty('Bench_GuardLink_' + str(i), nodes[parent], rest[parent].inverted() @ pin.matrix_world)
        pin_nodes[pin] = node
        merge_geometry(node.name + '_metal', [pin], node, pin.matrix_world.copy())


    def assign(obj, action):
        data = obj.animation_data_create()
        data.action = action
        slot = next((s for s in action.slots if s.identifier == 'OB' + obj.name), None)
        if slot:
            data.action_slot = slot


    def bench_pose():
        matrices = {bone.name: bone.matrix.copy() for bone in rig.pose.bones}
        shoulder, elbow, hand, socket = ('Shoulder.R', 'Elbow.R', 'Hand.R', 'Rifle')
        wrist_offset = rig.data.bones[hand].matrix_local.inverted() @ rig.data.bones[elbow].tail_local
        a, b = (matrices[name].translation for name in (shoulder, elbow))
        wrist = matrices[hand] @ wrist_offset
        torso_motion = matrices['Torso'] @ rest['Torso'].inverted()
        # Leave space for the full-depth receiver and stock beside the cuirass.
        target = wrist + torso_motion.to_3x3() @ Vector((-.42,-.21,0))
        upper, lower = (b-a).length, (wrist-b).length
        axis = (target-a).normalized()
        distance = min((target-a).length, upper+lower-.03)
        target = a+axis*distance
        along = (upper*upper-lower*lower+distance*distance)/(2*distance)
        pole = b-a-axis*(b-a).dot(axis)
        elbow_now = a+axis*along+pole.normalized()*sqrt(max(0,upper*upper-along*along))
        for name, before, after, old_axis, new_axis in (
            (shoulder,a,a,b-a,elbow_now-a), (elbow,b,elbow_now,wrist-b,target-elbow_now)
        ):
            turn = old_axis.rotation_difference(new_axis).to_matrix().to_4x4()
            matrices[name] = Matrix.Translation(after) @ turn @ Matrix.Translation(-before) @ matrices[name]
        matrices[hand].translation += target-wrist
        matrices[socket].translation += target-wrist
        return matrices


    clips = {}
    for action in bpy.data.actions:
        if not action.name.startswith('Warden painted / '):
            continue
        assign(rig, action)
        for pin in pins:
            assign(pin, action)
        first, last = (round(x) for x in action.frame_range)
        clip = {'frames': last-first+1, 'fps': scene.render.fps, 'nodes': {}}
        for frame in range(first, last+1):
            scene.frame_set(frame)
            matrices = bench_pose()
            transforms = {}
            for bone in rig.pose.bones:
                matrix = matrices[bone.parent.name].inverted() @ matrices[bone.name] if bone.parent else matrices[bone.name].copy()
                if bone.name == 'ROOT' and action.name.endswith('/ Walk'):
                    matrix.translation = rest[bone.name].translation
                transforms[nodes[bone.name].name] = matrix
            for pin, node in pin_nodes.items():
                transforms[node.name] = rig.pose.bones[pin.parent_bone].matrix.inverted() @ pin.matrix_world
            for node, matrix in transforms.items():
                location, rotation, scale = (convert @ matrix @ convert.inverted()).decompose()
                values = (*location, rotation.x, rotation.y, rotation.z, rotation.w, *scale)
                clip['nodes'].setdefault(node, []).extend(round(v, 6) for v in values)
        clips[action.name.split(' / ',1)[1]] = clip

    selected = [root, *root.children_recursive]
    # glTF cannot evaluate the Blender paint-noise graph. Keep each authored
    # material's base color and PBR values in the exported material.
    materials = {mat for obj in selected if obj.type == 'MESH' for mat in obj.data.materials}
    for mat in materials:
        if mat and mat.use_nodes:
            shader = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
            color = shader.inputs['Base Color']
            for link in list(color.links):
                mat.node_tree.links.remove(link)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in selected:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(folder/'warden-painted.glb'),export_format='GLB',
                              use_selection=True,export_animations=False,export_extras=True)
    (folder/'warden-painted-motion.json').write_text(json.dumps(clips,separators=(',',':')),encoding='utf8')
    print('Painted Warden export:',len(selected),'nodes;',', '.join(clips))


def header(path):
    with path.open('rb') as handle:
        magic, version, _, json_size, kind = struct.unpack('<5I', handle.read(20))
        assert (magic, version, kind) == (0x46546c67, 2, 0x4e4f534a)
        return json.loads(handle.read(json_size))


def compress_bind(folder):
    source = folder / 'warden-published-bind.glb'
    spec = header(source)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    assert bpy.ops.import_scene.gltf(filepath=str(source), import_scene_extras=True) == {'FINISHED'}
    scene = bpy.context.scene
    scene.name = 'Warden | source staging'
    joints = {obj.name: obj for obj in scene.objects if obj.get('wardenJoint')}
    meshes = [obj for obj in scene.objects if obj.type == 'MESH']
    assert len(meshes) == sum('mesh' in node for node in spec['nodes']) and 'root' in joints
    original_meshes = [(obj, obj.parent.name, obj.matrix_world.copy()) for obj in meshes]
    original_joints = {name: obj.matrix_world.copy() for name, obj in joints.items()}

    arm_data = bpy.data.armatures.new('Warden | published bind')
    armature = bpy.data.objects.new('Warden | published bind', arm_data)
    scene.collection.objects.link(armature)
    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for name, obj in joints.items():
        bone = arm_data.edit_bones.new(name)
        bone.head, bone.tail = (0, 0, 0), (0, .2, 0)
        bone.matrix = original_joints[name].normalized()
        if obj.parent is not None and obj.parent.name in joints:
            bone.parent = arm_data.edit_bones[obj.parent.name]
    bpy.ops.object.mode_set(mode='OBJECT')
    armature.show_in_front = True
    for name, value in spec['nodes'][0]['extras'].items():
        if isinstance(value, (int, float, str)) or isinstance(value, list) and all(isinstance(item, (int, float)) for item in value):
            arm_data.bones['root'][name] = value
    armature['Provenance'] = 'Canonical stage from the recovered painted Warden source, preserving the published Aim 0 hinge correction.'
    for obj, owner, transform in original_meshes:
        obj.data['part'] = obj['part']
        if obj.get('detach'):
            obj.data['detach'] = True
        obj.parent = armature
        obj.parent_type = 'BONE'
        obj.parent_bone = owner
        obj.matrix_world = transform
    bpy.context.view_layer.update()
    delta = max(abs(a - b) for obj, _, transform in original_meshes for row, original_row in zip(obj.matrix_world, transform) for a, b in zip(row, original_row))
    assert delta < 1e-5, f'Mesh parenting moved the published bind by {delta}'
    for obj in joints.values():
        bpy.data.objects.remove(obj, do_unlink=True)
    result = bpy.ops.export_scene.gltf(filepath=str(folder / 'warden-blender-roundtrip.glb'), export_format='GLB',
        use_active_scene=True, export_animations=False, export_extras=True, export_def_bones=False,
        export_rest_position_armature=True, export_yup=True, export_lights=False, export_cameras=False,
        export_meshopt_compression_enable=True)
    assert result == {'FINISHED'}
    print(json.dumps({'stagedMeshes':len(meshes), 'bones':len(arm_data.bones), 'parentingMatrixDelta':delta}))

if __name__ == '__main__':
    mode, directory = sys.argv[sys.argv.index('--') + 1:]
    operations = {'bench': export_bench, 'compress': compress_bind}
    operations[mode](Path(directory).resolve())
