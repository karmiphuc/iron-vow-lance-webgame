const assert=require('node:assert/strict');
module.exports=async function temporaryBillboards({page,origin}){
 if(process.env.IRON_VOW_LOADING_FAULT==='1')await page.route(/\/game\.js(?:\?|$)/,async route=>{const response=await route.fetch(),source=await response.text(),line='battlefieldReady=window.IronVowScene?.ready!==false;';assert.ok(source.includes(line));await route.fulfill({response,body:source.replace(line,'')});});
 const held=[],inFlight=[],pattern=/\/assets\/(?:grid-travel-tank|hostile-tank-(?:left|right))\.webp(?:\?|$)/;let sawTank;
 const requested=new Promise(resolve=>{sawTank=resolve;});
 const releaseImages=async()=>{for(const release of held.splice(0))release();await Promise.all(inFlight);await page.unroute(pattern);};
 await page.route(pattern,route=>{sawTank();const pending=(async()=>{await new Promise(resolve=>held.push(resolve));await route.continue();})();inFlight.push(pending);return pending;});
 try{
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__ironVow&&document.querySelector('#nav button'));
  await page.evaluate(()=>__ironVow.start({seed:4242,frames:[1,2,3]}));
  await Promise.race([requested,new Promise((_,reject)=>setTimeout(()=>reject(Error('Delayed tank image was never requested')),30000))]);
  await page.waitForFunction(()=>battle.units.filter(IronVowScene.isLive).every(u=>IronVowScene.models.get(u.id)?.entry.armed),null,{timeout:120000});
  assert.equal(await page.evaluate(()=>IronVowScene.ready),false,'A pending vehicle image keeps the battlefield in its loading state');
  assert.equal(await page.locator('#end').isDisabled(),true);
  if(process.env.IRON_VOW_BILLBOARD_FAULT==='1')await page.evaluate(()=>{IronVowBillboards.invalidate=()=>{};});
  await releaseImages();
  await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
  const tank=await page.evaluate(()=>{
   const unit=battle.units.find(u=>u.kind==='tank'),sprite=IronVowScene.models.get(unit.id).object,texture=sprite.material.map,g=texture.image.getContext('2d');
   const data=g.getImageData(70,30,372,320).data;let body=0;for(let i=3;i<data.length;i+=4)if(data[i]>100)body++;
   return{body,version:texture.version,uploaded:IronVowRenderer.get().properties.get(texture).__version};
  });
  assert.ok(tank.body>200,'A delayed vehicle must redraw its body; a cached floor shadow alone fails this regression');
  assert.equal(tank.uploaded,tank.version,'The updated canvas texture actually reached WebGL');
  for(const frames of [[1,2,3],[4,11,13],[14,15,16],[17,18,19]]){
   await page.evaluate(frames=>__ironVow.start({seed:4242,frames}),frames);await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
   assert.equal(await page.locator('#end').isEnabled(),true,'Cached assets in a new battle re-enable its actual action controls');
   const records=await page.evaluate(()=>battle.units.filter(u=>u.team==='ally').map(u=>{
    const record=IronVowScene.models.get(u.id),sprite=record.object,texture=sprite.material.map,g=texture.image.getContext('2d'),data=g.getImageData(70,30,372,320).data;let body=0;
    for(let i=3;i<data.length;i+=4)if(data[i]>100)body++;
    const muzzle=IronVowScene.attachmentPoint(u,'muzzle'),bodyPoint=IronVowScene.partPoint(u,'body');
    return{anchors:[...muzzle.toArray(),...bodyPoint.toArray()].every(Number.isFinite),separation:muzzle.distanceTo(bodyPoint),frame:u.frame,sprite:sprite.isSprite,body,live:IronVowScene.isLive(u),version:texture.version,uploaded:IronVowRenderer.get().properties.get(texture).__version};
   }));
   for(const r of records){assert.ok(r.anchors&&r.separation>.01,'Frame '+r.frame+' attachments follow its actual sprite plane');assert.equal(r.live,false);assert.equal(r.sprite,true,'Frame '+r.frame+' uses the one adapter');assert.ok(r.body>200,'Frame '+r.frame+' has a visible body');assert.equal(r.uploaded,r.version);}
  }
  const flash=await page.evaluate(()=>{const u=battle.units.find(u=>u.team==='ally');u.hitTime=clock;u.hitPart='body';u.hitDamage=20;const sprite=IronVowBillboards.get(u,clock+.04),active=sprite.material.map.image.toDataURL();IronVowBillboards.get(u,clock+.95);return active!==sprite.material.map.image.toDataURL();});
  assert.equal(flash,true,'A temporary hit flash visibly clears after its lifetime');
 }finally{await releaseImages();}
};
