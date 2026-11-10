"""Build original left-hand shield meshes and matching transparent game sprites."""
import json
import site
import sys
import tempfile
from pathlib import Path

import bpy
import bmesh
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

sys.path.append(site.getusersitepackages())
from PIL import Image

DIST = Path(__file__).resolve().parents[4] / 'dist'
bpy.ops.wm.read_factory_settings(use_empty=True)


def point(xyz):
    x, y, z = xyz
    return Vector((x, -z, y))


def material(name, rgb, metallic, roughness=.45):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*rgb, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    return mat


frame = material('Graphite backing', (.055, .072, .075), .75)
olive = material('Stamped olive steel', (.26, .30, .17), .65)
ceramic = material('Warm ceramic', (.47, .435, .36), .28, .60)
steel = material('Machined steel', (.40, .45, .47), .85, .31)
rubber = material('Isolation pads', (.025, .03, .028), .1, .77)
ochre = material('Safety ochre', (.48, .23, .07), .45)
ivory = material('Inspection marking', (.67, .65, .56), .22)


def empty(name, pos=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.location = point(pos)
    return obj


def armor(root, name, outline, rear, front, mat, bevel):
    n = len(outline)
    data = bpy.data.meshes.new(name)
    data.from_pydata([point((x, y, z)) for z in (rear, front) for x, y in outline], [],
                     [tuple(reversed(range(n))), tuple(range(n, 2*n))] +
                     [(i, (i+1)%n, (i+1)%n+n, i+n) for i in range(n)])
    bm = bmesh.new()
    bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(data)
    bm.free()
    data.materials.append(mat)
    obj = bpy.data.objects.new(root.name + '.' + name, data)
    bpy.context.collection.objects.link(obj)
    obj.parent = root
    if bevel:
        edge = obj.modifiers.new('Machined edges', 'BEVEL')
        edge.width = bevel
        edge.segments = 2
        edge.harden_normals = True
    return obj


def block(root, name, xyz, size, mat, bevel=.012):
    x, y, z = xyz
    a, b, c = (d/2 for d in size)
    return armor(root, name, [(x-a,y-b),(x+a,y-b),(x+a,y+b),(x-a,y+b)], z-c, z+c, mat, bevel)


def octagon(x, y, w, h, cut):
    return [(x-w+cut,y-h),(x+w-cut,y-h),(x+w,y-h+cut),(x+w,y+h-cut),
            (x+w-cut,y+h),(x-w+cut,y+h),(x-w,y+h-cut),(x-w,y-h+cut)]


def bolt(root, x, y, z):
    armor(root, 'Recessed fastener', octagon(x,y,.045,.044,.019), z-.023,z+.006, steel, .005)


def grip(root, x, z):
    for y in (-.23,.23):
        block(root,'Grip lug',(0,y,z/2),(.28,.13,z),frame)
    block(root,'Insulated handgrip',(0,0,0),(.13,.49,.13),rubber)
    block(root,'Arm saddle',(x,.37,z/2),(.37,.22,z),frame)


buckler = empty('bulwark-shield')
cx = -.16
grip(buckler, cx, .34)
armor(buckler,'Stamped rim',octagon(cx,.23,.68,.86,.21),.29,.48,frame,.043)
armor(buckler,'Sloped striking plate',octagon(cx,.24,.61,.79,.19),.45,.61,olive,.047)
armor(buckler,'Rib and nose',[(cx-.24,-.46),(cx+.25,-.46),(cx+.34,.03),(cx+.29,.85),
                             (cx+.16,1.00),(cx-.19,.96),(cx-.32,.58)],.58,.70,olive,.041)
block(buckler,'Upper inspection tab',(cx-.20,.74,.712),(.17,.065,.024),ivory,.005)
for x in (cx-.49,cx+.49):
    for y in (-.37,.82):
        bolt(buckler,x,y,.612)
for y in (-.38,-.22,-.06):
    block(buckler,'Drain slot',(cx+.40,y,.62),(.14,.05,.025),frame,.009)

tower = empty('citadel-shield')
cx = -.22
grip(tower,cx,.40)
armor(tower,'Steel spine',octagon(cx,.14,.80,1.16,.21),.34,.56,frame,.061)
armor(tower,'Heel casing',octagon(cx,-.78,.70,.20,.13),.50,.68,steel,.029)
armor(tower,'Upper ceramic plate',octagon(cx,.66,.72,.57,.18),.52,.71,ceramic,.037)
armor(tower,'Lower ceramic plate',octagon(cx,-.28,.72,.35,.13),.54,.73,ceramic,.036)
armor(tower,'Replaceable impact bar',octagon(cx,.05,.67,.11,.08),.62,.85,steel,.022)
armor(tower,'Reinforced brow',octagon(cx,.95,.55,.18,.09),.69,.82,frame,.024)
for x in (cx-.59,cx+.59):
    for y in (-.50,.41,.94):
        bolt(tower,x,y,.727)
for n in range(3):
    x=cx-.24+n*.15
    armor(tower,'Identification chevron',[(x,.52),(x+.10,.52),(x+.17,.62),(x+.07,.62)],.71,.725,ochre,.004)

roots = (buckler,tower)
markers = {root.name: {
    'grip': empty(root.name+'.grip',parent=root),
    'axis': empty(root.name+'.axis',(0,1,0),root),
    'face': empty(root.name+'.face',(-.18,.25,.72 if root==buckler else .84),root)
} for root in roots}
bpy.ops.object.select_all(action='DESELECT')
for root in roots:
    root.select_set(True)
    for child in root.children_recursive:
        child.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(DIST/'rig-bench/shields.glb'),export_format='GLB',
                          use_selection=True,export_yup=True,export_apply=True)

