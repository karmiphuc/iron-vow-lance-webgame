const assert=require('node:assert/strict');
const {writeFileSync}=require('node:fs');
const {join}=require('node:path');

module.exports=async function checkArmory({context,page,mobile,origin,tap}){
 const card=id=>page.locator('[data-weapon-card="'+id+'"]');
 const equip=id=>tap('[data-equip="'+id+'"]');
 const tab=id=>tap('[data-armory-class="'+id+'"]');
 const crew='?view=workshop';
 await page.goto(new URL(crew,origin).href,{waitUntil:'domcontentloaded'});
 await page.locator('[data-armory-class="assault"]').waitFor();
 if(mobile){
  await page.setViewportSize({width:320,height:700});
  await tap('#armory-preview');
  assert.ok(await page.locator('.workshop-chassis').evaluate(node=>node===document.activeElement));
  await tap('#armory-back');
  assert.equal(await page.locator('[data-armory-class="assault"]').evaluate(node=>node===document.activeElement),true);
 }
 const seen=[];
 for(const [group,count] of Object.entries({assault:8,strike:8,melee:8})){
  await tab(group);
  assert.equal(await page.locator('[data-armory-class="'+group+'"]').getAttribute('aria-pressed'),'true');
  const cards=page.locator('[data-weapon-card]');
  assert.equal(await cards.count(),count);
  for(const item of await cards.all()){
   const image=item.locator('.weapon-card-art');
   await image.scrollIntoViewIfNeeded();
   await image.evaluate(async img=>{await img.decode()});
   const id=await item.getAttribute('data-weapon-card');
   seen.push(id);
   const expected=await page.evaluate(id=>{
    const w=weapon(id),training=trainingEffects(selected);
    return {stats:[String(Math.round(w.damage*(w.burst?1.15:1))),weaponRange(w,training)+(w.melee?' tile':' tiles'),String(weaponAP(w,training))],
     pierce:w.pierce,cannotCounter:launchesMissiles(w),burst:w.burst,scatter:w.scatter};
   },id);
   assert.deepEqual(await item.locator('dd').allTextContents(),expected.stats);
   if(expected.pierce)assert.ok((await item.locator('.armory-trait').textContent()).includes(Math.round(expected.pierce*100)+'% ARMOR PIERCE'));
   if(expected.burst)assert.ok((await item.locator('.armory-trait').textContent()).includes(expected.burst+(expected.scatter?' PELLETS':' RD BURST')));
   if(expected.cannotCounter)assert.equal(await item.locator('.armory-trait').textContent(),'CANNOT COUNTER');
  }
  assert.ok(await page.locator('#ui .page').evaluate(node=>node.scrollWidth<=node.clientWidth+1));
 }
 assert.equal(new Set(seen).size,24);
 if(mobile)await page.setViewportSize({width:390,height:844});
 await tab('strike');
 assert.equal(await card('obelisk').locator('[data-equip]').isDisabled(),true);
 assert.match(await card('obelisk').locator('[data-equip]').innerText(),/4,800 CR REQUIRED/);
 const help=card('cerberus').locator('[data-help]');
 await help.scrollIntoViewIfNeeded();
 if(mobile){
  const box=await help.boundingBox(),cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
  await page.locator('#game-help').waitFor({state:'visible'});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.detach();
 }else await help.hover();
 assert.match(await page.locator('#game-help').innerText(),/launcher cannot counter/);
 await page.evaluate(()=>{
  save.units[1].level=5;
  for(const skill of ['sighter','ballistics','rangefinder'])if(!learnTraining(1,skill))throw Error('Training fixture failed');
 });
 await tap('[data-select="1"]');await tab('assault');
 assert.deepEqual(await card('trident').locator('dd').allTextContents(),['49','6 tiles','3']);
 await tap('[data-select="0"]');
 await equip('sidewinder');
 await tab('melee');await equip('pike');
 assert.deepEqual(await page.locator('.armory-mounted b').allTextContents(),['Sidewinder SM-2','Pilum Pike']);
 assert.equal(await page.evaluate(()=>save.credits),1850);
 if(process.env.IRON_VOW_ARMORY_PROOF){
  await page.locator('.armory-title').evaluate(node=>node.scrollIntoView({block:'start'}));
  await page.screenshot({path:join(process.env.IRON_VOW_ARMORY_PROOF,mobile?'workshop-touch.png':'workshop-desktop.png'),style:'#toast{visibility:hidden}'});
 }
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.armory-mounted').waitFor();
 assert.deepEqual(await page.locator('.armory-mounted b').allTextContents(),['Sidewinder SM-2','Pilum Pike']);
 assert.equal(await page.evaluate(()=>save.credits),1850);
 await page.waitForFunction(()=>IronVowFoundry.preview({frame:10,weapon:'sidewinder',melee:'pike'},2,'bastion')?.secondary?.tip,null,{timeout:120000});
 const fittings=await page.evaluate(()=>Object.keys(IRON_VOW_EXPANSION_ART).map(id=>{
  const melee=weapon(id).melee,entry=IronVowFoundry.preview({frame:10,weapon:melee?'sidewinder':id,melee:melee?id:'pike'},2,'bastion'),mount=melee?entry.secondary:entry.primary;
  const point=node=>node.getWorldPosition(new THREE.Vector3()),socket=entry.m.rig.arms[melee?'L':'R'].so;
  return{id,seated:point(mount.grip).distanceTo(point(socket)),tip:point(melee?mount.tip:mount.muzzle).distanceTo(point(mount.grip)),pixels:entry.surface.width};
 }));
 assert.equal(fittings.length,14);
 for(const fit of fittings){assert.ok(fit.seated<1e-6&&fit.tip>.1,JSON.stringify(fit));assert.equal(fit.pixels,640);}
 await checkCerberusSalvo(page,mobile,tap);
 await page.evaluate(()=>{battle=null;page='workshop';save.credits=30000;save.rep=119;render()});
 for(const [id,group,rep,price] of [['rivet','assault',120,'8,600'],['parallax','strike',180,'13,500']]){
  await tab(group);
  const button=card(id).locator('[data-equip]');
  assert.equal(await button.isDisabled(),true);
  assert.equal(await button.innerText(),'UNLOCKS AT '+rep+' REP');
  await page.evaluate(rep=>{save.rep=rep;render()},rep);
  assert.equal(await button.innerText(),'BUY & EQUIP · '+price+' CR');
  await equip(id);
  assert.equal(await button.innerText(),'EQUIPPED');
 }
};

