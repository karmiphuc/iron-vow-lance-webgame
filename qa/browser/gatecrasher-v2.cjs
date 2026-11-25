const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const close=(a,b,tolerance=1e-5)=>Math.hypot(...a.map((value,i)=>value-b[i]))<=tolerance;

async function equipLoadout(page,{shield,melee}){
 const fixture=await page.evaluate(({shield,melee})=>{
  const actor=battle.units.find(u=>u.team==='ally'&&u.frame===window.__qaBreachFrame);
  const target=battle.units.find(u=>u.team==='enemy'&&u.alive);
  if(!actor||!target)throw Error('Gatecrasher sortie fixture needs one ally and one live hostile');
  for(const unit of battle.units)if(unit!==actor&&unit!==target){unit.alive=false;unit.hp.body=0;}
  const x=Math.floor(battle.size.width/2),z=Math.floor(battle.size.depth/2);
  Object.assign(actor,{x,z,vx:x,vz:z,ap:80,alive:true,shield:shield||undefined,melee:melee||undefined,shoulder:'vesper-shoulder'});
  for(const part of Object.keys(actor.hp))actor.hp[part]=actor.max[part];
  Object.assign(target,{x:x+1,z,vx:x+1,vz:z,alive:true});
  for(const part of Object.keys(target.hp)){
   target.hp[part]=100000;
   target.max[part]=Math.max(target.max[part],100000);
  }
  battle.cover.clear();
  focusBattleCamera(actor,true);
  IronVowScene.clear();
  return {actor:actor.id,target:target.id,weapon:actor.weapon,shield:actor.shield,melee:actor.melee,shoulder:actor.shoulder};
 },{shield,melee});
 await page.waitForFunction(({actor})=>{
  const unit=battle?.units.find(u=>u.id===actor),entry=IronVowScene?.models.get(actor)?.entry;
  return Boolean(unit&&IronVowScene.ready&&IronVowScene.isLive(unit)&&entry?.m?.nativeV2?.source?.isObject3D&&
   entry.primary?.muzzle?.isObject3D&&entry.primary?.muzzle2?.isObject3D&&
   entry.shoulderWeapon?.muzzle?.isObject3D&&entry.shoulderWeapon?.muzzle2?.isObject3D);
 },fixture,{timeout:60000});
 const fitted=await page.evaluate(({actor})=>{
  const unit=battle.units.find(u=>u.id===actor),entry=IronVowScene.models.get(actor).entry;
  const shown=node=>{for(let current=node;current&&current!==entry.m.cont;current=current.parent)if(!current.visible)return false;return Boolean(node);};
  const source=entry.m.nativeV2.source;
  const authored=name=>source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
  return {weapon:unit.weapon,shield:shown(entry.shield?.mount),cleaver:shown(authored('socket.L')),
   vesper:shown(authored('mount.shoulderR')),left:entry.m.build.parts.left.filter(item=>item.detach).length,
   right:entry.m.build.parts.right.filter(item=>item.detach).length};
 },fixture);
 assert.equal(fitted.weapon,'morrow','The authored integral cannon remains the production primary');
 assert.equal(fitted.shield,Boolean(shield),'Shield loadout mounts on the actual left hand');
 assert.equal(fitted.cleaver,Boolean(melee),'Cleaver loadout mounts on the actual left hand');
 assert.equal(fitted.vesper,true,'Equipped Vesper is present on the live rig');
 assert.ok(fitted.left>0&&fitted.right>0,'Both authored arm sides expose detachable plate entries');
 return fixture;
}

