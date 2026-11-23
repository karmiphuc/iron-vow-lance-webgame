const assert = require('node:assert/strict');

module.exports = async function checkGizaReview({page, origin, tap}) {
 await page.goto(new URL('?bench=rig', origin).href, {waitUntil:'domcontentloaded'});
 await tap('.bench-model-review');
 await page.waitForURL('**/rig-bench/giza.html');
 await page.locator('#status').waitFor({state:'hidden'});
 const buttons = page.locator('footer button');
 assert.deepEqual((await buttons.allTextContents()).sort(), ['Ready', 'Advance', 'Brace', 'Armor hit', 'Fall', 'Shoulder salvo'].sort());
 const ready = page.getByRole('button', {name:'Ready', exact:true});
 assert.equal(await ready.getAttribute('aria-pressed'), 'true');
 const canvas = page.locator('canvas');
 const standing = await canvas.screenshot();
 await tap('footer button:text-is("Shoulder salvo")');
 const salvo = page.getByRole('button', {name:'Shoulder salvo', exact:true});
 assert.equal(await salvo.getAttribute('aria-pressed'), 'true');
 await page.waitForFunction(() => Array.from(document.querySelectorAll('footer button')).some(button =>
  button.textContent === 'Ready' && button.getAttribute('aria-pressed') === 'true'
 ), null, {timeout:10000});
 await tap('footer button:text-is("Fall")');
 assert.equal(await page.getByRole('button', {name:'Fall', exact:true}).getAttribute('aria-pressed'), 'true');
 const fallen = await canvas.screenshot();
 assert.ok(!standing.equals(fallen), 'Fall changes the rendered frame');
 await page.locator('#view').selectOption('board');
 const tactical = await canvas.screenshot();
 assert.ok(!fallen.equals(tactical), 'Tactical camera changes the rendered frame');
 await tap('header a');
 await page.waitForURL('**/?bench=rig');
 await page.locator('h1', {hasText:'Rig Bench'}).waitFor();
};
