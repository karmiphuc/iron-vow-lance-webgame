"""Run in background Blender with --factory-startup using generated geometry or the optional pinned Husky file."""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import sys
import unittest

import bmesh
import bpy
from mathutils import Vector

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
from check_rig import check
from fixture_rig import create_fixture, fixture_contract

ASSET = Path(bpy.data.filepath) if bpy.data.filepath else None
BASELINE = "a017246bab6d73dab773119c196ce205e6b0b596e7e8dec9e37939c14a47ccbc"
ARCHIVE_CONTRACT = json.loads((SCRIPTS.parent / "examples/husky-rig.json").read_text())

CONTRACT = ARCHIVE_CONTRACT if ASSET else fixture_contract(ARCHIVE_CONTRACT["objects"])


class RigTests(unittest.TestCase):
    def setUp(self):
        if ASSET:
            bpy.ops.wm.open_mainfile(filepath=str(ASSET))
        else:
            create_fixture(CONTRACT["objects"])
        self.shell = bpy.data.objects["Pelvis assembly"]

    def add_loose_vertex(self, world_point):
        mesh = bmesh.new()
        try:
            mesh.from_mesh(self.shell.data)
            mesh.verts.new(self.shell.matrix_world.inverted() @ world_point)
            mesh.to_mesh(self.shell.data)
        finally:
            mesh.free()
        self.shell.data.update()

    def read_rig(self, config=CONTRACT):
        report = {}
        check(config, report)
        return report

    def test_accepted_baseline(self):
        report = self.read_rig()
        self.assertEqual(report["status"], "pass")
        self.assertEqual(sum(len(side["checks"]) for side in report["sides"].values()), 12)

    def test_short_right_forearm(self):
        bpy.data.objects["Wrist_R"].delta_location.z += 0.3
        report = self.read_rig()
        self.assertEqual(report["status"], "fail")
        for side, expected in (("L", "pass"), ("R", "fail")):
            row = report["sides"][side]
            self.assertEqual(row["objects"]["wrist"], f"Wrist_{side}")
            self.assertEqual(row["checks"]["forearm_over_upper_arm"]["status"], expected)

    def test_shared_limb_object_is_invalid(self):
        for role in ("wrist", "forearm_shell", "knee"):
            with self.subTest(role=role):
                config = deepcopy(CONTRACT)
                config["objects"][role] = config["objects"][role].format(side="L")
                with self.assertRaisesRegex(ValueError, "maps to both L and R"):
                    self.read_rig(config)
                del config["targets"]["R"]
                self.assertEqual(self.read_rig(config)["status"], "pass")

    def test_boolean_target_or_tolerance_is_invalid(self):
        for pair in ([True, 0.01], [1.167426, True]):
            with self.subTest(pair=pair):
                config = deepcopy(CONTRACT)
                config["targets"]["R"]["forearm_over_upper_arm"] = pair
                with self.assertRaisesRegex(ValueError, "invalid target or tolerance"):
                    self.read_rig(config)

    def test_loose_vertex_leaves_surface_unchanged(self):
        self.add_loose_vertex(Vector((0, 0, -2)))
        self.assertEqual(self.read_rig()["status"], "pass")

    def test_loose_vertex_cannot_hide_raised_apron(self):
        lowest = min((self.shell.matrix_world @ v.co for v in self.shell.data.vertices),
                     key=lambda point: point.z)
        self.shell.delta_location.z += 0.25
        bpy.context.view_layer.update()
        self.add_loose_vertex(lowest)
        report = self.read_rig()
        self.assertEqual(report["status"], "fail")
        for side in report["sides"].values():
            failed = [name for name, row in side["checks"].items() if row["status"] == "fail"]
            self.assertEqual(failed, ["pelvis_to_shell_low_z_over_leg"])

    def test_required_forearm_shell_disabled(self):
        bpy.data.objects["Elbow_L assembly"].hide_render = True
        with self.assertRaisesRegex(ValueError, "disabled for rendering"):
            self.read_rig()


if __name__ == "__main__":
    if not bpy.app.background or (ASSET and hashlib.sha256(ASSET.read_bytes()).hexdigest() != BASELINE):
        raise RuntimeError("run in background Blender with factory startup or the pinned Husky baseline")
    result = unittest.main(argv=[__file__], exit=False)
    if not result.result.wasSuccessful():
        raise RuntimeError("Husky rig regression failed")
