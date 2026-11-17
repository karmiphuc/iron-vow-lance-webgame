// Fast Phase 3 checkpoint for committed Blender exports.
const fs = require('node:fs');
const path = require('node:path');
const { previewRig } = require('./preview-rig-v2.cjs');
const checkBrowser = require('./check-browser.cjs');
const checkVehicleScene = require('./browser/vehicles.cjs');
const checkGatecrasherScene = require('./browser/gatecrasher-v2.cjs');
const checkCicadaV2 = require('./browser/cicada-v2.cjs');
const checkLineInfantry = require('./browser/line-infantry.cjs');
const checkLineElite = require('./browser/line-elite.cjs');
const checkInfantryCarry = require('./browser/infantry-carry.cjs');

async function main() {
  const [flag, directory] = process.argv.slice(2);
  if (flag !== '--out' || !directory) throw Error('Usage: node qa/gate-phase3.cjs --out directory');
  require('./check-rig-v2-test.cjs');
  const assets = path.join(__dirname, '../dist/rig-bench/rig-v2');
  const gatecrasher = await previewRig({
    file: path.join(assets, 'gatecrasher-r2-reference.glb'),
    screenshot: path.join(directory, 'gatecrasher.webp'),
    matrix: true,
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
  const live = { desktop: {}, touch: {} };
  function capture(test) {
    async function scenario(context) {
      const result = await test({ ...context, out: directory });
      live[context.mobile ? 'touch' : 'desktop'][test.name] = result?.launches ?? true;
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
    capture(checkLineInfantry),
    capture(checkLineElite),
    capture(checkInfantryCarry),
  ]);
  const summary = { status: 'pass', seed: 4242, gatecrasher, liveGatecrasher, cicada, infantry, reaver, vehicles, live };
  fs.writeFileSync(path.join(directory, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log('PASS Phase 3 checkpoint: live Gatecrasher, Cicada, Infantry, tank and gunship; rig-v2 Reaver export');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
