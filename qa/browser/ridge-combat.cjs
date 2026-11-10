const assert=require('node:assert/strict');

module.exports=async function checkRidgeCombat({page,mobile,origin,tap}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 const start=await page.evaluate(()=>{
  createBattle(0,false,false,[0]);surveyTerrain(0);battle.cover.clear();
  const u=current(),foe=battle.units[1];
  battle.units=[u,foe];action='fire';targetPart='body';lockedTarget=foe.id;
  Object.assign(u,{x:8,z:10,vx:8,vz:10});
  Object.assign(foe,{x:5,z:10,vx:5,vz:10});
  for(const cell of battle.field.cells)cell.level=0;
  terrainCell(6,10).level=2;
  focusBattleCamera(u,true);renderBattle();
  Math.random=()=>0;
  window.ridgeQA={u,foe};
  return {ap:u.ap,hp:foe.hp.body,dodge:dodgeChance(foe)};
 });
 assert.ok(start.dodge>0);
 assert.doesNotMatch(await page.locator('#ui').textContent(),/%\s*DODGE/i);
 const readout=()=>page.locator(mobile?'#target-toggle':'.shot-readout').innerText();
 assert.match(await readout(),/RIDGE BLOCK/);
 for(let i=0;i<2;i++)await tap('#map-zoom-out');
 const fire=async()=>{
  const p=await page.evaluate(()=>{
   const {foe}=ridgeQA;
   const tile=project(foe.x,0,foe.z);
   return {x:Math.round(tile.x),y:Math.round(tile.y)};
  });
  if(mobile)await page.touchscreen.tap(p.x,p.y);
  else await page.mouse.click(p.x,p.y);
 };
 await fire();
 assert.equal(await page.locator('#toast').textContent(),'Ridge blocks fire.');
 assert.deepEqual(await page.evaluate(()=>[ridgeQA.u.ap,ridgeQA.foe.hp.body]),[start.ap,start.hp]);

 await page.evaluate(()=>{ridgeQA.u.weapon='missile';renderBattle()});
 assert.match(await readout(),/ARC OVER RIDGE/);
 await fire();
 await page.waitForFunction(hp=>!battle.busy&&ridgeQA.foe.hp.body<hp,start.hp);
 assert.equal(await page.evaluate(()=>ridgeQA.u.ap),start.ap-4);

 await page.evaluate(()=>{
  const {u}=ridgeQA;
  terrainCell(u.x,u.z).level=3;
  terrainCell(6,10).level=0;
  u.weapon='rifle';renderBattle();
 });
 assert.match(await readout(),/HIGH GROUND/);
};
