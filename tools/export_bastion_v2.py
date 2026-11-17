"""Export the original BST-04 Weapon-Sockets Blender scene as a rigid rig-v2 GLB."""
import hashlib
import json
import re
import struct
import tempfile
from collections import defaultdict
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

SOURCE_SHA = '52be520adbf7da9e129ad80d54e3208870426e8ad1042cbc95bf18949a654ff8'
DATA_COLLECTIONS = ('actions','armatures','cameras','collections','curves','images','lights','materials',
                    'meshes','node_groups','objects','scenes','textures','worlds')
NAMES = {'ROOT':'root','Pelvis':'pelvis','Chest':'spine','Cockpit':'neck','Launcher.R':'mount.shoulderR'}
for side in ('L','R'):
    for before, after in (('UpperArm','shoulder'),('Forearm','elbow'),('Hand','wrist'),
                          ('Thigh','hip'),('Shin','knee'),('Foot','ankle')):
        NAMES[f'{before}.{side}'] = f'{after}.{side}'
PAINT = {
    'Bastion / Factory bone ceramic C6BD9F':'paint_primary',
    'Bastion / Blue charcoal panel':'paint_secondary',
    'Bastion / Safety amber D6A030':'paint_accent',
    'Bastion / Lime optics A6FF6A':'visor',
    'Bastion / White-hot exhaust':'stack',
}
CLIPS = ('Walk','Brace','Shoulder Missile Fire','Rifle Fire','Left-hand Strike','Left-hand Strike - planted')
BIND_FRAME = 57


def original_name(name):
    return re.sub(r'\.\d{3}$', '', name)


def part_for(bone):
    if bone == 'Cockpit':
        return 'pilot'
    if bone.startswith(('Thigh','Shin','Foot','HipArmor','Piston knee','Piston ankle')):
        return 'legs'
    if bone.startswith(('UpperArm','Forearm','Hand','Pauldron','Piston elbow','Claw')):
        return 'left' if bone.endswith('.L') or 'elbow L' in bone else 'right'
    return 'body'


def build_batch(node, sources, depsgraph, collection, part, detach, material_for, ratio):
    vertices, faces, normals, face_materials, smooth, materials = [], [], [], [], [], []
    inverse = node.matrix_world.inverted()
    for obj in sources:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            if not mesh or not mesh.polygons:
                continue
            transform = inverse @ evaluated.matrix_world
            normal_basis = transform.to_3x3().inverted().transposed()
            offset = len(vertices)
            vertices.extend(transform @ vertex.co for vertex in mesh.vertices)
            for face in mesh.polygons:
                faces.append(tuple(offset + i for i in face.vertices))
                normals.extend((normal_basis @ mesh.corner_normals[i].vector).normalized()
                               for i in face.loop_indices)
                material = material_for(mesh.materials[face.material_index])
                if material not in materials:
                    materials.append(material)
                face_materials.append(materials.index(material))
                smooth.append(face.use_smooth)
        finally:
            evaluated.to_mesh_clear()
    if not faces:
        raise ValueError(f'Empty mesh batch for {node.name}')
    mesh = bpy.data.meshes.new(node.name + '.geometry')
    mesh.from_pydata(vertices, [], faces)
    for material in materials:
        mesh.materials.append(material)
    for face, index, smooth_face in zip(mesh.polygons, face_materials, smooth):
        face.material_index, face.use_smooth = index, smooth_face
    mesh.update()
    mesh.normals_split_custom_set(normals)
    mesh.validate(clean_customdata=False)
    obj = bpy.data.objects.new(mesh.name, mesh)
    collection.objects.link(obj)
    obj.parent = node
    obj['part'] = mesh['part'] = part
    if detach:
        obj['detach'] = mesh['detach'] = True
    mesh.calc_loop_triangles()
    if ratio < 1 and len(mesh.loop_triangles) > 300:
        decimate = obj.modifiers.new('Bastion web triangle budget', 'DECIMATE')
        decimate.ratio = ratio
        decimate.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=decimate.name)
        obj.data.validate(clean_customdata=False)


