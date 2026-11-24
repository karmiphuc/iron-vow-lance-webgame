/* Foundry rig setup, planted gait, damage states and melee keyframes. */
(function(){
'use strict';
if(!window.THREE||!window.VowChassis)return;
const T=THREE, PI=Math.PI, V3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const C=h=>new T.Color(h).convertSRGBToLinear();
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
const smooth=q=>q*q*(3-2*q), smoother=q=>q*q*q*(q*(q*6-15)+10);
const wrapA=a=>((a+PI)%(2*PI)+2*PI)%(2*PI)-PI;
const dampAngle=(a,b,k,dt)=>a+wrapA(b-a)*(1-Math.exp(-k*dt));
function spr(s,k,d,dt){s.v+=(-k*s.x-d*s.v)*dt;s.x+=s.v*dt;}
const VC=window.VowChassis;
function makeMech(frame,team,upgrade,tag,paint,modules){
  return createMech(VC.build(frame,team,tag,paint,modules),frame,team,upgrade);
}
function createMech(b,frame,team,upgrade){
  const cont=new T.Group();cont.rotation.order='YXZ';cont.add(b.root);const r=b.rig;
  const m={cont,body:b.root,rig:r,dims:b.dims,build:b,frame,team,yaw:0,scale:1,
    gait:{phase:0,w:0},legs:r.legs.map(()=>({planted:V3(),from:V3(),to:V3(),swing:false,settle:null,foot:V3()})),
    s:{comp:{x:0,v:0},pitch:{x:0,v:0},roll:{x:0,v:0},arm:{x:0,v:0},kx:{x:0,v:0},kz:{x:0,v:0}},
    aim:{blend:0,point:V3(),until:-1},recoil:0,wrecked:false,shield:b.shield,kitLevel:-1,init:false,seed:Math.random()*10,smokeT:0,
    partState:{body:0,pilot:0,right:0,left:0,legs:0},flicker:0};
  if(b.dims.quad)for(const leg of r.legs)leg.kneeShoe=b.root.getObjectByName('BHM knee shoe '+leg.side);
  const elevation=b.root.getObjectByName('mortar.elevation');
  if(elevation)m.mortar={elevation,slide:elevation.getObjectByName('mortar.recoil'),muzzle:elevation.getObjectByName('mortar.muzzle')};
  setKits(m,upgrade||0);return m;
}
function setKits(m,level){if(m.kitLevel===level)return;m.build.kits.forEach((k,i)=>k.forEach(o=>o.visible=i<level));m.kitLevel=level;}
/* Arm loss takes the shoulder assembly with it. Skinned GLBs render from their
   own bone tree, so hide their authored part meshes as well as the driver joints. */
function setPartState(m,part,st){
  const prev=m.partState[part];
  if(prev===st)return false;
  m.partState[part]=st;
  const arm=part==='right'?m.rig.arms.R:part==='left'?m.rig.arms.L:null;
  if(arm){arm.sh.visible=st<2;arm.paul.visible=st<2;}
  for(const e of m.build.parts[part]){
    const mesh=e.m;
    if(!e.np){
      mesh.userData.base??=mesh.material;
      mesh.material=st>=1?VC.damagedOf(mesh.userData.base):mesh.userData.base;
    }
    if(arm||e.detach){
      if(st===2){e.beforeLoss=mesh.visible;mesh.visible=false;}
      else if(prev===2){mesh.visible=e.beforeLoss;delete e.beforeLoss;}
    }
  }
  return st>prev;
}
function wreckMech(m){m.body.traverse(o=>{if(!o.isMesh||!o.material)return;const base=o.userData.base||o.material;if(base.userData&&base.userData.paint)o.material=VC.wreckOf(base);});m.build.visorMat.emissiveIntensity=0;m.build.stackMat.emissiveIntensity=0;}

/* ---------- mech animation ---------- */
function solveLeg(m,leg,t,pitch){VC.solveLeg(m.rig,m.dims,leg,t,pitch);}
const legReach=(leg,dims)=>(leg.legA??dims.legA)+(leg.legB??dims.legB);
const _a=V3(),_b=V3(),_c=V3();
/* melee timeline (s): windup 0-.38, strike .38-.5 (contact .46), hold -.72, recover -1.1 */
const MEL={wind:.38,hit:.46,strike:.5,hold:.72,end:1.1};
const thrustWindup={sx:-.66,sz:-.08,el:-1.35,wr:.36,yaw:-.16,lean:-.08};
const thrustContact={sx:-1.12,sz:.12,el:-.33,wr:-.10,yaw:.13,lean:.13};
function meleeKeys(a,thrust,style){if(a<0||a>MEL.end)return null;
  const P0={sx:-.28,sz:-.07,el:-.62,wr:0,yaw:0,lean:0};
  // A chassis may author its own swing (dims.melee); thrust weapons keep the shared pike keys.
  const P1=thrust?thrustWindup:style?.wind??{sx:-2.55,sz:-.55,el:-1.45,wr:-.3,yaw:-.55,lean:-.12};
  const P2=thrust?thrustContact:style?.hit??{sx:-.75,sz:.42,el:-.12,wr:.25,yaw:.62,lean:.22};
  let A,B,q;if(a<MEL.wind){A=P0;B=P1;q=smooth(a/MEL.wind);}else if(a<MEL.strike){A=P1;B=P2;q=1-Math.pow(1-(a-MEL.wind)/(MEL.strike-MEL.wind),3);}else if(a<MEL.hold){A=P2;B=P2;q=1;}else{A=P2;B=P0;q=smooth((a-MEL.hold)/(MEL.end-MEL.hold));}
  const o={w:a>MEL.hold?1-q*.999:1};for(const k in P0)o[k]=lerp(A[k],B[k],q);return o;}
function lungeK(a){if(a<0||a>MEL.end)return 0;if(a<MEL.wind)return -.15*smooth(a/MEL.wind);if(a<MEL.strike)return lerp(-.15,1,smooth((a-MEL.wind)/(MEL.strike-MEL.wind)));if(a<MEL.hold)return 1;return 1-smooth((a-MEL.hold)/(MEL.end-MEL.hold));}
function liftArc(q){return q<.42?1-Math.pow(1-q/.42,3):1-Math.pow((q-.42)/.58,3);}
const kneeContact=V3(.335,.3155,1.82),pelvisShift=.09;
const easeRange=(t,a,b)=>smooth(clamp((t-a)/(b-a),0,1));
function behemothBrace(m,attack,t){
  if(!m.mortar||!attack)return null;
  const q=attack.primeDuration>0?clamp((t-attack.start)/attack.primeDuration,0,1):1;
  const r=Number.isFinite(attack.returnAt)?clamp((t-attack.returnAt)/.35,0,1):0;
  return [easeRange(q,.30,1)*(1-easeRange(r,0,.85)),easeRange(q,.20,.97)*(1-easeRange(r,.22,1)),
    easeRange(q,.34,.97)*(1-easeRange(r,.04,.87))];
}
function swingDirection(from,to,weight){
  const turn=new T.Quaternion().setFromUnitVectors(from,to);
  return from.clone().applyQuaternion(new T.Quaternion().slerp(turn,weight)).normalize();
}
function poseBehemothBrace(m,artillery,I){
  const {body,rig:r,dims:D}=m,p=r.pelvis,A=D.legA,B=D.legB;
  const [hull,left,right]=artillery||[0,0,0];
  if(artillery){
    const solvedY=p.position.y;
    const kneeY=kneeContact.y-D.hipY+Math.sqrt(A*A-(D.hipX-kneeContact.x)**2-(kneeContact.z-D.hipZ-pelvisShift)**2);
    const authoredY=lerp(D.py,kneeY,hull);
    p.position.set(0,I?.groundAt?Math.min(solvedY,authoredY):authoredY,pelvisShift*hull);
    p.rotation.set(0,0,0);
  }
  body.updateWorldMatrix(true,true);
  const rootQ=body.getWorldQuaternion(new T.Quaternion());
  for(const [index,leg] of r.legs.entries()){
    const sign=Math.sign(leg.restX),front=Boolean(leg.kneeShoe),drive=front?(sign>0?left:right):0;
    // The foot stays planted on its IK goal while the hull sinks; only then does the knee drop and the shin tuck.
    const fold=smooth(clamp((drive-.42)/.58,0,1));
    const hip=body.worldToLocal(leg.hip.getWorldPosition(V3()));
    const goal=I?.groundAt?body.worldToLocal(m.legs[index].foot.clone()):V3(leg.restX,D.ankleH,leg.restZ),target=goal.clone();
    const contact=front?V3(sign*kneeContact.x,kneeContact.y,kneeContact.z):null;
    if(contact&&I?.groundAt){const point=body.localToWorld(contact.clone());contact.y+=(I.groundAt(point.x,point.z)-(I.ground||0))/m.scale;}
    m.legs[index].poseLift=fold>0;
    m.legs[index].kneeContact=front&&fold>=.999&&hull>=.999;
    if(fold>0){
      // Two-bone IK toward an ankle target that travels from the planted foot to its folded spot under the hull.
      // The knee pole turns toward the knee pad, so the solve lands exactly on the kneeling pose at fold 1.
      target.lerp(contact.clone().addScaledVector(V3(sign*.22,.42,-.88).normalize(),B),fold);
      target.y+=.35*Math.sin(PI*fold);
    }
    const axis=target.clone().sub(hip),len=clamp(axis.length(),Math.abs(A-B)+.001,A+B-.001);axis.normalize();
    const pole=V3(sign*.84,.05,front?.91:-.76);
    if(fold>0)pole.lerp(contact.clone().sub(hip).normalize(),fold);
    pole.addScaledVector(axis,-pole.dot(axis)).normalize();
    const along=(A*A-B*B+len*len)/(2*len);
    const up=axis.clone().multiplyScalar(along).addScaledVector(pole,Math.sqrt(Math.max(0,A*A-along*along))).normalize();
    const down=axis.clone().multiplyScalar(len).addScaledVector(up,-A).normalize();
    if(fold>0){
      const clearance=D.ankleH+.085*fold+.15*Math.sin(PI*fold);
      const limit=clamp((clearance-hip.y-A*up.y)/B,-.999,.999);
      if(down.y<limit){down.y=0;down.normalize().multiplyScalar(Math.sqrt(1-limit*limit));down.y=limit;}
    }
    const hinge=up.clone().cross(down).normalize(),y=up.clone().negate();
    const basis=new T.Matrix4().makeBasis(hinge,y,hinge.clone().cross(y));
    const q=new T.Quaternion().setFromRotationMatrix(basis).premultiply(rootQ);
    leg.hip.quaternion.copy(leg.hip.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));
    leg.kn.rotation.set(up.angleTo(down),0,0);
    const kneeLocal=leg.kn.getWorldQuaternion(new T.Quaternion()).invert().multiply(rootQ);
    const foot=new T.Quaternion().setFromEuler(new T.Euler(-fold*.22,Math.atan2(sign,front?1:-1)*(1-fold),0,'YXZ'));
    leg.an.quaternion.copy(kneeLocal.clone().multiply(foot));
    if(front)leg.kneeShoe.quaternion.identity().slerp(kneeLocal,fold);
  }
  body.updateWorldMatrix(true,true);
  for(const [a,b] of r.pistons){a.lookAt(b.getWorldPosition(_a));b.lookAt(a.getWorldPosition(_a));}
}
// Animation clock and emitter for the future body skill. No attack rule consumes it yet.
const MORTAR={fire:.95,end:2.1};
function poseBehemothMortar(m,age){
  if(!m.mortar)return null;
  const active=Number.isFinite(age)&&age>=0&&age<MORTAR.end;
  const elevation=active?easeRange(age,.23,.82)*(1-easeRange(age,1.45,2.02)):0;
  const shot=active?age-MORTAR.fire:-1;
  const kick=shot>=0?(1-Math.exp(-120*shot))*Math.exp(-8*shot):0;
  m.mortar.elevation.rotation.x=lerp(-.18,-1.02,elevation)+kick*.055;
  m.mortar.slide.position.z=-.43*kick;
  if(!active||!m.dims.quad)return null;
  const fold=1-easeRange(age,1.47,MORTAR.end);
  return [easeRange(age,.10,.73)*fold,easeRange(age,.04,.71)*fold,easeRange(age,.20,.71)*fold];
}
/* Ready poses for chassis with dims.carry. m.offhand ('blade'|'shield'|'free'|'none') and m.primaryWeapon are set by the
   renderer. A blade in the left hand picks one of C.dual at random each time the mech starts or stops moving. */
function carryWeights(m,I,C,dt,dead,canSupport){
  const W=m.carryW||(m.carryW={gunUp:0,bladeForward:0,support:0});
  if(!C||dead){for(const k in W)W[k]=0;return W;}
  const moving=Boolean(I.moving);
  if(m.carryMoving!==moving||m.carryStyle==null){m.carryMoving=moving;m.carryStyle=Math.floor(Math.random()*C.dual.length);}
  const style=m.offhand==='blade'&&!I.leftDead?C.dual[m.carryStyle]:[];
  const target={gunUp:style.includes('gunUp')?1:0,bladeForward:style.includes('bladeForward')?1:0,
    support:canSupport&&(moving||m.fireStance||C.supportIdle)?1:0};
  // The free hand grabs quickly and lets go quickly; guards blend more slowly.
  for(const k in W)W[k]=damp(W[k],target[k],k==='support'?10:5,dt);
  return W;
}
const _g0=V3(),_g1=V3(),_gp=V3(),_gs=V3(),_gt=V3();
function shoulderRifle(m,arm,weight,recoil,F,aim=m.aim.point){
  const r=m.rig,D=m.dims,spine=r.spine;
  m.cont.updateMatrixWorld(true);
  const toSpine=spine.getWorldQuaternion(new T.Quaternion()).invert();
  // World-space solve: segment lengths scale with the rig.
  const shoulder=arm.sh.getWorldPosition(V3()),L=(D.fo+(D.so||.26))*m.scale;
  // Recoil drives the grip down and back along the stock, never straight into the head.
  const grip=spine.localToWorld(V3(F.grip[0],D.shY+F.grip[1]-recoil*.18,(D.shZ||0)+F.grip[2]-recoil*.16));
  const line=aim.clone().sub(grip).normalize();
  const upper=grip.clone().addScaledVector(line,-L).sub(shoulder).normalize();
  const u=upper.applyQuaternion(toSpine),f=line.clone().applyQuaternion(toSpine);
  const Y=u.clone().negate(),Z=f.clone().addScaledVector(u,-f.dot(u)).normalize(),X=Y.clone().cross(Z);
  const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(X,Y,Z));
  arm.sh.quaternion.slerp(q,weight);
  arm.el.rotation.x=lerp(arm.el.rotation.x,-u.angleTo(f),weight);
  // The rifle sits 0.11 rad off the forearm in the wrist frame; cancel it so the barrel follows the line of fire.
  arm.wr.rotation.x=lerp(arm.wr.rotation.x,.1103-recoil*.1,weight);
}
function supportGrip(m,arm,weight){
  const r=m.rig,D=m.dims,spine=r.spine,sc=m.scale;
  m.cont.updateMatrixWorld(true);
  const base=r.arms.R.so.getWorldPosition(_g0),muzzle=m.primaryWeapon.muzzle.getWorldPosition(_g1);
  const A=D.up,B=D.fo+(D.so||.26);
  const shoulder=arm.sh.getWorldPosition(_gs),minReach=(Math.abs(A-B)+.01)*sc,maxReach=(A+B-.01)*sc;
  // Reach for a point between the grip and muzzle only if the hand can actually meet it.
  // Clamping to a point on the reach sphere leaves the hand posing in empty space.
  if(base.distanceToSquared(muzzle)<1e-6)return;
  let grip=null;
  for(let percent=62;percent>=16;percent-=2){
    _gp.lerpVectors(base,muzzle,percent/100);
    const distance=_gp.distanceTo(shoulder);
    if(distance>=minReach&&distance<=maxReach){grip=_gp;break;}
  }
  if(!grip)return;
  const target=spine.worldToLocal(_gt.copy(grip));
  const s=arm.sh.position,axis=target.clone().sub(s),len=axis.length();axis.normalize();
  const side=Math.sign(s.x)||1,pole=V3(side*.7,-.45,-.55);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
  const along=(A*A-B*B+len*len)/(2*len);
  const up=axis.clone().multiplyScalar(along).addScaledVector(pole,Math.sqrt(Math.max(0,A*A-along*along))).normalize();
  const down=axis.clone().multiplyScalar(len).addScaledVector(up,-A).normalize();
  const Y=up.clone().negate(),Z=down.clone().addScaledVector(up,-down.dot(up)).normalize(),X=Y.clone().cross(Z);
  const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(X,Y,Z));
  arm.sh.quaternion.slerp(q,weight);
  arm.el.rotation.x=lerp(arm.el.rotation.x,-up.angleTo(down),weight);
  arm.wr.rotation.x=lerp(arm.wr.rotation.x,0,weight);
}
/* Settled poses from the Valkyrie striker and roster loadout studies. Foot and pelvis offsets scale with hip height.
   The last two arm angles, when supplied, turn the shoulder and roll the wrist. */