async function observeLaunches(page,fixture,mode,weapon){
 await page.evaluate(({actor})=>{
  const combat=IronVowScene.combat;
  if(combat.__gatecrasherObserver)return;
  const launch=combat.launch;
  combat.__gatecrasherObservations=[];
  combat.launch=function(...args){
   const result=launch.apply(this,args),[unit]=args,event=this.history.at(-1);
   if(unit?.id===actor&&event?.type==='launch'){
    const entry=IronVowScene.models.get(actor)?.entry,socket=event.socket;
    const shoulder=socket.startsWith('shoulder'),weapon=shoulder?entry.shoulderWeapon:entry.primary;
    const marker=weapon?.[socket.endsWith('2')?'muzzle2':'muzzle'];
    entry.m.cont.updateMatrixWorld(true);
    const direct=marker?.getWorldPosition(new THREE.Vector3()).toArray();
    const original=entry.m.nativeV2.source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(marker.name));
    const authored=original?.getWorldPosition(new THREE.Vector3()).toArray();
    const resolved=IronVowScene.attachmentPoint(unit,socket).toArray();
    this.__gatecrasherObservations.push({event,direct,authored,resolved});
   }
   return result;
  };
  combat.__gatecrasherObserver=true;
 },fixture);
 const results=await page.evaluate(async({actor,target,mode,weapon})=>{
  const unit=battle.units.find(u=>u.id===actor);
  unit.ap=80;unit.attackAPSpent=0;
  const start=IronVowScene.combat.history.length;
  await __ironVow.attack(actor,target,'body',mode);
  return IronVowScene.combat.__gatecrasherObservations.filter(item=>item.event.sequence>start&&item.event.weapon===weapon);
 },{...fixture,mode,weapon});
 assert.ok(results.length>0,`${weapon} performs a real sortie launch`);
 for(const result of results){
  const {event,direct,authored,resolved}=result;
  assert.ok(Array.isArray(event.expectedOrigin),`${weapon} records its production muzzle origin`);
  assert.ok(close(event.origin,event.expectedOrigin),`${weapon} launch begins at its expected origin`);
  assert.ok(close(event.origin,direct)&&close(event.origin,authored),`${weapon} launch begins at the authored nozzle, not just the driver anchor`);
  assert.ok(close(event.origin,resolved),`${weapon} launch uses the scene attachment resolver`);
  assert.ok(event.mounted&&event.aimError<=8*Math.PI/180,`${weapon} is mounted and aimed: ${JSON.stringify(event)}`);
 }
 return results.length;
}

async function moveWithGait(page,actor){
 const result=await page.evaluate(async actorId=>{
  const unit=battle.units.find(u=>u.id===actorId),move=__ironVow.legalMoves(actorId)
   .filter(item=>item.cost>0&&item.cost<=movementLimit(unit)).sort((a,b)=>a.cost-b.cost)[0];
  if(!move)throw Error('Gatecrasher must have a legal tile move');
  const samples=[];
  const settled=new Promise(resolve=>{
   const sample=()=>{
    const entry=IronVowScene.models.get(actorId)?.entry,m=entry?.m;
    if(unit.motion&&m?.rig){
     m.cont.updateMatrixWorld(true);
     const feet=m.rig.legs.map((leg,i)=>{
      const state=m.legs[i];
      const actual=m.nativeV2.source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName('ankle.'+leg.side));
      const position=actual.getWorldPosition(new THREE.Vector3());
      return {moving:Boolean(state.swing||state.settle),swing:Boolean(state.swing),
       error:position.distanceTo(leg.an.getWorldPosition(new THREE.Vector3())),
       position:position.toArray(),plant:state.planted.toArray()};
     });
     samples.push(feet);
    }
    if(!unit.motion&&!battle.busy)resolve(samples);else requestAnimationFrame(sample);
   };
   requestAnimationFrame(sample);
  });
  await __ironVow.move(actorId,move.x,move.z);
  return {move,samples:await settled,position:{x:unit.x,z:unit.z}};
 },actor);
 assert.deepEqual(result.position,{x:result.move.x,z:result.move.z},'The legal Gatecrasher move completes in the sortie');
 assert.ok(result.samples.length>=8,'The actual live rig updates across the movement animation');
 assert.ok(result.samples.some(feet=>feet.some(foot=>foot.swing)),'An authored ankle swings during the legal move');
 let plantedPairs=0;
 const worstBinding=Math.max(...result.samples.flat().map(foot=>foot.error));
 for(let i=1;i<result.samples.length;i++)for(const [side,foot] of result.samples[i].entries()){
  const previous=result.samples[i-1][side];
  if(foot.moving||previous.moving||!close(foot.plant,previous.plant))continue;
  assert.ok(close(foot.position,previous.position,0.002),'A planted authored ankle stays fixed in world space');
  plantedPairs++;
 }
 assert.ok(plantedPairs>0&&worstBinding<1e-5,`Planted ankle samples ${plantedPairs}, maximum skin binding error ${worstBinding}`);
 return {samples:result.samples.length,plantedPairs,worstBinding};
}

