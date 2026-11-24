"""Construct an original bilateral rig with simple, independently specified dimensions."""
import bpy


def create_fixture(templates):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene

    def joint(name, x, z):
        obj = bpy.data.objects.new(name, None)
        scene.collection.objects.link(obj)
        obj.location = (x, 0, z)

    def shell(name, x, floor):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata([(-0.2, 0, 0), (0.2, 0, 0), (0, 0.2, 0.1)], [], [(0, 1, 2)])
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        scene.collection.objects.link(obj)
        obj.location = (x, 0, floor)

    joint(templates["pelvis"], 0, 3)
    shell(templates["pelvis_shell"], 0, 2.5)
    for side, x in (("L", -1), ("R", 1)):
        heights = {"shoulder": 4, "elbow": 3, "wrist": 2, "hip": 3, "knee": 2, "ankle": 1}
        for role, z in heights.items():
            joint(templates[role].format(side=side), x, z)
        shell(templates["forearm_shell"].format(side=side), x, 2)
    bpy.context.view_layer.update()


def fixture_contract(templates):
    # Both arm and leg segments are one unit. The pelvis shell drops half a unit.
    expected = {"forearm_over_upper_arm": 1, "thigh_over_shin": 1,
                "pelvis_above_ankle_over_leg": 1, "hip_to_ankle_z_over_leg": 1,
                "elbow_to_shell_low_z_over_forearm": 1, "pelvis_to_shell_low_z_over_leg": 0.25}
    return {"scene": "Scene", "frame": 1, "objects": templates,
            "baseline": "generated bilateral fixture",
            "targets": {side: {key: [value, 0.01] for key, value in expected.items()}
                        for side in ("L", "R")}}
