/* Saker's rooftop stride and one-handed firing rest. Distances use board-world units. */
(function(root){
'use strict';
const T=root.THREE,R=root.IronVowFoundryRig,V=R.V3,up=V(0,1,0),scale=1.36,ankle=.17,handRest=.5226;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const p=clamp(x);return p*p*(3-2*p);};
const ramp=(t,a,b)=>smooth((t-a)/(b-a));
const transfer=.29,kneeTouch=.66,releaseFoot=.71;
const follow=(x,y,k,dt)=>x+(y-x)*(1-Math.exp(-k*dt));
function sole(m,input,leg,lead,lock=m.saker.aim){
 const sign=Math.sign(leg.restX);
 const p=V(leg.restX+sign*.13*lock,0,leg.restZ*(1-m.saker.run)-sign*(sign<0?1.80:.41)*lock).multiplyScalar(scale)
  .applyAxisAngle(up,m.yaw).add(m.cont.position);
 p.x+=lead*Math.sin(input.heading);p.z+=lead*Math.cos(input.heading);
 p.y=(input.groundAt?.(p.x,p.z)??input.ground??0)+ankle*scale;
 return p;
}
function startLegBlend(m){
 const {rig,saker:s}=m;
 const joints=[rig.pelvis,s.kneeRest];
 const legs=rig.legs.map(leg=>({knee:leg.kn.getWorldPosition(V()),ankle:leg.an.getWorldPosition(V()),rotation:leg.an.getWorldQuaternion(new T.Quaternion())}));
 s.handoff={elapsed:0,legs,joints:joints.map(node=>({node,position:node.position.clone(),rotation:node.quaternion.clone()}))};
}
// Blend the ankle and its orientation in world space. The foot can unroll
// continuously even when the two outgoing knee planes are far apart.
function blendInterruptedStep(m,input,dt){
 const {saker:s,cont,rig}=m,handoff=s.handoff;
 const blend=ramp(handoff.elapsed,0,.52);
 const legs=rig.legs.map((leg,i)=>{
  const from=handoff.legs[i];
  return {knee:leg.kn.getWorldPosition(V()).lerp(from.knee,1-blend),
   ankle:leg.an.getWorldPosition(V()).lerp(from.ankle,1-blend),
   rotation:leg.an.getWorldQuaternion(new T.Quaternion()).slerp(from.rotation,1-blend)};
 });
 for(const {node,position,rotation} of handoff.joints){
  node.position.lerp(position,1-blend);node.quaternion.slerp(rotation,1-blend);
 }
 for(const [i,leg] of rig.legs.entries()){
  const {ankle,knee,rotation}=legs[i];
  let clearance=0;
  for(let j=0;j<s.soleHull.length;j+=2){
   const point=V(0,s.soleHull[j],s.soleHull[j+1]).multiplyScalar(m.scale).applyQuaternion(rotation).add(ankle);
   clearance=Math.max(clearance,(input.groundAt?.(point.x,point.z)??input.ground??0)-point.y);
  }
  ankle.y+=clearance;
  const pole=cont.worldToLocal(knee).sub(cont.worldToLocal(leg.hip.getWorldPosition(V()))).normalize();
  kneeClearance(m,input,leg,ankle,pole,.438);
  R.solveWorldLeg(m,leg,ankle,m.yaw,0);
  leg.an.quaternion.copy(leg.kn.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotation));
 }
 handoff.elapsed+=dt;
 if(blend===1)s.handoff=null;
}
// A single reversible phase places the lead foot, transfers the load, then
// extends the rear instep. Reversing mid-transition retraces the same arc.
function stanceContacts(m,input,phase,dt){
 const s=m.saker;
 if(!s.stance){
  if(m.legs.some(foot=>foot.swing))startLegBlend(m);
  s.stance=m.legs.map((foot,i)=>{
   const leg=m.rig.legs[i];
   const standing=s.phase>.98?sole(m,input,leg,0,0):foot.foot.clone();
   standing.y=(input.groundAt?.(standing.x,standing.z)??input.ground??0)+ankle*scale;
   return {standing,kneeling:sole(m,input,leg,0,1),progress:0};
  });
  s.swing=null;
 }
 const progress=[ramp(phase,transfer,1),ramp(phase,0,transfer)];
 for(const [i,contact] of s.stance.entries()){
  const foot=m.legs[i],u=progress[i];
  foot.foot.copy(contact.standing).lerp(contact.kneeling,u);
  const ground=input.groundAt?.(foot.foot.x,foot.foot.z)??input.ground??0;
  const lift=Math.sin(Math.PI*u)*(i===0?.095:.135);
  foot.foot.y=ground+(ankle+lift)*scale;
  foot.swing=u>0&&u<1;
  if(!foot.swing){
   foot.planted.copy(foot.foot);
   if(contact.progress!==u&&dt>0)input.onStep?.(m,foot.foot.clone().addScaledVector(up,-ankle*scale),i,.68);
  }
  contact.progress=u;
 }
}
// Keep a full world contact while the other shoe swings. A newly requested
// brace or halt gets actual repositioning steps, including the rear knee tuck.
function contacts(m,input,dt,travel,reset){
 const s=m.saker,walking=input.alive&&input.moving&&!input.legsDead&&!input.reducedMotion;
 const homes=m.rig.legs.map(leg=>sole(m,input,leg,0));
 if(reset||input.reducedMotion){
  s.swing=null;s.stance=null;s.handoff=null;
  m.legs.forEach((foot,i)=>{foot.planted.copy(homes[i]);foot.foot.copy(homes[i]);foot.swing=false;});
  if(!walking&&!input.hovering&&input.alive&&!input.legsDead&&s.phase>0){
   s.stance=m.rig.legs.map(leg=>({standing:sole(m,input,leg,0,0),kneeling:sole(m,input,leg,0,1),progress:0}));
   stanceContacts(m,input,s.phase,0);
  }
  return;
 }
 if(!walking&&input.alive&&!input.legsDead&&(s.phase>0||s.stance)){
  stanceContacts(m,input,s.phase,dt);
  if(s.phase===0)s.stance=null;
  return;
 }
 if(s.stance){
  // A move order can arrive before the ankle has unrolled. Preserve the
  // outgoing joint transforms and let the first walking step take them up.
  if(walking&&s.phase>.01){
   startLegBlend(m);
   s.next=0;
  }
  m.legs.forEach(foot=>{foot.swing=false;foot.planted.copy(foot.foot);});
  s.stance=null;
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
function kneeClearance(m,input,leg,shoe,handoffPole=null,padHeight=.54){
 const hip=m.cont.worldToLocal(leg.hip.getWorldPosition(V()));
 const axis=m.cont.worldToLocal(shoe.clone()).sub(hip);
 const length=Math.min(leg.legA+leg.legB-.002,Math.max(.25,axis.length()));
 axis.normalize();
 const along=(leg.legA**2-leg.legB**2+length**2)/(2*length);
 const radius=Math.sqrt(Math.max(.0001,leg.legA**2-along**2));
 const pole=leg.bendPole;
 if(handoffPole)pole.copy(handoffPole);else pole.set(Math.sign(leg.restX)*.16,0,1);
 pole.addScaledVector(axis,-pole.dot(axis)).normalize();
 const knee=hip.clone().addScaledVector(axis,along).addScaledVector(pole,radius);
 const world=m.cont.localToWorld(knee.clone());
 const floor=input.groundAt?.(world.x,world.z)??input.ground??0;
 const need=knee.y+(floor-world.y)/scale+padHeight;
 if(knee.y>=need)return;
 const vertical=up.clone().addScaledVector(axis,-axis.y);
 const height=vertical.length();if(height<.001)return;
 vertical.divideScalar(height);
 const fraction=T.MathUtils.clamp((need-hip.y-axis.y*along)/(radius*height),-1,1);
 const tangent=pole.clone().addScaledVector(vertical,-pole.dot(vertical));
 if(tangent.lengthSq()<.00001)tangent.crossVectors(axis,vertical).multiplyScalar(Math.sign(leg.restX));
 pole.copy(vertical).multiplyScalar(fraction).addScaledVector(tangent.normalize(),Math.sqrt(1-fraction*fraction));
}
// The rotating rear shoe follows its actual instep profile on the terrain.
function rearRest(m,input,ankleLocal,weight){
 const {saker:s,cont}=m,leg=m.rig.legs[0];
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
 return {ankle:cont.localToWorld(anklePos),pitch};
}
// Reconstruct the gathered knee from the same pole as the ground solver.
function standingKnee(leg,hip,anklePos){
 const axis=anklePos.clone().sub(hip),length=Math.min(axis.length(),leg.legA+leg.legB-.002);
 axis.normalize();
 const along=(leg.legA**2-leg.legB**2+length**2)/(2*length);
 const pole=V(.16,0,1);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
 return hip.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,leg.legA**2-along**2)));
}
// Lower the pad beneath the gathered knee. Once it is bearing weight, the
// shin pivots on that fixed hinge and the pointed instep reaches behind it.
function moveRearLeg(m,input,stance,phase){
 const {cont,rig}=m,leg=rig.legs[0];
 const lower=ramp(phase,transfer,kneeTouch),unfold=ramp(phase,releaseFoot,1);
 const stand=cont.worldToLocal(stance.standing.clone());
 const startHip=leg.hip.position.clone().add(V(.045,1.94,.29));
 const startKnee=standingKnee(leg,startHip,stand);
 const knee=startKnee.clone();
 knee.x+=(.77-knee.x)*lower;
 knee.z+=(.71-knee.z)*lower;
 const surface=cont.localToWorld(knee.clone());
 const floor=input.groundAt?.(surface.x,surface.z)??input.ground??0;
 const contactHeight=.438+(floor-cont.position.y)/m.scale;
 const hipX=.045+.085*lower,hipZ=.29+1.41*lower;
 const startOffset=startKnee.clone().sub(startHip).setY(0);
 const sweep=V(.77-.13-leg.hip.position.x,0,.71-1.70-leg.hip.position.z).sub(startOffset);
 const span=u=>Math.sqrt(Math.max(.01,leg.legA**2-startOffset.clone().addScaledVector(sweep,u).lengthSq()));
 const upright=clamp(-startOffset.dot(sweep)/Math.max(.0001,sweep.lengthSq()));
 // As the pelvis passes over the hinge, put the extra vertical thigh span
 // into the descent so the hull continues downward through this beat.
 const remainingDrop=startKnee.y-contactHeight-(span(upright)-span(0));
 knee.y=startKnee.y-(span(Math.min(lower,upright))-span(0))-remainingDrop*lower;
 rig.pelvis.position.set(hipX,knee.y+span(lower)-leg.hip.position.y,hipZ);

 // Tuck the heel as the knee drops. Sweep the ankle on the rigid shin's
 // circle, then lay the toes out and fit the last support point to the roof.
 const pitch=.86*lower+1.88*unfold;
 const initialAngle=Math.asin(T.MathUtils.clamp((stand.y-startKnee.y)/leg.legB,-1,1));
 const footX=stand.x+(.77-stand.x)*lower;
 const radius=Math.sqrt(Math.max(.01,leg.legB**2-(footX-knee.x)**2));
 const anchor=V(footX,ankle,knee.z-radius);
 let anklePos;
 for(let j=0;j<3;j++){
  const sample=cont.localToWorld(anchor.clone());
  const ground=input.groundAt?.(sample.x,sample.z)??input.ground??0;
  anchor.y=(ground-cont.position.y)/m.scale+ankle;
  const support=cont.worldToLocal(rearRest(m,input,anchor,pitch/2.74).ankle);
  const finalAngle=Math.asin(T.MathUtils.clamp((support.y-knee.y)/radius,-1,1));
  const tucked=.73;
  const angle=Math.max(finalAngle,initialAngle+(tucked-initialAngle)*lower+(finalAngle-tucked)*unfold);
  anchor.z=knee.z-radius*Math.cos(angle);
  anklePos=V(footX,knee.y+radius*Math.sin(angle),anchor.z);
 }
 const worldAnkle=cont.localToWorld(anklePos);
 m.legs[0].foot.copy(worldAnkle);
 if(!m.legs[0].swing)m.legs[0].planted.copy(worldAnkle);
 return {ankle:worldAnkle,pitch,knee};
}
function buildExhaust(nozzles,brakes){
 const geometry=new T.CylinderGeometry(.015,.106,1,12,1,true);
 geometry.translate(0,.5,0);
 const material=new T.ShaderMaterial({
  transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
  vertexShader:`varying vec2 jetUV;
   void main(){jetUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`varying vec2 jetUV;
   void main(){
    float fade=pow(1.0-jetUV.y,1.45);
    vec3 color=mix(vec3(0.13,0.44,1.0),vec3(0.78,0.96,1.0),fade);
    gl_FragColor=vec4(color,fade*.81);
   }`
 });
 const makePlume=nozzle=>{
  const plume=new T.Mesh(geometry,material);
  plume.visible=false;nozzle.add(plume);return plume;
 };
 return {plumes:nozzles.map(makePlume),brakes:brakes.map(makePlume),dispose(){geometry.dispose();material.dispose();}};
}
function animate(m,input,dt,t){
 const s=m.saker,{rig,cont}=m,alive=input.alive,old=cont.position.clone();
 const airborne=Boolean(input.airborne);
 if(airborne||input.hovering){const floor=input.ground;input={...input,groundAt:()=>floor};}
 const hover=alive?clamp(input.hoverBlend??0):0;
 const float=ramp(hover,.04,.90), drift=input.reducedMotion?0:float;
 const tuck=airborne?Math.sin(Math.PI*clamp(input.airborneProgress??0)):0;
 const ageOfHover=input.hoverAge??100;
 const activeMotion=alive&&!input.reducedMotion;
 const preload=activeMotion&&input.hoverRising?ramp(ageOfHover,0,.13)*(1-ramp(ageOfHover,.155,.31)):0;
 const ignition=activeMotion&&input.hoverRising?ramp(ageOfHover,.105,.19)*(1-ramp(ageOfHover,.24,.55)):0;
 if(s.hovering&&!input.hovering){
  s.touchdown=t;
  s.landingHand=null;
 }
 s.hovering=input.hovering;
 const handFree=!input.leftDead&&m.offhand==='free';
 const elapsed=t-(s.touchdown??-100);
 const touchdown=activeMotion&&!input.moving&&!input.legsDead?ramp(elapsed,0,.12)*(1-ramp(elapsed,.27,.68)):0;
 const handCatch=handFree?touchdown:0;
 if(!handFree)s.landingHand=null;
 const brake=activeMotion&&!handFree&&!input.hoverRising?
  (input.hovering?ramp(ageOfHover,.28,.47):1-ramp(elapsed,.04,.30)):0;
 const thrust=activeMotion?Math.max(tuck,ignition,Math.sqrt(hover)):0;
 for(const [i,plume] of s.exhaust.plumes.entries()){
  plume.visible=thrust>.08;
  plume.scale.set(2,2*(.87+.12*Math.sin(t*44+i*2)+ignition*.94)*thrust,2);
 }
 for(const [i,plume] of s.exhaust.brakes.entries()){
  plume.visible=brake>.04;
  plume.scale.set(1.7,brake*(1.34+.12*Math.sin(t*34+i*2)),1.7);
 }
 const lifted=airborne||input.hovering,landed=s.lifted&&!lifted;
 s.lifted=lifted;
 cont.position.set(input.pos.x,input.ground??0,input.pos.z);
 const travel=old.setY(0).distanceTo(cont.position.clone().setY(0));
 const reset=!m.init||travel>5||lifted||landed,heading=input.moving?input.heading:input.face;
 const turn=Math.atan2(Math.sin(heading-m.yaw),Math.cos(heading-m.yaw));
 if(reset)m.yaw=heading;else if(alive)m.yaw+=turn*(1-Math.exp(-dt*12));cont.rotation.set(0,m.yaw,0);
 if(!input.moving||s.handoff)cont.updateWorldMatrix(true,false);
 if(Number.isFinite(input.attack?.fireAt))s.lastFire=input.attack.fireAt;
 const age=t-(s.lastFire??Infinity);
 const hold=1-ramp(age,.27,.7);
 const shotHold=age>=0?1-ramp(age,.80,1.06):0;
 const ready=alive&&input.armed?Math.max(input.brace||0,input.attacking?(Number.isFinite(input.attack?.fireAt)?hold:1):0,shotHold,(input.readyRelease||0)*hold,input.targeting?.86:0):0;
 // Limit travel through the stance even if gameplay requests full aim in a
 // single tick. Acceleration is continuous when a request reverses partway.
 const target=input.moving||lifted||touchdown?0:clamp(ready);
 const velocity=T.MathUtils.clamp((target-s.phase)*10,-.73,.77);
 s.phaseSpeed=follow(s.phaseSpeed,velocity,18,dt);
 s.phase=clamp(s.phase+s.phaseSpeed*dt);
 if(input.reducedMotion||airborne||Math.abs(target-s.phase)<.0005&&Math.abs(s.phaseSpeed)<.015){
  s.phase=target;s.phaseSpeed=0;
 }
 s.aim=smooth(s.phase);
 const airAim=alive&&input.armed?Math.max(input.attacking?(Number.isFinite(input.attack?.fireAt)?hold:1):0,input.targeting?.92:0,(input.readyRelease||0)*hold,shotHold):0;
 s.airAim=input.reducedMotion?airAim:follow(s.airAim,airAim,12,dt);
 const airborneAim=lifted?ramp(s.airAim,.07,.94):0;
 s.gunLower=ramp(s.phase,releaseFoot,1)*(1-float)+airborneAim*float;
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
 const h=2.24-1.00*lock-.49*preload-touchdown*(handFree?.76:1.00)+.046*drift*Math.sin(t*4.2)-.22*run-.045*plant*run-.030*kick-.24*catchLoad-.64*down-(input.legsDead?.35:0);
 rig.pelvis.position.set(.065*support+.13*lock+s.evadeSign*.36*lift+.15*handCatch,h,.22*run+.19*lock+.12*touchdown);
 rig.pelvis.rotation.set(.085*run*(1-lock)+.06*float+.10*touchdown,0,-.027*support-.10*handCatch+.40*down+.025*drift*Math.sin(t*3.1));
 rig.pelvis.position.y=R.supportHeight(m,input,h)+lift*.48;
 const contact=s.stance?.[0],enter=ramp(s.phase,0,transfer);
 const deployed=ramp(s.phase,transfer,1)*(1-lift)*(alive&&!input.legsDead?1:0);
 let rest=null;
 if(contact&&!lift){
  if(s.phase>transfer)rest=moveRearLeg(m,input,contact,s.phase);
  else rig.pelvis.position.set(.045*enter,2.24-.30*enter,.29*enter);
 }
 // The collar and visor face the firing lane. Recoil travels through the
 // wrist, arm and shoulder carriage while the kneeling base bears the load.
 rig.spine.position.set(0,.22+.16*lock,-.13*rise);
 rig.neck.position.set(0,.81+.16*lock,.84+.06*lock);
 rig.spine.rotation.set((.15+.33*run+.012*Math.sin(t*2.7))*(1-lock)-.027*rise+.16*hit+.58*down+.46*handCatch+.22*(touchdown-handCatch)+.14*preload,
   .060*stride-.035*rise,-.034*support+.23*hit+.48*down-.31*handCatch,'YXZ');
 rig.neck.rotation.set((-.16-.19*run)*(1-lock)+.027*rise,(1-lock)*.16*Math.sin(t*.8)+.035*rise,0);
 rig.legs.forEach((leg,i)=>{
  const shoe=m.legs[i].foot.clone();
  shoe.y+=tuck*scale*(i===0?.30:.48);
  shoe.y+=lift*(i===0?.90:.52);
  shoe.z+=Math.cos(m.yaw)*lift*(i===0?-.56:.40);shoe.x+=Math.sin(m.yaw)*lift*(i===0?-.56:.40);
  const swinging=s.swing?.i===i;
  const passing=swinging?(s.swing.walking?.14:.07)*Math.sin(2*Math.PI*ramp(p,.09,.89)):0;
  // A loaded rear foot rolls over its toe. Keep that toe at its board
  // contact as the heel rises, then unwind the ankle on the passing step.
  const relativeZ=(i===0?back:front).z-rig.pelvis.position.z;
  const roll=.36*ramp(-relativeZ,.13,.71)*run;
  let pitch=roll+passing;
  const phase=t*3.2+i*2.15;
  const toe=.70,heel=.41;
  const pivot=pitch>=0?toe:-heel;
  const rise=pivot*Math.sin(pitch)-ankle*(1-Math.cos(pitch));
  const advance=pivot*(1-Math.cos(pitch))+ankle*Math.sin(pitch);
  shoe.y+=rise*scale;
  shoe.x+=Math.sin(m.yaw+leg.toe)*advance*scale;
  shoe.z+=Math.cos(m.yaw+leg.toe)*advance*scale;
  if(float){
   const hanging=V(leg.restX*.86,.11+(i===0?.23:.48)+.11*drift*Math.sin(phase),i===0?-.46:.18);
   hanging.z+=.14*drift*Math.cos(phase);
   shoe.lerp(cont.localToWorld(hanging),float);
   pitch+=(.60+.088*drift*Math.sin(phase+.5)-pitch)*float;
  }
  if(i===0&&rest){shoe.copy(rest.ankle);pitch=rest.pitch;}
  if(i===0&&rest){
   const hip=cont.worldToLocal(leg.hip.getWorldPosition(V()));
   leg.bendPole.copy(rest.knee).sub(hip).normalize();
  }else kneeClearance(m,input,leg,shoe);
  R.solveWorldLeg(m,leg,shoe,m.yaw+leg.toe*(i===0?1-deployed:1),pitch);
 });
 const shoeRest=s.kneeRest;
 shoeRest.position.set(0,0,0);shoeRest.quaternion.identity();
 if(rest){
  const level=cont.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromAxisAngle(V(1,0,0),Math.PI/2));
  shoeRest.quaternion.slerp(shoeRest.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(level),ramp(s.phase,transfer,kneeTouch));
  // The sprung pad takes up contact as the shin rolls onto it.
  shoeRest.updateWorldMatrix(true,false);
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
 if(s.handoff)blendInterruptedStep(m,input,dt);
 for(const [side,sign] of [['L',1],['R',-1]]){
  const mantle=s.mantles[side];mantle.rotation.set(-.09-.12*lock+sign*.047*stride+.12*rise,sign*.045,-sign*.06);
 }
 // Solve the receiver from the loaded forward knee. The shoulder and elbow
 // carry it up together, maintaining the firing line over the crouched leg.
 const knee=cont.worldToLocal(rig.legs[1].kn.getWorldPosition(V()));
 const carry=V(-1.44,1.49+.10*stride,.29-.25*stride+1.41*ramp(s.phase,transfer,kneeTouch));
 carry.lerp(V(-1.47,1.39,.69),float);
 const readyHand=V(-1.34,knee.y+.14+.19*rise,3.27-.42*rise).lerp(V(-1.39,1.78+.19*rise,1.60-.32*rise),float);
 const grip=cont.localToWorld(carry.lerp(readyHand,s.gunLower));
 R.solveWorldLeg(m,s.rightLinks,grip,m.yaw,0);
 const carryPitch=-1.08+.08*stride+1.58*float;
 const pitch=carryPitch*(1-s.gunLower)+.27*down;
 const q=cont.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromEuler(new T.Euler(pitch,-.085*(1-s.gunLower),-.05*(1-s.gunLower),'YXZ')));
 s.breech.quaternion.copy(s.breech.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));
 s.slide.position.z=-.45*kick;
 const leftSwing=V(1.18+.03*run,1.50+.10*stride-.55*down,.28+stride*.80);
 leftSwing.lerp(V(1.33,1.36,.07+.09*drift*Math.sin(t*3.2)),float);
 const low=V(1.12,handRest,1.51);
 const hand=cont.localToWorld(leftSwing.lerp(low,ramp(lock,.12,.97)));
 if(handCatch){
  if(!s.landingHand){
   const patch=cont.localToWorld(V(1.26,0,1.05));
   patch.y=(input.groundAt?.(patch.x,patch.z)??input.ground??0)+handRest*scale;
   s.landingHand=patch;
  }
  hand.lerp(s.landingHand,ramp(handCatch,0,.72));
 }
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
 const gun={id:'merlin-38',mount:breech,carrier:arms.R.wr,recoil:slide,muzzle,subsystem:'right',aimPivot:()=>breech,aimLimit:()=>m.saker.gunLower};
 const {L,R:right}=arms;
 const jetNozzles=['JetNozzleL','JetNozzleR'].map(get).filter(Boolean);
 const brakes=['BrakeNozzleL','BrakeNozzleR'].map(get).filter(Boolean),exhaust=buildExhaust(jetNozzles,brakes);
 m.saker={breech,slide,exhaust,airAim:0,aim:0,gunLower:0,phase:0,phaseSpeed:0,stance:null,run:0,contactAge:1,next:1,swing:null,kneeRest:get('KneeRestL'),soleHull:get('AnkleL').userData.soleHull,dodgeAt:-100,evadeSign:1,
  mantles:{L:get('MantleL'),R:get('MantleR')},recoilPitch:0,
  rightLinks:{hip:right.sh,kn:right.el,an:right.wr,restX:-1,legA:right.el.position.length(),legB:right.wr.position.length(),bendPole:V(-.86,.58,.52)},
  leftLinks:{hip:L.sh,kn:L.el,an:L.wr,restX:1,legA:L.el.position.length(),legB:L.wr.position.length(),bendPole:V(.58,0,-1)}};
 m.nativeV2={source,worldScale:scale,animate,jetNozzles,targetingBlend:()=>m.saker.aim,
  pose(entry){entry.primary=gun;return true;},sync(){breech.rotateX(-m.saker.recoilPitch);m.cont.updateMatrixWorld(true);},
  dodge(time,incoming){m.saker.dodgeAt=time;m.saker.evadeSign=V(Math.cos(m.yaw),0,-Math.sin(m.yaw)).dot(incoming)>0?-1:1;},
  bounds(name){const node=name==='neck'?neck:legs.find(l=>name==='ankle.'+l.side)?.an;return node?new T.Box3().setFromObject(node):new T.Box3();},dispose:exhaust.dispose};
 return m;
}
root.IronVowRigV2.register(28,{id:'saker',assetPath:'rig-bench/rig-v2/saker.glb',build});
})(window);
