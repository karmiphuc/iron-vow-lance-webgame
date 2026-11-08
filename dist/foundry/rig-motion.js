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
function makeMech(frame,team,upgrade,tag,paint){
  const b=VC.build(frame,team,tag,paint),cont=new T.Group();cont.rotation.order='YXZ';cont.add(b.root);const r=b.rig;
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
/* 0 intact, 1 damaged (scorched paint), 2 destroyed (outer plates blown off). Returns true when the state got worse. */
function setPartState(m,part,st){const prev=m.partState[part];if(prev===st)return false;m.partState[part]=st;
  for(const e of m.build.parts[part]){const o=e.m;if(!e.np){o.userData.base=o.userData.base||o.material;o.material=st>=1?VC.damagedOf(o.userData.base):o.userData.base;}if(e.detach)o.visible=st<2;}
  return st>prev;}
function wreckMech(m){m.body.traverse(o=>{if(!o.isMesh||!o.material)return;const base=o.userData.base||o.material;if(base.userData&&base.userData.paint)o.material=VC.wreckOf(base);});m.build.visorMat.emissiveIntensity=0;m.build.stackMat.emissiveIntensity=0;}

/* ---------- mech animation ---------- */
function solveLeg(m,leg,t,pitch){VC.solveLeg(m.rig,m.dims,leg,t,pitch);}
const _a=V3(),_b=V3(),_c=V3();
/* melee timeline (s): windup 0-.38, strike .38-.5 (contact .46), hold -.72, recover -1.1 */
const MEL={wind:.38,hit:.46,strike:.5,hold:.72,end:1.1};
function meleeKeys(a){if(a<0||a>MEL.end)return null;
  const P0={sx:-.28,sz:-.07,el:-.62,wr:0,yaw:0,lean:0},P1={sx:-2.55,sz:-.55,el:-1.45,wr:-.3,yaw:-.55,lean:-.12},P2={sx:-.75,sz:.42,el:-.12,wr:.25,yaw:.62,lean:.22};
  let A,B,q;if(a<MEL.wind){A=P0;B=P1;q=smooth(a/MEL.wind);}else if(a<MEL.strike){A=P1;B=P2;q=1-Math.pow(1-(a-MEL.wind)/(MEL.strike-MEL.wind),3);}else if(a<MEL.hold){A=P2;B=P2;q=1;}else{A=P2;B=P0;q=smooth((a-MEL.hold)/(MEL.end-MEL.hold));}
  const o={w:a>MEL.hold?1-q*.999:1};for(const k in P0)o[k]=lerp(A[k],B[k],q);return o;}
function lungeK(a){if(a<0||a>MEL.end)return 0;if(a<MEL.wind)return -.15*smooth(a/MEL.wind);if(a<MEL.strike)return lerp(-.15,1,smooth((a-MEL.wind)/(MEL.strike-MEL.wind)));if(a<MEL.hold)return 1;return 1-smooth((a-MEL.hold)/(MEL.end-MEL.hold));}
function liftArc(q){return q<.42?1-Math.pow(1-q/.42,3):1-Math.pow((q-.42)/.58,3);}
const kneeContact=V3(.335,.3155,1.82),pelvisShift=.09;
const easeRange=(t,a,b)=>smooth(clamp((t-a)/(b-a),0,1));
function behemothBrace(m,attack,t){
  if(!m.dims.quad||!attack)return null;
  const q=attack.primeDuration>0?clamp((t-attack.start)/attack.primeDuration,0,1):1;
  const r=Number.isFinite(attack.returnAt)?clamp((t-attack.returnAt)/.35,0,1):0;
  return [easeRange(q,.30,1)*(1-easeRange(r,0,.85)),easeRange(q,.20,.97)*(1-easeRange(r,.22,1)),
    easeRange(q,.34,.97)*(1-easeRange(r,.04,.87))];
}
function swingDirection(from,to,weight){
  const turn=new T.Quaternion().setFromUnitVectors(from,to);
  return from.clone().applyQuaternion(new T.Quaternion().slerp(turn,weight)).normalize();
}
function poseBehemothBrace(m,artillery){
  const {body,rig:r,dims:D}=m,p=r.pelvis,A=D.legA,B=D.legB;
  const [hull,left,right]=artillery||[0,0,0];
  if(artillery){
    const kneeY=kneeContact.y-D.hipY+Math.sqrt(A*A-(D.hipX-kneeContact.x)**2-(kneeContact.z-D.hipZ-pelvisShift)**2);
    p.position.set(0,lerp(D.py,kneeY,hull),pelvisShift*hull);
    p.rotation.set(0,0,0);
  }
  body.updateWorldMatrix(true,true);
  const rootQ=body.getWorldQuaternion(new T.Quaternion());
  for(const leg of r.legs){
    const sign=Math.sign(leg.restX),front=Boolean(leg.kneeShoe),fold=front?(sign>0?left:right):0;
    const hip=body.worldToLocal(leg.hip.getWorldPosition(V3()));
    const goal=V3(leg.restX,D.ankleH,leg.restZ);
    const axis=goal.clone().sub(hip),len=clamp(axis.length(),Math.abs(A-B)+.001,A+B-.001);axis.normalize();
    const pole=V3(sign*.84,.05,front?.91:-.76);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
    const along=(A*A-B*B+len*len)/(2*len);
    let up=axis.clone().multiplyScalar(along).addScaledVector(pole,Math.sqrt(Math.max(0,A*A-along*along))).normalize();
    let down=axis.clone().multiplyScalar(len).addScaledVector(up,-A).normalize();
    if(fold>0){
      const contact=V3(sign*kneeContact.x,kneeContact.y,kneeContact.z);
      up=swingDirection(up,contact.sub(hip).normalize(),fold);
      down=swingDirection(down,V3(sign*.65,.45,-.62).normalize(),fold);
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
/* in: {pos,moving,speed,stepLen,heading,face,brace,alive,deathAge,down,pilotRatio,armDead,legsDead,shieldDead,ground,onStep,noPlant} */
function animateMech(m,I,dt,t){
  const r=m.rig,cont=m.cont,S=m.s,sc=m.scale,D=m.dims;
  if(m.artilleryBrace){
    r.pelvis.position.z=0;
    for(const leg of r.legs)leg.kneeShoe?.quaternion.identity();
    m.artilleryBrace=false;
  }
  if(!m.init){m.yaw=I.face;cont.rotation.y=m.yaw;cont.position.set(I.pos.x,I.ground||0,I.pos.z);cont.updateMatrixWorld(true);
    r.legs.forEach((l,i)=>{const h=cont.localToWorld(V3(l.restX,D.ankleH,l.restZ));m.legs[i].planted.copy(h);m.legs[i].foot.copy(h);});m.init=true;}
  cont.position.set(I.pos.x+S.kx.x,I.ground||0,I.pos.z+S.kz.x);
  const targetYaw=I.moving?I.heading:I.face;m.yaw=dampAngle(m.yaw,targetYaw,I.moving?8:4.5,dt);
  const dead=!I.alive,pd=dead&&I.down==='pilot',dA=dead?clamp(I.deathAge/(pd?1.7:1.1),0,1):0,dE=smooth(dA);
  cont.rotation.set(pd?0:-.95*dE,m.yaw,pd?.05*dE:.32*dE);
  cont.updateMatrixWorld(true);
  spr(S.comp,80,11,dt);S.comp.x=clamp(S.comp.x,-.4,.12);spr(S.pitch,55,7,dt);spr(S.arm,60,7,dt);spr(S.kx,40,9,dt);spr(S.kz,40,9,dt);
  m.gait.w=damp(m.gait.w,I.moving?1:0,I.moving?10:6,dt);const w=m.gait.w;
  if(I.moving)m.gait.phase+=dt*I.speed/(2*I.stepLen);
  const g=m.gait.phase,fwd=V3(Math.sin(m.yaw),0,Math.cos(m.yaw));
  let settling=m.legs.some(L=>L.settle);
  r.legs.forEach((l,i)=>{const L=m.legs[i];const home=cont.localToWorld(_a.set(l.restX,D.ankleH,l.restZ)).clone();let pitch=0;
    if(I.noPlant||(dead&&!pd)){L.foot.copy(home);L.planted.copy(home);L.swing=false;L.settle=null;}
    else if(I.moving&&!dead){const ph=((g+(l.phase??i*.5))%1+1)%1;L.settle=null;
      if(ph<.5){if(L.swing){L.swing=false;L.planted.copy(L.to);I.onStep&&I.onStep(m,L.planted,i);}L.foot.copy(L.planted);}
      else{if(!L.swing){L.swing=true;L.from.copy(L.planted);}const q=(ph-.5)/.5;L.to.copy(home).addScaledVector(fwd,I.stepLen*.5);L.to.y=home.y;
        L.foot.lerpVectors(L.from,L.to,smoother(q));L.foot.y+=liftArc(q)*D.lift*sc;pitch=q<.3?.45*Math.sin(PI*q/.3):q>.62?-.35*Math.sin(PI*(q-.62)/.38):0;}}
    else{if(L.swing){L.swing=false;L.planted.copy(L.foot);L.planted.y=home.y;}
      if(L.settle&&!dead){L.settle.t+=dt/.42;const q=Math.min(1,L.settle.t);L.foot.lerpVectors(L.settle.from,home,smoother(q));L.foot.y+=Math.sin(PI*q)*.45*sc;
        if(q>=1){L.planted.copy(home);L.settle=null;I.onStep&&I.onStep(m,home,i,.45);}}
      else{if(!dead&&!settling&&L.planted.distanceTo(home)>.22*sc){L.settle={from:L.planted.clone(),t:0};settling=true;}L.foot.copy(L.planted);}}
    const loc=cont.worldToLocal(_b.copy(L.foot));solveLeg(m,l,loc,pitch*w);});
  // kusazuri hinge with the thighs so the skirt never cuts through a moving leg
  if(r.skirts)VC.skirtPose(r.skirts);
  const p=r.pelvis,brace=I.brace;
  const breathe=Math.sin(t*1.3+m.seed)*.03*(1-w)*(dead?0:1);
  p.position.y=D.py+w*(.05*Math.cos(4*PI*(g-.25))-.1)+breathe+S.comp.x-brace*.34-(I.legsDead?.26:0)-(pd?D.py*.3*dE:dE*1.4);
  p.position.x=w*(D.sway??.16)*Math.sin(2*PI*g*(D.quad?2:1));p.rotation.z=w*(D.quad?.015:.05)*Math.sin(2*PI*g)+(I.legsDead?.08:0);
  m.aim.blend=damp(m.aim.blend,t<m.aim.until&&!dead?1:0,t<m.aim.until?9:2.5,dt);
  let ay=0,el=0;
  if(m.aim.blend>.01){const sp=r.spine.getWorldPosition(_c);const dx=m.aim.point.x-sp.x,dz=m.aim.point.z-sp.z,dy=m.aim.point.y-(sp.y+1.4*sc);const hz=Math.hypot(dx,dz)||1;
    ay=clamp(wrapA(Math.atan2(dx,dz)-m.yaw)+Math.asin(Math.min(.45,D.shX*.9*sc/hz)),-.9,.9);el=Math.atan2(dy,hz);}
  m.recoil*=Math.exp(-dt*7);const R0=m.recoil;
  r.spine.rotation.set(S.pitch.x*.18+w*.08+brace*.14-R0*.06+(pd?.55:.3)*dE,ay*m.aim.blend,-p.rotation.z*1.3);
  r.neck.rotation.set(-el*.35*m.aim.blend+(pd?.45*dE:0),Math.sin(t*.45+m.seed)*.18*(1-m.aim.blend)*(dead?0:1),0);
  const aR=r.arms.R,carrySh=-.28+w*.12*Math.sin(2*PI*g+PI),carryEl=-.62;
  const tot=-PI/2-el,sh0=-.5-.55*el,el0=tot-sh0,b=m.aim.blend;
  if(I.armDead||dead){aR.sh.rotation.set(lerp(-.28,.16,dead?dE:1)+(dead?0:Math.sin(t*3+m.seed)*.03),0,-.2);aR.el.rotation.x=dead?lerp(carryEl,-.1,dE):-.12;}
  else{aR.sh.rotation.set(lerp(carrySh,sh0,b)+R0*.38+S.arm.x*.06,0,-.07);aR.el.rotation.x=Math.min(0,lerp(carryEl,el0,b)-R0*.55);}
  aR.wr.rotation.x=-R0*.1;
  const aL=r.arms.L,bl=dead?0:brace;
  aL.sh.rotation.set(lerp(-.2+w*.14*Math.sin(2*PI*g),-1.2,bl)+S.arm.x*.12+(dead?.3*dE:0),0,lerp(.14,-.28,bl));aL.el.rotation.x=lerp(-.75,-1.35,bl)*(dead?1-dE*.7:1);aL.wr.rotation.x=0;
  if(m.melee&&!dead){const K=meleeKeys(m.melee.age);
    if(K){const wv=K.w;aL.sh.rotation.x=lerp(aL.sh.rotation.x,K.sx,wv);aL.sh.rotation.z=lerp(aL.sh.rotation.z,-K.sz,wv);aL.el.rotation.x=lerp(aL.el.rotation.x,K.el,wv);aL.wr.rotation.x=lerp(0,K.wr,wv);
      r.spine.rotation.y-=K.yaw*wv;r.spine.rotation.x+=K.lean*wv;aR.sh.rotation.x=lerp(aR.sh.rotation.x,-.7,wv*.5);}
    else m.melee=null;}
  if(m.shield)m.shield.visible=!I.shieldDead;
  for(const a of [aL,aR]){a.paul.rotation.x=a.sh.rotation.x*.28;a.paul.rotation.z=a.sh.rotation.z*.4;}

  if(!dead)for(const sp of r.spinners)sp.rotation.y+=dt*1.1;
  // cockpit lights: flicker after pilot hits or when the pilot is badly hurt, dark when down
  m.flicker=Math.max(0,m.flicker-dt*1.5);
  const vm=m.build.visorMat,base=3;
  if(dead)vm.emissiveIntensity=damp(vm.emissiveIntensity,0,6,dt);
  else{let k=1;if(m.flicker>0&&Math.random()<.35)k=.15;else if(I.pilotRatio!==undefined&&I.pilotRatio<.5&&Math.random()<.06)k=.2;vm.emissiveIntensity=base*k;}
  const special=poseBehemothMortar(m,I.mortarAge),artillery=special||I.artillery;
  if(D.quad&&I.alive&&!I.moving&&!I.legsDead){
    m.artilleryBrace=Boolean(artillery?.some(Boolean));
    poseBehemothBrace(m,m.artilleryBrace?artillery:null);
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
const hostile={p:0xa93036,s:0x382529,a:0xed634f};
function palette(model,team,paint,trim){
 if(team==='enemy')return hostile;
 const base=colors[model];
 if(!paint&&!trim)return base;
 const color={...base};
 if(paint)color.p=parseInt(paint.slice(1),16);
 for(const part of ['s','a'])if(trim?.[part])color[part]=parseInt(trim[part].slice(1),16);
 return color;
}
function buildRig(model,team,paint,tag,upgrade,trim){
 return makeMech(model,team,upgrade,tag,palette(model,team,paint,trim));
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
window.IronVowFoundryRig={V3,pixels,ground,worldSpan,parts,buildRig,animateMech,lungeK,MEL,MORTAR,behemothBrace,setPartState,wreckMech,mountPoints};
})();
