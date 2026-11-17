"""Install the authored Samurai archive GLB as Shogun."""
import sys
from pathlib import Path

from authoring.prototypes.archive_rig import rename_rig


def install(stage, bay):
    rename_rig(stage / 'gatecrasher.glb', bay / 'shogun.glb', 'GATECRASHER / Rig', 'SHOGUN / Rig')


if __name__ == '__main__':
    install(Path(sys.argv[1]).resolve(), Path(__file__).resolve().parents[1] / 'dist/rig-bench/prototypes')
