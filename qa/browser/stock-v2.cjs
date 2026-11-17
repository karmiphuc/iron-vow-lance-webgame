const assert=require('node:assert/strict');
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
module.exports=async function checkStockV2({page,origin}){
 await page.addInitScript(()=>localStorage.setItem('iron-vow-attack-camera','off'));
 await page.goto(origin,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__ironVow&&document.querySelector('#nav button'));
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>__ironVow.start({seed:4242,frames:[1,2]}));
 await page.waitForFunction(()=>IronVowScene.ready&&battle.units.filter(u=>u.team==='ally').every(u=>IronVowScene.isLive(u)&&IronVowScene.models.get(u.id)?.entry?.armed),null,{timeout:120000});
 const details=await page.evaluate(async()=>{
  const all=[1,2].map(frame=>battle.units.find(u=>u.team==='ally'&&u.frame===frame)),results=[];
  for(const u of all){
   const entry=IronVowScene.models.get(u.id).entry,m=entry.m,src=m.nativeV2.source,node=name=>src.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name)),world=o=>o.getWorldPosition(new THREE.Vector3());
   const original={weapon:u.weapon,melee:u.melee,shield:u.shield,hp:{...u.hp}},before=JSON.stringify(captureSortie());
   const render=()=>IronVowScene.render(clock,.016),grip=(side,obj)=>world(obj.mount.parent).distanceTo(world(node('socket.'+side)));
   Object.assign(u,{weapon:'rail',melee:'pike',shield:null});render();
   const guns={gun:entry.primary.id,blade:entry.secondary.id,right:grip('R',entry.primary),left:grip('L',entry.secondary)};
   Object.assign(u,{melee:null,shield:'citadel-shield'});render();const shield={grip:grip('L',entry.shield),visible:entry.shield.mount.visible};
   u.hp.right=0;u.hp.left=0;render();const dead={gun:entry.primary.mount.visible,shield:entry.shield.mount.visible,plates:['right','left'].map(k=>m.build.parts[k].filter(x=>x.detach).every(x=>!x.m.visible))};
   Object.assign(u,original);u.hp=original.hp;render();
   const after=JSON.stringify(captureSortie());
   const materialNames=new Set();src.traverse(o=>{if(o.isMesh)materialNames.add(o.material.name)});
   const paint={frame:u.frame,parts:['body','pilot','left','right','legs'].map(k=>m.build.parts[k].length),channels:['paint_primary','paint_secondary','paint_accent'].map(n=>materialNames.has(n)),visor:materialNames.has('visor'),stack:materialNames.has('stack')};
   const sourceSocket=['L','R'].map(side=>world(node('socket.'+side)).distanceTo(world(m.rig.arms[side].so)));
   const pistonPairs=[];for(let i=1;i<=10;i++){const a=node(`piston.${i}.a`),b=node(`piston.${i}.b`);if(!a||!b)throw Error('Missing piston '+i);pistonPairs.push([a,b,a.worldToLocal(world(b)).normalize().clone(),b.worldToLocal(world(a)).normalize().clone()]);}
   const fixture=[...__ironVow.legalMoves(u.id)].find(p=>p.cost===2&&p.x===u.x+2&&p.z===u.z);if(!fixture)throw Error('Missing stock ground two-step '+u.frame);
   const samples=[];let moving=true;const sampled=new Promise(resolve=>{function sample(){if(!moving){resolve();return}if(u.motion)samples.push(m.rig.legs.map((leg,i)=>{const p=world(node('ankle.'+leg.side)),state=m.legs[i];return {p:p.toArray(),sole:new THREE.Box3().setFromObject(node('ankle.'+leg.side)).min.y,binding:p.distanceTo(world(leg.an)),goal:p.distanceTo(state.foot),floor:IronVowScene.groundAt(p.x,p.z)+m.dims.ankleH*m.scale,swing:state.swing,settle:Boolean(state.settle),plant:state.planted.toArray()}}));requestAnimationFrame(sample)}requestAnimationFrame(sample)});
   try{await moveUnit(u,fixture.x,fixture.z)}finally{moving=false}await sampled;
   const pistonErrors=pistonPairs.flatMap(([a,b,axisA,axisB])=>[axisA.angleTo(a.worldToLocal(world(b)).normalize()),axisB.angleTo(b.worldToLocal(world(a)).normalize())]);
   results.push({originalAnkleH:m.dims.ankleH*m.scale,frame:u.frame,role:FRAMES[u.frame].role,original,saveUnchanged:before===after,guns,shield,dead,paint,sourceSocket,pistonErrors,samples});
  }
  return results;
 });
 assert.deepEqual(details.map(x=>[x.frame,x.role]),[[1,'RECON'],[2,'SUPPORT']]);
 for(const d of details){
  assert.ok(d.saveUnchanged,`Render preserved save and HP for ${d.frame}`);assert.deepEqual([d.guns.gun,d.guns.blade],['rail','pike']);assert.ok(d.guns.right<1e-5&&d.guns.left<1e-5&&d.shield.grip<1e-5&&d.shield.visible,JSON.stringify(d));
  assert.deepEqual(d.dead,{gun:false,shield:false,plates:[true,true]});assert.ok(d.paint.parts.every(Boolean)&&d.paint.channels.every(Boolean)&&d.paint.visor&&d.paint.stack&&d.sourceSocket.every(x=>x<1e-5)&&d.pistonErrors.every(x=>x<.02),JSON.stringify(d.paint));
  assert.ok(d.samples.length>=2&&d.samples.some(feet=>feet.some(f=>f.swing)),`Frame ${d.frame} swings during the actual step`);let planted=0,grounded=0;
  for(const [i,feet] of d.samples.entries())for(const [j,f] of feet.entries()){
   assert.ok(f.binding<1e-5&&f.goal<.04&&f.p[1]>=f.floor-.04,JSON.stringify(f));assert.ok(f.sole>=f.floor-d.originalAnkleH-.04,JSON.stringify({frame:d.frame,sole:f.sole,floor:f.floor,ankle:d.originalAnkleH}));if(!f.swing&&!f.settle&&Math.abs(f.p[1]-f.floor)<.04){assert.ok(f.sole-(f.floor-d.originalAnkleH)<.2,JSON.stringify(f));grounded++;}const prev=d.samples[i-1]?.[j];if(!prev||f.swing||f.settle||prev.swing||prev.settle||distance(f.plant,prev.plant)>1e-5)continue;
   assert.ok(distance(f.p,prev.p)<.004&&Math.abs(f.p[1]-f.floor)<.04,JSON.stringify(f));planted++;
  }assert.ok(grounded>0&&planted>0,`Frame ${d.frame}: ${grounded} grounded samples, ${planted} consecutive planted pairs`);console.log(`Frame ${d.frame}: ${grounded} grounded samples, ${planted} consecutive planted pairs`);
 }
 const colors=await page.evaluate(()=>[1,2].map(frame=>{
  const unit={frame,team:'ally',paint:'#617caa',trim:{s:'#303a44',a:'#d58837'},weapon:'rifle',melee:'cleaver',upgrade:0};
  const entry=IronVowFoundry.preview(unit,foundryModel(frame),'rig-v2',0,'battle'),materials=[];
  entry.m.nativeV2.source.traverse(o=>{if(o.isMesh&&o.material?.color)materials.push(o.material)});
  const match=(name,hex)=>{const want=new THREE.Color(hex).convertSRGBToLinear();return materials.some(m=>m.name===name&&m.map&&Math.hypot(m.color.r-want.r,m.color.g-want.g,m.color.b-want.b)<1e-6)};
  const data=entry.surface.getContext('2d').getImageData(0,0,640,640).data;let opaque=0;for(let i=3;i<data.length;i+=4)if(data[i]>100)opaque++;
  return {frame,channels:[match('paint_primary',unit.paint),match('paint_secondary',unit.trim.s),match('paint_accent',unit.trim.a)],opaque};
 }));
 for(const p of colors)assert.ok(p.channels.every(Boolean)&&p.opaque>1000,JSON.stringify(p));
 const fires=await page.evaluate(async()=>{
  const units=[1,2].map(frame=>battle.units.find(u=>u.team==='ally'&&u.frame===frame)),target=battle.units.find(u=>u.team==='enemy'&&!u.kind);
  if(!target)throw Error('Stock combat fixture needs an enemy mech');battle.cover.clear();Math.random=()=>0;ruleRandom=()=>0;
  Object.assign(target,{x:7,z:13,vx:7,vz:13});target.hp.right=target.hp.left=0;
  for(const p of ['body','pilot','legs'])target.max[p]=target.hp[p]=10000;
  const result=[];
  for(const u of units){
   Object.assign(u,{x:7,z:11,vx:7,vz:11,weapon:'rail',melee:null,shield:null,ap:20});
   IronVowScene.render(clock,.016);const before=target.hp.body,ap=u.ap;
   await shoot(u,target,'body',weapon('rail'),false,null);
   const events=IronVowScene.combat.history.filter(e=>e.actor===u.id&&e.type==='launch'&&e.weapon==='rail');
   result.push({frame:u.frame,damage:before-target.hp.body,ap:ap-u.ap,events:events.map(e=>({aim:e.aimError,mounted:e.mounted,origin:e.origin,expected:e.expectedOrigin}))});
  }return result;
 });
 for(const f of fires){assert.ok(f.damage>0&&f.ap>0&&f.events.length>0,JSON.stringify(f));for(const e of f.events)assert.ok(e.mounted&&e.aim<8*Math.PI/180&&distance(e.origin,e.expected)<1e-5,JSON.stringify(e));}
 const missile=await page.evaluate(async()=>{
  const basilisk=battle.units.find(u=>u.team==='ally'&&u.frame===2),kestrel=battle.units.find(u=>u.team==='ally'&&u.frame===1),target=battle.units.find(u=>u.team==='enemy'&&!u.kind);
  const entry=IronVowScene.models.get(basilisk.id).entry,source=entry.m.nativeV2.source,node=n=>source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n));
  Object.assign(basilisk,{x:7,z:11,vx:7,vz:11,weapon:stockHull(2).weapon,melee:null,shield:null,ap:20});
  Object.assign(target,{x:7,z:13,vx:7,vz:13});for(const p of ['body','pilot','legs'])target.hp[p]=target.max[p]=10000;
  battle.cover.clear();ruleRandom=()=>0;IronVowScene.render(clock,.016);
  const before=target.hp.body,originalRight=basilisk.hp.right,defaultWeapon=entry.primary.id;
  const visibleBody=node('spine.geometry').visible, podsRemainAfterLoss=()=>node('spine.geometry').visible;
  basilisk.hp.right=0;IronVowScene.render(clock,.016);const lock={canFire:canUseWeapon(basilisk,weapon('missile')),podsVisible:podsRemainAfterLoss(),mountVisible:entry.primary.mount.visible};
  basilisk.hp.right=originalRight;IronVowScene.render(clock,.016);
  const combat=IronVowScene.combat,launch=combat.launch,observed=[];
  combat.launch=function(...args){const result=launch.apply(this,args),event=this.history.at(-1);if(event?.type==='launch'&&event.actor===basilisk.id&&event.weapon==='missile'){
   const name=event.index%2?'pod.L':'pod.R';observed.push({event,name,pod:node(name).getWorldPosition(new THREE.Vector3()).toArray()});
  }return result;};
  await shoot(basilisk,target,'body',weapon('missile'),false,null);combat.launch=launch;
  const damage=before-target.hp.body,impacts=combat.history.filter(e=>e.type==='impact'&&e.actor===basilisk.id&&e.weapon==='missile').map(e=>({damage:e.damage,point:e.point,planned:e.planned}));
  Object.assign(basilisk,{weapon:'rail',ap:20});kestrel.weapon='missile';IronVowScene.render(clock,.016);
  const swap={basilisk:entry.primary.id,basiliskCarrier:entry.primary.mount.parent===entry.m.rig.arms.R.so,kestrel:IronVowScene.models.get(kestrel.id).entry.primary.id,kestrelCarrier:IronVowScene.models.get(kestrel.id).entry.primary.mount.parent===IronVowScene.models.get(kestrel.id).entry.m.rig.arms.R.so};
  return {stock:stockHull(2).weapon,defaultWeapon,visibleBody,lock,observed,damage,impacts,swap};
 });
 assert.equal(missile.stock,'missile');assert.equal(missile.defaultWeapon,'missile');assert.ok(missile.visibleBody&&missile.damage>0);
 assert.deepEqual(missile.lock,{canFire:false,podsVisible:true,mountVisible:false});
 assert.ok(missile.observed.length>=2&&missile.impacts.length>0&&missile.impacts.some(hit=>hit.damage>0&&hit.point.every(Number.isFinite)),JSON.stringify(missile));
 for(const [i,{event,name,pod}] of missile.observed.entries()){
  assert.equal(name,i%2?'pod.L':'pod.R');assert.equal(event.weapon,'missile');assert.ok(event.mounted&&event.aimError<8*Math.PI/180&&distance(event.origin,pod)<1e-5&&distance(event.expectedOrigin,pod)<1e-5,JSON.stringify({event,name,pod}));
 }
 assert.deepEqual(missile.swap,{basilisk:'rail',basiliskCarrier:true,kestrel:'missile',kestrelCarrier:true});
 const dispose=await page.evaluate(()=>{
  const entries=battle.units.filter(u=>u.team==='ally').map(u=>IronVowScene.models.get(u.id).entry),geometries=new Map();
  for(const entry of entries)entry.m.nativeV2.source.traverse(o=>{if(o.geometry&&!geometries.has(o.geometry)){geometries.set(o.geometry,0);o.geometry.addEventListener('dispose',()=>geometries.set(o.geometry,geometries.get(o.geometry)+1));}});
  IronVowScene.clear();return{removed:entries.every(e=>!e.m.cont.parent),geometries:geometries.size,once:[...geometries.values()].every(n=>n===1),contexts:IronVowRenderer.metrics().contexts};
 });assert.ok(dispose.removed&&dispose.geometries>0&&dispose.once&&dispose.contexts===1,JSON.stringify(dispose));
 console.log('PASS Kestrel and Basilisk live rigs, grips, damage, paint channels, grounded step and disposal');
 return {railReports:fires.map(({frame,events})=>({frame,reports:events.length})),basiliskPodReports:missile.observed.length,
  disposedGeometries:dispose.geometries};
};