async function destroySide(page,fixture,side,gear){
 const result=await page.evaluate(({actor,side,gear})=>{
  const unit=battle.units.find(u=>u.id===actor),entry=IronVowScene.models.get(actor).entry;
  const shown=node=>{for(let current=node;current&&current!==entry.m.cont;current=current.parent)if(!current.visible)return false;return Boolean(node);};
  unit.hp[side]=0;
  IronVowScene.render(clock,.016);
  const parts=entry.m.build.parts[side].filter(item=>item.detach);
  const source=entry.m.nativeV2.source;
  const authored=name=>source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
  const mount=gear==='shield'?entry.shield?.mount:gear==='cleaver'?authored('socket.L'):null;
  const modes=__ironVow.choices(actor).attacks.map(item=>item.mode);
  return {partState:entry.m.partState[side],marked:parts.length,visible:parts.filter(item=>item.m.visible).length,
   gearVisible:shown(mount),vesperVisible:shown(authored('mount.shoulderR')),modes};
 },{...fixture,side,gear});
 assert.equal(result.partState,2,`${side} destruction reaches the live rig damage state`);
 assert.ok(result.marked>0&&result.visible===0,`${side} destruction hides every marked native plate`);
 if(gear)assert.equal(result.gearVisible,false,`${side} destruction cuts the mounted ${gear}`);
 if(side==='right'){
  assert.equal(result.modes.includes('fire'),false,'Right arm destruction removes Morrow from legal attacks');
  assert.equal(result.modes.includes('missile'),false,'Right arm destruction disables the Vesper');
  assert.equal(result.vesperVisible,false,'Right arm destruction hides its shoulder pod');
 }
 if(side==='left'&&gear==='cleaver')assert.equal(result.modes.includes('strike'),false,'Left arm destruction removes the cleaver from legal attacks');
 return result;
}

