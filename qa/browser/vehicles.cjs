const assert = require('node:assert/strict');
const path = require('node:path');

module.exports = async function checkVehicles({ page, origin, mobile, out }) {
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ironVow);
  await page.evaluate(() => __ironVow.start({ seed: 4242, contract: 0 }));
  await page.waitForFunction(() => IronVowScene.ready, null, { timeout: 120000 });
  const portraits=[];
  for(const kind of ['tank','helicopter']){
    await page.evaluate(kind=>{
      lockedTarget=battle.units.find(unit=>unit.kind===kind).id;
      hover=null;renderBattle();
    },kind);
    const portrait=await page.locator('.combat-target .vehicle-target').evaluate(async image=>{
      await image.decode();
      const surface=document.createElement('canvas');surface.width=surface.height=32;
      const ctx=surface.getContext('2d');ctx.drawImage(image,0,0,32,32);
      return {src:image.getAttribute('src'),width:image.naturalWidth,height:image.naturalHeight,
        painted:ctx.getImageData(0,0,32,32).data.some((byte,i)=>i%4===3&&byte>64)};
    });
    assert.ok(portrait.src.startsWith('data:image/png;base64,')&&portrait.painted,kind+' uses its rendered GLB');
    assert.deepEqual([portrait.width,portrait.height],[640,640]);
    portraits.push(portrait.src);
  }
  assert.notEqual(...portraits,'Tank and gunship have distinct renders');
  await page.evaluate(() => {
    battle.units.filter(u => u.kind).forEach((u, i) => {
      Object.assign(u, { x: 1 + i * 2, vx: 1 + i * 2, z: 15, vz: 15 });
    });
    IronVowScene.render(clock, .016);
  });
  if (out && !mobile) {
    const png = await page.screenshot();
    const webp = await page.evaluate(async data => {
      const image = new Image();
      image.src = 'data:image/png;base64,' + data;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext('2d').drawImage(image, 0, 0);
      return canvas.toDataURL('image/webp', .88).split(',')[1];
    }, png.toString('base64'));
    require('node:fs').writeFileSync(path.join(out, 'vehicles.webp'), webp, 'base64');
  }
  const result = await page.evaluate(() => {
    const V3 = (...args) => new THREE.Vector3(...args);
    const vehicles = battle.units.filter(u => u.kind);
    const geometryDisposals = new Map();
    const records = [];
    const results = [];
    for (const u of vehicles) {
      const { vehicle, proxy } = IronVowScene.models.get(u.id);
      const { object, muzzle, body, materials } = vehicle;
      records.push(vehicle);
      object.traverse(node => {
        if (!node.geometry || geometryDisposals.has(node.geometry)) return;
        const geometry = node.geometry;
        geometryDisposals.set(geometry, 0);
        geometry.addEventListener('dispose', () => geometryDisposals.set(geometry, geometryDisposals.get(geometry) + 1));
      });
      const ground = IronVowScene.world(u.vx, u.vz);
      const screen = IronVowScene.projectWorld(proxy.position.clone());
      const picked = IronVowScene.pick(screen.x, screen.y);
      IronVowScene.combat.launch(u, battle.units.find(ally => ally.team === 'ally'), unitWeapon(u), 0,
        [{ index: 0, part: 'body', hit: true, travel: .1 }], false);
      const launched = IronVowScene.combat.history.at(-1).origin;
      const measurements = {
        kind: u.kind,
        picked: picked?.id === u.id,
        hover: object.position.y - ground.y,
        launchError: muzzle.getWorldPosition(V3()).distanceTo(V3(...launched)),
        bodyError: body.getWorldPosition(V3()).distanceTo(IronVowScene.partPoint(u, 'body')),
      };
      const initialColor = materials[0].material.color.r;
      u.vx += .25;
      u.vz += .25;
      u.heading = Math.PI / 2;
      u.hp.body *= .1;
      IronVowScene.render(clock, .016);
      const moved = IronVowScene.world(u.vx, u.vz);
      const damagedColor = materials[0].material.color.r;
      measurements.moveError = object.position.distanceTo(V3(moved.x, object.position.y, moved.z));
      measurements.headingError = Math.abs(object.rotation.y - u.heading);
      Object.assign(u, { alive: false, deathTime: clock - 1 });
      u.hp.body = 0;
      IronVowScene.render(clock, .016);
      measurements.wreckGroundError = object.position.y - moved.y;
      measurements.damageVisible = initialColor > damagedColor && damagedColor > materials[0].material.color.r;
      results.push(measurements);
    }
    const contexts = IronVowRenderer.metrics().contexts;
    const glError = IronVowRenderer.get().getContext().getError();
    battle = null;
    IronVowScene.render(clock, .016);
    return {
      vehicles: results, contexts, glError,
      disposedOnce: geometryDisposals.size > 0 && [...geometryDisposals.values()].every(count => count === 1),
      detached: records.every(record => record.object.parent === null),
    };
  });
  assert.deepEqual(result.vehicles.map(v => v.kind).sort(), ['helicopter', 'tank']);
  for (const v of result.vehicles) {
    assert.ok(v.picked && v.damageVisible, JSON.stringify(v));
    assert.ok(v.launchError < 1e-6 && v.bodyError < 1e-6, JSON.stringify(v));
    assert.ok(v.moveError < 1e-6 && v.headingError < 1e-6 && Math.abs(v.wreckGroundError) < 1e-6, JSON.stringify(v));
  }
  assert.equal(result.vehicles.find(v => v.kind === 'tank').hover, 0);
  assert.ok(result.vehicles.find(v => v.kind === 'helicopter').hover > 2.5);
  assert.equal(result.contexts, 1);
  assert.equal(result.glError, 0);
  assert.ok(result.detached && result.disposedOnce, 'Vehicles detach and shared geometry is disposed exactly once');
  return result;
};
