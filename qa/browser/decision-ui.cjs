const navigate=require('./navigate.cjs');
const assert=require('node:assert/strict');
const {join}=require('node:path');
const saveWebp=require('./save-webp.cjs');
const ensureContractOffer=require('./contract-fixture.cjs');
const selectContract=require('./select-contract.cjs');

module.exports=async function checkDecisionUI({page,origin,out,viewport,mobile,tap:providedTap}){
 viewport??=mobile?{width:1024,height:1366}:{width:1366,height:1024};
 await page.setViewportSize(viewport);
 const tap=providedTap??(selector=>page.locator(selector).tap());
 const nav=view=>navigate(page,view,tap,mobile);
 const capture=async name=>{if(!out)return;await page.waitForFunction(()=>!document.querySelector('#toast').classList.contains('show'));await saveWebp(page,join(out,name));};
 const state=()=>page.evaluate(async()=>{await pendingCareerWrite;return JSON.stringify({selected,career:save,ap:current()?.ap,target:lockedTarget})});
 const targets=async selector=>{
  const controls=await page.locator(selector).all();assert.ok(controls.length,selector+' exists');
  for(const control of controls){if(!await control.isVisible())continue;const box=await control.boundingBox();assert.ok(box&&box.width>=44&&box.height>=44,`${selector}: ${JSON.stringify(box)}`);}
 };
 await page.goto(new URL('?view=ship',origin).href,{waitUntil:'domcontentloaded'});
 await page.locator('[data-ship-facility-detail]').first().waitFor();
 assert.equal(await page.locator('[data-ship-facility-detail][open]').count(),1);
 if(out&&viewport.width===1024){await require('./portrait-readiness.cjs')(page,'.ship-seat img',3);await capture('ship-1024x1366.webp');}
 await tap('[data-ship-facility-detail="office"] > summary');
 assert.equal(await page.locator('[data-ship-facility-detail][open]').count(),1);
 assert.equal(await page.locator('[data-ship-facility-detail="office"]').evaluate(el=>el.open),true);
 await targets('[data-ship-facility-detail] > summary');
 const shipCash=await page.evaluate(()=>save.credits);
 await tap('[data-build-facility="office"]');
 assert.equal(await page.evaluate(()=>save.credits),shipCash-1800);
 assert.match(await page.locator('.ship-queue').innerText(),/Broker Uplink/i);
 await nav('hangar');
 assert.equal(await page.locator('[data-hangar-room-detail][open]').count(),1);
 await tap('[data-hangar-room-detail="cabins"] > summary');
 assert.equal(await page.locator('[data-hangar-room-detail][open]').count(),1);
 assert.equal(await page.locator('[data-hangar-room-detail="cabins"]').evaluate(el=>el.open),true);
 await targets('[data-hangar-room-detail] > summary');
 await tap('[data-build-room="cabins"]');
 assert.match(await page.locator('.base-queue').innerText(),/Crew Bunks/i);
 await tap('[data-hangar-deck="mechs"]');await tap('[data-hangar-deck="base"]');
 if(!await page.locator('[data-hangar-room-detail="cabins"]').evaluate(el=>el.open))await tap('[data-hangar-room-detail="cabins"] > summary');
 if(!await page.locator('[data-crew-roster]').evaluate(el=>el.open))await tap('[data-crew-roster] > summary');
 assert.equal(await page.locator('[data-hangar-room-detail="cabins"]').evaluate(el=>el.open),true);
 assert.equal(await page.locator('[data-crew-roster]').evaluate(el=>el.open),true);
 await nav('workshop');
 await page.locator('#paint-preview').waitFor();
 const preview=await page.locator('#paint-preview').boundingBox();
 assert.ok(preview&&preview.y<viewport.height&&preview.y+preview.height>0,'Turntable visible on entry: '+JSON.stringify(preview));
 for(const section of ['compare','stats','paint']){
  const selector=`[data-workshop-detail="${section}"]`;
  assert.equal(await page.locator(selector).evaluate(el=>el.open),false,section+' is initially closed');
  await tap(selector+' > summary');assert.equal(await page.locator(selector).evaluate(el=>el.open),true);
  await tap(selector+' > summary');assert.equal(await page.locator(selector).evaluate(el=>el.open),false);
 }
 await targets('[data-workshop-detail] > summary');
 assert.equal(await page.locator('.refit-detail .armory-card:visible').count(),1,'One equipment detail is visible');
 await page.locator('[data-refit-choice]').first().focus();
 await page.keyboard.press('ArrowDown');
 assert.equal(await page.locator('[data-refit-choice]').nth(1).getAttribute('aria-pressed'),'true','Arrow key selects next refit');
 await tap('[data-refit-choice="sidewinder"]');
 assert.equal(await page.locator('[data-refit-choice="sidewinder"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('.refit-detail .armory-card:visible').count(),1);
 assert.match(await page.locator('.refit-detail .armory-card:visible').innerText(),/Sidewinder/i);
 assert.match(await page.locator('.refit-comparison').innerText(),/Compared with/i);
 await targets('[data-refit-choice]');
 await tap('[data-equip="sidewinder"]');
 assert.equal(await page.evaluate(()=>save.units[0].weapon),'sidewinder');
 assert.equal(await page.locator('[data-refit-choice="sidewinder"]').getAttribute('aria-pressed'),'true','Equipping keeps the chosen refit visible');
 const equippedRow=page.locator('[data-refit-choice="sidewinder"]');
 const unavailableRow=page.locator('[data-refit-choice][data-equipment-state="unavailable"]').first();
 assert.equal(await equippedRow.getAttribute('data-equipment-state'),'equipped');
 assert.match(await equippedRow.innerText(),/Equipped/);
 assert.notEqual(await unavailableRow.evaluate(el=>getComputedStyle(el).backgroundColor),
  await equippedRow.evaluate(el=>getComputedStyle(el).backgroundColor));
 await tap(`[data-refit-choice="${await unavailableRow.getAttribute('data-refit-choice')}"]`);
 assert.equal(await equippedRow.getAttribute('aria-pressed'),'false','Inspection moves without changing the fitted state');
 assert.equal(await equippedRow.getAttribute('data-equipment-state'),'equipped');
 assert.equal(await unavailableRow.getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('.refit-detail .armory-card:visible [data-equip]').isDisabled(),true);
 assert.ok(await page.locator('.workshop-page').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Inventory fits the tablet viewport');
 await page.locator('.workshop-page').evaluate(el=>el.scrollTop=0);
 await page.waitForFunction(()=>IronVowWorkshop.snapshot()?.entry?.armed,null,{timeout:60000});
 await capture(`workshop-${viewport.width}x${viewport.height}.webp`);
 await page.setViewportSize({width:320,height:735});
 await tap('[data-workshop-detail="paint"] > summary');
 assert.equal(await page.locator('[data-workshop-detail="paint"]').evaluate(el=>el.open),true);
 assert.ok(await page.locator('.workshop-page').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Paint fits a 320px screen');
 assert.ok(await page.locator('[data-workshop-detail="paint"]').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Opened paint controls do not overflow');
 await tap('[data-workshop-detail="paint"] > summary');
 await page.setViewportSize(viewport);
 await ensureContractOffer(page,0,'picket');
 await page.evaluate(async()=>{
  for(let seed=0;seed<10000;seed++){
   const world=worldRules.createWorld(seed,save.day),offers=worldRules.offersAt(world,companyPort());
   if(offers.length>1&&offers[0].templateIndex===0){save.world=world;persist();await pendingCareerWrite;return;}
  }
  throw Error('No local Picket offer pool with multiple choices');
 });
 await nav('contracts');
 assert.equal(await page.locator('.offer-card:visible').count(),1);
 const choices=page.locator('[data-contract-select]');assert.ok(await choices.count()>1);
 await targets('[data-contract-select]');
 await choices.first().focus();await page.keyboard.press('ArrowDown');
 assert.equal(await choices.nth(1).getAttribute('aria-selected'),'true','Arrow key selects next contract');
 if(providedTap&&!mobile)await choices.nth(1).click();else await choices.nth(1).tap();
 assert.equal(await page.locator('.offer-card:visible').count(),1);
 await selectContract(page,{template:0});
 const chosen=await page.locator('[data-contract-select][aria-selected="true"]').getAttribute('data-contract-select');
 if(viewport.width===1024)await capture('contracts-1024x1366.webp');
 const scout=page.locator(`[data-scout-offer="${chosen}"]`);
 if(await scout.count()){
  if(providedTap&&!mobile)await scout.click();else await scout.tap();
  assert.equal(await page.locator('[data-contract-select][aria-selected="true"]').getAttribute('data-contract-select'),chosen,'Scouting retains the selected offer');
 }
 await tap('[data-deploy="0"]');
 await tap('#modal-0');
 assert.equal(await page.locator('[data-contract-select][aria-selected="true"]').getAttribute('data-contract-select'),chosen,'Cancelling preparation retains the selected offer');
 await tap('[data-deploy="0"]');
 await tap('#modal-1');
 const understood=page.getByRole('button',{name:'UNDERSTOOD'});
 if(await understood.isVisible()){if(providedTap&&!mobile)await understood.click();else await understood.tap();}
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
 assert.equal(await page.locator('#target-panel').isVisible(),false,'Target details start closed');
 assert.equal(await page.locator('#target-toggle').getAttribute('aria-expanded'),'false');
 assert.equal(await page.locator('#nav button:visible').count(),0,'Management navigation does not cover the battlefield');
 const before=await state();
 await targets('#target-toggle, .actionbuttons button, .unitbuttons button');
 const hint=await page.locator('.hint').boundingBox(),bottom=await page.locator('.battle-bottom').boundingBox();
 assert.ok(hint&&bottom&&hint.y+hint.height<=bottom.y+1,'Movement hint remains above the unit and action controls');
 await tap('#target-toggle');
 assert.equal(await page.locator('#target-panel').isVisible(),true);
 assert.equal(await page.locator('#target-panel button[data-part], #target-panel [data-part][aria-pressed]').count(),0,'Health is a read-only readout');
 await targets('#close-target');
 await tap('#close-target');
 assert.equal(await page.locator('#target-panel').isVisible(),false);
 assert.equal(await state(),before,'Closing details preserves the selection, career and AP');
 await tap('#target-toggle');await page.keyboard.press('Escape');
 assert.equal(await page.locator('#target-panel').isVisible(),false);
 assert.equal(await state(),before,'Escape preserves the selection, career and AP');
 assert.equal(await page.evaluate(()=>IronVowRenderer.metrics().contexts),1);
 await capture(`combat-${viewport.width}x${viewport.height}.webp`);
 await page.evaluate(()=>{createBattle(1,false,false,[0,1,2]);selected=0;renderBattle();});
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});
  await page.locator('#target-toggle strong').evaluate(el=>el.textContent='HELLBREAKER ASSAULT');
  await page.waitForFunction(()=>{
   const target=document.querySelector('#target-toggle').getBoundingClientRect();
   const map=document.querySelector('.field-navigation').getBoundingClientRect();
   return map.top>=target.bottom+10;
  });
  const overview=page.locator('#map-overview');
  await overview.click({trial:true});
  const sizes=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,row:document.querySelector('.unitbuttons').getBoundingClientRect().right}));
  assert.ok(sizes.width<=width+1&&sizes.scroll<=width+1&&sizes.row<=width+1,'Three-unit row fits the actual phone viewport: '+JSON.stringify(sizes));
  await tap('#manual');
  await tap('#modal-0');
  assert.equal(await page.locator('#modal').isVisible(),false,'Phone manual closes through its visible action');
 }
}
