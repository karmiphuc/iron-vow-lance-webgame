const navigate=require('./navigate.cjs');
const assert=require('node:assert/strict');
const waitForLivePortraits=require('./portrait-readiness.cjs');

module.exports=async function checkWorkshopPortraits({page,origin,tap,mobile}){
 const ready=async(selector,count)=>{
  const cards=await waitForLivePortraits(page,selector,count);
  return cards.evaluateAll(images=>images.map(image=>{
   const canvas=document.createElement('canvas');
   canvas.width=canvas.height=64;
   const ctx=canvas.getContext('2d');
   ctx.drawImage(image,0,0,64,64);
   const pixels=ctx.getImageData(0,0,64,64).data;
   let opaque=0;
   for(let alpha=3;alpha<pixels.length;alpha+=4)if(pixels[alpha]>128)opaque++;
   return {key:image.dataset.rigPortrait,src:image.src,opaque};
  }));
 };
 const check=async(selector,count)=>{
  const images=await ready(selector,count);
  for(const image of images){
   assert.ok(image.key,'Portrait has shared key for '+selector);
   assert.ok(image.src.startsWith('data:image/png;base64,'),'Portrait came from canvas readback');
   assert.ok(image.opaque>14,'Portrait has visible geometry');
  }
  return images;
 };
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('.ship-seat img').first().waitFor();
 const ship=await check('.ship-seat img',3);

 await navigate(page,'hangar',tap,mobile);
 await tap('[data-crew-roster] > summary');
 await check('.base-roster img.duty-mech',3).then(roster=>{
  assert.deepEqual(roster,ship,'Roster and Ship reuse matching cached images byte for byte');
 });
 await navigate(page,'workshop',tap,mobile);
 const bay=await check('.bay-card img',3);
 assert.equal(new Set(bay.map(image=>image.key)).size,3);

 // Use distinct real loadouts to prove each cache input changes visible pixels.
 const changes=[
  {paint:'#c0283a'},
  {trim:{s:'#2b4f9e',a:'#5fd4c4'}},
  {weapon:'rail',melee:null,shield:'citadel-shield'},
  {upgrade:3},
  {condition:28}
 ];
 const first='[data-bay="assigned"][aria-pressed="true"]';
 await page.locator(first).waitFor();
 for(const [i,change] of changes.entries()){
  await page.evaluate(change=>{Object.assign(save.units[0],change);render();},change);
  const images=await check('.bay-card img',3);
  assert.notEqual(images[0].key,bay[0].key,'Portrait cache key changed for input '+i);
  assert.notEqual(images[0].src,bay[0].src,'Portrait pixels changed for input '+i);
  assert.deepEqual(images.slice(1),bay.slice(1),'Other portraits reused the cache');
  bay[0]=images[0];
 }
 await page.waitForFunction(()=>FRAMES.every((_,frame)=>!IronVowRigV2.status({frame},'portrait')));
 assert.equal(await page.evaluate(()=>IronVowRenderer.metrics().contexts),1);

 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{
  __ironVow.start({seed:4242,frames:[0]});
  const actor=current(),target=battle.units.find(u=>u.team==='enemy'&&!u.kind);
  if(!target)throw Error('Portrait gate needs a real hostile mech');
  lockedTarget=target.id;
  Object.assign(actor,{x:7,z:12,vx:7,vz:12,ap:12});
  Object.assign(target,{x:7,z:14,vx:7,vz:14,reacted:true});
  battle.cover.clear();ruleRandom=()=>0;
  focusBattleCamera(actor,true);renderBattle();
 });
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:90000});
 if(!await page.locator('#target-panel').isVisible())await tap('#target-toggle');
 await check('.combat-target img.foundry-target',1);
 const targetBefore=await page.evaluate(()=>battle.units.find(u=>u.id===lockedTarget).hp.body);
 if(await page.locator('#close-target').isVisible())await tap('#close-target');
 await page.waitForFunction(()=>{
  const target=battle.units.find(u=>u.id===lockedTarget);
  const point=IronVowScene.projectWorld(IronVowScene.partPoint(target));
  return point.x>0&&point.x<innerWidth&&point.y>0&&point.y<innerHeight&&IronVowScene.pick(point.x,point.y)===target;
 });
 const point=await page.evaluate(()=>{
  const target=battle.units.find(u=>u.id===lockedTarget);
  const {x,y}=IronVowScene.projectWorld(IronVowScene.partPoint(target));
  return {x,y};
 });
 await tap('#fire');
 if(mobile)await page.touchscreen.tap(point.x,point.y);
 else await page.mouse.click(point.x,point.y);
 await page.locator('#shot-inset img').waitFor({state:'attached'});
 await check('#shot-inset img',1);
 assert.equal(await page.evaluate(()=>IronVowRenderer.metrics().contexts),1);
 await tap('#skip-shot');
 await page.waitForFunction(()=>!battle.busy&&!document.getElementById('shot-inset').childElementCount);
 assert.ok(await page.evaluate(before=>battle.units.find(u=>u.id===lockedTarget).hp.body<before,targetBefore),'Inset and skip preserve actual attack resolution');
};