module.exports=async function checkGatecrasherV2({page,origin,mobile,out,frame=3}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(frame=>{window.__qaBreachFrame=frame;try{localStorage.setItem('iron-vow-attack-camera','off')}catch{}},frame);
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ironVow&&window.IronVowScene);
 await page.evaluate(()=>{
  __ironVow.start({seed:4242,contract:0,frames:[window.__qaBreachFrame]});
  // The frame-override test seam keeps the slot's loadout. Fit its actual factory weapon.
  const actor=battle.units.find(u=>u.team==='ally'&&u.frame===window.__qaBreachFrame);
  actor.weapon=save.units[actor.index].weapon=FRAMES[window.__qaBreachFrame].weapon;
 });
 await page.waitForFunction(()=>battle?.phase==='player'&&battle.units.some(u=>u.team==='ally'&&u.frame===window.__qaBreachFrame)&&IronVowScene.ready,null,{timeout:60000});

 const live=await page.evaluate(()=>{
  const unit=battle.units.find(u=>u.team==='ally'&&u.frame===window.__qaBreachFrame),entry=IronVowScene.models.get(unit.id)?.entry;
  return {live:IronVowScene.isLive(unit),native:Boolean(entry?.m?.nativeV2?.source?.isObject3D),frame:unit.frame};
 });
 assert.equal(live.live,true,'Gatecrasher frame 3 must be a live rig in the active sortie');
 assert.equal(live.native,true,'The live sortie scene must use the native rig-v2 source');

 await page.evaluate(()=>{
  const unit=battle.units.find(u=>u.team==='ally'&&u.frame===window.__qaBreachFrame);
  unit.shield='citadel-shield';
  IronVowScene.clear();
 });
 await page.waitForFunction(()=>{
  const unit=battle?.units.find(u=>u.team==='ally'&&u.frame===window.__qaBreachFrame),entry=unit&&IronVowScene.models.get(unit.id)?.entry;
  return Boolean(IronVowScene.ready&&entry?.m?.nativeV2?.source?.isObject3D);
 },null,{timeout:60000});
 const shieldFixture=await page.evaluate(()=>{
  const actor=battle.units.find(u=>u.team==='ally'&&u.frame===window.__qaBreachFrame);
  return {actor:actor.id};
 });
 const gait=await moveWithGait(page,shieldFixture.actor);

 if(frame!==3){
  const light=await equipLoadout(page,{shield:'bulwark-shield',melee:null});
  const lightFit=await page.evaluate(({actor})=>{
   const e=IronVowScene.models.get(actor).entry,m=e.m,src=m.nativeV2.source,socket=src.getObjectByName(THREE.PropertyBinding.sanitizeNodeName('socket.L'));
   m.cont.updateMatrixWorld(true);const pos=o=>o.getWorldPosition(new THREE.Vector3()),box=new THREE.Box3();
   for(const item of m.build.parts.body)if(item.m.visible)box.union(new THREE.Box3().setFromObject(item.m));
   return {grip:pos(e.shield.grip).distanceTo(pos(socket)),face:box.distanceToPoint(pos(e.shield.face))};
  },light);assert.ok(lightFit.grip<1e-5&&lightFit.face>.02,JSON.stringify(lightFit));
 }
 const shield=await equipLoadout(page,{shield:'citadel-shield',melee:null});
 if(out&&!mobile&&frame===3){
  fs.mkdirSync(out,{recursive:true});
  const png=await page.screenshot();
  const image=await page.evaluate(async data=>{
   const source=new Image();
   source.src='data:image/png;base64,'+data;
   await source.decode();
   const canvas=document.createElement('canvas');
   canvas.width=source.width;canvas.height=source.height;
   canvas.getContext('2d').drawImage(source,0,0);
   return canvas.toDataURL('image/webp',.88).split(',')[1];
  },png.toString('base64'));
  fs.writeFileSync(path.join(out,'gatecrasher-sortie.webp'),image,'base64');
 }
 if(frame!==3){
  const geometry=await page.evaluate(({actor})=>{
   const entry=IronVowScene.models.get(actor).entry,m=entry.m,src=m.nativeV2.source,node=n=>src.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n));
   m.cont.updateMatrixWorld(true);const pos=o=>o.getWorldPosition(new THREE.Vector3()),shield=entry.shield;
   const gripError=pos(shield.grip).distanceTo(pos(node('socket.L'))),face=pos(shield.face);
   const body=new THREE.Box3();for(const item of m.build.parts.body)if(item.m.visible)body.union(new THREE.Box3().setFromObject(item.m));
   const skirtRoot=node('Continuous hip skirt');let skirt;skirtRoot.traverse(o=>{if(!skirt&&o.isSkinnedMesh)skirt=o});if(!skirt)throw Error('Skirt has no skinned primitive');const joint=skirt.skeleton.bones.findIndex(b=>b.name===THREE.PropertyBinding.sanitizeNodeName('hip.L'));
   const weights=skirt.geometry.attributes.skinWeight,indices=skirt.geometry.attributes.skinIndex;let vertex=-1;
   for(let i=0;i<weights.count;i++)for(let k=0;k<4;k++)if(indices[['getX','getY','getZ','getW'][k]](i)===joint&&weights[['getX','getY','getZ','getW'][k]](i)>.15){vertex=i;break;}
   if(vertex<0)throw Error('No weighted hip vertex');
   function vertexPoint(){const p=new THREE.Vector3().fromBufferAttribute(skirt.geometry.attributes.position,vertex);skirt.boneTransform(vertex,p);return skirt.localToWorld(p);}
   const before=vertexPoint(),hip=m.rig.legs.find(l=>l.side==='L').hip,rest=hip.quaternion.clone();hip.rotateX(.20);m.nativeV2.sync();m.cont.updateMatrixWorld(true);const deformation=before.distanceTo(vertexPoint());hip.quaternion.copy(rest);m.nativeV2.sync();
   return {gripError,faceToBody:body.distanceToPoint(face),deformation};
  },shield);
  assert.ok(geometry.gripError<1e-5&&geometry.faceToBody>.02&&geometry.deformation>.01,JSON.stringify(geometry));
 }
 if(frame!==3){
  const bodyLock=await page.evaluate(({actor})=>{const u=battle.units.find(x=>x.id===actor),e=IronVowScene.models.get(actor).entry,hp=u.hp.body;u.hp.body=0;IronVowScene.render(clock,.016);const result={legal:canUseWeapon(u,shoulderWeapon(u)),visible:e.m.nativeV2.source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName('mount.shoulderR')).visible};u.hp.body=hp;IronVowScene.render(clock,.016);return result;},shield);
  assert.deepEqual(bodyLock,{legal:false,visible:false},'Lost body disables the Vesper subsystem');
 }
 const morrow=await observeLaunches(page,shield,'fire','morrow');
 const vesper=await observeLaunches(page,shield,'missile','missile');
 await destroySide(page,shield,'left','shield');

 const cleaver=await equipLoadout(page,{shield:null,melee:'cleaver'});
 if(frame!==3){
  const tip=await page.evaluate(({actor})=>{
   const e=IronVowScene.models.get(actor).entry,src=e.m.nativeV2.source,node=n=>src.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n));
   const p=e.secondary.tip.getWorldPosition(new THREE.Vector3());return {error:p.distanceTo(node('Cleaver Tip.L').getWorldPosition(new THREE.Vector3())),bounds:e.secondary.bounds().distanceToPoint(p)};
  },cleaver);assert.ok(tip.error<1e-5&&tip.bounds<.15,JSON.stringify(tip));
 }
 await observeLaunches(page,cleaver,'fire','morrow');
 await observeLaunches(page,cleaver,'missile','missile');
 if(frame!==3){
  const strikes=await page.evaluate(async({actor,target})=>{
   const combat=IronVowScene.combat,old=combat.landed,hits=[];
   combat.landed=function(...args){const result=old.apply(this,args);if(args[0].id===actor&&args[2].id==='cleaver'){
    const e=IronVowScene.models.get(actor).entry,p=e.secondary.tip.getWorldPosition(new THREE.Vector3()),n=e.m.nativeV2.source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName('Cleaver Tip.L'));
    hits.push({damage:args[3].damage,tipError:p.distanceTo(n.getWorldPosition(new THREE.Vector3())),bounds:e.secondary.bounds().distanceToPoint(p)});
   }return result;};
   const u=battle.units.find(u=>u.id===actor);u.ap=80;u.attackAPSpent=0;ruleRandom=()=>0;
   try{await __ironVow.attack(actor,target,'body','strike')}finally{combat.landed=old;}
   return hits;
  },cleaver);
  assert.ok(strikes.length>0&&strikes.every(x=>x.damage>0&&x.tipError<1e-5&&x.bounds<.15),JSON.stringify(strikes));
 }
 await destroySide(page,cleaver,'left','cleaver');
 await destroySide(page,cleaver,'right',null);
 if(frame!==3)await assert.rejects(page.evaluate(({actor,target})=>
  __ironVow.attack(actor,target,'body','missile'),cleaver),/Illegal test attack/,
 'Right arm destruction rejects a Vesper attack in the live sortie');

 const lifecycle=await page.evaluate(actor=>{
  const entry=IronVowScene.models.get(actor)?.entry,cont=entry?.m?.cont;
  if(!cont)throw Error('Gatecrasher rig disappeared before sortie exit');
  const geometries=new Map();
  cont.traverse(node=>{
   if(!node.geometry||geometries.has(node.geometry))return;
   const item={geometry:node.geometry,disposeCount:0};
   node.geometry.addEventListener('dispose',()=>item.disposeCount++);
   geometries.set(node.geometry,item);
  });
  window.__gatecrasherLifecycle={cont,geometries:[...geometries.values()]};
  const contexts=IronVowRenderer.metrics().contexts;
  for(const unit of battle.units)if(unit.team==='enemy'){unit.alive=false;unit.hp.body=0;}
  finish(true);
  return {contexts};
 },cleaver.actor);
 await page.waitForFunction(()=>!battle&&document.body.dataset.view==='career');
 const disposed=await page.evaluate(()=>({
  detached:window.__gatecrasherLifecycle.cont.parent===null,
  geometries:window.__gatecrasherLifecycle.geometries.length,
  disposedOnce:window.__gatecrasherLifecycle.geometries.every(item=>item.disposeCount===1),
  contexts:IronVowRenderer.metrics().contexts
 }));
 assert.equal(lifecycle.contexts,1,'The sortie uses one shared renderer');
 assert.ok(disposed.geometries>0&&disposed.disposedOnce,'Native chassis geometries dispose exactly once on sortie exit');
 assert.equal(disposed.detached,true,'The live rig leaves the scene when the sortie ends');
 assert.equal(disposed.contexts,1,'Leaving the sortie retains the shared renderer');
 return {gait,morrow,vesper,cleaver:true,damage:true,disposal:disposed.geometries,contexts:disposed.contexts};
};
