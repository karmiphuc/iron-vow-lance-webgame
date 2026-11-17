/* Shared scene and live-bone checks from qa/check-scene.cjs and
 * docs/reference/claude/rig-bench.html:2588–2640. */
(function(root){
'use strict';
const checks=Object.freeze({
 nan:'Non-finite transform',footGround:'Off-ground planted foot',footSlide:'Sliding planted foot',ikReach:'IK overreach',
 kneeDir:'Reversed knee',bounds:'Out of bounds',overlap:'Footprint overlap',stuck:'Stuck movement',
 weaponMount:'Detached weapon',muzzleFar:'Displaced muzzle',noDamage:'Missing damage',deadPartDamage:'Damage on destroyed part',
 hpRange:'HP out of range',wreckActs:'Active wreck',partVisual:'Incorrect part state',triJump:'Geometry grew after damage',
 frameSpike:'Frame time spike',aimOff:'Aim off target',popSwap:'Mid-action model swap'
});
 const hull=points=>{
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),p=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),lower=[],upper=[];
  for(const point of p){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),point)<=0)lower.pop();lower.push(point);}
  for(const point of p.reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),point)<=0)upper.pop();upper.push(point);}
  return lower.slice(0,-1).concat(upper.slice(0,-1));
 };
 const overlaps=(a,b)=>{
  const polygon=u=>hull(u.footprint.map(p=>[u.root[0]+(p[0]-u.root[0])*.8,u.root[2]+(p[1]-u.root[2])*.8])),A=polygon(a),B=polygon(b);
  if(A.length<3||B.length<3)throw Error('A live rig has no measurable foot geometry');
  for(const P of [A,B])for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length],axis=[q[1]-p[1],p[0]-q[0]],length=Math.hypot(...axis);axis[0]/=length;axis[1]/=length;
   const x=A.map(v=>v[0]*axis[0]+v[1]*axis[1]),y=B.map(v=>v[0]*axis[0]+v[1]*axis[1]);if(Math.min(Math.max(...x),Math.max(...y))-Math.max(Math.min(...x),Math.min(...y))<=.01)return false;
  }return true;
 };
