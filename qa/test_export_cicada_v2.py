"""Contract checks for the Cicada exporter, runnable without Blender."""
import runpy
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch


with patch.dict(sys.modules, {"bpy": types.ModuleType("bpy")}):
    exporter = runpy.run_path(str(Path(__file__).resolve().parents[1] / "tools/export_cicada_v2.py"))


class CicadaExportContract(unittest.TestCase):
    def test_factory_assemblies_have_damage_parts(self):
        part_for = exporter["part_for"]
        for bone, expected in (("Pelvis", "body"), ("Torso", "body"), ("Optics", "pilot")):
            self.assertEqual(part_for(bone), expected)
        for side, part in (("L", "left"), ("R", "right")):
            for bone in ("Shoulder", "Elbow", "Wrist", "Pauldron", "Pod", "Shutter"):
                self.assertEqual(part_for(f"{bone}.{side}"), part)
            for ram in ("Housing", "Rod"):
                self.assertEqual(part_for(f"Arm ram.{side} {ram}"), part)
                self.assertEqual(part_for(f"Leg ram.{side} {ram}"), "legs")
            for bone in ("Hip", "Knee", "Foot", "Toe"):
                self.assertEqual(part_for(f"{bone}.{side}"), "legs")
        with self.assertRaises(ValueError):
            part_for("Unrecognized assembly")

    def test_attachment_and_material_names(self):
        names = exporter["BONE_NAMES"]
        for side in ("L", "R"):
            self.assertEqual(names[f"Hardpoint.{side}"], f"socket.{side}")
            self.assertEqual(names[f"Launch.{side}"], f"muzzle.locust.{side}")
        self.assertEqual(set(exporter["MATERIAL_NAMES"].values()),
                         {"paint_primary", "paint_secondary", "paint_accent", "visor", "stack"})
        self.assertEqual(exporter["authored_name"]("armor.001"), "armor")


if __name__ == "__main__":
    unittest.main()
