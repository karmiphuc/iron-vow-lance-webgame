// Fast Phase 3 checkpoint for committed Blender exports.
const fs = require('node:fs');
const path = require('node:path');
const { previewRig } = require('./preview-rig-v2.cjs');
const checkBrowser = require('./check-browser.cjs');
const checkVehicleScene = require('./browser/vehicles.cjs');
const checkGatecrasherScene = require('./browser/gatecrasher-v2.cjs');

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
  await checkBrowser(undefined, [
    async function checkVehicles(context) {
      vehicles[context.mobile ? 'touch' : 'desktop'] = await checkVehicleScene({ ...context, out: directory });
    },
    async function checkGatecrasherV2(context) {
      const { gait, ...results } = await checkGatecrasherScene({ ...context, out: directory });
      liveGatecrasher[context.mobile ? 'touch' : 'desktop'] = { plantedFeet: gait.plantedPairs > 0, ...results };
    },
  ]);
  const summary = { status: 'pass', seed: 4242, gatecrasher, liveGatecrasher, cicada, infantry, vehicles };
  fs.writeFileSync(path.join(directory, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(`PASS Phase 3 checkpoint: live Gatecrasher, tank and gunship, ${gatecrasher.loadouts.length} Gatecrasher loadouts, Cicada and both Infantry exports`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
