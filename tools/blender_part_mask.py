"""Project Blender's evaluated armor meshes into unlit, lossless part IDs."""
import math
import re

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from PIL import Image


def part_for_joint(name):
    if re.match(r"^(neck|optic|cockpit|spine\.geometry\.emissive_visor)", name, re.I):
        return 2
    if re.match(r"^(hip|knee(?:guard)?|ankle|foot|toe|leg ram|ankle ram|boot)\b", name, re.I):
        return 5
    if re.match(r"^(cannon slide|rifle|kestrel|longbow)\b", name, re.I):
        return 3
    if re.match(r"^melee\b", name, re.I):
        return 4
    arm = re.match(
        r"^(?:shoulder(?: hardpoint| cannon| missile)?|pauldron|elbow|wrist|arm ram|hardpoint|"
        r"finger [1-4](?: tip)?|thumb|hand)\.([lr])\b", name, re.I,
    )
    if arm:
        return 3 if arm[1].upper() == "R" else 4
    if re.match(r"^(pelvis|spine|torso|pod|shutter|root)\b", name, re.I):
        return 1


def part_for_mesh(obj):
    while obj:
        if obj.hide_render:
            return None
        part = part_for_joint(obj.parent_bone) or part_for_joint(obj.name)
        if part:
            return part
        obj = obj.parent


def render_part_mask(scene, size, part_for_object=part_for_mesh):
    """Ray-cast the evaluated polygons with the same orthographic camera and pose."""
    deps = bpy.context.evaluated_depsgraph_get()
    camera = scene.camera
    inverse = camera.matrix_world.inverted()
    vertices, polygons, owners = [], [], []
    for original in scene.objects:
        if original.type not in {"MESH", "CURVE", "FONT", "SURFACE"} or original.hide_render:
            continue
        part = part_for_object(original)
        if not part:
            continue
        obj = original.evaluated_get(deps)
        mesh = obj.to_mesh()
        try:
            offset = len(vertices)
            world = inverse @ obj.matrix_world
            vertices.extend(world @ vertex.co for vertex in mesh.vertices)
            polygons.extend(tuple(offset + index for index in poly.vertices) for poly in mesh.polygons)
            owners.extend([part] * len(mesh.polygons))
        finally:
            obj.to_mesh_clear()
    if not polygons:
        raise ValueError("No visible part geometry")
    tree = BVHTree.FromPolygons(vertices, polygons)
    # These are square cells in the same camera used to bake the lit artwork.
    scene.render.resolution_x = scene.render.resolution_y = size
    frame = camera.data.view_frame(scene=scene)
    left, right = min(p.x for p in frame), max(p.x for p in frame)
    bottom, top = min(p.y for p in frame), max(p.y for p in frame)
    step = (right - left) / size
    if not math.isclose(step, (top - bottom) / size):
        raise ValueError("Part-mask cells must be square")
    x0 = max(0, math.floor((min(p.x for p in vertices) - left) / step))
    x1 = min(size, math.ceil((max(p.x for p in vertices) - left) / step))
    y0 = max(0, math.floor((top - max(p.y for p in vertices)) / step))
    y1 = min(size, math.ceil((top - min(p.y for p in vertices)) / step))
    ray = Vector((0, 0, -1))
    pos = Vector((0, 0, 0))
    centers = [left + (i + .5) * step for i in range(size)]
    labels = bytearray(size * size)
    for y in range(y0, y1):
        pos.y = top - (y + .5) * step
        row = y * size
        for x in range(x0, x1):
            pos.x = centers[x]
            _, _, polygon, _ = tree.ray_cast(pos, ray)
            if polygon is not None:
                labels[row + x] = owners[polygon]
    image = Image.frombytes("P", (size, size), bytes(labels))
    image.putpalette([255 if i & (1 << bit) else 0 for i in range(6) for bit in range(3)])
    image.info["transparency"] = 0
    return image.convert("RGBA")


def save_part_mask(mask, path):
    mask.save(path, lossless=True, method=4)
