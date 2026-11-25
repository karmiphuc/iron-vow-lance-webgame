// Fast Phase 3 checkpoint for committed Blender exports.
const fs = require('node:fs');
const path = require('node:path');
const { previewRig, subtreeTriangles } = require('./preview-rig-v2.cjs');
const { readGLB, validate } = require('./check-rig-v2.cjs');
const createSimulation = require('./sim-harness.cjs');
const checkBrowser = require('./check-browser.cjs');
const checkKitBudgets = require('./check-kit-budgets.cjs');
const checkBehemothBudget = require('./browser/behemoth-budget.cjs');
const checkVehicleScene = require('./browser/vehicles.cjs');
const checkGatecrasherScene = require('./browser/gatecrasher-v2.cjs');
const checkCicadaV2 = require('./browser/cicada-v2.cjs');
const checkReaver = require('./browser/reaver.cjs');
const checkVanguard = require('./browser/vanguard.cjs');
const checkAero = require('./browser/aero.cjs');
const checkStockV2 = require('./browser/stock-v2.cjs');
const checkAshigaruV2 = require('./browser/ashigaru-v2.cjs');
const checkHellbreakerV2 = require('./browser/hellbreaker-v2.cjs');
const checkShogunV2 = require('./browser/shogun-v2.cjs');
const checkBastionV2 = require('./browser/bastion.cjs');
const checkBulwark = require('./browser/bulwark-v2.cjs');
const checkLineInfantry = require('./browser/line-infantry.cjs');
const checkLineElite = require('./browser/line-elite.cjs');
const checkInfantryCarry = require('./browser/infantry-carry.cjs');
const checkLivePortraits = require('./browser/live-portraits.cjs');
const checkArmory = require('./browser/armory.cjs');
const checkAeroReview = require('./browser/aero-review.cjs');
const checkWardenRigBench = require('./browser/warden-rig-bench.cjs');

function checkWorkshopBudgets(assets) {
  const dir = path.resolve(assets, '../..');
  const sim = createSimulation();
  sim.sandbox.window.THREE = { GLTFLoader: true };
  for (const script of ['armory-visuals.js', 'scene/weapon-fx.js', 'foundry/production-arsenal.js']) {
    sim.run(fs.readFileSync(path.join(dir, script), 'utf8'));
  }
  const { IronVowProductionArsenal: arsenal, IronVowWeaponFX: effects } = sim.sandbox.window;
  const armory = ['weapons.glb', 'expansion-weapons.glb', 'shields.glb', 'salt-mg.glb'].map(file => readGLB(path.join(dir, 'rig-bench', file)));
  const main = [], offhand = [{ id: 'empty', triangles: 0 }];
  for (const { id, melee } of sim.run('WEAPONS.filter(weapon => !weapon.builtIn && !weapon.shoulder)')) {
    const name = arsenal.assetNodeName(effects.get(id).asset ?? id);
    const stock = armory.find(file => file.nodes.some(node => node.name === name));
    if (!stock) throw Error(`Missing Workshop equipment asset for ${id}`);
    (melee ? offhand : main).push({ id, triangles: subtreeTriangles(stock, name) });
  }
  for (const { id } of sim.run('SHIELDS')) {
    offhand.push({ id, triangles: subtreeTriangles(armory[2], id) });
  }
  const budgets = {};
  for (const frame of ['warden', 'aero', 'kestrel', 'basilisk', 'bastion']) {
    const gltf = readGLB(path.join(assets, frame + '.glb'));
    const contract = validate(gltf);
    if (!contract.ok) throw Error(contract.errors.join(', '));
    const weapons = new Map();
    if (frame === 'aero') {
      weapons.set('rifle', subtreeTriangles(gltf, 'MODULE | Kestrel scout carbine'));
      for (const id of sim.run('AERO_MELEE')) weapons.set(id, subtreeTriangles(gltf, 'melee.' + id));
    }
    if (frame === 'bastion') {
      const joint = name => gltf.nodes.find(node => node.name === name);
      const { legA, legB, py } = joint('root').extras;
      for (const [name, length] of [['pelvis', py], ['knee.L', legA], ['ankle.L', legB]]) {
        const measured = Math.hypot(...(joint(name).translation || [0, 0, 0]));
        if (Math.abs(measured - length) > .001) throw Error(`Bastion bind pivot ${name} is ${measured}, expected ${length}`);
      }
      for (const id of ['rifle', 'cleaver', 'breaker', 'piledriver']) weapons.set(id, subtreeTriangles(gltf, 'weapon.' + id));
    }
    const hull = contract.total - [...weapons.values()].reduce((total, count) => total + count, 0);
    if (frame === 'basilisk' || frame === 'bastion') weapons.set('missile', 0);
    const largest = items => items.map(item => ({ ...item, triangles: weapons.get(item.id) ?? item.triangles }))
      .reduce((a, b) => a.triangles > b.triangles ? a : b);
    const gun = largest(main), left = largest(offhand), equipped = hull + gun.triangles + left.triangles;
    if (equipped > 60000) throw Error(`${frame} ${gun.id} and ${left.id} draw ${equipped} triangles`);
    budgets[frame] = { triangles: contract.total, hull, equipped, heaviestLoadout: [gun.id, left.id] };
  }
  return budgets;
}

