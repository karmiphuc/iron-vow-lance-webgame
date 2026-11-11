const assert=require('node:assert/strict');

module.exports=async function checkMovePreview({page,mobile,origin,tap}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 const fixture=await page.evaluate(()=>{
  createBattle(1,false,false,[0,1,2]);surveyTerrain(0);
  battle.cover.clear();
  const u=current(),foes=battle.units.filter(unit=>unit.team==='enemy');
  const place=(unit,x,z)=>Object.assign(unit,{x,z,vx:x,vz:z});
  place(u,8,10);
  const positions=[[5,10],[7,13],[7,7],[16,2],[16,3]];
  foes.forEach((foe,i)=>place(foe,...positions[i]));
  for(const cell of battle.field.cells)cell.level=0;
  terrainCell(7,10).level=1;terrainCell(7,13).level=1;terrainCell(7,9).level=2;
  action='move';targetPart='pilot';focusBattleCamera(u,true);renderBattle();
  window.movePreviewQA={u,ap:u.ap,move:u.moveLeft};
  return {names:foes.map(foe=>foe.name),ap:u.ap};
 });
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
 const point=await page.evaluate(()=>project(7,0,10));
 const preview=page.locator('#move-preview');
 const click=()=>mobile?page.touchscreen.tap(point.x,point.y):page.mouse.click(point.x,point.y);
 const select=()=>mobile?click():page.mouse.move(point.x,point.y);
 await select();
 await preview.waitFor();
 for(const [i,state] of ['high','clear','blocked'].entries()){
  assert.ok((await preview.locator('[data-shot="'+state+'"]').innerText()).includes(fixture.names[i]));
 }
 assert.equal(await preview.locator('.move-contact').count(),3,'only contacts within range appear');
 const projectedHit=await preview.locator('[data-shot="high"] .move-hit').innerText();
 assert.equal(projectedHit,'73%','the projected rifle chance uses the selected cockpit and the higher tile');
 assert.equal(await preview.locator('[data-shot="clear"] .move-hit').innerText(),'59%','Aero dodge is included in the projected chance');
 assert.equal(await preview.locator('[data-shot="blocked"] .move-hit').innerText(),'—');
 assert.equal(await page.locator(mobile?'#target-toggle small':'.shot-readout').isVisible(),false,'the current-position shot readout yields to the preview');
 assert.deepEqual(await page.evaluate(()=>[current().x,current().z,current().ap]),[8,10,fixture.ap]);
 if(mobile)assert.match(await preview.innerText(),/TAP AGAIN TO MOVE/);
 else assert.doesNotMatch(await preview.innerText(),/TAP AGAIN TO MOVE/);

 await page.evaluate(()=>{current().weapon='missile'});
 await preview.locator('[data-shot="arc"]').waitFor();
 assert.ok((await preview.locator('[data-shot="arc"]').innerText()).includes(fixture.names[2]));
 assert.match(await preview.locator('[data-shot="arc"] .move-hit').innerText(),/^\d+%$/);
 await page.evaluate(()=>Object.assign(current(),{weapon:'rifle',ap:1,moveLeft:0}));
 await page.waitForFunction(()=>document.querySelector('#move-preview').textContent.includes('NO SHOT'));
 await page.evaluate(()=>Object.assign(current(),{ap:movePreviewQA.ap,moveLeft:movePreviewQA.move}));

 if(mobile){
  await tap('#fire');await preview.waitFor({state:'hidden'});
  await tap('#move');
 }else{
  const button=await page.locator('#map-center').boundingBox();
  await page.mouse.move(button.x+button.width/2,button.y+button.height/2);
  await preview.waitFor({state:'hidden'});
 }
 await select();
 await preview.waitFor();
 assert.deepEqual(await page.evaluate(()=>[current().x,current().z,current().ap]),[8,10,fixture.ap]);
 await click();
 await page.waitForFunction(()=>!battle.busy&&current().x===7&&current().z===10);
 assert.equal(await page.evaluate(()=>current().ap),fixture.ap);
 await preview.waitFor({state:'hidden'});
 assert.ok((await page.locator('.shot-readout').textContent()).includes(projectedHit),'the actual firing readout matches the move preview');
};
