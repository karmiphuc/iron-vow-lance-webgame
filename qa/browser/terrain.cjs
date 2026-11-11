const assert=require('node:assert/strict');

module.exports=async function checkTerrain({page,mobile,origin,tap}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 await page.evaluate(()=>{
  Math.random=()=>.317;
  deploy(3,false,[0]);
  closeModal();
  const u=current();
  const {width}=battle.size;
  const candidates=battle.field.cells.flatMap((cell,i)=>{
   const x=i%width,z=Math.floor(i/width);
   if(cell.level!==1||battle.cover.has(x+','+z)||occupied(x,z))return [];
   const next=neighborTiles(x,z).find(([a,b])=>terrainCell(a,b)?.level===2&&!battle.cover.has(a+','+b)&&!occupied(a,b));
   return next?[[x,z,next]]:[];
  });
  const [x,z,next]=candidates[0];
  Object.assign(u,{x,z,vx:x,vz:z});
  focusBattleCamera(u,true);renderBattle();
  window.terrainQA={next};
 });
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
 const move=await page.evaluate(()=>{
  const [x,z]=terrainQA.next,p=project(x,0,z);
  return {x,z,p,under:screenTile(p.x,p.y),close:scale,expected:fieldScale().close};
 });
 assert.equal(move.close,move.expected);
 assert.deepEqual(move.under,{x:move.x,z:move.z});
 const click=point=>mobile?page.touchscreen.tap(point.x,point.y):page.mouse.click(point.x,point.y);
 await click(move.p);
 if(mobile){await page.locator('#move-preview').waitFor();await click(move.p)}
 await page.waitForFunction(({x,z})=>current().x===x&&current().z===z&&!battle.busy,move);
 await page.waitForFunction(({x,z})=>JSON.parse(storedCareer)?.sortie?.units.some(u=>u.x===x&&u.z===z),move);
 const saved=await page.evaluate(()=>[battle.terrainSeed,current().x,current().z,JSON.stringify(battle.field.cells)]);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>battle?.terrainSeed!==null&&battle?.field.cells);
 assert.deepEqual(await page.evaluate(()=>[battle.terrainSeed,current().x,current().z,JSON.stringify(battle.field.cells)]),saved);

 await page.evaluate(()=>{
  const u=current(),foe=battle.units.find(v=>v.team==='enemy'&&!v.kind);
  // Keep the ten-tile camera check on a legal direct-fire lane.
  let lane;
  for(let x=10;x<=16&&!lane;x++)for(let z=4;z<=15&&!lane;z++){
   const a={x,z},t={x:x-8,z:z+2};
   if(!ridgeBlocks(a,t)&&[a,t].every(p=>!battle.cover.has(p.x+','+p.z)))lane=[a,t];
  }
  const [a,t]=lane;
  Object.assign(u,a,{vx:a.x,vz:a.z,weapon:'obelisk',training:{range:1}});
  Object.assign(foe,t,{vx:t.x,vz:t.z});
  battle.units=[u,foe];
  action='fire';closeModal();focusBattleCamera(u,true);renderBattle();
  Math.random=()=>0;
  window.terrainQA={foe,hp:foe.hp.body};
 });
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
 for(let i=0;i<4;i++)await tap('#map-zoom-out');
 const target=await page.evaluate(()=>{
  const u=current(),{foe}=terrainQA;
  const ground=project(foe.x,0,foe.z),p={x:Math.round(ground.x),y:Math.round(ground.y)};
  const under=document.elementFromPoint(p.x,p.y),picked=pick(p.x,p.y);
  return {p,id:foe.id,range:distance(u,foe),weapon:weaponRange(selectedWeapon(u),u.training),scale,
   element:under?.id||under?.className,picked:picked?.id,canvas:under===canvas,tile:screenTile(p.x,p.y)};
 });
 assert.ok(target.canvas&&target.picked===target.id,'range-10 target pick: '+JSON.stringify(target));
 assert.equal(target.range,10);assert.equal(target.weapon,10);
 assert.ok(target.scale<move.close/2);
 await click(target.p);
 assert.equal(await page.evaluate(()=>lockedTarget),target.id);
 await page.waitForFunction(()=>terrainQA.foe.hp.body<terrainQA.hp);
};
