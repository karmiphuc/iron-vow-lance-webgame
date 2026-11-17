"""Install the Gatecrasher R2 archive GLB and keep the original as Hellbreaker."""
import shutil
import sys
from pathlib import Path

from authoring.prototypes.archive_rig import rename_rig


def install(stage, bay):
    original = bay / 'gatecrasher.glb'
    hellbreaker = bay / 'hellbreaker.glb'
    if not hellbreaker.exists():
        rename_rig(original, hellbreaker, 'GATECRASHER / Rig', 'HELLBREAKER / Rig')
    shutil.copyfile(stage / 'gatecrasher.glb', original)


if __name__ == '__main__':
    install(Path(sys.argv[1]).resolve(), Path(__file__).resolve().parents[1] / 'dist/rig-bench/prototypes')
