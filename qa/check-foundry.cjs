const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const simulate=require('./sim-harness.cjs');
const savedKey='iron-vow-career';
const dist=path.join(__dirname,'../dist');

async function exerciseRigAdapter(){
 const vm=require('node:vm');
 const {createCanvas}=require('@napi-rs/canvas');
 const three=require('../dist/rig-bench/vendor/three.min.js');
 let frames=0,fail=false;
 class TestRenderer{
  constructor(){this.domElement=createCanvas(320,320);this.domElement.addEventListener=()=>{}}
  setSize(){}
  setClearColor(){}
  dispose(){}
  render(){if(fail)throw Error('simulated driver failure');frames++}
 }
 class TestEnvironment{
  fromScene(){return {texture:null}}
  dispose(){}
 }
 const THREE={...three,WebGLRenderer:TestRenderer,PMREMGenerator:TestEnvironment};
 const world={THREE,window:{THREE},document:{createElement:()=>createCanvas(320,320)},console:{warn(){}}};
 vm.createContext(world);
 vm.runInContext(fs.readFileSync(path.join(dist,'rig-bench/vendor/GLTFLoader.js'),'utf8'),world);
 vm.runInContext(fs.readFileSync(path.join(dist,'foundry/production-arsenal.js'),'utf8'),world);
 const buffer=fs.readFileSync(path.join(dist,'rig-bench/weapons.glb'));
 const arsenal=world.window.IronVowProductionArsenal;
 const production=await arsenal.load(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));
 for(const [id,name,hook] of [
  ['rifle','kestrel','muzzle'],['rail','longbow','muzzle'],['shotgun','breacher','muzzle'],
  ['missile','vesper','muzzle2'],['hailstorm','hailstorm','muzzle'],['rampart','rampart','muzzle'],
  ['breaker','breaker','tip'],['cleaver','cleaver','tip'],['piledriver','piledriver','spike'],['blade','cleaver','tip']
 ]){
  const mounted=arsenal.mount(production,id,new three.Group());
  assert.equal(mounted.model.name,name);
  assert.ok(mounted[hook],id+' has its production hardpoint '+hook);
 }
 for(const file of ['chassis.js','rig-motion.js','renderer.js']){
  vm.runInContext(fs.readFileSync(path.join(dist,'foundry',file),'utf8'),world);
 }
 const adapter=world.window.IronVowFoundry,scope={};
 const hp={pilot:70,body:150,left:70,right:70,legs:90};
 const pose={death:0,kneel:0,impact:0,cycle:0,aim:0,brace:0,recoil:0,primePhase:'step',primeProgress:.55,strikeProgress:0};
 for(let model=0;model<6;model++){
  const unit={id:'unit'+model,index:model,team:'ally',face:1,weapon:'missile',melee:'blade',alive:true,hp,max:hp};
  const result=adapter.draw(unit,1,pose,scope,model);
  assert.ok(result,'rig adapter produced a surface for model '+model);
  assert.ok(result.anchors.gripR.every(Number.isFinite));
  assert.ok(result.anchors.leadFoot.every(Number.isFinite));
  assert.notDeepEqual(result.anchors.gripL,result.anchors.axisL);
  if(model===0)await Promise.resolve();
  const fitted=adapter.draw(unit,1,pose,scope,model);
  assert.equal(fitted.primary.model.name,'vesper');
  assert.equal(fitted.secondary.model.name,'cleaver');
  assert.notDeepEqual(fitted.anchors.muzzle,fitted.anchors.muzzle2);
 }
 assert.equal(frames,7,'idle rerenders reuse their surface after the arsenal arrives');
 const artillery={id:'tripod',index:0,team:'ally',face:-1,weapon:'missile',melee:'blade',alive:true,hp,max:hp,
  attack:{start:1,primeDuration:.6,fireAt:1.95,returnAt:2.8}};
 function checkContact(entry){
  const root=entry.m.body;
  root.updateWorldMatrix(true,true);
  for(const leg of entry.m.rig.legs){
   const sign=Math.sign(leg.restX);
   const point=leg.kneeShoe?leg.kneeShoe.localToWorld(new three.Vector3(0,-.3155,.035)):leg.an.getWorldPosition(new three.Vector3());
   const expected=leg.kneeShoe?new three.Vector3(sign*.335,0,1.855):new three.Vector3(leg.restX,.315,leg.restZ);
   assert.ok(root.worldToLocal(point).distanceTo(expected)<.0001,leg.side+' stays on its support');
  }
 }
 for(const [t,kick] of [[1.66,0],[1.99,.8],[2.24,.5],[2.78,0]]){
  const entry=adapter.draw(artillery,t,{...pose,heading:-Math.PI/4,primePhase:'planted',primeProgress:1,aim:1,recoil:kick},scope,5);
  checkContact(entry);
  assert.equal(entry.primary.model.name,'vesper');
  assert.equal(entry.primary.mount.parent,entry.m.rig.arms.R.so);
  assert.equal(entry.primary.recoil.position.z,-kick*.22);
  assert.equal(entry.m.mortar.slide.position.z,-0);
 }
 artillery.attack=null;
 const launch=adapter.draw(artillery,3.3,{...pose,primeProgress:0,mortarAge:.99},scope,5);
 checkContact(launch);
 assert.ok(launch.m.mortar.elevation.rotation.x<-.9);
 assert.ok(launch.m.mortar.slide.position.z<-.2);
 assert.notDeepEqual(launch.anchors.mortarMuzzle,launch.anchors.muzzle);
 const recovered=adapter.draw(artillery,4,{...pose,primeProgress:0,mortarAge:2.2},scope,5);
 assert.equal(recovered.m.artilleryBrace,false);
 assert.equal(recovered.m.mortar.elevation.rotation.x,-.18);
 assert.equal(recovered.m.mortar.slide.position.z,-0);
 fail=true;
 const unit={id:'failure',index:0,team:'ally',weapon:'rail',alive:true,hp,max:hp};
 assert.equal(adapter.draw(unit,1,pose,scope,0),null);
 assert.equal(adapter.draw(unit,2,pose,scope,0),null);

}

