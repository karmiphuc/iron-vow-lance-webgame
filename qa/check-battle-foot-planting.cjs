// Exercise the production Foundry battle pose adapter and shipped rigs without a GPU.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const noop=()=>{},gradient={addColorStop:noop};
Object.assign(globalThis,{window:globalThis,self:globalThis,createImageBitmap:async()=>({width:1,height:1}),
 document:{createElement:()=>{const c={width:1,height:1,style:{}};c.getContext=()=>new Proxy({canvas:c,createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4).fill(255)}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:noop});return c;}}});
const files=[...fs.readFileSync(path.join(dist,'index.html'),'utf8').matchAll(/<script[^>]* src="([^"?]+)/g)].map(m=>m[1]).filter(f=>/^(armory-visuals|rig-bench\/vendor\/|foundry\/|scene\/weapon-fx)/.test(f));
for(const file of files){
 if(file.endsWith('scene-rigs.js')){
  THREE.PMREMGenerator=class{fromScene(){return {texture:null}} dispose(){}};
  globalThis.IronVowRenderer={get:()=>({setClearColor:noop}),subscribe:noop,fatal:error=>{throw error;}};
 }
 const source=file==='foundry/rig-motion.js'&&process.env.IRON_VOW_MOTION_SOURCE||path.join(dist,file);
 vm.runInThisContext(fs.readFileSync(source,'utf8'),{filename:file});
}
const T=THREE,V=IronVowRigV2,R=IronVowFoundryRig,S=IronVowFoundry;
const {run}=require(path.join(root,'qa/sim-harness.cjs'))();
const units=run(`FRAMES.map(({name,foundry},frame)=>({name,frame,foundry,...stockHull(frame)}))`);
units.push({name:'LION',frame:0,lionTrial:true,weapon:'rifle',melee:'cleaver'});
const hp={body:100,pilot:100,left:100,right:100,legs:100};
for(const [i,u] of units.entries())Object.assign(u,{id:'audit-'+i,team:'ally',alive:true,max:hp,hp,upgrade:0});
T.GLTFLoader.prototype.loadAsync=function(file){
 const b=fs.readFileSync(path.join(dist,file.split('?')[0]));
 return new Promise((ok,no)=>this.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',ok,no));
};
async function main(){
 const authored=units.filter(V.applies);
 if((await V.load(authored)).some(ok=>!ok))throw Error('Missing authored assets');
 await IronVowProductionArsenal.load('rig-bench/weapons.glb','rig-bench/expansion-weapons.glb','rig-bench/shields.glb','rig-bench/salt-mg.glb');
 const scope={};
 const failures=[];
 let time=0;
 for(const u of units)for(const [terrain,floor] of Object.entries({flat:()=>0,slope:(x,z)=>1+.24*x+.12*z})){
  S.clearCombat();let z=0;
  const phases={},last=[];
  function tick(name,n,{moving=false,firing=false,brace=0,face=0}={}){
   const result=phases[name]={contacts:0,lifts:0};
   let min=Infinity,max=-Infinity;
   const lowByFoot=[],highByFoot=[];
   for(let ix=0;ix<n;ix++){
    if(moving)z+=2.6/60;
    u.motion=moving?{playbackRate:1}:null;
    u.attack=null;
    time+=1/60;
    const pose={aim:firing?1:0,recoil:firing?.38*Math.exp(-(ix%30)/4):0,brace,impact:0,strikeProgress:0,primeProgress:0,phase:0,
     world:{x:0,y:floor(0,z),z,face,heading:face,aim:R.V3(12,4,z+20),groundAt:floor,speed:moving?2.6:0,onStep:()=>result.contacts++}};
    const {m}=S.draw(u,time,pose,scope,u.foundry,V.applies(u)?'rig-v2':undefined);
    m.seed=0;
    for(const [i,l] of m.rig.legs.entries()){
     const state=m.legs[i],p=l.an.getWorldPosition(R.V3());
     const airborne=Boolean(state.swing||state.settle||state.poseLift);
     if(airborne&&!last[i])result.lifts++;
     last[i]=airborne;
     let delta=p.y-floor(p.x,p.z)-m.dims.ankleH*m.scale;
     if(m.saker&&i===0){
      // The rear toes rotate back in a kneel. Measure ground clearance
      // at the sole, since the ankle hinge rises over the instep.
      const hull=m.saker.soleHull;delta=Infinity;
      for(let j=0;j<hull.length;j+=2){
       const point=l.an.localToWorld(R.V3(0,hull[j],hull[j+1]));
       delta=Math.min(delta,point.y-floor(point.x,point.z));
      }
     }
     min=Math.min(min,delta);max=Math.max(max,delta);
     lowByFoot[i]=Math.min(lowByFoot[i]??Infinity,delta);highByFoot[i]=Math.max(highByFoot[i]??-Infinity,delta);
    }
   }
   result.ankleHeightRange=u.name==='SAKER'?Math.max(...lowByFoot.map((low,i)=>highByFoot[i]-low)):max-min;
  }
  tick('opening',90);tick('idle',360);
  tick('aiming',90,{firing:true});tick('fire',240,{firing:true});
  tick('turn',120,{face:Math.PI/2});tick('braceIn',120,{brace:.7,face:Math.PI/2});tick('braced',240,{brace:.7,face:Math.PI/2});
  tick('reset',90);
  tick('walk',120,{moving:true});
  tick('recovery',100);tick('settled',240);
  for(const phase of ['idle','fire','braced','settled']){
   const {contacts,lifts,ankleHeightRange}=phases[phase];
   if(contacts||lifts||ankleHeightRange>.025)failures.push(
    `${u.name} / ${terrain} / ${phase}: ${contacts} contacts, ${lifts} lifts, ${ankleHeightRange.toFixed(3)} m ankle height range`);
  }
  if(!phases.walk.contacts)failures.push(`${u.name} / ${terrain}: walking produced zero footfalls`);
 }
 // Read the shipped joints, so a correct IK target alone cannot pass the gate.
 const sniper=units.find(u=>u.name==='NIGHTJAR');
 S.clearCombat();
 let distance=0,widest=0,plantError=0,foldHeight=0;
 const impacts=[];
 function sample(moving,aim=0,floor=()=>0){
  time+=1/60;
  if(moving)distance+=8/60;
  sniper.motion=moving?{playbackRate:1,start:0}:null;
  return S.draw(sniper,time,{aim,recoil:0,brace:aim,impact:0,strikeProgress:0,primeProgress:0,phase:0,
   world:{x:0,y:floor(0,distance),z:distance,face:0,heading:0,groundAt:floor,onStep:(m,p,i,amount)=>impacts.push({time,i,amount}),speed:moving?8:0,aim:R.V3(0,3,distance+15)}},
   scope,sniper.foundry,'rig-v2').m;
 }
 const initial=sample(false),standingHeight=initial.rig.pelvis.position.y;
 function local(m,node){return m.cont.worldToLocal(node.getWorldPosition(R.V3()));}
 function checkGuardAndGrip(m){
  const state=m.nightjar,face=local(m,state.buckler.getObjectByName('ShieldFace')),spine=local(m,m.rig.spine);
  const optic=local(m,m.rig.neck),gun=local(m,state.breech);
  assert.ok(face.z>optic.z+.42&&Math.abs(face.x-spine.x)<.52,'shield leads the hull and covers its center');
  const shieldPoint=m.cont.localToWorld(R.V3(spine.x,spine.y+.32,face.z+2));
  const ray=new THREE.Raycaster(shieldPoint,R.V3(0,0,-1).applyQuaternion(m.cont.getWorldQuaternion(new THREE.Quaternion())));
  assert.ok(ray.intersectObject(state.buckler,true).length,'a frontal ray to the torso strikes shield geometry');
  const muzzle=m.wpn.muzzle.getWorldPosition(R.V3()),direction=m.wpn.muzzle.getWorldDirection(R.V3()).negate();
  // Include the receiver width on the shield side, not only the center of the bore.
  for(const offset of [0,-.23*m.scale]){
   const origin=muzzle.clone().add(R.V3(offset,0,0).applyQuaternion(m.cont.getWorldQuaternion(new THREE.Quaternion())));
   assert.equal(new THREE.Raycaster(origin,direction,0,4*m.scale).intersectObject(state.buckler,true).length,0,'receiver clears the shield notch');
  }
  assert.ok(Math.abs(gun.x)<.78&&gun.z>optic.z+.25,'Quill drawn forward into the sight line');
  assert.ok(m.rig.arms.L.wr.getWorldPosition(R.V3()).distanceTo(state.grip.getWorldPosition(R.V3()))<.04,'left hand seats on the actual gun grip');
 }
 checkGuardAndGrip(initial);
 assert.ok(local(initial,initial.rig.arms.R.wr).y>.65,'forward claw is raised in standing guard');
 for(let frame=0;frame<240;frame++){
  const m=sample(true),toes=m.rig.legs.map(l=>l.an.getWorldPosition(R.V3()));
  for(const [i,foot] of m.legs.entries())if(!foot.swing)plantError=Math.max(plantError,toes[i].distanceTo(foot.foot));
  widest=Math.max(widest,Math.abs(toes[0].z-toes[1].z));
  foldHeight=Math.max(foldHeight,Math.min(...m.nightjar.forelegs.map(arm=>arm.an.getWorldPosition(R.V3()).y)));
 }
 assert.ok(widest>2.53*initial.scale&&foldHeight>1.86*initial.scale&&plantError<.025,'split stride, both forelimbs tucked and planted hind claw: '+[widest,foldHeight,plantError]);
 impacts.length=0;
 const stopTime=time;
 let braced,forward=-Infinity,minY=Infinity,quietZ;
 for(let frame=0;frame<90;frame++){
  braced=sample(false);
  forward=Math.max(forward,braced.rig.pelvis.position.z);
  minY=Math.min(minY,braced.rig.pelvis.position.y);
  if(frame===65)quietZ=braced.rig.pelvis.position.z;
 }
 assert.equal(impacts.length,2,'two distinct braking impacts before rest');
 assert.notEqual(impacts[0].i,impacts[1].i,'alternating catch steps');
 assert.ok(impacts[0].time-stopTime<.20&&impacts[1].time-stopTime<.43&&impacts[1].amount>impacts[0].amount,'short first catch, heavier second plant');
 assert.ok(forward-quietZ>.30&&minY<standingHeight-.21&&Math.abs(quietZ-braced.rig.pelvis.position.z)<.005,'body overruns the planted foot, compresses and settles');
 for(let frame=0;frame<160;frame++)braced=sample(false,1);
 assert.ok(braced.rig.pelvis.position.y<standingHeight-.55,'chassis settles between its contacts');
 checkGuardAndGrip(braced);
 const shieldClaw=braced.rig.arms.R.wr,plant=shieldClaw.getWorldPosition(R.V3());
 assert.ok(plant.distanceTo(braced.nightjar.forelegs[1].contact)<.025,'shield claw carries the front of the tripod');
 assert.ok(local(braced,braced.rig.arms.L.wr).y>.85,'gun hand stays clear of the ground during the shot');
 for(const [i,leg] of braced.rig.legs.entries())assert.ok(leg.an.getWorldPosition(R.V3()).distanceTo(braced.legs[i].foot)<.025,'each rear tripod claw stays planted');
 const muzzle=braced.wpn.muzzle,ray=muzzle.getWorldDirection(R.V3());
 const toTarget=R.V3(0,3,distance+15).sub(muzzle.getWorldPosition(R.V3())).normalize();
 assert.ok(ray.dot(toTarget)>.995&&Math.abs(ray.y)<.20,'muzzle is on the distant target with a shallow barrel angle');
 S.clearCombat();
 const bank=(x,z)=>.18*x+.12*(z-distance);
 for(let frame=0;frame<140;frame++)braced=sample(false,1,bank);
 const pad=braced.rig.arms.R.wr.getWorldPosition(R.V3());
 assert.ok(Math.abs(pad.y-bank(pad.x,pad.z)-braced.dims.ankleH*braced.scale)<.035,'third claw lands on sloped ground');
 // Check the Saker's actual rear shin and foot against the board in its kneel.
 S.clearCombat();
 const saker=units.find(u=>u.name==='SAKER');
 const target=R.V3(0,2,20);
 const groundAt=()=>0;
 let marksman;
 for(let i=0;i<160;i++){
  time+=1/60;
  const aim=i<24?0:1;
  marksman=S.draw(saker,time,{aim,brace:aim,recoil:0,impact:0,strikeProgress:0,primeProgress:0,phase:0,
   world:{x:0,y:0,z:0,face:0,heading:0,speed:0,aim:target,groundAt}},scope,saker.foundry,'rig-v2').m;
  for(const leg of marksman.rig.legs){
   assert.ok(leg.kn.getWorldPosition(R.V3()).y>(leg.side==='L'?.37:.49)*marksman.scale,'knee hinge clears the roof during brace entry');
  }
 }
 const leftHand=marksman.rig.arms.L.wr.getWorldPosition(R.V3());
 assert.ok(Math.abs(leftHand.y/marksman.scale-.5226)<.025,'left hand reaches the bracing patch');
 assert.equal(marksman.wpn.subsystem,'right');
 assert.equal(marksman.wpn.mount.parent,marksman.rig.arms.R.wr);
 const muzzleInReceiver=marksman.wpn.mount.worldToLocal(marksman.wpn.muzzle.getWorldPosition(R.V3()));
 assert.ok(Math.abs(muzzleInReceiver.z-2.91*1.20)<.001,'muzzle socket follows the lengthened barrel');
 const sight=target.clone().sub(marksman.wpn.muzzle.getWorldPosition(R.V3())).normalize();
 assert.ok(marksman.wpn.muzzle.getWorldDirection(R.V3()).dot(sight)>.995,'wrist rifle tracks target from kneel');
 const hinge=marksman.rig.legs[1].kn.getWorldPosition(R.V3());
 const receiver=marksman.wpn.mount.getWorldPosition(R.V3());
 const heightOverKnee=(receiver.y-hinge.y)/marksman.scale;
 assert.ok(heightOverKnee>.05&&heightOverKnee<.25,'receiver stays just above the loaded knee: '+heightOverKnee);
 const rear=marksman.rig.legs[0],kneepad=marksman.saker.kneeRest;
 const contact=()=>kneepad.localToWorld(R.V3(0,0,.438));
 const rearContact=contact(),ankleRest=rear.an.getWorldPosition(R.V3());
 assert.ok(Math.abs(rearContact.y)<.004,'left kneepad bears on the ground');
 const shin=ankleRest.clone().sub(rear.kn.getWorldPosition(R.V3())).normalize();
 assert.ok(shin.z<-.97&&Math.abs(shin.y)<.22,'left shin extends back along the ground');
 assert.ok(rear.an.getWorldDirection(R.V3()).z<-.89,'toes extend behind the ankle');
 const support=leftHand.clone(),firedAt=time;
 saker.attack={fireAt:firedAt};
 let peak=0;
 for(let frame=0;frame<45;frame++){
  time+=1/60;
  S.draw(saker,time,{aim:1,brace:1,recoil:0,impact:0,strikeProgress:0,primeProgress:0,phase:0,
   world:{x:0,y:0,z:0,face:0,heading:0,speed:0,aim:target,groundAt}},scope,saker.foundry,'rig-v2');
  const vertical=R.V3(0,1,0).applyQuaternion(marksman.rig.spine.getWorldQuaternion(new T.Quaternion()));
  assert.ok(vertical.y>.995&&marksman.rig.neck.getWorldDirection(R.V3()).z>.995,'torso upright and visor downrange throughout recoil');
  assert.ok(contact().distanceTo(rearContact)<.004&&rear.an.getWorldPosition(R.V3()).distanceTo(ankleRest)<.004,'left knee and extended instep hold through recoil');
  const ray=marksman.wpn.muzzle.getWorldDirection(R.V3());
  const line=target.clone().sub(marksman.wpn.mount.getWorldPosition(R.V3())).normalize();
  const elevation=Math.asin(ray.y)-Math.asin(line.y);
  peak=Math.max(peak,elevation);
  assert.ok(marksman.rig.arms.L.wr.getWorldPosition(R.V3()).distanceTo(support)<.015,'firing impulse keeps the free hand planted');
  if(frame===44)assert.ok(Math.abs(elevation)<.025,'barrel settles back on target');
 }
 assert.ok(peak>.52&&peak<.78,'battle aiming retains the authored recoil: '+peak);
 saker.attack=null;S.clearCombat();
 // Exercise the travel between the contact poses. Endpoint-only checks miss
 // the old left-knee flip and repeated placement steps in both directions.
 for(const hz of [30,60]){
  const contacts=[];
  const drawStance=level=>{
   time+=1/hz;
   return S.draw(saker,time,{aim:level,brace:level,recoil:0,impact:0,strikeProgress:0,primeProgress:0,phase:0,
    world:{x:0,y:0,z:0,face:0,heading:0,speed:0,aim:target,groundAt,onStep:(_,p,i)=>contacts.push(i)}},scope,saker.foundry,'rig-v2').m;
  };
  S.clearCombat();
  const standing=drawStance(0);
  const position=node=>standing.cont.worldToLocal(node.getWorldPosition(R.V3()));
  const leg=standing.rig.legs[0],gathered=position(leg.an),standingKnee=position(leg.kn);
  const pad=()=>standing.saker.kneeRest.localToWorld(R.V3(0,0,.438));
  const barrelHeight=()=>standing.wpn.muzzle.getWorldDirection(R.V3()).y;
  let kneePlant,heelAtContact;
  for(const level of [1,0]){
   contacts.length=0;
   let hip=position(standing.rig.pelvis),knee=position(leg.kn),velocity=R.V3();
   for(let j=0;j<2.2*hz;j++){
    drawStance(level);
    const nextHip=position(standing.rig.pelvis),nextKnee=position(leg.kn);
    const speed=nextKnee.clone().sub(knee).multiplyScalar(hz);
    if(level){
     const groundContact=pad(),heel=position(leg.an);
     if(!kneePlant){
      assert.ok(Math.abs(nextKnee.z-standingKnee.z)<.34,'left knee drops beneath the body');
      assert.ok(barrelHeight()>.82,'barrel stays raised until the pad lands, including during battle targeting');
      if(groundContact.y<.003){kneePlant=groundContact;heelAtContact=heel;}
     }else{
      assert.ok(groundContact.distanceTo(kneePlant)<.009,'planted kneepad stays fixed while the foot unfolds');
     }
    }
    assert.ok((nextHip.y-hip.y)*(level?-1:1)>-.001,'continuous weight transfer without a pelvis rebound');
    assert.ok((nextKnee.y-knee.y)*(level?-1:1)>-.001,'rear knee approaches and leaves the ground once');
    assert.ok(speed.distanceTo(velocity)*hz<65,'bounded rear-knee acceleration through the full arc');
    hip=nextHip;knee=nextKnee;velocity=speed;
   }
   assert.deepEqual(contacts,level?[1,0]:[0,1],'each foot takes its load once, in reverse order on the rise');
   if(level){
    const heel=position(leg.an);
    assert.ok(kneePlant&&heelAtContact.z-heel.z>.32&&heelAtContact.y-heel.y>.85,'rear heel unfolds behind the knee after touchdown');
    assert.ok(Math.abs(barrelHeight())<.2,'barrel lowers onto its firing line after touchdown');
   }
  }
  assert.ok(position(leg.an).distanceTo(gathered)<.003,'rear ankle returns to its original standing contact');
  let last=position(leg.kn);
  for(const [level,duration] of [[1,.78],[0,.28],[1,.30],[0,2]]){
   for(let j=0;j<duration*hz;j++){
    drawStance(level);
    const next=position(leg.kn);
    assert.ok(next.distanceTo(last)*hz<5,'interrupted kneel reverses without a position snap');
    last=next;
   }
  }
  assert.ok(position(leg.an).distanceTo(gathered)<.003,'interrupted transition also recovers its standing contact');
 }
 // Hover has a free-hanging pose and its own aim path, independent of the kneeling gun setup.
 S.clearCombat();
 const hoverPose=(hoverBlend,aim=0,reducedMotion=false)=>{
  time+=1/60;
  return S.draw(saker,time,{aim,brace:aim,reducedMotion,recoil:0,impact:0,strikeProgress:0,primeProgress:0,phase:0,
   world:{x:0,y:5.6*hoverBlend,z:0,hovering:hoverBlend>0,hoverBlend,hoverRising:hoverBlend>0,face:0,heading:0,speed:0,aim:target.clone().add(R.V3(0,5.6*hoverBlend,0)),groundAt}},scope,saker.foundry,'rig-v2').m;
 };
 const flying=hoverPose(1);
 assert.ok(!flying.saker.stance&&flying.wpn.muzzle.getWorldDirection(R.V3()).y<-.35,'hover carry has a lowered barrel and does not enter the kneel');
 assert.equal(flying.nativeV2.jetNozzles.length,2);
 for(const nozzle of flying.nativeV2.jetNozzles){
  const local=flying.cont.worldToLocal(nozzle.getWorldPosition(R.V3()));
  const direction=R.V3(0,1,0).applyQuaternion(nozzle.getWorldQuaternion(new T.Quaternion()));
  assert.ok(local.z<-.85&&direction.y<-.65&&direction.z<-.30,'the outlet vents rearward and down from the hull');
 }
 const left=()=>flying.rig.legs[0].an.getWorldPosition(R.V3());
 const before=left();
 for(let i=0;i<30;i++)hoverPose(1,1);
 assert.ok(before.distanceTo(left())>.06,'suspended leg drifts while the wrist moves into aim');
 assert.ok(flying.wpn.muzzle.getWorldDirection(R.V3()).y>-.23&&flying.saker.exhaust.plumes.every(plume=>plume.visible),'hover aim clears low carry while the thrusters stay lit');
 hoverPose(1,0,true);
 assert.ok(flying.saker.exhaust.plumes.every(plume=>!plume.visible),'reduced motion suppresses the pulsing exhaust');
 for(let i=0;i<60;i++)hoverPose(0);
 assert.ok(flying.saker.exhaust.plumes.every(plume=>!plume.visible)&&left().y/flying.scale<.19,'landing returns the ankle to board height and cuts the jets');
 // After descent, the free wrist takes a fixed patch while the legs give.
 const catchDepths=[];
 for(const offhand of ['free','damaged','busy']){
  saker.hp.left=offhand==='damaged'?0:saker.max.left;
  saker.melee=offhand==='busy'?'cleaver':null;
  S.clearCombat();
  const landing=hoverPose(1);
  assert.ok(landing.saker.exhaust.plumes.every(p=>p.scale.x===2&&p.scale.y>1.4&&p.scale.z===2),
   'sustained exhaust doubles in width and length');
  for(let frame=0;frame<12;frame++)hoverPose(0);
  catchDepths.push(landing.rig.pelvis.position.y);
  if(offhand==='free'){
   const wrist=landing.rig.arms.L.wr.getWorldPosition(R.V3());
   assert.ok(wrist.distanceTo(landing.saker.landingHand)<.04,'left wrist plants on its fixed touchdown patch');
   assert.ok(landing.saker.exhaust.brakes.every(p=>!p.visible));
  }else{
   assert.ok(!landing.saker.landingHand&&landing.saker.exhaust.brakes.length===2&&landing.saker.exhaust.brakes.every(p=>p.visible),
    'unavailable hand triggers front braking jets without a wrist plant');
  }
 }
 assert.ok(catchDepths[1]<catchDepths[0]-.15&&catchDepths[2]<catchDepths[0]-.15,'two-leg landings compress more deeply');
 saker.hp.left=saker.max.left;saker.melee=null;
 // A move order may arrive while the rear instep is still fully extended.
 S.clearCombat();
 let ankleRotation;
 for(let i=0;i<185;i++){
  const walking=i>=145,brace=i>=15&&!walking?1:0;
  saker.motion=walking?{playbackRate:1}:null;time+=1/60;
  const {m}=S.draw(saker,time,{aim:brace,brace,recoil:0,impact:0,strikeProgress:0,primeProgress:0,phase:0,
   world:{x:0,y:0,z:Math.max(0,i-145)*4/60,face:0,heading:0,speed:walking?4:0,aim:target,groundAt}},scope,saker.foundry,'rig-v2');
  const ankle=m.rig.legs[0].an,rotation=ankle.getWorldQuaternion(new T.Quaternion());
  if(walking){
   assert.ok(ankleRotation.angleTo(rotation)<.23,'immediate move unrolls rear foot continuously');
   for(let j=0;j<m.saker.soleHull.length;j+=2){
    const {y}=ankle.localToWorld(R.V3(0,m.saker.soleHull[j],m.saker.soleHull[j+1]));
    assert.ok(y>-.004,'unrolling instep stays above terrain');
   }
  }
  ankleRotation=rotation;
 }
 S.clearCombat();
 let doubleSupport=0,hipLow=Infinity,hipHigh=-Infinity,heelRise=0,footSpan=0;
 const landings=[];
 for(let i=0;i<180;i++){
  time+=1/60;saker.motion={playbackRate:1};
  const {m}=S.draw(saker,time,{aim:0,brace:0,recoil:0,impact:0,strikeProgress:0,primeProgress:0,phase:0,
   world:{x:0,y:0,z:i*5/60,face:0,heading:0,speed:5,aim:target,groundAt,onStep:(_,p,leg)=>landings.push(leg)}},scope,saker.foundry,'rig-v2');
  if(i<40)continue;
  const feet=m.rig.legs.map(leg=>leg.an.getWorldPosition(R.V3()));
  footSpan=Math.max(footSpan,Math.abs(feet[1].z-feet[0].z)/m.scale);
  const soles=m.rig.legs.map(leg=>{
   const toe=leg.an.localToWorld(R.V3(0,-m.dims.ankleH,.70));
   const heel=leg.an.localToWorld(R.V3(0,-m.dims.ankleH,-.41));
   if(toe.y/m.scale<.015)heelRise=Math.max(heelRise,(heel.y-toe.y)/m.scale);
   return Math.min(toe.y,heel.y)/m.scale;
  });
  assert.ok(Math.min(...soles)<.018&&Math.max(...soles)<.31,'a low passing foot clears the planted shoe');
  if(Math.max(...soles)<.018)doubleSupport++;
  hipLow=Math.min(hipLow,m.rig.pelvis.position.y);hipHigh=Math.max(hipHigh,m.rig.pelvis.position.y);
 }
 assert.ok(heelRise>.23&&footSpan>1.65,'long stride and visible toe-off: '+[heelRise,footSpan]);
 assert.ok(doubleSupport>5&&(hipHigh-hipLow)/footSpan<.15,'double support and chassis travel relative to stride: '+[doubleSupport,hipHigh-hipLow,footSpan]);
 assert.ok(landings.length>=5&&landings.every((leg,i)=>!i||leg!==landings[i-1]),'alternate heel strikes at travel speed');
 saker.motion=null;
 for(const u of units)for(const downReason of ['body','pilot']){
  S.clearCombat();
  const draw=(face,deathAge,reducedMotion=false)=>{
   time+=1/60;
   return S.draw(u,time,{
    aim:0,recoil:0,brace:0,impact:0,strikeProgress:0,primeProgress:0,phase:0,deathAge,reducedMotion,
    world:{x:0,y:0,z:0,face,heading:face,aim:R.V3(12,4,20),groundAt:()=>0,speed:0}
   },scope,u.foundry,V.applies(u)?'rig-v2':undefined).m.cont.rotation.y;
  };
  const facingDelta=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
  u.alive=true;u.motion=null;
  const lastFacing=draw(-2.6,-1);
  u.alive=false;u.downReason=downReason;
  for(let i=0;i<=120;i++){
   const facing=draw(Math.PI/2,i/60,i===1);
   if(facingDelta(facing,lastFacing)>1e-6){
    failures.push(`${u.name} / ${downReason}: collapse changed facing on frame ${i}`);
    break;
   }
  }
  S.clearCombat();
  if(facingDelta(draw(lastFacing,2),lastFacing)>1e-6)failures.push(`${u.name} / ${downReason}: rebuilt wreck changed facing`);
  u.alive=true;delete u.downReason;
 }
 assert.equal(failures.length,0,failures.join('\n'));
 console.log(`PASS ${units.length} rigs on flat and sloped ground: planted idle, sustained fire, brace, and post-walk stance with walking footfalls, and body / pilot collapse facing`);
}
main().catch(error=>{console.error(error);process.exitCode=1});
