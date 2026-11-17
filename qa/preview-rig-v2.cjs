#!/usr/bin/env node
// Load a rig-v2 GLB with the game's browser decoder, pose a joint, and render it.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { readGLB, renderedTriangles, validate } = require('./check-rig-v2.cjs');

function subtreeTriangles(gltf, name) {
  const node = gltf.nodes.findIndex(candidate => candidate.name === name);
  assert.notEqual(node, -1, `Missing GLB attachment ${name}`);
  return renderedTriangles({ ...gltf, scenes: [{ nodes: [node] }], scene: 0 });
}

async function previewRig({ file, screenshot, matrix = false, cicada = false, rigid = false, primaryAnchor = 'muzzle.main', fit = false }) {
  const gltf = readGLB(file);
  const contract = validate(gltf);
  assert.ok(contract.ok, `${file}: ${contract.errors.join(', ')}`);
  const expected = contract.triangles;
  const root = path.join(__dirname, '../dist');
  const shieldFile = path.join(root, 'rig-bench/shields.glb');
  const shieldIds = ['bulwark-shield', 'citadel-shield'];
  const shieldGLB = matrix ? readGLB(shieldFile) : null;
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const executablePath = process.env.IRON_VOW_CHROME ||
    (fs.existsSync(chromium.executablePath()) ? undefined : fs.existsSync(chrome) ? chrome : undefined);
  const browser = await chromium.launch({
    executablePath,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 780, height: 650 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent('<body style="margin:0"><canvas id="view"></canvas></body>');
    const vendor = path.join(root, 'rig-bench/vendor');
    for (const name of ['three.min.js', 'GLTFLoader.js', 'meshopt-decoder.js']) {
      await page.addScriptTag({ path: path.join(vendor, name) });
    }
    if (matrix) await page.addScriptTag({ path: path.join(root, 'foundry/production-arsenal.js') });
    const result = await page.evaluate(async ({ source, shields, shieldIds, cicada, primaryAnchor, fit }) => {
      const T = window.THREE;
      const canvas = document.querySelector('#view');
      const renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(780, 650);
      renderer.outputEncoding = T.sRGBEncoding;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      const loader = new T.GLTFLoader().setMeshoptDecoder(window.MeshoptDecoder);
      const decode = source => Uint8Array.from(atob(source), char => char.charCodeAt(0)).buffer;
      const parse = source => new Promise((resolve, reject) => loader.parse(decode(source), '', resolve, reject));
      const model = (await parse(source)).scene;
      const bounds = new T.Box3().setFromObject(model);
      const center = bounds.getCenter(new T.Vector3());
      const scene = new T.Scene();
      scene.background = new T.Color(0x25292c);
      scene.add(model, new T.HemisphereLight(0xf4f5ff, 0x414446, 0.8));
      const key = new T.DirectionalLight(0xffe4c5, 1.6);
      key.position.set(3, 7, 8);
      const rim = new T.DirectionalLight(0xc5e9ff, 1.5);
      rim.position.set(-4, 3, -5);
      scene.add(key, rim);
      const camera = new T.PerspectiveCamera(33, 780 / 650, 0.1, 50);
      const viewOffset = cicada ? new T.Vector3(3.4, 1.5, 11) : new T.Vector3(4.0, 2.1, 11.0);
      if (fit) {
        const radius = bounds.getBoundingSphere(new T.Sphere()).radius;
        viewOffset.setLength(radius / Math.sin(T.MathUtils.degToRad(camera.fov / 2)));
      }
      camera.position.copy(center).add(viewOffset);
      camera.lookAt(center);
      let skinned = 0, tagged = 0;
      model.traverse(node => {
        if (node.isMesh) {
          node.frustumCulled = false;
          skinned += Number(Boolean(node.isSkinnedMesh));
          tagged += Number(Boolean(node.userData.part || node.geometry.userData.part));
        }
      });
      const get = name => model.getObjectByName(T.PropertyBinding.sanitizeNodeName(name));
      const probe = (jointName, anchorName, otherAnchorName) => {
        const joint = get(jointName);
        const anchor = get(anchorName);
        const other = otherAnchorName ? get(otherAnchorName) : null;
        const previous = anchor.getWorldPosition(new T.Vector3());
        const otherPrevious = other?.getWorldPosition(new T.Vector3());
        const rotation = joint.quaternion.clone();
        joint.rotateX(0.3);
        const movement = anchor.getWorldPosition(new T.Vector3()).distanceTo(previous);
        const oppositeMovement = other?.getWorldPosition(new T.Vector3()).distanceTo(otherPrevious);
        joint.quaternion.copy(rotation);
        return { anchor: anchorName, movement, oppositeMovement };
      };
      const motion = cicada ? [
        probe('Pod.L', 'muzzle.locust.L', 'muzzle.locust.R'),
        probe('Pod.R', 'muzzle.locust.R', 'muzzle.locust.L'),
      ] : [probe('elbow.R', primaryAnchor)];
      renderer.render(scene, camera);
      const triangles = renderer.info.render.triangles;
      const loadouts = [];
      let shieldTravel;
      if (shields) {
        const arsenal = window.IronVowProductionArsenal;
        const stock = await arsenal.load(decode(shields));
        const socket = get('socket.L');
        const shoulder = get('mount.shoulderR');
        const cleaverMeshes = socket.children.slice();
        const mounts = shieldIds.map(id => arsenal.mountShield(stock, id, socket));
        for (const shield of mounts) {
          if (!shield?.grip || !shield.face) throw Error('Mounted shield has no grip or face anchor');
          shield.mount.traverse(node => { node.frustumCulled = false; });
        }
        const unit = { alive: true, hp: { left: 100 } };
        const wrist = get('wrist.L');
        const wristRest = wrist.quaternion.clone();
        const before = mounts[0].grip.getWorldPosition(new T.Vector3());
        wrist.rotateX(0.26);
        shieldTravel = mounts[0].grip.getWorldPosition(new T.Vector3()).distanceTo(before);
        wrist.quaternion.copy(wristRest);
        for (const shield of mounts) {
          arsenal.poseShield(shield, { alive: true, hp: { left: 0 } }, 0);
          if (shield.mount.visible) throw Error('Shield remained visible with a destroyed left arm');
        }
        for (const vesper of [false, true]) {
          shoulder.visible = vesper;
          for (const offhand of ['empty', 'cleaver', ...shieldIds]) {
            for (const mesh of cleaverMeshes) mesh.visible = offhand === 'cleaver';
            for (const [i, shield] of mounts.entries()) {
              const equipped = offhand === shieldIds[i];
              arsenal.poseShield(shield, unit, 0);
              shield.mount.visible = equipped;
            }
            renderer.render(scene, camera);
            const shield = mounts[shieldIds.indexOf(offhand)];
            loadouts.push({
              offhand, vesper, triangles: renderer.info.render.triangles,
              gripError: shield?.grip.getWorldPosition(new T.Vector3())
                .distanceTo(socket.getWorldPosition(new T.Vector3())),
            });
          }
        }
      }
      const context = renderer.getContext();
      const pixels = new Uint8Array(780 * 650 * 4);
      context.readPixels(0, 0, 780, 650, context.RGBA, context.UNSIGNED_BYTE, pixels);
      const colors = new Set();
      for (let i = 0; i < pixels.length; i += 4 * 97) {
        colors.add(pixels[i] * 65536 + pixels[i + 1] * 256 + pixels[i + 2]);
      }
      return {
        triangles, skinned, tagged, motion, shieldTravel, loadouts, colors: colors.size,
        glError: context.getError(),
      };
    }, {
      source: fs.readFileSync(file).toString('base64'),
      shields: matrix ? fs.readFileSync(shieldFile).toString('base64') : null,
      shieldIds,
      cicada,
      primaryAnchor,
      fit,
    });
    assert.equal(result.triangles, expected, 'WebGL draws all default-scene triangles');
    assert.ok(result.tagged > 0, 'Rendered asset includes part metadata');
    if (!rigid) assert.ok(result.skinned > 0, 'Rendered asset includes skinning');
    for (const { anchor, movement, oppositeMovement } of result.motion) {
      assert.ok(movement > 0.05, `${anchor} moved with its joint`);
      if (oppositeMovement !== undefined) assert.ok(oppositeMovement < 1e-8, `${anchor} pivots independently`);
    }
    assert.ok(result.colors > 100, 'Decoded model yields a nonblank framebuffer');
    if (matrix) {
      const cleaver = subtreeTriangles(gltf, 'socket.L');
      const shoulder = subtreeTriangles(gltf, 'mount.shoulderR');
      const chassis = expected - cleaver - shoulder;
      const offhandTriangles = new Map([
        ['empty', 0], ['cleaver', cleaver],
        ...shieldIds.map(id => [id, subtreeTriangles(shieldGLB, id)]),
      ]);
      assert.equal(result.loadouts.length, 8, 'Every legal rendered loadout was exercised');
      assert.ok(result.shieldTravel > 0.05, 'Shield grip follows the articulated wrist');
      for (const { offhand, vesper, triangles, gripError } of result.loadouts) {
        const label = `${offhand}${vesper ? ' + Vesper' : ''}`;
        assert.equal(triangles, chassis + (vesper ? shoulder : 0) + offhandTriangles.get(offhand), label);
        assert.ok(triangles <= 60000, `${label} exceeds the equipped triangle budget`);
        if (gripError !== undefined) {
          assert.ok(gripError < 1e-6, `${label} hand and shield grip coincide`);
        }
      }
    }
    assert.equal(result.glError, 0);
    assert.deepEqual(errors, []);
    fs.mkdirSync(path.dirname(screenshot), { recursive: true });
    if (path.extname(screenshot) === '.webp') {
      fs.writeFileSync(screenshot, await page.locator('canvas').evaluate(canvas => {
        return canvas.toDataURL('image/webp', 0.88).split(',')[1];
      }), 'base64');
    } else {
      await page.locator('canvas').screenshot({ path: screenshot });
    }
    return result;
  } finally {
    await browser.close();
  }
}

async function main() {
  const [file, output, directory, option] = process.argv.slice(2);
  const matrix = option === '--gatecrasher-loadouts';
  const cicada = option === '--cicada';
  if (!file || !output || (output === '--out') !== Boolean(directory) || (option && !matrix && !cicada)) {
    throw Error('Usage: node qa/preview-rig-v2.cjs asset.glb --out directory [--gatecrasher-loadouts | --cicada]');
  }
  const screenshot = directory ? path.join(directory, cicada ? 'cicada.webp' : 'gatecrasher.webp') : output;
  const result = await previewRig({ file, screenshot, matrix, cicada });
  const json = JSON.stringify(result, null, 2) + '\n';
  if (directory) fs.writeFileSync(path.join(directory, 'summary.json'), json);
  process.stdout.write(json);
}

module.exports = { previewRig, subtreeTriangles };
if (require.main === module) main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
