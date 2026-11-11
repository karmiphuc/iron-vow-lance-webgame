// Live Foundry rig motion: planted feet, leg IK, Behemoth's artillery kneel and Oni's duelist cut.
// Runs the shipped rig code under Node with a stub 2D canvas; no QA packages are required.
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');

const dist=join(__dirname,'../dist');
function context2d(width,height){
 const noop=()=>{},gradient={addColorStop:noop};
 const pixels=(w,h,fill)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4).fill(fill)});
 return new Proxy({canvas:{width,height},createImageData:(w,h)=>pixels(w,h,0),getImageData:(x,y,w,h)=>pixels(w,h,255),
  createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,measureText:()=>({width:10})},
  {get:(target,key)=>key in target?target[key]:noop,set:(target,key,value)=>(target[key]=value,true)});
}
// Each check runs in its own process, so the browser globals the rig expects can live on the Node global.
const sandbox=globalThis;
sandbox.window=sandbox;sandbox.self=sandbox;
sandbox.document={createElement:()=>{const c={width:1,height:1,style:{}};c.getContext=()=>context2d(c.width,c.height);return c;},
 createElementNS:()=>sandbox.document.createElement()};
for(const file of ['rig-bench/vendor/three.min.js','rig-bench/vendor/GLTFLoader.js','foundry/production-arsenal.js',
 'foundry/behemoth-core.js','foundry/chassis.js','foundry/rig-motion.js'])
 vm.runInThisContext(readFileSync(file==='foundry/rig-motion.js'&&process.env.IRON_VOW_MOTION_SOURCE?process.env.IRON_VOW_MOTION_SOURCE:file==='foundry/chassis.js'&&process.env.IRON_VOW_CHASSIS_SOURCE?process.env.IRON_VOW_CHASSIS_SOURCE:join(dist,file),'utf8'),{filename:file});
const T=sandbox.THREE,R=sandbox.IronVowFoundryRig,V3=R.V3,dt=1/60;
const NAMES=['Aegis','Shrike','Bastion','Valkyrie','Oni','Behemoth'];


const results=[];
for(let model=0;model<6;model++)for(const terrain of [false,true]){
 const m=R.buildRig(model,'ally');m.scale=.9;m.cont.scale.setScalar(.9);
 const groundAt=terrain?(x,z)=>2+.12*Math.sin(x*.28)+.16*Math.cos(z*.17):()=>0,previous=new Map();
 let t=0,x=0,z=0,maxGround=0,maxSlide=0,maxIK=0,maxReach=0;
 for(let i=0;i<540;i++){
  t+=1/30;let heading=0,moving=false,speed=0,px=x,pz=z;
  if(i>=40&&i<160){speed=1+7*(.5+.5*Math.sin(i*.11));z+=speed/30;pz=z;moving=true;}
  else if(i>=190&&i<250){heading=Math.PI/2;speed=4+3*Math.sin(i*.13);x+=speed/30;px=x;moving=true;}
  else if(i>=250)heading=Math.PI/2;
  if(i>=280&&i<320){px=x+2.6*R.lungeK((i-280)/30);}
  if(i>=350&&i<380){px=x+1.1*Math.sin((i-350)/30*Math.PI);}
  R.animateMech(m,{pos:V3(px,0,pz),ground:groundAt(px,pz),groundAt,face:heading,heading,moving,speed,stepLen:1.7,alive:true,brace:i>=440?1:0},1/30,t);
  m.cont.updateMatrixWorld(true);
  m.rig.legs.forEach((l,k)=>{const L=m.legs[k],ankle=l.an.getWorldPosition(V3()),hip=l.hip.getWorldPosition(V3());maxIK=Math.max(maxIK,ankle.distanceTo(L.foot));maxReach=Math.max(maxReach,hip.distanceTo(L.foot)-(m.dims.legA+m.dims.legB)*m.scale);
   if(!L.swing&&!L.settle&&!L.poseLift){maxGround=Math.max(maxGround,Math.abs(ankle.y-groundAt(ankle.x,ankle.z)-m.dims.ankleH*m.scale));const p=previous.get(k);if(p)maxSlide=Math.max(maxSlide,Math.hypot(ankle.x-p.x,ankle.z-p.z));else previous.set(k,ankle);}
   else previous.delete(k);
  });
 }
 results.push({model,terrain,maxGround,maxSlide,maxIK,maxReach});
}
console.log(JSON.stringify(results,null,2));
for(const r of results){assert.ok(r.maxGround<.15,'model '+r.model+' ankle ground '+r.maxGround);assert.ok(r.maxSlide<.3,'model '+r.model+' planted drift '+r.maxSlide);assert.ok(r.maxIK<.01,'model '+r.model+' ankle-target error '+r.maxIK);assert.ok(r.maxReach<.001,'model '+r.model+' target past reach '+r.maxReach);}
console.log('PASS all six production leg types: variable speed, corners, stop/restart, lunge/shove, brace, flat and elevated terrain');
