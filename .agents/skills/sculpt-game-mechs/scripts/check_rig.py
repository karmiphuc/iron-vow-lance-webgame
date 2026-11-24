"""Compare a posed, Z-up Blender object rig to independently locked ratio targets."""

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy


def mesh_floor(obj):
    if obj.hide_render:
        raise ValueError(f"declared armor shell {obj.name!r} is disabled for rendering")
    if obj.type != "MESH" or not obj.data.polygons:
        raise ValueError(f"{obj.name} must have evaluated mesh faces")
    face_vertices = {loop.vertex_index for loop in obj.data.loops}
    return min((obj.matrix_world @ obj.data.vertices[i].co).z for i in face_vertices)


LIMB_ROLES = ("shoulder", "elbow", "wrist", "hip", "knee", "ankle", "forearm_shell")


def resolve_names(templates, sides):
    resolved = {}
    owners = {}
    for side in sides:
        names = {role: templates[role].format(side=side)
                 for role in (*LIMB_ROLES, "pelvis", "pelvis_shell")}
        for role in LIMB_ROLES:
            name = names[role]
            if name in owners and owners[name] != side:
                raise ValueError(f"limb object {name!r} maps to both {owners[name]} and {side}")
            owners[name] = side
        resolved[side] = names
    return resolved


def measure(scene, depsgraph, names):
    def object_for(role):
        name = names[role]
        obj = scene.objects.get(name)
        if obj is None:
            raise ValueError(f"missing {role} object {name!r} in scene {scene.name!r}")
        return obj.evaluated_get(depsgraph)

    roles = ("shoulder", "elbow", "wrist", "pelvis", "hip", "knee", "ankle")
    points = {role: object_for(role).matrix_world.translation.copy() for role in roles}
    upper_arm = (points["shoulder"] - points["elbow"]).length
    forearm = (points["elbow"] - points["wrist"]).length
    thigh = (points["hip"] - points["knee"]).length
    shin = (points["knee"] - points["ankle"]).length
    if min(upper_arm, forearm, thigh, shin) <= 0:
        raise ValueError("coincident pivots give a zero-length segment")
    forearm_floor = mesh_floor(object_for("forearm_shell"))
    pelvis_floor = mesh_floor(object_for("pelvis_shell"))
    leg = thigh + shin
    ratios = {
        "forearm_over_upper_arm": forearm / upper_arm,
        "thigh_over_shin": thigh / shin,
        "pelvis_above_ankle_over_leg": (points["pelvis"].z - points["ankle"].z) / leg,
        "hip_to_ankle_z_over_leg": (points["hip"].z - points["ankle"].z) / leg,
        "elbow_to_shell_low_z_over_forearm": (points["elbow"].z - forearm_floor) / forearm,
        "pelvis_to_shell_low_z_over_leg": (points["pelvis"].z - pelvis_floor) / leg,
    }
    if not all(math.isfinite(value) for value in ratios.values()):
        raise ValueError("non-finite geometry")
    evidence = {
        "objects": names,
        "pivot_world_xyz": {role: list(point) for role, point in points.items()},
        "shell_min_world_z": {"forearm": forearm_floor, "pelvis": pelvis_floor},
    }
    return ratios, evidence


def check(config, report):
    scene = bpy.context.scene
    if scene.name != config["scene"]:
        raise ValueError(f"expected scene {config['scene']!r}, found {scene.name!r}")
    frame = config["frame"]
    if type(frame) is not int:
        raise ValueError("frame must be an integer")
    scene.frame_set(frame, subframe=0)
    graph = bpy.context.evaluated_depsgraph_get()
    report.update(scene=scene.name, frame=frame, baseline=config["baseline"], sides={})
    if not config["targets"]:
        raise ValueError("no side targets")
    side_names = resolve_names(config["objects"], config["targets"])
    failures = False
    for side, targets in config["targets"].items():
        ratios, evidence = measure(scene, graph, side_names[side])
        if set(targets) != set(ratios):
            raise ValueError(f"{side}: targets must match these metrics: {sorted(ratios)}")
        checks = {}
        report["sides"][side] = {**evidence, "checks": checks}
        for name, value in ratios.items():
            expected, tolerance = targets[name]
            if not all(type(n) in (int, float) and math.isfinite(n) for n in (expected, tolerance)) or tolerance < 0:
                raise ValueError(f"{side} {name}: invalid target or tolerance")
            passed = abs(value - expected) <= tolerance
            failures |= not passed
            checks[name] = {
                "measured": value, "expected": expected, "tolerance": tolerance,
                "status": "pass" if passed else "fail",
            }
    report["status"] = "fail" if failures else "pass"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("config", type=Path)
    parser.add_argument("report", type=Path)
    parser.add_argument("--contract-sha256", help="expected digest of the approved ratio contract")
    parser.add_argument("--asset-sha256", help="expected digest of the candidate .blend file")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    asset = Path(bpy.data.filepath)
    for source in (asset, args.config):
        if args.report.resolve() == source.resolve() or (
            args.report.exists() and source.exists() and args.report.samefile(source)
        ):
            raise ValueError(f"refusing to overwrite input {source} with report {args.report}")
    report = {
        "status": "unknown", "asset": bpy.data.filepath, "config": str(args.config),
        "asset_sha256": None, "contract_sha256": None,
    }
    try:
        with asset.open("rb") as stream:
            report["asset_sha256"] = hashlib.file_digest(stream, "sha256").hexdigest()
        contract = args.config.read_bytes()
        report["contract_sha256"] = hashlib.sha256(contract).hexdigest()
        for field, expected in (("asset_sha256", args.asset_sha256), ("contract_sha256", args.contract_sha256)):
            if expected is not None and report[field] != expected.lower():
                raise ValueError(f"{field} pin mismatch: expected {expected}, read {report[field]}")
        check(json.loads(contract), report)
    except (KeyError, ValueError, TypeError, OSError, RuntimeError, AttributeError, OverflowError, IndexError) as error:
        report["error"] = str(error)
    args.report.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    print(f"Rig geometry: {report['status']} ({args.report})", flush=True)
    if report["status"] != "pass":
        raise RuntimeError(f"rig check {report['status']}; see {args.report}")


if __name__ == "__main__":
    main()
