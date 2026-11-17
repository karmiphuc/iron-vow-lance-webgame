const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

module.exports=async function checkWorkshopTurntable({context,page,mobile,origin,tap}){
 const host=page.locator('#paint-preview');
 const scroll=()=>host.evaluate(element=>element.scrollIntoView({block:'center'}));
 const ready=async frame=>{
  await scroll();
  await page.waitForFunction(frame=>{
   const entry=IronVowWorkshop.snapshot()?.entry;
   return entry?.armed&&Number(pilotFrame(selected))===frame;
  },frame,{timeout:60000});
 };
 const view=()=>page.evaluate(()=>{const {yaw,zoom,velocity}=IronVowWorkshop.snapshot();return {yaw,zoom,velocity};});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 await ready(0);
 assert.equal(await page.evaluate(()=>IronVowRenderer.metrics().contexts),1);
 assert.equal(await page.locator('canvas#world-scene').count(),1);
 assert.equal(await page.evaluate(()=>IronVowRigV2.status({frame:0})),undefined);
 const initial=await view();
 const box=await host.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
 assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id,{x,y}),'paint-preview');
 if(mobile){
  const cdp=await context.newCDPSession(page);
  const fingers=gap=>[{id:1,x:x-gap,y},{id:2,x:x+gap,y}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:fingers(36)});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:fingers(65)});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>IronVowWorkshop.snapshot().zoom>1.25);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:3,x:x-42,y}]});
  for(let i=1;i<6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:3,x:x-42+i*13,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.detach();
 }else{
  await page.mouse.move(x-42,y);await page.mouse.down();
  await page.mouse.move(x+32,y,{steps:5});await page.mouse.up();
 }
 const released=await view();
 assert.ok(Math.abs(released.yaw-initial.yaw)>.3,JSON.stringify({initial,released}));
 await page.waitForFunction(yaw=>Math.abs(IronVowWorkshop.snapshot().yaw-yaw)>.06,released.yaw);
 if(mobile){await page.touchscreen.tap(x,y);await page.touchscreen.tap(x,y);}
 else await page.mouse.dblclick(x,y);
 await page.waitForFunction(({yaw,zoom})=>{
  const current=IronVowWorkshop.snapshot();
  return Math.abs(current.yaw-yaw)<1e-5&&current.zoom===zoom&&current.velocity===0;
 },initial);
 assert.equal(await page.evaluate(()=>IronVowRenderer.get().getScissorTest()),false,'Workshop restored the renderer scissor state');

 // Render the actual selectable Workshop kit and use the existing reinforcement flow.
 await page.evaluate(()=>{save.credits+=FRAMES[5].cost+4000;if(!acquireHull(5)||!assignChassis(0,5))throw Error('Cannot assign kit fixture');render();});
 await ready(5);
 const kits=()=>page.evaluate(()=>IronVowWorkshop.snapshot().entry.m.build.kits.map(kit=>kit.filter(mesh=>mesh.visible).length));
 assert.deepEqual(await kits(),[0,0,0]);
 await tap('[data-upgrade="0"]');
 await ready(5);
 assert.ok((await kits())[0]>0,'The real level-one armor plates mount in the turntable');
 await page.evaluate(()=>{save.units[0].condition=29;persist();render();});
 await ready(5);
 assert.equal(await page.evaluate(()=>IronVowWorkshop.snapshot().entry.m.partState.body),1,'Saved armor condition shows scorched damage');

 // Refit the actual authored Breach hull. Its integral cannon and factory
 // launcher use the same content and mounts the sortie will use.
 await page.evaluate(()=>{
  save.credits+=FRAMES[3].cost+6000;if(!acquireHull(3)||!assignChassis(0,3))throw Error('Cannot assign Breach fixture');
  equipWeapon('cleaver');equipWeapon('vesper-shoulder');render();
 });
 await ready(3);
 const gear=()=>page.evaluate(()=>{
  const e=IronVowWorkshop.snapshot().entry;
  return [e.primary?.id,e.secondary?.id,e.shoulderWeapon?.id,e.shoulderWeapon?.mount.visible,e.shield?.mount.visible??false];
 });
 assert.deepEqual(await gear(),['morrow','cleaver','vesper',true,false]);
 await page.evaluate(()=>{equipWeapon('citadel-shield');render();});
 await ready(3);
 assert.deepEqual(await gear(),['morrow',undefined,'vesper',true,true]);

 if(process.env.IRON_VOW_WORKSHOP_PROOF&&!mobile){
  const picture=await page.screenshot({type:'png'});
  const webp=await page.evaluate(async png=>{
   const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
   canvas.getContext('2d').drawImage(image,0,0);return canvas.toDataURL('image/webp',.88).split(',')[1];
  },picture.toString('base64'));
  fs.mkdirSync(process.env.IRON_VOW_WORKSHOP_PROOF,{recursive:true});
  fs.writeFileSync(path.join(process.env.IRON_VOW_WORKSHOP_PROOF,'workshop.webp'),webp,'base64');
 }
 const source=await page.evaluate(()=>{
  const m=IronVowWorkshop.snapshot().entry.m,geometry=m.build.parts.body[0].m.geometry;
  window.disposedWorkshop=0;geometry.addEventListener('dispose',()=>window.disposedWorkshop++);return IronVowRenderer.generation;
 });
 const gl=await page.evaluate(()=>{
  const context=IronVowRenderer.get().getContext();
  window.workshopLoss=context.getExtension('WEBGL_lose_context');
  if(!window.workshopLoss)return false;
  window.workshopLoss.loseContext();return true;
 });
 assert.ok(gl);
 await page.waitForFunction(()=>IronVowRenderer.lost);
 await page.evaluate(()=>window.workshopLoss.restoreContext());
 await page.waitForFunction(generation=>!IronVowRenderer.lost&&IronVowRenderer.generation===generation+1,source);
 await ready(3);
 assert.equal(await page.evaluate(()=>window.disposedWorkshop),1,'Restoration releases the previous authored scope');
 assert.deepEqual(await gear(),['morrow',undefined,'vesper',true,true]);
 const save=await page.evaluate(()=>JSON.stringify(window.__ironVow.career?.()??window.localStorage.getItem('iron-vow-v1')));
 await tap('#nav [data-page="contracts"]');
 assert.equal(await page.evaluate(()=>IronVowWorkshop.snapshot()),null);
 assert.equal(await page.evaluate(()=>IronVowRigV2.status({frame:3},'workshop')),undefined);
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__ironVow.career?.()??window.localStorage.getItem('iron-vow-v1'))),save);
};
