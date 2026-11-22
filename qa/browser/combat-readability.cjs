const assert=require('node:assert/strict');
const {join}=require('node:path');
const saveWebp=require('./save-webp.cjs');

module.exports=async function checkCombatReadability({page,origin,mobile,out,contract=1}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 const fixture=await page.evaluate(index=>{
  ruleRandom=()=>.317;save=fresh();deploy(index,false,[0]);closeModal();surveyTerrain(0x51a7);
  const u=current(),{width,depth}=battle.size,candidates=[];
  for(let z=1;z<depth-1;z++)for(let x=1;x<width-1;x++){
   if(battle.cover.has(x+','+z)||occupied(x,z))continue;
   for(const [a,b] of neighborTiles(x,z)){
    if(!onBoard(a,b)||battle.cover.has(a+','+b)||occupied(a,b)||Math.abs(terrainCell(a,b).level-terrainCell(x,z).level)!==1)continue;
    const covers=[...battle.cover].map(k=>k.split(',').map(Number)).filter(([cx,cz])=>Math.abs(cx-x)+Math.abs(cz-z)<=2);
    if(covers.length)candidates.push({x,z,next:[a,b],covers});
   }
  }
  candidates.sort((a,b)=>Math.abs(a.x-width/2)+Math.abs(a.z-depth/2)-Math.abs(b.x-width/2)-Math.abs(b.z-depth/2));
  IronVowScene.render(clock,1/60);
  const cliff=IronVowScene.scene.getObjectByName('rock-cut-cliffs');
  if(!cliff)throw Error('Missing rendered rock cut');
  const rise=IronVowScene.terrainMetrics.levelRise;
  const plates=cliff.parent.children.filter(o=>o.isMesh&&o.userData.tile&&o.geometry.type==='PlaneGeometry');
  const seamRise=({x,z,next:[a,b]})=>{
   const delta=[.49,.51].map(t=>{
    const p=IronVowScene.world(x+(a-x)*t,z+(b-z)*t,20);
    return new THREE.Raycaster(p,new THREE.Vector3(0,-1,0)).intersectObjects(plates,false)[0].point.y;
   });
   return Math.abs(delta[1]-delta[0]);
  };
  const ramp=candidates.find(c=>seamRise(c)<rise*.052);
  const bluff=candidates.find(c=>seamRise(c)>rise*.97);
  if(!ramp||!bluff)throw Error('The seeded map needs both an open ramp and a full bluff beside cover');
  Object.assign(u,{x:ramp.x,z:ramp.z,vx:ramp.x,vz:ramp.z});
  action='move';selected=u.index;focusBattleCamera(u,true);renderBattle();
  window.readabilityQA={...ramp,bluff};return readabilityQA;
 },contract);
 await page.waitForFunction(()=>IronVowScene.ready&&!IronVowScene.loadFailed,null,{timeout:120000});
 await page.evaluate(()=>IronVowScene.render(clock,1/60));
 const cliffs=await page.evaluate(()=>{
  const {scene,groundAt,world,terrainMetrics,render}=IronVowScene;
  const cliff=scene.getObjectByName('rock-cut-cliffs');
  if(!cliff?.isMesh||!cliff.visible||!cliff.material.vertexColors)throw Error('Missing rendered rock cut');
  const {position,normal,color,uv}=cliff.geometry.attributes;
  const attributes={position,normal,color,uv};
  const valid=Object.values(attributes).every(a=>a?.count===position.count&&a.array.every(Number.isFinite));
  let inclined=0;
  for(let i=0;i<normal.count;i++)if(normal.getY(i)>.12&&normal.getY(i)<.9)inclined++;
  const shades=new Set();
  for(let i=0;i<color.count;i++)shades.add(color.getX(i).toFixed(3));
  const plates=cliff.parent.children.filter(o=>o.isMesh&&o.userData.tile&&o.geometry.type==='PlaneGeometry');
  scene.updateMatrixWorld(true);
  const probe=({x,z,next},along,across)=>{
   const [high,low]=terrainCell(x,z).level>terrainCell(...next).level?[[x,z],next]:[next,[x,z]];
   const [dx,dz]=low.map((v,i)=>v-high[i]);
   const p=world(high[0]+dx*along-dz*across,high[1]+dz*along+dx*across,0);
   const ray=new THREE.Raycaster(p.clone().setY(20),new THREE.Vector3(0,-1,0));
   return {ground:groundAt(p.x,p.z),plate:ray.intersectObjects(plates,false)[0]?.point.y??null,
    cliff:ray.intersectObject(cliff,false)[0]?.point.y??null,root:world(high[0]+dx*along-dz*across,high[1]+dz*along+dx*across).y};
  };
  const ramp=[.32,.43,.49,.51,.57,.68].map(along=>probe(readabilityQA,along,0));
  const lip=[probe(readabilityQA,.46,.41),probe(readabilityQA,.54,.41)];
  const bluff=[-.3,0,.3].map(across=>[.49,.51,.54,.59].map(along=>probe(readabilityQA.bluff,along,across)));
  const oldDetails=['terrain-risers','terrace-coping'].filter(name=>scene.getObjectByName(name));
  // Replacing the cell array triggers the same mesh rebuild used by a terrain refresh.
  battle.field.cells=battle.field.cells.map(c=>({...c}));
  render(clock,1/60);
  const rebuilt=IronVowScene.scene.getObjectByName(cliff.name);
  const stable=rebuilt!==cliff&&Object.entries(attributes).every(([key,a])=>{
   const b=rebuilt?.geometry.getAttribute(key);
   return a.count===b?.count&&a.array.every((value,index)=>value===b.array[index]);
  });
  return {vertices:position.count,inclined,shades:shades.size,valid,ramp,lip,bluff,oldDetails,stable,rise:terrainMetrics.levelRise};
 });
 assert.ok(cliffs.valid&&cliffs.vertices>0&&cliffs.inclined>cliffs.vertices*.05&&cliffs.shades>=4,
  'rock cut uses varied, inclined, colored triangles');
 assert.deepEqual(cliffs.oldDetails,[],'rock cut replaces retaining panels and bevel strips');
 assert.ok(cliffs.stable,'rebuilding a seeded board reproduces its rock positions, normals, colors and UVs');
 for(const {ground,plate,cliff} of [...cliffs.ramp,...cliffs.lip,...cliffs.bluff.flat()]){
  assert.ok(plate!==null&&Math.abs(ground-Math.max(plate,cliff??-Infinity))<1e-4,
   `ground sampling follows the visible stone or plate at ramps and lips: ${JSON.stringify({ground,plate,cliff})}`);
 }
 for(const [i,point] of cliffs.ramp.entries()){
  assert.ok(point.cliff===null||point.cliff<=point.plate+1e-4,'rock keeps the ramp clear');
  if(i)assert.ok(point.ground<cliffs.ramp[i-1].ground,'ramp descends toward the low tile');
 }
 assert.ok(Math.abs(cliffs.ramp[2].ground-cliffs.ramp[3].ground)<cliffs.rise*.052,'the ramp stays continuous across the seam');
 assert.ok(Math.abs(cliffs.lip[0].plate-cliffs.lip[1].plate-cliffs.rise)<1e-4,'the plates retain the full level change beside the ramp');
 for(const [near,far] of cliffs.bluff){
  assert.ok(Math.abs(near.plate-far.plate-cliffs.rise)<1e-4,'the bluff retains its full level change across the face');
  assert.ok(far.cliff!==null&&far.cliff>far.plate+cliffs.rise*.5,'rock covers the full bluff including its center');
 }
 const [near,far]=cliffs.bluff[1];
 assert.ok(Math.abs(near.root-far.root)<cliffs.rise*.052,'the chassis height blends as it crosses a bluff');
 await page.waitForFunction(()=>IronVowScene.ready&&!IronVowScene.loadFailed,null,{timeout:120000});
 if(out)await saveWebp(page,join(out,`${mobile?'touch':'desktop'}-theater-${contract}.webp`));
 const state=await page.evaluate(()=>{
  const scene=IronVowScene.scene,m=IronVowScene.terrainMetrics,u=current(),base=IronVowScene.world(u.x,u.z),neighbor=IronVowScene.world(u.x+1,u.z),[a,b]=readabilityQA.next,dest=IronVowScene.world(a,b),p=project(a,0,b),model=IronVowScene.models.get(u.id),cover=[];
  const assets=[];scene.updateMatrixWorld(true);scene.traverse(o=>{
   if(o.userData?.blocking){const box=new THREE.Box3().setFromObject(o),size=box.getSize(new THREE.Vector3());cover.push({type:o.userData.coverType,position:o.position.toArray(),size:size.toArray()});}
   if(o.userData?.environmentAsset&&!o.userData.blocking){
    let ancestor=o.parent;while(ancestor&&!ancestor.userData?.blocking)ancestor=ancestor.parent;
    const bounds=new THREE.Box3().setFromObject(o);assets.push({name:o.name,model:o.userData.environmentAsset.model,cover:Boolean(ancestor),tile:ancestor?.userData.tile??null,min:bounds.min.toArray(),max:bounds.max.toArray()});
   }
  });
  const expected=Object.values(battle.field.cover).sort(),found=cover.map(o=>o.type).sort();
  const mapped=cover.map(c=>{const x=Math.round(c.position[0]/m.tilePitch+(battle.size.width-1)/2),z=Math.round(c.position[2]/m.tilePitch+(battle.size.depth-1)/2);return {x,z,type:c.type,expected:battle.field.cover[x+','+z]};});
  const pathsReach=paths(u).get(a+','+b), ground=IronVowScene.groundAt(base.x,base.z);
  const names=['road-markings','tactical-grid-corners'].map(name=>({name,count:scene.getObjectByName(name)?.geometry.attributes.position.count??0}));
  const roadCount=battle.field.cells.filter(c=>c.links).length,linkCount=battle.field.cells.reduce((sum,c)=>sum+[1,2,4,8].filter(bit=>c.links&bit).length,0);
  const ids=battle.units.map(v=>v.id),terrain=JSON.stringify(battle.field.cells),seed=battle.terrainSeed;
  const box=model?.object?new THREE.Box3().setFromObject(model.object):null;
  // Project all eight actual model bounds corners, not the proxy or selection ring.
  const ys=[];if(box&&!box.isEmpty())for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
   const v=new THREE.Vector3(x,y,z).project(IronVowScene.camera);ys.push((1-v.y)*innerHeight/2);
  }
  const modelPixels=ys.length?Math.max(...ys)-Math.min(...ys):null;
  const boardHalf=[battle.size.width*m.tilePitch/2,battle.size.depth*m.tilePitch/2];
  return {metrics:m,pitch:neighbor.x-base.x,rise:Math.abs(base.y-dest.y),ground,base:base.toArray(),modelMin:box?.min.y,modelPixels,assets,boardHalf,project:p,picked:IronVowScene.screenTile(p.x,p.y),cover,expected,found,mapped,names,roadCount,linkCount,ids,terrain,seed,pathsReach,renderer:IronVowRenderer.metrics(),overflow:[document.documentElement.scrollWidth,document.documentElement.clientWidth],viewport:[innerWidth,innerHeight],fixture:readabilityQA};
 });
 assert.equal(state.metrics.tilePitch,7.4);
 assert.ok(state.metrics.levelRise>=2.75&&Math.abs(state.rise-state.metrics.levelRise)<1e-4,'the cliff rises at least 2.75 m per level');
 assert.ok(Math.abs(state.pitch-7.4)<1e-6,'tile pitch preserves weapon reach and clearance');
 assert.ok(Math.abs(state.ground-state.base[1])<.01,'feet sample actual terrain at the occupied cell');
 assert.ok(Number.isFinite(state.modelMin)&&Math.abs(state.modelMin-state.ground)<1.2,'actual mech bounding base near terrain');
 const minimumPixels=state.viewport[0]<600?40:60;
 assert.ok(Number.isFinite(state.modelPixels)&&state.modelPixels>=minimumPixels,`actual selected mech bounds ${state.modelPixels}px; need ${minimumPixels}px`);
 const perimeter=state.assets.filter(a=>!a.cover);
 assert.ok(perimeter.length>=1,'authored industrial scenery loaded');
 for(const asset of perimeter){const [hx,hz]=state.boardHalf;
  assert.ok(asset.max[0]<=-hx||asset.min[0]>=hx||asset.max[2]<=-hz||asset.min[2]>=hz,`scenery must stay outside playable board: ${JSON.stringify(asset)}`);
 }
 for(const asset of state.assets.filter(a=>a.cover)){
  assert.ok(asset.tile,'cover prefab has a claimed cell');
  const [hx,hz]=state.boardHalf,t=state.pitch,cx=(asset.tile.x+.5)*t-hx,cz=(asset.tile.z+.5)*t-hz;
  assert.ok(asset.min[0]>=cx-t/2-1e-5&&asset.max[0]<=cx+t/2+1e-5&&asset.min[2]>=cz-t/2-1e-5&&asset.max[2]<=cz+t/2+1e-5,`cover prefab stays in claimed cell: ${JSON.stringify(asset)}`);
 }
 assert.deepEqual(state.found,state.expected,'each claimed cover cell has matching type');
 assert.ok(state.mapped.every(c=>c.type===c.expected),'each blocker type is placed on its claimed cell');
 for(const c of state.cover)assert.ok(Math.max(c.size[0],c.size[2])<=state.pitch*.9+1e-5,`bounded cover ${JSON.stringify(c)}`);
 assert.ok(state.names.every(o=>o.count>0)&&state.roadCount>0,'link markings and grid ticks are present');
 assert.equal(state.names.find(o=>o.name==='road-markings').count,state.linkCount*6,'road stripes follow each link bit');
 assert.equal(state.renderer.contexts,1);assert.ok(state.overflow[0]<=state.overflow[1]+1,'document fits viewport');
 assert.ok(state.pathsReach===1,'adjacent ramp is reachable in one step');
 assert.deepEqual(state.picked,{x:fixture.next[0],z:fixture.next[1]},'ramp destination center is pickable');
 const moveTo=async(p,next)=>{
  if(mobile){await page.touchscreen.tap(p.x,p.y);await page.locator('#move-preview').waitFor();await page.touchscreen.tap(p.x,p.y);}
  else await page.mouse.click(p.x,p.y);
  await page.waitForFunction(([x,z])=>current().x===x&&current().z===z&&!battle.busy,next,{timeout:120000});
 };
 await moveTo(state.project,fixture.next);
 const bluffMove=await page.evaluate(()=>{
  const {x,z,next:[a,b]}=readabilityQA.bluff,u=current();
  Object.assign(u,{x,z,vx:x,vz:z});
  action='move';focusBattleCamera(u,true);renderBattle();IronVowScene.render(clock,1);
  const p=project(a,0,b);
  return {p,picked:IronVowScene.screenTile(p.x,p.y),reach:paths(u).get(a+','+b)};
 });
 assert.equal(bluffMove.reach,1,'an open bluff remains a legal single step');
 assert.deepEqual(bluffMove.picked,{x:fixture.bluff.next[0],z:fixture.bluff.next[1]},'the bluff destination center is pickable');
 await moveTo(bluffMove.p,fixture.bluff.next);
 const after=await page.evaluate(()=>({ids:battle.units.map(v=>v.id),terrain:JSON.stringify(battle.field.cells),seed:battle.terrainSeed}));
 assert.deepEqual(after,{ids:state.ids,terrain:state.terrain,seed:state.seed},'movement preserves unit IDs and seeded terrain');
 if(mobile){
  for(const selector of ['#move','#fire','#end','#target-toggle']){const rect=await page.locator(selector).boundingBox();assert.ok(rect&&rect.width>=44&&rect.height>=44,selector+' has a 44px touch target');}
  await page.locator('#target-toggle').tap();assert.equal(await page.locator('#target-toggle').getAttribute('aria-expanded'),'true');
  assert.ok(await page.locator('#target-panel').isVisible(),'target details can be read');
  await page.locator('#target-toggle').tap();assert.equal(await page.locator('#target-toggle').getAttribute('aria-expanded'),'false');
 }
 return {...state,terrain:undefined,cliffs};
};
