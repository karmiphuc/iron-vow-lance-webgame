/* The hand-held armory uses the authored wrists. Board contacts are solved in
 * world space, while the GLB supplies upper-body cadence and the grounded wreck. */
(function(root){
'use strict';
const T=root.THREE,R=root.IronVowFoundryRig,V=R.V3,Q=()=>new T.Quaternion();
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(x,b));
const ease=x=>{const q=clamp(x);return q*q*(3-2*q);};
const range=(x,a,b)=>ease((x-a)/(b-a));
const configs=[
 {frame:24,id:'husky',stride:.95,sway:.15,lift:.34,drop:.09,period:1.44},
 {frame:25,id:'giza',stride:.89,sway:.17,lift:.31,drop:.12,period:1.44},
 {frame:26,id:'vyzov',stride:1.08,sway:.085,lift:.32,drop:.055,period:1.4}
];

function clipData(source,clips){
 const result=new Map();
 for(const clip of clips){
  const tracks=clip.tracks.map(track=>{
   const {nodeName,propertyName}=T.PropertyBinding.parseTrackName(track.name);
   return {node:source.getObjectByName(nodeName),property:propertyName,curve:track.createInterpolant()};
  }).filter(({node,property})=>node&&(property==='position'||property==='quaternion'));
  result.set(clip.name,{duration:clip.duration,tracks,
   rotations:new Map(tracks.filter(track=>track.property==='quaternion').map(track=>[track.node,track.curve]))});
 }
 return result;
}
function marker(parent,name,position,direction){
 const node=new T.Object3D();
 node.name=name;node.position.copy(position);
 node.quaternion.setFromUnitVectors(V(0,0,1),direction.clone().normalize());
 parent.add(node);
 return node;
}
function lowestPoint(node){
 let y=Infinity;
 const p=V();
 node.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const a=mesh.geometry.attributes.position;
  for(let i=0;i<a.count;i++)y=Math.min(y,p.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld).y);
 });
 return y;
}
function setClip(clip,time,origin,weight=1){
 for(const {node,property,curve} of clip.tracks){
  const value=node[property],sample=curve.evaluate(time);
  if(!origin||weight===1)value.fromArray(sample);
  else if(property==='position')value.copy(origin.get(node).position).lerp(V().fromArray(sample),weight);
  else value.copy(origin.get(node).quaternion).slerp(Q().fromArray(sample),weight);
 }
}
function reaction(m,I,t){
 const {motions,driven,body,mortar,shoulder}=m.campaignRig;
 const {brace,armed,attack,hitTime,mortarAge}=I;
 const ready=motions.get('Ready'),advance=motions.get('Advance'),braced=motions.get('Brace'),hit=motions.get('Armor hit');
 const walk=m.gait.w,phase=((m.gait.phase%1)+1)%1;
 const age=t-(hitTime??-100),contact=I.reducedMotion?0:range(age,0,.09)*(1-range(age,.21,.78));
 const gun=I.aimFromArm&&armed?clamp(Math.max(m.aim.blend,I.readyRelease??0)):0;
 const striking=Boolean(m.melee),prior=Q(),authored=Q();
 for(const [joint,role] of driven){
  prior.copy(joint.quaternion);
  const idle=ready.rotations.get(joint),step=advance.rotations.get(joint),plant=braced.rotations.get(joint);
  authored.fromArray(idle.evaluate(I.reducedMotion?0:t%ready.duration));
  if(walk>0&&step)authored.slerp(Q().fromArray(step.evaluate(phase*body.period)),walk);
  if(brace>0&&plant)authored.slerp(Q().fromArray(plant.evaluate(braced.duration*.38)),brace);
  if(contact>0&&hit.rotations.has(joint))authored.slerp(Q().fromArray(hit.rotations.get(joint).evaluate(clamp(age,0,hit.duration))),contact);
  // The normal equipment and melee solver owns fitted hands while they act.
  const tactical=role==='gun'?(striking?1:gun):role==='hand'?(striking||m.offhand==='shield'?1:0):gun*.78;
  joint.quaternion.copy(authored).slerp(prior,tactical);
 }
 if(armed&&!striking){
  const carry=1-gun,arm=m.rig.arms.R;
  arm.sh.rotateX(-.14*carry);
  arm.el.rotateX(-.72*carry);
 }
 if(shoulder)shoulder.pose(m,I,attack,t);
 if(I.reducedMotion)return;
 if(mortar){
  const age=I.ability?.name==='vyzov-cross'?t-I.ability.at:mortarAge;
  const loaded=Number.isFinite(age)?range(age,0,.34)*(1-range(age,.85,1.35)):0;
  const since=t-mortar.firedAt;
  const recoil=since>=0?(1-Math.exp(-110*since))*Math.exp(-13*since):0;
  mortar.mount.position.copy(mortar.rest).addScaledVector(mortar.axis,-.18*recoil);
  mortar.mount.rotation.x=.2*loaded-.07*recoil;
 }
}
function animate(m,I,dt,time){
 const state=m.campaignRig,{motions,chassis}=state;
 const fall=motions.get('Fall');
 if(!I.alive&&I.down!=='pilot'){
  if(!state.fall){
   const origin=new Map(fall.tracks.map(({node})=>[node,{position:node.position.clone(),quaternion:node.quaternion.clone()}]));
   state.fall={origin,yaw:m.init?m.yaw:I.face,settled:false};
  }
  if(state.fall.settled)return;
  const phase=clamp((I.deathAge??0)/1.92);
  const frame=phase*fall.duration;
  m.cont.position.set(I.pos.x,I.ground??0,I.pos.z);
  m.cont.rotation.set(0,state.fall.yaw,0,'YXZ');
  setClip(fall,frame,state.fall.origin,range(frame,0,.15));
  m.build.visorMat.emissiveIntensity=1-range(frame,.07,.58);
  m.cont.updateMatrixWorld(true);
  // The authored fall already rests on a level floor. Correct the settle at
  // its actual hull footprint when a battlefield tile has a grade or bluff.
  if(I.groundAt&&frame>.46){
   const support=[m.rig.pelvis,...m.rig.legs.map(leg=>leg.an),...Object.values(m.rig.arms).map(arm=>arm.el)];
   let raise=0;
   for(const joint of support){
    const point=joint.getWorldPosition(V()),box=new T.Box3().setFromObject(joint);
    const offset=I.groundAt(point.x,point.z)-(I.ground??0);
    if(offset>0)raise=Math.max(raise,Math.min(offset, I.groundAt(point.x,point.z)-box.min.y));
   }
   m.cont.position.y+=raise;
   m.cont.updateMatrixWorld(true);
  }
  state.fall.settled=phase>=1;
  return;
 }
 if(state.fall){
  state.fall=null;m.init=false;
  chassis.position.set(0,0,0);chassis.quaternion.identity();
 }
 const salvo=I.ability?.name==='giza-salvo'||I.attack?.kind==='giza-salvo'||I.attack?.tactical==='double-cannon';
 const mortar=I.ability?.name==='vyzov-cross'||I.attack?.kind==='vyzov-cross'||I.attack?.tactical==='cross-mortar';
 const age=time-(I.ability?.at??I.attack?.start??time);
 const readiness=salvo||mortar?range(age,0,.4)*(1-range(age,salvo?2.1:.58,salvo?2.95:1.35)):0;
 const brace=Math.max(I.brace??0,readiness*.8);
 R.animateMech(m,{...I,brace,mortarAge:undefined,aimFromArm:I.aimFromArm&&!salvo&&!mortar},dt,time);
 if(I.alive)reaction(m,{...I,brace,aimFromArm:I.aimFromArm&&!salvo&&!mortar},time);
 if(I.alive)m.build.visorMat.emissiveIntensity=Math.min(1.25,m.build.visorMat.emissiveIntensity);
 m.cont.updateMatrixWorld(true);
}
function shoulderCannon(source,side){
 const mount=source.getObjectByName('Shoulder_cannon_'+side);
 if(!mount)throw Error('Giza is missing its '+side+' shoulder cannon');
 const muzzle=marker(mount,'GizaMuzzle_'+side,V(0,0,2.235),V(0,0,1));
 const rest=mount.position.clone();
 const clutch=mount.quaternion.clone();
 return {mount,muzzle,clutch,rest,carrier:mount.parent,subsystem:side==='L'?'left':'right',bounds:()=>new T.Box3().setFromObject(mount),firedAt:-Infinity,
  onLaunch(t){this.firedAt=t;}};
}
function gizaCannons(source){
 const left=shoulderCannon(source,'L'),right=shoulderCannon(source,'R');
 left.muzzle2=right.muzzle;left.alternate=right;
 left.aimPivot=point=>point===right.muzzle?right.mount:left.mount;
 return {weapon:left,pose(m,I,attack,t){
  const active=I.alive&&(I.ability?.name==='giza-salvo'||attack?.kind==='giza-salvo'||attack?.tactical==='double-cannon');
  const age=t-(I.ability?.at??attack?.start??t);
  const amount=active?(I.reducedMotion?Number(age<1.9):range(age,.08,.86)*(1-range(age,1.89,2.91))):0;
  for(const barrel of [left,right]){
   const {mount,muzzle,rest,clutch}=barrel;
   mount.position.copy(rest);
   mount.quaternion.copy(clutch).slerp(Q(),amount);
   if(amount>0)root.IronVowFoundry.aimMounted(m,{muzzle},m.aim.point,amount,mount);
   const age=t-barrel.firedAt;
   const recoil=age>=0?(1-Math.exp(-125*age))*Math.exp(-15*age):0;
   if(recoil>0){
    const axis=V(0,0,-1).applyQuaternion(mount.quaternion);
    mount.position.addScaledVector(axis,.27*recoil);
   }
  }
 }};
}

