#!/usr/bin/env python3
"""Prepare the small, licensed Kenney perimeter-building selection (no network).

Usage: python3 tools/authoring/prepare_industrial_assets.py --source PACK.zip
The default output is dist/assets/environment/industrial relative to this repo.
"""
import argparse
import hashlib
import json
import struct
import zipfile
from pathlib import Path

SOURCE_SHA256 = '5b381164e5760f3830a2dbee43b972deee38b2a695d091b56e238ab2910c96d2'
MODELS = {'building-b.glb': 'industrial-office', 'building-i.glb': 'warehouse',
          'building-m.glb': 'factory'}
BASE = 'Models/GLB format/'


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def inspect_glb(data):
    magic, version, length = struct.unpack_from('<III', data)
    assert (magic, version, length) == (0x46546C67, 2, len(data)), 'Invalid GLB header'
    count, kind = struct.unpack_from('<II', data, 12)
    assert kind == 0x4E4F534A, 'Missing glTF JSON chunk'
    gltf = json.loads(data[20:20 + count])
    # These selected originals have mesh-only identity nodes. Reject a changed
    # pack rather than reporting local accessor bounds as world-space bounds.
    for node in gltf['nodes']:
        assert not any(k in node for k in ('matrix', 'translation', 'rotation', 'scale')), 'Unexpected node transform'
    low, high, triangles = [float('inf')] * 3, [-float('inf')] * 3, 0
    for mesh in gltf['meshes']:
        for primitive in mesh['primitives']:
            assert primitive.get('mode', 4) == 4, 'Expected triangle meshes'
            accessor = gltf['accessors'][primitive['attributes']['POSITION']]
            low = [min(a, b) for a, b in zip(low, accessor['min'])]
            high = [max(a, b) for a, b in zip(high, accessor['max'])]
            indices = gltf['accessors'][primitive['indices']]['count'] if 'indices' in primitive else accessor['count']
            assert indices % 3 == 0
            triangles += indices // 3
    textures = sorted(image['uri'] for image in gltf['images'])
    assert textures == ['Textures/colormap.png'], 'Unexpected texture dependency'
    assert triangles < 3000, 'Building exceeds triangle budget'
    return {'bytes': len(data), 'sha256': sha256(data), 'triangles': triangles,
            'bounds': {'min': low, 'max': high},
            'dimensions': [b - a for a, b in zip(low, high)], 'textures': textures}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--out', type=Path, default=Path(__file__).resolve().parents[2] / 'dist/assets/environment/industrial')
    args = parser.parse_args()
    archive = args.source.read_bytes()
    assert sha256(archive) == SOURCE_SHA256, 'Expected the verified Kenney City Kit Industrial 2.0 archive'
    with zipfile.ZipFile(args.source) as pack:
        license_bytes = pack.read('License.txt')
        license_text = license_bytes.decode('utf8')
        assert 'Created/distributed by Kenney' in license_text and 'Creative Commons Zero, CC0' in license_text
        files = {'License.txt': license_bytes,
                 'Textures/colormap.png': pack.read(BASE + 'Textures/colormap.png')}
        manifest = {'pack': 'Kenney City Kit Industrial 2.0', 'author': 'Kenney',
                    'license': 'CC0-1.0', 'license_url': 'https://creativecommons.org/publicdomain/zero/1.0/',
                    'source_page': 'https://kenney.nl/assets/city-kit-industrial',
                    'creator_upload': 'https://opengameart.org/content/city-kit-industrial',
                    'download': 'https://opengameart.org/sites/default/files/kenney_city-kit-industrial_2.0.zip',
                    'archive_sha256': SOURCE_SHA256, 'models': {}}
        for name, role in MODELS.items():
            files[name] = pack.read(BASE + name)
            manifest['models'][name] = {'role': role, **inspect_glb(files[name])}
        manifest['texture'] = {'file': 'Textures/colormap.png', 'bytes': len(files['Textures/colormap.png']),
                               'sha256': sha256(files['Textures/colormap.png'])}
        files['manifest.json'] = (json.dumps(manifest, indent=2, sort_keys=True) + '\n').encode()
        assert sum(map(len, files.values())) < 2_000_000, 'Selected asset download exceeds 2 MB'
        for relative, data in files.items():
            destination = args.out / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(data)
        print(f"PASS Kenney CC0 industrial assets: {len(MODELS)} GLBs, "
              f"{sum(m['triangles'] for m in manifest['models'].values())} triangles, "
              f"{sum(map(len, files.values()))} bytes; all texture references verified")


if __name__ == '__main__':
    main()
