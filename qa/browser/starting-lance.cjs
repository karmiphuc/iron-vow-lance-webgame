const assert=require('node:assert/strict');

module.exports=async function checkStartingLance({page,origin,tap}){
 const readLance=()=>page.evaluate(async()=>{
  await pendingCareerWrite;
  const saved=JSON.parse(localStorage.getItem(CAREER_STORAGE));
  return {units:saved.units,training:saved.training,owned:saved.owned};
 });
 await page.goto(new URL('?view=career',origin).href,{waitUntil:'domcontentloaded'});
 await page.locator('#reset').waitFor();
 const opening=await readLance();
 assert.equal(new Set(opening.units.map(unit=>unit.paint)).size,3);
 assert.ok(opening.training.every(nodes=>nodes.length===1));
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#reset').waitFor();
 assert.deepEqual(await readLance(),opening);

 await tap('#reset');
 await tap('#modal-0');
 assert.deepEqual(await readLance(),opening);

 await tap('#reset');
 await page.evaluate(pilot=>{Math.random=()=>pilot==='rook'?.999:0},opening.units[0].pilotId);
 await tap('#modal-1');
 const restarted=await readLance();
 assert.notEqual(restarted.units[0].pilotId,opening.units[0].pilotId);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#reset').waitFor();
 assert.deepEqual(await readLance(),restarted);
};