def add_clips(scene, rig, strips, nodes, parents, bind):
    # NLA strips carry the names of the six original actions. Cache samples
    # before adding export tracks so the source review sequence stays isolated.
    rest = {name: node.matrix_basis.copy() for name, node in nodes.items()}
    for clip, start, end in strips:
        samples = defaultdict(list)
        previous = {}
        for frame in range(start, end + 1):
            scene.frame_set(frame)
            for name in nodes:
                pose = rig.pose.bones[name].matrix
                parent = parents[name]
                local = rig.pose.bones[parent].matrix.inverted() @ pose if parent else pose
                loc, rotation, scale = local.decompose()
                if name in previous and rotation.dot(previous[name]) < 0:
                    rotation.negate()
                previous[name] = rotation.copy()
                samples[name].append((loc, rotation, scale))
        for name, node in nodes.items():
            transforms = samples[name]
            animation = node.animation_data_create()
            action = bpy.data.actions.new(f'{clip} / {name}')
            slot = action.slots.new('OBJECT', node.name)
            bag = action.layers.new('Motion').strips.new(type='KEYFRAME').channelbag(slot, ensure=True)
            rest_components = rest[name].decompose()
            for column, (path, width) in enumerate((('location',3),('rotation_quaternion',4),('scale',3))):
                if all(abs(value - rest_value) < 1e-6 for sample in transforms
                       for value, rest_value in zip(sample[column], rest_components[column])):
                    continue
                for component in range(width):
                    values = [sample[column][component] for sample in transforms]
                    curve = bag.fcurves.new(path, index=component)
                    curve.keyframe_points.add(len(transforms))
                    curve.keyframe_points.foreach_set('co', [value for index, v in enumerate(values) for value in (start + index, v)])
                    for key in curve.keyframe_points:
                        key.interpolation = 'LINEAR'
                    curve.update()
            if len(bag.fcurves):
                track = animation.nla_tracks.new()
                track.name = clip
                strip = track.strips.new(clip, start, action)
                strip.action_slot = slot
                strip.extrapolation = 'NOTHING'
            else:
                bpy.data.actions.remove(action)
    scene.frame_set(bind)



def read_glb(path):
    data = path.read_bytes()
    length, chunk_type = struct.unpack_from('<II', data, 12)
    if data[:4] != b'glTF' or chunk_type != 0x4e4f534a:
        raise ValueError(f'Bad Blender GLB header in {path}')
    return json.loads(data[20:20+length]), data[20+length:]


def restore_bind_transforms(static_path, animated_path, output):
    # Blender's NLA export zeros animated channels in the default scene.
    # Reuse Blender's own axis-converted node transforms from the static
    # export so runtime retargeting and skinning start at frame 57.
    static, _ = read_glb(static_path)
    animated, binary_chunk = read_glb(animated_path)
    rest = {node['name']:node for node in static['nodes']}
    if set(rest) != {node['name'] for node in animated['nodes']}:
        raise ValueError('Static and animated Bastion node names differ')
    for node in animated['nodes']:
        original = rest[node['name']]
        for channel in ('matrix','translation','rotation','scale'):
            node.pop(channel, None)
            if channel in original:
                node[channel] = original[channel]
    encoded = json.dumps(animated, ensure_ascii=False, separators=(',',':')).encode('utf-8')
    encoded += b' ' * (-len(encoded) % 4)
    with output.open('xb') as stream:
        stream.write(struct.pack('<4sIIII', b'glTF', 2, len(encoded) + len(binary_chunk) + 20,
                                 len(encoded), 0x4e4f534a))
        stream.write(encoded)
        stream.write(binary_chunk)


