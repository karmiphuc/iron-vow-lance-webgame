"""Create a single-file, offline build of the campaign."""
import base64
import json
import mimetypes
import re
import sys
from pathlib import Path

dist = Path(__file__).resolve().parents[1] / "dist"
site = "https://iron-vow-mercenary-command.karmi-nguyen.chatgpt.site/"
types = {".woff2": "font/woff2", ".wav": "audio/wav"}
assets = {
    str(path.relative_to(dist)): (
        f"data:{types.get(path.suffix) or mimetypes.guess_type(path)[0]};base64,"
        + base64.b64encode(path.read_bytes()).decode("ascii")
    )
    for path in sorted((dist / "assets").rglob("*"))
    if path.suffix in {".webp", ".svg", ".mp3", ".wav", ".woff2"}
}

arsenal = dist / "rig-bench" / "weapons.glb"
assets["rig-bench/weapons.glb"] = (
    "data:model/gltf-binary;base64," + base64.b64encode(arsenal.read_bytes()).decode("ascii")
)

def stylesheet(path):
    css = (dist / path).read_text()
    css = re.sub(r"@import url\(['\"]?([^'\")]+)['\"]?\);", lambda match: stylesheet(match[1]), css)
    return re.sub(r"url\(['\"]?(assets/[^'\")]+)['\"]?\)", lambda match: f"url('{assets[match[1]]}')", css)

def script(path):
    content = (dist / path).read_text().replace("</script", "<\\/script")
    if path == "game.js":
        for link in ("rig-bench/index.html", "rig-bench/prototypes/", "foundry/studio.html"):
            content = content.replace(f'href="{link}"', f'href="{site}{link}"')
    return f"<script>{content}</script>"

page = (dist / "index.html").read_text()
page = re.sub(r'<link rel="preload" as="image" href="assets/hangar.webp">', "", page)
page = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: f"<style>{stylesheet(m[1])}</style>", page)
page = re.sub(r'src="(assets/[^"]+)"', lambda m: f'src="{assets[m[1]]}"', page)
page = page.replace("</head>", '<script>window.IRON_VOW_INLINE_ASSETS=' + json.dumps(assets, separators=(",", ":")) + ";</script></head>")
page = re.sub(r'<script(?: defer)? src="([^"]+)"></script>', lambda m: script(m[1]), page)
output = Path(sys.argv[1])
output.write_text(page)
print(f"{output.name} · {output.stat().st_size:,} bytes · {len(assets)} embedded assets")
