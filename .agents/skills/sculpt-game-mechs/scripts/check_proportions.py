#!/usr/bin/env python3
"""Compare annotated PNG/JPEG images using a shared landmark contract."""
import argparse
from collections import deque
from functools import lru_cache
import base64
import hashlib
import html
import json
import math
from pathlib import Path
import re
import struct
import subprocess
import sys
import tempfile



ARITY = {"height": 1, "span": 2, "count": 1, "gap": 2, "xgap": 2}
EXIT_CODES = {"PASS": 0, "FAIL": 1, "ERROR": 2, "REVIEW": 3}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def object_pairs(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, f"duplicate JSON key {key!r}")
        result[key] = value
    return result


def read_json(path):
    try:
        data = path.read_bytes()
        value = json.loads(data.decode("utf-8"), object_pairs_hook=object_pairs)
        return value, hashlib.sha256(data).hexdigest()
    except (ValueError, OSError) as exc:
        raise ValueError(f"{path}: {exc}") from exc


def fields(item, required, context):
    require(isinstance(item, dict), f"{context}: expected an object")
    missing = sorted(set(required.split()) - item.keys())
    require(not missing, f"{context}: missing {', '.join(missing)}")


def label(value):
    return isinstance(value, str) and bool(value.strip())


def number(value):
    return type(value) in (int, float) and math.isfinite(value)


def validated_contract(contract):
    fields(contract, "view landmarks reference checks", "contract")
    require(label(contract["view"]), "contract.view must name a camera/pose")
    names = contract["landmarks"]
    require(isinstance(names, dict) and {"top", "sole"} <= names.keys(),
            "landmarks must define top and sole")
    require(all(label(k) and label(v) for k, v in names.items()),
            "each landmark needs a name and a text definition")
    checks = contract["checks"]
    require(isinstance(checks, list) and checks, "checks must be a nonempty array")
    ids = set()
    signatures = set()
    types = {"sole": "point", "top": "point"}
    for check in checks:
        fields(check, "id kind points tolerance", "check")
        cid, kind, points, tolerance = (check[k] for k in ("id", "kind", "points", "tolerance"))
        require(label(cid) and cid not in ids, f"missing or duplicate check id {cid!r}")
        ids.add(cid)
        require(isinstance(kind, str) and kind in ARITY, f"{cid}: unknown kind {kind!r}")
        require(isinstance(points, list) and len(points) == ARITY[kind] and
                all(label(p) and p in names for p in points),
                f"{cid}: expected {ARITY[kind]} defined landmark(s)")
        require(len(set(points)) == len(points), f"{cid}: repeated landmark")
        signature = (kind, tuple(sorted(points) if kind == "span" else points))
        require(signature not in signatures, f"{cid}: duplicate measurement")
        signatures.add(signature)
        require(number(tolerance) and tolerance >= 0, f"{cid}: invalid tolerance")
        expected = "count" if kind == "count" else "point"
        if "requires_alignment" in check:
            require(kind == "count" and type(check["requires_alignment"]) is bool
                    and contract.get("alignment_checks"),
                    f"{cid}: requires_alignment needs a count and declared alignment checks")
        if kind == "count":
            require(tolerance == 0, f"{cid}: count tolerance must be zero")
        for p in points:
            require(types.setdefault(p, expected) == expected, f"{cid}: {p} has conflicting types")
    if "alignment_checks" in contract:
        controls = contract["alignment_checks"]
        require(isinstance(controls, list) and controls, "alignment_checks must be a nonempty list")
        require(all(label(cid) and cid in ids for cid in controls), "alignment_checks contains an unknown ID")
        require(len(controls) == len(set(controls)), "alignment_checks contains a duplicate ID")
        require(len(controls) < len(checks), "at least one check must measure something besides alignment")
        require(all(c["kind"] != "count" for c in checks if c["id"] in controls),
                "alignment_checks must use a dimensional metric")
        for c in checks:
            if c["id"] in controls and c["kind"] in ("height", "gap"):
                require(not set(c["points"]) <= {"top", "sole"},
                        f"{c['id']}: a height anchor cannot verify its own normalization")
    return types


