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
 await page.waitForFunction(()=>pilotFrame(0)===22&&IronVowWorkshop.snapshot()?.entry?.primary?.id==='rifle',null,{timeout:90000});
 assert.match(await page.locator('.workshop-selected').innerText(),/SALTJACK/);
 const fitted=page.locator('.fixed-loadout h3');
 assert.equal(await fitted.first().textContent(),'Kestrel AR-8');
 const mg=page.locator('[data-equip="salt-mg"]');
 await page.evaluate(()=>{save.rep=179;render();});
 await tap('[data-refit-choice="salt-mg"]');
 assert.ok(await mg.isDisabled());
 assert.ok(!(await page.evaluate(()=>save.owned.includes('salt-mg'))));
 await page.evaluate(()=>{save.rep=180;render();});
 const credits=await page.evaluate(()=>save.credits);
 await tap('[data-equip="salt-mg"]');
 await page.locator('#paint-preview').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>{
  const e=IronVowWorkshop.snapshot()?.entry,p=e?.primary;
  return p?.id==='salt-mg'&&p.model.name==='salt-mg'&&p.mount.parent===e.m.saltMotion.joints.Carriage&&Boolean(p.muzzle);
 });
 assert.equal(await page.evaluate(()=>save.credits),credits-14500);
 assert.equal(await fitted.first().textContent(),'Salt Works MG-12');
 await page.evaluate(()=>pendingCareerWrite);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>save.units[0].weapon==='salt-mg');
 await tap('#remove-primary');
 await page.locator('#paint-preview').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>{const e=IronVowWorkshop.snapshot()?.entry;return e&&!e.primary&&e.m.saltMotion.joints.Carriage.children.length===0;});
 await tap('[data-refit-choice="rifle"]');
 await tap('[data-equip="rifle"]');

 await navigate(page,'contracts',tap,mobile);
 const offer=await page.evaluate(()=>availableOffers('corridor').find(item=>item.templateIndex===SALT_WORKS_CONTRACT));
 assert.equal(offer?.port,'corridor');
 await selectContract(page,{id:offer.id});
 assert.match(await page.locator('.offer-card:visible').innerText(),/Salt Works[\s\S]*1 MECH/);
 await tap(`[data-world-offer="${offer.id}"]`);
 assert.match(await page.locator('#modal').innerText(),/Salt Works \/ 1 SEAT[\s\S]*SALTJACK/i);
 await tap('#modal-1');

 const waitForPair=()=>page.waitForFunction(()=>battle?.contract.id==='salt-works'&&IronVowScene.ready&&
  battle.units.length===2&&battle.units.every(actor=>{
   const e=IronVowScene.models.get(actor.id)?.entry,hand=e?.m.saltMotion?.joints.Carriage;
   return e?.primary?.id==='rifle'&&hand.children.length===1&&hand.children[0]===e.primary.mount;
  }),null,{timeout:90000});
 await waitForPair();
 if(await page.locator('#modal-0:visible').count())await tap('#modal-0');
 const initial=await page.evaluate(async()=>{
  await pendingCareerWrite;
  return {offer:battle.offer.id,consumed:save.world.consumed,units:battle.units.map(({frame,team,weapon})=>({frame,team,weapon}))};
 });
 assert.equal(initial.offer,offer.id);
 assert.ok(initial.consumed.includes(offer.id));
 assert.deepEqual(initial.units,[
  {frame:22,team:'ally',weapon:'rifle'},
  {frame:23,team:'enemy',weapon:'rifle'}
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
