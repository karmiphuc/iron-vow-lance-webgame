const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInThisContext}=require('node:vm');
const simulate=require('./sim-harness.cjs');
const dist=join(__dirname,'..','dist');
const vendor=name=>join(dist,'rig-bench','vendor',name);
global.THREE=require(vendor('three.min.js'));
global.MeshoptDecoder=require(vendor('meshopt-decoder.js'));
global.window=global.self=global;
global.createImageBitmap=async()=>({width:1,height:1});
const {Vector2,Vector3,Quaternion,Texture,PropertyBinding}=THREE;
global.VowChassis={paint:()=>({map:new Texture(),normalMap:new Texture(),normalScale:new Vector2(1,1)})};
global.IronVowWeaponFX={get:()=>({})};
const loadScript=(path)=>runInThisContext(readFileSync(path,'utf8'),{filename:path});
loadScript(vendor('GLTFLoader.js'));
for(const name of ['production-arsenal','rig-motion','rig-v2','rig-v2-infantry'])loadScript(join(dist,'foundry',name+'.js'));
const readGlb=(file)=>Uint8Array.from(readFileSync(join(dist,'rig-bench',file))).buffer;

async function checkRig(frame,armory){
 const u={frame,team:'enemy',alive:true,hp:{right:100}};
 assert.equal(await IronVowRigV2.load([u],'bench').then(results=>results.every(Boolean)),true);
 const m=IronVowRigV2.build(u,'bench'),rig=m.nativeV2,entry={};
 const bone=name=>rig.source.getObjectByName(PropertyBinding.sanitizeNodeName(name));
 const world=node=>node.getWorldPosition(new Vector3());
 const wrist=m.rig.arms.R.wr;
 const digits=['Index','Middle','Ring','Little','Thumb'];
 const hands=Object.fromEntries(['L','R'].map(side=>[side,digits.map(digit=>[1,2,3].map(index=>bone(`${digit}.0${index}.${side}`)))]));
 for(const [side,fingers] of Object.entries(hands))for(const [first,second,third] of fingers){
  assert.equal(first.parent,bone('wrist.'+side));
  assert.equal(second.parent,first);
  assert.equal(third.parent,second);
  for(const joint of [first,second,third]){
   const hinge=joint.getObjectByName(PropertyBinding.sanitizeNodeName('Digit pivot '+joint.name.replace(/(\D+)(\d{2})([RL])$/,'$1.$2.$3')));
   assert.ok(hinge?.isMesh||hinge?.children.some(child=>child.isMesh),joint.name+' owns visible rigid geometry');
  }
 }
 const chains=Object.values(hands).flat();
 const rest=chains.map(chain=>chain.map(joint=>joint.quaternion.clone()));
 const lengths=chains.map(([a,b,c])=>[world(a).distanceTo(world(b)),world(b).distanceTo(world(c))]);
 for(const id of ['rifle','trident','shotgun']){
  u.weapon=id;
  assert.equal(rig.pose(entry,u,{},0,armory),true);
  const gun=entry.primary;
  rig.sync();
  assert.equal(gun.id,id);
  assert.equal(gun.mount.parent,m.rig.arms.R.so);
  assert.ok(gun.mount.visible&&!bone('WEAPON_SOCKET_R').visible);
  const relative=node=>wrist.worldToLocal(world(node));
  const origin=relative(gun.mount);
  const forward=gun.muzzle.getWorldDirection(new Vector3()).applyQuaternion(wrist.getWorldQuaternion(new Quaternion()).invert());
  assert.ok(forward.dot(new Vector3(0,-1,0))>.999,frame+' '+id+' barrel follows the wrist');
  const fingers=hands.R.map(chain=>relative(chain[2]));
  assert.ok(fingers.every(p=>p.distanceTo(origin)<.43),frame+' '+id+' fingertips are within the grip area');
  assert.ok(hands.R.every((chain,index)=>chain.some((joint,j)=>joint.quaternion.angleTo(rest[5+index][j])>.1)),'all five digits close');
  for(const pitch of [-.5,.28,0]){
   wrist.rotation.set(pitch,.22,.10);
   rig.sync();
   hands.R.forEach((chain,index)=>assert.ok(relative(chain[2]).distanceTo(fingers[index])<1e-5,'grip follows the wrist'));
   chains.forEach(([a,b,c],index)=>{
    assert.ok(Math.abs(world(a).distanceTo(world(b))-lengths[index][0])<1e-5,'proximal knuckle remains connected');
    assert.ok(Math.abs(world(b).distanceTo(world(c))-lengths[index][1])<1e-5,'distal knuckle remains connected');
   });
  }
  wrist.rotation.set(0,0,0);
 }
 u.hp.right=0;
 rig.pose(entry,u,{},0,armory);rig.sync();
 assert.equal(entry.primary.mount.visible,false);
 chains.forEach((chain,index)=>chain.forEach((joint,j)=>assert.ok(joint.quaternion.angleTo(rest[index][j])<.001,'fingers return to rest')));
 rig.dispose();
}

function checkLoadouts(){
 for(const contract of [0,2])for(const [seed,id] of ['rifle','trident','shotgun'].entries()){
  const options={foundry:true,random:()=>seed/4294967296,reducedMotion:true};
  const sim=simulate(options);
  sim.run(`deploy(${contract},false,[0]);closeModal();persist()`);
  assert.equal(sim.run('battle.units.find(isLineInfantry).weapon'),id);
  const restored=simulate({...options,storage:new Map(sim.storage)});
  assert.equal(restored.run('battle.units.find(isLineInfantry).weapon'),id);
  restored.run('save.sortie=captureSortie();for(const unit of save.sortie.units)delete unit.infantryWeapon;restoreSortie()');
  assert.equal(restored.run('battle.units.find(isLineInfantry).weapon'),'rifle','existing sorties keep the original rifle');
 }
}
(async()=>{
 const loaded=THREE.GLTFLoader.prototype.loadAsync;
 THREE.GLTFLoader.prototype.loadAsync=function(file){return new Promise((resolve,reject)=>this.parse(readGlb(file.split('/').slice(1).join('/')),'',resolve,reject));};
 try{
  const armory=await IronVowProductionArsenal.load(readGlb('weapons.glb'),readGlb('expansion-weapons.glb'));
  for(const frame of [13,14])await checkRig(frame,armory);
  checkLoadouts();
 }finally{THREE.GLTFLoader.prototype.loadAsync=loaded;}
 console.log('PASS LI-01 and LI-02 finger bones, production weapon mounts, arm loss and saved loadouts');
})().catch(error=>{console.error(error);process.exitCode=1;});
