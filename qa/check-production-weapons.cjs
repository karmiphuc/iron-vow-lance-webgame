/* Actual GLB geometry and shipped arsenal animation, without a GPU. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
globalThis.window=globalThis;globalThis.self=globalThis;
const root=path.resolve(__dirname,'../dist');
for(const name of ['rig-bench/vendor/three.min.js','rig-bench/vendor/GLTFLoader.js','armory-visuals.js','foundry/production-arsenal.js','scene/weapon-fx.js'])vm.runInThisContext(fs.readFileSync(path.join(root,name),'utf8'),{filename:name});
const buffer=name=>{const b=fs.readFileSync(path.join(root,'rig-bench',name));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
(async()=>{
 const A=IronVowProductionArsenal,source=await A.load(buffer('weapons.glb'),buffer('expansion-weapons.glb'),buffer('shields.glb'));
 let count=0;
 for(const [id,profile] of Object.entries(IronVowWeaponFX.profiles)){
  if(!profile.asset)continue;
  const socket=new THREE.Object3D(),mounted=A.mount(source,profile.asset,socket);assert.ok(mounted,id+' physical asset exists');assert.equal(mounted.mount.parent,socket);
  socket.updateMatrixWorld(true);
  if(profile.archetype!=='blade'){
   assert.ok(mounted.muzzle,id+' has a real muzzle');const p=mounted.muzzle.getWorldPosition(new THREE.Vector3()),bounds=new THREE.Box3().setFromObject(mounted.model);
   assert.ok(bounds.distanceToPoint(p)<.3,id+' muzzle sits at the actual weapon geometry');
   if(profile.asset==='missile'||profile.asset==='cerberus'){assert.ok(mounted.muzzle2,id+' second physical emitter');assert.ok(mounted.muzzle2.getWorldPosition(new THREE.Vector3()).distanceTo(p)>.05,id+' distinct physical emitters');}
  }
  count++;
 }
 const hand=new THREE.Object3D(),piledriver=A.mount(source,'piledriver',hand);assert.ok(piledriver.spike);
 const position=()=>{hand.updateMatrixWorld(true);return piledriver.spike.getWorldPosition(new THREE.Vector3());};
 A.animate(piledriver,{strikeProgress:0});const rest=position();A.animate(piledriver,{strikeProgress:.7});assert.ok(position().distanceTo(rest)>.49,'The visible spike extends during contact');
 A.animate(piledriver,{strikeProgress:.99});assert.ok(position().distanceTo(rest)<1e-8,'The visible spike returns after contact');
 const parallax=A.mount(source,'parallax',hand);A.animate(parallax,{weaponCharge:0});const dark=parallax.chargeMaterials.map(m=>m.emissiveIntensity);A.animate(parallax,{weaponCharge:1});assert.ok(parallax.chargeMaterials.some((m,i)=>m.emissiveIntensity>dark[i]),'Actual Parallax materials charge');
 // Exercise the shipped solver against actual GLB emitters on a rotated socket hierarchy.
 globalThis.IronVowFoundryRig={V3:(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z)};
 // Preserve the pre-fix algorithm as an isolated negative control without requiring Git history at test time.
 const T=THREE,V3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
 const oldAim=(m,weapon,target,weight,node)=>{
  const wrist=node||m.rig.arms.R.wr,worldQ=new T.Quaternion(),parentQ=new T.Quaternion(),delta=new T.Quaternion();
  for(let i=0;i<3;i++){
   m.cont.updateMatrixWorld(true);
   const muzzle=weapon.muzzle.getWorldPosition(V3()),line=weapon.muzzle.getWorldDirection(V3()),desired=target.clone().sub(muzzle).normalize();
   if(line.lengthSq()<.5||desired.lengthSq()<.5)break;
   delta.setFromUnitVectors(line,desired);delta.slerp(new T.Quaternion(),1-weight);
   wrist.getWorldQuaternion(worldQ);wrist.parent.getWorldQuaternion(parentQ);
   wrist.quaternion.copy(parentQ.invert().multiply(delta.multiply(worldQ)));
  }
 };
 vm.runInThisContext(fs.readFileSync(path.join(root,'foundry/scene-rigs.js'),'utf8'),{filename:'current-scene-rigs.js'});const aim=IronVowFoundry.aimMounted;
 let aimCases=0,worstOld=0,worstNew=0;
 for(const id of ['rampart','hailstorm']){
  const cont=new THREE.Object3D(),parent=new THREE.Object3D(),wrist=new THREE.Object3D(),socket=new THREE.Object3D();
  cont.position.set(4,2,-3);cont.rotation.y=.7;cont.scale.setScalar(.9);cont.add(parent);parent.rotation.set(.2,-.4,.1);parent.add(wrist);wrist.position.set(1,1.2,.5);wrist.add(socket);
  const mounted=A.mount(source,IronVowWeaponFX.get(id).asset,socket),m={cont,rig:{arms:{R:{wr:wrist}}}};
  const rest=wrist.quaternion.clone();cont.updateMatrixWorld(true);const radius=mounted.muzzle.getWorldPosition(new THREE.Vector3()).distanceTo(wrist.getWorldPosition(new THREE.Vector3()));
  for(const direction of [[1,.2,0],[-1,.4,.2],[0,1,.2],[0,-1,.3],[.2,.2,-1],[.3,1,-.8]])for(const gap of [.1,1.5]){
   wrist.quaternion.copy(rest);cont.updateMatrixWorld(true);const target=wrist.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(...direction).normalize().multiplyScalar(radius+gap));
   const error=solver=>{wrist.quaternion.copy(rest);solver(m,mounted,target,1);cont.updateMatrixWorld(true);return mounted.muzzle.getWorldDirection(new THREE.Vector3()).angleTo(target.clone().sub(mounted.muzzle.getWorldPosition(new THREE.Vector3())));};
   const before=error(oldAim),after=error(aim);worstOld=Math.max(worstOld,before);worstNew=Math.max(worstNew,after);aimCases++;
   assert.ok(after<1e-6,id+' actual close/steep muzzle axis aligns with the target: '+after);
  }
 }
 assert.ok(worstOld>.12,'Prior iterative solver reproduces actual close/steep barrel regression');
 console.log('PASS '+aimCases+' close/steep actual GLB emitter aim cases; prior max '+worstOld+' rad, current max '+worstNew+' rad');
 // Long-gun clearance uses actual biped/quad shoulder, elbow, wrist and socket bones.
 const {createCanvas}=require('@napi-rs/canvas');globalThis.document={createElement:()=>createCanvas(32,32)};
 for(const name of ['behemoth-core.js','chassis.js','rig-motion.js'])vm.runInThisContext(fs.readFileSync(path.join(root,'foundry',name),'utf8'),{filename:name});
 const longAssets=new Set();let clearanceCases=0,retractedCases=0,unreachableCases=0,clearanceMaximum=0;
 for(const profile of Object.values(IronVowWeaponFX.profiles)){
  if(!profile.asset||['blade','missile'].includes(profile.archetype)||longAssets.has(profile.asset))continue;
  let tested=false;
  for(const model of [0,3]){
   const m=IronVowFoundryRig.buildRig(model,'ally'),arm=m.rig.arms.R;m.scale=.9;m.cont.scale.setScalar(.9);m.cont.position.set(4,2,-3);m.cont.rotation.y=.7;
   const mounted=A.mount(source,profile.asset,arm.so);m.cont.updateMatrixWorld(true);
   const radius=mounted.muzzle.getWorldPosition(V3()).distanceTo(arm.wr.getWorldPosition(V3()));if(radius<3)continue;tested=true;
   const joints=[arm.sh,arm.el,arm.wr],rest=joints.map(j=>({q:j.quaternion.clone(),p:j.position.clone()})),mountPosition=mounted.mount.position.clone(),mountRotation=mounted.mount.quaternion.clone(),mountScale=mounted.mount.scale.clone();
   const reset=()=>{joints.forEach((j,i)=>{j.quaternion.copy(rest[i].q);j.position.copy(rest[i].p);});m.cont.updateMatrixWorld(true);};
   for(const direction of [[1,.2,0],[-1,.4,.2],[0,1,.2],[0,-1,.3],[.2,.2,-1],[.3,1,-.8]])for(const gap of [-1.25,-.3,.1,1.5]){
    reset();const pivot=arm.wr.getWorldPosition(V3()),shoulder=arm.sh.getWorldPosition(V3()),target=pivot.clone().add(new T.Vector3(...direction).normalize().multiplyScalar(radius+gap));
    // Distinguish a real retractable clearance case from a target physically inside every possible muzzle position.
    if(gap<0&&shoulder.distanceTo(target)+shoulder.distanceTo(pivot)<radius+.05){unreachableCases++;continue;}
    aim(m,mounted,target,1);m.cont.updateMatrixWorld(true);
    const muzzle=mounted.muzzle.getWorldPosition(V3()),axis=mounted.muzzle.getWorldDirection(V3()),error=axis.angleTo(target.clone().sub(muzzle));clearanceMaximum=Math.max(clearanceMaximum,error);clearanceCases++;
    assert.ok(error<1e-6,profile.asset+' actual model '+model+' close/steep clearance aim '+error+' gap '+gap);
    assert.ok(target.clone().sub(muzzle).dot(axis)>.04,profile.asset+' muzzle remains before the actual contact');
    assert.equal(mounted.mount.parent,arm.so);assert.ok(mounted.mount.position.distanceTo(mountPosition)<1e-12&&mounted.mount.quaternion.angleTo(mountRotation)<1e-7&&mounted.mount.scale.distanceTo(mountScale)<1e-12,'Weapon keeps its actual hand grip and scale');
    assert.ok(joints.every((j,i)=>j.position.distanceTo(rest[i].p)<1e-12),'Actual arm joint lengths stay unchanged');
    if(gap<0){retractedCases++;assert.ok(arm.sh.quaternion.angleTo(rest[0].q)>1e-6,'Infeasible wrist-only pose retracts the real shoulder');}
   }
  }
  if(tested)longAssets.add(profile.asset);
 }
 assert.ok(longAssets.has('parallax')&&retractedCases>0,'Actual long-gun negative-travel cases covered');
 console.log('PASS '+clearanceCases+' actual biped/quad long-gun cases ('+[...longAssets].join(', ')+'), '+retractedCases+' retracted poses, max '+clearanceMaximum+' rad; '+unreachableCases+' arm-only unreachable synthetic targets classified separately against gameplay');
 // Recheck recorded legal boundaries and the final missing endpoint class: real shield faces.
 const pitch=Number(process.env.IRON_VOW_AIM_PITCH||fs.readFileSync(path.join(root,'scene/battle.js'),'utf8').match(/TILE=([\d.]+)/)[1]),recorded=require('./fixtures/phase2-aim-clearance.json'),poseCache=new Map();
 const poseRig=(model,pose,shieldId)=>{
  const m=IronVowFoundryRig.buildRig(model,'ally');m.scale=.9;m.cont.scale.setScalar(.9);m.seed=5;m.primaryWeapon=A.mount(source,'parallax',m.rig.arms.R.so);m.offhand=shieldId?'shield':'free';m.aim.blend=1;m.aim.until=100;m.aim.point.set(0,4,12);
  for(let n=1;n<=35;n++)IronVowFoundryRig.animateMech(m,{pos:V3(),ground:0,groundAt:()=>0,face:0,heading:0,moving:false,speed:0,stepLen:1.7,brace:pose==='brace'?1:0,alive:true,deathAge:-1,ready:true,artillery:m.dims.quad&&pose!=='ready'?[1,1,1]:null},1/30,n/30);
  const arm=m.rig.arms.R,nodes=[m.rig.spine,arm.sh,arm.el,arm.wr],rest=nodes.map(n=>({p:n.position.clone(),q:n.quaternion.clone()}));return{m,nodes,rest,shield:shieldId?A.mountShield(source,shieldId,m.rig.arms.L.so):null};
 };
 const getPose=(model,pose)=>{const key=model+'/'+pose;if(!poseCache.has(key))poseCache.set(key,poseRig(model,pose));return poseCache.get(key);};
 let endpointCases=0,endpointMax=0,shieldCases=0,footDrift=0;const endpointFailures=[],enemyPoses=new Map(),torsoProgression=[];
 const checkEndpoint=(a,yaw,target,label)=>{
  const {m,nodes,rest}=a;nodes.forEach((n,i)=>{n.position.copy(rest[i].p);n.quaternion.copy(rest[i].q);});m.cont.rotation.y=yaw;m.cont.updateMatrixWorld(true);const feet=m.rig.legs.map(l=>l.an.getWorldPosition(V3())),grip=m.primaryWeapon.mount.position.clone();
  aim(m,m.primaryWeapon,target,1);m.cont.updateMatrixWorld(true);const w=m.primaryWeapon,error=w.muzzle.getWorldDirection(V3()).angleTo(target.clone().sub(w.muzzle.getWorldPosition(V3())));endpointMax=Math.max(endpointMax,error);endpointCases++;
  if(nodes[0].quaternion.angleTo(rest[0].q)>.01&&torsoProgression.length<2)torsoProgression.push({a,yaw,t:target.clone()});
  for(let i=0;i<feet.length;i++)footDrift=Math.max(footDrift,m.rig.legs[i].an.getWorldPosition(V3()).distanceTo(feet[i]));
  if(error>=1e-6)endpointFailures.push({label,pitch,error,target:target.toArray(),actorModel:m.frame,actorYaw:yaw});assert.ok(nodes.every((n,i)=>n.position.distanceTo(rest[i].p)<1e-12),'Joint connections remain intact');assert.equal(w.mount.parent,m.rig.arms.R.so);assert.ok(w.mount.position.distanceTo(grip)<1e-12,'Actual hand grip remains connected');
 };
 for(const f of recorded.fixtures){const t=V3(...f.target.point);t.x+=f.target.dx*(pitch-recorded.basePitch);t.z+=f.target.dz*(pitch-recorded.basePitch);checkEndpoint(getPose(f.actor.model,f.actor.pose),f.actor.yaw,t,'Recorded '+f.target.kind);}
 for(const enemyModel of [0,4])for(const actorModel of [1,5])for(const pose of ['ready','brace'])for(const shieldId of ['bulwark-shield','citadel-shield'])for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]])for(const level of [-1,0,1]){
  const key=enemyModel+'/'+pose+'/'+shieldId;if(!enemyPoses.has(key))enemyPoses.set(key,poseRig(enemyModel,pose,shieldId));const enemy=enemyPoses.get(key),yaw=Math.atan2(-dx,-dz);enemy.m.cont.rotation.y=yaw;enemy.m.cont.position.set(dx*pitch,level*.646,dz*pitch);enemy.m.cont.updateMatrixWorld(true);A.poseShield(enemy.shield,{alive:true,hp:{left:100}},yaw);enemy.m.cont.updateMatrixWorld(true);
  checkEndpoint(getPose(actorModel,pose),Math.atan2(dx,dz),enemy.shield.face.getWorldPosition(V3()),'Real '+shieldId+' face enemyModel='+enemyModel+' actorModel='+actorModel+' pose='+pose+' dx='+dx+' dz='+dz+' level='+level);shieldCases++;
 }
 assert.ok(footDrift<1e-8,'Torso/arm clearance preserves actual planted ankle positions');
 let progressionCases=0,maximumShoulderRate=0,maximumSpineRate=0;
 const progression=recorded.fixtures.slice(0,8).map(f=>{const t=V3(...f.target.point);t.x+=f.target.dx*(pitch-recorded.basePitch);t.z+=f.target.dz*(pitch-recorded.basePitch);return{a:getPose(f.actor.model,f.actor.pose),yaw:f.actor.yaw,t};}).concat(torsoProgression);
 for(const {a,yaw,t} of progression){let previous=null;
  for(const weight of [0,.2,.4,.6,.8,.95,.98,.99,1]){const{m,nodes,rest}=a;nodes.forEach((n,i)=>{n.position.copy(rest[i].p);n.quaternion.copy(rest[i].q);});m.cont.rotation.y=yaw;m.cont.updateMatrixWorld(true);aim(m,m.primaryWeapon,t,weight);const current={weight,spine:nodes[0].quaternion.clone(),shoulder:nodes[1].quaternion.clone()};if(previous&&previous.weight>=.95){const dw=weight-previous.weight;maximumShoulderRate=Math.max(maximumShoulderRate,current.shoulder.angleTo(previous.shoulder)/dw);maximumSpineRate=Math.max(maximumSpineRate,current.spine.angleTo(previous.spine)/dw);}previous=current;progressionCases++;}
 }
 assert.ok(maximumShoulderRate<8&&maximumSpineRate<2,'Ready-weight shoulder/torso progression has no late threshold snap');
 if(process.env.IRON_VOW_AIM_BOUNDED_REPORT)fs.writeFileSync(process.env.IRON_VOW_AIM_BOUNDED_REPORT,JSON.stringify({pitch,endpointCases,shieldCases,endpointMax,footDrift,progressionCases,torsoProgressionCases:torsoProgression.length,maximumShoulderRate,maximumSpineRate,endpointFailures},null,2)+'\n');
 assert.equal(endpointFailures.length,0,'Actual bounded part/miss/shield endpoints align: '+JSON.stringify(endpointFailures.slice(0,2)));
 console.log('PASS '+endpointCases+' bounded actual legal endpoints at pitch '+pitch+' ('+shieldCases+' real shield faces), max '+endpointMax+' rad, planted drift '+footDrift+'; '+progressionCases+' weighted poses, shoulder/spine rates '+maximumShoulderRate+'/'+maximumSpineRate);
 console.log('PASS '+count+' physical weapon aliases and sockets, geometry-adjacent emitters, real piledriver stroke and Parallax charge');
})().catch(e=>{console.error(e);process.exitCode=1;});
