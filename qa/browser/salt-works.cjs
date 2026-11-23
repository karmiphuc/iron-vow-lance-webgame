const assert=require('node:assert/strict');
const navigate=require('./navigate.cjs');
const selectContract=require('./select-contract.cjs');

// Use the real acquisition and deployment controls with a funded Vanta career.
module.exports=async function checkSaltWorks({page,origin,mobile,tap}){
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 await page.locator('.workshop-refit').waitFor();
 await page.evaluate(async()=>{
  save.credits=220000;
  save.overworld={port:'corridor',arrears:0};
  save.world=worldRules.createWorld(42,save.day);
  persist();
  await pendingCareerWrite;
  render();
 });
 await tap('[data-workshop-detail="compare"] > summary');
 await tap('[data-bay="market"]');
 await tap('[data-buy-hull="22"]');
 await tap('[data-chassis="22"]');
 await page.waitForFunction(()=>pilotFrame(0)===22&&IronVowWorkshop.snapshot()?.entry?.primary?.id==='salt-rifle',null,{timeout:90000});
 assert.match(await page.locator('.workshop-selected').innerText(),/SALTJACK/);
 assert.equal(await page.getByRole('heading',{name:'Salt Works rifle'}).count(),1);
 assert.equal(await page.locator('#remove-primary').count(),0);

 await navigate(page,'contracts',tap,mobile);
 const offer=await page.evaluate(()=>availableOffers('corridor').find(item=>item.templateIndex===SALT_WORKS_CONTRACT));
 assert.equal(offer?.port,'corridor');
 await selectContract(page,{id:offer.id});
 assert.match(await page.locator('.offer-card:visible').innerText(),/Salt Works[\s\S]*1 MECH/);
 await tap(`[data-world-offer="${offer.id}"]`);
 assert.match(await page.locator('#modal').innerText(),/Salt Works \/ 1 SEAT[\s\S]*SALTJACK/i);
 await tap('#modal-1');

 const waitForPair=()=>page.waitForFunction(()=>battle?.contract.id==='salt-works'&&IronVowScene.ready&&
  battle.units.length===2&&battle.units.every(actor=>IronVowScene.models.get(actor.id)?.entry?.primary?.id==='salt-rifle'),null,{timeout:90000});
 await waitForPair();
 if(await page.locator('#modal-0:visible').count())await tap('#modal-0');
 const initial=await page.evaluate(async()=>{
  await pendingCareerWrite;
  return {offer:battle.offer.id,consumed:save.world.consumed,units:battle.units.map(({frame,team,weapon})=>({frame,team,weapon}))};
 });
 assert.equal(initial.offer,offer.id);
 assert.ok(initial.consumed.includes(offer.id));
 assert.deepEqual(initial.units,[
  {frame:22,team:'ally',weapon:'salt-rifle'},
  {frame:23,team:'enemy',weapon:'salt-rifle'}
 ]);
 await page.reload({waitUntil:'domcontentloaded'});
 await waitForPair();
 assert.equal(await page.evaluate(()=>battle.offer.id),offer.id);

 const saved=await page.evaluate(()=>localStorage.getItem('iron-vow-career'));
 await page.goto(new URL('?bench=rig',origin).href,{waitUntil:'domcontentloaded'});
 await tap('.bench-heading a[href*="trial=salt-works"]');
 await page.waitForURL('**/?bench=war&trial=salt-works');
 await waitForPair();
 assert.equal(await page.evaluate(()=>localStorage.getItem('iron-vow-career')),saved);
 const before=await page.evaluate(()=>current().ap);
 await tap('#brace');
 assert.equal(await page.evaluate(before=>current().brace&&current().ap===before-braceCost(current().training),before),true);
 assert.equal(await page.evaluate(()=>localStorage.getItem('iron-vow-career')),saved);
};
