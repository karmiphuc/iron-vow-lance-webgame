"""Build Iron Vow's two articulated prototype chassis in Blender 5.2.

blender -b --factory-startup --python-exit-code 1 -P build_prototypes.py -- OUTPUT_DIR
"""

from math import cos, pi, sin
from pathlib import Path
import struct
import sys
import zlib

import bpy
import numpy as np
from mathutils import Vector


PALETTES = {
    "gatecrasher": {
        "armor": ("424c53", .59, .43), "plate": ("89938d", .50, .39),
        "paint": ("8e2b1c", .43, .45), "mark": ("d0c4a5", .15, .52),
        "signal": ("ff9e4f", .19, .23), "optic": ("f43a24", .25, .25),
    },
    "cicada": {
        "armor": ("626943", .49, .44), "plate": ("929464", .42, .43),
        "paint": ("4c5533", .47, .47), "mark": ("d6ad56", .22, .50),
        "signal": ("ff9e31", .16, .31), "optic": ("6059f5", .38, .21),
    },
}

CORE = {
    "frame": ("272e34", .64, .48), "steel": ("687481", .84, .27),
    "rubber": ("171b20", .10, .65), "void": ("101620", .28, .47),
    "chrome": ("b8c5cb", .90, .22),
}


def surface_image(name, hex_color, directory):
    """Author repeatable chipped paint, machining marks, and dirt as an sRGB tile."""
    size = 512
    rng = np.random.default_rng(sum(ord(c) * (i + 11) for i, c in enumerate(name + hex_color)))
    yy, xx = np.mgrid[:size, :size]
    field = np.zeros((size, size), dtype=float)
    for count, amplitude in [(7, 8), (23, 3.8), (71, 2.1)]:
        cells = rng.normal(0, amplitude, (count, count))
        sx, sy = xx * count / size, yy * count / size
        ix, iy = sx.astype(int), sy.astype(int)
        dx, dy = sx - ix, sy - iy
        dx, dy = dx * dx * (3 - 2 * dx), dy * dy * (3 - 2 * dy)
        field += ((1 - dx) * ((1 - dy) * cells[iy, ix] + dy * cells[(iy + 1) % count, ix]) +
                  dx * ((1 - dy) * cells[iy, (ix + 1) % count] +
                        dy * cells[(iy + 1) % count, (ix + 1) % count]))
    base = np.array([int(hex_color[i:i + 2], 16) for i in (0, 2, 4)], dtype=float)
    rgb = base + (field + rng.normal(0, 2.4, (size, size)))[..., None]
    grain = np.array([1.0, .94, .8])
    if name in {"armor", "plate", "paint"}:
        for _ in range(47):
            x, y = rng.integers(0, size, 2)
            count = rng.integers(3, 10)
            for _ in range(count):
                u = (x + int(rng.normal(0, 21))) % size
                v = (y + int(rng.normal(0, 13))) % size
                length = int(rng.integers(3, 15))
                for i in range(length):
                    px, py = (u + i) % size, (v + i // 4) % size
                    rgb[py, px] -= grain * rng.uniform(12, 33)
                    rgb[(py + 1) % size, px] += grain * rng.uniform(12, 31)
    elif name in {"steel", "chrome"}:
        rgb += (1.7 * np.sin(yy * 2.8) + rng.normal(0, 2.1, (size, 1)))[..., None]
    rgb = np.clip(rgb, 0, 255).astype("uint8")

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))

    rows = b"".join(b"\0" + row.tobytes() for row in rgb)
    path = directory / f"{name}-{hex_color}.png"
    path.write_bytes(b"\x89PNG\r\n\x1a\n" +
                     chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)) +
                     chunk(b"IDAT", zlib.compress(rows, 6)) + chunk(b"IEND", b""))
    image = bpy.data.images.load(str(path))
    image.pack()
    return image


def material(name, hex_color, metal, roughness, directory):
    def linear(byte):
        srgb = int(byte, 16) / 255
        return ((srgb + .055) / 1.055) ** 2.4 if srgb > .04045 else srgb / 12.92

    color = tuple(linear(hex_color[index:index + 2]) for index in (0, 2, 4)) + (1,)
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    shader = mat.node_tree.nodes["Principled BSDF"]
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Roughness"].default_value = roughness
    if name in {"armor", "plate", "paint", "frame", "steel", "chrome"}:
        image_node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        image_node.image = surface_image(name, hex_color, directory)
        image_node.extension = "REPEAT"
        mat.node_tree.links.new(image_node.outputs["Color"], shader.inputs["Base Color"])
    if name in {"optic", "signal"}:
        shader.inputs["Emission Color"].default_value = color
        shader.inputs["Emission Strength"].default_value = 1.45 if name == "optic" else .85
    return mat


def ring_coords(width, depth, corner):
    w, d = width / 2, depth / 2
    c = min(w, d) * corner
    return [(-w + c, -d), (w - c, -d), (w, -d + c), (w, d - c),
            (w - c, d), (-w + c, d), (-w, d - c), (-w, -d + c)]


