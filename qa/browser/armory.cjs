const assert=require('node:assert/strict');
const {writeFileSync}=require('node:fs');
const {join}=require('node:path');

module.exports=async function checkArmory({context,page,mobile,origin,tap}){
 const card=id=>page.locator('[data-weapon-card="'+id+'"]');
 const choose=async id=>{const choice=page.locator('[data-refit-choice="'+id+'"]');if(await choice.getAttribute('aria-pressed')!=='true')await tap('[data-refit-choice="'+id+'"]');};
 const equip=async id=>{await choose(id);await tap('[data-equip="'+id+'"]');};
 const tab=id=>tap('[data-armory-class="'+id+'"]');
 const livePortrait=async image=>{
  await image.scrollIntoViewIfNeeded();
  await image.waitFor({state:'visible'});
  await page.waitForFunction(img=>img.hasAttribute('src'),await image.elementHandle());
  return image.evaluate(async img=>{
   await img.decode();
   const surface=document.createElement('canvas');surface.width=surface.height=32;
   const ctx=surface.getContext('2d');ctx.drawImage(img,0,0,32,32);
   const pixels=ctx.getImageData(0,0,32,32).data;
   return {src:img.getAttribute('src'),width:img.naturalWidth,height:img.naturalHeight,
    painted:pixels.some((byte,i)=>i%4===3&&byte>64),transparent:pixels[3]===0};
  });
 };
 const checkPortrait=async image=>{
  const {src,width,height,painted,transparent}=await livePortrait(image);
  assert.ok(src.startsWith('data:image/png;base64,')&&painted&&transparent);
  assert.deepEqual([width,height],[640,640]);
 };
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
 // These days in seed zero stock the real items this scenario buys and equips.
 const shopDay=day=>page.evaluate(day=>{
  save.day=day;
  save.world=worldRules.createWorld(0,day);
  delete save.dispatch;
  render();
 },day);
 await shopDay(1);
 const seen=[];
 for(const [group,count] of Object.entries({assault:8,strike:9,melee:8})){
  await tab(group);
  assert.equal(await page.locator('[data-armory-class="'+group+'"]').getAttribute('aria-pressed'),'true');
  const cards=page.locator('[data-weapon-card]');
  assert.equal(await cards.count(),count);
  for(const item of await cards.all()){
   const id=await item.getAttribute('data-weapon-card');
   await choose(id);
   assert.equal(await page.locator('.refit-detail .armory-card:visible').count(),1);
   const image=item.locator('.weapon-card-art');
   await checkPortrait(image);
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
 assert.equal(new Set(seen).size,25);
 await tab('shields');
 for(const item of await page.locator('[data-shield-card]').all()){await choose(await item.getAttribute('data-shield-card'));await checkPortrait(item.locator('.weapon-card-art'));}
 if(mobile)await page.setViewportSize({width:390,height:844});
 await tab('strike');
 await choose('obelisk');
 assert.equal(await card('obelisk').locator('[data-equip]').isDisabled(),true);
 assert.match(await card('obelisk').locator('[data-equip]').innerText(),/4,800 CR REQUIRED/);
 await choose('cerberus');
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
 await tap('[data-select="1"]');await tab('assault');await choose('trident');
 assert.deepEqual(await card('trident').locator('dd').allTextContents(),['49','6 tiles','3']);
 await tap('[data-select="0"]');
 await equip('sidewinder');
 await shopDay(6);await tab('melee');await equip('pike');
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
 await page.waitForFunction(()=>IronVowFoundry.preview({frame:10,weapon:'sidewinder',melee:'pike'},2)?.secondary?.tip,null,{timeout:120000});
 const fittings=await page.evaluate(()=>WEAPONS.map(w=>w.id).filter(IronVowProductionArsenal.isExpansion).map(id=>{
  const melee=weapon(id).melee,entry=IronVowFoundry.preview({frame:10,weapon:melee?'sidewinder':id,melee:melee?id:'pike'},2),mount=melee?entry.secondary:entry.primary;
  const point=node=>node.getWorldPosition(new THREE.Vector3());
  const socket=id==='cerberus'?entry.m.nativeV2.source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName('mount.shoulderR')):entry.m.rig.arms[melee?'L':'R'].so;
  return{id,seated:point(mount.grip).distanceTo(point(socket)),tip:point(melee?mount.tip:mount.muzzle).distanceTo(point(mount.grip)),pixels:entry.surface.width};
 }));
 assert.equal(fittings.length,15);
 for(const fit of fittings){assert.ok(fit.seated<1e-6&&fit.tip>.1,JSON.stringify(fit));assert.equal(fit.pixels,640);}
 await shopDay(23);
 await checkCerberusSalvo(page,mobile,tap);
 await page.evaluate(()=>{battle=null;page='workshop';save.credits=30000;save.rep=119;render()});
 for(const [id,group,rep,price,day] of [['rivet','assault',120,'8,600',50],['parallax','strike',180,'13,500',61]]){
  await shopDay(day);
  await tab(group);await choose(id);
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
  save.credits=6000;
  if(!equipWeapon('cerberus'))throw Error('The fixture must fit Cerberus before the sortie');
  attackCameraEnabled=false;
  createBattle(0,false,false,[0]);selected=0;action='move';Math.random=()=>0;
  const actor=current(),foe=battle.units.find(u=>u.team==='enemy'&&!u.kind);
  const valid=(x,z)=>onBoard(x,z)&&!battle.cover.has(x+','+z)&&!battle.units.some(u=>u!==actor&&u!==foe&&u.x===x&&u.z===z);
  let spot;
  for(let x=4;x<10&&!spot;x++)for(let z=11;z<15&&!spot;z++)if(valid(x,z)&&valid(x+2,z-1))spot=[x,z];
  if(!spot)throw Error('No clear Cerberus fixture');
  [actor.x,actor.z]=[actor.vx,actor.vz]=spot;
  [foe.x,foe.z]=[foe.vx,foe.vz]=[spot[0]+2,spot[1]-1];
  foe.reacted=true;lockedTarget=foe.id;
  focusBattleCamera(actor,true);renderBattle();
  window.armoryQA={actor,foe};
  return {hp:foe.hp.body,ap:actor.ap,damage:partDamage(actor,foe,'body',weapon('cerberus'))};
 });
 await tap('#missile');
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
 // On a phone the tactical map can cover a nearby target at close zoom.
 // Use the actual overview control before tapping the real projected target.
 if(mobile){await tap('#map-overview');await page.waitForFunction(()=>fieldCamera.overview);await page.evaluate(()=>IronVowScene.render(clock,1));}
 const target=await page.evaluate(()=>{
  const p=IronVowScene.projectWorld(IronVowScene.partPoint(armoryQA.foe));
  if(IronVowScene.pick(p.x,p.y)!==armoryQA.foe)throw Error('Cerberus target is not raycastable');
  if(document.elementFromPoint(p.x,p.y)!==canvas)throw Error('Cerberus target is obscured by UI: '+JSON.stringify({p,element:document.elementFromPoint(p.x,p.y)?.id}));return p;
 });
 if(mobile)await page.touchscreen.tap(target.x,target.y);else await page.mouse.click(target.x,target.y);
 await page.waitForFunction(hp=>armoryQA.foe.hp.body<hp&&!battle.busy,before.hp);
 const result=await page.evaluate(()=>({hp:armoryQA.foe.hp.body,ap:armoryQA.actor.ap,
  launches:IronVowScene.combat.history.filter(e=>e.type==='launch'&&e.actor===armoryQA.actor.id&&e.weapon==='cerberus')}));
 assert.equal(result.hp,before.hp-before.damage);
 assert.equal(result.ap,before.ap-5);
 assert.deepEqual(result.launches.map(e=>e.socket),['shoulderMuzzle','shoulderMuzzle2']);
 for(const e of result.launches){
  assert.ok(e.mounted&&e.aimError<8*Math.PI/180,JSON.stringify(e));
  assert.ok(Math.hypot(...e.origin.map((n,i)=>n-e.expectedOrigin[i]))<1e-5,JSON.stringify(e));
 }
 const [a,b]=result.launches.map(e=>e.origin);
 assert.ok(Math.hypot(...a.map((n,i)=>n-b[i]))>.015,'both rockets use distinct world launch points');
}