const readyPoses={
  striker:{pelvis:[.045,-.085,.027],feet:[.075,.275,.17],spine:[.145,.23,-.045],neck:[-.05,.07,.025],
    gun:{aim:[6.7,0,13],grip:D=>[D.shX*.12,-D.up*.72,D.fo*.93]},support:true},
  buckler:{pelvis:[.03,-.052,.028],feet:[.075,.24,.24],spine:[.135,.32,-.035],neck:[-.045,.125,0],
    gun:{aim:[1.8,.1,13],grip:D=>[-D.shX*.85,-D.up*.7,D.fo*1.1]},left:[-.91,-.15,-1.09,.26],shieldTurn:.23,padDrop:.10},
  tower:{pelvis:[.03,-.087,.028],feet:[.10,.24,.24],spine:[.175,.32,-.035],neck:[-.045,.125,0],
    gun:{aim:[1.8,-.4,13],grip:D=>[-D.shX*.85,-D.up*.7,D.fo*1.1]},left:[-.66,-.15,-.91,.07],shieldTurn:.13,padDrop:.10},
  maul:{pelvis:[-.06,-.052,-.045],feet:[.075,.19,.19],spine:[.135,-.63,-.035],neck:[-.045,-.125,0],
    left:[-1.35,.52,-1.75,1.60,.65,.43],right:[-.09,-.25,-.62,0],padDrop:.10,leftPadTilt:-.19},
  sword:{pelvis:[.03,-.052,.028],feet:[.075,.24,.24],spine:[.135,-.30,.06],neck:[-.045,-.125,0],
    left:[-1.28,.33,-.30,1.18],right:[-.09,-.25,-.62,0],padDrop:.06,leftPadTilt:-.19},
  rail:{pelvis:[.03,-.087,.028],feet:[.10,.24,.24],spine:[.175,.18,-.035],neck:[-.045,.125,0],
    gun:{aim:[3.8,-.4,13],grip:D=>[D.shX*.16,-D.up*.7,D.fo*.88]},support:true,padDrop:.10},
  pod:{pelvis:[.03,-.142,.028],feet:[.14,.12,.12],spine:[.185,.36,-.035],neck:[-.045,.125,0]}
};
function blendReadyArm(arm,[pitch,spread,elbow,wrist,yaw=0,roll=0],weight){
  arm.sh.rotation.set(lerp(arm.sh.rotation.x,pitch,weight),yaw*weight,lerp(arm.sh.rotation.z,spread,weight));
  arm.el.rotation.x=lerp(arm.el.rotation.x,elbow,weight);
  arm.wr.rotation.set(lerp(arm.wr.rotation.x,wrist,weight),0,roll*weight);
}
/* [walk fix] a foothold on the floor no further than lim from the hip: keeps its height and slides toward the hip's ground point */
function onFloorWithin(p,hip,lim){const dy=p.y-hip.y,hx=p.x-hip.x,hz=p.z-hip.z,hd=Math.hypot(hx,hz),mx=Math.sqrt(Math.max(0,lim*lim-dy*dy));
  if(hd<=mx||hd<1e-6)return p;const k=mx/hd;p.x=hip.x+hx*k;p.z=hip.z+hz*k;return p;}
