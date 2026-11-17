"""Export the original Gatecrasher retained by the game as Hellbreaker HV-09X.

Run with Blender's Python and add the repository's tools directory to sys.path.
The shipped Hellbreaker provenance is tools/install_gatecrasher_r2.py:41-44.
"""
import hashlib
import sys
from pathlib import Path

import bpy
from mathutils import Vector

from export_cicada_v2 import DATA_COLLECTIONS, GAIT, MATERIAL_NAMES, authored_name
from export_gatecrasher_v2 import part_for

SOURCE_HASHES = {
    # grounded-walk-release/original/{gatecrasher,iron-vow-gatecrasher}.blend
    '329c247004f8acfab907baf574d8b6d39bd554a27b7e9cd6ecffcafeca5e0be2',
    # Archived Codex output and work/iron-vow/rebuild copy.
    '9c2942f79b4ab16eb4b519dd9862febecddbd8f35e9f09e2c32e9978e0ecabb4',
}
NAMES = {'ROOT':'root','Pelvis':'pelvis','Torso':'spine','Optics':'neck','Muzzle':'muzzle.main'}
for side in ('L','R'):
    for before, after in (('Shoulder','shoulder'),('Elbow','elbow'),('Wrist','wrist'),('Hip','hip'),
        ('Knee','knee'),('Foot','ankle'),('Hardpoint','socket')):
        NAMES[f'{before}.{side}'] = f'{after}.{side}'


def configure_bones(rig, source_hash):
    bones = rig.data.bones
    hip, knee, ankle = (bones[key].head_local for key in ('Hip.L','Knee.L','Foot.L'))
    pelvis, spine = (bones[key].head_local for key in ('Pelvis','Torso'))
    dims = dict(py=pelvis.z, spY=spine.z-pelvis.z, legA=(hip-knee).length, legB=(knee-ankle).length,
        ankleH=ankle.z, restX=abs(ankle.x), restZ=-ankle.y, **GAIT)
    for before, after in NAMES.items():
        bones[before].name = after
    for key, value in dims.items(): bones['root'][key] = value
    bones['root']['sourceSha256'] = source_hash

    bpy.ops.object.mode_set(mode='EDIT')
    try:
        edit = rig.data.edit_bones
        muzzle, slide, finger = (edit[key] for key in ('muzzle.main','Cannon Slide','Finger 2 tip.L'))
        # Preserve the two barrel exits and digit-tip contact already used by
        # the published bake (tools/render_prototype_combat.py:236-246).
        half_spacing = slide.matrix.to_3x3() @ Vector((.19,0,0))
        for side, sign in [('L',-1),('R',1)]:
            barrel = edit.new('muzzle.morrow.'+side)
            barrel.parent = slide
            barrel.head = muzzle.head + sign*half_spacing
            barrel.tail = muzzle.tail + sign*half_spacing
            barrel.roll = muzzle.roll
            barrel.use_deform = False
        tip = edit.new('strike.tip.breach-gauntlet')
        tip.parent = finger
        tip.head = finger.tail
        tip.tail = finger.tail + (finger.tail-finger.head).normalized()*.10
        tip.roll = finger.roll
        tip.use_deform = False
    finally:
        bpy.ops.object.mode_set(mode='OBJECT')


def configure_mesh(obj, bone):
    part = part_for(obj.name,bone)
    obj.data['part'] = obj['part'] = part
    if bone.startswith('Pauldron.'):
        obj.data['detach'] = obj['detach'] = True
    for slot in obj.material_slots:
        source_name = authored_name(slot.material.name)
        if source_name in MATERIAL_NAMES:
            slot.material.name = MATERIAL_NAMES[source_name]
    if bone == 'Cannon Slide' or bone == 'Wrist.L' or bone.startswith(('Finger ','Thumb.')):
        # Keep both integral weapon assemblies and the contact silhouette intact.
        return
    if len(obj.data.loop_triangles) < 800:
        return
    modifier = obj.modifiers.new('Hellbreaker web triangle budget','DECIMATE')
    modifier.ratio = .58
    modifier.use_collapse_triangulate = True
    obj.modifiers.move(len(obj.modifiers)-1,0)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def export_hellbreaker(source, output):
    source = Path(source).expanduser().resolve(strict=True)
    output = Path(output).expanduser().resolve()
    if source.suffix != '.blend' or output.suffix != '.glb' or output.exists():
        raise ValueError('Use the original Blender source and a new GLB output path')
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if source_hash not in SOURCE_HASHES:
        raise ValueError('Expected the verified grounded-walk original or archived Codex source')
    window = bpy.context.window
    if not window or bpy.context.mode != 'OBJECT':
        raise RuntimeError('Run with a Blender window in Object Mode')
    previous = window.scene
    existing = {key:set(getattr(bpy.data,key)) for key in DATA_COLLECTIONS}
    displaced = []
    try:
        for name in MATERIAL_NAMES.values():
            material = bpy.data.materials.get(name)
            if material:
                displaced.append((material,name))
                material.name = '__hellbreaker_saved_'+name
        with bpy.data.libraries.load(str(source),link=False) as (available,loaded):
            if len(available.scenes)!=1: raise ValueError('Expected one source scene')
            loaded.scenes = available.scenes
        scene = loaded.scenes[0]; window.scene = scene
        rigs = [obj for obj in scene.objects if obj.type=='ARMATURE']
        if len(rigs)!=1 or authored_name(rigs[0].name)!='GATECRASHER / Rig':
            raise ValueError('Expected the original pre-R2 Gatecrasher armature')
        rig = rigs[0]
        bound = [obj for obj in scene.objects if obj.type=='MESH' and obj.parent==rig]
        if len(bound)!=37 or any(len(obj.vertex_groups)!=1 for obj in bound):
            raise ValueError('Expected 37 rigid chassis assemblies')
        meshes = [(obj,obj.vertex_groups[0].name) for obj in bound]
        for obj in bound: obj.data.calc_loop_triangles()
        if sum(len(obj.data.loop_triangles) for obj in bound)!=89106:
            raise ValueError('Original source topology differs from the published Hellbreaker')
        rig.name = 'HELLBREAKER / Rig'
        rig.data.pose_position = 'REST'
        bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
        configure_bones(rig,source_hash)
        for obj,bone in meshes:
            configure_mesh(obj,bone);obj.select_set(True)
        bpy.context.view_layer.objects.active=rig
        result=bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', use_selection=True, use_active_scene=True,
            export_meshopt_compression_enable=True,export_animations=False,export_extras=True,export_yup=True,
            export_def_bones=False,export_rest_position_armature=True,export_cameras=False,export_lights=False,
            export_image_format='JPEG',export_jpeg_quality=75)
        if result!={'FINISHED'} or not output.is_file(): raise RuntimeError(f'Blender did not produce {output}')
    finally:
        window.scene=previous
        added=[block for key,prior in existing.items() for block in getattr(bpy.data,key) if block not in prior]
        bpy.data.batch_remove(ids=added)
        for material,name in displaced: material.name=name