class Chassis:
    def __init__(self, key, directory):
        self.key = key
        self.heavy = key == "gatecrasher"
        self.code = "HV-09" if self.heavy else "ML-14"
        textures = directory / "_generated_textures"
        textures.mkdir(exist_ok=True)
        self.materials = {name: material(name, *values, textures)
                          for name, values in (CORE | PALETTES[key]).items()}
        self.bones = {}
        self.parts = {}
        self.rig = None
        self.leg_x = .93 if self.heavy else .86
        self.hip_z = 2.90 if self.heavy else 2.41
        self.knee_z = 1.57 if self.heavy else 1.33
        self.shoulder_x = 1.89 if self.heavy else 1.63
        self.shoulder_z = 4.60 if self.heavy else 3.59
        self.shoulder_y = -.06 if self.heavy else .13
        self.elbow_x = self.shoulder_x + (.32 if self.heavy else .59)
        self.elbow_z = self.shoulder_z - (.95 if self.heavy else .78)
        self.wrist_z = self.elbow_z - (.56 if self.heavy else .52)
        self.launch_x = 1.48
        self.launch_z = 4.39
        self.pistons = []
        self.actions = []

    def bone(self, name, head, tail, parent=None, group="Mechanism", connected=False):
        self.bones[name] = (Vector(head), Vector(tail), parent, group, connected)

    def finish(self, obj, name, joint, surface, bevel=0):
        obj.name = name
        obj.data.materials.append(self.materials[surface])
        if bevel:
            mod = obj.modifiers.new("Machined edges", "BEVEL")
            mod.width, mod.segments, mod.limit_method = bevel, 4 if bevel >= .026 else 3, "ANGLE"
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.modifier_apply(modifier=mod.name)
            mod = obj.modifiers.new("Face normals", "WEIGHTED_NORMAL")
            mod.keep_sharp = True
            bpy.ops.object.modifier_apply(modifier=mod.name)
        self.parts.setdefault(joint, []).append(obj)
        return obj

    def mesh(self, name, joint, vertices, faces, surface, bevel=0):
        data = bpy.data.meshes.new(name)
        data.from_pydata(vertices, [], faces)
        data.update()
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        return self.finish(obj, name, joint, surface, bevel)

    def loft(self, name, joint, sections, surface="armor", bevel=.035, corner=.36):
        vertices = [(x + u, y + v, z) for z, x, y, w, d in sections
                    for u, v in ring_coords(w, d, corner)]
        last = len(vertices) - 8
        faces = [tuple(reversed(range(8))), tuple(range(last, last + 8))]
        for start in range(0, last, 8):
            for i in range(8):
                j = (i + 1) % 8
                faces.append((start + i, start + j, start + j + 8, start + i + 8))
        return self.mesh(name, joint, vertices, faces, surface, bevel)

    def box(self, name, joint, pos, dims, surface="armor", bevel=.022, tilt=0):
        x, y, z = pos
        w, d, h = dims
        obj = self.loft(name, joint, [(-h / 2, 0, 0, w, d), (h / 2, 0, 0, w, d)],
                        surface, bevel, .23)
        obj.location = (x, y, z)
        obj.rotation_euler.y = tilt
        return obj

    def panel(self, name, joint, points, y, depth, surface="plate", bevel=.013):
        # Counter-clockwise in X/Z gives a front normal along -Y.
        n = len(points)
        signed_area = sum(points[i][0] * points[(i + 1) % n][1] -
                          points[(i + 1) % n][0] * points[i][1] for i in range(n))
        if signed_area < 0:
            points = list(reversed(points))
        vertices = [(x, layer, z) for layer in (y, y + depth) for x, z in points]
        faces = [tuple(range(n)), tuple(reversed(range(n, 2 * n)))]
        faces.extend((i, i + n, (i + 1) % n + n, (i + 1) % n) for i in range(n))
        return self.mesh(name, joint, vertices, faces, surface, bevel)

    def side_panel(self, name, joint, sign, x, points, depth, surface="plate", bevel=.013):
        obj = self.panel(name, joint, [(sign * y, z) for y, z in points], 0, depth, surface, bevel)
        obj.rotation_euler.z = sign * pi / 2
        obj.location.x = x
        return obj

    def side_bolt(self, joint, sign, x, y, z, radius=.032):
        self.tube("Recess collar", joint, (x - sign * .022, y, z), (x + sign * .004, y, z),
                  radius * 1.27, "void", sides=14)
        self.tube("Service fastener", joint, (x, y, z), (x + sign * .023, y, z), radius, "steel", sides=6)

    def tube(self, name, joint, a, b, radius, surface="steel", tip=None, sides=24):
        start, end = Vector(a), Vector(b)
        axis = end - start
        bpy.ops.mesh.primitive_cone_add(
            vertices=sides, radius1=radius, radius2=radius if tip is None else tip,
            depth=axis.length, location=(start + end) / 2,
            rotation=axis.to_track_quat("Z", "Y").to_euler())
        return self.finish(bpy.context.object, name, joint, surface)

    def bore(self, name, joint, x, y, z, outer, inner, depth, surface="steel", sides=28):
        vertices = [(x + r * cos(2 * pi * i / sides), yy, z + r * sin(2 * pi * i / sides))
                    for r, yy in [(outer, y), (inner, y), (inner, y + depth), (outer, y + depth)]
                    for i in range(sides)]
        faces = []
        for ring in range(4):
            nxt = (ring + 1) % 4
            for i in range(sides):
                j = (i + 1) % sides
                faces.append((ring * sides + i, ring * sides + j, nxt * sides + j, nxt * sides + i))
        return self.mesh(name, joint, vertices, faces, surface, .005)

    def bolt(self, joint, x, y, z, r=.048):
        self.tube("Washer", joint, (x, y + .015, z), (x, y - .006, z), 1.23 * r, "void", sides=16)
        self.tube("Captive fastener", joint, (x, y + .010, z), (x, y - .025, z), r, "steel", sides=6)

    def line(self, name, joint, points, radius, surface="rubber"):
        curve = bpy.data.curves.new(name, "CURVE")
        curve.dimensions = "3D"
        curve.resolution_u = 8
        curve.bevel_depth, curve.bevel_resolution = radius, 2
        spline = curve.splines.new("BEZIER")
        spline.bezier_points.add(len(points) - 1)
        for point, coordinates in zip(spline.bezier_points, points):
            point.co = coordinates
            point.handle_left_type = point.handle_right_type = "AUTO"
        obj = bpy.data.objects.new(name, curve)
        bpy.context.collection.objects.link(obj)
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target="MESH")
        return self.finish(bpy.context.object, name, joint, surface)

    def vent(self, joint, x, y, z, width, count):
        self.box("Vent recess", joint, (x, y, z), (width, .075, .103 * count + .07), "void")
        for i in range(count):
            row = z + .103 * (i - (count - 1) / 2)
            self.box("Armored louver", joint, (x, y - .05, row), (width - .08, .10, .043), "steel", .009)

    def warning_marks(self, joint, x, y, z, count):
        for i in range(count):
            px = x + .086 * i
            self.panel("Hazard chevron", joint, [(px, z), (px + .048, z),
                       (px + .115, z + .082), (px + .067, z + .082)], y, .009, "mark", 0)

    def stencil(self, joint, text, x, y, z, size):
        data = bpy.data.curves.new(text, "FONT")
        data.body, data.size, data.align_x = text, size, "CENTER"
        obj = bpy.data.objects.new(text, data)
        bpy.context.collection.objects.link(obj)
        obj.location, obj.rotation_euler.x = (x, y, z), pi / 2
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target="MESH")
        self.finish(bpy.context.object, text, joint, "mark")

    def leg_rest(self, sign):
        hip = Vector((sign * self.leg_x, 0, self.hip_z))
        knee = Vector((sign * (self.leg_x if self.heavy else 1.08), -.41 if self.heavy else -.56, self.knee_z))
        ankle = Vector((sign * (self.leg_x if self.heavy else 1.39), .14 if self.heavy else .27, .43))
        toe = ankle + Vector((0 if self.heavy else sign * .15, -.82 if self.heavy else -.89, -.14))
        return hip, knee, ankle, toe

    def setup_bones(self):
        h, k = self.hip_z, self.knee_z
        self.bone("ROOT", (0, 0, 0), (0, 0, .5), group="Controls")
        self.bone("Pelvis", (0, 0, h), (0, 0, h + .48), "ROOT", "Controls")
        self.bone("Torso", (0, 0, h + .34), (0, 0, h + 1.3), "Pelvis", "Controls")
        self.bone("Optics", (0, -.48, self.shoulder_z + .15),
                  (0, -.96, self.shoulder_z + .15), "Torso", "Controls")
        for side, sign in (("L", 1), ("R", -1)):
            suffix = "." + side
            hip, knee, ankle, toe = self.leg_rest(sign)
            axis = ankle - hip
            pole_direction = (knee - hip - axis * (knee - hip).dot(axis) / axis.length_squared).normalized()
            pole = knee + pole_direction * 2
            self.bone("Hip" + suffix, hip, knee, "Pelvis")
            self.bone("Knee" + suffix, knee, ankle, "Hip" + suffix, connected=True)
            self.bone("Foot" + suffix, ankle, toe, "Knee" + suffix, connected=True)
            self.bone("Toe" + suffix, toe, toe + (toe - ankle).normalized() * .39,
                      "Foot" + suffix, "Controls", True)
            self.bone("Foot IK" + suffix, ankle, toe, "ROOT", "Controls")
            self.bone("Knee Pole" + suffix, pole, pole + Vector((0, 0, .30)), "ROOT", "Controls")
            s = sign * self.shoulder_x
            ex = sign * self.elbow_x
            sh = (s, self.shoulder_y, self.shoulder_z)
            el = (ex, -.08, self.elbow_z)
            wr = (ex, -.62, self.wrist_z)
            self.bone("Shoulder" + suffix, sh, el, "Torso", "Controls")
            self.bone("Elbow" + suffix, el, wr, "Shoulder" + suffix, "Controls", True)
            self.bone("Wrist" + suffix, wr, (ex, -1.15, self.wrist_z), "Elbow" + suffix, "Controls", True)
            self.bone("Pauldron" + suffix, sh, (s, self.shoulder_y, self.shoulder_z + .52), "Torso", "Controls")
            self.bone("Hardpoint" + suffix, (ex, -1.59, self.wrist_z),
                      (ex, -1.88, self.wrist_z), "Wrist" + suffix, "Sockets")
            if self.heavy and side == "R":
                self.bone("Cannon Slide", wr, (ex, -1.15, self.wrist_z), "Wrist.R", "Controls")
                self.bone("Muzzle", (ex, -2.255, self.wrist_z), (ex, -2.53, self.wrist_z),
                          "Cannon Slide", "Sockets")
            if self.heavy and side == "L":
                for i in range(4):
                    fx = ex + .16 * (i - 1.5)
                    self.bone(f"Finger {i + 1}.L", (fx, -1.04, self.wrist_z),
                              (fx, -1.23, self.wrist_z), "Wrist.L", "Controls")
                    self.bone(f"Finger {i + 1} tip.L", (fx, -1.23, self.wrist_z),
                              (fx, -1.42, self.wrist_z), f"Finger {i + 1}.L", "Controls", True)
                self.bone("Thumb.L", (ex - .29, -.90, self.wrist_z - .14),
                          (ex - .35, -1.16, self.wrist_z - .14), "Wrist.L", "Controls")
            if not self.heavy:
                px = sign * self.launch_x
                pivot = (px, .22, self.launch_z)
                self.bone("Pod" + suffix, pivot, (px, -.65, self.launch_z), "Torso", "Controls")
                hinge = (px, -.884, self.launch_z + .60)
                self.bone("Shutter" + suffix, hinge, (px, -.884, self.launch_z + .34),
                          "Pod" + suffix, "Controls")
                self.bone("Launch" + suffix, (px, -.85, self.launch_z),
                          (px, -1.14, self.launch_z), "Pod" + suffix, "Sockets")
            self.piston("Leg ram" + suffix, "Hip" + suffix, "Knee" + suffix,
                        hip.lerp(knee, .28) + Vector((sign * .40, .28, 0)),
                        knee.lerp(ankle, .47) + Vector((sign * .39, .17, 0)), .095)
            self.piston("Arm ram" + suffix, "Shoulder" + suffix, "Elbow" + suffix,
                        (s, .27, self.shoulder_z - .27), (ex, .24, self.elbow_z - .34), .067)

    def piston(self, name, a_parent, b_parent, a, b, radius):
        for label, start, end, parent in (("Housing", a, b, a_parent), ("Rod", b, a, b_parent)):
            self.bone(name + " " + label, start, end, parent)
        self.pistons.append((name, Vector(a), Vector(b), radius))

    def armor_body(self):
        h = self.hip_z
        self.loft("Pelvis casting", "Pelvis", [(h - .39, 0, 0, 1.47, .82),
                  (h - .14, 0, 0, 2.26, 1.26), (h + .27, 0, .07, 2.11, 1.10)], "frame")
        self.box("Armored codpiece", "Pelvis", (0, -.57, h - .02), (.85, .41, .61), "armor", .065)
        self.box("Belt plate", "Pelvis", (0, -.80, h + .04), (.53, .075, .24), "paint")
        self.tube("Turret slew ring", "Torso", (0, .02, h + .22), (0, .02, h + .57), .76, "steel", sides=20)
        for sign in (-1, 1):
            self.box("Hip skirt", "Pelvis", (sign * 1.02, -.35, h - .09),
                     (.65, .77, .54), "armor", .066, sign * -.19)
        if self.heavy:
            self.loft("Tapered torso citadel", "Torso", [(3.23, 0, .10, 1.21, .89),
                      (3.56, 0, .02, 1.63, 1.30), (3.85, 0, .06, 2.46, 1.42),
                      (4.67, 0, .10, 2.55, 1.52), (4.99, 0, .17, 2.19, 1.35),
                      (5.27, 0, .20, 1.59, .99)], "frame", .045)
            self.loft("Segmented chest prow", "Torso", [(3.47, 0, -.48, .82, .52),
                      (3.81, 0, -.58, 1.21, .77), (4.10, 0, -.58, 1.32, .77),
                      (4.38, 0, -.51, 1.18, .65)], "armor", .035)
            for sign in (-1, 1):
                self.panel("Sloped chest cheek", "Torso",
                           [(sign * x, z) for x, z in [(.51, 3.76), (.85, 3.89), (1.30, 4.18),
                                                       (1.37, 4.67), (1.13, 4.94), (.63, 4.68)]],
                           -.86, .28, "armor", .045)
                self.panel("Replaceable glacis insert", "Torso", [(sign * x, z) for x, z in
                           [(.62, 3.99), (.97, 4.15), (1.23, 4.43), (1.21, 4.62), (.91, 4.54)]],
                           -.91, .085, "plate", .018)
                self.vent("Torso", sign * .87, -.97, 4.17, .31, 4)
                for x, z in [(.59, 3.88), (.99, 4.02), (1.18, 4.56)]:
                    self.bolt("Torso", sign * x, -.93, z, .037)
                self.box("Lower floodlight housing", "Torso", (sign * .61, -.91, 3.76),
                         (.30, .20, .16), "rubber", .026)
                for i in range(3):
                    self.box("Lower floodlight cell", "Torso", (sign * .61 + .079 * (i - 1), -1.02, 3.76),
                             (.066, .047, .077), "signal", .012)
                self.loft("Exhaust backpack", "Torso", [(3.95, sign * .85, .81, .52, .65),
                          (5.12, sign * .85, .94, .65, .72), (5.23, sign * .85, .94, .51, .59)], "frame")
                self.tube("Antenna base", "Torso", (sign * .78, .28, 5.19), (sign * .78, .28, 5.41), .096)
                self.tube("Comms whip", "Torso", (sign * .78, .28, 5.40),
                          (sign * .91, .50, 5.80 + .16 * (sign > 0)), .026, "frame", tip=.012)
                for row in range(6):
                    self.box("Rear radiator grille", "Torso", (sign * .85, 1.28, 4.18 + .13 * row),
                             (.52, .10, .050), "steel", .012)
                self.tube("Rear exhaust", "Torso", (sign * .85, .99, 5.19),
                          (sign * .85, .99, 5.33), .215, "rubber", sides=12)
                self.tube("Exhaust lip", "Torso", (sign * .85, .99, 5.31),
                          (sign * .85, .99, 5.37), .193, "steel", sides=12)
                for i in range(3):
                    self.line("Exposed cooling conduit", "Torso",
                              [(sign * (1.11 + .09 * i), .43, 4.69),
                               (sign * (1.22 + .09 * i), .48, 4.34),
                               (sign * (1.13 + .07 * i), .62, 4.12)], .028, "rubber")
                self.side_panel("Dorsal service plate", "Torso", sign, sign * 1.265,
                                [(.10, 4.14), (.66, 4.23), (.65, 4.64), (.37, 4.83),
                                 (.09, 4.70)], .12, "armor", .019)
                for y, z in [(.21, 4.30), (.52, 4.37), (.39, 4.69)]:
                    self.side_bolt("Torso", sign, sign * 1.282, y, z, .036)
            self.loft("Buried crew capsule", "Optics", [(4.30, 0, -.68, .61, .57),
                      (4.55, 0, -.67, .91, .72), (4.93, 0, -.62, .99, .82),
                      (5.23, 0, -.40, .69, .74)], "void", .036)
            self.panel("Brow ceramic insert", "Optics", [(-.37, 4.86), (.37, 4.86), (.43, 5.04),
                       (.24, 5.18), (-.24, 5.18), (-.43, 5.04)], -1.03, .22, "armor", .020)
            self.panel("Crimson cockpit seal", "Optics", [(-.46, 4.66), (-.37, 4.44), (-.21, 4.34),
                       (.21, 4.34), (.37, 4.44), (.46, 4.66), (.34, 4.72), (-.34, 4.72)], -1.05, .078, "paint")
            self.panel("Inset black visor", "Optics", [(-.37, 4.65), (-.25, 4.49), (.25, 4.49),
                       (.37, 4.65), (.29, 4.72), (-.29, 4.72)], -1.078, .042, "void", .018)
            for offset in (-.17, 0, .17):
                self.box("Optic channel", "Optics", (offset, -1.103, 4.62), (.134, .031, .028), "optic", .006)
            for sign in (-1, 1):
                self.panel("Replaceable cockpit jaw", "Optics", [(sign * x, z) for x, z in
                           [(.30, 4.42), (.51, 4.52), (.54, 4.82), (.42, 4.97), (.34, 4.80)]],
                           -1.085, .18, "plate", .022)
                self.bolt("Optics", sign * .43, -1.10, 4.71, .033)
            # An asymmetric auxiliary weapon silhouette above the chest vents.
            self.box("Auxiliary cannon trunnion", "Torso", (-.99, -.67, 4.83), (.62, .75, .48), "frame", .038)
            self.tube("Auxiliary barrel jacket", "Torso", (-.99, -.76, 4.83), (-.99, -1.58, 4.83), .161, "frame")
            self.bore("Auxiliary cannon crown", "Torso", -.99, -1.70, 4.83, .176, .110, .20)
            for i in range(5):
                depth = -1.03 - .105 * i
                self.tube("Cooling collar", "Torso", (-.99, depth, 4.83), (-.99, depth - .045, 4.83), .179, "steel")
            self.box("Countermeasure cassette", "Torso", (.99, -.85, 4.86), (.60, .50, .45), "paint", .032)
            for col in range(3):
                for row in range(2):
                    self.bore("Countermeasure cell", "Torso", .99 + .156 * (col - 1), -1.123,
                              4.79 + .15 * row, .070, .045, .08, "frame", 18)
            self.stencil("Torso", self.code, 0, -.985, 3.90, .163)
        else:
            self.loft("Facet ring cockpit", "Torso", [(2.64, 0, .10, 1.25, 1.10),
                      (2.88, 0, .06, 2.12, 1.53), (3.15, 0, -.02, 2.61, 1.90),
                      (3.53, 0, -.01, 2.87, 2.09), (3.84, 0, .07, 2.70, 1.99),
                      (4.10, 0, .13, 2.21, 1.68), (4.26, 0, .19, 1.54, 1.25)],
                      "armor", .048, .88)
            ring = [(-.93, 3.58), (-.75, 3.22), (-.45, 3.03), (.45, 3.03), (.75, 3.22),
                    (.93, 3.58), (.74, 3.83), (.43, 3.98), (-.43, 3.98), (-.74, 3.83)]
            self.panel("Octagonal sensor collar", "Optics", ring, -1.093, .23, "plate", .037)
            self.panel("Pressure glass gasket", "Optics", [(x * .90, 3.52 + .88 * (z - 3.52))
                       for x, z in ring], -1.14, .10, "void", .025)
            panes = [
                [(-.27, 3.62), (-.48, 3.87), (.48, 3.87), (.27, 3.62)],
                [(-.77, 3.64), (-.47, 3.55), (-.33, 3.29), (-.60, 3.36)],
                [(.77, 3.64), (.47, 3.55), (.33, 3.29), (.60, 3.36)],
                [(-.28, 3.27), (0, 3.53), (.28, 3.27), (.17, 3.15), (-.17, 3.15)],
            ]
            for pane in panes:
                self.panel("Violet sensor tile", "Optics", pane, -1.171, .048, "optic", .018)
            for i in range(5):
                self.box("Upper optic sensor gate", "Optics", (.105 * (i - 2), -1.184, 3.73),
                         (.039, .02, .022), "chrome", .004)
            for sign in (-1, 1):
                self.panel("Canted cockpit edge guard", "Torso", [(sign * x, z) for x, z in
                           [(.79, 3.07), (1.24, 3.28), (1.36, 3.66), (1.12, 3.94), (.90, 3.72)]],
                           -.815, .18, "paint", .029)
                self.vent("Torso", sign * .98, -.926, 3.38, .27, 4)
                self.box("Warning cheek", "Torso", (sign * .73, -1.03, 3.93), (.21, .12, .055),
                         "signal", tilt=sign * .37)
                self.box("Backpack exchanger", "Torso", (sign * .58, .90, 3.44), (.78, .65, .88), "frame", .057)
                for row in range(6):
                    self.box("Exchanger fin", "Torso", (sign * .58, 1.25, 3.12 + .12 * row),
                             (.66, .105, .049), "steel", .011)
                for x, z in [(1.08, 3.62), (.84, 3.30), (.51, 3.98)]:
                    self.bolt("Torso", sign * x, -.95 if z < 3.7 else -.79, z, .035)
                self.tube("Folding radio mast", "Torso", (sign * .63, .32, 4.13),
                          (sign * .75, .48, 4.57), .024, "frame", tip=.011)
                self.tube("Side gimbal support", "Torso", (sign * 1.19, .31, 3.56),
                          (sign * 1.56, .31, 3.56), .239, "frame", sides=28)
                self.tube("Gimbal bearing cap", "Torso", (sign * 1.48, .31, 3.56),
                          (sign * 1.55, .31, 3.56), .195, "steel")
            self.stencil("Torso", self.code, 0, -.822, 4.045, .148)

    def armor_leg(self, side, sign):
        hip_pos, knee_pos, ankle, toe_pos = self.leg_rest(sign)
        x, y = knee_pos.x, knee_pos.y
        ax, ay = ankle.x, ankle.y
        tx = toe_pos.x
        h, k = self.hip_z, self.knee_z
        hip, knee, foot, toe = (part + "." + side for part in ("Hip", "Knee", "Foot", "Toe"))
        w = 1.04 if self.heavy else .73
        thigh_mid = hip_pos.lerp(knee_pos, .51)
        self.loft("Thigh transmission", hip, [(k + .13, x, y + .12, .63 * w, .58),
                  (h - .47, thigh_mid.x, thigh_mid.y, .92 * w, .82),
                  (h - .12, hip_pos.x, 0, .82 * w, .69)], "frame")
        self.loft("Split thigh cheek armor", hip, [(k + .25, x, y - .19, .59 * w, .40),
                  (h - .58, thigh_mid.x, thigh_mid.y - .29, .99 * w, .46),
                  (h - .24, hip_pos.x, -.38, .96 * w, .45)], "armor", .041)
        if self.heavy:
            self.panel("Bolted thigh plate", hip, [(x - .39, h - .70), (x + .30, h - .72),
                       (x + .39, h - .46), (x + .32, h - .29), (x - .27, h - .33), (x - .40, h - .46)],
                       -.735, .15, "plate", .022)
            self.bolt(hip, x - .26, -.747, h - .42, .041)
            self.bolt(hip, x + .25, -.747, h - .59, .041)
        for offset in (.18, .28):
            self.line("Upper leg hydraulic hose", hip,
                      [(hip_pos.x + sign * offset, .27, h - .13),
                       (thigh_mid.x + sign * (offset + .17), .18, thigh_mid.z),
                       (x + sign * offset, y + .30, k + .09)], .036, "rubber")
        self.tube("Knee hinge", knee, (x - .37, y, k), (x + .37, y, k), .28 * w, "steel", sides=32)
        self.tube("Knee bearing ring", knee, (x + sign * .29, y, k),
                  (x + sign * .47, y, k), .231 * w, "frame", sides=28)
        self.tube("Knee pin cap", knee, (x + sign * .45, y, k),
                  (x + sign * .52, y, k), .150 * w, "steel", sides=14)
        mid = knee_pos.lerp(ankle, .49)
        self.loft("Shin casting", knee, [(.45, ax, ay, .56 * w, .56), (.78, mid.x, mid.y + .14, .75 * w, .80),
                  (k - .21, x, y + .12, .85 * w, .81), (k + .04, x, y, .67 * w, .61)], "frame")
        self.loft("Shin armor", knee, [(.54, ax, ay - .40, .55 * w, .35), (.79, mid.x, mid.y - .36, .79 * w, .40),
                  (k - .04, x, y - .26, .87 * w, .35), (k + .17, x, y - .15, .66 * w, .30)], "armor", .046)
        self.panel("Inset livery panel", knee, [(x - .29 * w, k - .17), (x + .29 * w, k - .17),
                   (x + .21 * w, k + .085), (x - .21 * w, k + .085)], y - .472, .115, "paint")
        for i in (-1, 1):
            self.bolt(knee, x + i * .18 * w, y - .485, k - .064, .029)
        self.box("Knee status strip", knee, (x, y - .517, k - .14), (.19, .048, .053), "signal", .010)
        if self.heavy:
            self.panel("Lower shin slab", knee, [(x - .29, .62), (x + .26, .62), (x + .31, .87),
                       (x + .19, 1.09), (x - .21, 1.05), (x - .34, .87)], -.57, .15, "plate", .023)
            self.warning_marks(knee, x - .16, -.582, .76, 3)
            self.side_panel("Lateral shin splint", knee, sign, x + sign * .436,
                            [(-.53, .71), (.23, .67), (.31, .87), (.09, 1.17),
                             (-.36, 1.24), (-.53, 1.11)], .17, "armor", .019)
            for yy, zz in [(-.37, .82), (.18, .79), (-.20, 1.10)]:
                self.side_bolt(knee, sign, x + sign * .44, yy, zz)
        else:
            for i in range(5):
                self.box("Shin service indicator", knee, (mid.x + sign * (.22 + .026 * i),
                         mid.y - .48 + .04 * i, k - .34 - .087 * i), (.080, .045, .047), "signal", .008)
            for i in range(2):
                self.line("Exposed shin conduit", knee,
                          [(x + sign * (.22 + .06 * i), y + .28, k - .13),
                           (mid.x + sign * (.25 + .06 * i), mid.y + .28, mid.z),
                           (ax + sign * (.20 + .06 * i), ay + .21, .55)], .030, "rubber")
        self.tube("Ankle pivot", foot, (ax - .32 * w, ay, .43), (ax + .32 * w, ay, .43),
                  .18, "chrome", sides=28)
        self.loft("Armored foot", foot, [(.035, ax, ay - .30, .98 * w, 1.21),
                  (.21, ax, ay - .27, 1.00 * w, 1.14), (.41, ax, ay - .09, .71 * w, .72)], "frame", .042)
        if self.heavy:
            self.loft("Toe armor", toe, [(.045, tx, -.89, 1.09, .60),
                      (.23, tx, -.90, 1.03, .64), (.34, tx, -.75, .86, .36)], "armor", .039)
            for offset in (-.32, 0, .32):
                self.box("Toe tread", toe, (tx + offset, -.94, .095), (.16, .54, .13), "rubber", .016)
            self.box("Toe stripe", toe, (tx, -1.21, .20), (.39, .04, .076), "mark", .008)
            for lane in range(5):
                self.box("Outer tread block", foot, (ax + sign * .48, -.57 + .20 * lane, .095),
                         (.145, .126, .12), "rubber", .017)
        else:
            for offset in (-.24, .24):
                fork_x = tx + offset * 1.13
                self.loft("Splayed toe pad", toe, [(.035, fork_x + sign * .10, -.98, .42, .79),
                          (.16, fork_x + sign * .10, -.96, .41, .75), (.28, fork_x, -.76, .32, .44)],
                          "armor", .031)
                self.box("Foot traction pad", toe, (fork_x + sign * .10, -1.24, .081),
                         (.26, .29, .092), "rubber", .016)
                self.box("Toe tracer", toe, (fork_x + sign * .10, -1.356, .15), (.18, .046, .045), "mark", .009)

    def armor_arm(self, side, sign):
        x, e = sign * self.shoulder_x, sign * self.elbow_x
        s, a, w = self.shoulder_z, self.elbow_z, self.wrist_z
        sh, el, wr, pa = (part + "." + side for part in ("Shoulder", "Elbow", "Wrist", "Pauldron"))
        self.tube("Shoulder gimbal", sh, (x - .39, self.shoulder_y, s),
                  (x + .39, self.shoulder_y, s), .31, "steel", sides=16)
        self.loft("Upper actuator", sh, [(a + .04, e, -.05, .56, .54),
                  (s - .29, x, self.shoulder_y, .84, .74), (s + .12, x, self.shoulder_y, .76, .72)], "frame")
        self.tube("Elbow hinge", el, (e - .30, -.08, a), (e + .30, -.08, a), .23, "steel", sides=16)
        if self.heavy:
            self.loft("Shoulder impact cage", pa, [(s - .48, x + sign * .20, .08, .72, .89),
                      (s - .12, x + sign * .15, .075, 1.09, 1.27),
                      (s + .31, x + sign * .10, .09, 1.41, 1.42),
                      (s + .66, x + sign * .09, .16, 1.16, 1.30),
                      (s + .99, x + sign * .32, .23, .69, 1.00)], "frame", .039, .49)
            self.panel("Outer ceramic shoulder vane", pa, [(x + sign * dx, s + dz) for dx, dz in
                       [(-.33, -.19), (.18, -.34), (.67, -.15), (.79, .30),
                        (.60, .58), (.09, .54), (-.36, .24)]], -.60, .27, "plate", .037)
            self.panel("Crimson upper deflector", pa, [(x + sign * dx, s + dz) for dx, dz in
                       [(-.31, .33), (.09, .29), (.63, .43), (.68, .82),
                        (.39, .99), (.08, .69), (-.33, .55)]], -.673, .30, "paint", .037)
            self.panel("Exposed lower deflector", pa, [(x + sign * dx, s + dz) for dx, dz in
                       [(-.18, -.27), (.19, -.37), (.54, -.20), (.56, .07), (.24, .18), (-.07, .03)]],
                       -.659, .13, "armor", .025)
            for dx, dz in [(-.19, .42), (.54, .55), (.16, -.23), (.45, -.13)]:
                self.bolt(pa, x + sign * dx, -.688, s + dz, .041)
            self.warning_marks(pa, x - .14, -.699, s + .45, 3)
            for i in range(4):
                self.box("Pauldron rear rib", pa, (x + sign * .26, .67, s + .05 + .16 * i),
                         (.62, .19, .071), "steel", .011)
            self.side_panel("Layered side deflector", pa, sign, x + sign * .801,
                            [(-.35, s - .13), (.46, s - .07), (.65, s + .19),
                             (.56, s + .47), (-.03, s + .54), (-.33, s + .34)], .18, "armor", .023)
            self.side_panel("Pauldron identification band", pa, sign, x + sign * .813,
                            [(-.29, s + .29), (.49, s + .31), (.43, s + .39), (-.24, s + .41)],
                            .033, "paint", .009)
            for yy, zz in [(-.19, s + .10), (.46, s + .13), (.12, s + .39)]:
                self.side_bolt(pa, sign, x + sign * .816, yy, zz, .039)
            self.tube("Pauldron sensor spike", pa, (x + sign * .45, .25, s + .85),
                      (x + sign * .53, .40, s + 1.16), .036, "steel", tip=.019)
        else:
            self.loft("Wing yoke", pa, [(s - .43, x + sign * .40, .17, .62, .58),
                      (s - .10, x + sign * .27, .12, .91, .64), (s + .14, x, .13, 1.09, .67),
                      (s + .35, x - sign * .28, .15, .84, .66)], "armor", .041)
            self.panel("Stamped wing fairing", pa, [(x + sign * dx, s + dz) for dx, dz in
                       [(-.53, .26), (.09, .19), (.66, -.11), (.71, -.27), (.35, -.30), (-.30, .04)]],
                       -.285, .115, "plate", .022)
            for i in range(3):
                self.bolt(pa, x + sign * (.20 * i - .17), -.302, s + .09 - .07 * i, .038)
        bracer = 1 if self.heavy else .82
        self.loft("Forearm bracer", el, [(w - .21, e, -.52, .63 * bracer, .82),
                  (w + .15, e, -.32, .94 * bracer, 1.07),
                  (a - .12, e, -.05, .71 * bracer, .63)], "armor", .043)
        self.panel("Forearm strike plate", el, [(e + dx * bracer, w + dz) for dx, dz in
                   [(-.36, -.04), (.33, -.04), (.37, .20), (.20, .37), (-.22, .33), (-.38, .13)]],
                   -.891, .21, "plate", .019)
        for offset in (-.22, .22):
            self.bolt(el, e + offset * bracer, -.911, w + .14, .040)
        for k in range(2):
            self.line("Protected elbow cable", el,
                      [(e + sign * (.25 + .06 * k), .13, a - .11),
                       (e + sign * (.34 + .06 * k), -.22, a - .29),
                       (e + sign * (.27 + .06 * k), -.58, w + .04)], .025)
        self.side_panel("Forearm service plate", el, sign, e + sign * .415 * bracer,
                        [(-.69, w - .07), (-.12, w - .01), (.02, w + .21),
                         (-.19, w + .38), (-.58, w + .27)], .118, "frame", .023)
        for i in range(3):
            self.box("Forearm cooling louvers", el, (e + sign * .426 * bracer, -.41, w + .03 + .085 * i),
                     (.075, .36 - .039 * i, .035), "steel", .007)
        if self.heavy and side == "R":
            self.box("Cannon receiver", wr, (e, -.91, w), (.88, .78, .70), "frame", .058)
            self.box("Recoil carriage", "Cannon Slide", (e, -1.34, w), (.71, .72, .57), "plate", .048)
            for offset in (-.19, .19):
                x = e + offset
                self.tube("Barrel", "Cannon Slide", (x, -1.47, w), (x, -2.16, w), .127, "frame", sides=32)
                self.bore("Ported muzzle", "Cannon Slide", x, -2.25, w, .167, .094, .21)
                for i in range(4):
                    y = -1.57 - .125 * i
                    self.tube("Barrel jacket rib", "Cannon Slide", (x, y, w), (x, y - .039, w),
                              .151, "steel", sides=20)
                self.tube("Bore shadow", "Cannon Slide", (x, -2.13, w), (x, -2.145, w),
                          .092, "void", sides=20)
            self.box("Receiver identification", "Cannon Slide", (e, -1.54, w + .29),
                     (.53, .24, .083), "paint", .02)
            self.warning_marks(wr, e - .21, -1.31, w - .24, 4)
        elif self.heavy:
            self.box("Gripper palm", wr, (e, -.89, w), (.63, .62, .47), "frame", .05)
            for i in range(4):
                ox = e + .16 * (i - 1.5)
                finger, tip = f"Finger {i + 1}.L", f"Finger {i + 1} tip.L"
                self.box("Proximal knuckle", finger, (ox, -1.13, w), (.146, .21, .22), "steel", .016)
                self.box("Crimson knuckle plate", finger, (ox, -1.13, w + .111), (.119, .13, .044), "paint", .009)
                self.tube("Finger pin", tip, (ox - .074, -1.23, w), (ox + .074, -1.23, w),
                          .062, "frame", sides=16)
                self.box("Distal finger", tip, (ox, -1.31, w - .02), (.135, .18, .178), "plate", .014)
                self.box("Grip insert", tip, (ox, -1.33, w - .106), (.085, .111, .042), "rubber", .008)
            self.box("Opposed thumb", "Thumb.L", (e - .33, -.99, w - .15),
                     (.18, .30, .18), "steel", .020, .24)
        else:
            self.loft("Pulse pod nacelle", wr, [(w - .40, e, -.65, .47, .57),
                      (w - .29, e, -.69, .72, .78), (w + .04, e, -.70, .79, .79),
                      (w + .26, e, -.64, .60, .58)], "frame", .034, .75)
            self.bore("Pulse aperture", wr, e, -1.13, w - .09, .267, .173, .12, "steel")
            self.bore("Emitter baffle", wr, e, -1.148, w - .09, .189, .114, .10, "void")
            self.tube("Pulse emitter", wr, (e, -1.04, w - .09), (e, -1.115, w - .09), .092, "optic")
            for k in range(6):
                angle = k * pi / 3
                self.bolt(wr, e + .304 * cos(angle), -1.094, w - .09 + .304 * sin(angle), .028)

    def missile_pod(self, side, sign):
        x, z = sign * self.launch_x, self.launch_z
        pod, door = "Pod." + side, "Shutter." + side
        self.tube("Elevation bearing", pod, (x - .51, .24, z - .30),
                  (x + .51, .24, z - .30), .21, "steel", sides=16)
        self.loft("Vertical launch cassette", pod, [(z - .54, x, .13, .83, 1.43),
                  (z - .44, x, .12, 1.02, 1.66), (z + .52, x, .14, 1.03, 1.64),
                  (z + .67, x, .20, .88, 1.43)], "paint", .041)
        self.box("Launcher face gasket", pod, (x, -.734, z + .037), (.92, .11, 1.11), "void", .028)
        for dx in (-.454, .454):
            self.box("Vertical pod guide rail", pod, (x + dx, -.786, z + .06),
                     (.081, .116, 1.07), "steel", .015)
            for dz in (-.40, .50):
                self.bolt(pod, x + dx, -.845, z + dz, .033)
        for col in range(3):
            for row in range(4):
                tx, tz = x + (col - 1) * .247, z + .039 + (row - 1.5) * .245
                self.bore("Launch tube", pod, tx, -.836, tz, .105, .078, .13)
                self.bore("Tube liner", pod, tx, -.808, tz, .078, .059, .095, "frame", 20)
                self.tube("Missile housing", pod, (tx, -.747, tz), (tx, -.796, tz), .049, "steel", sides=16)
                self.tube("Armed missile nose", pod, (tx, -.786, tz), (tx, -.824, tz),
                          .044, "signal", tip=.013, sides=16)
        for i in range(5):
            self.box("Pod rear relief vane", pod, (x, .956, z - .30 + .164 * i),
                     (.66, .11, .061), "steel", .015)
        for sign_x in (-1, 1):
            edge = x + sign_x * .526
            self.side_panel("Launch cassette access plate", pod, sign_x, edge,
                            [(-.52, z - .35), (.67, z - .36), (.75, z - .26),
                             (.75, z + .28), (.55, z + .45), (-.42, z + .45),
                             (-.52, z + .32)], .084, "armor", .020)
            self.side_panel("Pod longitudinal armor rib", pod, sign_x, edge + sign_x * .033,
                            [(-.46, z - .06), (.58, z - .06), (.66, z + .034),
                             (.53, z + .11), (-.46, z + .11)], .058, "plate", .013)
            for yy, zz in [(-.39, z - .25), (.60, z - .24), (-.35, z + .32), (.54, z + .31)]:
                self.side_bolt(pod, sign_x, edge + sign_x * .022, yy, zz, .032)
            for i in range(4):
                self.box("Purge slot", pod, (edge + sign_x * .022, -.29 + .19 * i, z + .226),
                         (.051, .104, .039), "void", .007)
        self.box("Blast shutter", door, (x, -.889, z + .047), (.94, .102, 1.12), "armor", .033)
        for row in (-.34, -.19, .27, .42):
            self.box("Shutter stiffener", door, (x, -.946, z + row), (.73, .048, .09), "plate", .015)
        self.warning_marks(door, x - .22, -.958, z - .29, 5)
        for dx in (-.36, .36):
            self.bolt(door, x + dx, -.96, z - .39)
            self.tube("Shutter hinge barrel", pod, (x + dx - .10, -.874, z + .60),
                      (x + dx + .10, -.874, z + .60), .071, "steel")
        self.stencil(door, "12L" if side == "L" else "12R", x, -.951, z - .050, .21)

    def make_rig(self):
        data = bpy.data.armatures.new("Prototype mechanism")
        rig = bpy.data.objects.new(self.key.upper() + " / Rig", data)
        bpy.context.collection.objects.link(rig)
        rig.show_in_front = True
        data.display_type = "OCTAHEDRAL"
        bpy.ops.object.select_all(action="DESELECT")
        rig.select_set(True)
        bpy.context.view_layer.objects.active = rig
        bpy.ops.object.mode_set(mode="EDIT")
        for name, (head, tail, parent, group, connected) in self.bones.items():
            bone = data.edit_bones.new(name)
            bone.head, bone.tail = head, tail
            if parent:
                bone.parent = data.edit_bones[parent]
                bone.use_connect = connected
            bone.use_deform = group != "Sockets" and not name.startswith(("Foot IK", "Knee Pole"))
        bpy.ops.object.mode_set(mode="POSE")
        collections = {name: data.collections.new(name) for name in ("Controls", "Mechanism", "Sockets")}
        for name, (_, _, _, group, _) in self.bones.items():
            bone = data.bones[name]
            collections[group].assign(bone)
            bone.color.palette = {"Controls": "THEME04", "Mechanism": "THEME03", "Sockets": "THEME02"}[group]
            pose = rig.pose.bones[name]
            pose.rotation_mode = "XYZ"
            if group != "Sockets":
                pose.lock_scale = (True, True, True)
            if group == "Controls" and name not in {"ROOT", "Pelvis", "Cannon Slide"} and not name.startswith(("Foot IK", "Knee Pole")):
                pose.lock_location = (True, True, True)
        for side in ("L", "R"):
            ik = rig.pose.bones["Knee." + side].constraints.new("IK")
            ik.name = "Two-bone foot solve"
            ik.target, ik.subtarget = rig, "Foot IK." + side
            ik.pole_target, ik.pole_subtarget = rig, "Knee Pole." + side
            ik.chain_count, ik.use_stretch = 2, False
            rest_knee = self.bones["Knee." + side][0]
            def knee_error(angle):
                ik.pole_angle = angle
                bpy.context.view_layer.update()
                return (rig.pose.bones["Knee." + side].head - rest_knee).length

            def wrap(angle):
                return (angle + pi) % (2 * pi) - pi

            angle = min((0, pi / 2, -pi / 2, -pi), key=knee_error)
            for width in (pi / 4, pi / 16, pi / 64, pi / 256, pi / 1024, pi / 4096):
                angle = min((wrap(angle + width * i / 2) for i in range(-2, 3)), key=knee_error)
            assert knee_error(angle) < .002, (self.key, side, angle, knee_error(angle))
            rotation = rig.pose.bones["Foot." + side].constraints.new("COPY_ROTATION")
            rotation.name = "Match foot control orientation"
            rotation.target, rotation.subtarget = rig, "Foot IK." + side
            rotation.target_space = rotation.owner_space = "WORLD"
        for name, _, _, _ in self.pistons:
            for part, target in (("Housing", "Rod"), ("Rod", "Housing")):
                track = rig.pose.bones[f"{name} {part}"].constraints.new("DAMPED_TRACK")
                track.name = "Telescoping alignment"
                # A sibling target with the same pivot avoids a dependency cycle.
                socket = rig.pose.bones[f"{name} {target}"].parent.name
                track.target = self.piston_target(rig, f"{name} {target} pivot", socket,
                                                 self.bones[f"{name} {target}"][0])
                track.track_axis = "TRACK_Y"
        bpy.ops.object.mode_set(mode="OBJECT")
        self.rig = rig

    def control_shapes(self):
        rig = self.rig
        widgets = bpy.data.collections.new("Control shapes")
        bpy.context.scene.collection.children.link(widgets)
        widgets.hide_render = widgets.hide_viewport = True

        def shape(name, points, edges):
            mesh = bpy.data.meshes.new(name)
            mesh.from_pydata(points, edges, [])
            obj = bpy.data.objects.new(name, mesh)
            widgets.objects.link(obj)
            return obj

        def outline(name, points):
            return shape(name, points, [(i, (i + 1) % len(points)) for i in range(len(points))])

        root = outline("Root ring", [(1.65 * cos(i * pi / 16), 0, 1.65 * sin(i * pi / 16))
                                     for i in range(32)])
        foot = outline("Foot platform", [(-.61, -.36, 0), (.61, -.36, 0), (.61, .86, 0),
                    (.45, 1.08, 0), (-.45, 1.08, 0), (-.61, .86, 0)])
        pole = outline("Knee plane", [(-.20, 0, 0), (0, .20, 0), (.20, 0, 0), (0, -.20, 0)])
        for name, widget in [("ROOT", root), ("Foot IK.L", foot), ("Foot IK.R", foot),
                             ("Knee Pole.L", pole), ("Knee Pole.R", pole)]:
            bone = rig.pose.bones[name]
            bone.custom_shape, bone.use_custom_shape_bone_size = widget, False
        rig.data.collections["Mechanism"].is_visible = False
        rig.data.collections["Sockets"].is_visible = False

    def piston_target(self, rig, name, parent, point):
        socket = bpy.data.objects.new(name, None)
        bpy.context.collection.objects.link(socket)
        socket.empty_display_size = .075
        socket.parent, socket.parent_type, socket.parent_bone = rig, "BONE", parent
        # Convert the authored point through the bone's rest transform and tail offset.
        bone = rig.data.bones[parent]
        socket.location = bone.matrix_local.inverted() @ point - Vector((0, bone.length, 0))
        socket.hide_set(True)
        return socket

    def finish_meshes(self):
        rig = self.rig
        for joint, objects in self.parts.items():
            bpy.ops.object.select_all(action="DESELECT")
            for obj in objects:
                obj.select_set(True)
            bpy.context.view_layer.objects.active = objects[0]
            if len(objects) > 1:
                bpy.ops.object.join()
            obj = bpy.context.object
            obj.name = joint + " / rigid assembly"
            self.planar_uv(obj)
            group = obj.vertex_groups.new(name=joint)
            group.add(list(range(len(obj.data.vertices))), 1, "REPLACE")
            world = obj.matrix_world.copy()
            obj.parent = rig
            obj.matrix_world = world
            skin = obj.modifiers.new("Rigid bone binding", "ARMATURE")
            skin.object = rig

    @staticmethod
    def planar_uv(obj):
        mesh = obj.data
        # Rest-space projection keeps the texture fixed on articulated armor.
        uv = mesh.uv_layers.active or mesh.uv_layers.new(name="Industrial finish")
        matrix = obj.matrix_world
        normals = matrix.to_3x3().inverted().transposed()
        offsets = tuple(sum(ord(c) * (i + 7) for i, c in enumerate(obj.name)) % n / n
                        for n in (71, 83))
        points = [matrix @ vertex.co for vertex in mesh.vertices]
        for polygon in mesh.polygons:
            normal = normals @ polygon.normal
            axis = max(range(3), key=lambda i: abs(normal[i]))
            u, v = ((1, 2), (0, 2), (0, 1))[axis]
            for loop in polygon.loop_indices:
                point = points[mesh.loops[loop].vertex_index]
                uv.data[loop].uv = (point[u] * .83 + offsets[0], point[v] * .83 + offsets[1])

    def make_pistons(self):
        for name, a, b, radius in self.pistons:
            housing, rod = f"{name} Housing", f"{name} Rod"
            self.tube("Ram cylinder", housing, a, a.lerp(b, .62), radius, "frame")
            self.tube("Ram seal", housing, a.lerp(b, .52), a.lerp(b, .65), radius * 1.16, "steel")
            self.tube("Chrome ram rod", rod, b, b.lerp(a, .69), radius * .61, "chrome")
            for i in range(4):
                t = .14 + .077 * i
                self.tube("Ram retention collar", housing, a.lerp(b, t), a.lerp(b, t + .036),
                          radius * 1.10, "steel", sides=20)
            self.tube("Rod end bearing", rod, b, b.lerp(a, .12), radius * .95, "frame")

    def delta(self, name, x=0, y=0, z=0):
        pose = self.rig.pose.bones[name]
        pose.location = pose.bone.matrix_local.to_3x3().inverted() @ Vector((x, y, z))

    def rotate(self, name, x=0, y=0, z=0):
        pose = self.rig.pose.bones[name]
        pose.rotation_euler = pose.bone.matrix_local.to_3x3().inverted() @ Vector((x, y, z))

    def pose(self, motion, t):
        stride = 2 * pi * t
        breathe = sin(stride)
        if not self.heavy:
            for side in ("L", "R"):
                self.rotate("Shutter." + side, x=-1.50 if motion == "Idle" else -1.22)
        self.delta("Pelvis", z=.022 * breathe if motion == "Idle" else 0)
        if motion == "Walk":
            self.delta("Pelvis", x=.06 * breathe, z=-.09 + .038 * cos(2 * stride))
            self.rotate("Torso", x=.04, z=.07 * breathe)
            for side, offset in (("L", 0), ("R", .5)):
                # In-place gait. Contact travels at a constant belt speed and the
                # swing returns with zero lift velocity at liftoff and touchdown.
                phase = (t + offset) % 1
                step, contact = (.86 if self.heavy else .96), .63
                if phase < contact:
                    y, z = step * (phase / contact - .5), 0
                else:
                    u = (phase - contact) / (1 - contact)
                    y = step * (.5 - u * u * (3 - 2 * u))
                    z = (.26 if self.heavy else .33) * sin(pi * u) ** 2
                self.delta("Foot IK." + side, y=y, z=z)
                self.rotate("Foot IK." + side, x=-.30 * z * sin(2 * pi * phase))
                self.rotate("Shoulder." + side, x=.26 * sin(2 * pi * phase))
                self.rotate("Pauldron." + side, x=.07 * sin(2 * pi * phase))
                self.rotate("Elbow." + side, x=.10 * sin(2 * pi * phase))
        if motion == "Deploy":
            ease = sin(pi * t) ** 2
            self.delta("Pelvis", z=-.22 * ease)
            self.rotate("Torso", x=.10 * ease)
            for side, sign in (("L", 1), ("R", -1)):
                self.rotate("Pauldron." + side, y=sign * .15 * ease)
                self.rotate("Elbow." + side, x=-(.54 if self.heavy else .30) * ease)
                if not self.heavy:
                    self.rotate("Pod." + side, x=-.16 * ease)
                    self.rotate("Shutter." + side, x=-1.22 - .69 * ease)
            self.rotate("Optics", z=.18 * ease)
        if motion == "Fire":
            aim = sin(pi * t) ** 1.4
            pulse_a = max(0, 1 - abs(t - .42) / .095) ** 2
            pulse_b = max(0, 1 - abs(t - .58) / .095) ** 2
            recoil = pulse_a + .83 * pulse_b
            self.delta("Pelvis", y=.045 * recoil, z=-.10 * aim)
            self.rotate("Torso", x=.08 * aim - .13 * recoil, z=.08 * (pulse_a - pulse_b))
            if self.heavy:
                self.rotate("Shoulder.R", x=-.28 * aim + .08 * recoil)
                self.rotate("Elbow.R", x=-.33 * aim - .11 * recoil)
                self.rotate("Pauldron.R", x=.13 * aim)
                self.rotate("Elbow.L", x=-.25 * aim)
                self.delta("Cannon Slide", y=.21 * recoil)
            else:
                for side, pulse in (("L", pulse_a), ("R", pulse_b)):
                    self.rotate("Pod." + side, x=-.24 * aim - .17 * pulse)
                    self.rotate("Shutter." + side, x=-1.22 - .69 * aim)
                    self.rotate("Elbow." + side, x=-.20 * aim)
        if motion == "Idle":
            self.rotate("Torso", x=.017 * breathe)
            self.rotate("Optics", z=.15 * breathe)
        if self.heavy:
            grip = .13 + (.39 * sin(pi * t) ** 2 if motion in {"Deploy", "Fire"} else .035 * breathe)
            for index in range(1, 5):
                self.rotate(f"Finger {index}.L", x=grip)
                self.rotate(f"Finger {index} tip.L", x=grip * 1.36)
            self.rotate("Thumb.L", z=-.41 * grip)

    def animate(self):
        rig, scene = self.rig, bpy.context.scene
        anim = rig.animation_data_create()
        scene.render.fps = 30
        controls = [bone for bone in rig.pose.bones if self.bones[bone.name][3] == "Controls"]
        for name, length in (("Idle", 90), ("Walk", 58 if self.heavy else 46), ("Deploy", 72), ("Fire", 56)):
            action = bpy.data.actions.new(name)
            anim.action = action
            for frame in range(length + 1):
                for bone in controls:
                    bone.location = bone.rotation_euler = (0, 0, 0)
                self.pose(name, frame / length)
                for bone in controls:
                    bone.keyframe_insert("location", frame=frame + 1, group=bone.name)
                    bone.keyframe_insert("rotation_euler", frame=frame + 1, group=bone.name)
            slot = anim.action_slot
            assert slot, name
            anim.action = None
            track = anim.nla_tracks.new()
            track.name = name
            strip = track.strips.new(name, 1, action)
            strip.action_slot = slot
            track.mute = True
            self.actions.append((track, action, slot, length))
        scene.frame_start, scene.frame_end = 1, 91
        scene.frame_set(1)

    def validate_motion(self):
        scene = bpy.context.scene
        controls = self.rig.pose.bones
        for track, _, _, length in self.actions:
            track.mute = False
            max_error = 0
            for frame in range(1, length + 2):
                scene.frame_set(frame)
                for side in ("L", "R"):
                    target = controls["Foot IK." + side].head
                    foot = controls["Foot." + side].head
                    max_error = max(max_error, (target - foot).length)
                    for label in ("Leg ram", "Arm ram"):
                        name = f"{label}.{side}"
                        housing = controls[f"{name} Housing"]
                        rod = controls[f"{name} Rod"]
                        separation = (rod.head - housing.head).length
                        assert separation < .98 * housing.bone.length * (.62 + .69), (self.key, name, separation)
                        direction = (rod.head - housing.head).normalized()
                        assert direction.dot((housing.tail - housing.head).normalized()) > .995, (self.key, name, frame)
            assert max_error < .012, (self.key, track.name, max_error)
            print(f"{self.key} {track.name}: max IK target error {max_error:.6f} m", flush=True)
            track.mute = True
        scene.frame_set(1)

    def export(self, directory):
        rig = self.rig
        scene = bpy.context.scene
        for track, _, _, _ in self.actions:
            track.mute = False
        bpy.ops.object.select_all(action="DESELECT")
        rig.select_set(True)
        bpy.context.view_layer.objects.active = rig
        for obj in rig.children:
            if obj.type == "MESH":
                obj.select_set(True)
        bpy.ops.export_scene.gltf(
            filepath=str(directory / (self.key + ".glb")), export_format="GLB",
            use_selection=True, export_animations=True, export_animation_mode="NLA_TRACKS",
            export_force_sampling=True, export_yup=True, export_cameras=False, export_lights=False,
            export_image_format="JPEG", export_jpeg_quality=91,
        )
        for track, _, _, _ in self.actions:
            track.mute = track.name != "Walk"
        scene.frame_end = self.actions[1][3] + 1
        scene.frame_set(1)
        self.control_shapes()
        self.configure_viewport()
        rig["Chassis"] = f"{self.code} / {self.key.upper()}"
        rig["Animation"] = "Four NLA tracks. Solo a track for playback; mute all for posing."
        rig["Controls"] = "Foot IK and Knee Pole control the legs. Use the Controls bone collection."
        bpy.ops.object.select_all(action="DESELECT")
        rig.select_set(True)
        bpy.ops.object.mode_set(mode="POSE")
        bpy.ops.wm.save_as_mainfile(filepath=str(directory / (self.key + ".blend")))
        bpy.ops.object.mode_set(mode="OBJECT")

    def configure_viewport(self):
        scene = bpy.context.scene
        scene.unit_settings.system = "METRIC"
        for screen in bpy.data.screens:
            for area in screen.areas:
                if area.type == "VIEW_3D":
                    space = area.spaces.active
                    space.shading.color_type = "MATERIAL"
                    region = space.region_3d
                    region.view_rotation = Vector((-7, 12, -3)).to_track_quat("-Z", "Y")
                    region.view_location = (0, 0, self.shoulder_z * .59)
                    region.view_distance = 10.6
                    region.view_perspective = "ORTHO"

    def still(self, directory):
        scene = bpy.context.scene
        # Render a deployed inspection view for systems without WebGL.
        for track, _, _, _ in self.actions:
            track.mute = track.name != "Deploy"
        scene.frame_set(37 if not self.heavy else 13)
        bpy.ops.object.camera_add(location=(7.7, -12.0, 6.35))
        camera = bpy.context.object
        camera.rotation_euler = (Vector((0, -.14, 2.78 if self.heavy else 2.55)) -
                                 camera.location).to_track_quat("-Z", "Y").to_euler()
        camera.data.type = "ORTHO"
        camera.data.ortho_scale = 7.05 if self.heavy else 6.44
        scene.camera = camera
        scene.render.engine = "CYCLES"
        scene.cycles.samples = 16
        scene.cycles.use_denoising = True
        scene.world = bpy.data.worlds.new("Inspection fill")
        scene.world.color = (.21, .21, .21)
        scene.view_settings.view_transform = "AgX"
        for name, pos, color, power, size in [
            ("Key", (2, -6, 8), (1, .86, .70), 1800, 6),
            ("Fill", (-5, -2, 5), (.54, .71, 1), 1300, 5),
            ("Rim", (3, 4, 7), (1, .71, .42), 2200, 4),
        ]:
            data = bpy.data.lights.new(name, "AREA")
            data.energy, data.color, data.shape, data.size = power, color, "DISK", size
            light = bpy.data.objects.new(name, data)
            bpy.context.collection.objects.link(light)
            light.location = pos
            light.rotation_euler = (Vector((0, 0, 2.6)) - light.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.resolution_x = scene.render.resolution_y = 760
        scene.render.resolution_percentage = 100
        scene.render.film_transparent = True
        scene.render.image_settings.file_format = "WEBP"
        scene.render.image_settings.color_mode = "RGBA"
        scene.render.image_settings.quality = 89
        scene.render.filepath = str(directory / (self.key + ".webp"))
        bpy.ops.render.render(write_still=True)


def build(key, output):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    chassis = Chassis(key, output)
    chassis.setup_bones()
    chassis.armor_body()
    for side, sign in (("L", 1), ("R", -1)):
        chassis.armor_leg(side, sign)
        chassis.armor_arm(side, sign)
        if not chassis.heavy:
            chassis.missile_pod(side, sign)
    chassis.make_pistons()
    chassis.make_rig()
    chassis.finish_meshes()
    chassis.animate()
    chassis.validate_motion()
    chassis.export(output)
    chassis.still(output)


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:]
    destination = Path(args[0]).resolve()
    destination.mkdir(parents=True, exist_ok=True)
    for chassis_id in args[1:] or PALETTES:
        build(chassis_id, destination)
