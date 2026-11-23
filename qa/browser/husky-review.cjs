const assert = require('node:assert/strict');

module.exports = async function checkHuskyReview({page, origin, tap}) {
 await page.goto(new URL('?bench=rig', origin).href, {waitUntil:'domcontentloaded'});
 const asset = page.waitForResponse(response =>
  new URL(response.url()).pathname === '/rig-bench/husky.glb' && response.ok()
 );
 await tap('.bench-model-review[href="rig-bench/husky.html"]');
 await page.waitForURL(url => url.origin === new URL(origin).origin &&
  /^\/rig-bench\/husky(?:\.html)?$/.test(url.pathname)
 );
 assert.equal(await page.title(), 'Husky · model review');
 await asset;
 await page.locator('#status').waitFor({state:'hidden'});
 assert.deepEqual((await page.locator('footer button').allTextContents()).sort(),
  ['Ready', 'Advance', 'Brace', 'Armor hit', 'Fall'].sort());
 const canvas = page.getByLabel('Husky model', {exact:true});
 const ready = await canvas.screenshot();
 await tap('footer button:text-is("Fall")');
 assert.equal(await page.getByRole('button', {name:'Fall', exact:true}).getAttribute('aria-pressed'), 'true');
 const falling = await canvas.screenshot();
 assert.ok(!ready.equals(falling), 'Fall changes the rendered frame');
 await page.locator('#view').selectOption('board');
 assert.ok(!falling.equals(await canvas.screenshot()), 'Tactical camera changes the rendered frame');
 await tap('header a');
 await page.waitForURL('**/?bench=rig');
 await page.locator('h1', {hasText:'Rig Bench'}).waitFor();
};
