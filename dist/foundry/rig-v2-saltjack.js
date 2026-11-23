/* Salt Works rigid links stay in the authored hierarchy and keep their baked materials. */
(function(root){
'use strict';
const T=root.THREE,R=root.IronVowFoundryRig,V=R.V3,Q=()=>new T.Quaternion();
const PI=Math.PI,scale=1.16,stepLength=1.62;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(x,b));
const mix=(a,b,w)=>a+(b-a)*w;
const smooth=x=>{const w=clamp(x);return w*w*(3-2*w);};
const between=(t,start,end)=>smooth((t-start)/(end-start));
const damp=(a,b,k,dt)=>mix(a,b,1-Math.exp(-k*dt));
const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const spring=(s,k,d,dt)=>{s.v-=dt*(k*s.x+d*s.v);s.x+=dt*s.v;};

function placeFoot(m,I,leg,body=m.cont.position,heading=m.yaw){
 const c=Math.cos(heading),s=Math.sin(heading),x=leg.restX*m.scale,z=leg.restZ*m.scale;
 const foot=V(body.x+x*c+z*s,0,body.z-x*s+z*c);
 foot.y=(I.groundAt&&!I.airborne?I.groundAt(foot.x,foot.z):I.ground??0)+m.dims.ankleH*m.scale;
 return foot;
}
function stepTarget(m,I,leg,direction,lead){
 const body=m.cont.position.clone().addScaledVector(direction,lead);
 return placeFoot(m,I,leg,body,I.heading);
}
function startSwing(m,state,I,index,target,settle=false){
 const foot=m.legs[index];
 foot.swing=true;
 foot.settle=settle;
 foot.from.copy(foot.foot);
 foot.to.copy(target);
 state.swing={index,age:0,settle};
}
function feet(m,I,state,dt,distance,direction){
 const moving=I.moving&&!I.airborne;
 const track=m.rig.legs;
 for(const foot of m.legs)foot.poseLift=false;
 if(I.reducedMotion||I.airborne){
  state.swing=null;
  for(const [i,leg] of track.entries()){
   const foot=m.legs[i];
   foot.swing=false;foot.settle=false;
   foot.planted.copy(placeFoot(m,I,leg));
   foot.foot.copy(foot.planted);
  }
  return;
 }
 if(state.moving&&!moving&&state.swing){
  const {index}=state.swing;
  startSwing(m,state,I,index,placeFoot(m,I,track[index]),true);
 }
 if(!state.swing){
  if(moving&&distance>.0001){
   const index=state.next;
   // Anticipate one full swing plus half a support stride.
   startSwing(m,state,I,index,stepTarget(m,I,track[index],direction,stepLength*1.46));
  }else if(!moving){
   const homes=track.map(leg=>placeFoot(m,I,leg));
   const errors=m.legs.map((foot,i)=>foot.foot.distanceTo(homes[i]));
   const index=errors[0]>errors[1]?0:1;
   if(errors[index]>.37*m.scale)startSwing(m,state,I,index,homes[index],true);
  }
 }
 if(!state.swing)return;
 const swing=state.swing,{index}=swing,foot=m.legs[index];
 swing.age+=swing.settle?dt/.24:distance/stepLength;
 const progress=clamp(swing.age),weight=smooth(progress);
 const height=(swing.settle?.14:.26)*m.scale*Math.sin(PI*progress)**1.28;
 foot.foot.copy(foot.from).lerp(foot.to,weight);
 if(I.groundAt)foot.foot.y=Math.max(foot.foot.y,I.groundAt(foot.foot.x,foot.foot.z)+m.dims.ankleH*m.scale);
 foot.foot.y+=height;
 foot.poseLift=height>.018;
 if(progress<1)return;
 foot.planted.copy(foot.to);
 foot.foot.copy(foot.planted);
 foot.swing=false;foot.settle=false;foot.poseLift=false;
 state.next=1-index;state.swing=null;
 if(!swing.settle&&I.onStep){
  const contact=foot.planted.clone();contact.y-=m.dims.ankleH*m.scale;
  I.onStep(m,contact,index,1);
 }
}

// Exact 3D two-link solve. The knee bends along the chassis' forward vector
// while the bottom of the shoe keeps its own world orientation.
function solveLeg(m,leg,position,ankleYaw,pitch=0){
 const hip=m.cont.worldToLocal(leg.hip.getWorldPosition(V()));
 const target=m.cont.worldToLocal(position.clone()).sub(hip);
 const a=leg.legA,b=leg.legB,length=clamp(target.length(),Math.abs(a-b)+.008,a+b-.002);
 const axis=target.normalize();
 if(axis.lengthSq()<.01)axis.set(0,-1,0);
 const pole=V(Math.sign(leg.restX)*.08,0,1);
 pole.addScaledVector(axis,-pole.dot(axis)).normalize();
 const along=(a*a-b*b+length*length)/(2*length);
 const upper=axis.clone().multiplyScalar(along).addScaledVector(pole,Math.sqrt(Math.max(0,a*a-along*along))).normalize();
 const lower=axis.multiplyScalar(length).addScaledVector(upper,-a).normalize();
 const hinge=upper.clone().cross(lower).normalize(),up=upper.clone().negate();
 const basis=new T.Matrix4().makeBasis(hinge,up,hinge.clone().cross(up));
 const hipWorld=Q().setFromRotationMatrix(basis).premultiply(m.cont.getWorldQuaternion(Q()));
 leg.hip.quaternion.copy(leg.hip.parent.getWorldQuaternion(Q()).invert().multiply(hipWorld));
 leg.kn.rotation.set(upper.angleTo(lower),0,0);
 const shoeWorld=Q().setFromEuler(new T.Euler(pitch,ankleYaw,0,'YXZ'));
 leg.an.quaternion.copy(leg.kn.getWorldQuaternion(Q()).invert().multiply(shoeWorld));
}
// Let the pelvis compress as a foot reaches its limit across stride and grade.
function supportHeight(m,I,desired){
 const pelvis=m.rig.pelvis,world=m.cont;
 // Move the hips over a loaded shoe when an opening or turning step
 // reaches its horizontal limit. The world contact itself never slides.
 const rootQ=world.getWorldQuaternion(Q()).invert();
 for(const [i,leg] of m.rig.legs.entries()){
  const state=m.legs[i];
  if(state.swing)continue;
  const offset=state.foot.clone().sub(leg.hip.getWorldPosition(V())).setY(0);
  const distance=offset.length(),limit=(leg.legA+leg.legB-.16)*m.scale;
  if(distance<=limit)continue;
  offset.multiplyScalar(Math.min(distance-limit,.35)/(distance*m.scale)).applyQuaternion(rootQ);
  pelvis.position.add(offset);
 }
 const pelvisHome=world.localToWorld(pelvis.position.clone());
 for(const [i,leg] of m.rig.legs.entries()){
  const hip=leg.hip.getWorldPosition(V()),foot=m.legs[i].foot;
  const length=(leg.legA+leg.legB-.035)*m.scale;
  const horizontal=Math.hypot(foot.x-hip.x,foot.z-hip.z);
  const height=Math.sqrt(Math.max(.03,length*length-horizontal*horizontal));
  const safe=(foot.y+height-world.position.y-(hip.y-pelvisHome.y))/m.scale;
  desired=Math.min(desired,safe);
 }
 return Math.max(I.airborne?2.15:.92,desired);
}

function blendRotation(node,rest,weight,x,y,z,order='YXZ'){
 const pose=Q().setFromEuler(new T.Euler(x,y,z,order));
 node.quaternion.copy(rest).slerp(pose,clamp(weight));
}
function livePose(m,I,dt,t,state){
 const rig=m.rig,S=m.s,{joints,rest}=state;
 for(const name of ['comp','pitch','roll','arm','kx','kz']){
  const horizontal=name==='kx'||name==='kz';
  spring(S[name],horizontal?56:72,horizontal?11:10,dt);
 }
 m.recoil*=Math.exp(-dt*9);
 state.brace=I.reducedMotion?0:damp(state.brace,Math.max(I.brace??0,(I.readyRelease??0)*.87),12,dt);
 state.shouldered=I.reducedMotion?0:damp(state.shouldered,Math.max((I.brace??0)*.65,I.readyRelease??0),13,dt);
 state.walk=I.reducedMotion?0:damp(state.walk,I.moving?1:0,I.moving?9:8,dt);
 const brake=state.brace,walk=state.walk;
 const support=state.swing?1-state.swing.index:1-state.next;
 const sign=Math.sign(rig.legs[support].restX);
 const wave=state.swing?Math.sin(PI*clamp(state.swing.age)):0;
 state.balance=damp(state.balance,sign*wave*walk,17,dt);
 const impact=I.reducedMotion?0:clamp(S.pitch.x,-.28,.23);
 const sideHit=I.reducedMotion?0:clamp(S.roll.x,-.28,.28);
 const kick=I.reducedMotion?0:clamp(m.recoil,0,.95);
 const lean=state.balance;
 const h=state.readyHeight-walk*(.17+.10*(1-wave))-.26*brake+.32*clamp(S.comp.x,-.7,.2)-.15*kick-(I.legsDead?.78:0);
 const push=V(clamp(S.kx.x,-.28,.28),0,clamp(S.kz.x,-.28,.28)).applyAxisAngle(V(0,1,0),-m.yaw);
 rig.pelvis.position.set(lean*.23+push.x,h,brake*.15+push.z);
 rig.pelvis.rotation.set(walk*.055+brake*.06,0,-lean*.075);
 rig.pelvis.position.y=supportHeight(m,I,h);
 for(const [i,leg] of rig.legs.entries()){
  const foot=m.legs[i],progress=state.swing?.index===i?state.swing.age:0;
  const toe=leg.toe*(1-.72*walk);
  const pitch=foot.swing?.12*Math.sin(2*PI*clamp(progress)):0;
  solveLeg(m,leg,foot.foot,m.yaw+toe,pitch);
 }

 // Hip transfer, waist traverse and carriage-first kick follow Saltjack's
 // source/motion.js:47-87. The contacts come from the board instead of its film clock.
 const action=clamp(walk+brake+Math.abs(impact)*3),gun=state.shouldered;
 const sway=lean*.12;
 const aimYaw=clamp(angle(m.yaw,I.face),-.68,.68)*brake;
 const idle=I.reducedMotion?0:Math.sin(t*2.25)*.011;
 rig.spine.rotation.set(.035+walk*.09+.08*brake-.12*kick+impact*1.8+idle,aimYaw+sway+sideHit*.6,-lean*.09+sideHit*1.18,'YXZ');
 rig.neck.rotation.set(-.065+brake*.05-impact*.7,(1-brake)*Math.sin(t*.9)*.10,sideHit*.3);
 blendRotation(joints.Shoulder_R,rest.Shoulder_R,gun,-.10-.38*gun+.09*kick,0,-.045);
 blendRotation(joints.Arm_R,rest.Arm_R,gun,-.09-.14*gun,0,-.07);
 blendRotation(joints.Elbow_R,rest.Elbow_R,gun,-.74-.39*gun-.17*kick,0,0);
 joints.Shoulder_R.rotateX(sway*.21);
 blendRotation(joints.Shoulder_L,rest.Shoulder_L,action,-.12-sway-.2*brake+impact*.9,.03,-.075);
 blendRotation(joints.Arm_L,rest.Arm_L,action,-.04-sway,0,.045);
 blendRotation(joints.Elbow_L,rest.Elbow_L,action,-.30-.13*brake-sway+clamp(S.arm.x,-.22,.23),-.13,0);
 // Swing the bore forward as the shoulder draws the rifle in. Interpolating
 // the carriage's local roll would sweep the barrel sideways across the hull.
 const barrelPitch=gun*1.53;
 orientRifle(joints.Carriage,m.cont,rest.Carriage,V(.065*(1-gun),Math.cos(barrelPitch),Math.sin(barrelPitch)+sway*.12));
 joints.Carriage.position.y=state.carriageY+.25*kick;
 state.visorMat.emissiveIntensity=m.wrecked?0:1;
 state.stackMat.emissiveIntensity=m.wrecked?0:1;
}

const supportCache=new WeakMap();
const supportDirections=[];
for(const x of [-1,0,1])for(const y of [-1,0,1])for(const z of [-1,0,1])
 if(x||y||z)supportDirections.push([x,y,z]);
function supportPoints(geometry){
 if(supportCache.has(geometry))return supportCache.get(geometry);
 const attribute=geometry.attributes.position,furthest=new Float64Array(supportDirections.length).fill(-Infinity);
 const indices=new Set(),best=new Uint32Array(supportDirections.length);
 for(let i=0;i<attribute.count;i++){
  const x=attribute.getX(i),y=attribute.getY(i),z=attribute.getZ(i);
  for(const [j,[dx,dy,dz]] of supportDirections.entries()){
   const distance=x*dx+y*dy+z*dz;
   if(distance>furthest[j]){best[j]=i;furthest[j]=distance;}
  }
 }
 for(const i of best)indices.add(i);
 // This Three.js version returns integer vertex values for quantized GLBs.
 const positions=attribute.array??attribute.data.array;
 const divisor=attribute.normalized&&positions instanceof Int16Array?32767:1;
 const points=[...indices].map(i=>V().fromBufferAttribute(attribute,i).divideScalar(divisor));
 supportCache.set(geometry,points);
 return points;
}
function floorClearance(m,I){
 let minimum=Infinity;const point=V();
 m.cont.updateMatrixWorld(true);
 m.body.traverseVisible(mesh=>{
  if(!mesh.isMesh)return;
  for(const sample of supportPoints(mesh.geometry)){
   point.copy(sample).applyMatrix4(mesh.matrixWorld);
   const ground=I.groundAt?I.groundAt(point.x,point.z):I.ground??0;
   minimum=Math.min(minimum,point.y-ground);
  }
 });
 return Number.isFinite(minimum)?minimum:0;
}

function orientRifle(carriage,body,rest,direction,weight=1){
 carriage.quaternion.copy(rest);
 const world=carriage.getWorldQuaternion(Q());
 const bore=V(0,-1,0).applyQuaternion(world);
 const target=direction.applyQuaternion(body.getWorldQuaternion(Q())).normalize();
 const turn=Q().setFromUnitVectors(bore,target);
 const aimed=carriage.parent.getWorldQuaternion(Q()).invert().multiply(turn.multiply(world));
 carriage.quaternion.slerp(aimed,weight);
}

function fallPose(m,I,state){
 const {joints}=state,rig=m.rig,cont=m.cont;
 const down=I.down==='pilot',age=I.deathAge;
 if(!state.fall){
  const angles=Object.fromEntries(Object.entries(joints).map(([name,node])=>[name,node.quaternion.clone()]));
  state.fall={angles,pelvis:rig.pelvis.position.clone(),feet:m.legs.map(foot=>foot.foot.clone()),
   yaw:m.yaw,carriage:joints.Carriage.position.y};
 }
 const fall=state.fall;
 const buckle=between(age,.035,.55),tip=down?0:clamp((age-.48)/.44)**1.65;
 const fold=down?0:between(age,.46,.79);
 const settle=down?0:between(age,.92,1.47);
 const bounce=down||age<.92||age>=1.47?0:Math.sin(PI*settle)*(1-settle)*.075;
 const targetHeight=down?1.29:1.11;
 cont.rotation.set(0,fall.yaw,0,'YXZ');
 rig.pelvis.position.copy(fall.pelvis).lerp(V(.24,targetHeight,.20),buckle);
 for(const [i,leg] of rig.legs.entries()){
  const foot=fall.feet[i].clone();
  if(I.groundAt)foot.y=mix(foot.y,I.groundAt(foot.x,foot.z)+m.dims.ankleH*m.scale,buckle);
  solveLeg(m,leg,foot,fall.yaw+leg.toe);
  blendRotation(leg.hip,leg.hip.quaternion.clone(),fold,i===0?-.83:-1.54,0,i===0?-.26:-.65);
  blendRotation(leg.kn,leg.kn.quaternion.clone(),fold,i===0?1.65:2.45,0,0);
  blendRotation(leg.an,leg.an.quaternion.clone(),fold,-.44,leg.toe,0);
 }
 const arms=buckle*.62+tip*.38;
 blendRotation(rig.spine,fall.angles.Thorax,buckle,.56-.37*tip,.12,-.12);
 blendRotation(rig.neck,fall.angles.Optics,buckle,.50-.09*tip,.21,.08);
 blendRotation(joints.Shoulder_R,fall.angles.Shoulder_R,arms,-.09-.14*tip,0,-.29);
 blendRotation(joints.Arm_R,fall.angles.Arm_R,arms,-.23,0,-.13);
 blendRotation(joints.Elbow_R,fall.angles.Elbow_R,arms,-.96-.35*tip,-.12,0);
 blendRotation(joints.Shoulder_L,fall.angles.Shoulder_L,arms,-.75+.24*tip,.1,.29);
 blendRotation(joints.Arm_L,fall.angles.Arm_L,arms,.18,0,.04);
 blendRotation(joints.Elbow_L,fall.angles.Elbow_L,arms,-.44,0,-.20);
 orientRifle(joints.Carriage,cont,fall.angles.Carriage,V(.08,.065,1),between(age,.045,.38));
 joints.Carriage.position.y=mix(fall.carriage,state.carriageY,buckle);

 if(tip>0){
  const pelvisBefore=rig.pelvis.getWorldPosition(V());
  cont.rotation.set(.08*tip,fall.yaw+.13*tip,(-1.48-.08*settle)*tip,'YXZ');
  const pelvisAfter=rig.pelvis.getWorldPosition(V());
  const drift=V(.61*tip,0,.24*tip).applyAxisAngle(V(0,1,0),fall.yaw);
  cont.position.add(pelvisBefore.sub(pelvisAfter)).add(drift);
  cont.position.y-=tip*.34*m.scale;
 }
 if(buckle>0){
  const clearance=floorClearance(m,I);
  cont.position.y+=tip>=1?-.012-clearance+bounce:Math.max(0,-.012-clearance);
 }
 state.visorMat.emissiveIntensity=1-buckle;
 state.stackMat.emissiveIntensity=1-buckle;
}

function animate(m,I,dt,t){
 const {cont}=m,state=m.saltMotion;
 if(!I.alive&&state.fall?.settled)return;
 const old=cont.position.clone();
 const first=!m.init;
 cont.position.set(I.pos.x,I.ground??0,I.pos.z);
 const motion=cont.position.clone().sub(old).setY(0);
 const distance=motion.length();
 if(first||I.reducedMotion)m.yaw=I.moving?I.heading:I.face;
 else if(I.alive)m.yaw+=angle(m.yaw,I.moving?I.heading:I.face)*(1-Math.exp(-dt*(I.moving?12:6)));
 cont.rotation.set(0,m.yaw,0,'YXZ');
 if(first||I.alive&&distance>stepLength*2){
  m.init=true;
  state.moving=false;state.swing=null;
  for(const [i,leg] of m.rig.legs.entries()){
   const foot=m.legs[i];
   foot.swing=false;foot.settle=false;
   foot.planted.copy(placeFoot(m,I,leg));foot.foot.copy(foot.planted);
  }
 }
 if(!I.alive){
  if(first)livePose(m,{...I,moving:false},dt,t,state);
  fallPose(m,I,state);
  state.fall.settled=I.deathAge>=(I.down==='pilot'?.55:1.47);
 }else{
  state.fall=null;
  const direction=distance>.0001?motion.divideScalar(distance):V(Math.sin(I.heading),0,Math.cos(I.heading));
  feet(m,I,state,dt,first||distance>stepLength*2?0:distance,direction);
  livePose(m,I,dt,t,state);
  state.moving=I.moving&&!I.airborne;
 }
 cont.updateMatrixWorld(true);
}

const names=['Pelvis','Thorax','Optics','Hip_L','Hip_R','Knee_L','Knee_R','Ankle_L','Ankle_R',
 'Shoulder_L','Shoulder_R','Arm_L','Arm_R','Elbow_L','Elbow_R','Carriage'];
function build(unit,source,clips){
 const garrison=unit.frame===23;
 for(const side of ['L','R']){
  const cassette=source.getObjectByName('Cassette_'+side);
  if(cassette)cassette.visible=garrison;
 }
 const joints=Object.fromEntries(names.map(name=>{
  const node=source.getObjectByName(name);
  if(!node)throw Error('Salt Works rig is missing '+name);
  return [name,node];
 }));
 const rest=Object.fromEntries(names.map(name=>[name,joints[name].quaternion.clone()]));
 // The film export inverts this joint about Z. The upper-arm spar and
 // elbow pivots descend along -Y in the workshop reference.
 rest.Arm_L.setFromAxisAngle(V(1,0,0),.015);
 const arms={},legs=[];
 source.updateMatrixWorld(true);
 for(const [i,side] of ['L','R'].entries()){
  const sh=joints['Shoulder_'+side],el=joints['Elbow_'+side],so=joints['Arm_'+side];
  arms[side]={sh,el,wr:el,so,paul:sh};
  const hip=joints['Hip_'+side],kn=joints['Knee_'+side],an=joints['Ankle_'+side],foot=an.getWorldPosition(V());
  legs.push({hip,kn,an,side,restX:foot.x,restZ:foot.z,toe:i===0?-.35:.30,legA:kn.position.length(),legB:an.position.length()});
 }
 const rig={pelvis:joints.Pelvis,spine:joints.Thorax,neck:joints.Optics,arms,legs,pistons:[],spinners:[]};
 const parts=Object.fromEntries(R.parts.map(part=>[part,[]]));
 const owners=new Map([[rig.neck,'pilot'],[arms.L.sh,'left'],[arms.R.sh,'right'],[legs[0].hip,'legs'],[legs[1].hip,'legs']]);
 const materials=new Map();
 source.traverse(mesh=>{
  if(!mesh.isMesh)return;
  let owner=mesh.parent;
  while(owner&&!owners.has(owner))owner=owner.parent;
  const part=owners.get(owner)??'body';
  const original=mesh.material;
  if(!materials.has(original)){
   const material=original.clone();
   // Match the opposing machine's livery in Saltjack source/player.js:22-31.
   if(garrison){
    if(/Basalt navy|Desaturated slate/.test(material.name))material.color.multiply(new T.Color(.65,.77,.57));
    if(/Cold porcelain/.test(material.name))material.color.multiply(new T.Color(.32,.36,.27));
    if(/Cobalt optical/.test(material.name)){material.emissive.setRGB(1,.035,.004);material.color.setRGB(.7,.03,.003);}
   }
   if(/enamel/i.test(material.name))material.userData.paint=true;
   materials.set(original,material);
  }
  mesh.material=materials.get(original);mesh.castShadow=true;mesh.receiveShadow=true;
  parts[part].push({m:mesh,np:!mesh.material.userData.paint});
 });
 const ownedMaterials=[...materials.values()];
 const visorMat=ownedMaterials.find(material=>/optical glass/i.test(material.name))||new T.MeshStandardMaterial();
 const stackMat=ownedMaterials.find(material=>/marker glass/i.test(material.name))||new T.MeshStandardMaterial();
 const id=garrison?'saltworks-garrison':'saltjack';
 const dims={py:joints.Pelvis.position.y,ankleH:.308,restX:Math.abs(legs[0].restX),stride:stepLength/1.7};
 const mech=R.createMech({root:source,rig,dims,parts,kits:[],mods:{core:id,legs:id,arms:id},
  visorMat,stackMat,ownedMaterials},id,unit.team,unit.upgrade);
 const mount=joints.Carriage,muzzle=source.getObjectByName('Muzzle');
 if(!muzzle||muzzle.parent!==mount)throw Error('Salt Works rifle muzzle is missing');
 muzzle.quaternion.setFromUnitVectors(V(0,0,1),V(0,-1,0));
 const rifle={id:'salt-rifle',subsystem:'right',carrier:mount.parent,mount,model:mount,muzzle,aimPivot:()=>mount};
 mech.live=id;
 mech.scale=scale;mech.cont.scale.setScalar(scale);
 mech.saltMotion={joints,rest,readyHeight:dims.py,carriageY:mount.position.y,next:0,balance:0,brace:0,shouldered:0,walk:0,visorMat,stackMat};
 mech.nativeV2={
  source,clips,animate,worldScale:scale,nativeShield:true,
  pose(entry,u){entry.primary=rifle;return u.weapon===rifle.id;},
  sync(){mech.cont.updateMatrixWorld(true);},
  bounds(name){
   const node=name==='neck'?rig.neck:legs.find(leg=>name==='ankle.'+leg.side)?.an;
   return node?new T.Box3().setFromObject(node):new T.Box3();
  },
  dispose(){}
 };
 return mech;
}
for(const [frame,id] of [[22,'saltjack'],[23,'saltworks-garrison']]){
 root.IronVowRigV2.register(frame,{id,assetPath:'rig-bench/rig-v2/saltjack.glb',build});
}
})(window);