function build(config,unit,source,clips){
 source.updateMatrixWorld(true);
 const node=name=>{
  const joint=source.getObjectByName(T.PropertyBinding.sanitizeNodeName(name));
  if(!joint)throw Error(config.id+' is missing '+name);
  return joint;
 };
 const chassis=node('Chassis'),pelvis=node('Pelvis'),spine=node('Cockpit'),neck=node('Pilot pod');
 const arms={},legs=[],owners=new Map([[neck,'pilot']]);
 for(const [i,side] of ['L','R'].entries()){
  const sh=node('Shoulder_'+side),el=node('Elbow_'+side),wr=node('Wrist_'+side);
  const sign=i===0?-1:1;
  // The grip is between the opposed thumb and fingers, off the wrist pivot.
  const so=marker(wr,'WeaponGrip_'+side,V(-sign*.025,-.25,.15),V(0,0,1));
  const paul=source.getObjectByName('Pauldron_'+side)||new T.Group();
  arms[side]={sh,el,wr,so,paul};
  const hip=node('Hip_'+side),kn=node('Knee_'+side),an=node('Ankle_'+side),foot=an.getWorldPosition(V());
  legs.push({side,hip,kn,an,restX:foot.x,restZ:foot.z,toe:Math.sign(foot.x)*.1,phase:i*.5,
   legA:kn.position.length(),legB:an.position.length(),floor:foot.y-lowestPoint(an)});
  owners.set(sh,i===0?'left':'right');owners.set(hip,'legs');
 }
 const rig={pelvis,spine,neck,arms,legs,pistons:[],spinners:[]};
 const parts=Object.fromEntries(R.parts.map(part=>[part,[]])),materials=new Map();
 source.traverse(mesh=>{
  if(!mesh.isMesh)return;
  let owner=mesh.parent;
  while(owner&&!owners.has(owner))owner=owner.parent;
  const part=owners.get(owner)??'body',old=mesh.material;
  if(!materials.has(old)){
   const material=old.clone();
   material.userData.paint=/enamel|armor|slate/i.test(material.name);
   materials.set(old,material);
  }
  mesh.material=materials.get(old);mesh.castShadow=true;mesh.receiveShadow=true;
  parts[part].push({m:mesh,np:!mesh.material.userData.paint});
 });
 const ownedMaterials=[...materials.values()];
 const visorMat=ownedMaterials.find(material=>/optical|optic|collimator/i.test(material.name));
 const stackMat=new T.MeshStandardMaterial();
 const dims={py:pelvis.position.y,spY:spine.position.y,neck:neck.position.toArray(),hipY:legs[0].hip.position.y,
  hipX:Math.abs(legs[0].hip.position.x),shX:Math.abs(arms.R.sh.position.x),shY:arms.R.sh.position.y,
  up:arms.R.el.position.length(),fo:arms.R.wr.position.length(),so:.25,
  ankleH:Math.max(...legs.map(leg=>leg.floor)),restX:Math.abs(legs[0].restX),
  stride:config.stride,sway:config.sway,lift:config.lift,walkDrop:config.drop,duty:.60};
 const mech=R.createMech({root:source,rig,dims,parts,kits:[],mods:{core:config.id,arms:config.id,legs:config.id},
  visorMat,stackMat,ownedMaterials},config.id,unit.team,unit.upgrade);
 const motions=clipData(source,clips),driven=[[spine,'spine'],[neck,'spine']];
 for(const [side,arm] of Object.entries(arms))
  for(const joint of [arm.sh,arm.el,arm.wr])driven.push([joint,side==='R'?'gun':'hand']);
 const shoulder=config.id==='giza'?gizaCannons(source):null;
 let mortar,fist;
 if(config.id==='vyzov'){
  const mount=node('Right shoulder mortar'),axis=V(0,.912,.410).normalize();
  const muzzle=marker(mount,'VyzovMortarMuzzle',V(0,.235,-.145).addScaledVector(axis,1.224),axis);
  mortar={mount,muzzle,axis,rest:mount.position.clone(),firedAt:-Infinity};
  fist=marker(arms.R.wr,'VyzovStrike',V(0,-.43,.18),V(0,-1,0));
 }
 mech.live=config.id;
 mech.campaignRig={motions,driven,chassis,body:config,shoulder,mortar};
 mech.nativeV2={source,clips,animate,worldScale:.96,
  abilityWeapon:shoulder?.weapon,mortar,anchors:mortar?{mortarMuzzle:mortar.muzzle}:undefined,
  meleeSide:kind=>kind==='vyzov-knuckle'?'R':undefined,
  strikeContact:kind=>kind==='vyzov-knuckle'?fist:undefined,
  sync(){mech.cont.updateMatrixWorld(true);},
  scrub(name,time){const clip=motions.get(name);if(clip)setClip(clip,clamp(time,0,clip.duration));},
  bounds(name){
   const supported=name==='neck'?neck:legs.find(leg=>name==='ankle.'+leg.side)?.an;
   return supported?new T.Box3().setFromObject(supported):new T.Box3();
  },
  dispose(){}
 };
 return mech;
}
for(const config of configs)root.IronVowRigV2.register(config.frame,{id:config.id,
 assetPath:'rig-bench/'+config.id+'.glb',build:(unit,source,clips)=>build(config,unit,source,clips)});
})(window);
