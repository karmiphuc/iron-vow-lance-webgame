const assert=require('node:assert/strict');
const {join}=require('node:path');
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));

module.exports=async function checkRavenVisuals({page,origin,tap,mobile}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>localStorage.setItem('iron-vow-attack-camera','off'));
 await page.goto(new URL('/',origin).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ironVow&&window.IronVowRigV2);
 await page.evaluate(()=>__ironVow.start({seed:42,contract:0,frames:[RAVEN_FRAME],loadouts:[{...stockHull(RAVEN_FRAME),paintVariant:2}]}));
 await page.waitForFunction(()=>{
  const unit=current();return IronVowScene.ready&&unit&&IronVowScene.models.get(unit.id)?.entry?.m.live==='raven';
 },null,{timeout:60000});
 assert.ok(await page.evaluate(()=>IronVowScene.models.get(current().id).entry.m.build.ownedMaterials.some(material=>
  material.name==='paint_primary'&&material.userData.fieldFinish==='midnight'&&material.userData.paintVariant===2&&
  material.roughness>=.9&&material.envMapIntensity<.2&&material.customProgramCacheKey().includes('raven-trim'))),
 'Battle coat uses the assigned matte Raven variant with luminous trim');
 assert.deepEqual(await page.evaluate(()=>{
  const counts=[0,0,0],source=IronVowScene.models.get(current().id).entry.m.nativeV2.source;
  let cavities=0,open=0,spill=0,trim=0;
  source.traverse(mesh=>{
   const inlays=mesh.geometry?.getAttribute('_raven_inlay');
   const ambient=mesh.geometry?.getAttribute('_raven_ao');
   const edges=mesh.geometry?.getAttribute('_raven_edge');
   for(let i=0;i<(inlays?.count??0);i++){
    if(inlays.getX(i)>.9)counts[0]++;
    if(inlays.getY(i)>.9)counts[1]++;
    if(inlays.getZ(i)>.9)counts[2]++;
    if(inlays.getZ(i)>.05&&inlays.getZ(i)<.45)spill++;
   }
   for(let i=0;i<(ambient?.count??0);i++){
    const visibility=ambient.getX(i);
    if(visibility<.65)cavities++;
    if(visibility>.95)open++;
   }
   for(let i=0;i<(edges?.count??0);i++)if(edges.getX(i)>.5)trim++;
  });
  return [...counts.map(count=>count>0),cavities>0,open>0,spill>0,trim>0];
 }),[true,true,true,true,true,true,true],'The three inlays, local spill, indigo bevels and contact occlusion are baked into the skinned armor');
 assert.ok(await page.evaluate(()=>{
  const {m}=IronVowScene.models.get(current().id).entry,shadow=m.cont.getObjectByName('Raven foot contact');
  const {position,contactStrength}=shadow.geometry.attributes;
  return [12,37].every(i=>{
   const point=shadow.localToWorld(new THREE.Vector3().fromBufferAttribute(position,i));
   return contactStrength.getX(i)>.25&&Math.abs(point.y-IronVowScene.groundAt(point.x,point.z)-.025)<.002;
  })&&shadow.geometry.boundingBox.isEmpty()&&!shadow.castShadow;
 }),'Both Raven feet shade the terrain at their sole contacts without expanding hit bounds');
 const walk=await page.evaluate(async()=>{
  const unit=current(),entry=IronVowScene.models.get(unit.id).entry,{m}=entry;
  const source=m.nativeV2.source;
  const find=name=>source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
  const position=name=>find(name).getWorldPosition(new THREE.Vector3());
  const local=name=>m.cont.worldToLocal(position(name)).toArray();
  const kneeFlex=side=>{
   const [hip,knee,ankle]=['hip','knee','ankle'].map(joint=>m.cont.worldToLocal(position(`${joint}.${side}`)));
   const thigh=knee.clone().sub(hip).setX(0),shin=ankle.sub(knee).setX(0);
   return THREE.MathUtils.radToDeg(thigh.angleTo(shin));
  };
  const feet=()=>m.rig.legs.map(({side},i)=>{
   const foot=position('ankle.'+side),state=m.legs[i];
   return {at:foot.toArray(),plant:state.planted.toArray(),goal:foot.distanceTo(state.foot),
    swing:state.swing||Boolean(state.settle),flex:kneeFlex(side)};
  });
  const shields=()=>['L','R'].map(side=>local('ShieldFace.'+side));
  const neutral={flex:['L','R'].map(kneeFlex),spread:local('ankle.L')[0]-local('ankle.R')[0]};
  window.ravenVisualFixture={unit,entry,feet,shields,position,find,kneeFlex,neutral};
  const tile=__ironVow.legalMoves(unit.id).find(({x,z,cost})=>cost===FRAMES[RAVEN_FRAME].moveAP&&terrainCell(x,z).level===terrainCell(unit.x,unit.z).level);
  if(!tile)throw Error('Raven fixture needs one same-level move');
  const samples=[];let done=false;
  const monitor=new Promise(resolve=>{
   function sample(){
    if(done){resolve();return;}
    if(unit.motion)samples.push(feet());
    requestAnimationFrame(sample);
   }
   requestAnimationFrame(sample);
  });
  try{await __ironVow.move(unit.id,tile.x,tile.z);}finally{done=true;}
  await monitor;
  return {samples,neutral};
 });
 assert.ok(walk.neutral.flex.every(angle=>angle>=9&&angle<=30),
  `Raven's live neutral knees are nearly straight with travel in reserve: ${walk.neutral.flex}`);
 assert.ok(Math.abs(walk.neutral.spread-2.87)<.025,'Raven preserves its standing foot spread');
 assert.ok(walk.samples.some(sample=>sample.some((foot,i)=>foot.swing&&foot.flex>walk.neutral.flex[i]+12)),
  'Raven flexes a knee to lift a foot on a legal move');
 let planted=0;
 for(const [i,feet] of walk.samples.entries())for(const [j,foot] of feet.entries()){
  const prev=walk.samples[i-1]?.[j];
  if(!prev||foot.swing||prev.swing||distance(foot.plant,prev.plant)>1e-5)continue;
  assert.ok(foot.goal<.06&&distance(foot.at,prev.at)<.05,JSON.stringify(foot));planted++;
 }
 assert.ok(planted>0,'Raven keeps a loaded foot at its world contact');
 await page.waitForFunction(()=>ravenVisualFixture.feet().every(foot=>!foot.swing));
 await page.evaluate(()=>{
  const fixture=ravenVisualFixture;
  fixture.ready=fixture.shields();fixture.samples=[];
  function sample(){
   if(fixture.samples.length<120){
    if(fixture.unit.brace)fixture.samples.push(fixture.shields());
    requestAnimationFrame(sample);
   }
  }
  requestAnimationFrame(sample);
 });
 await tap('#brace');
 await page.waitForFunction(()=>ravenVisualFixture.shields().every((position,i)=>Math.abs(position[0])<Math.abs(ravenVisualFixture.ready[i][0])-1),null,{timeout:15000});
 await page.waitForFunction(()=>clock-ravenVisualFixture.unit.braceTime>1);
 const guard=await page.evaluate(()=>{
  const {ready,shields,samples,entry,position,unit,kneeFlex,feet}=ravenVisualFixture;
  const attached=['left','right'].map((part,i)=>entry.m.nativeV2.anchors[part]
   .getWorldPosition(new THREE.Vector3()).distanceTo(position('ShieldFace.'+(i?'R':'L'))));
  return {ready,held:shields(),samples,attached,loadout:[entry.primary?.id,entry.secondary?.id],brace:unit.brace,
   flex:['L','R'].map(kneeFlex),footErrors:feet().map(foot=>foot.goal)};
 });
 assert.equal(guard.brace,true);
 assert.ok(guard.flex.every((angle,i)=>angle>walk.neutral.flex[i]+20)&&guard.footErrors.every(error=>error<.06),
  `Raven gains brace knee flex over planted feet: ${JSON.stringify({neutral:walk.neutral.flex,brace:guard.flex,errors:guard.footErrors})}`);
 assert.deepEqual(guard.loadout,['raven-gauntlet','raven-clamp']);
 assert.ok(guard.attached.every(error=>error<1e-5),'Guard impact anchors follow both moving shields');
 assert.ok(guard.held.every((position,i)=>position[2]-guard.ready[i][2]>.25),'Both shields swing ahead of their parked pose');
 assert.ok(guard.samples.some(sample=>Math.abs(sample[0][0])<Math.abs(guard.ready[0][0])-.15&&
  Math.abs(sample[0][0])>Math.abs(guard.held[0][0])+.15),'Brace visibly passes between ready and held');
 if(!mobile&&process.env.IRON_VOW_RAVEN_PROOF_DIR)await page.screenshot({path:join(process.env.IRON_VOW_RAVEN_PROOF_DIR,'raven-guard-battle.png')});

 const damage=await page.evaluate(async()=>{
  const {unit,entry}=ravenVisualFixture;
  const visible=()=>{
   const counts={left:0,right:0};
   entry.m.nativeV2.source.traverseVisible(node=>{
    const part=node.userData.part??node.geometry?.userData?.part;
    if(node.isMesh&&Object.hasOwn(counts,part))counts[part]++;
   });
   return [counts.left>0,counts.right>0,Boolean(entry.secondary),Boolean(entry.primary)];
  };
  const states=[visible()];
  for(const [left,right] of [[0,unit.max.right],[unit.max.left,0],[unit.max.left,unit.max.right]]){
   unit.hp.left=left;unit.hp.right=right;
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   states.push(visible());
  }
  return states;
 });
 assert.deepEqual(damage,[[true,true,true,true],[false,true,false,true],[true,false,true,false],[true,true,true,true]]);

 const weapons=await page.evaluate(async()=>{
  const {unit,entry,position}=ravenVisualFixture;
  const target=battle.units.find(foe=>foe.team==='enemy');
  let lane;
  for(let z=2;z<battle.size.depth-2&&!lane;z++)for(let x=2;x<battle.size.width-5&&!lane;x++){
   if([1,2,3].every(step=>terrainCell(x+step,z).level===terrainCell(x,z).level))lane={x,z};
  }
  if(!lane)throw Error('Raven fixture needs a level firing lane');
  const move=(unit,x,z,face)=>Object.assign(unit,{x,z,vx:x,vz:z,face,heading:headingTo(face,0)});
  move(unit,lane.x,lane.z,1);move(target,lane.x+3,lane.z,-1);
  unit.ap=14;unit.attackAPSpent=0;
  target.max.body=target.hp.body=5000;target.max.pilot=target.hp.pilot=5000;target.noCounter=true;
  battle.cover.clear();battle.field.cover={};ruleRandom=()=>.001;
  const history=IronVowScene.combat.history,start=history.length;
  await __ironVow.attack(unit.id,target.id,'body');
  const launches=history.slice(start).filter(e=>e.type==='launch'&&e.actor===unit.id);
  let clamp;
  const combat=IronVowScene.combat,landed=combat.landed;
  combat.landed=function(...args){
   const result=landed.apply(this,args),event=history.at(-1);
   if(event?.actor===unit.id&&event.weapon==='raven-clamp'&&event.type==='impact')clamp={event,tip:position('ClampTip.L').toArray()};
   return result;
  };
  unit.ap=14;unit.attackAPSpent=0;unit.brace=false;
  move(target,lane.x+1,lane.z,-1);
  try{await __ironVow.attack(unit.id,target.id,'body','strike');}
  finally{combat.landed=landed;}
  const {m}=entry;
  return {launches,clamp,clampMarker:m.nativeV2.strikeContact('raven-clamp')?.name};
 });
 assert.ok(weapons.launches.length>=1&&weapons.launches.every(e=>e.weapon==='raven-gauntlet'&&e.mounted&&
  distance(e.origin,e.expectedOrigin)<.001&&e.aimError<.1),'Live volleys launch from the aimed wrist: '+JSON.stringify(weapons.launches));
 assert.ok(weapons.clamp&&weapons.clampMarker&&distance(weapons.clamp.event.point,weapons.clamp.tip)<.001,
  'The clamp contact follows the authored claw: '+JSON.stringify(weapons.clamp));

 await page.evaluate(()=>{battle=null;page='hangar';hangarDeck='mechs';selected=0;render();});
 await page.waitForFunction(()=>IronVowHangarRuntime.scene?.records.some(({unit,rig})=>{
  if(unit?.frame!==RAVEN_FRAME)return false;
  const plate=rig.object.getObjectByName(THREE.PropertyBinding.sanitizeNodeName('ShieldFace.L'));
  let painted=false;
  rig.object.traverse(mesh=>{if(mesh.material?.userData.fieldFinish==='midnight'&&mesh.material.userData.paintVariant===2)painted=true;});
  return plate&&painted&&rig.object.getObjectByName('Raven foot contact');
 }),null,{timeout:60000});
 await tap('.command-deck [data-page="workshop"]');
 await page.locator('#paint-preview').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>IronVowWorkshop.snapshot()?.entry?.m.live==='raven',null,{timeout:60000});
 const paint=await page.evaluate(()=>{
  const {m}=IronVowWorkshop.snapshot().entry;
  return [...new Set(m.build.ownedMaterials.map(material=>material.userData.paintChannel))].sort();
 });
 assert.ok(['p','s','a'].every(channel=>paint.includes(channel)),'Workshop Raven exposes three paint channels');
 await page.waitForFunction(()=>IronVowWorkshop.snapshot()?.entry?.m.build.ownedMaterials.some(material=>
  material.userData.fieldFinish==='midnight'&&material.userData.paintVariant===2));
 await tap('[data-workshop-detail="paint"] > summary');
 assert.equal(await page.locator('[data-paint-finish="factory"]').getAttribute('aria-pressed'),'true');
 await tap('[data-paint-finish="splinter"]');
 await page.waitForFunction(()=>IronVowWorkshop.snapshot()?.entry?.m.build.ownedMaterials.some(material=>material.userData.fieldFinish==='splinter'));
 await tap('[data-paint-finish="factory"]');
 await page.waitForFunction(()=>IronVowWorkshop.snapshot()?.entry?.m.build.ownedMaterials.some(material=>
  material.userData.fieldFinish==='midnight'&&material.userData.paintVariant===2));

 const benchLink=await page.locator('[data-workshop-detail="trials"] .rig-bench-link').getAttribute('href');
 assert.equal(new URL(benchLink,origin).searchParams.get('paintVariant'),'2');
 await page.goto(new URL(benchLink,origin).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__bench?.state.loaded&&window.__bench.state.frame===30,null,{timeout:60000});
 assert.deepEqual((await page.evaluate(()=>__bench.state.clips.map(c=>c.name))).sort(),['BraceEnter','BraceExit','BraceHold','Fire','Idle','Walk']);
 await page.evaluate(()=>__bench.setClip('BraceHold'));
 await page.waitForFunction(()=>window.__bench?.state.clip==='BraceHold');
 if(!mobile&&process.env.IRON_VOW_RAVEN_PROOF_DIR)await page.screenshot({path:join(process.env.IRON_VOW_RAVEN_PROOF_DIR,'raven-guard-rig-bench.png')});
 console.log('PASS Raven movement, shoulder guard, arm loss, weapons, matte armor, grounded shadows, matching inlays, manual finish, and Rig Bench clips');
 return {planted,guardSamples:guard.samples.length,neutralKneeFlex:walk.neutral.flex,braceKneeFlex:guard.flex};
};