@lru_cache(maxsize=2)
def decode_image(data):
    """Check actual pixels and give the overlay the same orientation as the measurements."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        demuxer = "png_pipe"
        require(b"\0\0\0\0IEND\xaeB\x60\x82" in data, "incomplete PNG")
    else:
        require(data.startswith(b"\xff\xd8"), "image must be PNG or JPEG")
        require(b"\xff\xd9" in data, "incomplete JPEG")
        demuxer = "jpeg_pipe"
    try:
        decoded = subprocess.run(
            ["ffmpeg", "-nostdin", "-v", "error", "-xerror", "-err_detect", "explode",
             "-f", demuxer, "-i", "pipe:0", "-frames:v", "1", "-c:v", "png",
             "-f", "image2pipe", "pipe:1"],
            input=data, capture_output=True, timeout=60)
    except FileNotFoundError as exc:
        raise ValueError("FFmpeg is required to verify and orient the image pixels") from exc
    except subprocess.TimeoutExpired as exc:
        raise ValueError("image decoding timed out") from exc
    pixels = decoded.stdout
    require(decoded.returncode == 0 and pixels.startswith(b"\x89PNG\r\n\x1a\n")
            and len(pixels) >= 33, "image pixel decoding failed")
    return pixels, *struct.unpack_from(">II", pixels, 16)


def is_point(value):
    return isinstance(value, list) and len(value) == 2 and all(number(v) for v in value)


def observation(obs, base, contract, types, context):
    fields(obs, "view image sha256 width height marks error_px", context)
    require(obs["view"] == contract["view"], f"{context}: view differs from contract")
    require(label(obs["image"]), f"{context}: invalid image path")
    require(isinstance(obs["sha256"], str) and re.fullmatch(r"[a-fA-F0-9]{64}", obs["sha256"]),
            f"{context}: invalid sha256")
    path = (base / obs["image"]).resolve()
    data = path.read_bytes()
    require(hashlib.sha256(data).hexdigest() == obs["sha256"].lower(),
            f"{context}: sha256 differs from {path}")
    pixels, w, h = decode_image(data)
    for key, actual in (("width", w), ("height", h)):
        require(type(obs[key]) is int and actual > 0 and obs[key] == actual,
                f"{context}: {key} differs from native dimension {actual}")
    require(number(obs["error_px"]) and obs["error_px"] >= 0,
            f"{context}: error_px must be finite and nonnegative")
    marks = obs["marks"]
    require(isinstance(marks, dict), f"{context}: marks must be an object")
    missing = contract["landmarks"].keys() - marks.keys()
    extra = marks.keys() - contract["landmarks"].keys()
    require(not missing and not extra,
            f"{context}: missing marks {sorted(missing)}, undeclared marks {sorted(extra)}")
    for name, mark in marks.items():
        if mark is None:
            continue
        expected = types.get(name)
        if is_point(mark):
            require(expected != "count", f"{context}: {name} needs a list of feature points")
            points = [mark]
        else:
            require(expected != "point" and isinstance(mark, list) and all(is_point(p) for p in mark),
                    f"{context}: invalid mark {name}")
            require(len({tuple(p) for p in mark}) == len(mark),
                    f"{context}: duplicate feature coordinate in {name}")
            points = mark
        require(all(0 <= x < w and 0 <= y < h for x, y in points),
                f"{context}: {name} outside image")
    if marks["top"] is not None and marks["sole"] is not None:
        require(marks["sole"][1] > marks["top"][1], f"{context}: sole must be below top")
    return {"obs": obs, "path": path, "data": pixels, "mime": "image/png"}


def measurement(obs, check):
    kind = check["kind"]
    marks = obs["marks"]
    points = [marks[p] for p in check["points"]]
    if any(p is None for p in points):
        return None, None
    if kind == "count":
        value = len(points[0])
        return value, (value, value)
    if marks["top"] is None or marks["sole"] is None:
        return None, None
    scale = marks["sole"][1] - marks["top"][1]
    # Each coordinate can move independently by error_px in either direction.
    error = 2 * obs["error_px"]
    if kind == "span":
        length = math.dist(*points)
        spread = math.sqrt(2) * error
        lower = max(0, length - spread)
    else:
        end = marks["sole"] if kind == "height" else points[1]
        axis = 0 if kind == "xgap" else 1
        length = end[axis] - points[0][axis]
        spread = error
        lower = length - spread
    value = 100 * length / scale
    if scale <= error:
        return value, None
    # Taking all four ratios also bounds signed gaps and points below the sole.
    limits = [100 * n / d for n in (lower, length + spread) for d in (scale - error, scale + error)]
    return value, (min(limits), max(limits))


def measure_pair(check, reference, candidate, include_ranges=False):
    a, a_range = measurement(reference, check)
    b, b_range = measurement(candidate, check)
    delta = b - a if a is not None and b is not None else None
    result = dict(reference=a, candidate=b, delta=delta, interval=None, status="REVIEW")
    if include_ranges:
        result.update(reference_interval=a_range, candidate_interval=b_range)
    if a_range is None or b_range is None:
        result["reason"] = ("required mark is hidden" if delta is None else
                            "annotation uncertainty reaches zero body height")
        return result
    low, high = b_range[0] - a_range[1], b_range[1] - a_range[0]
    result["interval"] = [low, high]
    t = check["tolerance"]
    if high < -t or low > t:
        result["status"] = "FAIL"
    elif (-t < low and high < t) or (low == high and -t <= low <= t):
        result["status"] = "PASS"
    else:
        result["reason"] = "uncertainty reaches the tolerance boundary"
    return result


def same_feature_centers(first, second, allowance):
    """Find a one-to-one pairing of overlapping pixel boxes, independent of list order."""
    if len(first) != len(second):
        return False
    neighbors = [[j for j, (x2, y2) in enumerate(second)
                  if max(abs(x1 - x2), abs(y1 - y2)) <= allowance] for x1, y1 in first]
    right_owner = {}
    for start in range(len(first)):
        queue = deque([start])
        parent = {}
        while queue:
            left = queue.popleft()
            available = None
            for right in neighbors[left]:
                if right in parent:
                    continue
                parent[right] = left
                if right not in right_owner:
                    available = right
                    break
                queue.append(right_owner[right])
            if available is not None:
                break
        else:
            return False
        # Reassign the alternating path back to the new center.
        reverse = {left: right for right, left in right_owner.items()}
        while available is not None:
            left = parent[available]
            right_owner[available] = left
            available = reverse.get(left)
    return True


def placement_disagreements(check, evidence, repeated):
    problems = []
    for role, original, repeat in zip(("reference", "candidate"), evidence, repeated):
        a, b = original["obs"], repeat["obs"]
        allowance = a["error_px"] + b["error_px"]
        kind = check["kind"]
        axes = {name: {1} for name in ("top", "sole")} if kind != "count" else {}
        used_axes = {"height": {1}, "gap": {1}, "xgap": {0}, "span": {0, 1}, "count": {0, 1}}
        for name in check["points"]:
            axes.setdefault(name, set()).update(used_axes[kind])
        for name, directions in axes.items():
            first, second = a["marks"][name], b["marks"][name]
            if first is None or second is None:
                continue
            if kind == "count":
                agree = same_feature_centers(first, second, allowance)
            else:
                agree = all(abs(first[i] - second[i]) <= allowance for i in directions)
            if not agree:
                problems.append(f"{role} {name}: independent placements disagree")
    return problems


def compare(check, evidence, repeated):
    primary = measure_pair(check, *(e["obs"] for e in evidence), include_ranges=bool(repeated))
    row = {**check, **primary}
    if not repeated:
        return row
    second = measure_pair(check, *(e["obs"] for e in repeated), include_ranges=True)
    disagreements = placement_disagreements(check, evidence, repeated)
    if primary["status"] != second["status"]:
        disagreements.append("primary and repeat verdicts differ")
    elif primary["status"] == "FAIL" and ((primary["delta"] < 0) != (second["delta"] < 0)):
        disagreements.append("primary and repeat fail in opposite directions")
    for key in ("reference_interval", "candidate_interval"):
        first, other = primary[key], second[key]
        if first is not None and other is not None and (first[1] < other[0] or other[1] < first[0]):
            disagreements.append(f"{key.split('_')[0]} measurement intervals do not overlap")
    row.update(primary=primary, repeat=second, repeat_disagreements=disagreements)
    if disagreements:
        row.update(status="REVIEW", reason="; ".join(disagreements))
    return row


def assess_alignment(checks, ids):
    # Classify controls using the two-pass outcomes before changing any row.
    by_id = {row["id"]: row for row in checks}
    unresolved = [cid for cid in ids if by_id[cid]["status"] != "PASS"]
    if unresolved:
        reason = ("input alignment needs review before interpreting proportions; check "
                  + ", ".join(unresolved))
        for row in checks:
            if row["kind"] != "count" or row.get("requires_alignment"):
                row["alignment_status_before"] = row["status"]
                if "reason" in row:
                    row["alignment_reason_before"] = row["reason"]
                row.update(status="REVIEW", reason=reason)
    return {"status": "REVIEW" if unresolved else "PASS", "ids": ids, "unresolved_ids": unresolved}


def escape(value):
    return html.escape(str(value), quote=True)


def panel(title, evidence):
    obs = evidence["obs"]
    w, h = obs["width"], obs["height"]
    encoded = base64.b64encode(evidence["data"]).decode("ascii")
    image = f'<image width="{w}" height="{h}" href="data:{evidence["mime"]};base64,{encoded}"/>'
    scale = max(w, h) / 100
    marks = []
    for name, value in obs["marks"].items():
        if value is None:
            continue
        single = is_point(value)
        for idx, (x, y) in enumerate([value] if single else value, start=1):
            label_text = name if single else f"{name} {idx}"
            marks.append(f'<g><title>{escape(label_text)} ({x}, {y})</title>'
                         f'<circle cx="{x}" cy="{y}" r="{scale * .32}" fill="#ffd751" '
                         f'stroke="black" stroke-width="{scale * .12}"/>'
                         f'<text x="{x}" y="{y}" dx="{scale * .4}" dy="{-scale * .4}" '
                         f'font-size="{scale * 1.7}" stroke-width="{scale * .18}" '
                         f'stroke="black" paint-order="stroke" fill="white">{escape(label_text)}</text></g>')
    return (f'<figure><figcaption>{title} · {escape(obs["image"])}</figcaption>'
            f'<svg role="img" aria-label="{title} landmark overlay" viewBox="0 0 {w} {h}">'
            f'{image}{"".join(marks)}</svg><code>SHA-256 {escape(obs["sha256"])}</code></figure>')


def evidence_section(heading, contract, evidence):
    rows = []
    for name, definition in contract["landmarks"].items():
        values = [json.dumps(e["obs"]["marks"][name]) for e in evidence]
        cells = "".join(f"<td>{escape(v)}</td>" for v in (name, definition, *values))
        rows.append(f"<tr>{cells}</tr>")
    return (heading + '<main>' + panel("Reference", evidence[0]) + panel("Candidate", evidence[1])
            + '</main><h3>Landmarks</h3><table><tr><th>Name</th><th>Definition</th><th>Reference</th>'
            '<th>Candidate</th></tr>' + "".join(rows) + '</table>')


def write_overlay(path, contract, report, evidence, repeated):
    sections = evidence_section('<h2>Primary annotations</h2>' if repeated else '', contract, evidence)
    if repeated:
        sections += evidence_section('<h2>Repeat annotations</h2>', contract, repeated)
    document = ('<!doctype html><html lang="en"><meta charset="utf-8"><title>Landmark comparison</title>'
                '<style>body{font:16px system-ui;margin:2rem}main{display:grid;grid-template-columns:'
                'repeat(2,minmax(0,1fr));gap:1rem}figure{margin:0}svg{width:100%;height:auto}'
                'code,pre,td{overflow-wrap:anywhere}pre{white-space:pre-wrap}table{border-collapse:'
                'collapse}th,td{text-align:left;padding:.35em;border:1px solid #aaa}</style>'
                f'<h1>{escape(report["view"])} · {report["status"]}</h1>'
                + sections + '<h2>Checks</h2><pre>'
                + escape(json.dumps(report, indent=2, ensure_ascii=False)) + '</pre></html>')
    # Replace only after encoding and writing succeeded. Replacing the entry
    # avoids truncating linked files, even if another writer changes it.
    with tempfile.TemporaryDirectory(dir=path.parent) as directory:
        temporary = Path(directory) / "report.html"
        temporary.write_text(document, encoding="utf-8")
        temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("contract", type=Path)
    parser.add_argument("candidate", type=Path)
    parser.add_argument("--overlay", type=Path, metavar="REPORT.html")
    parser.add_argument("--contract-sha256", metavar="EXPECTED",
                        help="require an independently recorded digest of the exact contract file")
    parser.add_argument("--candidate-image-sha256", metavar="EXPECTED",
                        help="require the exact candidate render named by an independent digest")
    parser.add_argument("--repeat", type=Path, metavar="ANNOTATIONS.json",
                        help="compare an independent reference and candidate annotation pair")
    args = parser.parse_args()
    try:
        contract, contract_hash = read_json(args.contract)
        if args.contract_sha256 is not None:
            require(args.contract_sha256.lower() == contract_hash, "contract SHA-256 differs from expected")
        types = validated_contract(contract)
        reference = observation(contract["reference"], args.contract.parent, contract, types, "reference")
        candidate_obs, candidate_hash = read_json(args.candidate)
        candidate = observation(candidate_obs, args.candidate.parent, contract, types, "candidate")
        if args.candidate_image_sha256 is not None:
            require(args.candidate_image_sha256.lower() == candidate_obs["sha256"].lower(),
                    "candidate image SHA-256 differs from expected")
        evidence = (reference, candidate)
        repeated = []
        if args.repeat:
            pair, repeat_hash = read_json(args.repeat)
            fields(pair, "reference candidate", "repeat")
            for role, original in zip(("reference", "candidate"), evidence):
                item = observation(pair[role], args.repeat.parent, contract, types, f"repeat {role}")
                require(item["obs"]["sha256"].lower() == original["obs"]["sha256"].lower(),
                        f"repeat {role}: image SHA-256 differs from primary")
                repeated.append(item)
        checks = [compare(c, evidence, repeated) for c in contract["checks"]]
        alignment = None
        if "alignment_checks" in contract:
            alignment = assess_alignment(checks, contract["alignment_checks"])
        statuses = {c["status"] for c in checks}
        status = next(s for s in ("FAIL", "REVIEW", "PASS") if s in statuses)
        report = {"status": status, "view": contract["view"], "contract_sha256": contract_hash,
                  "candidate_sha256": candidate_hash, "reference_image_sha256": reference["obs"]["sha256"].lower(),
                  "candidate_image_sha256": candidate["obs"]["sha256"].lower(), "checks": checks}
        if alignment:
            report["alignment"] = alignment
        if repeated:
            report["repeat_sha256"] = repeat_hash
        output = json.dumps(report, allow_nan=False)
        if args.overlay:
            inputs = [args.contract.resolve(), args.candidate.resolve(), reference["path"], candidate["path"]]
            if args.repeat:
                inputs.extend([args.repeat.resolve(), *(item["path"] for item in repeated)])
            destination = args.overlay.resolve()
            require(destination not in inputs and
                    not (destination.exists() and any(destination.samefile(p) for p in inputs)),
                    "overlay would overwrite an input")
            require(not destination.exists() or destination.is_file(), "overlay must be a regular file")
            write_overlay(destination, contract, report, evidence, repeated)
    except (OSError, ValueError, OverflowError, RuntimeError) as exc:
        print(f"check_proportions: {exc}", file=sys.stderr)
        print(json.dumps({"status": "ERROR", "error": str(exc)}))
        return EXIT_CODES["ERROR"]
    print(output)
    return EXIT_CODES[status]


if __name__ == "__main__":
    sys.exit(main())