async function main() {
  const [flag, directory] = process.argv.slice(2);
  if (flag !== '--out' || !directory) throw Error('Usage: node qa/gate-phase3.cjs --out directory');
  require('./check-rig-v2-test.cjs');
  const assets = path.join(__dirname, '../dist/rig-bench/rig-v2');
  const kits = await checkKitBudgets();
  const { warden, aero, kestrel, basilisk, bastion } = checkWorkshopBudgets(assets);
  const scoutFile=readGLB(path.join(assets,'ashigaru.glb')),scout=validate(scoutFile);
  if(!scout.ok)throw Error(scout.errors.join(', '));
  const scoutWeapons=Object.fromEntries(['carbine','scatter','knife'].map(name=>[name,subtreeTriangles(scoutFile,'module.'+name)]));
  const scoutHull=scout.total-Object.values(scoutWeapons).reduce((a,b)=>a+b,0);
  const scoutEquipped=scoutHull+Math.max(scoutWeapons.carbine,scoutWeapons.scatter)+scoutWeapons.knife;
  if(scoutEquipped>60000)throw Error('Ashigaru equipped exceeds 60k triangles');
  const ashigaru={triangles:scout.total,hull:scoutHull,weapons:scoutWeapons,equipped:scoutEquipped};
  const bulwark = validate(readGLB(path.join(assets, 'bulwark.glb')));
  if (!bulwark.ok) throw Error(bulwark.errors.join(', '));
  const hellbreaker = validate(readGLB(path.join(assets, 'hellbreaker.glb')));
  if (!hellbreaker.ok) throw Error(hellbreaker.errors.join(', '));
  const gatecrasher = await previewRig({
    file: path.join(assets, 'gatecrasher-r2-reference.glb'),
    screenshot: path.join(directory, 'gatecrasher.webp'),
    matrix: true,
  });
  const shogun = await previewRig({
    file: path.join(assets, 'shogun.glb'),
    screenshot: path.join(directory, 'shogun.webp'),
    matrix: true,
    fit: true,
  });
  const cicada = await previewRig({
    file: path.join(assets, 'cicada-reference.glb'),
    screenshot: path.join(directory, 'cicada.webp'),
    cicada: true,
  });
  const infantry = {};
  for (const name of ['li-01', 'li-02']) {
    infantry[name] = await previewRig({
      file: path.join(assets, name + '.glb'),
      screenshot: path.join(directory, name + '.webp'),
      rigid: true,
    });
  }
  const vehicles = { desktop: null, touch: null };
  const liveGatecrasher = { desktop: null, touch: null };
  const reaver = await previewRig({
    file: path.join(assets, 'reaver.glb'),
    screenshot: path.join(directory, 'reaver.webp'),
    primaryAnchor: 'muzzle.R',
    rigid: true,
    fit: true,
  });
  const vanguard = await previewRig({
    file: path.join(assets, 'vanguard.glb'),
    screenshot: path.join(directory, 'vanguard.webp'),
    rigid: true,
    fit: true,
  });
  const live = { desktop: {}, touch: {} };
  function capture(test) {
    async function scenario(context) {
      const result = await test({ ...context, out: directory });
      live[context.mobile ? 'touch' : 'desktop'][test.name] = result ?? true;
    }
    return Object.defineProperty(scenario, 'name', { value: test.name });
  }
  await checkBrowser(undefined, [
    async function checkVehicles(context) {
      vehicles[context.mobile ? 'touch' : 'desktop'] = await checkVehicleScene({ ...context, out: directory });
    },
    async function checkGatecrasherV2(context) {
      const { gait, ...results } = await checkGatecrasherScene({ ...context, out: directory });
      liveGatecrasher[context.mobile ? 'touch' : 'desktop'] = { plantedFeet: gait.plantedPairs > 0, ...results };
    },
    capture(checkCicadaV2),
    capture(checkReaver),
    capture(checkVanguard),
    capture(checkAero),
    capture(checkStockV2),
    capture(checkAshigaruV2),
    capture(checkHellbreakerV2),
    capture(checkShogunV2),
    capture(checkBastionV2),
    capture(checkBulwark),
    capture(checkBehemothBudget),
    capture(checkLineInfantry),
    capture(checkLineElite),
    capture(checkInfantryCarry),
    capture(checkLivePortraits),
    capture(checkArmory),
    capture(checkAeroReview),
    capture(checkWardenRigBench),
  ]);
  const summary = { status: 'pass', seed: 4242, gatecrasher, liveGatecrasher, cicada, infantry, reaver, vanguard, warden, aero, kestrel, basilisk, bastion, ashigaru,
    kits, hellbreaker: { triangles: hellbreaker.total }, bulwark: { triangles: bulwark.total }, shogun, vehicles, live };
  fs.writeFileSync(path.join(directory, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log('PASS Phase 3 checkpoint: authored sortie rigs, tank and gunship');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
