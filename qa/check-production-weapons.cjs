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
 console.log('PASS '+count+' physical weapon aliases and sockets, geometry-adjacent emitters, real piledriver stroke and Parallax charge');
})().catch(e=>{console.error(e);process.exitCode=1;});
