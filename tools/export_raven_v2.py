"""Build the battle Raven GLB from the articulated Raven source scene.

Run Blender with --background Raven-Rig.blend --python tools/export_raven_v2.py.
The Blender scene and review GLB retain their full-detail geometry.
"""

from hashlib import sha256
import json
from pathlib import Path
import struct
from tempfile import TemporaryDirectory

import bpy


OUTPUT = Path(__file__).resolve().parents[1] / 'dist/rig-bench/rig-v2/raven.glb'
PARTS = ('body', 'pilot', 'left', 'right', 'legs')
MATERIALS = ('paint_primary', 'paint_secondary', 'frame', 'stack', 'steel', 'paint_accent', 'visor')
NAMES = {'Root': 'root', 'Pelvis': 'pelvis', 'Torso': 'spine', 'Optics': 'neck'}
for side in ('L', 'R'):
    for before, after in (('Arm', 'shoulder'), ('Elbow', 'elbow'), ('Hand', 'wrist'), ('Grip', 'socket'),
                          ('Hip', 'hip'), ('Knee', 'knee'), ('Foot', 'ankle')):
        NAMES[f'{before}.{side}'] = f'{after}.{side}'


def triangles(mesh):
    mesh.calc_loop_triangles()
    return len(mesh.loop_triangles)


def add_inlay_mask(original, mesh):
    name = original.name.partition('.')[0]
    inlay = mesh.attributes.new('_RAVEN_INLAY', 'FLOAT_VECTOR', 'POINT')
    if name == 'Raised six-sided cheek plate':
        # The six-sided pressing has eight 24-vertex rings and a center.
        # Tint the outer lip, where the flat and rolled perimeter rings meet.
        if len(mesh.vertices) != 193:
            raise ValueError(f'Unexpected Raven cheek topology for {original.name}')
        left = original['rig_attachment'] == 'Shield.L'
        for index in range(24, 48):
            corner = index % 24
            inlay.data[index].vector = (1, not left, corner in (0, 1, 2, 3, 4, 5, 16, 17, 18, 19, 20))
        return
    accents = {
        'Stepped cheek service cut': (1, 1, 0),
        'Deck spline slot bed': (1, 0, 1),
        'Blade lateral wear strip': (0, 0, 1),
    }
    if original.name in ('Greave assembled edge rail', 'Greave assembled edge rail.002'):
        for point in inlay.data:
            point.vector = (0, 1, 0)
    elif name in accents:
        for point in inlay.data:
            point.vector = accents[name]


def build_meshes(scene, runtime, rig):
    source = [obj for obj in scene.objects if obj.parent == rig and obj.get('rig_attachment')]
    if not source:
        raise ValueError('Expected the articulated Raven source with rigid mesh bindings')
    for obj in source:
        for modifier in obj.modifiers:
            if modifier.type == 'BEVEL':
                modifier.segments = 1
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    groups = {part: [] for part in PARTS}
    counts = {}
    for original in source:
        mesh = bpy.data.meshes.new_from_object(original.evaluated_get(depsgraph), depsgraph=depsgraph)
        mesh.transform(original.matrix_world)
        add_inlay_mask(original, mesh)
        obj = bpy.data.objects.new('Raven runtime / ' + original.name, mesh)
        runtime.collection.objects.link(obj)
        groups[original['part']].append(obj)
        counts[obj] = triangles(mesh)
        weights = obj.vertex_groups.new(name=original['rig_attachment'])
        weights.add(list(range(len(obj.data.vertices))), 1, 'REPLACE')

    # Allow for the separate hard-surface details when budgeting each part.
    allowance = sum(min(n, 20) for n in counts.values())
    detail = sum(max(0, n - 20) for n in counts.values())
    ratio = min(1, (56_000 - allowance) / max(1, detail))
    bpy.context.window.scene = runtime
    meshes = []
    for part, group in groups.items():
        counts_for_part = [counts[obj] for obj in group]
        bpy.ops.object.select_all(action='DESELECT')
        for obj in group:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = group[0]
        bpy.ops.object.join()
        obj = bpy.context.object
        decimate = obj.modifiers.new('Battle geometry budget', 'DECIMATE')
        decimate.ratio = sum(min(n, 20) + max(0, n - 20) * ratio for n in counts_for_part) / sum(counts_for_part)
        decimate.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=decimate.name)
        obj.data.validate(clean_customdata=False)
        if any(len(vert.groups) != 1 or vert.groups[0].weight != 1 for vert in obj.data.vertices):
            raise ValueError(f'Raven {part} lost rigid weights during simplification')
        obj.name = obj.data.name = 'Raven ' + part
        obj['part'] = obj.data['part'] = part
        obj.parent = rig
        skin = obj.modifiers.new('Raven rigid skin', 'ARMATURE')
        skin.object = rig
        meshes.append(obj)
    return meshes


