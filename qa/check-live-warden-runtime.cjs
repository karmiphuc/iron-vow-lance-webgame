const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..')),dist=path.join(root,'dist');
globalThis.window=globalThis;globalThis.self=globalThis;
globalThis.THREE=require(path.join(dist,'rig-bench/vendor/three.min.js'));
const canvas=()=>{const c=createCanvas(1,1);c.style={};c.addEventListener=()=>{};return c};
globalThis.document={createElement:canvas,createElementNS:canvas};
for(const file of ['rig-bench/vendor/GLTFLoader.js','foundry/production-arsenal.js','foundry/behemoth-core.js','foundry/chassis.js','foundry/rig-motion.js','foundry/warden-live.js'])
 vm.runInThisContext(fs.readFileSync(path.join(dist,file),'utf8'),{filename:file});
const T=THREE,R=IronVowFoundryRig,W=IronVowWardenRig,A=IronVowProductionArsenal;
const buffer=file=>{const b=fs.readFileSync(path.join(dist,file));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};
class Renderer{constructor(){this.domElement=canvas()}setSize(w,h){this.domElement.width=w;this.domElement.height=h}setClearColor(){}dispose(){}render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true)}}
class Environment{fromScene(){return {texture:{dispose(){}}}}dispose(){}}

(async()=>{
 const source=await W.load(buffer('rig-bench/warden-painted.glb'),JSON.parse(fs.readFileSync(path.join(dist,'rig-bench/warden-painted-motion.json'))));
 const arsenal=await A.load(buffer('rig-bench/weapons.glb'),buffer('rig-bench/expansion-weapons.glb'),buffer('rig-bench/shields.glb'));
 const sandbox={console,document,THREE:{...T,WebGLRenderer:Renderer,PMREMGenerator:Environment},
  IronVowFoundryRig:R,VowChassis,IronVowWardenRig:W,IronVowProductionArsenal:{...A,load:()=>Promise.resolve(arsenal)},matchMedia:()=>({matches:false})};sandbox.window=sandbox;
 vm.runInNewContext(fs.readFileSync(path.join(dist,'foundry/renderer.js'),'utf8'),sandbox,{filename:'foundry/renderer.js'});
 const api=sandbox.IronVowFoundry;api.wardenReady();await Promise.resolve();
 const timers=[],sim=require(path.join(root,'qa/sim-harness.cjs'))({foundry:true,travel:true,
  setTimeout:(callback,ms)=>{timers.push({callback,ms});return timers.length}});
 sim.sandbox.window.IronVowFoundry=api;
 sim.run('createBattle(0,false,false,[0]);surveyTerrain(0);globalThis.ally=current();battle.cover.clear();battle.field.cells.forEach(c=>c.level=0);Object.assign(ally,{x:8,z:10,vx:8,vz:10,moveLeft:4,heading:headingTo(1,0),face:1,attack:null});clock=1');
 const errors=[],moving=sim.run('moveUnit(ally,11,10)'),scale=sim.run('scale');
 await sim.flush();
 let previous=null,worst=0,lastRig,tiles=0;
 while(sim.run('Boolean(ally.motion)')){
  const motion=sim.run('ally.motion');
  if(motion.stepBeats==null)errors.push('The live Warden did not select paired movement.');
  for(let frame=1;frame<=20;frame++){
   sim.run(`clock=${motion.start+motion.duration*frame/20};advanceUnitAnimation(ally,clock,${motion.duration/20})`);
   const view=sim.run('foundryRender(ally,clock)');assert.ok(view?.m,'live Warden remains visible while moving');
   lastRig=view.m;const state=lastRig.legs[1],point=sim.run('mechAttachmentPoint(ally,"leadFoot",clock)');
   if(!state.swing&&previous&&!previous.swing)worst=Math.max(worst,Math.hypot(point.x-previous.x,point.y-previous.y)/scale);
   previous={...point,swing:state.swing};
  }
  const index=timers.findIndex(timer=>Math.abs(timer.ms-motion.duration*1000)<.001);
  assert.ok(index>=0,'movement schedules its step completion');timers.splice(index,1)[0].callback();await sim.flush();
  assert.ok(++tiles<=6,'the route finishes');
 }
 await moving;
 assert.equal(tiles,3,'the real moveUnit path crosses three tile boundaries');
 if(worst>.1)errors.push('A planted Warden foot jumps '+worst.toFixed(3)+' tile between frames.');
 assert.equal(sim.run('ally.x===11&&ally.z===10'),true,'movement reaches its target');

 sim.run('ally.motion={fromX:10,fromZ:10,toX:11,toZ:10,start:clock,duration:1,gaitBase:0}');
 if(sim.run('foundryRender(ally,clock)')!==null)errors.push('Loading the live rig switches an in-progress legacy stride.');
 sim.run('ally.motion=null');
 assert.ok(sim.run('foundryRender(ally,clock)'),'live Warden resumes after the legacy stride');

 const owned=new Set(Object.values(lastRig.build.parts).flat().map(entry=>entry.m.material));
 R.setPartState(lastRig,'right',1);
 for(const entry of Object.values(lastRig.build.parts).flat())owned.add(entry.m.material);
 const retiredBase=owned.values().next().value,retiredDamage=VowChassis.damagedOf(retiredBase);
 owned.add(retiredDamage);
 const disposed=new Set();for(const material of owned)material.addEventListener('dispose',()=>disposed.add(material));
 let sourceDisposed=0;const original=new Set();source.traverse(o=>{if(o.isMesh)original.add(o.material)});
 for(const material of original)material.addEventListener('dispose',()=>sourceDisposed++);
 api.clearCombat();
 if(disposed.size!==owned.size)errors.push('Combat cleanup disposed '+disposed.size+'/'+owned.size+' owned Warden materials.');
 if(VowChassis.damagedOf(retiredBase)===retiredDamage)errors.push('The retired Warden retains its cached damage material.');
 assert.equal(sourceDisposed,0,'shared source materials survive combat cleanup');
 const reduced=require(path.join(root,'qa/sim-harness.cjs'))({foundry:true,travel:true,reducedMotion:true});
 reduced.sandbox.window.IronVowFoundry=api;
 reduced.run('createBattle(0,false,false,[0]);globalThis.walker=current();walker.motion={fromX:2,fromZ:16,toX:3,toZ:16,start:clock-.5,duration:1,gaitBase:0}');
 const still=reduced.run('foundryRender(walker,clock)');
 assert.ok(still?.m,'reduced-motion movement keeps the live Warden visible');
 if(still.m.wasMoving)errors.push('Reduced-motion movement animates the live Warden gait.');
 api.clearCombat();
 assert.deepEqual(errors,[]);
 console.log('PASS real live-Warden movement, tile seams, loading handoff and owned-material cleanup ('+worst.toFixed(3)+' tile maximum planted-foot shift)');
})().catch(error=>{console.error(error);process.exitCode=1});
