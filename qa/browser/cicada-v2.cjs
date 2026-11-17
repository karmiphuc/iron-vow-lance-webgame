const assert = require('node:assert/strict');

module.exports = async function checkCicadaV2({ page, origin }) {
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ironVow);
  await page.evaluate(() => {
    __ironVow.start({ seed: 4242, contract: 0, frames: [4] });
    const actor = current();
    Object.assign(save.units[actor.index], stockHull(actor.frame));
    Object.assign(actor, { weapon: FRAMES[actor.frame].weapon, melee: FRAMES[actor.frame].melee });
  });
  await page.waitForFunction(() => IronVowScene.ready, null, { timeout: 120000 });
  const idle = await page.evaluate(() => {
    const actor = current(), entry = IronVowScene.models.get(actor.id)?.entry;
    return { live: IronVowScene.isLive(actor), rig: entry?.m.live, launcher: entry?.primary.id };
  });
  assert.deepEqual(idle, { live: true, rig: 'cicada', launcher: 'locust' });

  const report = await page.evaluate(async () => {
    const actor = current(), target = battle.units.find(u => u.team === 'enemy');
    const entry = IronVowScene.models.get(actor.id).entry;
    const source = entry.m.nativeV2.source;
    const authored = name => source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
    const point = object => object.getWorldPosition(new THREE.Vector3());
    const [x, z] = [Math.floor(battle.size.width / 2), Math.floor(battle.size.depth / 2)];
    for (const unit of battle.units) if (unit !== actor && unit !== target) {
      unit.alive = false;
      unit.hp.body = 0;
    }
    Object.assign(actor, { x, z, vx: x, vz: z, ap: 8 });
    Object.assign(target, { x: x + 1, vx: x + 1, z, vz: z, ap: 0 });
    target.hp.body = target.max.body = 999;
    battle.cover.clear();
    IronVowScene.render(clock, .016);

    const launches = [];
    const combat = IronVowScene.combat, launch = combat.launch;
    combat.launch = function (...args) {
      launch.apply(this, args);
      const event = this.history.at(-1);
      if (event?.weapon !== 'locust' || event.actor !== actor.id) return;
      const name = event.socket.endsWith('2') ? 'muzzle.locust.R' : 'muzzle.locust.L';
      launches.push({
        socket: event.socket, error: point(authored(name)).distanceTo(new THREE.Vector3(...event.origin)),
        aim: event.aimError, mounted: event.mounted,
      });
    };
    await __ironVow.attack(actor.id, target.id, 'body', 'fire');
    const emitterError = point(authored('socket.L')).distanceTo(IronVowScene.attachmentPoint(actor, 'meleeTip'));
    await __ironVow.attack(actor.id, target.id, 'body', 'strike');
    const pulse = combat.history.some(event => event.type === 'impact' && event.actor === actor.id && event.weapon === 'pulse-bash');
    actor.hp.right = 0;
    IronVowScene.render(clock, .016);
    const fireDisabled = __ironVow.choices(actor.id).attacks.every(attack => attack.mode !== 'fire');
    const detach = entry.m.build.parts.right.filter(part => part.detach);
    return { launches, emitterError, pulse, fireDisabled, detached: detach.length > 0 && detach.every(part => !part.m.visible) };
  });
  assert.deepEqual(report.launches.map(entry => entry.socket), ['shoulderMuzzle', 'shoulderMuzzle2']);
  for (const entry of report.launches) {
    assert.ok(entry.mounted && entry.error < 1e-5 && entry.aim < 8 * Math.PI / 180, JSON.stringify(entry));
  }
  assert.ok(report.emitterError < 1e-5 && report.pulse && report.fireDisabled && report.detached, JSON.stringify(report));
  return { launches: report.launches.length, pulseBash: true, damage: true };
};