(async()=>{
 const sim=simulate({random:()=>0,foundry:true}),{run}=sim;
 assert.equal(run('FRAMES.length'),19);
 assert.equal(run('ASHIGARU_FRAME'),18);
 assert.equal(run('BULWARK_FRAME'),17);
 assert.equal(run('VANGUARD_FRAME'),15);
 assert.equal(run('LINE_INFANTRY_FRAME'),13);
 assert.equal(run('LINE_ELITE_FRAME'),14);
 assert.equal(run('HELLBREAKER'),11);
 assert.equal(run('CITADEL_FRAME'),12);
 assert.equal(run('BASTION_FRAME'),10);
 assert.equal(run('stockHull(BASTION_FRAME).weapon'),'rifle');
 assert.equal(run('FOUNDRY_HOSTILES.frontier.includes(CITADEL_FRAME)'),true);
 assert.equal(run('acquireHull(CITADEL_FRAME)||assignChassis(0,CITADEL_FRAME,true)||validHull(stockHull(CITADEL_FRAME),CITADEL_FRAME)'),false);
 run('save.credits=FRAMES[6].cost+1300');
 assert.equal(run('assignChassis(0,6,true)'),true);
 assert.equal(run('save.credits'),1300);
 assert.equal(run("save.owned.includes('blade')"),true);
 assert.equal(run('assignChassis(0,7,true)'),false);
 run("save.units[0].paint='#577eac';save.units[0].trim={s:'#30343b',a:'#ff9944'};save.units[0].condition=81;save.units[0].xp=22");
 assert.equal(run('assignChassis(1,6,true)'),true);
 assert.equal(run('save.units[0].xp'),22);
 assert.equal(run('save.units[1].condition'),81);
 assert.equal(run('save.units[1].trim.a'),'#ff9944');
 assert.equal(run('save.credits'),1300);
 assert.equal(run('validSave(save)'),true);
 for(let i=0;i<4;i++){
  run(`createBattle(${i});draw(1000)`);
  if(i===3)assert.equal(run("battle.units.some(u=>u.team==='enemy'&&u.frame===CITADEL_FRAME&&foundryModel(u.frame)===2)"),true);
  assert.ok(run("battle.units.filter(u=>foundryModel(u.frame)!=null).every(u=>foundryRender(u,clock).anchors.gripR.length===2)"));
  run('battle=null');
 }
 run("createBattle(3);selected=1;const target=battle.units.find(u=>u.team==='enemy'&&foundryModel(u.frame)!=null);target.hp.pilot=1;target.x=current().x+1;target.z=current().z;");
 const targetId=run('target.id'),targetFrame=run('target.frame');
 const body=run('target.hp.body');
 await run("shoot(current(),target,'pilot',weapon('blade'))");
 assert.equal(run('target.alive'),false);
 assert.equal(run('target.downReason'),'pilot');
 assert.equal(run('target.hp.body'),body);
 assert.equal(run("effects.some(e=>e.type==='detonation')"),false);
 run('persist()');
 const restored=simulate({storage:new Map(sim.storage)});
 assert.equal(restored.run(`battle.units.find(u=>u.id===${JSON.stringify(targetId)}).downReason`),'pilot');
 assert.equal(restored.run(`battle.units.find(u=>u.id===${JSON.stringify(targetId)}).frame`),targetFrame);
 assert.equal(restored.run('current().name'),'ONI');

 const older=simulate({random:()=>0});
 older.run('createBattle(3,false,true);persist()');
 const career=JSON.parse(older.storage.get(savedKey));
 career.sortie.version=3;
 delete career.sortie.stockHostiles;
 career.sortie.units.forEach(u=>delete u.hp.pilot);
 const migrated=simulate({storage:new Map([[savedKey,JSON.stringify(career)]])});
 assert.equal(migrated.run('battle.units[3].frame'),0);
 assert.equal(migrated.run('battle.units[3].hp.pilot'),70);
 assert.equal(migrated.run('captureSortie().stockHostiles'),true);
 const generated={};
 new Function('window',fs.readFileSync(path.join(dist,'foundry/baked.js'),'utf8'))(generated);
 for(const [model,visual] of generated.IRON_VOW_FOUNDRY_ART.entries()){
  if(model===run('foundryModel(VANGUARD_FRAME)')&&!visual)continue; // Vanguard loads its own atlas.
  assert.equal(visual.frames.length,19);
  assert.ok(visual.frames.every(f=>f.pilot.every(Number.isFinite)&&f.gripL.every(Number.isFinite)&&f.axisR.every(Number.isFinite)));
  const paintedInBake=run('[LINE_INFANTRY_FRAME,REAVER_FRAME].map(foundryModel)').includes(model);
  const suffixes=paintedInBake?['']:['','-paint'];
  for(const asset of [visual,...visual.views])for(const suffix of suffixes){
   assert.ok(fs.existsSync(path.join(dist,'assets',asset.key+suffix+'.webp')));
  }
 }
 const importedSortie=simulate({foundry:true});
 assert.equal(importedSortie.run(`importCareer(${sim.storage.get(savedKey)})`),true);
 assert.equal(importedSortie.run(`battle.units.find(u=>u.id===${JSON.stringify(targetId)}).downReason`),'pilot');
 assert.equal(importedSortie.run('save.sortie.version'),7);
 const donor={
  version:2,day:7,credits:9800,rep:20,wins:2,kills:6,owned:['rifle','missile','blade'],
  units:[{mech:3,level:2,xp:55},{mech:0,level:1,xp:7},{mech:2,level:3,xp:23}],
  mechs:[
   {frame:0,weapon:'rifle',condition:64,upgrade:2,paint:null},
   {frame:1,weapon:'rail',condition:100,upgrade:0,paint:null},
   {frame:2,weapon:'missile',condition:92,upgrade:0,paint:null},
   {frame:4,weapon:'blade',condition:86,upgrade:1,paint:{p:'#424850',s:'#17191e',a:'#ab452e'}}
  ],
  history:[{name:'Ashes of the relay',day:5,win:true,pay:3200}],sortie:{version:1,contract:2}
 };
 const imported=simulate({storage:new Map([[savedKey,JSON.stringify(donor)]])});
 assert.equal(imported.run('save.units.map(u=>u.frame).join()'),'6,8,10');
 assert.equal(imported.run('save.units[0].melee'),'blade');
 assert.equal(imported.run('save.units[0].trim.s'),'#17191e');
 assert.equal(imported.run('save.units[1].condition'),64);
 assert.equal(imported.run('save.reserve[9].weapon'),'rail');
 assert.equal(imported.run("save.owned.includes('rail')"),true);
 assert.equal(imported.run('save.credits'),9800);
 assert.equal(imported.run('battle'),null);
 assert.equal(imported.run('save.sortie'),undefined);
 donor.units[1].mech=3;
 assert.equal(run(`loadCareer(${JSON.stringify(donor)})`),null);

 run("battle=null;save.credits=FRAMES[7].cost+12000;assignChassis(1,7,true);createBattle(3);selected=1");
 assert.ok(run(`(()=>{
  const u=current(),a=mechAttachmentPoint(u,'muzzle'),b=mechAttachmentPoint(u,'muzzle2');
  return Math.hypot(a.x-b.x,a.y-b.y)>1;
 })()`),'Vesper emitters use the two actual asset sockets');
 assert.ok(run(`(()=>{
  const u=current(),f=foundryRender(u,clock);
  const mount=foundryMount(f.anchors,unitBounds(u),'piledriver',unitFacing(u),.72);
  return mount.asset.key.includes('extended')&&Number.isFinite(mount.angle);
 })()`),'Piledriver uses the extended ram asset, not the Raijin blade');
 await exerciseRigAdapter();
 console.log('PASS: procurement, swap, paint, pilot disable, donor career migration, four fallback battle paths, weapon sockets, Foundry atlases and simulated WebGL failure recovery.');
})().catch(error=>{console.error(error);process.exitCode=1});
