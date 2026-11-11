/* Actual kit bones under campaign-style start, stop and right-angle travel. No WebGL or fabricated feet. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
globalThis.window=globalThis;globalThis.self=globalThis;
const noop=()=>{},gradient={addColorStop:noop};
const pixels=(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4).fill(255)});
globalThis.document={createElement(){return{width:1,height:1,getContext:()=>new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,measureText:()=>({width:10}),createImageData:pixels,getImageData:(x,y,w,h)=>pixels(w,h)},{get:(target,key)=>target[key]||noop})};}};
const dist=path.join(__dirname,'../dist');
for(const file of ['rig-bench/vendor/three.min.js','foundry/behemoth-core.js','foundry/chassis.js'])vm.runInThisContext(fs.readFileSync(path.join(dist,file),'utf8'),{filename:file});
const animator=process.env.IRON_VOW_ANIMATOR_SOURCE||path.join(dist,'foundry/rig-motion.js');vm.runInThisContext(fs.readFileSync(animator,'utf8'),{filename:animator});
const R=IronVowFoundryRig,dt=1/60,results=[];
for(let model=0;model<6;model++){
 const m=R.buildRig(model,'ally');m.scale=.9;m.cont.scale.setScalar(.9);let t=0,x=0,z=0,heading=0,worstGround=0,worstSlide=0;const planted=new Map();
 const tick=(moving,speed)=>{
  t+=dt;R.animateMech(m,{pos:R.V3(x,0,z),ground:0,groundAt:()=>0,face:heading,heading,moving,speed,stepLen:1.7,alive:true,brace:0},dt,t);m.cont.updateMatrixWorld(true);
  m.rig.legs.forEach((leg,i)=>{const L=m.legs[i],p=leg.an.getWorldPosition(R.V3()),onGround=!L.swing&&!L.settle&&!L.poseLift;
   if(onGround){worstGround=Math.max(worstGround,Math.abs(p.y-m.dims.ankleH*m.scale));const previous=planted.get(i);if(previous)worstSlide=Math.max(worstSlide,Math.hypot(p.x-previous.x,p.z-previous.z));else planted.set(i,p);}else planted.delete(i);
  });
 };
 for(let i=0;i<30;i++)tick(false,0);
 for(let segment=0;segment<6;segment++){
  heading=segment%2?Math.PI/2:0;
  for(let i=0;i<80;i++){const speed=3.4; x+=Math.sin(heading)*speed*dt;z+=Math.cos(heading)*speed*dt;tick(true,speed);}
  for(let i=0;i<40;i++)tick(false,0);
 }
 results.push({model,worstGround,worstSlide});
}
for(const result of results){assert.ok(result.worstGround<=.15,'model '+result.model+' planted ankle ground error '+result.worstGround);assert.ok(result.worstSlide<=.3,'model '+result.model+' planted ankle slide '+result.worstSlide);}
console.log('PASS start/stop/turn world-space bone regression '+JSON.stringify(results));
// A real campaign can request artillery while the quad is still turning out of its previous stance.
let artilleryGround=0,artillerySlide=0;
for(const face of [0,Math.PI/4,Math.PI,-Math.PI/2]){
 const m=R.buildRig(5,'ally');m.scale=.9;m.cont.scale.setScalar(.9);let t=0;const previous=new Map();
 const attack={start:.5,primeDuration:.6,returnAt:2.4};
 for(let i=0;i<240;i++){
  t+=dt;R.animateMech(m,{pos:R.V3(),ground:0,groundAt:()=>0,face:t<attack.start?Math.PI/2:face,heading:face,moving:false,speed:0,stepLen:1.7,alive:true,brace:0,
   artillery:t>=attack.start?R.behemothBrace(m,attack,t):null},dt,t);m.cont.updateMatrixWorld(true);
  m.rig.legs.forEach((leg,k)=>{const L=m.legs[k],p=leg.an.getWorldPosition(R.V3()),planted=!L.swing&&!L.settle&&!L.poseLift;
   if(planted){artilleryGround=Math.max(artilleryGround,Math.abs(p.y-m.dims.ankleH*m.scale));const old=previous.get(k);if(old)artillerySlide=Math.max(artillerySlide,Math.hypot(p.x-old.x,p.z-old.z));else previous.set(k,p);}else previous.delete(k);
  });
 }
}
assert.ok(artilleryGround<=.15,'Turning into artillery leaves a planted foot '+artilleryGround+' m off the floor');
assert.ok(artillerySlide<=.3,'Turning into artillery slides a planted foot '+artillerySlide+' m');
console.log('PASS artillery turn/brace/return ground='+artilleryGround+' slide='+artillerySlide);
