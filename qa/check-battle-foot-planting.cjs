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
     const delta=p.y-floor(p.x,p.z)-m.dims.ankleH*m.scale;
     min=Math.min(min,delta);max=Math.max(max,delta);
    }
   }
   result.ankleHeightRange=max-min;
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
