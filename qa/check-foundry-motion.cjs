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
 vm.runInThisContext(readFileSync(join(dist,file),'utf8'),{filename:file});
const T=sandbox.THREE,R=sandbox.IronVowFoundryRig,V3=R.V3,dt=1/60;
const NAMES=['Aegis','Shrike','Bastion','Valkyrie','Oni','Behemoth'];

function settle(m,input={},frames=40){let t=0;for(let i=0;i<frames;i++){t+=dt;R.animateMech(m,{pos:V3(),face:0,heading:0,alive:true,brace:0,...input},dt,t);}return t;}

// Walking: every stance frame keeps the ankle on its IK goal and the foot fixed on the ground.
function walk(model){
 const m=R.buildRig(model,'ally'),face=-.76,forward=V3(Math.sin(face),0,Math.cos(face));
 let t=settle(m,{face,heading:face}),distance=0;
 const previous=m.rig.legs.map(()=>null);
 let slide=0,stanceError=0,swingError=0,fewestDown=Infinity;
 for(let i=0;i<240;i++){
  t+=dt;distance+=2.6*dt;
  R.animateMech(m,{pos:forward.clone().multiplyScalar(distance),face,heading:face,moving:true,speed:2.6,stepLen:1.55,alive:true,brace:0},dt,t);
  m.cont.updateMatrixWorld(true);
  let down=0;
  m.rig.legs.forEach((leg,k)=>{
   const ankle=leg.an.getWorldPosition(V3()),state=m.legs[k],error=ankle.distanceTo(state.foot);
   if(state.swing){swingError=Math.max(swingError,error);previous[k]=null;return;}
   down++;stanceError=Math.max(stanceError,error);
   if(previous[k])slide=Math.max(slide,Math.hypot(ankle.x-previous[k].x,ankle.z-previous[k].z));
   previous[k]=ankle;
  });
  fewestDown=Math.min(fewestDown,down);
 }
 return {slide,stanceError,swingError,fewestDown,legs:m.rig.legs.length};
}

const gaits=NAMES.map((name,model)=>({name,...walk(model)}));
for(const g of gaits){
 // Before the ZXY hip order the solver missed its goals by up to 0.87 m.
 assert.ok(g.swingError<.1,`${g.name} swing foot IK error ${g.swingError.toFixed(3)} m`);
 assert.ok(g.stanceError<.06,`${g.name} planted foot IK error ${g.stanceError.toFixed(3)} m`);
 assert.ok(g.fewestDown>=1,`${g.name} has a frame with no foot on the ground`);
}
for(const name of ['Oni','Behemoth']){
 const g=gaits.find(entry=>entry.name===name);
 assert.ok(g.slide<.001,`${name} planted foot slides ${(g.slide*1000).toFixed(1)} mm per frame`);
 assert.ok(g.stanceError<.001,`${name} planted foot leaves its IK goal by ${g.stanceError.toFixed(3)} m`);
}
assert.equal(gaits[5].fewestDown,3,'Behemoth keeps three feet planted in its four-beat walk');

// Behemoth's artillery kneel: feet stay planted while the hull sinks, folding shins never sprawl outward or under the
// ground, and the fold ends on the authored knee-pad contact.
{
 const m=R.buildRig(5,'ally'),attack={start:0,primeDuration:.9,returnAt:Infinity};
 const t=settle(m,{noPlant:true});
 const front=m.rig.legs.filter(leg=>leg.kneeShoe);
 const rest=front.map(leg=>leg.an.getWorldPosition(V3()));
 let widest=0,lowest=Infinity,earlyDrift=0,splay=0;
 for(let i=0;i<=90;i++){
  const time=i/100,brace=R.behemothBrace(m,attack,time);
  R.animateMech(m,{pos:V3(),face:0,heading:0,alive:true,brace:0,noPlant:true,artillery:brace},dt,t);
  m.body.updateWorldMatrix(true,true);
  front.forEach((leg,k)=>{
   const ankle=leg.an.getWorldPosition(V3()),shin=ankle.clone().sub(leg.kn.getWorldPosition(V3())).normalize();
   splay=Math.max(splay,Math.sign(leg.restX)*shin.x);
   widest=Math.max(widest,Math.abs(ankle.x)-Math.abs(rest[k].x));
   lowest=Math.min(lowest,ankle.y);
   if(Math.max(...brace.slice(1))<.4)earlyDrift=Math.max(earlyDrift,ankle.distanceTo(rest[k]));
  });
 }
 // The shipped fold swung each shin about 0.7 outward, flat across the ground; tucked shins stay near 0.2.
 assert.ok(splay<.4,`Behemoth folding shin splays outward (${splay.toFixed(2)})`);
 assert.ok(widest<.05,`Behemoth folding ankle swings ${widest.toFixed(2)} m outside its stance`);
 assert.ok(lowest>m.dims.ankleH-.02,`Behemoth folding ankle sinks to ${lowest.toFixed(2)} m`);
 assert.ok(earlyDrift<.02,`Behemoth front feet leave the ground ${earlyDrift.toFixed(3)} m while the hull sinks`);
 const pads=front.map(leg=>leg.kn.getWorldPosition(V3()));
 for(const pad of pads)assert.ok(Math.abs(pad.y-.3155)<.02&&Math.abs(Math.abs(pad.x)-.335)<.02&&Math.abs(pad.z-1.82)<.02,
  `Behemoth knee pad ends at ${pad.toArray().map(v=>v.toFixed(2))}`);
}

// Oni's duelist cut: blade raised above the head at the guard, pointing forward and down through contact.
async function oniCut(){
 const A=sandbox.IronVowProductionArsenal,glb=readFileSync(join(dist,'rig-bench/weapons.glb'));
 const armory=await A.load(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength));
 const m=R.buildRig(4,'ally'),blade=A.mount(armory,'blade',m.rig.arms.L.so);
 assert.ok(blade?.tip&&blade?.base,'Raijin blade exposes its tip and base');
 const t=settle(m,{noPlant:true});
 const pose=age=>{m.melee={age,thrust:false};R.animateMech(m,{pos:V3(),face:0,heading:0,alive:true,brace:0,noPlant:true},dt,t);
  m.cont.updateMatrixWorld(true);const tip=blade.tip.getWorldPosition(V3()),base=blade.base.getWorldPosition(V3());
  return {tip,base,head:m.rig.neck.getWorldPosition(V3())};};
 const guard=pose(R.MEL.wind),contact=pose(R.MEL.hit);
 assert.ok(guard.tip.y>guard.head.y+.5,'Oni raises the blade above its head in the guard');
 assert.ok(contact.tip.z>contact.base.z+.4,'Oni cuts toward its target at contact');
 assert.ok(contact.tip.y<contact.base.y,'Oni cuts downward at contact');
 m.melee=null;
}

oniCut().then(()=>console.log('PASS Foundry gait IK and planted feet ('+gaits.map(g=>`${g.name} ${(g.slide*1000).toFixed(1)}mm`).join(', ')+
 '), Behemoth four-beat walk and planted kneel fold, Oni duelist guard and downward cut')).catch(error=>{console.error(error);process.exitCode=1;});
