"""Exercise the image review CLI with paired PNGs generated in a temporary directory."""
import copy
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest
import zlib

CHECKER = Path(__file__).with_name('check_proportions.py')


def write_observation(folder, label, marks, size=100, error=0):
    # Paint the declared landmarks into each synthetic image so the overlay is inspectable.
    pixels = [bytearray([245] * size) for _ in range(size)]
    for value in marks.values():
        if not value:
            continue
        points = value if isinstance(value[0], list) else [value]
        for x, y in points:
            pixels[y][x] = 20
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data))
    raw = b''.join(b'\0' + row for row in pixels)
    data = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>2I5B', size, size, 8, 0, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b''))
    image = folder / (label + '.png')
    image.write_bytes(data)
    return dict(image=image.name, sha256=hashlib.sha256(data).hexdigest(), width=size, height=size,
                view='standing front', marks=marks, error_px=error)


class ProportionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        self.marks = dict(top=[50, 5], sole=[50, 85], hip=[50, 45], elbow=[30, 32],
                          wrist=[32, 50], slots=[[49, 46], [50, 49]])
        self.ref = write_observation(self.folder, 'source', self.marks)
        self.checks = [
            dict(id='hip', kind='height', points=['hip'], tolerance=2),
            dict(id='forearm', kind='span', points=['elbow', 'wrist'], tolerance=2),
            dict(id='drop', kind='gap', points=['hip', 'wrist'], tolerance=2),
            dict(id='slots', kind='count', points=['slots'], tolerance=0)]
        self.contract = dict(view=self.ref['view'], reference=self.ref, checks=self.checks,
                             landmarks={name:'Fixture ' + name for name in self.marks})

    def run_case(self, code, candidate=None, contract=None, args=()):
        candidate = self.ref if candidate is None else candidate
        contract = self.contract if contract is None else contract
        for name, record in [('contract', contract), ('candidate', candidate)]:
            (self.folder / (name + '.json')).write_text(json.dumps(record))
        proc = subprocess.run([sys.executable, str(CHECKER), 'contract.json', 'candidate.json', *args],
                              cwd=self.folder, text=True, capture_output=True)
        self.assertEqual(proc.returncode, code, proc.stdout + proc.stderr)
        return json.loads(proc.stdout)

    def test_scale_and_translation(self):
        marks = {}
        for name, value in self.marks.items():
            points = value if name == 'slots' else [value]
            scaled = [[2*x + 4, 2*y + 7] for x, y in points]
            marks[name] = scaled if name == 'slots' else scaled[0]
        cand = write_observation(self.folder, 'larger', marks, size=200)
        args = ['--overlay', 'evidence.html']
        report = self.run_case(0, cand, args=args)
        self.assertEqual(report, self.run_case(0, cand, args=args))
        self.assertTrue(all(abs(row['delta']) < 1e-6 for row in report['checks']))
        self.assertIn('data:image/png;base64,', (self.folder/'evidence.html').read_text())

    def test_direction_and_location(self):
        marks = copy.deepcopy(self.marks)
        marks['hip'][1] += 8
        marks['wrist'][1] -= 8
        marks['slots'].pop()
        cand = write_observation(self.folder, 'changed', marks)
        rows = {r['id']:r for r in self.run_case(1, cand)['checks']}
        self.assertEqual(rows['hip']['delta'], -10)
        self.assertLess(rows['forearm']['delta'], -5)
        self.assertEqual(rows['drop']['delta'], -20)
        self.assertEqual(rows['slots']['delta'], -1)
        self.assertTrue(all(row['status'] == 'FAIL' for row in rows.values()))

    def test_unknown_and_mixed(self):
        marks = dict(self.marks, wrist=None)
        cand = write_observation(self.folder, 'hidden', marks)
        rows = {r['id']:r['status'] for r in self.run_case(3, cand)['checks']}
        self.assertEqual(rows, dict(hip='PASS', forearm='REVIEW', drop='REVIEW', slots='PASS'))
        cand['marks']['slots'] = []
        self.run_case(1, cand)

    def test_uncertainty_straddles_threshold(self):
        self.contract['checks'] = self.checks[:1]
        marks = dict(self.marks, hip=[50,47])
        cand = write_observation(self.folder,'borderline',marks,error=1)
        self.assertEqual(self.run_case(3,cand)['checks'][0]['status'],'REVIEW')

    def test_stale_and_wrong_view(self):
        for change in [dict(view='profile'), dict(sha256='0'*64), dict(width=101)]:
            with self.subTest(change=change):
                self.run_case(2, dict(self.ref, **change))

    def test_incomplete_contract(self):
        for bad in [[], [self.checks[0]] * 2, [dict(self.checks[0], kind='unknown')]]:
            with self.subTest(bad=bad):
                self.run_case(2, contract=dict(self.contract, checks=bad))

    def test_contract_pin(self):
        original = hashlib.sha256(json.dumps(self.contract).encode()).hexdigest()
        args = ['--contract-sha256', original]
        self.run_case(0, args=args)
        self.checks[0]['tolerance'] = 90
        self.run_case(2, args=args)

    def test_wrong_delivery_and_duplicate_features(self):
        self.run_case(2, args=['--candidate-image-sha256','0'*64])
        cand = copy.deepcopy(self.ref)
        cand['marks']['slots'] = [[50, 49], [50, 49]]
        self.run_case(2, cand)
        before = (self.folder/self.ref['image']).read_bytes()
        self.run_case(2, args=['--overlay',self.ref['image']])
        self.assertEqual(before, (self.folder/self.ref['image']).read_bytes())

    def test_independent_annotation_disagreement(self):
        marks = dict(self.marks, hip=[50, 47])
        cand = write_observation(self.folder, 'border', marks)
        second = copy.deepcopy(cand)
        second['marks']['hip'] = [50, 46]
        repeat = self.folder/'repeat.json'
        repeat.write_text(json.dumps({'reference': self.ref, 'candidate': second}))
        self.contract['checks'] = self.checks[:1]
        self.run_case(1, cand)
        report = self.run_case(3, cand, args=['--repeat','repeat.json'])
        self.assertEqual(report['checks'][0]['status'],'REVIEW')
        repeat.write_text(json.dumps({'reference': self.ref, 'candidate': self.ref}))
        self.run_case(2, cand, args=['--repeat','repeat.json'])

    def test_view_calibration_defers_geometry_only(self):
        self.contract['alignment_checks'] = ['hip']  # treated as a stable control in this fixture
        marks = dict(self.marks, hip=[50,55], wrist=[32,63])
        cand = write_observation(self.folder, 'bad-registration', marks)
        result = self.run_case(3, cand)
        self.assertEqual(result['alignment']['status'],'REVIEW')
        rows = {r['id']:r for r in result['checks']}
        self.assertEqual(rows['forearm']['alignment_status_before'],'FAIL')
        self.assertEqual(rows['forearm']['status'],'REVIEW')
        self.assertEqual(rows['slots']['status'],'PASS')
        cand = write_observation(self.folder, 'bad-registration-and-detail', dict(marks,slots=[]))
        self.assertEqual(self.run_case(1, cand)['status'],'FAIL')

    def test_pinned_incomplete_image(self):
        data = (self.folder / self.ref['image']).read_bytes()
        for invalid in (data[:33], data[:33] + data[-12:]):
            (self.folder / 'bad.png').write_bytes(invalid)
            digest = hashlib.sha256(invalid).hexdigest()
            report = self.run_case(2, dict(self.ref, image='bad.png', sha256=digest),
                                   args=['--candidate-image-sha256', digest, '--overlay', 'bad.html'])
            self.assertEqual(report['status'], 'ERROR')
            self.assertFalse((self.folder / 'bad.html').exists())

    def test_exif_rotation_uses_displayed_coordinates(self):
        encoded = subprocess.run(
            ['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'color=white:size=80x100',
             '-frames:v', '1', '-c:v', 'mjpeg', '-f', 'image2pipe', 'pipe:1'],
            capture_output=True, check=True).stdout
        tiff = b'MM\x00*\x00\x00\x00\x08\x00\x01' + struct.pack('>HHIHH', 0x0112, 3, 1, 6, 0) + bytes(4)
        exif = b'Exif\0\0' + tiff
        jpeg = encoded[:2] + b'\xff\xe1' + struct.pack('>H', len(exif) + 2) + exif + encoded[2:]
        (self.folder / 'rotated.jpg').write_bytes(jpeg)
        marks = dict(self.marks, sole=[50,75])
        rotated = dict(self.ref, image='rotated.jpg', sha256=hashlib.sha256(jpeg).hexdigest(),
                       width=100, height=80, marks=marks)
        report = self.run_case(0, rotated, dict(self.contract, reference=rotated),
                               args=['--overlay','rotated.html'])
        self.assertEqual(report['candidate_image_sha256'], rotated['sha256'])
        overlay = (self.folder/'rotated.html').read_text()
        self.assertIn('viewBox="0 0 100 80"', overlay)
        self.assertIn('data:image/png;base64,', overlay)
        self.run_case(2, dict(rotated, width=80, height=100))

    def test_signed_horizontal_alignment(self):
        horizontal = dict(id='handedness', kind='xgap', points=['hip', 'elbow'], tolerance=4)
        self.contract.update(checks=[*self.checks, horizontal], alignment_checks=['handedness'])
        self.run_case(0)
        mirror = lambda p: [99 - p[0], p[1]]
        flipped = {k: [mirror(p) for p in v] if k == 'slots' else mirror(v)
                   for k, v in self.marks.items()}
        cand = write_observation(self.folder, 'mirror', flipped)
        result = self.run_case(3, cand)
        self.assertEqual(result['alignment']['unresolved_ids'], ['handedness'])
        self.assertEqual(result['checks'][-1]['delta'], 50)
        self.assertEqual(result['checks'][3]['status'], 'PASS')
        self.checks[3]['requires_alignment'] = True
        cand['marks']['slots'] = []
        count = self.run_case(3, cand)['checks'][3]
        self.assertEqual(count['status'], 'REVIEW')
        self.assertEqual(count['alignment_status_before'], 'FAIL')

    def test_anchor_cannot_validate_its_own_scale(self):
        for kind, points in [('height', ['top']), ('height',['sole']), ('gap',['top','sole'])]:
            bad = dict(id='control', kind=kind, points=points, tolerance=2)
            self.run_case(2, contract=dict(self.contract, checks=[*self.checks,bad],
                                           alignment_checks=['control']))

    def test_repeat_feature_centers(self):
        self.contract['checks'] = self.checks[-1:]
        self.ref['error_px'] = 1
        cases = [
            # At combined allowance 2, matching first-to-first greedily fails.
            ([[50,50], [53,50]], [[51,50], [49,50]], 0),
            ([[50,50], [53,50]], [[49,50], [51,50]], 0),
            ([[50,50], [53,50]], [[49,50], [90,20]], 3),
            # Two candidates cannot claim the same repeat center.
            ([[50,50], [52,50]], [[51,50], [58,50]], 3),
            ([], [], 0)]
        for first, other, expected in cases:
            with self.subTest(first=first, other=other):
                self.ref['marks']['slots'] = first
                second = copy.deepcopy(self.ref)
                second['marks']['slots'] = other
                (self.folder/'repeat.json').write_text(json.dumps({'reference': self.ref, 'candidate': second}))
                result = self.run_case(expected, args=['--repeat','repeat.json'])
                self.assertEqual(bool(result['checks'][0]['repeat_disagreements']), expected == 3)

    def test_repeat_span_cannot_move_both_pivots_together(self):
        second = copy.deepcopy(self.ref)
        for name in ('elbow', 'wrist'):
            second['marks'][name][0] += 20
        (self.folder/'repeat.json').write_text(json.dumps({'reference': self.ref,'candidate': second}))
        result = self.run_case(3, args=['--repeat','repeat.json'])
        self.assertEqual([r['id'] for r in result['checks'] if r['status'] == 'REVIEW'], ['forearm'])


if __name__ == '__main__':
    unittest.main()
