"""Rename a rig in an archive GLB without rewriting its geometry or clips."""
import json
import struct


def rename_rig(source, destination, original_name, archive_name):
    data = source.read_bytes()
    magic, version, _, json_length, kind = struct.unpack_from('<4sIIII', data)
    if (magic, version, kind) != (b'glTF', 2, 0x4E4F534A):
        raise ValueError(f'{source} is not a glTF 2.0 binary')
    end = 20 + json_length
    scene = json.loads(data[20:end])
    rig, = (node for node in scene['nodes'] if node.get('name') == original_name)
    rig['name'] = archive_name
    body = json.dumps(scene, separators=(',', ':')).encode()
    body += b' ' * (-len(body) % 4)
    tail = data[end:]
    header = struct.pack('<4sIIII', magic, version, 20 + len(body) + len(tail), len(body), kind)
    destination.write_bytes(header + body + tail)