async function checkCerberusSalvo(page,mobile,tap){
 const before=await page.evaluate(()=>{
  save.credits=6000;equipWeapon('cerberus');attackCameraEnabled=false;
  createBattle(0,false,false,[0]);selected=0;action='move';targetPart='body';Math.random=()=>0;
  const actor=current(),foe=battle.units.find(u=>u.team==='enemy'&&!u.kind);
  const valid=(x,z)=>onBoard(x,z)&&!battle.cover.has(x+','+z)&&!battle.units.some(u=>u!==actor&&u!==foe&&u.x===x&&u.z===z);
  let spot;
  for(let x=4;x<10&&!spot;x++)for(let z=11;z<15&&!spot;z++)if(valid(x,z)&&valid(x+2,z-1))spot=[x,z];
  if(!spot)throw Error('No clear Cerberus fixture');
  [actor.x,actor.z]=[actor.vx,actor.vz]=spot;
  [foe.x,foe.z]=[foe.vx,foe.vz]=[spot[0]+2,spot[1]-1];
  foe.reacted=true;lockedTarget=foe.id;
  focusBattleCamera(actor,true);renderBattle();
  window.armoryQA={actor,foe,origins:[]};
  const frame=draw;
  draw=time=>{
   frame(time);
   const shot=effects.find(e=>e.type==='shot'&&e.kind==='cerberus');
   if(shot?.origins.length===2)armoryQA.origins=shot.origins;
  };
  return {hp:foe.hp.body,ap:actor.ap,damage:partDamage(actor,foe,'body',weapon('cerberus'))};
 });
 await tap('#fire');
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
 const target=await page.evaluate(()=>{
  const p=IronVowScene.projectWorld(IronVowScene.partPoint(armoryQA.foe));
  if(IronVowScene.pick(p.x,p.y)!==armoryQA.foe)throw Error('Cerberus target is not raycastable');return p;
 });
 if(mobile)await page.touchscreen.tap(target.x,target.y);else await page.mouse.click(target.x,target.y);
 await page.waitForFunction(hp=>armoryQA.foe.hp.body<hp&&!battle.busy,before.hp);
 const result=await page.evaluate(()=>({hp:armoryQA.foe.hp.body,ap:armoryQA.actor.ap,origins:armoryQA.origins}));
 assert.equal(result.hp,before.hp-before.damage);
 assert.equal(result.ap,before.ap-5);
 assert.equal(result.origins.length,2);
 const [a,b]=result.origins;
 assert.ok(Math.hypot(a.ox-b.ox,a.oy-b.oy)>.015,'both rockets use distinct launch points');
}