scene = bpy.context.scene
scene.world = bpy.data.worlds.new('Armory studio')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.24,.32,.40,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .5


def aim(obj, target):
    obj.rotation_euler = (target-obj.location).to_track_quat('-Z','Y').to_euler()


for name, pos, power, size, color in [
    ('Key',(-3,6,5),950,4,(1,.92,.81)),
    ('Fill',(5,3,4),700,5,(.61,.76,1)),
    ('Rim',(-3,5,-4),1200,4,(.57,.75,1)),
]:
    lamp = bpy.data.lights.new(name,'AREA')
    lamp.energy, lamp.size, lamp.color = power, size, color
    obj = bpy.data.objects.new(name,lamp)
    scene.collection.objects.link(obj)
    obj.location = point(pos)
    aim(obj,point((0,.22,.3)))

camera = bpy.data.objects.new('Shield camera',bpy.data.cameras.new('Shield camera'))
scene.collection.objects.link(camera)
scene.camera = camera
camera.data.type, camera.data.ortho_scale = 'ORTHO', 3.3
scene.render.engine = 'CYCLES'
scene.cycles.samples, scene.cycles.use_denoising = 28, True
size = 440
scene.render.resolution_x = scene.render.resolution_y = size
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
visuals = {}
with tempfile.TemporaryDirectory() as tmp:
    scene.render.filepath = str(Path(tmp)/'shield.png')
    for side, pos in [('left',(3.2,1.55,7.2)),('right',(-3.2,1.55,7.2))]:
        camera.location = point(pos)
        aim(camera,point((-.15,.2,.42)))
        for root in roots:
            for other in roots:
                for child in other.children_recursive:
                    child.hide_render = other != root
            bpy.context.view_layer.update()
            bpy.ops.render.render(write_still=True)
            image = Image.open(scene.render.filepath).convert('RGBA')
            bounds = image.getbbox()
            assert bounds and min(bounds[:2])>2 and max(bounds[2:])<size-2
            key = 'armory-'+root.name+'-'+side
            image.crop(bounds).save(DIST/'assets'/(key+'.webp'),quality=94,method=4)
            slots = visuals.setdefault(root.name,{})
            slots[side] = {'key': key,'pixelsPerMetre':size/camera.data.ortho_scale}
            for role, marker in markers[root.name].items():
                p = world_to_camera_view(scene,camera,marker.matrix_world.translation)
                slots[side][role] = [round(p.x*size-bounds[0],2),round((1-p.y)*size-bounds[1],2)]

(DIST/'shield-visuals.js').write_text(
    '// Generated by tools/authoring/weapons/source/build_shields.py.\n'
    'window.IRON_VOW_SHIELD_ART='+json.dumps(visuals,separators=(',',':'))+';\n')
