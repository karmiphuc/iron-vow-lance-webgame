/* Saker's rooftop stride and one-handed firing rest. Distances use board-world units. */
(function(root){
'use strict';
const T=root.THREE,R=root.IronVowFoundryRig,V=R.V3,up=V(0,1,0),scale=1.36,ankle=.17,handRest=.5226;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const p=clamp(x);return p*p*(3-2*p);};
const ramp=(t,a,b)=>smooth((t-a)/(b-a));
const follow=(x,y,k,dt)=>x+(y-x)*(1-Math.exp(-k*dt));
function sole(m,input,leg,lead){
 const sign=Math.sign(leg.restX),lock=m.saker.aim;
 const p=V(leg.restX+sign*.13*lock,0,leg.restZ*(1-m.saker.run)-sign*(sign<0?1.72:1.92)*lock).multiplyScalar(scale)
  .applyAxisAngle(up,m.yaw).add(m.cont.position);
 p.x+=lead*Math.sin(input.heading);p.z+=lead*Math.cos(input.heading);
 p.y=(input.groundAt?.(p.x,p.z)??input.ground??0)+ankle*scale;
 return p;
}
// Keep a full world contact while the other shoe swings. A newly requested
// brace or halt gets actual repositioning steps, including the rear knee tuck.
function contacts(m,input,dt,travel,reset){
 const s=m.saker,walking=input.alive&&input.moving&&!input.legsDead&&!input.reducedMotion;
 const homes=m.rig.legs.map(leg=>sole(m,input,leg,0));
 if(reset||input.reducedMotion){
  s.swing=null;
  m.legs.forEach((foot,i)=>{foot.planted.copy(homes[i]);foot.foot.copy(homes[i]);foot.swing=false;});
  return;
 }
 if(s.swing?.walking&&!walking){s.next=s.swing.i;s.swing=null;}
 if(!s.swing){
  const errors=homes.map((p,i)=>m.legs[i].foot.distanceTo(p));
  const i=walking?s.next:(errors[0]>errors[1]?0:1);
  if(walking&&travel>.001||!walking&&errors[i]>.24){
   const stride=(2.10+.70*clamp((input.speed-2)/6))*(.50+.50*s.run);
   s.swing={i,p:0,walking,stride,from:m.legs[i].foot.clone(),to:sole(m,input,m.rig.legs[i],walking?stride*1.55:0)};
  }
 }
 const swing=s.swing;if(!swing)return;
 const {i}=swing,f=m.legs[i];swing.p=clamp(swing.p+(swing.walking?travel/swing.stride:dt/.245));
 // Two short double-support intervals separate lift-off from the next heel strike.
 const sweep=swing.walking?ramp(swing.p,.09,.89):smooth(swing.p);
 const arc=Math.sin(Math.PI*sweep);
 f.swing=sweep>.0001&&sweep<.9999;f.foot.copy(swing.from).lerp(swing.to,sweep);
 f.foot.y=Math.max(f.foot.y,(input.groundAt?.(f.foot.x,f.foot.z)??input.ground??0)+ankle*scale);
 f.foot.y+=arc*(swing.walking?.185:.14)*scale;
 if(swing.p===1){
  f.swing=false;f.planted.copy(f.foot);s.next=1-i;s.swing=null;s.contactAge=0;
  input.onStep?.(m,f.foot.clone().addScaledVector(up,-ankle*scale),i,swing.walking?.92:.68);
 }
}
// A rearward shoe can bring the unconstrained knee arc below the terrain.
// Swing the knee out on its two-link circle while preserving the ankle anchor.
function kneeClearance(m,input,leg,shoe){
 const hip=m.cont.worldToLocal(leg.hip.getWorldPosition(V()));
 const axis=m.cont.worldToLocal(shoe.clone()).sub(hip);
 const length=Math.min(leg.legA+leg.legB-.002,Math.max(.25,axis.length()));
 axis.normalize();
 const along=(leg.legA**2-leg.legB**2+length**2)/(2*length);
 const radius=Math.sqrt(Math.max(.0001,leg.legA**2-along**2));
 const pole=leg.bendPole.set(Math.sign(leg.restX)*.16,0,1);
 pole.addScaledVector(axis,-pole.dot(axis)).normalize();
 const knee=hip.clone().addScaledVector(axis,along).addScaledVector(pole,radius);
 const world=m.cont.localToWorld(knee.clone());
 const floor=input.groundAt?.(world.x,world.z)??input.ground??0;
 const need=knee.y+(floor-world.y)/scale+.54;
 if(knee.y>=need)return;
 const vertical=up.clone().addScaledVector(axis,-axis.y);
 const height=vertical.length();if(height<.001)return;
 vertical.divideScalar(height);
 const fraction=clamp((need-hip.y-axis.y*along)/(radius*height));
 const tangent=pole.clone().addScaledVector(vertical,-pole.dot(vertical));
 if(tangent.lengthSq()<.00001)tangent.crossVectors(axis,vertical).multiplyScalar(Math.sign(leg.restX));
 pole.copy(vertical).multiplyScalar(fraction).addScaledVector(tangent.normalize(),Math.sqrt(1-fraction*fraction));
}
// Plant the rear instep and kneepad first, then fit the pelvis to the
// two fixed contacts. A firing impulse never re-solves their positions.
function rearRest(m,input,ankleLocal,weight){
 const {saker:s,cont,rig}=m,leg=rig.legs[0];
 const pitch=2.74*weight,cs=Math.cos(pitch),sn=Math.sin(pitch);
 const base=cont.localToWorld(ankleLocal.clone());
 const heading=m.yaw+leg.toe*(1-weight);
 const groundAt=(x,z)=>input.groundAt?.(x,z)??input.ground??0;
 const baseline=groundAt(base.x,base.z);
 let depth=0;
 for(let i=0;i<s.soleHull.length;i+=2){
  const y=s.soleHull[i],z=s.soleHull[i+1],reach=(sn*y+cs*z)*m.scale;
  const ground=groundAt(base.x+Math.sin(heading)*reach,base.z+Math.cos(heading)*reach);
  depth=Math.max(depth,(ground-baseline)/m.scale-cs*y+sn*z);
 }
 const anklePos=ankleLocal.clone();anklePos.y+=depth-ankle;
 const knee=anklePos.clone();knee.z+=leg.legB;
 for(let sample=0;sample<2;sample++){
  const world=cont.localToWorld(knee.clone());
  const ground=input.groundAt?.(world.x,world.z)??input.ground??0;
  knee.y=(ground-cont.position.y)/m.scale+.438;
  knee.z=anklePos.z+Math.sqrt(Math.max(.01,leg.legB**2-(anklePos.y-knee.y)**2));
 }
 const hip=cont.worldToLocal(leg.hip.getWorldPosition(V()));
 const dx=knee.x-hip.x,dz=knee.z-hip.z;
 const height=knee.y+Math.sqrt(Math.max(.01,leg.legA**2-dx*dx-dz*dz));
 const settled=weight*ramp(-anklePos.z,.90,1.78);
 rig.pelvis.position.y+=(height-hip.y)*settled;
 return {knee,ankle:cont.localToWorld(anklePos),pitch,settled};
}
function animate(m,input,dt,t){
 const s=m.saker,{rig,cont}=m,alive=input.alive,old=cont.position.clone();
 cont.position.set(input.pos.x,input.ground??0,input.pos.z);
 const travel=old.setY(0).distanceTo(cont.position.clone().setY(0));
 const reset=!m.init||travel>5,heading=input.moving?input.heading:input.face;
 const turn=Math.atan2(Math.sin(heading-m.yaw),Math.cos(heading-m.yaw));
 if(reset)m.yaw=heading;else if(alive)m.yaw+=turn*(1-Math.exp(-dt*12));cont.rotation.set(0,m.yaw,0);
 if(Number.isFinite(input.attack?.fireAt))s.lastFire=input.attack.fireAt;
 const age=t-(s.lastFire??Infinity);
 const hold=1-ramp(age,.27,.7);
 const shotHold=age>=0?1-ramp(age,.80,1.06):0;
 const ready=alive&&input.armed?Math.max(input.brace||0,input.attacking?(Number.isFinite(input.attack?.fireAt)?hold:1):0,shotHold,(input.readyRelease||0)*hold,input.targeting?.86:0):0;
 s.aim=input.reducedMotion?ready:follow(s.aim,ready,ready>s.aim?8.5:5.4,dt);
 s.run=follow(s.run,input.moving&&alive&&!input.reducedMotion?1:0,10,dt);
 s.contactAge+=dt;contacts(m,input,dt,travel,reset);m.init=true;
 const lock=s.aim,run=s.run,p=s.swing?.p??0;
 const front=m.cont.worldToLocal(m.legs[1].foot.clone()),back=m.cont.worldToLocal(m.legs[0].foot.clone());
 const stride=T.MathUtils.clamp((front.z-back.z)/2,-1,1)*run;
 const support=(s.swing?.i===0?-1:1)*Math.sin(Math.PI*p)*run;
 const plant=ramp(s.contactAge,0,.065)*(1-ramp(s.contactAge,.08,.24));
 const kick=input.reducedMotion?0:Math.max(age>=0?Math.exp(-age*13):0,Math.min(1,m.recoil));
 const rise=age>=0&&!input.reducedMotion?ramp(age,0,.115)*(1-ramp(age,.135,.58)):0;
 s.recoilPitch=.64*rise;
 m.recoil*=Math.exp(-dt*19);
 const dodge=t-s.dodgeAt;
 const lift=alive&&!input.legsDead&&dodge>=0?(ramp(dodge,.10,.28)-ramp(dodge,.32,.53)):0;
 const catchLoad=alive?ramp(dodge,.0,.1)-ramp(dodge,.10,.24)+ramp(dodge,.47,.56)-ramp(dodge,.56,.80):0;
 const down=alive?0:ramp(input.deathAge,0,.92);
 const hit=input.reducedMotion?0:Math.exp(-Math.max(0,t-(input.hitTime??-100))*10);
 const h=2.24-1.00*lock-.22*run-.045*plant*run-.030*kick-.24*catchLoad-.64*down-(input.legsDead?.35:0);
 rig.pelvis.position.set(.065*support+.13*lock+s.evadeSign*.36*lift,h,.22*run+.19*lock);
 rig.pelvis.rotation.set(.085*run*(1-lock),0,-.027*support+.40*down);
 rig.pelvis.position.y=R.supportHeight(m,input,h)+lift*.48;
 const deployed=ramp(lock,.16,.70)*(1-lift)*(alive&&!input.legsDead?1:0);
 const rest=deployed>0?rearRest(m,input,back,deployed):null;
 // The collar and visor face the firing lane. Recoil travels through the
 // wrist, arm and shoulder carriage while the kneeling base bears the load.
 rig.spine.position.set(0,.22+.16*lock,-.13*rise);
 rig.neck.position.set(0,.81+.16*lock,.84+.06*lock);
 rig.spine.rotation.set((.15+.33*run+.012*Math.sin(t*2.7))*(1-lock)-.027*rise+.16*hit+.58*down,
   .060*stride-.035*rise,-.034*support+.23*hit+.48*down,'YXZ');
 rig.neck.rotation.set((-.16-.19*run)*(1-lock)+.027*rise,(1-lock)*.16*Math.sin(t*.8)+.035*rise,0);
 rig.legs.forEach((leg,i)=>{
  const shoe=m.legs[i].foot.clone();shoe.y+=lift*(i===0?.90:.52);
  shoe.z+=Math.cos(m.yaw)*lift*(i===0?-.56:.40);shoe.x+=Math.sin(m.yaw)*lift*(i===0?-.56:.40);
  const swinging=s.swing?.i===i;
  const passing=swinging?(s.swing.walking?.14:.07)*Math.sin(2*Math.PI*ramp(p,.09,.89)):0;
  // A loaded rear foot rolls over its toe. Keep that toe at its board
  // contact as the heel rises, then unwind the ankle on the passing step.
  const relativeZ=(i===0?back:front).z-rig.pelvis.position.z;
  const roll=.36*ramp(-relativeZ,.13,.71)*run;
  let pitch=roll+passing;
  const toe=.70,heel=.41;
  const pivot=pitch>=0?toe:-heel;
  const rise=pivot*Math.sin(pitch)-ankle*(1-Math.cos(pitch));
  const advance=pivot*(1-Math.cos(pitch))+ankle*Math.sin(pitch);
  shoe.y+=rise*scale;
  shoe.x+=Math.sin(m.yaw+leg.toe)*advance*scale;
  shoe.z+=Math.cos(m.yaw+leg.toe)*advance*scale;
  if(i===0&&rest){shoe.copy(rest.ankle);pitch=rest.pitch;}
  kneeClearance(m,input,leg,shoe);
  if(i===0&&rest){
   const hip=cont.worldToLocal(leg.hip.getWorldPosition(V()));
   leg.bendPole.lerp(rest.knee.clone().sub(hip).normalize(),rest.settled);
  }
  R.solveWorldLeg(m,leg,shoe,m.yaw+leg.toe*(i===0?1-deployed:1),pitch);
 });
 const shoeRest=s.kneeRest;
 shoeRest.position.set(0,0,0);shoeRest.quaternion.identity();
 if(rest){
  const level=cont.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromAxisAngle(V(1,0,0),Math.PI/2));
  shoeRest.quaternion.slerp(shoeRest.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(level),rest.settled);
  // The sprung pad takes up contact as the shin rolls onto it.
  let compression=0;
  for(const x of [-.188,.188])for(const y of [-.185,.071]){
   const pad=shoeRest.localToWorld(V(x,y,.438));
   compression=Math.max(compression,(input.groundAt?.(pad.x,pad.z)??input.ground??0)-pad.y);
  }
  if(compression>0){
   const center=shoeRest.getWorldPosition(V());center.y+=compression;
   shoeRest.position.copy(shoeRest.parent.worldToLocal(center));
  }
 }
 for(const [side,sign] of [['L',1],['R',-1]]){
  const mantle=s.mantles[side];mantle.rotation.set(-.09-.12*lock+sign*.047*stride+.12*rise,sign*.045,-sign*.06);
 }
 // Solve the receiver from the loaded forward knee. The shoulder and elbow
 // carry it up together, maintaining the firing line over the crouched leg.
 const knee=cont.worldToLocal(rig.legs[1].kn.getWorldPosition(V()));
 const carry=V(-1.44,1.49+.10*stride,.29-.25*stride);
 const readyHand=V(-1.34,knee.y+.14+.19*rise,1.76-.42*rise);
 const grip=cont.localToWorld(carry.lerp(readyHand,lock));
 R.solveWorldLeg(m,s.rightLinks,grip,m.yaw,0);
 const pitch=-1.08+.08*stride+1.08*lock+.27*down;
 const q=cont.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromEuler(new T.Euler(pitch,-.085*(1-lock),-.05*(1-lock),'YXZ')));
 s.breech.quaternion.copy(s.breech.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));
 s.slide.position.z=-.45*kick;
 const leftSwing=V(1.18+.03*run,1.50+.10*stride-.55*down,.28+stride*.80);
 const low=V(1.12,handRest,0);
 const hand=cont.localToWorld(leftSwing.lerp(low,ramp(lock,.12,.97)));
 const floor=input.groundAt?.(hand.x,hand.z)??input.ground??0;
 if(lock>.95){hand.y=floor+handRest*scale;}
 hand.y+=.40*lift;
 R.solveWorldLeg(m,s.leftLinks,hand,m.yaw+.13,-.06+.15*run);
 cont.updateMatrixWorld(true);
}
function build(unit,source){
 const get=n=>source.getObjectByName(n),pelvis=get('Pelvis'),spine=get('Thorax'),neck=get('Optics'),arms={},legs=[];
 for(const [side,sign] of [['L',1],['R',-1]]){
  const sh=get('Shoulder'+side),el=get('Elbow'+side),wr=get('Wrist'+side);
  arms[side]={sh,el,wr,so:wr,paul:sh};
  const hip=get('Hip'+side),kn=get('Knee'+side),an=get('Ankle'+side);
  legs.push({side,hip,kn,an,legA:kn.position.length(),legB:an.position.length(),restX:sign*.64,restZ:-sign*.26,toe:sign*.13,bendPole:V(sign*.11,0,1)});
 }
 const rig={pelvis,spine,neck,arms,legs,pistons:[],spinners:[]};
 const owners=new Map([[neck,'pilot'],[get('MantleL'),'left'],[get('MantleR'),'right'],[arms.L.sh,'left'],[arms.R.sh,'right'],...legs.map(l=>[l.hip,'legs'])]);
 const materials=new Map(),parts=Object.fromEntries(R.parts.map(part=>[part,[]]));
 source.traverse(mesh=>{
  if(!mesh.isMesh)return;
  let parent=mesh.parent;while(parent&&!owners.has(parent))parent=parent.parent;
  if(!materials.has(mesh.material))materials.set(mesh.material,mesh.material.clone());
  mesh.material=materials.get(mesh.material);mesh.castShadow=mesh.receiveShadow=true;
  const paint=mesh.material.name.includes('enamel');mesh.material.userData.paint=paint;
  parts[owners.get(parent)??'body'].push({m:mesh,np:!paint});
 });
 const ownedMaterials=[...materials.values()],optic=ownedMaterials.find(mat=>mat.name.includes('optical'));
 const dims={py:2.24,ankleH:ankle,hipX:.53,restX:.64,stride:1.2};
 const m=R.createMech({root:source,rig,dims,parts,kits:[],mods:{},ownedMaterials,visorMat:optic,stackMat:optic},'saker',unit.team,unit.upgrade);
 m.live='saker';m.fireStance=true;m.scale=scale;m.cont.scale.setScalar(scale);
 const breech=get('Breech'),slide=get('Slide'),muzzle=get('Muzzle');
 const gun={id:'merlin-38',mount:breech,carrier:arms.R.wr,recoil:slide,muzzle,subsystem:'right',aimPivot:()=>breech};
 const {L,R:right}=arms;
 m.saker={breech,slide,aim:0,run:0,contactAge:1,next:1,swing:null,kneeRest:get('KneeRestL'),soleHull:get('AnkleL').userData.soleHull,dodgeAt:-100,evadeSign:1,
  mantles:{L:get('MantleL'),R:get('MantleR')},recoilPitch:0,
  rightLinks:{hip:right.sh,kn:right.el,an:right.wr,restX:-1,legA:right.el.position.length(),legB:right.wr.position.length(),bendPole:V(-.86,.58,.52)},
  leftLinks:{hip:L.sh,kn:L.el,an:L.wr,restX:1,legA:L.el.position.length(),legB:L.wr.position.length(),bendPole:V(.58,0,-1)}};
 m.nativeV2={source,worldScale:scale,animate,targetingBlend:()=>m.saker.aim,
  pose(entry){entry.primary=gun;return true;},sync(){breech.rotateX(-m.saker.recoilPitch);m.cont.updateMatrixWorld(true);},
  dodge(time,incoming){m.saker.dodgeAt=time;m.saker.evadeSign=V(Math.cos(m.yaw),0,-Math.sin(m.yaw)).dot(incoming)>0?-1:1;},
  bounds(name){const node=name==='neck'?neck:legs.find(l=>name==='ankle.'+l.side)?.an;return node?new T.Box3().setFromObject(node):new T.Box3();},dispose(){}};
 return m;
}
root.IronVowRigV2.register(28,{id:'saker',assetPath:'rig-bench/rig-v2/saker.glb',build});
})(window);
