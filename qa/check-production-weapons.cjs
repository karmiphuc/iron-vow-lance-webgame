/* Actual GLB geometry and shipped arsenal animation, without a GPU. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
globalThis.window=globalThis;globalThis.self=globalThis;
const root=path.resolve(__dirname,'../dist');
for(const name of ['rig-bench/vendor/three.min.js','rig-bench/vendor/GLTFLoader.js','armory-visuals.js','foundry/production-arsenal.js','scene/weapon-fx.js'])vm.runInThisContext(fs.readFileSync(path.join(root,name),'utf8'),{filename:name});
const buffer=name=>{const b=fs.readFileSync(path.join(root,'rig-bench',name));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
(async()=>{
 const A=IronVowProductionArsenal,source=await A.load(buffer('weapons.glb'),buffer('expansion-weapons.glb'),buffer('shields.glb'));
 let count=0;
 for(const [id,profile] of Object.entries(IronVowWeaponFX.profiles)){
  if(!profile.asset)continue;
  const socket=new THREE.Object3D(),mounted=A.mount(source,profile.asset,socket);assert.ok(mounted,id+' physical asset exists');assert.equal(mounted.mount.parent,socket);
  socket.updateMatrixWorld(true);
  if(profile.archetype!=='blade'){
   assert.ok(mounted.muzzle,id+' has a real muzzle');const p=mounted.muzzle.getWorldPosition(new THREE.Vector3()),bounds=new THREE.Box3().setFromObject(mounted.model);
   assert.ok(bounds.distanceToPoint(p)<.3,id+' muzzle sits at the actual weapon geometry');
   if(profile.asset==='missile'||profile.asset==='cerberus'){assert.ok(mounted.muzzle2,id+' second physical emitter');assert.ok(mounted.muzzle2.getWorldPosition(new THREE.Vector3()).distanceTo(p)>.05,id+' distinct physical emitters');}
  }
  count++;
 }
 const hand=new THREE.Object3D(),piledriver=A.mount(source,'piledriver',hand);assert.ok(piledriver.spike);
 const position=()=>{hand.updateMatrixWorld(true);return piledriver.spike.getWorldPosition(new THREE.Vector3());};
 A.animate(piledriver,{strikeProgress:0});const rest=position();A.animate(piledriver,{strikeProgress:.7});assert.ok(position().distanceTo(rest)>.49,'The visible spike extends during contact');
 A.animate(piledriver,{strikeProgress:.99});assert.ok(position().distanceTo(rest)<1e-8,'The visible spike returns after contact');
 const parallax=A.mount(source,'parallax',hand);A.animate(parallax,{weaponCharge:0});const dark=parallax.chargeMaterials.map(m=>m.emissiveIntensity);A.animate(parallax,{weaponCharge:1});assert.ok(parallax.chargeMaterials.some((m,i)=>m.emissiveIntensity>dark[i]),'Actual Parallax materials charge');
 // Exercise the shipped solver against actual GLB emitters on a rotated socket hierarchy.
 globalThis.IronVowFoundryRig={V3:(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z)};
 // Preserve the pre-fix algorithm as an isolated negative control without requiring Git history at test time.
 const T=THREE,V3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
 const oldAim=(m,weapon,target,weight,node)=>{
  const wrist=node||m.rig.arms.R.wr,worldQ=new T.Quaternion(),parentQ=new T.Quaternion(),delta=new T.Quaternion();
  for(let i=0;i<3;i++){
   m.cont.updateMatrixWorld(true);
   const muzzle=weapon.muzzle.getWorldPosition(V3()),line=weapon.muzzle.getWorldDirection(V3()),desired=target.clone().sub(muzzle).normalize();
   if(line.lengthSq()<.5||desired.lengthSq()<.5)break;
   delta.setFromUnitVectors(line,desired);delta.slerp(new T.Quaternion(),1-weight);
   wrist.getWorldQuaternion(worldQ);wrist.parent.getWorldQuaternion(parentQ);
   wrist.quaternion.copy(parentQ.invert().multiply(delta.multiply(worldQ)));
  }
 };
 vm.runInThisContext(fs.readFileSync(path.join(root,'foundry/scene-rigs.js'),'utf8'),{filename:'current-scene-rigs.js'});const aim=IronVowFoundry.aimMounted;
 let aimCases=0,worstOld=0,worstNew=0;
 for(const id of ['rampart','hailstorm']){
  const cont=new THREE.Object3D(),parent=new THREE.Object3D(),wrist=new THREE.Object3D(),socket=new THREE.Object3D();
  cont.position.set(4,2,-3);cont.rotation.y=.7;cont.scale.setScalar(.9);cont.add(parent);parent.rotation.set(.2,-.4,.1);parent.add(wrist);wrist.position.set(1,1.2,.5);wrist.add(socket);
  const mounted=A.mount(source,IronVowWeaponFX.get(id).asset,socket),m={cont,rig:{arms:{R:{wr:wrist}}}};
  const rest=wrist.quaternion.clone();cont.updateMatrixWorld(true);const radius=mounted.muzzle.getWorldPosition(new THREE.Vector3()).distanceTo(wrist.getWorldPosition(new THREE.Vector3()));
  for(const direction of [[1,.2,0],[-1,.4,.2],[0,1,.2],[0,-1,.3],[.2,.2,-1],[.3,1,-.8]])for(const gap of [.1,1.5]){
   wrist.quaternion.copy(rest);cont.updateMatrixWorld(true);const target=wrist.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(...direction).normalize().multiplyScalar(radius+gap));
   const error=solver=>{wrist.quaternion.copy(rest);solver(m,mounted,target,1);cont.updateMatrixWorld(true);return mounted.muzzle.getWorldDirection(new THREE.Vector3()).angleTo(target.clone().sub(mounted.muzzle.getWorldPosition(new THREE.Vector3())));};
   const before=error(oldAim),after=error(aim);worstOld=Math.max(worstOld,before);worstNew=Math.max(worstNew,after);aimCases++;
   assert.ok(after<1e-6,id+' actual close/steep muzzle axis aligns with the target: '+after);
  }
 }
 assert.ok(worstOld>.12,'Prior iterative solver reproduces actual close/steep barrel regression');
 console.log('PASS '+aimCases+' close/steep actual GLB emitter aim cases; prior max '+worstOld+' rad, current max '+worstNew+' rad');
 console.log('PASS '+count+' physical weapon aliases and sockets, geometry-adjacent emitters, real piledriver stroke and Parallax charge');
})().catch(e=>{console.error(e);process.exitCode=1;});