def dimensions(rig):
    point = lambda name: rig.data.bones[name].head_local
    hip, knee, ankle = (point(name) for name in ('Hip.L', 'Knee.L', 'Foot.L'))
    pelvis, spine, ground = (point(name) for name in ('Pelvis', 'Torso', 'Root'))
    return dict(py=pelvis.z-ground.z, spY=spine.z-pelvis.z, legA=(hip-knee).length,
                legB=(knee-ankle).length, ankleH=ankle.z-ground.z, restX=abs(ankle.x),
                restZ=-ankle.y, lift=.34, stance=abs(ankle.x)*2, toe=0,
                reverse=False, quad=False, reach=0, phases=[.5, 0], sway=.085)


def annotate(raw, metadata):
    length = struct.unpack_from('<I', raw, 12)[0]
    gltf = json.loads(raw[20:20+length])
    for node in gltf['nodes']:
        name = node.get('name')
        if name in NAMES:
            node['name'] = NAMES[name]
        if name == 'Root':
            node.setdefault('extras', {}).update(metadata)
    encoded = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    encoded += b' ' * (-len(encoded) % 4)
    payload = raw[20+length:]
    return struct.pack('<4s3I4s', b'glTF', 2, 20+len(encoded)+len(payload), len(encoded), b'JSON') + encoded + payload


def export():
    rig = bpy.data.objects['Raven Rig']
    scene = bpy.context.scene
    idle = bpy.data.actions['Idle']
    rig.animation_data.action = idle
    rig.animation_data.action_slot = idle.slots[0]
    scene.frame_set(int(idle.frame_range[0]))
    runtime = bpy.data.scenes.new('Raven battle export')
    runtime.render.fps = scene.render.fps
    runtime.frame_start, runtime.frame_end = scene.frame_start, scene.frame_end
    runtime.collection.objects.link(rig)
    meshes = build_meshes(scene, runtime, rig)
    runtime.frame_set(int(idle.frame_range[0]))
    total = sum(triangles(obj.data) for obj in meshes)
    if total > 60_000:
        raise ValueError(f'Raven exceeds the 60,000 triangle budget: {total:,}')

    for i, name in enumerate(MATERIALS, 1):
        next(material for material in bpy.data.materials if material.name.startswith(f'{i:02d} |')).name = name
    rig.location.z = -rig.data.bones['Root'].head_local.z
    metadata = dimensions(rig)
    metadata['sourceSha256'] = sha256(Path(bpy.data.filepath).read_bytes()).hexdigest()
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.update()
    with TemporaryDirectory(prefix='raven-v2-') as directory:
        intermediate = Path(directory) / 'raven.glb'
        result = bpy.ops.export_scene.gltf(filepath=str(intermediate), export_format='GLB', use_selection=True, use_active_scene=True,
            export_extras=True, export_texcoords=False, export_attributes=True, export_animations=True,
            export_anim_slide_to_zero=True, export_animation_mode='ACTIONS', export_meshopt_compression_enable=True,
            export_optimize_animation_keep_anim_armature=False)
        if result != {'FINISHED'}:
            raise RuntimeError(f'Raven GLB export failed: {result}')
        OUTPUT.write_bytes(annotate(intermediate.read_bytes(), metadata))
    print(f'{OUTPUT} - {total:,} triangles, {OUTPUT.stat().st_size:,} bytes')


if __name__ == '__main__':
    export()
