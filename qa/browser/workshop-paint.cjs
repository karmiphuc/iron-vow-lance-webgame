const assert=require('node:assert/strict');

module.exports=async function checkWorkshopPaint({page,origin,tap}){
 const host=page.locator('#paint-preview');
 const openPaint=async()=>{if(!await page.locator('[data-workshop-detail="paint"]').evaluate(el=>el.open))await tap('[data-workshop-detail="paint"] > summary');};
 const factoryButton='[data-livery="0"]';
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('iron-vow-career')).units[0]);
 const waitSaved=colors=>page.waitForFunction(colors=>{
  const unit=JSON.parse(localStorage.getItem('iron-vow-career'))?.units[0];
  return unit&&JSON.stringify([unit.paint??null,unit.trim?.s??null,unit.trim?.a??null])===JSON.stringify(colors);
 },colors);
 const values=unit=>[unit.paint??null,unit.trim?.s??null,unit.trim?.a??null];
 const factoryColors=()=>page.evaluate(()=>{
  const materials=new Map();
  IronVowWorkshop.snapshot().entry.m.cont.traverse(mesh=>{
   if(/^paint_(primary|secondary|accent)$/.test(mesh.material?.name))
    materials.set(mesh.material.name,mesh.material.color.toArray());
  });
  return [...materials].sort(([a],[b])=>a.localeCompare(b));
 });
 const matchColors=async(colors,hangar=false)=>{
  if(!hangar)await host.evaluate(element=>element.scrollIntoView({block:'center'}));
  await page.waitForFunction(({colors,hangar})=>{
   const chassis=hangar?IronVowHangarRuntime.scene?.records.find(record=>record.unit?.id==='seat:0')?.rig.object:
    IronVowWorkshop.snapshot()?.entry?.m.cont;
   if(!chassis)return false;
   const roles=['paint_primary','paint_secondary','paint_accent'];
   const wanted=colors.map(hex=>new THREE.Color(hex).convertSRGBToLinear().toArray());
   const visible=[false,false,false];
   chassis.traverse(mesh=>{
    const role=roles.indexOf(mesh.material?.name);
    if(role<0)return;
    const actual=mesh.material.color.toArray();
    if(Math.hypot(...actual.map((value,i)=>value-wanted[role][i]))<1e-6)visible[role]=true;
   });
   return visible.every(Boolean);
  },{colors,hangar},{timeout:60000});
 };
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 await host.waitFor();
 await host.evaluate(element=>element.scrollIntoView({block:'center'}));
 await page.waitForFunction(()=>IronVowWorkshop.snapshot()?.entry?.armed);
 await openPaint();
 const originalFactory=await factoryColors();
 assert.equal(originalFactory.length,3);
 assert.equal(await page.locator('[data-livery]').count(),17);
 for(const channel of ['p','s','a']){
  assert.equal(await page.locator('[data-paint-channel="'+channel+'"]').count(),16);
  assert.equal(await page.locator('[data-custom-channel="'+channel+'"]').getAttribute('type'),'color');
 }
 await tap('[data-livery="16"]');
 const neutral=['#b0a88d','#343b42','#e08e3b'];
 await waitSaved(neutral);
 await matchColors(neutral);
 await tap('[data-livery="1"]');
 let color=['#4f5839','#343a28','#e0621a'];
 await waitSaved(color);
 assert.deepEqual(values(await saved()),color);
 await matchColors(color);
 await tap('[data-paint-channel="s"][data-paint-color="#2c2d33"]');
 await waitSaved(['#4f5839','#2c2d33','#e0621a']);
 await page.locator('[data-custom-channel="a"]').fill('#ac4dbb');
 color=['#4f5839','#2c2d33','#ac4dbb'];
 await waitSaved(color);
 assert.deepEqual(values(await saved()),color);
 await matchColors(color);
 assert.equal(await page.locator('[data-livery][aria-pressed="true"]').count(),0);
 await tap('#nav [data-page="hangar"]');await tap('[data-hangar-deck="mechs"]');
 await matchColors(color,true);
 assert.equal(await page.evaluate(()=>IronVowRenderer.metrics().contexts),1);
 await tap('#nav [data-page="workshop"]');
 await host.evaluate(element=>element.scrollIntoView({block:'center'}));
 await page.waitForFunction(()=>IronVowWorkshop.snapshot()?.entry?.armed);
 await openPaint();
 await tap(factoryButton);
 await waitSaved([null,null,null]);
 assert.deepEqual(values(await saved()),[null,null,null]);
 assert.equal(await page.locator(factoryButton).getAttribute('aria-pressed'),'true');
 await page.waitForFunction(()=>IronVowWorkshop.snapshot()?.entry?.armed);
 assert.deepEqual(await factoryColors(),originalFactory,'Factory restores the native material colors');
 await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(await page.locator(factoryButton).getAttribute('aria-pressed'),'true');

 // Use a real rebuildable factory hull to exercise the unchanged livery lock.
 await page.evaluate(()=>{
  const frame=FRAMES.findIndex((frame,index)=>frame.fixedLivery&&salvageableHull(index));
  if(frame<0)throw Error('Missing factory-livery QA hull');
  save.credits+=FRAMES[frame].cost*2;(save.salvage??={})[frame]=1;
  if(!acquireHull(frame,true)||!assignChassis(0,frame))throw Error('Could not rebuild factory-livery QA hull');
  render();
 });
 assert.equal(await page.locator('[data-custom-channel]').count(),0);
 assert.equal(await page.locator('[data-livery]').count(),0);
 assert.match(await page.locator('.paint-panel').textContent(),/FACTORY LIVERY/);
};