/* [walk fix] gait start: the cycle phase that keeps every planted foot inside half a stride for the rest of its stance,
   preferring swings that start early. Planted feet stay where they are; only the cycle's starting point is chosen. */
function startPhase(m,cont,D,stepLen,dir){let best=m.gait.phase,bc=1e9;
  for(let k=0;k<32;k++){const g=k/32;let c=0;
    m.rig.legs.forEach((l,i)=>{const ph=((g+(l.phase??i*.5)+(m.legs[i].phaseOffset||0))%1+1)%1,L=m.legs[i],home=cont.localToWorld(_a.set(l.restX,D.ankleH,l.restZ));
      if(ph<(D.duty??.5)){const off=(L.planted.x-home.x)*dir.x+(L.planted.z-home.z)*dir.z,end=off-((D.duty??.5)-ph)*2*stepLen;c+=Math.max(0,-end-stepLen*(D.duty??.5))*10+Math.max(0,off-stepLen*(D.duty??.5))*10;}
      else c+=(ph-(D.duty??.5));});
    if(c<bc-1e-9){bc=c;best=g;}}
  return best;}
/* in: {pos,moving,speed,stepLen,heading,face,brace,alive,deathAge,down,pilotRatio,armDead,legsDead,shieldDead,ground,onStep,noPlant} */
function animateMech(m,I,dt,t){
  const r=m.rig,cont=m.cont,S=m.s,sc=m.scale,D=m.dims;
  for(const L of m.legs){L.poseLift=false;L.kneeContact=false;}
  if(m.artilleryBrace){
    r.pelvis.position.z=0;
    for(const leg of r.legs)leg.kneeShoe?.quaternion.identity();
    m.artilleryBrace=false;
  }
  if(!m.init){m.yaw=I.face;cont.rotation.y=m.yaw;cont.position.set(I.pos.x,I.ground||0,I.pos.z);cont.updateMatrixWorld(true);
    r.legs.forEach((l,i)=>{const h=cont.localToWorld(V3(l.restX,D.ankleH,l.restZ));if(I.groundAt&&I.alive)h.y=I.groundAt(h.x,h.z)+D.ankleH*sc;m.legs[i].planted.copy(h);m.legs[i].foot.copy(h);});m.init=true;}
  cont.position.set(I.pos.x+S.kx.x,I.ground||0,I.pos.z+S.kz.x);
  const targetYaw=I.moving?I.heading:I.face,oldYaw=m.yaw;let nextYaw=dampAngle(oldYaw,targetYaw,I.moving?8:4.5,dt);
  if(I.groundAt&&I.alive&&!I.moving){
    const supports=r.legs.map((l,i)=>({leg:l,state:m.legs[i]})).filter(({state:L})=>!L.swing&&!L.settle&&!L.poseLift);
    // Each planted support limits the body's turn until its next real step makes room.
    if(supports.length){cont.updateMatrixWorld(true);
      const limits=supports.map(({leg,state:L})=>{const reach=(legReach(leg,D)-.03)*sc;const local=cont.worldToLocal(leg.hip.getWorldPosition(V3())),vertical=Math.max(0,(I.ground||0)+(D.py+(D.hipY||0)-.4)*sc-L.planted.y);return{local,goal:L.planted,horizontal:Math.sqrt(Math.max(0,reach*reach-vertical*vertical))};});
      const safe=yaw=>{const c=Math.cos(yaw),s=Math.sin(yaw);return limits.every(({local:p,goal,horizontal})=>Math.hypot(cont.position.x+sc*(p.x*c+p.z*s)-goal.x,cont.position.z+sc*(p.z*c-p.x*s)-goal.z)<=horizontal);};
      if(!safe(nextYaw)){let low=0,high=1;for(let i=0;i<12;i++){const q=(low+high)/2;if(safe(oldYaw+(nextYaw-oldYaw)*q))low=q;else high=q;}nextYaw=oldYaw+(nextYaw-oldYaw)*low;}
    }
  }
  m.yaw=nextYaw;
  const dead=!I.alive,pd=dead&&I.down==='pilot';
  const dE=dead?smooth(clamp((I.deathAge-.05)/(pd?.85:.51),0,1)):0;
  const tip=dead&&!pd?smooth(clamp((I.deathAge-.42)/.52,0,1)):0;
  cont.rotation.set(-.95*tip,m.yaw,pd?.05*dE:.32*tip);
  cont.updateMatrixWorld(true);
  spr(S.comp,80,11,dt);S.comp.x=clamp(S.comp.x,-.4,.12);spr(S.pitch,55,7,dt);spr(S.roll,55,9,dt);spr(S.arm,60,7,dt);spr(S.kx,40,9,dt);spr(S.kz,40,9,dt);
  m.gait.w=damp(m.gait.w,I.moving?1:0,I.moving?10:6,dt);const w=m.gait.w;
  // Heavier frames take shorter, quicker steps so a longer planted phase stays within leg reach.
  const stepLen=(I.stepLen??1.55)*(D.stride??1);
  // PR #20: actual root velocity also covers lunges, shoves and changing headings.
  const vel=m.vel||(m.vel=V3());if(m.lastPos&&dt>0){_c.set(cont.position.x-m.lastPos.x,0,cont.position.z-m.lastPos.z).divideScalar(dt);vel.lerp(_c,1-Math.exp(-dt*20));}
  (m.lastPos||(m.lastPos=V3())).copy(cont.position);
  const fwd=V3(Math.sin(m.yaw),0,Math.cos(m.yaw)),vs=Math.hypot(vel.x,vel.z),dir=vs>.3?V3(vel.x/vs,0,vel.z/vs):fwd;
  if(I.moving&&!dead&&!m.gait.wasMoving){m.gait.phase=startPhase(m,cont,D,stepLen,dir);for(const L of m.legs)L.startSwing=true;}
  m.gait.wasMoving=I.moving&&!dead;
  if(Number.isFinite(I.cycle))m.gait.phase=I.cycle;
  else if(I.moving)m.gait.phase+=dt*I.speed/(2*stepLen);
  const g=m.gait.phase,duty=D.duty??.5;
  // Land on the actual terrain even when the reach clamp adjusts horizontal position.
  const floorWithin=(point,hip,reach)=>{for(let i=0;i<4;i++){if(I.groundAt)point.y=I.groundAt(point.x,point.z)+D.ankleH*sc;onFloorWithin(point,hip,reach*.985);}if(I.groundAt)point.y=I.groundAt(point.x,point.z)+D.ankleH*sc;return point;};
  // Firing stance (dims.carry.fire, empty left hand): lead with the left foot and blade the torso so the left hand
  // reaches the under-barrel. Driven by I.ready (attack priming or aiming) and blended so it also animates under noPlant.
  const brace=I.brace;
  const canSupport=Boolean(!dead&&!I.airborne&&!I.armDead&&!I.leftDead&&(m.offhand??'free')==='free'&&m.primaryWeapon?.muzzle);
  const F=D.carry?.fire,ready=Boolean(!I.legsDead&&F&&canSupport&&!I.moving&&brace<.5&&((I.ready??t<m.aim.until)||m.aim.blend>.35));
  m.fireStance=ready;
  m.fireStep=canSupport?damp(m.fireStep||0,ready?1:0,7,dt):0;
  const fs=smooth(clamp(m.fireStep,0,1));
  const guard=readyPoses[I.readyPose];
  const canGuard=guard&&!dead&&!I.airborne&&!I.legsDead&&!I.armDead&&!I.leftDead&&!I.reducedMotion;
  const settled=canGuard&&!I.moving;
  m.readyBlend=canGuard?damp(m.readyBlend??0,settled?1:0,settled?8:14,dt):0;
  const footGuard=settled?m.readyBlend:0;
  const strikeRelease=m.melee?easeRange(m.melee.age,0,.12):0;
  const release=Math.max(I.readyRelease??0,strikeRelease,clamp(2*(I.brace??0),0,1));
  const upperGuard=m.readyBlend*(1-release);
  const guardWeight=m.readyGuard=Math.min(upperGuard,damp(m.readyGuard??0,upperGuard,12,dt));
  // Pose the pelvis before solving the legs, so the IK uses this frame's hips rather than the previous frame's.
  const p=r.pelvis;
  const breathe=Math.sin(t*1.3+m.seed)*.03*(1-w)*(dead?0:1);
  p.position.y=D.py+w*(.05*Math.cos(4*PI*(g-.25))-.1-(D.walkDrop??0))+breathe+S.comp.x-brace*.34-(pd?D.py*.3*dE:dE*1.4);
  p.position.x=w*(D.sway??.16)*Math.sin(2*PI*g*(D.quad?2:1));p.rotation.z=w*(D.quad?.015:.05)*Math.sin(2*PI*g)+(I.legsDead?.08:0);
  p.rotation.y=F?-F.hips*fs:0;
  if(guard){
    m.readyRestZ??=p.position.z;
    p.position.x+=D.py*guard.pelvis[0]*guardWeight;
    p.position.y+=D.py*guard.pelvis[1]*guardWeight;
    p.position.z=m.readyRestZ+D.py*guard.pelvis[2]*guardWeight;
  }else if(m.readyRestZ!=null)p.position.z=m.readyRestZ;
  // Rest the chassis on its failed running gear, even when aiming or reloading a sortie.
  // Keep this height as the starting point if the damaged hull subsequently falls.
  if(I.legsDead)p.position.y=Math.min(p.position.y,D.py*(D.quad?.54:.47));
  cont.updateMatrixWorld(true);
  let settling=m.legs.some(L=>L.settle);
  if(m.wasAirborne&&!I.airborne){for(const L of m.legs)L.settle={from:L.foot.clone(),t:0,dur:.15};settling=true;}
  m.wasAirborne=Boolean(I.airborne);
  const artilleryPreparing=D.quad&&!I.moving&&Boolean(I.artillery||Number.isFinite(I.mortarAge));
  // On the battle board the pelvis adapts to planted terrain contacts below.
  // Testing full reach against the uncompressed idle pose restarts the same step every time it lands.
  const groundedStance=I.groundAt&&I.alive&&!I.airborne&&!I.moving&&vs<.3;
  const pitches=[];
  r.legs.forEach((l,i)=>{const L=m.legs[i],lead=F&&l.restX>0;
    let homeX=l.restX-(lead?F.narrow*fs:0),homeZ=l.restZ+(F?(lead?F.step:-F.back)*fs:0);
    if(I.legsDead&&!dead&&!D.quad){
      // Fold one shin along the ground and plant the other foot forward for support.
      const bend=D.reverse?-1:1;
      homeZ=l.restZ+bend*(l.restX>0?-.92*(l.legB??D.legB):.36*(l.legA??D.legA));
    }
    if(footGuard>0){
      const side=Math.sign(l.restX),[spread,front,back]=guard.feet;
      homeX+=side*D.py*spread*footGuard;
      homeZ+=D.py*(side>0?front:-back)*footGuard;
    }
    const home=cont.localToWorld(_a.set(homeX,D.ankleH,homeZ)).clone();let pitch=0;
    if(I.groundAt&&I.alive&&!I.airborne)home.y=I.groundAt(home.x,home.z)+D.ankleH*sc;
    const hip=l.hip.getWorldPosition(V3()),reach=legReach(l,D)*sc,ph=((g+(l.phase??i*.5)+(L.phaseOffset||0))%1+1)%1;
    const lifting=I.moving&&!dead&&ph>=duty;
    const strained=!groundedStance&&!lifting&&!L.swing&&!L.settle&&(!dead||pd)&&!I.noPlant&&hip.distanceTo(L.planted)>reach-Math.max(.04,1.5*vs*dt);
    if(strained){L.settle={from:L.planted.clone(),t:0,dur:.26};settling=true;}
    if(I.noPlant||I.legsDead||(dead&&!pd)){L.foot.copy(home);L.planted.copy(home);L.swing=false;L.settle=null;
      if(lead&&!dead&&!I.legsDead){L.foot.y+=F.lift*Math.sin(PI*fs)*sc;pitch=.3*Math.sin(PI*fs);}}
    else if(L.settle&&(!dead||pd)){
      const step=L.settle;step.t+=dt/(step.dur||.42);const q=Math.min(1,step.t),land=home.clone().addScaledVector(vel,(1-q)*(step.dur||.42));
      if(I.moving)land.addScaledVector(dir,stepLen*duty*.5);
      if(I.groundAt)land.y=I.groundAt(land.x,land.z)+D.ankleH*sc;else land.y=home.y;
      L.foot.lerpVectors(step.from,land,smoother(q));L.foot.y+=Math.sin(PI*q)*.45*sc;
      if(q>=1){
        // A stationary landing uses the grounded pelvis solve below. Clamping
        // to the raised hip can land short of home and start another recovery step.
        L.planted.copy(groundedStance?land:floorWithin(land,hip,reach));
        L.foot.copy(L.planted);L.settle=null;L.swing=false;I.onStep&&I.onStep(m,L.planted,i,.45);
      }
    }
    else if(I.moving&&!dead){
      if(ph<duty){if(L.swing){L.swing=false;L.planted.copy(floorWithin(L.to,hip,reach));I.onStep&&I.onStep(m,L.planted,i);}L.foot.copy(L.planted);}
      else{if(!L.swing){L.swing=true;L.from.copy(L.foot);L.swingBegin=L.startSwing?ph:duty;L.startSwing=false;}const q=clamp((ph-(L.swingBegin??duty))/(1-(L.swingBegin??duty)),0,1);
        L.to.copy(home).addScaledVector(dir,stepLen*duty);L.to.y=I.groundAt?I.groundAt(L.to.x,L.to.z)+D.ankleH*sc:home.y;
        L.foot.lerpVectors(L.from,L.to,smoother(q));L.foot.y+=liftArc(q)*D.lift*sc;pitch=q<.3?.45*Math.sin(PI*q/.3):q>.62?-.35*Math.sin(PI*(q-.62)/.38):0;}}
    else{
      if(L.swing){L.swing=false;L.settle={from:L.foot.clone(),t:0,dur:.3};settling=true;}
      else{if(!dead&&(!settling||artilleryPreparing&&!l.kneeShoe)&&L.planted.distanceTo(home)>.22*sc){L.settle={from:L.planted.clone(),t:0};settling=true;}L.foot.copy(L.planted);}
    }
    // PR #20: in-flight goals remain reachable; planted anchors never move under this clamp.
    if(L.swing||L.settle){const d=hip.distanceTo(L.foot);if(d>reach*.99)L.foot.sub(hip).multiplyScalar(reach*.99/d).add(hip);}
    pitches[i]=pitch*w;});
  if(I.groundAt&&I.alive&&!I.airborne){
    // Uneven tiles and the first/last half-step can require compression beyond the flat-floor walk bob.
    // Lower the pelvis enough for the actual goals; the world-space planted anchors never move.
    cont.updateMatrixWorld(true);let drop=0;
    for(let i=0;i<r.legs.length;i++){
      const hip=r.legs[i].hip.getWorldPosition(V3()),goal=m.legs[i].foot,reach=(legReach(r.legs[i],D)-.004)*sc;
      const horizontal=Math.hypot(hip.x-goal.x,hip.z-goal.z),vertical=Math.sqrt(Math.max(0,reach*reach-horizontal*horizontal));
      drop=Math.max(drop,(hip.y-goal.y-vertical)/sc);
    }
    p.position.y-=Math.max(0,drop);cont.updateMatrixWorld(true);
    // A foot on the high side of a ledge can be too CLOSE after pelvis drop.
    // Unequal thigh and shin lengths leave an inner unreachable sphere.
    // Move the pelvis the least distance that puts all goals in reach.
    const minReach=l=>Math.abs((l.legA??D.legA)-(l.legB??D.legB))*sc;
    if(r.legs.some((l,i)=>l.hip.getWorldPosition(_b).distanceTo(m.legs[i].foot)<minReach(l))){
      const limits=r.legs.map((l,i)=>{
        const hip=l.hip.getWorldPosition(V3()),goal=m.legs[i].foot;
        const horizontalSq=(hip.x-goal.x)**2+(hip.z-goal.z)**2;
        const vertical=reach=>Math.sqrt(Math.max(0,reach*reach-horizontalSq));
        return {center:goal.y-hip.y,inner:vertical(minReach(l)+.002*sc),outer:vertical((legReach(l,D)-.002)*sc)};
      });
      let shift=Infinity;
      for(const {center,inner} of limits)for(const dy of [center+inner,center-inner]){
        if(Math.abs(dy)>=Math.abs(shift))continue;
        if(limits.every(l=>Math.abs(dy-l.center)>=l.inner-1e-6&&Math.abs(dy-l.center)<=l.outer+1e-6))shift=dy;
      }
      if(Number.isFinite(shift)){p.position.y+=shift/sc;cont.updateMatrixWorld(true);}
    }
  }
  r.legs.forEach((l,i)=>{const loc=cont.worldToLocal(_b.copy(m.legs[i].foot));solveLeg(m,l,loc,pitches[i]);});
  // kusazuri hinge with the thighs so the skirt never cuts through a moving leg
  if(r.skirts)VC.skirtPose(r.skirts);
  m.aim.blend=damp(m.aim.blend,t<m.aim.until&&!dead?1:0,t<m.aim.until?9:2.5,dt);
  let ay=0,el=0;
  if(m.aim.blend>.01||fs>.01){const sp=r.spine.getWorldPosition(_c);const dx=m.aim.point.x-sp.x,dz=m.aim.point.z-sp.z,dy=m.aim.point.y-(sp.y+1.4*sc);const hz=Math.hypot(dx,dz)||1;
    ay=clamp(wrapA(Math.atan2(dx,dz)-m.yaw)+Math.asin(Math.min(.45,D.shX*.9*sc/hz)),-.9,.9);el=Math.atan2(dy,hz);}
  m.recoil*=Math.exp(-dt*7);const R0=m.recoil;
  // Authored carry (dims.carry): ready poses chosen by what the left hand holds, blended smoothly.
  const C=D.carry,hold=carryWeights(m,I,C,dt,dead,canSupport),b=m.aim.blend;
  // In the firing stance the hand takes the barrel once the rifle is up, and lets go before the rifle comes down.
  const stance=smooth(clamp(m.fireStep??0,0,1)),grab=I.moving||!D.carry?.fire?1:smooth(clamp((stance-.5)/.5,0,1));
  const sup=canSupport?hold.support*(1-b*.35*(1-stance))*grab*(1-brace):0;
  r.spine.rotation.set(S.pitch.x*.18+w*.08+brace*.14-R0*.06+(pd?.55:.3)*dE+(C&&!dead?C.lean:0),
    ay*Math.max(b,fs)+(C&&!dead?(C.swagger*w*Math.sin(2*PI*g)+C.supportYaw*sup*(1-fs)-(F?F.chest*fs:0)):0),-p.rotation.z*1.3);
  // Behemoth's crew cabin is inset into the imported chest, rather than a swivel head.
  if(m.build.mods.core===5)r.neck.rotation.set(0,0,0);
  else r.neck.rotation.set(-el*.35*b+(pd?.45*dE:0)+(C&&!dead?C.chin:0),Math.sin(t*.45+m.seed)*.18*(1-b)*(dead?0:1),0);
  if(guardWeight>.001){
    for(const [joint,angles] of [[r.spine,guard.spine],[r.neck,guard.neck]]){
      joint.rotation.set(lerp(joint.rotation.x,angles[0],guardWeight),lerp(joint.rotation.y,angles[1],guardWeight),lerp(joint.rotation.z,angles[2],guardWeight));
    }
  }
  if(!dead&&!I.reducedMotion)r.spine.rotation.z+=S.roll.x;
  const aR=r.arms.R;
  let carrySh=-.28+w*.12*Math.sin(2*PI*g+PI),carryEl=-.62,carryZ=-.07;
  if(C){
    // Gun raised beside the shoulder, elbow bent, muzzle up; or held across the chest for a two-hand grip.
    const up=hold.gunUp,cross=hold.support,rest=1-up-cross,bob=w*.05*Math.sin(4*PI*g);
    carrySh=carrySh*rest+(C.gunUp[0]+bob)*up+(C.cross[0]+bob)*cross;
    carryEl=carryEl*rest+C.gunUp[1]*up+C.cross[1]*cross;
    carryZ=carryZ*rest+C.gunUp[2]*up+C.cross[2]*cross;
  }
  const tot=-PI/2-el,sh0=-.5-.55*el,el0=tot-sh0;
  const armAim=I.aimFromArm===false?0:b,armRecoil=I.aimFromArm===false?0:R0;
  if(I.armDead||dead){aR.sh.rotation.set(lerp(-.28,.16,dead?dE:1)+(dead?0:Math.sin(t*3+m.seed)*.03),0,-.2);aR.el.rotation.x=dead?lerp(-.62,-.1,dE):-.12;}
  else{aR.sh.rotation.set(lerp(carrySh,sh0,armAim)+armRecoil*.38+S.arm.x*.06,0,lerp(carryZ,-.07,armAim));aR.el.rotation.x=Math.min(0,lerp(carryEl,el0,armAim)-armRecoil*.55);}
  // Rifles sit 0.11 rad off the forearm; chassis with authored carry poses cancel it so the barrel meets the target.
  aR.wr.rotation.set(-armRecoil*.1-(C&&!dead?.1103*armAim:0),0,0);
  // Shouldered rifle in the firing stance: forearm on the line of fire, grip in front of the chest, exact aim.
  if(F&&fs>.001&&!I.armDead&&!dead)shoulderRifle(m,aR,fs,R0,F);
  const aL=r.arms.L;
  // Brace compresses every hull; raising the left forearm is a shield action.
  const shieldBrace=!dead&&!I.leftDead&&!I.moving&&!I.airborne&&(m.offhand==='shield'||m.shield&&!I.shieldDead)?brace:0;
  aL.sh.rotation.set(lerp(-.2+w*.14*Math.sin(2*PI*g),-1.2,shieldBrace)+S.arm.x*.12+(dead?.3*dE:0),0,lerp(.14,-.28,shieldBrace));aL.el.rotation.x=lerp(-.75,-1.35,shieldBrace)*(dead?1-dE*.7:1);aL.wr.rotation.set(0,0,0);
  if(C&&!dead){
    // Blade arm braced forward, edge toward the enemy (blade pitch = forearm pitch + 90deg - wrist).
    const f=m.offhand==='blade'&&!I.leftDead?hold.bladeForward*(1-brace):0,[sx,sz,ex,wx]=C.bladeForward;
    aL.sh.rotation.x=lerp(aL.sh.rotation.x,sx,f);aL.sh.rotation.z=lerp(aL.sh.rotation.z,sz,f);
    aL.el.rotation.x=lerp(aL.el.rotation.x,ex,f);aL.wr.rotation.x=lerp(0,wx,f);
  }
  if(guardWeight>.001){
    if(guard.left){
      blendReadyArm(aL,guard.left,guardWeight);
      // Expansion blades mount along the forearm. Match the grip angle of the authored hand-held guard.
      if(I.readyMeleeMountPitch)aL.wr.rotateX(-I.readyMeleeMountPitch*guardWeight);
    }
    if(guard.right)blendReadyArm(aR,guard.right,guardWeight);
    if(guard.gun){
      const {aim,grip}=guard.gun;
      const point=m.body.localToWorld(V3(aim[0],D.py+aim[1],aim[2]));
      shoulderRifle(m,aR,guardWeight,R0,{grip:grip(D)},point);
    }
  }
  // Solve contact once, after the right arm has blended both carry poses.
  const gripWeight=guard?.support?lerp(sup,1,guardWeight):sup;
  if(canSupport&&gripWeight>.01)supportGrip(m,aL,gripWeight);
  if(m.melee&&!dead){const K=meleeKeys(m.melee.age,m.melee.thrust,D.melee);
    if(K){const wv=K.w*(1-guardWeight),right=m.melee.side==='R',active=right?aR:aL,other=right?aL:aR,sign=right?1:-1;
      active.sh.rotation.x=lerp(active.sh.rotation.x,K.sx,wv);active.sh.rotation.z=lerp(active.sh.rotation.z,sign*K.sz,wv);active.el.rotation.x=lerp(active.el.rotation.x,K.el,wv);active.wr.rotation.x=lerp(0,K.wr,wv);
      r.spine.rotation.y+=sign*K.yaw*wv;r.spine.rotation.x+=K.lean*wv;other.sh.rotation.x=lerp(other.sh.rotation.x,D.melee?.offArm??-.7,wv*.5);}
    else m.melee=null;}
  if(m.shield)m.shield.visible=!I.shieldDead;
  for(const a of [aL,aR]){a.paul.rotation.x=a.sh.rotation.x*.28;a.paul.rotation.z=a.sh.rotation.z*.4;}
  // A shouldered rifle lifts the gun-side pauldron clear of the stock (dims.carry.fire.padLift).
  if(F&&fs>0){aR.paul.rotation.x-=(F.padLift||0)*fs;aR.paul.rotation.z+=(F.padRoll||0)*fs;}
  if(guard?.padDrop)m.readyPadRest??={L:aL.paul.position.clone(),R:aR.paul.position.clone()};
  if(m.readyPadRest){
    for(const [side,arm] of Object.entries(r.arms)){
      const sign=side==='L'?1:-1;
      arm.paul.position.copy(m.readyPadRest[side]);
      if(!guard?.padDrop||guardWeight<=.001)continue;
      arm.paul.position.x+=sign*D.up*.04*guardWeight;
      arm.paul.position.y-=D.up*guard.padDrop*guardWeight;
      arm.paul.rotation.x=lerp(arm.paul.rotation.x,arm.sh.rotation.x*.13+(side==='L'?(guard.leftPadTilt??0):0),guardWeight);
      arm.paul.rotation.z=lerp(arm.paul.rotation.z,-sign*(side==='L'&&guard.shieldTurn?.03:.12),guardWeight);
    }
  }
  m.readyShieldTurn=guard?.shieldTurn?(wrapA(m.yaw-I.face)+guard.shieldTurn)*guardWeight:0;

  if(!dead)for(const sp of r.spinners)sp.rotation.y+=dt*1.1;
  // cockpit lights: flicker after pilot hits or when the pilot is badly hurt, dark when down
  m.flicker=Math.max(0,m.flicker-dt*1.5);
  const vm=m.build.visorMat,base=3;
  if(dead)vm.emissiveIntensity=damp(vm.emissiveIntensity,0,6,dt);
  else{let k=1;if(m.flicker>0&&Math.random()<.35)k=.15;else if(I.pilotRatio!==undefined&&I.pilotRatio<.5&&Math.random()<.06)k=.2;vm.emissiveIntensity=base*k;}
  const special=poseBehemothMortar(m,I.mortarAge);let artillery=special||I.artillery;
  if(I.groundAt&&artillery){
    if(Math.abs(wrapA(I.face-m.yaw))>.15){m.artilleryDeferred=true;m.artilleryCatchup=0;artillery=null;}
    else if(m.artilleryDeferred){m.artilleryCatchup=Math.min(1,(m.artilleryCatchup||0)+dt/.35);artillery=artillery.map(v=>v*smooth(m.artilleryCatchup));}
  }else if(!artillery){m.artilleryDeferred=false;m.artilleryCatchup=0;}
  if(D.quad&&I.alive&&!I.moving&&!I.legsDead&&artillery?.some(Boolean)){
    m.artilleryBrace=Boolean(artillery?.some(Boolean));
    poseBehemothBrace(m,artillery,I);
  }else{
    cont.updateMatrixWorld(true);
    for(const [a,bb] of r.pistons){bb.getWorldPosition(_a);a.lookAt(_a);a.getWorldPosition(_a);bb.lookAt(_a);}
  }
}

