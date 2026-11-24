// Exercise the actual exported infantry rigs and the production hangar adapter.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dist=path.join(__dirname,'../dist');
const noop=()=>{},gradient={addColorStop:noop};
globalThis.window=globalThis;globalThis.self=globalThis;
globalThis.document={createElement:()=>{const c={width:1,height:1,style:{}};c.getContext=()=>new Proxy({canvas:c,createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4).fill(255)}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(target,key)=>key in target?target[key]:noop});return c;}};
for(const file of ['rig-bench/vendor/three.min.js','rig-bench/vendor/GLTFLoader.js','rig-bench/vendor/meshopt-decoder.js','foundry/production-arsenal.js','foundry/behemoth-core.js','foundry/chassis.js','foundry/rig-motion.js','foundry/rig-v2.js','foundry/rig-v2-infantry.js','scene/hangar-catalog.js'])vm.runInThisContext(fs.readFileSync(path.join(dist,file),'utf8'),{filename:file});
const T=THREE,R=IronVowFoundryRig,V=IronVowRigV2,V3=R.V3;
T.GLTFLoader.prototype.loadAsync=function(file){const b=fs.readFileSync(path.join(dist,file));return new Promise((ok,no)=>this.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',ok,no));};
(async()=>{
 for(const frame of [13,14]){
  const unit={id:'display-'+frame,frame,team:'ally',condition:1};
  let mech,last,steps=0,maxLift=0;
  globalThis.IronVowFoundry={draw(actor,time,pose){
   mech??=V.build(actor,'hangar');const world=pose.world;mech.scale=.9;mech.cont.scale.setScalar(.9);
   R.animateMech(mech,{pos:V3(world.x,0,world.z),ground:world.y,groundAt:world.groundAt,face:world.face,heading:world.heading,moving:false,speed:0,brace:0,alive:true,noPlant:world.noPlant,onStep:()=>steps++},last==null?1/60:time-last,time);last=time;
   mech.nativeV2.sync();maxLift=Math.max(maxLift,...mech.legs.map(l=>Math.abs(l.foot.y-mech.dims.ankleH*mech.scale)));return {m:mech};
  },releaseStageRig(){}};
  const catalog=IronVowHangarCatalog.create();await catalog.load([unit]);
  const display=catalog.create(unit);for(let i=0;i<600;i++)display.update({time:i/60,selected:i%120<60});
  console.log(`frame ${frame}: corrective steps=${steps}, maximum foot lift=${maxLift.toFixed(4)}`);
  assert.equal(steps,0,'stationary display must not take corrective steps');assert.ok(maxLift<1e-6,'stationary display feet remain on the floor');
  display.dispose();catalog.dispose();
 }
 console.log('PASS LI-01 and LI-02 bay idle feet');
})().catch(error=>{console.error(error);process.exitCode=1});
