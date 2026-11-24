// Exercise foot planting with the shipped Foundry rigs and hangar adapter.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dist=path.join(__dirname,'../dist');
const noop=()=>{},gradient={addColorStop:noop};
globalThis.createImageBitmap=async()=>({width:1,height:1});
globalThis.window=globalThis;globalThis.self=globalThis;
globalThis.document={createElement:()=>{const c={width:1,height:1,style:{}};c.getContext=()=>new Proxy({canvas:c,createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4).fill(255)}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(target,key)=>key in target?target[key]:noop});return c;}};
for(const file of ['rig-bench/vendor/three.min.js','rig-bench/vendor/GLTFLoader.js','rig-bench/vendor/meshopt-decoder.js','foundry/production-arsenal.js','foundry/behemoth-core.js','foundry/chassis.js','foundry/rig-motion.js','foundry/rig-v2.js','foundry/rig-v2-infantry.js','foundry/rig-v2-stock.js','foundry/walk-tuning.js','scene/hangar-catalog.js'])vm.runInThisContext(fs.readFileSync(path.join(dist,file),'utf8'),{filename:file});
const T=THREE,R=IronVowFoundryRig,V=IronVowRigV2,V3=R.V3;
T.GLTFLoader.prototype.loadAsync=function(file){const b=fs.readFileSync(path.join(dist,file));return new Promise((ok,no)=>this.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',ok,no));};
function checkBattleFootPlants(unit, groundAt, scenario){
 const mech=V.build(unit);
 mech.scale=.9;mech.cont.scale.setScalar(mech.scale);mech.seed=0;
 IronVowWalk.apply(mech,unit.frame);
 const ankles=mech.rig.legs.map(leg=>mech.nativeV2.source.getObjectByName('ankle'+leg.side));
 const stepCounts={walk:0,idle:0,fire:0,recovery:0,settled:0};
 let time=0,z=0,lift=0;
 const tick=(phase,frame)=>{
  const moving=phase==='walk',firing=phase==='fire';
  if(moving)z+=2.6/60;
  mech.aim.until=firing?time+.1:-1;
  if(firing&&frame%30===0)mech.recoil=.58;
  R.animateMech(mech,{
   pos:V3(0,0,z),ground:groundAt(0,z),groundAt,face:0,heading:0,moving,speed:moving?2.6:0,
   stepLen:1.7,alive:true,brace:firing?.2:0,ready:firing,readyRelease:firing?1:0,
   readyPose:unit.frame===2?'pod':undefined,onStep:()=>stepCounts[phase]++
  },1/60,time);
  mech.nativeV2.sync();time+=1/60;
  if(phase==='idle'||phase==='fire'||phase==='settled')for(const ankle of ankles){
   const point=ankle.getWorldPosition(V3());
   lift=Math.max(lift,Math.abs(point.y-groundAt(point.x,point.z)-mech.dims.ankleH*mech.scale));
  }
 };
 // The pod stance has an intentional opening step with each foot.
 for(let frame=0;frame<90;frame++)tick('recovery',frame);
 for(let frame=0;frame<360;frame++)tick('idle',frame);
 for(let frame=0;frame<180;frame++)tick('fire',frame);
 for(let frame=0;frame<90;frame++)tick('walk',frame);
 // Allow a finishing step and the new resting stance before measuring again.
 for(let frame=0;frame<90;frame++)tick('recovery',frame);
 for(let frame=0;frame<240;frame++)tick('settled',frame);
 assert.ok(stepCounts.walk>0,'Walking still produces real footfalls');
 console.log(unit.frame+' '+scenario+': '+JSON.stringify(stepCounts)+', max ankle lift='+lift.toFixed(3));
 assert.equal(stepCounts.idle+stepCounts.fire+stepCounts.settled,0,'Stationary feet must not restart corrective steps');
 assert.ok(lift<.015,'Stationary rendered ankles stay at their ground-relative height');
}

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
 const units=[13,14,1,2].map(frame=>({frame,team:'ally'}));
 assert.deepEqual(await V.load(units),[true,true,true,true]);
 const failures=[];
 for(const unit of units)for(const [scenario,floor] of [['flat',()=>0],['slope',x=>1+.24*x]]){
  try{checkBattleFootPlants(unit,floor,scenario)}catch(error){failures.push(unit.frame+' '+scenario+': '+error.message);}
 }
 assert.deepEqual(failures,[]);
})().catch(error=>{console.error(error);process.exitCode=1});
