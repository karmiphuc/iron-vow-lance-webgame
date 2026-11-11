const assert=require('node:assert/strict');
const paths=[
 ['sapper-shaped','sapper-fuse','sapper-drill','sapper-core','sapper-gap','sapper-twin'],
 ['signal-band','signal-noise','signal-load','signal-null','signal-horizon','signal-denial'],
 ['retriever-bounty','retriever-route','retriever-rolling','retriever-patch','retriever-lift','retriever-second']
];

module.exports=async function checkCampaign({context,page,mobile,origin,tap}){
 const nav=view=>tap('#nav [data-page="'+view+'"]');
 const fit=async()=>assert.ok(await page.evaluate(()=>[...document.querySelectorAll('#ui .page,#modal:not([hidden]) .modalbox')].every(p=>p.scrollWidth<=p.clientWidth+1)));
 const unit=i=>tap('[data-unit="'+i+'"]');
 const support=()=>tap('[data-support-target="0"]');
 await page.goto(new URL('?view=inn',origin).href,{waitUntil:'domcontentloaded'});
 await page.locator('[data-hire="7"]').waitFor();
 assert.equal(await page.locator('[data-hire]').count(),5);
 assert.equal(await page.locator('#sound').getAttribute('aria-label'),'Mute sound');
 await fit();
 const tip=page.locator('.inn-pilot:has([data-hire="7"]) [data-help]');
 await tip.scrollIntoViewIfNeeded();
 if(mobile){
  const box=await tip.boundingBox(),cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
  await page.locator('#game-help').waitFor({state:'visible'});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.detach();
 }else await tip.hover();
 assert.match(await page.locator('#game-help').innerText(),/Revives disabled limbs/);
 await page.evaluate(()=>{save.credits=10000;save.units[0].level=4;save.units[0].xp=47;learnTraining(0,'pathfinder');persist();render()});
 for(let i=0;i<3;i++){
  const kind=i+5;
  await tap('[data-hire="'+kind+'"]');
  await tap('[data-seat="'+kind+'"]');
  await fit();
  await tap('[data-assign-pilot="'+i+'"]');
 }
 assert.deepEqual(await page.locator('.inn-slot b').allTextContents(),['SAPPER','SIGNAL OFFICER','RETRIEVER']);
 await page.waitForFunction(()=>audio?.state==='running'&&musicRequest?.track==='hangar'&&musicVoice?.source.loop);
 await tap('#sound');
 assert.equal(await page.evaluate(()=>localStorage.getItem('iron-vow-sound')),'off');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.inn-slot b').first().waitFor();
 assert.equal(await page.locator('#sound').getAttribute('aria-label'),'Enable sound');
 await tap('#sound');
 assert.equal(await page.evaluate(()=>save.reservePilots.rook.xp),47);
 assert.equal(await page.evaluate(()=>save.reservePilots.rook.training.join()),'pathfinder');
 await tap('[data-dock="market"]');
 await fit();
 for(const [frame,price] of [[3,'350,000'],[4,'300,000']]){
  const buy=page.locator('[data-buy-hull="'+frame+'"]');
  assert.equal(await buy.innerText(),'BUY · '+price+' CR');
  assert.equal(await buy.isDisabled(),true);
 }
 await page.evaluate(()=>{save.credits+=FRAMES[6].cost;render()});
 await tap('[data-buy-hull="6"]');
 assert.equal(await page.locator('[data-bay="storage"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>save.reserve[6].melee),'blade');
 await page.evaluate(()=>{save.units.forEach(u=>u.level=10);persist()});
 await nav('pilots');
 for(let i=0;i<3;i++){
  await tap('#train-pilot-'+i);
  if(i===0){
   assert.equal(await page.locator('[data-learn="sapper-liner"]').getAttribute('data-training-state'),'NEEDS LV 1 SKILL');
   await tap('[data-learn="sapper-shaped"]');
   assert.equal(await page.locator('[data-learn="sapper-fuse"]').getAttribute('data-training-state'),'TRAIN');
   await tap('[data-learn="sapper-liner"]');
   assert.equal(await page.locator('[data-learn="sapper-liner"]').getAttribute('data-training-state'),'LEARNED');
   assert.equal(await page.locator('[data-learn="sapper-route"]').getAttribute('data-training-state'),'TRAIN');
  }
  for(const id of paths[i].slice(i===0?1:0,3))await tap('[data-learn="'+id+'"]');
  await tap('[data-training-stage="advanced"]');
  await fit();
  for(const id of paths[i].slice(3))await tap('[data-learn="'+id+'"]');
  await tap('#modal-0');
 }
 await nav('workshop');await fit();
 assert.match(await page.locator('.workshop-actions').innerText(),/Breach Charge 1 AP/i);
 await tap('[data-select="1"]');
 assert.match(await page.locator('.workshop-actions').innerText(),/Blackout 1 AP/i);
 await tap('[data-select="2"]');
 assert.match(await page.locator('.workshop-actions').innerText(),/Recovery Rig 2 AP\s+Twice per battle/i);
 await nav('journal');await tap('[data-journal="wiki"]');
 assert.equal(await page.locator('.wiki-pilot').count(),8);
 assert.equal(await page.locator('.wiki-paths li').count(),96);
 for(const i of [5,6,7]){
  await tap('.wiki-pilot:nth-of-type('+(i+1)+') summary');
  assert.equal(await page.locator('.wiki-pilot').nth(i).locator('li:visible').count(),12);
 }
 await fit();
 await nav('contracts');
 const sizes=await page.evaluate(()=>save.dispatch.sizes);
 assert.ok(sizes.every(size=>size>=1&&size<=3));
 await page.reload({waitUntil:'domcontentloaded'});await nav('contracts');
 assert.deepEqual(await page.evaluate(()=>save.dispatch.sizes),sizes);
 await page.evaluate(()=>{save.dispatch.sizes[0]=3;persist();render()});
 await tap('[data-deploy="0"]');await tap('#modal-1');await tap('#modal-0');
 assert.deepEqual(await page.evaluate(()=>battle.slots),[0,1,2]);
 await page.evaluate(()=>{
  Math.random=()=>0;
  const foe=battle.units[3],retriever=battle.units[2];
  foe.x=foe.vx=2;foe.z=foe.vz=14;
  retriever.hp.right=retriever.hp.legs=0;
  renderBattle();persist();
 });
 await unit(1);await tap('#skill');await support();
 assert.equal(await page.evaluate(()=>battle.units[3].blackout.ap),4);
 await unit(0);await tap('#skill');await tap('#fire');
 assert.match(await page.locator('[data-unit="0"]').innerText(),/CHARGE ×2/);
 if(mobile)await tap('#target-toggle');
 await tap('[data-part="legs"]');
 if(mobile)await page.locator('#close-target').waitFor({state:'hidden'});
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
 const target=await page.evaluate(()=>{
  
  const foe=battle.units[3],p=IronVowScene.projectWorld(IronVowScene.partPoint(foe));
  if(IronVowScene.pick(p.x,p.y)!==foe)throw Error('Visible target failed its actual raycast');return p;
 });
 await (mobile?page.touchscreen.tap(target.x,target.y):page.mouse.click(target.x,target.y));
 await page.waitForFunction(()=>current().breach===1&&!battle.busy);
 assert.equal(await page.evaluate(()=>battle.units[3].hp.legs<battle.units[3].max.legs),true);
 await unit(2);await tap('#skill');
 assert.match(await page.locator('[data-support-target="0"]').innerText(),/SELF.*\n.*WEAPON ARM/);
 await support();
 const state=await page.evaluate(()=>JSON.stringify(captureSortie()));
 assert.equal(await page.evaluate(()=>current().hp.right),50);
 assert.equal(await page.evaluate(()=>current().recoveryUsed),1);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('body[data-view="combat"]').waitFor();
 assert.equal(await page.evaluate(()=>JSON.stringify(captureSortie())),state);
 assert.equal(await page.evaluate(()=>save.reserve[6].condition),100);
 await tap('#skill');await support();
 assert.equal(await page.evaluate(()=>current().hp.legs),50);
 assert.equal(await page.locator('#skill').isDisabled(),true);
 await page.evaluate(()=>{
  const actor=current(),foe=battle.units[3];
  foe.weapon='missile';foe.melee=null;delete foe.blackout;foe.reacted=false;
  foe.x=foe.vx=actor.x;foe.z=foe.vz=actor.z-1;
  lockedTarget=foe.id;renderBattle();
 });
 if(mobile)await tap('#target-toggle');
 assert.match(await page.locator('.reaction-status').innerText(),/COUNTER READY \/ FREE HAND/);
 const [damage,reacted]=await page.evaluate(async()=>{
  Math.random=()=>0;
  const actor=current(),foe=battle.units[3],before=actor.hp.body;
  await engage(actor,foe,'body',unitWeapon(actor));
  return [before-actor.hp.body,foe.reacted];
 });
 assert.ok(damage>=5&&damage<=10&&reacted);
 await page.evaluate(()=>{
  battle=null;effects=[];page='workshop';workshopView='market';render();
 });
 assert.equal(await page.locator('[data-buy-hull="11"]').count(),0);
 await page.evaluate(()=>{
  save.credits+=FRAMES[3].cost+1500;
  if(!hullOwned(3))acquireHull(3);
  if(pilotFrame(0)!==3)assignChassis(0,3,true);
  effects=[];createBattle(3,false,false,[0]);selected=0;renderBattle();
 });
 await page.waitForFunction(()=>{
  const player=battle.units.find(u=>u.team==='ally'),enemy=battle.units.find(u=>u.frame===HELLBREAKER);
  return player?.frame===3&&enemy?.team==='enemy'&&
   travelVisual(player,clock)?.atlas.key==='grid-travel-gatecrasher'&&
   travelVisual(enemy,clock)?.atlas.key==='grid-travel-hellbreaker';
 });
 await page.evaluate(()=>{
  for(const u of battle.units)if(u.team==='enemy'){u.alive=false;u.hp.body=0}
  finish(true);
 });
 const salvage=page.getByRole('button',{name:'VIEW SALVAGE'});
 await (mobile?salvage.tap():salvage.click());
 const rebuild=page.locator('[data-rebuild="11"]');
 assert.equal(await rebuild.innerText(),'REBUILD · 140,000 CR');
 assert.equal(await rebuild.isDisabled(),true);
 await page.evaluate(()=>{save.credits=rebuildPrice(HELLBREAKER);render()});
 await tap('[data-rebuild="11"]');
 assert.equal(await page.evaluate(()=>save.credits),0);
 assert.equal(await page.evaluate(()=>save.reserve[HELLBREAKER]?.condition),55);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#nav [data-page="workshop"]').waitFor({state:'attached'});
 assert.equal(await page.evaluate(()=>save.reserve[HELLBREAKER]?.condition),55);
 console.log('PASS campaign UI, touch tooltip, reserve reload, Workshop, Wiki, variable seats and new skills');
};
