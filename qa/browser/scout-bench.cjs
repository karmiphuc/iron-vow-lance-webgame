const assert = require("node:assert/strict");
const { join } = require("node:path");

module.exports = async function checkScoutBench({ page, origin, tap, mobile }) {
  await page.route(url => url.pathname.endsWith("/rig-bench/prototypes/bay.js"), async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()) + `
      window.scoutSample = () => {
        model.updateMatrixWorld(true);
        const point = node => node.getWorldPosition(new THREE.Vector3()).toArray();
        const bone = name => {
          let found;
          model.traverse(node => {
            if (node.isBone && node.name.replace(/[^a-z0-9]/gi, "") === name) found = node;
          });
          return point(found);
        };
        return {
          clip: activeClip, time: action.time, duration: action.getClip().duration,
          pelvis: bone("pelvis"), left: bone("footL"), right: bone("footR"),
          visible: [...scoutWeapons].filter(([, node]) => node.visible).map(([name]) => name),
          flashes: [...scoutFlashes].filter(([, node]) => node.visible).map(([name]) => name),
          mounts: [...scoutWeapons].map(([name, node]) => ({
            name, hand: node.parent.userData.scout_socket,
            gap: node.getWorldPosition(new THREE.Vector3()).distanceTo(node.parent.getWorldPosition(new THREE.Vector3()))
          }))
        };
      };
    ` });
  });
  await page.goto(new URL("rig-bench/", origin).href, { waitUntil: "domcontentloaded" });
  await tap('.prototype-links a[href$="chassis=scout"]');
  await page.waitForFunction(() => document.querySelector("#status").textContent === "Live 3D · Rig online");
  assert.equal(await page.locator("#name").textContent(), "Ashigaru");
  assert.equal(await page.locator("#role").textContent(), "Hostile scout");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));

  const sample = () => page.evaluate(() => window.scoutSample());
  const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
  const scrub = async value => {
    await page.locator("#time").evaluate((input, v) => {
      input.value = v;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
    return sample();
  };
  const capture = async name => {
    if (process.env.IRON_VOW_SCOUT_QA) {
      await page.locator(".viewport").screenshot({
        path: join(process.env.IRON_VOW_SCOUT_QA, name + (mobile ? "-touch.png" : "-desktop.png"))
      });
    }
  };
  const first = await sample();
  assert.deepEqual(first.mounts.map(x => [x.name, x.hand]).sort(), [
    ["carbine", "R"], ["knife", "L"], ["scatter", "R"],
  ]);
  assert.ok(first.mounts.every(x => x.gap < .0001));
  await tap('[data-camera="side"]');
  await tap('[data-clip="Quickstep"]');
  const start = await scrub(0);
  const swing = await scrub(225);
  const leftPlant = await scrub(460);
  const rightSwing = await scrub(665);
  const finish = await scrub(999);
  assert.ok(start.duration <= 1.04 && start.duration >= .96);
  assert.ok(distance(start.pelvis, finish.pelvis) > 1.70, "scout travels across the pad");
  assert.ok(distance(start.right, swing.right) < .004, "right foot holds under the left swing");
  assert.ok(swing.left[1] - start.left[1] > .10, "left foot clears the pad");
  assert.ok(distance(leftPlant.left, rightSwing.left) < .004, "left foot holds under the right swing");
  assert.ok(rightSwing.right[1] - start.right[1] > .10, "right foot clears the pad");
  await scrub(225);
  await capture("quickstep");
  await scrub(0);
  await tap("#play");
  await page.waitForFunction(() => window.scoutSample().time > .2);
  assert.ok(distance(start.pelvis, (await sample()).pelvis) > .2);
  await tap('[data-camera="threequarter"]');

  for (const [clip, weapon, name, shot] of [
    ["Fire", "carbine", "Needle carbine", 425],
    ["Burst", "scatter", "Flechette scattergun", 232],
    ["Strike", "knife", "Signal knife", 432],
  ]) {
    await tap(`[data-clip="${clip}"]`);
    const pose = await scrub(shot);
    assert.deepEqual(pose.visible, [weapon]);
    assert.equal(await page.locator("#weapon").textContent(), name);
    assert.ok(pose.mounts.every(x => x.gap < .0001));
    if (clip !== "Strike") assert.deepEqual(pose.flashes, [weapon]);
    await capture(weapon);
    if (clip === "Burst") {
      assert.deepEqual((await scrub(420)).flashes, []);
      assert.deepEqual((await scrub(600)).flashes, [weapon]);
    }
  }
  await tap('[data-chassis="gatecrasher"]');
  await page.waitForFunction(() => document.querySelector("#status").textContent === "Live 3D · Rig online");
  assert.equal(await page.locator('[data-clip="Burst"]').isVisible(), false);
  assert.equal(await page.locator('[data-clip="Fire"]').textContent(), "Fire");
  for (const [id, name] of [["cicada", "Cicada"], ["hellbreaker", "Hellbreaker"]]) {
    await tap(`[data-chassis="${id}"]`);
    await page.waitForFunction(() => document.querySelector("#status").textContent === "Live 3D · Rig online");
    assert.equal(await page.locator("#name").textContent(), name);
    assert.equal(await page.locator('[data-clip="Fire"]').isEnabled(), true);
  }
};
