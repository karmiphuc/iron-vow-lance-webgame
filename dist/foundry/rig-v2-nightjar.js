/* NJ-07 Nightjar. The left shoulder rifle and the right buckler are part of the chassis. */
(function(root){
'use strict';
const T=root.THREE,R=root.IronVowFoundryRig,V=R.V3,up=V(0,1,0);
const scale=1.34,stepLength=4.0,ankleHeight=.095;
const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,v));
const approach=(a,b,rate,dt)=>T.MathUtils.lerp(a,b,1-Math.exp(-rate*dt));
const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
const ease=(v,a,b)=>smooth((v-a)/(b-a));
function home(m,leg,input,lead=0){
 const body=m.cont.position;
 const strideCentre=leg.rocker&&input.moving?.54:0;
 const point=V(leg.restX,0,leg.restZ+strideCentre).multiplyScalar(scale).applyAxisAngle(up,m.yaw).add(body);
 point.x+=lead*Math.sin(input.heading);point.z+=lead*Math.cos(input.heading);
 point.y=(input.groundAt?.(point.x,point.z)??input.ground??0)+ankleHeight*scale;
 return point;
}
function feet(m,input,state,travel,dt,reset){
 if(reset){
  state.swing=null;
  m.rig.legs.forEach((leg,i)=>{const foot=m.legs[i];foot.swing=false;foot.foot.copy(home(m,leg,input));foot.planted.copy(foot.foot);});
 }
 const walking=input.moving&&!input.reducedMotion;
 if(!state.swing){
  const i=state.next,foot=m.legs[i],rest=home(m,m.rig.legs[i],input);
  if(walking&&travel>.001||!walking&&foot.foot.distanceTo(rest)>.25){
   state.swing={i,p:0,settle:!walking,from:foot.foot.clone(),to:home(m,m.rig.legs[i],input,walking?stepLength*1.51:0)};
  }else if(!walking&&m.legs[1-i].foot.distanceTo(home(m,m.rig.legs[1-i],input))>.25)state.next=1-i;
 }
 const swing=state.swing;
 if(!swing)return;
 if(!walking&&!swing.settle){
  swing.from.copy(m.legs[swing.i].foot);swing.to.copy(home(m,m.rig.legs[swing.i],input));swing.p=0;swing.settle=true;
 }
 swing.p=clamp(swing.p+(swing.settle?dt/.19:travel/stepLength));
 const movingFoot=m.legs[swing.i],sole=movingFoot.foot;movingFoot.swing=!swing.settle;
 sole.copy(swing.from).lerp(swing.to,smooth(swing.p));
 sole.y=Math.max(sole.y,(input.groundAt?.(sole.x,sole.z)??input.ground??0)+ankleHeight*scale);
 sole.y+=Math.sin(Math.PI*swing.p)*(swing.settle?.11:.42)*scale;
 if(swing.p===1){
  movingFoot.swing=false;movingFoot.planted.copy(sole);
  if(!swing.settle)input.onStep?.(m,sole.clone().addScaledVector(up,-ankleHeight*scale),swing.i,.78);
  state.next=1-swing.i;state.swing=null;
 }
}
// A short hot core sits inside the amber vernier exhaust. Both scale from the
// nozzle lip so bursts remain attached during a bank or hard change of stride.
function exhaust(jet,sign){
 const group=new T.Group();group.position.set(.085*sign,-.33,-.55);jet.add(group);
 group.quaternion.setFromUnitVectors(up,V(sign*.12,-.64,-.82).normalize());
 for(const [radius,length,color,opacity] of [[.115,.85,0xff9b3c,.58],[.062,.52,0xffeac0,.92]]){
  const geometry=new T.ConeGeometry(radius,length,10,1,true);geometry.translate(0,length/2,0);
  const material=new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending});
  group.add(new T.Mesh(geometry,material));
 }
 return group;
}
function orient(m,node,angles){
 const rotation=m.cont.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromEuler(angles));
 node.quaternion.copy(node.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotation));
}
// The raised hock is the target for the short upper links. The long final
// segment leans forward on reach and back on push-off, around a fixed toe.
function hindLeg(m,leg,toe,run,spring,phase,lock){
 const footLocal=m.cont.worldToLocal(toe.clone());
 const hipLocal=m.cont.worldToLocal(leg.hip.getWorldPosition(V()));
 const sweep=clamp((footLocal.z-hipLocal.z)*.76+.34+.28*lock,-1.10,1.08);
 const lowerDirection=V(Math.sign(leg.restX)*.095,-Math.cos(sweep),Math.sin(sweep)).normalize();
 // Keep the raised hock inside the reach sphere of the two short upper
 // links. At a turn the lower leg changes rake before a planted toe can skid.
 const axis=footLocal.clone().sub(hipLocal),reach=axis.length(),c=leg.pasternLength;
 axis.normalize();
 const upperReach=leg.upper.legA+leg.upper.legB-.035;
 const minDot=clamp((reach*reach+c*c-upperReach*upperReach)/(2*Math.max(.01,reach)*c),-1,1);
 const dot=axis.dot(lowerDirection);
 if(dot<minDot){
  const tangent=lowerDirection.clone().addScaledVector(axis,-dot).normalize();
  lowerDirection.copy(axis).multiplyScalar(minDot).addScaledVector(tangent,Math.sqrt(1-minDot*minDot));
 }
 const hockLocal=footLocal.clone().addScaledVector(lowerDirection,-leg.pasternLength);
 const hockWorld=m.cont.localToWorld(hockLocal);
 R.solveWorldLeg(m,leg.upper,hockWorld,m.yaw);
 const rotation=new T.Quaternion().setFromUnitVectors(V(0,-1,0),lowerDirection);
 leg.hock.quaternion.copy(leg.kn.getWorldQuaternion(new T.Quaternion()).invert())
  .multiply(m.cont.getWorldQuaternion(new T.Quaternion())).multiply(rotation);
 orient(m,leg.an,new T.Euler(phase*.26*run+.20*spring,leg.toe,0,'YXZ'));
}
function foreLeg(m,input,arm,state,run,spring,lock,dt,reset){
 const base=m.cont.position,yaw=m.yaw;
 const stance=home(m,arm,input);
 const wider=arm.sign*.22*lock,forward=.70*lock;
 stance.x+=wider*Math.cos(yaw)+forward*Math.sin(yaw);
 stance.z+=forward*Math.cos(yaw)-wider*Math.sin(yaw);
 stance.y=(input.groundAt?.(stance.x,stance.z)??input.ground??base.y)+ankleHeight*scale;
 const toe=arm.contact;
 // At rest and during fire the knuckles carry the front of the hull. On
 // departure the elbows lead and the long splints fold aft alongside the pod.
 if(reset||run>.38||toe.distanceTo(stance)>scale*1.65){
  toe.copy(stance);arm.step=null;
 }else if(!input.moving){
  // Replant a single knuckle at a time when the brace widens or the hull
  // turns. The other pad holds its world point until this contact lands.
  const threshold=arm.side==='R'?.19:.28;
  if(!arm.step&&toe.distanceTo(stance)>threshold&&!state.forelegs.some(other=>other!==arm&&other.step))
   arm.step={p:0,from:toe.clone(),to:stance.clone()};
  if(arm.step){
   const step=arm.step;step.p=clamp(step.p+dt/.17);
   toe.copy(step.from).lerp(step.to,smooth(step.p));toe.y+=.15*Math.sin(Math.PI*step.p);
   if(step.p===1)arm.step=null;
  }
 }
 arm.fold=approach(arm.fold,input.moving&&!input.reducedMotion?1:0,
  input.moving?(arm.side==='L'?16:11):(arm.side==='L'?13:18),dt);
 const folded=m.cont.localToWorld(V(arm.restX*.87,2.50+.25*spring,-1.22));
 const target=toe.clone().lerp(folded,Math.max(arm.fold,spring*.88));
 // The arm opposite the leading foot touches down first on braking.
 target.y+=Math.sin(Math.PI*arm.fold)*.42*scale;
 arm.bendPole.set(arm.sign*.57,arm.fold*.76,.55+arm.fold);
 R.solveWorldLeg(m,arm,target,m.yaw+arm.sign*.16);
}
function animate(m,input,dt,t){
 const state=m.nightjar,rig=m.rig,{slide,mast,breech}=state;
 const old=m.cont.position.clone();m.cont.position.set(input.pos.x,input.ground??0,input.pos.z);
 const travel=old.setY(0).distanceTo(input.pos.clone().setY(0));
 const heading=input.moving?input.heading:input.face;
 const delta=Math.atan2(Math.sin(heading-m.yaw),Math.cos(heading-m.yaw));
 if(!m.init)m.yaw=heading;
 else if(input.alive)m.yaw+=delta*(1-Math.exp(-dt*12));
 m.cont.rotation.set(0,m.yaw,0);
 const reset=!m.init||travel>stepLength*2.4;
 feet(m,input,state,travel,dt,reset);m.init=true;

 const alive=input.alive,down=alive?0:ease(input.deathAge,.04,.85);
 const collapse=alive||input.down==='pilot'?0:ease(input.deathAge,.38,1.10);
 const sinceShot=t-(input.attack?.fireAt??Infinity);
 const release=1-ease(sinceShot,.28,.68);
 const ready=alive&&input.armed?Math.max(input.brace||0,(input.readyRelease||0)*release,input.attacking?release:0):0;
 const ramp=input.reducedMotion?1:1-Math.exp(-dt*(ready>state.aim?12:7));
 state.aim+=(ready-state.aim)*ramp;
 state.run=approach(state.run,input.moving&&!input.reducedMotion?1:0,13,dt);
 const lock=state.aim,run=state.run;
 const fireAge=t-(input.attack?.fireAt??-100),kick=input.reducedMotion?0:Math.exp(-Math.max(0,fireAge)*17)*(fireAge>=0?1:0);
 const dodgeAge=t-state.dodgeAt,evade=alive&&!input.legsDead&&!input.reducedMotion;
 const spring=evade&&dodgeAge>.11&&dodgeAge<.49?Math.sin(Math.PI*ease(dodgeAge,.11,.49)):0;
 const dodgeLoad=evade?ease(dodgeAge,0,.10)-ease(dodgeAge,.10,.21)+.8*(ease(dodgeAge,.41,.53)-ease(dodgeAge,.53,.77)):0;
 const side=state.dodgeSign;
 const wave=state.swing?Math.sin(Math.PI*state.swing.p):0;
 const weight=(state.swing?.i===0?-1:1)*wave*run;
 const breath=input.reducedMotion?0:Math.sin(t*2)*.018;
 const hit=alive&&!input.reducedMotion?Math.exp(-Math.max(0,t-(input.hitTime??-100))*8):0;
 rig.pelvis.position.set(.09*weight+side*.48*spring-.28*collapse,
  1.86-.82*lock+run*(.16+.21*wave)-.29*dodgeLoad+.30*spring-.79*down-.33*collapse-(input.legsDead?.36:0),
  -.40+.14*lock+.10*run);
 rig.pelvis.rotation.set(-.04+.14*run+.12*down,0,-.055*weight+side*.17*spring+.43*collapse);
 rig.spine.rotation.set(.18+.10*run+.14*lock-.095*kick-.10*hit+breath+.32*collapse,
  -.045*(1-lock)+weight*.055,side*spring*.10+.12*hit+.40*collapse,'YXZ');
 rig.neck.rotation.set(-.095-.11*run+.045*lock,.09*Math.sin(t*.8)*(1-lock),0);
 for(const [i,leg] of rig.legs.entries()){
  leg.rocker.rotation.x=.10+.25*lock+(i===0?1:-1)*.23*weight+.15*spring;
 }
 m.cont.updateWorldMatrix(true,false);
 if(alive&&spring===0)rig.pelvis.position.y=R.supportHeight(m,input,rig.pelvis.position.y);
 for(const [i,leg] of rig.legs.entries()){
  const toe=m.legs[i].foot.clone();
  toe.y+=spring*(i===0?.83:.53)*scale;
  hindLeg(m,leg,toe,run,spring,state.swing?.i===i?Math.sin(2*Math.PI*state.swing.p):0,lock);
 }
 for(const arm of state.forelegs)foreLeg(m,input,arm,state,run,spring,lock,dt,reset);
 const attitude=new T.Euler(.28*(1-lock)-.03*lock+-.20*run+.26*down,0,-.04*(1-lock),'YXZ');
 orient(m,breech,attitude);
 orient(m,state.buckler,new T.Euler(.13+run*.81,-.45+.22*lock,-.12+.22*run,'YXZ'));
 slide.position.z=-.23*Math.max(kick,Math.min(1,m.recoil));
 m.recoil*=Math.exp(-20*dt);
 const pulse=input.reducedMotion||!alive?0:Math.max(spring,run*Math.max(0,1-(input.moveAge??0)/.40)*.75);
 state.jets.forEach((jet,i)=>{
  jet.rotation.x=.29*run-.54*spring;
  const plume=state.plumes[i];plume.visible=pulse>.035;
  plume.scale.set(.55+.45*pulse,Math.max(.001,pulse)*(1+.08*Math.sin(t*76+i)),.55+.45*pulse);
 });
 mast.rotation.x=-.14-.32*run+.10*lock-.13*spring+.06*kick;
}
function build(unit,source){
 const node=name=>source.getObjectByName(name),pelvis=node('Keel'),spine=node('Turret'),neck=node('Optics');
 const arms={},legs=[],forelegs=[];
 for(const side of ['L','R']){
  const sh=node('Shoulder'+side),el=node('Elbow'+side),wr=node('Wrist'+side);
  arms[side]={sh,el,wr,so:wr,paul:sh};
  const hip=node('Hip'+side),kn=node('Knee'+side),hock=node('Hock'+side),an=node('Ankle'+side);
  const rocker=node('Rocker'+side),sign=Math.sign(rocker.position.x),restX=sign*.83;
  const upper={hip,kn,an:hock,restX,legA:kn.position.length(),legB:hock.position.length(),bendPole:V(sign*.23,.05,1)};
  legs.push({side,rocker,hip,kn,hock,an,upper,legA:upper.legA,legB:upper.legB+an.position.length(),
   restX,restZ:-1.02+sign*.19,toe:sign*.15,pasternLength:an.position.length()});
  forelegs.push({side,sign,hip:sh,kn:el,an:wr,legA:el.position.length(),legB:wr.position.length(),
   bendPole:V(sign*.57,0,.55),restX:sign*1.46,restZ:.94+sign*.12,contact:V(),fold:0});
 }
 const materials=new Map(),parts=Object.fromEntries(R.parts.map(key=>[key,[]]));
 const owners=new Map([[neck,'pilot'],[arms.L.sh,'left'],[arms.R.sh,'right'],...legs.map(leg=>[leg.rocker,'legs'])]);
 source.traverse(mesh=>{
  if(!mesh.isMesh)return;
  let parent=mesh.parent;while(parent&&!owners.has(parent))parent=parent.parent;
  const original=mesh.material;
  if(!materials.has(original))materials.set(original,original.clone());
  mesh.material=materials.get(original);mesh.castShadow=mesh.receiveShadow=true;
  const paint=mesh.material.name.includes('enamel');mesh.material.userData.paint=paint;
  parts[owners.get(parent)??'body'].push({m:mesh,np:!paint});
 });
 const ownedMaterials=[...materials.values()],optic=ownedMaterials.find(mat=>mat.name.includes('optical'));
 const rig={pelvis,spine,neck,arms,legs,pistons:[],spinners:[]};
 const dims={py:1.96,ankleH:ankleHeight,hipX:.54,restX:.85,stride:stepLength/1.7};
 const m=R.createMech({root:source,rig,dims,parts,kits:[],mods:{},ownedMaterials,visorMat:optic,stackMat:optic},'nightjar',unit.team,unit.upgrade);
 m.scale=scale;m.cont.scale.setScalar(scale);m.live='nightjar';
 const breech=node('Breech'),slide=node('Slide'),muzzle=node('Muzzle'),buckler=node('Buckler');
 const rifle={id:'quill-lance',mount:breech,carrier:arms.L.sh,recoil:slide,muzzle,subsystem:'left',aimPivot:()=>breech};
 const guard={mount:buckler,face:node('ShieldFace'),grip:arms.R.wr};
 m.nightjar={forelegs,aim:0,run:0,next:0,swing:null,dodgeAt:-100,dodgeSign:1,breech,slide,buckler,jets:[node('VernierL'),node('VernierR')],mast:node('Mast')};
 m.nightjar.plumes=m.nightjar.jets.map((jet,i)=>exhaust(jet,i===0?1:-1));
 m.nativeV2={source,worldScale:scale,animate,nativeShield:true,targetingBlend:()=>m.nightjar.aim,
  pose(entry){entry.primary=rifle;entry.shield=guard;return true;},
  dodge(time,incoming){m.nightjar.dodgeAt=time;m.nightjar.dodgeSign=V(Math.cos(m.yaw),0,-Math.sin(m.yaw)).dot(incoming)>0?-1:1;},
  sync(){m.cont.updateMatrixWorld(true);},
  bounds(name){const part=name==='neck'?neck:legs.find(leg=>name==='ankle.'+leg.side)?.an;return part?new T.Box3().setFromObject(part):new T.Box3();},
  dispose(){for(const plume of m.nightjar.plumes)for(const mesh of plume.children){mesh.geometry.dispose();mesh.material.dispose();}}
 };
 return m;
}
root.IronVowRigV2.register(27,{id:'nightjar',assetPath:'rig-bench/rig-v2/nightjar.glb',build});
})(window);