const pixels=320, ground=.84, worldSpan=11.2;
const parts=['body','pilot','right','left','legs'];
const cream=0xc6bd9f;
const colors=[
 {p:cream,s:0x454836,a:0xbf602a},{p:cream,s:0x5c5446,a:0xcf702a},{p:cream,s:0x323c43,a:0xd6a030},
 null,null,{p:cream,s:0x45422f,a:0xc8662a}
];
function palette(model,team,paint,trim){
 const base=team==='enemy'?null:colors[model];
 if(!paint&&!trim)return base;
 const color={...base};
 if(paint)color.p=parseInt(paint.slice(1),16);
 for(const part of ['s','a'])if(trim?.[part])color[part]=parseInt(trim[part].slice(1),16);
 return color;
}
function buildRig(model,team,paint,tag,upgrade,trim,modules){
 return makeMech(model,team,upgrade,tag,palette(modules?.core??model,team,paint,trim),modules);
}
function mountPoints(m){
 const r=m.rig;
 if(!m.mountPoints){
  const axis=socket=>{
   const point=new T.Object3D();point.position.set(0,-1,0);socket.add(point);return point;
  };
  m.mountPoints={gripR:r.arms.R.so,axisR:axis(r.arms.R.so),gripL:r.arms.L.so,axisL:axis(r.arms.L.so)};
 }
 return m.mountPoints;
}
window.IronVowFoundryRig={V3,pixels,ground,worldSpan,parts,buildRig,createMech,animateMech,lungeK,MEL,MORTAR,behemothBrace,setPartState,wreckMech,mountPoints};
})();
