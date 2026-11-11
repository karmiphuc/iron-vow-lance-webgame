// Exercise the shipped catalog with real THREE objects and counted builder/loader fixtures; no GPU required.
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join,resolve}=require('node:path');
const vm=require('node:vm');
const dist=join(__dirname,'../dist');
const threeSource=readFileSync(join(dist,'rig-bench/vendor/three.min.js'),'utf8');
const catalogPath=process.argv[2]?resolve(process.argv[2]):join(dist,'scene/hangar-catalog.js');
const catalogSource=readFileSync(catalogPath,'utf8');
const tick={time:1,dt:1/60,selected:true};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};}
async function flush(){await Promise.resolve();await Promise.resolve();}
function fixture({live=false,wardenPending=false,armoryPending=false,bastionPending=false}={}){
 const context=vm.createContext({console});context.window=context;context.self=context;
 vm.runInContext(threeSource,context,{filename:'three.min.js'});
 const T=context.THREE,counts={builds:0,animations:0,mounts:0,wardenLoads:0,armoryLoads:0,after:0},rigs=[],releases=[];
 const tracked=resource=>{resource.disposals=0;resource.addEventListener('dispose',()=>resource.disposals++);return resource;};
 const geometry=()=>tracked(new T.BoxGeometry(1,1,1)),material=()=>tracked(new T.MeshStandardMaterial());
 const sharedGeometry=geometry(),sharedMaterial=material(),weaponGeometry=geometry(),weaponMaterial=material();
 const warden=deferred(),armory=deferred();let wardenReady=!wardenPending,bastionReady=!bastionPending;
 const source=new T.Group();source.add(new T.Mesh(weaponGeometry,weaponMaterial));
 function build(){
  counts.builds++;
  const cont=new T.Group(),body=new T.Group();cont.add(body);
  const owned=material(),visor=material(),stack=material(),part=material(),merged=geometry();
  body.add(new T.Mesh(sharedGeometry,sharedMaterial));
  const ownMesh=new T.Mesh(sharedGeometry,part);body.add(ownMesh);
  const mergedMesh=new T.Mesh(merged,owned);mergedMesh.userData.foundryMerged=true;body.add(mergedMesh);
  const left=new T.Group(),right=new T.Group(),spine=new T.Group();cont.add(left,right,spine);
  const rig={cont,body,live,build:{visorMat:visor,stackMat:stack,ownedMaterials:[owned,owned],parts:{body:[{m:ownMesh},{m:ownMesh}]}},
   rig:{arms:{L:{so:left},R:{so:right}},spine},dims:{shX:1,shY:2},aim:{point:new T.Vector3()},
   test:{owned:[owned,visor,stack,...(live?[part]:[])],part,merged}};
  rigs.push(rig);return rig;
 }
 context.IronVowFoundryRig={buildRig:build,parts:['body'],setPartState(){},animateMech(){counts.animations++;}};
 context.IronVowWardenRig={load(){counts.wardenLoads++;return wardenPending?warden.promise.then(()=>{wardenReady=true}):Promise.resolve();},
  build(){return wardenReady?build():null},afterAnimate(){counts.after++;}};
 context.IronVowBastion={buildRuntime(){return bastionReady?build():null},afterAnimate(){counts.after++;}};
 context.VowChassis={releaseOwnedMaterials(materials){releases.push(new Set(materials));for(const m of materials)m.dispose();}};
 context.IronVowWeaponFX={get(id){assert.equal(typeof id,'string','weapon profiles require an actual weapon ID');return {asset:id};}};
 const weaponOwned=[];
 context.IronVowProductionArsenal={load(){counts.armoryLoads++;return armoryPending?armory.promise:Promise.resolve(source)},
  mount(scene,id,socket){if(!id)return null;counts.mounts++;const mount=new T.Group(),own=material();weaponOwned.push(own);
   // A material array deliberately repeats one clone and includes a source-owned material.
   mount.add(new T.Mesh(weaponGeometry,[weaponMaterial,own,own]));socket.add(mount);return {mount,model:mount};},
  mountShield(){return null}};
 vm.runInContext(catalogSource,context,{filename:catalogPath});
 const catalog=context.IronVowHangarCatalog.create();
 return {catalog,counts,rigs,releases,sharedGeometry,sharedMaterial,weaponGeometry,weaponMaterial,weaponOwned,source,warden,armory,
  readyBastion(){bastionReady=true}};
}
function checkReleased(f,rig){
 for(const m of rig.test.owned)assert.equal(m.disposals,1,'each owned rig material is disposed exactly once');
 assert.equal(rig.test.merged.disposals,1,'per-rig merged geometry is disposed');
 assert.equal(f.sharedGeometry.disposals,0,'cached Foundry geometry survives disposal');
 assert.equal(f.sharedMaterial.disposals,0,'cached Foundry material survives disposal');
}
async function main(){
 {
  const f=fixture();
  for(const id of [1,2,3,4,11,13,-1,'0',undefined]){
   assert.equal(f.catalog.supports(id),false);
   assert.throws(()=>f.catalog.create({id:'unsupported',frame:id}),/unsupported.*frame/i,'unsupported IDs report a clear error');
  }
  assert.equal(f.counts.builds,0,'unsupported frames never fall back to a different rig');
  assert.deepEqual([0,5,6,7,8,9,10,12].map(id=>f.catalog.supports(id)),Array(8).fill(true));
  f.catalog.dispose();assert.equal(f.catalog.create({frame:5}),null,'disposed catalogs reject new entries');
 }
 // Both resource contracts: procedural rigs own a small material list; live rigs delegate their part materials.
 for(const live of [false,true]){
  const f=fixture({live});
  for(let i=0;i<5;i++){
   const entry=f.catalog.create({id:i,frame:5,condition:1});entry.update(tick);
   const rig=f.rigs.at(-1);assert.equal(entry.object.children.length,1,'update attaches the built rig');
   const animations=f.counts.animations;
   entry.dispose();entry.dispose();entry.update(tick);
   assert.equal(entry.object.children.length,0,'dispose detaches the rig');
   assert.equal(f.counts.animations,animations,'update after disposal does not animate or rebuild');
   checkReleased(f,rig);
   if(live){assert.equal(f.releases.at(-1).has(rig.test.part),true,'live material ownership reaches the shared cleanup API');}
   else assert.equal(rig.test.part.disposals,0,'procedural material outside ownership list stays cached');
  }
  assert.equal(f.counts.builds,5,'repeated create/dispose builds once per entry');
  const remaining=f.catalog.create({frame:6});remaining.update(tick);const rig=f.rigs.at(-1);
  f.catalog.dispose();f.catalog.dispose();remaining.update(tick);checkReleased(f,rig);
  assert.equal(remaining.object.children.length,0,'catalog disposal detaches surviving entries');
 }
 {
  const f=fixture({live:true,wardenPending:true});
  const removed=f.catalog.create({frame:0}),survivor=f.catalog.create({frame:0});
  removed.update(tick);survivor.update(tick);assert.equal(f.counts.builds,0,'pending Warden has no substitute rig');
  removed.dispose();f.warden.resolve();await flush();removed.update(tick);survivor.update(tick);
  assert.equal(f.counts.wardenLoads,1,'Warden loading is shared within the catalog');
  assert.equal(removed.object.children.length,0,'asset completion cannot attach to a disposed entry');
  assert.equal(f.counts.builds,1,'only surviving Warden is built after loading');
  assert.equal(survivor.object.children.length,1);f.catalog.dispose();checkReleased(f,f.rigs[0]);
 }
 {
  const f=fixture();const armed=f.catalog.create({frame:5,weapon:'rifle'}),unarmed=f.catalog.create({frame:6});
  await flush();unarmed.update(tick);armed.update(tick);
  assert.equal(f.counts.mounts,1,'an unarmed entry remains valid after another entry loads the armory');
  f.catalog.dispose();for(const rig of f.rigs)checkReleased(f,rig);
 }
 {
  const f=fixture({bastionPending:true});const entry=f.catalog.create({frame:10});entry.update(tick);
  assert.equal(entry.object.children.length,0,'pending Bastion has no substitute rig');
  entry.dispose();f.readyBastion();entry.update(tick);
  assert.equal(f.counts.builds,0,'disposed pending Bastion cannot build later');f.catalog.dispose();
 }
 {
  const f=fixture({wardenPending:true});const entry=f.catalog.create({frame:0});entry.update(tick);f.catalog.dispose();
  f.warden.resolve();await flush();entry.update(tick);
  assert.equal(f.counts.builds,0,'catalog disposal before Warden readiness prevents later builds');
  assert.equal(entry.object.children.length,0);
 }
 {
  const f=fixture({live:true,armoryPending:true});const entry=f.catalog.create({frame:5,weapon:'rifle',melee:'cleaver'});
  entry.update(tick);assert.equal(f.counts.mounts,0,'equipment waits for the shared asset');
  f.armory.resolve(f.source);await flush();entry.update(tick);entry.update(tick);
  assert.equal(f.counts.mounts,2,'ready equipment mounts once per requested weapon');
  entry.dispose();entry.dispose();f.catalog.dispose();checkReleased(f,f.rigs[0]);
  for(const m of f.weaponOwned)assert.equal(m.disposals,1,'instance weapon material arrays are deduplicated and released');
  assert.equal(f.weaponMaterial.disposals,0,'source weapon materials survive disposal');
  assert.equal(f.weaponGeometry.disposals,0,'source weapon geometry survives disposal');
 }
 // A late arsenal result must never resurrect entries, whether the entry or entire catalog was disposed.
 for(const wholeCatalog of [false,true]){
  const f=fixture({armoryPending:true});const entry=f.catalog.create({frame:5,weapon:'rifle'});entry.update(tick);
  if(wholeCatalog)f.catalog.dispose();else entry.dispose();
  const builds=f.counts.builds,animations=f.counts.animations;
  f.armory.resolve(f.source);await flush();entry.update(tick);f.catalog.dispose();
  assert.equal(entry.object.children.length,0,'late arsenal cannot attach to disposed entry');
  assert.equal(f.counts.mounts,0,'late arsenal cannot mount weapons after disposal');
  assert.equal(f.counts.builds,builds);assert.equal(f.counts.animations,animations);
  checkReleased(f,f.rigs[0]);assert.equal(f.weaponMaterial.disposals,0);
 }
 console.log('PASS hangar catalog: unsupported IDs, repeated lifecycle, pending Warden/Bastion/arsenal disposal, owned materials and preserved shared resources');
}
main().catch(error=>{console.error(error);process.exitCode=1});
