"""Run the offline image and Blender regression suites from any working directory."""
import os
from pathlib import Path
import shutil
import subprocess
import sys


def main():
    scripts = Path(__file__).resolve().parent
    blender = shutil.which(os.environ.get("BLENDER_BIN", "blender"))
    if not blender or not shutil.which("ffmpeg"):
        sys.exit("Install FFmpeg and Blender on PATH, or set BLENDER_BIN to the Blender executable.")
    subprocess.run([sys.executable, str(scripts / "test_proportions.py")], check=True)
    subprocess.run([blender, "--background", "--factory-startup", "--disable-autoexec",
                    "--python-exit-code", "1", "--python", str(scripts / "test_rig.py")], check=True)


if __name__ == "__main__":
    main()
