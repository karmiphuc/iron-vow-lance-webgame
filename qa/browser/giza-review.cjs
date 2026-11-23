const assert = require('node:assert/strict');

module.exports = async function checkGizaReview({page, origin, tap}) {
 await page.goto(new URL('?bench=rig', origin).href, {waitUntil:'domcontentloaded'});
 await tap('.bench-model-review');
 await page.waitForURL('**/rig-bench/giza.html');
 await page.locator('#status').waitFor({state:'hidden'});
 const buttons = page.locator('footer button');
 assert.deepEqual(await buttons.allTextContents(), ['Ready', 'Advance', 'Brace', 'Armor hit', 'Fall']);
 assert.equal(await buttons.first().getAttribute('aria-pressed'), 'true');
 const canvas = page.locator('canvas');
 const standing = await canvas.screenshot();
 await tap('footer button:text-is("Fall")');
 assert.equal(await buttons.last().getAttribute('aria-pressed'), 'true');
 const fallen = await canvas.screenshot();
 assert.ok(!standing.equals(fallen), 'Fall changes the rendered frame');
 await page.locator('#view').selectOption('board');
 const tactical = await canvas.screenshot();
 assert.ok(!fallen.equals(tactical), 'Tactical camera changes the rendered frame');
 await tap('header a');
 await page.waitForURL('**/?bench=rig');
 await page.locator('h1', {hasText:'Rig Bench'}).waitFor();
};
