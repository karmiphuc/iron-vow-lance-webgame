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
  if(!candidates.length)throw Error('No open ramp beside a blocker');
  candidates.sort((a,b)=>Math.abs(a.x-width/2)+Math.abs(a.z-depth/2)-Math.abs(b.x-width/2)-Math.abs(b.z-depth/2));
  const c=candidates[0];Object.assign(u,{x:c.x,z:c.z,vx:c.x,vz:c.z});
  action='move';selected=u.index;focusBattleCamera(u,true);renderBattle();window.readabilityQA=c;return c;
 },contract);
 await page.waitForFunction(()=>IronVowScene.ready&&!IronVowScene.loadFailed,null,{timeout:120000});
 await page.evaluate(()=>IronVowScene.render(clock,1/60));
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
  const names=['terrain-risers','terrace-coping','road-markings','tactical-grid-corners'].map(name=>({name,count:scene.getObjectByName(name)?.geometry.attributes.position.count??0}));
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
 assert.equal(state.metrics.tilePitch,7.4);assert.equal(state.metrics.levelRise,1.55);
 assert.ok(Math.abs(state.pitch-7.4)<1e-6&&Math.abs(state.rise-1.55)<1e-4,'weapon-safe tile pitch and readable physical level rise');
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
 assert.ok(state.names.every(o=>o.count>0)&&state.roadCount>0,'retaining faces, coping, link markings and grid ticks are present');
 assert.equal(state.names.find(o=>o.name==='road-markings').count,state.linkCount*6,'road stripes follow each link bit');
 assert.equal(state.renderer.contexts,1);assert.ok(state.overflow[0]<=state.overflow[1]+1,'document fits viewport');
 assert.ok(state.pathsReach===1,'adjacent ramp is reachable in one step');
 assert.deepEqual(state.picked,{x:fixture.next[0],z:fixture.next[1]},'ramp destination center is pickable');
 const p=state.project;if(mobile){await page.touchscreen.tap(p.x,p.y);await page.locator('#move-preview').waitFor();await page.touchscreen.tap(p.x,p.y);}else await page.mouse.click(p.x,p.y);
 await page.waitForFunction(([x,z])=>current().x===x&&current().z===z&&!battle.busy,fixture.next,{timeout:120000});
 const after=await page.evaluate(()=>({ids:battle.units.map(v=>v.id),terrain:JSON.stringify(battle.field.cells),seed:battle.terrainSeed}));
 assert.deepEqual(after,{ids:state.ids,terrain:state.terrain,seed:state.seed},'movement preserves unit IDs and seeded terrain');
 if(mobile){
  for(const selector of ['#move','#fire','#end','#target-toggle']){const rect=await page.locator(selector).boundingBox();assert.ok(rect&&rect.width>=44&&rect.height>=44,selector+' has a 44px touch target');}
  await page.locator('#target-toggle').tap();assert.equal(await page.locator('#target-toggle').getAttribute('aria-expanded'),'true');
  assert.ok(await page.locator('#target-panel').isVisible(),'target details can be read');
  await page.locator('#target-toggle').tap();assert.equal(await page.locator('#target-toggle').getAttribute('aria-expanded'),'false');
 }
 return {...state,terrain:undefined};
};