def export_bastion(source, output):
    source = Path(source).expanduser().resolve(strict=True)
    output = Path(output).expanduser().resolve()
    if source.suffix != '.blend' or output.suffix != '.glb' or output.exists():
        raise ValueError('Use the verified source and a new GLB output path')
    if hashlib.sha256(source.read_bytes()).hexdigest() != SOURCE_SHA:
        raise ValueError('Expected the verified Bastion Weapon-Sockets source')
    window = bpy.context.window
    if not window or bpy.context.mode != 'OBJECT':
        raise RuntimeError('Run with a Blender window in Object Mode')
    previous = window.scene
    existing = {key: set(getattr(bpy.data,key)) for key in DATA_COLLECTIONS}
    displaced = []
    def reserve(blocks, name):
        prior = blocks.get(name)
        if prior:
            displaced.append((prior, name))
            prior.name = '__bastion_saved_' + name

    try:
        with bpy.data.libraries.load(str(source), link=False) as (available, loaded):
            if len(available.scenes) != 1:
                raise ValueError('Expected one Bastion playtest scene')
            loaded.scenes = available.scenes
        scene = loaded.scenes[0]
        window.scene = scene
        rigs = [obj for obj in scene.objects if obj.type == 'ARMATURE']
        if len(rigs) != 1 or len(rigs[0].data.bones) != 77:
            raise ValueError('Expected the 77-joint BST-04 rig')
        rig = rigs[0]
        strips = [(strip.name, int(strip.frame_start), int(strip.frame_end))
                  for track in rig.animation_data.nla_tracks for strip in track.strips]
        if tuple(clip for clip, _, _ in strips) != CLIPS:
            raise ValueError('Unexpected Bastion review sequence')
        scene.frame_set(BIND_FRAME)
        poses = {bone.name: bone.matrix.copy() for bone in rig.pose.bones}
        parents = {bone.name: bone.parent.name if bone.parent else None for bone in rig.pose.bones}
        piston_pairs = json.loads(rig['tracked_ram_anchors'])
        if len(piston_pairs) != 14:
            raise ValueError('Expected all fourteen Bastion piston pairs')
        for a, b, _, _, parent_a, parent_b in piston_pairs:
            parents[a], parents[b] = parent_a, parent_b

        collection = bpy.data.collections.new('BST-04 v2 export')
        scene.collection.children.link(collection)
        def empty(name, world, parent=None):
            reserve(bpy.data.objects, name)
            node = bpy.data.objects.new(name, None)
            collection.objects.link(node)
            node.parent = parent
            node.rotation_mode = 'QUATERNION'
            node.matrix_basis = parent.matrix_world.inverted() @ world if parent else world
            bpy.context.view_layer.update()
            return node

        nodes = {}
        for name, parent in parents.items():
            export_name = NAMES.get(name, name)
            if name.startswith('Piston '):
                # Use distinct names to avoid colliding with the source bone or body mesh.
                group, half = name.split(' / ')
                export_name = group.replace('Piston ', 'piston.').replace(' ', '.') + ('.a' if half == 'cylinder' else '.b')
            elif name.startswith('MissileSocket.'):
                export_name = name.replace('MissileSocket.', 'muzzle.vesper.')
            nodes[name] = empty(export_name, poses[name], nodes.get(parent))

        hip, knee, ankle = (poses[n].translation for n in ('Thigh.L','Shin.L','Foot.L'))
        pelvis, chest = (poses[n].translation for n in ('Pelvis','Chest'))
        # Match Bastion's former shared-animation parameters from VowChassis.DIMS[2].
        dimensions = dict(py=pelvis.z, spY=chest.z-pelvis.z, legA=(hip-knee).length,
                          legB=(knee-ankle).length, ankleH=ankle.z, restX=ankle.x, restZ=-ankle.y,
                          lift=.5, stance=.86, toe=0., reverse=False, quad=False, reach=0.,
                          phases=[0.,.5], sway=.16)
        for key, value in dimensions.items():
            nodes['ROOT'][key] = value
        nodes['ROOT']['sourceSha256'] = SOURCE_SHA
        nodes['ROOT']['pistons'] = json.dumps([[nodes[a].name,nodes[b].name] for a,b,*_ in piston_pairs])

        groups = defaultdict(list)
        for obj in scene.objects:
            if obj.parent == rig and obj.type in {'MESH','CURVE'} and obj.get('rig_owner'):
                groups[obj['rig_owner']].append(obj)
        rifle = next(obj for obj in scene.objects if obj.get('playtest_weapon') and obj.type == 'EMPTY')
        melees = {obj['bastion_melee_asset']:obj for obj in scene.objects if obj.get('bastion_melee_asset')}
        if set(melees) != {'cleaver','breaker','piledriver'}:
            raise ValueError('Missing fitted melee assemblies')
        for prop in melees.values():
            for obj in [prop,*prop.children_recursive]:
                obj.hide_set(False)
                obj.hide_render = False
        bpy.context.view_layer.update()

        depsgraph = bpy.context.evaluated_depsgraph_get()
        materials = {}
        def material_for(source_mat):
            if source_mat not in materials:
                name = original_name(source_mat.name)
                mat = source_mat.copy()
                if name in PAINT:
                    reserve(bpy.data.materials, PAINT[name])
                    mat.name = PAINT[name]
                shader = mat.node_tree.nodes.get('Principled BSDF')
                if name.startswith('Bastion /'):
                    # The approved rigid export also uses the authored uniform
                    # colors in place of Blender's procedural panel shaders.
                    for pin in ('Base Color','Normal'):
                        for link in tuple(shader.inputs[pin].links):
                            mat.node_tree.links.remove(link)
                    strength = shader.inputs['Emission Strength']
                    strength.default_value = min(3, strength.default_value)
                materials[source_mat] = mat
            return materials[source_mat]

        for name, objs in groups.items():
            build_batch(nodes[name], objs, depsgraph, collection, part_for(name),
                        name.startswith(('Pauldron.','HipArmor')), material_for, .207)

        rifle_basis = rifle.matrix_world.copy()
        rifle_grip = rifle_basis @ Vector(rig['rifle_grip_model_point'])
        rifle_socket = empty('socket.R', Matrix.Translation(rifle_grip), nodes['Hand.R'])
        rifle_mount = empty('weapon.rifle', Matrix.Translation(rifle_grip), rifle_socket)
        muzzle = next(obj for obj in rifle.children if original_name(obj.name) == 'muzzle')
        muzzle_basis = rifle_basis.to_quaternion().to_matrix().to_4x4()
        muzzle_basis.translation = muzzle.matrix_world.translation
        empty('muzzle.main', muzzle_basis, rifle_mount)
        build_batch(rifle_mount, [o for o in rifle.children if o.type == 'MESH'], depsgraph,
                    collection, 'right', False, material_for, .65)

        cleaver = melees['cleaver']
        melee_socket = empty('socket.L', Matrix.Translation(cleaver.matrix_world.translation), nodes['Hand.L'])
        for id, prop in melees.items():
            mount = empty('weapon.' + id, prop.matrix_world.copy(), melee_socket)
            spike = next((obj for obj in prop.children if obj.type == 'EMPTY' and original_name(obj.name) == 'spike'), None)
            tip = next(obj for obj in prop.children_recursive if obj.type == 'EMPTY' and original_name(obj.name) == 'tip')
            moving_mount = empty('auger.piledriver', spike.matrix_world.copy(), mount) if spike else mount
            empty('strike.tip.' + id, tip.matrix_world.copy(), moving_mount)
            build_batch(mount, [o for o in prop.children if o.type == 'MESH'], depsgraph,
                        collection, 'left', False, material_for, .75)
            if spike:
                build_batch(moving_mount, [o for o in spike.children if o.type == 'MESH'], depsgraph,
                            collection, 'left', False, material_for, 1)

        # Only evaluate the batched export during glTF sampling. Otherwise
        # every animation sample reevaluates thousands of source assemblies.
        export_scene = bpy.data.scenes.new('BST-04 v2 export')
        export_scene.render.fps = scene.render.fps
        export_scene.render.fps_base = scene.render.fps_base
        export_scene.frame_start, export_scene.frame_end = scene.frame_start, scene.frame_end
        export_scene.collection.children.link(collection)
        window.scene = export_scene
        export_scene.frame_set(BIND_FRAME)
        bpy.ops.object.select_all(action='DESELECT')
        for obj in collection.objects:
            obj.select_set(True)
        settings = dict(export_format='GLB', use_selection=True, use_active_scene=True,
                        export_meshopt_compression_enable=True, export_extras=True, export_yup=True,
                        export_cameras=False, export_lights=False, export_texcoords=False)
        with tempfile.TemporaryDirectory(prefix='bastion-export-') as directory:
            static_path, animated_path = (Path(directory) / name for name in ('bind.glb','clips.glb'))
            result = bpy.ops.export_scene.gltf(filepath=str(static_path), export_animations=False, **settings)
            if result != {'FINISHED'}:
                raise RuntimeError(f'Bastion bind export failed: {result}')
            window.scene = scene
            add_clips(scene, rig, strips, nodes, parents, BIND_FRAME)
            window.scene = export_scene
            export_scene.frame_set(BIND_FRAME)
            result = bpy.ops.export_scene.gltf(filepath=str(animated_path), export_animations=True,
                export_animation_mode='NLA_TRACKS', export_anim_slide_to_zero=True, **settings)
            if result != {'FINISHED'}:
                raise RuntimeError(f'Bastion clip export failed: {result}')
            restore_bind_transforms(static_path, animated_path, output)
    finally:
        window.scene = previous
        # Source objects displaced by differently named generated nodes are being
        # removed, while preexisting datablocks must get their exact names back.
        added = [block for key, prior in existing.items() for block in getattr(bpy.data,key) if block not in prior]
        restore = [(block,name) for block,name in displaced if block not in added]
        bpy.data.batch_remove(ids=added)
        for block, name in restore:
            block.name = name
