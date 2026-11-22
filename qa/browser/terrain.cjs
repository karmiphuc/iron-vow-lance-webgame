const assert=require('node:assert/strict');

async function assertTheaterPropsOutsideBoard(page,contractIndex){
 await page.evaluate(index=>{
  ruleRandom=()=>.317;
  createBattle(index,false,false);
  surveyTerrain(0x51a7);
  selected=0;
  IronVowScene.render(clock,1/60);
 },contractIndex);
 await page.waitForFunction(()=>Boolean(IronVowScene.scene?.getObjectByName('theater-props')),null,{timeout:15000});
 const overlap=await page.evaluate(()=>{
  const scene=IronVowScene.scene,props=scene.getObjectByName('theater-props');
  if(!props)return {count:-1,examples:['missing theater props group']};
  const {width,depth}=battle.size,a=IronVowScene.world(0,0,0),b=IronVowScene.world(width-1,depth-1,0);
  const stepX=IronVowScene.world(1,0,0).x-a.x,stepZ=IronVowScene.world(0,1,0).z-a.z;
  const bounds={minX:a.x-stepX/2,maxX:b.x+stepX/2,minZ:a.z-stepZ/2,maxZ:b.z+stepZ/2},examples=[];
  scene.updateMatrixWorld(true);
  const intersects=box=>box.max.x>bounds.minX&&box.min.x<bounds.maxX&&box.max.z>bounds.minZ&&box.min.z<bounds.maxZ;
  props.traverse(object=>{
   if(!object.isMesh)return;
   const box=new THREE.Box3().setFromObject(object);
   if(intersects(box))
    examples.push({name:object.name,bounds:[box.min.x,box.min.z,box.max.x,box.max.z]});
  });
  const forest=scene.getObjectByName('perimeter-conifer-belts');
  const mountain=scene.getObjectByName('mountain-escarpments');
  let mountainHeight=0,forestCount=0;
  if(forest?.isInstancedMesh){
   const matrix=new THREE.Matrix4(),box=new THREE.Box3();
   forest.geometry.computeBoundingBox();
   forestCount=forest.count;
   for(let i=0;i<forestCount;i++){
    forest.getMatrixAt(i,matrix);matrix.premultiply(forest.matrixWorld);
    if(intersects(box.copy(forest.geometry.boundingBox).applyMatrix4(matrix)))examples.push({name:forest.name,index:i});
   }
  }
  if(mountain?.isMesh){
   const vertices=mountain.geometry.attributes.position,v=new THREE.Vector3();
   for(let i=0;i<vertices.count;i++){
    v.fromBufferAttribute(vertices,i).applyMatrix4(mountain.matrixWorld);
    mountainHeight=Math.max(mountainHeight,v.y);
    if(v.x>bounds.minX&&v.x<bounds.maxX&&v.z>bounds.minZ&&v.z<bounds.maxZ)examples.push({name:mountain.name,index:i});
   }
  }
  return {count:examples.length,examples:examples.slice(0,4),forestCount,mountainHeight};
 });
 assert.equal(overlap.count,0,`contract ${contractIndex} scene dressing overlaps the playable board: ${JSON.stringify(overlap.examples)}`);
 assert.ok(overlap.forestCount>=100&&overlap.mountainHeight>16,'the theater has forest belts and a mountain skyline');
 await page.evaluate(()=>{battle=null});
}

module.exports=async function checkTerrain({page,mobile,origin,tap}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 for(const contractIndex of [0,2,3])await assertTheaterPropsOutsideBoard(page,contractIndex);
 await page.evaluate(()=>{
  ruleRandom=()=>.317;
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
 const summit=await page.evaluate(({x,z})=>{
  const {terrainMetrics,world,groundAt}=IronVowScene;
  const point=world(x,z);
  return {level:terrainCell(x,z).level,rise:terrainMetrics.levelRise,y:point.y,ground:groundAt(point.x,point.z)};
 },move);
 assert.equal(summit.level,2);
 assert.ok(summit.y>=5.5,'level two stands at least 5.5 m above the valley floor');
 assert.ok(Math.abs(summit.ground-summit.y)<.015&&Math.abs(summit.y-2*summit.rise)<.015,'movement and the rendered summit share a height');
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
  ruleRandom=()=>0;
  window.terrainQA={foe,hp:foe.hp.body};
 });
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
 for(let i=0;i<4;i++)await tap('#map-zoom-out');
 // A legal range-10 lane can extend outside a narrow phone viewport even at
 // minimum zoom. Use the actual Overview control to expose both units.
 await tap('#map-overview');await page.waitForFunction(()=>fieldCamera.overview);
 await page.evaluate(()=>IronVowScene.render(clock,1));
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
