const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const { createCanvas } = require('@napi-rs/canvas');
const simulate = require('./sim-harness.cjs');

function countTriangles(root) {
  let count = 0;
  root.traverseVisible(node => {
    if (node.isMesh) count += (node.geometry.index ?? node.geometry.attributes.position).count / 3;
  });
  return count;
}

async function checkKitBudgets() {
  const dist = join(__dirname, '../dist');
  const sandbox = { atob, console, document: { createElement: () => createCanvas(32, 32) } };
  sandbox.window = sandbox.self = sandbox;
  vm.createContext(sandbox);
  for (const file of [
    'rig-bench/vendor/three.min.js', 'rig-bench/vendor/GLTFLoader.js', 'armory-visuals.js',
    'scene/weapon-fx.js', 'foundry/production-arsenal.js', 'foundry/behemoth-core.js', 'foundry/chassis.js',
  ]) {
    vm.runInContext(readFileSync(join(dist, file), 'utf8'), sandbox, { filename: file });
  }
  const { VowChassis, IronVowProductionArsenal: arsenal } = sandbox;
  const buffers = ['weapons', 'expansion-weapons', 'shields'].map(name => {
    const data = readFileSync(join(dist, 'rig-bench', name + '.glb'));
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  });
  const equipment = await arsenal.load(...buffers);
  const sim = simulate();
  const guns = [], offhand = [];
  for (const { id, melee } of sim.run('WEAPONS.filter(w=>!w.builtIn&&!w.shoulder)')) {
    const asset = sandbox.IronVowWeaponFX.get(id).asset ?? id;
    const mesh = equipment.getObjectByName(arsenal.assetNodeName(asset));
    assert.ok(mesh, 'Production model for ' + id);
    (melee ? offhand : guns).push({ asset, triangles: countTriangles(mesh) });
  }
  for (const { id } of sim.run('SHIELDS')) {
    const mesh = equipment.getObjectByName(id);
    assert.ok(mesh, 'Production shield model for ' + id);
    offhand.push({ asset: id, shield: true, triangles: countTriangles(mesh) });
  }
  const largest = list => list.reduce((a, b) => a.triangles >= b.triangles ? a : b);
  const gun = largest(guns), left = largest(offhand);
  const reports = {};
  for (const [model, name] of ['Aegis', 'Shrike', 'Citadel', 'Valkyrie', 'Oni', 'Behemoth'].entries()) {
    const rig = VowChassis.build(model, 'ally');
    const hull = countTriangles(rig.root);
    assert.ok(arsenal.mount(equipment, gun.asset, rig.rig.arms.R.so), name + ' fits ' + gun.asset);
    const leftMount = left.shield ? arsenal.mountShield : arsenal.mount;
    assert.ok(leftMount(equipment, left.asset, rig.rig.arms.L.so), name + ' fits ' + left.asset);
    const equipped = countTriangles(rig.root);
    for (const meshes of rig.kits) for (const mesh of meshes) mesh.visible = true;
    const upgraded = countTriangles(rig.root);
    assert.ok(upgraded <= 60000, name + ' draws ' + upgraded + ' equipped triangles including kits');
    reports[name] = { hull, equipped, upgraded, equipment: [gun.asset, left.asset] };
  }
  return reports;
}

if (require.main === module) {
  checkKitBudgets().then(reports => console.log('PASS procedural rig budgets', JSON.stringify(reports)))
    .catch(error => { console.error(error); process.exitCode = 1; });
}
module.exports = checkKitBudgets;