function observe(q,s,scene){
  const lower=q.bounds?.lower??scene.world(-.5,-.5),upper=q.bounds?.upper??scene.world(s.size.width-.5,s.size.depth-.5);
  const fail=(type,u,detail)=>{
   const key=type+'|'+(u?.id??'scene');if(q.keys.has(key))return;
   q.keys.add(key);q.anomalies.push({type,unit:u?.id,frame:u?.frame,time:s.time,detail});
  };
  if(q.durations&&Number.isFinite(q.frameMs)&&q.frameMs>0){
   const times=q.durations,reference=[...times].sort((a,b)=>a-b)[times.length>>1];
   if(times.length>=24&&q.frameMs>Math.max(32,reference*3,reference+20))fail('frameSpike',null,{milliseconds:q.frameMs,reference});
   if(times.length>=60)times.shift();
   times.push(q.frameMs);
  }
  for(const u of s.units.filter(u=>u.live)){
   q.frames.add(u.frame);
   if(!u.root){fail('popSwap',u,'A ready rig lost its rendered root');continue;}
   if(!u.finite||![u.vx,u.vz,...(u.root||[]),...(u.matrix||[])].every(Number.isFinite))fail('nan',u,'non-finite unit or bone matrix');
   if(u.vx<-.5||u.vz<-.5||u.vx>s.size.width-.5||u.vz>s.size.depth-.5||u.root[0]<lower.x||u.root[0]>upper.x||u.root[2]<lower.z||u.root[2]>upper.z)fail('bounds',u,{logical:[u.vx,u.vz],root:u.root});
   if(u.alive)for(const f of u.feet){
    const key=u.id+'/'+f.side,planted=!f.swing&&!f.settle&&!u.motion?.jumpjet,previous=q.feet.get(key),error=f.ankle[1]-f.ground-f.ankleHeight;
    const m=scene.models.get(u.id)?.entry?.m,legIndex=m?.rig.legs.findIndex(l=>l.side===f.side),poseLift=Boolean(m?.legs[legIndex]?.poseLift);
    if(Math.hypot(...f.hip.map((n,i)=>n-f.ankle[i]))>f.reach+.01||!poseLift&&(Math.hypot(...f.ankle.map((n,i)=>n-f.target[i]))>.02||Math.hypot(...f.hip.map((n,i)=>n-f.target[i]))>f.reach+.01))fail('ikReach',u,{side:f.side,poseLift,ankle:f.ankle,hip:f.hip,target:f.target,reach:f.reach,kneeContact:f.kneeContact,moving:u.moving,attacking:u.attacking});
    if(planted&&Math.abs(error)>.15)fail('footGround',u,{side:f.side,error,ankle:f.ankle,goal:f.target,moving:u.moving,attacking:u.attacking});
    if(f.kneeContact&&Math.abs(f.kneeContact.point[1]-f.kneeContact.ground)>.15)fail('footGround',u,{side:f.side,kneeContact:f.kneeContact});
    if(planted&&previous){const drift=Math.hypot(f.ankle[0]-previous[0],f.ankle[2]-previous[2]);if(drift>.3)fail('footSlide',u,{side:f.side,drift,moving:u.moving,attacking:u.attacking,previous,foot:f});}
    if(planted){if(!previous)q.feet.set(key,f.ankle);}else q.feet.delete(key);
   }
   if(q.extra&&u.inspection){
    const prior=q.extra.get(u.id),current=u.inspection;
    for(const leg of current.knees)if(Math.abs(leg.offset)>.06&&leg.offset*(leg.reverse?-1:1)<0)fail('kneeDir',u,leg);
    if(prior){
     const hurt=Object.keys(u.hp).some(k=>u.hp[k]<prior.hp[k]);
     if(hurt&&(current.triangles>prior.triangles*1.02||current.calls>prior.calls+2))fail('triJump',u,{triangles:current.triangles,prior:prior.triangles});
     if(!hurt&&u.attacking&&prior.attacking&&current.loadout===prior.loadout&&current.signature!==prior.signature)
      fail('popSwap',u,'Geometry or material changed during an attack without damage or a loadout change');
    }
    q.extra.set(u.id,{...current,hp:{...u.hp},attacking:u.attacking});
   }
   if(q.combatGate){
    if(!u.alive&&u.attacking)fail('wreckActs',u,'dead actor retains an active attack');
    if(u.muzzleDistance!==null&&u.muzzleDistance>.3)fail('muzzleFar',u,u.muzzleDistance);
    for(const [part,hp] of Object.entries(u.hp))if(!Number.isFinite(hp)||hp<0||hp>u.max[part])fail('hpRange',u,{part,hp,max:u.max[part]});
    const oldObject=q.objects.get(u.id);if(oldObject&&oldObject!==u.object)fail('popSwap',u,{before:oldObject,after:u.object});q.objects.set(u.id,u.object);
    if(u.armed){const profile=root.IronVowWeaponFX.get(u.weapon);if(profile.asset&&!u.weaponMounted)fail('weaponMount',u,{weapon:u.weapon,asset:u.primaryAsset});}
    for(const [part,v] of Object.entries(u.partVisual||{})){const want=u.hp[part]<=0?2:u.hp[part]<u.max[part]/2?1:0;
     if(v.state!==want||want===2&&v.visible>0)fail('partVisual',u,{part,want,visual:v});}
   }
   const prior=q.motion.get(u.id);
   if(u.moving&&u.alive){if(!prior||Math.hypot(u.root[0]-prior.x,u.root[2]-prior.z)>1)q.motion.set(u.id,{x:u.root[0],z:u.root[2],time:s.time});
    else if(s.time-prior.time>4)fail('stuck',u,'wanted to move for more than 4 seconds without crossing 1 metre');
   }else q.motion.delete(u.id);
  }
  if(q.combatGate)for(const e of q.events??scene.combat?.history??[]){if(e.sequence<=q.combatSeen)continue;q.combatSeen=e.sequence;q.combatCounts[e.type]=(q.combatCounts[e.type]||0)+1;if(q.combatTrace)q.combatTrace.push(Object.fromEntries(['type','actor','target','weapon','index','socket','planned','damage','before','after','shield'].filter(k=>e[k]!==undefined).map(k=>[k,e[k]])));
   const u=s.units.find(u=>u.id===e.actor);if(!u?.live)continue;
   if((e.type==='launch'||e.type==='impact')&&!e.actorAlive)fail('wreckActs',u,e);
   if(e.type==='launch'){
    if(e.archetype!=='missile')q.maximumLaunchAimError=Math.max(q.maximumLaunchAimError||0,e.aimError||0);
    if(!e.mounted)fail('weaponMount',u,e);
    if((q.extra||e.archetype!=='missile')&&(e.aimError==null||e.aimError>(q.extra?8*Math.PI/180:.12)))fail('aimOff',u,e);
    if(e.expectedOrigin&&Math.hypot(...e.origin.map((n,i)=>n-e.expectedOrigin[i]))>.3)fail('muzzleFar',u,e);
   }
   if(e.type==='impact'){
    if(e.damage!==e.before-e.after||e.before>0&&e.planned>0&&e.damage<=0)fail('noDamage',u,e);
    if(e.before<=0&&e.damage>0)fail('deadPartDamage',u,e);
   }
  }
  const units=s.units.filter(u=>u.live&&u.alive&&u.root);
  for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++){
   const a=units[i],b=units[j],d=Math.hypot(a.root[0]-b.root[0],a.root[2]-b.root[2]);
   if(d<(a.radius+b.radius)*.8){q.circleCandidates++;fail('overlap',a,{other:b.id,distance:d,threshold:(a.radius+b.radius)*.8,source:'reference footprint radii'});}
   if(overlaps(a,b))fail('overlap',a,{other:b.id,distance:d,footprintA:a.footprint,footprintB:b.footprint});
  }
  for(const u of units)for(const cover of s.covers){const x=Math.max(cover.min[0],Math.min(cover.max[0],u.root[0])),z=Math.max(cover.min[2],Math.min(cover.max[2],u.root[2]));
   if(Math.hypot(u.root[0]-x,u.root[2]-z)<u.radius*.5)fail('overlap',u,{source:'cover',cover});
  }
}
function inspection(mech,entry){
 const T=root.THREE,point=node=>node.getWorldPosition(new T.Vector3());
 const knees=[];
 for(const [i,leg] of mech.rig.legs.entries()){
  if(mech.legs[i].poseLift)continue;
  const hip=point(leg.hip),axis=point(leg.an).sub(hip),knee=point(leg.kn).sub(hip),length=axis.lengthSq();
  if(length<1e-6)continue;
  const forward=new T.Vector3(0,0,1).applyQuaternion(leg.hip.parent.getWorldQuaternion(new T.Quaternion()));
  const offset=knee.addScaledVector(axis,-knee.dot(axis)/length).dot(forward);
  knees.push({side:leg.side,offset,reverse:mech.dims.reverse});
 }
 let calls=0,triangles=0;
 const signature=[];
 mech.cont.traverseVisible(mesh=>{
  if(!mesh.isMesh)return;
  calls++;
  triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;
  signature.push([mesh.uuid,mesh.geometry.uuid,...[mesh.material].flat().map(material=>material.uuid)].join('|'));
 });
 return {knees,calls,triangles,signature:signature.join(';'),
  loadout:[entry.primary?.id,entry.secondary?.id,entry.shoulderWeapon?.id,entry.shieldId].join('|'),
  legs:mech.build.mods.legs};
}
function observerState(){
 return {ticks:0,keys:new Set(),anomalies:[],feet:new Map(),motion:new Map(),frames:new Set(),objects:new Map(),
  combatSeen:0,combatGate:true,combatCounts:{},circleCandidates:0,extra:new Map(),durations:[]};
}
function createObserver(scene){
 let q=observerState(),last;
 function sample(snapshot,frameMs){
  if(!snapshot.ready||!snapshot.size)return;
  for(const unit of snapshot.units){
   const entry=scene.models.get(unit.id)?.entry;
   if(unit.live&&entry?.m)unit.inspection=inspection(entry.m,entry);
  }
  last=snapshot;q.ticks++;q.frameMs=frameMs;
  q.bounds={lower:scene.world(-.5,-.5),upper:scene.world(snapshot.size.width-.5,snapshot.size.depth-.5)};
  observe(q,snapshot,scene);
 }
 function inject(type,id){
  if(!Object.hasOwn(checks,type))throw Error('Unknown War check '+type);
  if(!last)throw Error('Wait for the first rendered War frame');
  const snapshot=structuredClone(last),probe=observerState();
  const unit=snapshot.units.find(u=>u.live&&u.id===id)??snapshot.units.find(u=>u.live&&u.alive&&u.feet.length);
  if(!unit)throw Error('No live War rig is available');
  const foot=unit.feet[0],key=unit.id+'/'+foot.side;
  const event={sequence:1,type:'launch',actor:unit.id,actorAlive:true,mounted:true,archetype:'rifle',aimError:0};
  probe.events=[];probe.bounds=q.bounds;
  // Probe the same predicates with perturbed observations. The active game,
  // real HP and render tree never inherit the observation's synthetic fault.
  switch(type){
   case 'nan':unit.finite=false;break;
   case 'footGround':foot.swing=foot.settle=false;foot.ankle[1]+=1;break;
   case 'footSlide':foot.swing=foot.settle=false;probe.feet.set(key,[foot.ankle[0]+1,...foot.ankle.slice(1)]);break;
   case 'ikReach':foot.reach=.01;break;
   case 'kneeDir':unit.inspection.knees=[{side:foot.side,offset:-1,reverse:false}];break;
   case 'bounds':unit.vx=-10;break;
   case 'overlap':{
    const other=snapshot.units.find(u=>u.live&&u.alive&&u.id!==unit.id);
    if(!other)throw Error('Overlap probe requires two live mechs');
    other.root=unit.root.slice();break;
   }
   case 'stuck':unit.moving=true;probe.motion.set(unit.id,{x:unit.root[0],z:unit.root[2],time:snapshot.time-5});break;
   case 'weaponMount':probe.events=[{...event,mounted:false}];break;
   case 'muzzleFar':unit.muzzleDistance=3;break;
   case 'noDamage':probe.events=[{...event,type:'impact',planned:10,damage:0,before:10,after:10}];break;
   case 'deadPartDamage':probe.events=[{...event,type:'impact',planned:10,damage:1,before:0,after:0}];break;
   case 'hpRange':unit.hp.body=unit.max.body+1;break;
   case 'wreckActs':unit.alive=false;unit.attacking=true;break;
   case 'partVisual':unit.partVisual.body.state=unit.hp.body?2:0;break;
   case 'triJump':probe.extra.set(unit.id,{hp:{...unit.hp,body:unit.hp.body+1},triangles:0,calls:0});break;
   case 'frameSpike':probe.durations=Array(24).fill(12);probe.frameMs=120;break;
   case 'aimOff':probe.events=[{...event,aimError:.8}];break;
   case 'popSwap':probe.objects.set(unit.id,'displaced-model');break;
  }
  observe(probe,snapshot,scene);
  return probe.anomalies.find(anomaly=>anomaly.type===type)??null;
 }
 return {reset(){q=observerState();last=null;},sample,inject,
  report:()=>({ticks:q.ticks,anomalies:q.anomalies.slice(),combat:{...q.combatCounts},rigs:[...(last?.units??[])]
   .filter(u=>u.live).map(u=>({frame:u.frame,weapon:u.weapon,melee:u.melee,legs:u.inspection?.legs}))})};
}
root.IronVowSceneDiagnostics={observe,checks,createObserver};
})(window);
