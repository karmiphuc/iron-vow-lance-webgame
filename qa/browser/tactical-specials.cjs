const assert=require('node:assert/strict');

module.exports=async function checkTacticalSpecials({page,origin,mobile,tap}){
 await page.addInitScript(()=>{
  localStorage.setItem('iron-vow-attack-camera','off');
  localStorage.setItem('iron-vow-sound','off');
 });
 await page.goto(new URL('?view=career',origin).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!careerStale&&typeof createBattle==='function');
 await page.evaluate(async()=>{
  await pendingCareerWrite;
  Object.assign(save.units[0],stockHull(GIZA_FRAME),{frame:GIZA_FRAME});
  Object.assign(save.units[1],stockHull(VYZOV_FRAME),{frame:VYZOV_FRAME});
  createBattle(1,true,true);
  battle.cover.clear();battle.field.cover={};
  const [giza,vyzov,friend,cannonTarget,mortarTarget,bystander]=battle.units;
  for(const [u,x,z] of [[giza,2,5],[vyzov,4,5],[friend,5,4],[cannonTarget,2,2],[mortarTarget,4,3],[bystander,5,3]]){
   Object.assign(u,{x,z,vx:x,vz:z,reacted:true});
  }
  mortarTarget.hp.body=1;
  ruleRandom=()=>.005;
  selected=0;action='move';render();persist();
  await pendingCareerWrite;
 });
 await page.waitForFunction(()=>IronVowScene.ready&&battle.units[0].frame===GIZA_FRAME,null,{timeout:90000});

 async function boardTap(x,z,actorId=null){
  const point=await page.evaluate(async({x,z,actorId})=>{
   Object.assign(fieldCamera,{x,z,overview:false});
   await new Promise(resolve=>setTimeout(resolve,650));
   const p=actorId?IronVowScene.projectWorld(IronVowScene.models.get(actorId).proxy.position):IronVowScene.project(x,.14,z);
   const choices=[0,8,-8,14,-14,23,-23].flatMap(dx=>[0,8,-8,14,-14,23,-23].map(dy=>({x:p.x+dx,y:p.y+dy})));
   return choices.find(point=>{
    if(document.elementFromPoint(point.x,point.y)!==document.querySelector('#scene'))return false;
    const picked=IronVowScene.pick(point.x,point.y);
    if(actorId)return picked?.id===actorId;
    const tile=IronVowScene.screenTile(point.x,point.y);
    return !picked&&tile.x===x&&tile.z===z;
   })??null;
  },{x,z,actorId});
  assert.ok(point,`Battlefield point ${x},${z} is visible and selectable`);
  if(mobile)await page.touchscreen.tap(point.x,point.y);
  else await page.mouse.click(point.x,point.y);
 }
 const sheet=()=>page.evaluate(()=>battle.units.map(u=>({id:u.id,used:!!u.tacticalUsed,body:u.hp.body,ap:u.ap,alive:u.alive})));
 const initial=await sheet();
 await tap('#tactical');
 await boardTap(2,2,initial[3].id);
 assert.ok(await page.locator('#tactical-confirm').isEnabled());
 await tap('#tactical-cancel');
 assert.deepEqual(await sheet(),initial,'Cancelling consumes neither AP nor the once-per-battle charge');
 await tap('#tactical');
 await boardTap(2,2,initial[3].id);
 await tap('#tactical-confirm');
 await page.waitForFunction(()=>!battle?.busy&&battle?.units[0]?.tacticalUsed,null,{timeout:90000});
 const giza=await page.evaluate(()=>IronVowScene.combat.history.filter(e=>e.type==='launch'&&e.weapon==='giza-salvo'));
 assert.equal(giza.length,2);
 assert.deepEqual(giza.map(shot=>shot.index),[0,1]);
 assert.ok(giza.every(shot=>shot.actor===initial[0].id&&shot.target===initial[3].id&&shot.mounted&&shot.aimError<.02));
 assert.notDeepEqual(giza[0].origin,giza[1].origin,'The two shells come from different mounted barrels');
 const afterGiza=await sheet();
 assert.equal(afterGiza[0].ap,initial[0].ap-3);
 assert.ok(afterGiza[3].body<initial[3].body);
 assert.ok(await page.locator('#tactical').isDisabled());

 await tap('[data-unit="1"]');
 await tap('#tactical');
 await boardTap(4,4);
 const preview=await page.evaluate(()=>currentTacticalPlan());
 assert.deepEqual(preview.tiles,[{x:4,z:4},{x:4,z:3},{x:3,z:4},{x:5,z:4},{x:4,z:5}]);
 assert.deepEqual(preview.friendly.map(u=>u.id),[initial[1].id,initial[2].id]);
 assert.match(await page.locator('.tactical-danger').innerText(),/THIS MECH/);
 assert.match(await page.locator('.tactical-preview').innerText(),/5 tiles/);
 await tap('#tactical-confirm');
 await page.waitForFunction(()=>!battle?.busy&&battle?.units[1]?.tacticalUsed,null,{timeout:90000});
 const mortar=await page.evaluate(()=>IronVowScene.combat.history.find(event=>event.type==='mortar-launch'));
 assert.deepEqual(mortar?.tiles,preview.tiles,'The native mortar launches across the same clipped footprint');
 const afterMortar=await sheet();
 assert.equal(afterMortar[1].ap,initial[1].ap-3);
 assert.ok(afterMortar[1].body<initial[1].body&&afterMortar[2].body<initial[2].body,'Caster and ally inside cross take friendly damage');
 assert.ok(!afterMortar[4].alive,'The orthogonal hostile is destroyed');
 assert.equal(afterMortar[5].body,afterGiza[5].body,'Diagonal occupant is outside the blast');
 await page.evaluate(()=>pendingCareerWrite);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>IronVowScene.ready&&battle?.units[0]?.tacticalUsed&&battle?.units[1]?.tacticalUsed,null,{timeout:90000});
 assert.deepEqual(await sheet(),afterMortar,'Completed ability charges, AP and damage survive reload');
 assert.ok(await page.locator('#tactical').isDisabled());
};
