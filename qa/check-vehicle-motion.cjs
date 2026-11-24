const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const dist=join(__dirname,'../dist');
const {run}=require('./sim-harness.cjs')();
const context=vm.createContext({console,TextDecoder,URL,VEHICLES:run('VEHICLES')});
context.window=context;
for(const file of ['rig-bench/vendor/three.min.js','rig-bench/vendor/GLTFLoader.js','scene/vehicles.js']){
 vm.runInContext(readFileSync(join(dist,file),'utf8'),context,{filename:file});
}
const {THREE:T,IronVowVehicles:vehicles,VEHICLES:spec}=context;
T.GLTFLoader.prototype.loadAsync=function(url){
 const bytes=readFileSync(join(dist,url.split('?')[0]));
 return new Promise((resolve,reject)=>this.parse(
  bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',resolve,reject));
};
async function main(){
 const kinds=['tank','helicopter'];
 vehicles.load(kinds);
 await new Promise(resolve=>setImmediate(resolve));
 for(const kind of kinds){
  assert.equal(vehicles.status(kind),'ready');
  const record=vehicles.create(kind),clone=vehicles.create(kind);
  const {object,joints,wheels,muzzle}=record;
  const point=new T.Vector3(),target=new T.Vector3(16,5,-11);
  const unit={kind,index:0,alive:true,hp:{body:100},max:{body:100}};
  const update=(t,options,reduced=false)=>vehicles.update(record,unit,t,point,0,reduced,3.4,options);
  update(0);
  if(kind==='helicopter'){
   const before=joints.rotor.rotation.y,tail=joints.tailRotor.rotation.x;
   update(.1);
   assert.notEqual(joints.rotor.rotation.y,before);
   assert.notEqual(joints.tailRotor.rotation.x,tail);
  }
  unit.motion={};point.z=4;update(.2);
  assert.equal(object.position.z,4);
  if(kind==='tank')assert.ok(wheels.length===12&&wheels.every(wheel=>wheel.rotation.x>0));
  else assert.ok(object.rotation.x>.1,'Kite leans into travel');
  unit.motion=null;
  unit.attack={start:.4,windup:.4};
  update(.4,{target});
  const from=muzzle.getWorldPosition(new T.Vector3());
  update(.6,{target});
  assert.ok(muzzle.getWorldPosition(new T.Vector3()).distanceTo(from)>.25,kind+' visibly traverses in windup');
  unit.attack.fireAt=.8;
  update(.8,{target});
  const aimError=()=>muzzle.getWorldDirection(new T.Vector3()).angleTo(target.clone().sub(muzzle.getWorldPosition(new T.Vector3())));
  assert.ok(aimError()<.0001,kind+' points the animated barrel at its target at release: '+aimError());
  const rest=joints.slide.position.z;
  update(.85,{target,recoil:.8});
  assert.ok(joints.slide.position.z<rest-.05,kind+' retracts its muzzle with the barrel');
  assert.ok(aimError()<.0001,kind+' stays on target during recoil');
  assert.ok(clone.joints.gun.rotation.x===0,'instances have independent pivots');
  update(.86,{target,recoil:.8},true);
  assert.equal(joints.slide.position.z,rest,'reduced motion omits recoil');
  assert.ok(aimError()<.0001,'reduced motion preserves readable aim');
  unit.attack=null;
  for(let frame=1;frame<=90;frame++)update(.86+frame/60);
  assert.ok(Math.abs(joints.gun.rotation.x)<.001 && Math.abs(joints.gun.rotation.y)<.001,'gun returns to neutral');
  unit.alive=false;unit.deathTime=3;
  update(3+spec[kind].wreckAt*.5);
  if(kind==='helicopter')assert.ok(object.rotation.z>.4,'Kite banks as it falls');
  update(4);
  assert.equal(object.position.y,0);
  if(kind==='helicopter'){
   const stopped=joints.rotor.rotation.y;
   update(5);
   assert.equal(joints.rotor.rotation.y,stopped,'wreck rotors stop');
  }
  vehicles.release(record);vehicles.release(clone);
 }
 vehicles.clear();
 console.log('PASS shipped Javelin and Kite rigs: movement, target alignment, muzzle recoil, recovery, reduced motion, grounded wrecks');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
