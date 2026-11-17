const assert=require('node:assert/strict');

module.exports=async function vehicleLoading({page,origin}){
 const asset='**/assets/vehicles/tank.glb';
 let release;
 const hold=new Promise(resolve=>{release=resolve;});
 await page.route(asset,async route=>{await hold;await route.continue();});
 try{
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__ironVow&&document.querySelector('#nav button'));
  const requested=page.waitForRequest(asset,{timeout:30000});
  await page.evaluate(()=>__ironVow.start({seed:4242,frames:[17,18,10]}));
  await requested;
  await page.waitForFunction(()=>{
   const mechs=battle.units.filter(u=>!u.kind);
   return mechs.length>0&&mechs.every(u=>IronVowScene.models.get(u.id)?.entry.armed);
  },null,{timeout:120000});
  assert.equal(await page.evaluate(()=>IronVowScene.ready),false,'Pending tank geometry keeps the sortie loading');
  assert.equal(await page.locator('#end').isDisabled(),true,'Loading controls reject combat input');
  release();
  await page.waitForFunction(()=>IronVowScene.ready&&document.querySelector('#end')?.disabled===false,null,{timeout:120000});
  const bodies=()=>page.evaluate(()=>battle.units.map(u=>{
   const record=IronVowScene.models.get(u.id),object=record?.object;
   let meshes=0;object?.traverse(node=>{if(node.isMesh)meshes++;});
   return {frame:u.frame,kind:u.kind??null,meshes,sprite:object?.isSprite===true};
  }));
  const check=async ()=>{
   const units=await bodies();
   assert.ok(units.some(u=>u.kind==='tank'),'Seeded sortie still includes a tank');
   assert.ok(units.every(u=>u.meshes>0&&!u.sprite),JSON.stringify(units));
  };
  await check();
  await page.evaluate(()=>__ironVow.start({seed:4242,frames:[17,18,10]}));
  await page.waitForFunction(()=>IronVowScene.ready&&document.querySelector('#end')?.disabled===false,null,{timeout:120000});
  await check();
 }finally{
  release();
  await page.unroute(asset);
 }
};
