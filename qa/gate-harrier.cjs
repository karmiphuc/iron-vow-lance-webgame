// Run against the game dev server; all career changes are confined to a fresh browser context.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { readGLB, validate } = require('./check-rig-v2.cjs');
const saveWebp = require('./browser/save-webp.cjs');
const args = process.argv.slice(2);
const arg = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const origin = arg('--url', 'http://127.0.0.1:5173');
const out = arg('--out', '/tmp/iron-vow-harrier');
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const result = validate(readGLB(path.join(__dirname, '../dist/rig-bench/rig-v2/harrier.glb')));
  assert.ok(result.ok, result.errors.join(', '));
  const browser = await chromium.launch({ executablePath: process.env.IRON_VOW_CHROME, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const capture = name => saveWebp(page, path.join(out, name + '.webp'));
    await page.goto(new URL('?bench=rig&frame=22', origin).href);
    await page.waitForFunction(() => window.__bench?.state?.model === 'harrier' && __bench.state.metrics?.triangles);
    await page.waitForFunction(() => document.querySelector('#bench-metrics')?.textContent.includes('triangles'));
    await page.mouse.move(746,450);
    await page.mouse.down();
    await page.mouse.move(635,437,{steps:6});
    await page.mouse.up();
    await page.mouse.wheel(0,-480);
    await page.waitForFunction(() => {
      const feet=__bench.state.metrics.feet;
      return Math.abs(feet[0].ankle[2]-feet[1].ankle[2])>.95 &&
        __bench.state.metrics.stance>2.48 && feet.every(f=>f.error<.035);
    });
    await capture('rig-bench');
    await page.goto(new URL('?view=workshop', origin).href);
    const frame = await page.evaluate(() => {
      save.credits = FRAMES[HARRIER_FRAME].cost;
      render();
      return HARRIER_FRAME;
    });
    const compare = page.locator('[data-workshop-detail="compare"]');
    if (!await compare.evaluate(detail => detail.open)) await compare.locator('summary').first().click();
    await page.locator('[data-bay="market"]').click();
    await page.locator('[data-buy-hull="'+frame+'"]').click();
    await page.locator('[data-chassis="'+frame+'"]').click();
    await page.reload();
    await page.waitForFunction(() => pilotFrame(0) === HARRIER_FRAME && IronVowWorkshop.snapshot()?.entry?.m.live === 'harrier');
    await page.locator('#paint-preview').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => IronVowWorkshop.snapshot().entry.primary?.id === 'sidewinder');
    const stance = await page.evaluate(() => {
      const m = IronVowWorkshop.snapshot().entry.m;
      const pos = joint => m.cont.worldToLocal(joint.getWorldPosition(new THREE.Vector3()));
      const [left,right] = m.rig.legs.map(leg=>pos(leg.an));
      return {track:left.x-right.x, stagger:left.z-right.z, soleDifference:Math.abs(left.y-right.y), spread:pos(m.rig.arms.L.wr).x-pos(m.rig.arms.L.sh).x};
    });
    assert.ok(stance.track>2.6 && stance.stagger>1 && stance.spread>.35 && stance.soleDifference<.035, JSON.stringify(stance));
    await capture('workshop');
    await page.evaluate(() => { deploy(0, false, [0]); closeModal(); });
    await page.waitForFunction(() => IronVowScene.models.get(current().id)?.entry?.m.live === 'harrier');
    const gait = await page.evaluate(async () => {
      const unit = current(), entry = IronVowScene.models.get(unit.id).entry;
      const source = entry.m.nativeV2.source;
      const knee = source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName('knee.L'));
      const rest = knee.quaternion.clone();
      let rotation = 0, active = true;
      function sample() {
        rotation = Math.max(rotation, rest.angleTo(knee.quaternion));
        if (active) requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
      const [key] = [...paths(unit)].find(([,cost]) => cost === 3);
      const [x,z] = key.split(',').map(Number);
      await moveUnit(unit,x,z);
      active = false;
      focusBattleCamera(unit,true);
      return { rotation, arrived: unit.x===x && unit.z===z, steps:unit.walkCount };
    });
    assert.ok(gait.arrived && gait.steps === 3 && gait.rotation > .05, JSON.stringify(gait));
    await capture('sortie');
    await page.evaluate(() => {current().hp.left = 0;});
    await page.waitForFunction(() => {
      const m = IronVowScene.models.get(current().id).entry.m;
      return m.partState.left === 2 && m.build.parts.left.every(p => !p.m.visible)
        && m.build.parts.right.some(p => p.m.visible);
    });
    // Isolate a clear adjacent lane, then fire via the normal combat transaction.
    const shot = await page.evaluate(async () => {
      const unit = current(), enemy = battle.units.find(u => u.team === 'enemy' && !u.kind);
      battle.cover.clear();
      const [x,z] = neighborTiles(unit.x,unit.z).find(([x,z]) => onBoard(x,z));
      Object.assign(enemy,{x,z,vx:x,vz:z});
      const gun = unitWeapon(unit), before = {...enemy.hp}, ap = unit.ap;
      const random = Math.random;
      try {
        Math.random = () => .01;
        await shoot(unit,enemy,'body',gun,false,null);
      } finally { Math.random = random; }
      return { spent: ap - unit.ap, hit: Object.keys(before).some(key => enemy.hp[key] < before[key]) };
    });
    assert.ok(shot.spent > 0 && shot.hit, JSON.stringify(shot));
    assert.deepEqual(errors, []);
    console.log('PASS Harrier purchase, assignment, reload, Sidewinder mount, three-tile walk, animated knee, left-arm loss and Sidewinder damage.', result.triangles, 'triangles.', gait);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
