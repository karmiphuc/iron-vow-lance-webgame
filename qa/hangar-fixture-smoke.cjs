'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const evidence = path.resolve(root, process.env.HANGAR_EVIDENCE || 'design/phase4/fixture-smoke-20261111');
const url = process.env.HANGAR_URL || 'http://127.0.0.1:5198/scene/hangar-fixture.html';
const sourceFiles = ['dist/scene/hangar.js', 'dist/scene/hangar-catalog.js', 'dist/scene/hangar-fixture.js', 'dist/scene/hangar-fixture.html', 'dist/shared-renderer.js'];
const sourceHashes = () => Object.fromEntries(sourceFiles.map(file => [file, cp.execFileSync('git', ['hash-object', file], { cwd: root, encoding: 'utf8' }).trim()]));
(async () => {
  const report = { scope: 'Focused development fixture smoke; Chromium SwiftShader only. QA-only draw shim skips unseen settling draws but preserves CPU camera/rig updates; asserted/captured frames use real rendering. No full campaign, 48-case matrix, or native GPU performance claim.', url, revision: cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceHashes: sourceHashes(), checks: [], errors: [] };
  let browser, watchdog;
  fs.mkdirSync(evidence, { recursive: true });
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    watchdog = setTimeout(() => { report.timeout = 'Global four-minute smoke deadline'; browser.close().catch(() => {}); }, 240000);
    const page = await browser.newPage({ viewport: { width: 960, height: 670 }, hasTouch: true });
    // Keep the fixture's animation loop paused: only this harness advances scene time.
    await page.addInitScript(() => { window.__hangarFixturePaused = true; });
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.__hangarFixture, null, { timeout: 30000 });
    let time = 0;
    const render = async (frames = 1) => {
      time += frames / 20;
      await page.evaluate(({ time, frames }) => {
        const renderer = IronVowRenderer.get(), draw = renderer.render;
        // QA-only: ease camera/rig state without queuing unseen SwiftShader draws.
        try {
          renderer.render = () => {};
          for (let i = 0; i < frames - 1; i++) __hangarFixture.render(time + i / 20, 1 / 20, innerWidth, innerHeight);
        } finally { renderer.render = draw; }
        __hangarFixture.render(time, 1 / 20, innerWidth, innerHeight);
        __hangarFixture.placeHotspots({ left: 0, top: 0, width: innerWidth, height: innerHeight });
        renderer.getContext().finish();
      }, { time, frames });
    };
    await render();
    await page.waitForFunction(() => { __hangarFixture.render(0, 1 / 30, innerWidth, innerHeight); IronVowRenderer.get().getContext().finish(); return __hangarFixture.records.every(r => !r.unit || r.rig?.object?.children.length); }, null, { timeout: 30000, polling: 300 });
    await render(3);
    const counts = () => page.evaluate(() => ({ active: __hangarFixture.records.filter(r => !r.isReserve).length, reserve: __hangarFixture.records.filter(r => r.isReserve).length }));
    assert.deepEqual(await counts(), { active: 3, reserve: 5 });
    console.log('checkpoint', report.checks.length + 1); report.checks.push('Initial roster has three active and five reserve units.');
    // Compute unobstructed screen-space hit targets without invoking the scene's pick/select APIs.
    const target = async (reserve, index = 0) => page.evaluate(({ reserve, index }) => {
      const h = __hangarFixture, list = h.records.filter(r => r.isReserve === reserve && r.unit), wanted = list[index];
      if (!wanted) throw Error('Missing requested target');
      const ray = new THREE.Raycaster(), projected = [];
      for (let y = .8; y < 7.9; y += .6) for (let x = -2.7; x <= 2.7; x += .6) {
        const p = new THREE.Vector3(x, y, 0); wanted.group.localToWorld(p); p.project(h.camera);
        const sx = (p.x + 1) * innerWidth / 2, sy = (1 - p.y) * innerHeight / 2;
        if (sx < 3 || sx > innerWidth - 3 || sy < 70 || sy > innerHeight - 3) continue;
        const element = document.elementFromPoint(sx, sy); if (element?.closest('button,#controls')) continue;
        ray.setFromCamera(new THREE.Vector2(p.x, p.y), h.camera);
        const hit = ray.intersectObjects(h.records.map(r => r.hit), false)[0];
        if (hit?.object === wanted.hit) projected.push({ x: sx, y: sy, id: wanted.unit.id });
      }
      if (!projected.length) throw Error(`Unit ${wanted.unit.id} (${reserve ? 'reserve' : 'active'}) has no accessible screen target`);
      return projected[Math.floor(projected.length / 2)];
    }, { reserve, index });
    const active = await target(false, 2);
    const beforeCamera = await page.evaluate(() => __hangarFixture.camera.position.toArray());
    await page.mouse.click(active.x, active.y);
    await page.waitForFunction(id => document.querySelector('#selection').textContent === `Selected ${id}`, active.id);
    await render(50);
    const afterCamera = await page.evaluate(() => __hangarFixture.camera.position.toArray());
    assert.ok(Math.abs(afterCamera[0] - beforeCamera[0]) > 1, 'Active click must move camera toward selected bay');
    console.log('checkpoint', report.checks.length + 1); report.checks.push(`Physical mouse click selected active ${active.id} and moved the focus camera.`);
    await page.locator('#overview').click();
    await render(60);
    const reserveTargets = [];
    for (let i = 0; i < 5; i++) reserveTargets.push(await target(true, i));
    const reserve = reserveTargets[2];
    await page.touchscreen.tap(reserve.x, reserve.y);
    await page.waitForFunction(id => document.querySelector('#selection').textContent === `Open Workshop for ${id}`, reserve.id);
    console.log('checkpoint', report.checks.length + 1); report.checks.push(`Overview exposes all five reserves; physical touch opened Workshop for reserve ${reserve.id}.`);
    const hotspot = page.locator('#facility');
    await assert.doesNotReject(() => hotspot.waitFor({ state: 'visible' }));
    const box = await hotspot.boundingBox();
    assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 960 && box.y + box.height <= 670, 'Facility hotspot must fit viewport');
    await hotspot.click({ trial: true });
    console.log('checkpoint', report.checks.length + 1); report.checks.push('Facility hotspot is visible, within viewport, and accepts physical pointer targeting.');
    await page.locator('#seat').click();
    await render(60);
    assert.deepEqual(await counts(), { active: 4, reserve: 4 });
    const fourth = await target(false, 3);
    await page.touchscreen.tap(fourth.x, fourth.y);
    await page.waitForFunction(id => document.querySelector('#selection').textContent === `Selected ${id}`, fourth.id);
    await render(50);
    console.log('checkpoint', report.checks.length + 1); report.checks.push(`Real fourth-seat button produced four active/four reserve units; touch selected fourth unit ${fourth.id}.`);
    await page.screenshot({ path: path.join(evidence, 'fourth-seat-selected.png') });
    const state = await page.evaluate(() => ({ text: document.querySelector('#selection').textContent, ids: __hangarFixture.records.map(r => [r.unit?.id, r.isReserve]), camera: __hangarFixture.camera.position.toArray(), generation: IronVowRenderer.generation }));
    const pixels = () => page.evaluate(() => {
      __hangarFixture.render(30, 1 / 30, innerWidth, innerHeight);
      const gl = IronVowRenderer.get().getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, data = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data);
      let lit = 0; const colors = new Set();
      for (let i = 0; i < data.length; i += 4 * 97) { if (data[i] + data[i + 1] + data[i + 2] > 30) lit++; colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`); }
      return { width: w, height: h, lit, colors: colors.size, error: gl.getError() };
    });
    report.beforeLossPixels = await pixels();
    assert.ok(report.beforeLossPixels.lit > 100 && report.beforeLossPixels.colors > 20, 'Initial framebuffer must contain a rendered scene');
    const preLossCamera = await page.evaluate(() => __hangarFixture.camera.position.toArray());
    await page.evaluate(() => { window.__lossExtension = IronVowRenderer.get().getContext().getExtension('WEBGL_lose_context'); if (!__lossExtension) throw Error('WEBGL_lose_context unavailable'); __lossExtension.loseContext(); });
    await page.waitForFunction(() => IronVowRenderer.lost === true);
    await render(3);
    assert.deepEqual(await page.evaluate(() => __hangarFixture.camera.position.toArray()), preLossCamera, 'Lost context must suspend scene updates');
    await page.evaluate(() => __lossExtension.restoreContext());
    await page.waitForFunction(generation => !IronVowRenderer.lost && IronVowRenderer.generation === generation + 1, state.generation, { timeout: 30000 });
    await render(3);
    report.afterRestorePixels = await pixels();
    assert.ok(report.afterRestorePixels.lit > 100 && report.afterRestorePixels.colors > 20, 'Restored framebuffer must redraw nonblank scene content');
    assert.equal(report.afterRestorePixels.error, 0, 'Restored framebuffer readback must have no GL error');
    const restored = await page.evaluate(() => ({ text: document.querySelector('#selection').textContent, ids: __hangarFixture.records.map(r => [r.unit?.id, r.isReserve]), camera: __hangarFixture.camera.position.toArray() }));
    assert.equal(restored.text, state.text);
    assert.deepEqual(restored.ids, state.ids);
    assert.ok(restored.camera.every((v, i) => Math.abs(v - state.camera[i]) < .2), 'Selected camera state must survive restore');
    console.log('checkpoint', report.checks.length + 1); report.checks.push('Actual WEBGL_lose_context loss/restore increased generation, preserved roster/selection/camera, and redrew nonblank framebuffer.');
    await page.screenshot({ path: path.join(evidence, 'context-restored.png') });
    report.disposal = await page.evaluate(() => {
      const h = __hangarFixture, resources = new Set();
      h.scene.traverse(o => { if (o.geometry) resources.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m) resources.add(m); });
      let disposed = 0; resources.forEach(resource => resource.addEventListener('dispose', () => disposed++));
      h.dispose(); const first = disposed; h.dispose();
      return { observedResources: resources.size, disposed: first, duplicateDisposals: disposed - first, records: h.records.length };
    });
    assert.ok(report.disposal.disposed > 0, 'Disposal must release owned GPU resources');
    assert.equal(report.disposal.duplicateDisposals, 0, 'Repeated dispose must be inert');
    assert.equal(report.disposal.records, 0, 'Dispose must clear rig records');
    console.log('checkpoint', report.checks.length + 1); report.checks.push('Disposal releases observed GPU resources, clears records, and is idempotent.');
    assert.deepEqual(report.errors, [], 'No browser page errors');
    assert.deepEqual(sourceHashes(), report.sourceHashes, 'Source must remain frozen throughout evidence capture');
    report.result = 'PASS';
  } catch (error) { report.result = 'FAIL'; report.failure = error.stack; process.exitCode = 1; }
  finally { clearTimeout(watchdog); await browser?.close(); fs.writeFileSync(path.join(evidence, 'report.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report, null, 2)); }
})();
