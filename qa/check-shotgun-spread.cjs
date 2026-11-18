/* Real presentation integration: combat launch -> pooled streaks -> contact impacts.
 * Override IRON_VOW_COMBAT_SOURCE to demonstrate the pre-fix regression. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
globalThis.window=globalThis;globalThis.self=globalThis;
const noop=()=>{},gradient={addColorStop:noop};
globalThis.document={createElement(){return{width:1,height:1,getContext:()=>new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(target,key)=>target[key]||noop})};}};
const root=path.resolve(__dirname,'../dist');
for(const file of ['rig-bench/vendor/three.min.js','scene/effects.js','scene/weapon-fx.js','scene/combat.js'])vm.runInThisContext(fs.readFileSync(file==='scene/combat.js'&&process.env.IRON_VOW_COMBAT_SOURCE?process.env.IRON_VOW_COMBAT_SOURCE:path.join(root,file),'utf8'),{filename:file});
globalThis.innerWidth=1194;globalThis.IronVowRenderer={quality:{tier:'high'}};
globalThis.clock=10;globalThis.reducedMotion=false;globalThis.shake=0;globalThis.effects=[];
globalThis.shotMuzzle=()=> 'muzzle';globalThis.attackProfile=()=>({travel:.12});
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),actor={id:'a',alive:true},target={id:'t',alive:true};
globalThis.battle={units:[]};
let range=18,vertical=false;
const origin=V(2,3,4),anchor=()=>vertical?origin.clone().add(V(0,range,0)):origin.clone().add(V(range,0,0));
const scene=new THREE.Scene(),combat=IronVowCombat.create(scene,{models:new Map(),sync:noop,attachmentPoint:(u,part)=>u===actor?origin.clone():anchor(),groundAt:()=>0});
let actualFX=[];
for(const key of ['streak','spray','glow','smoke']){const fn=combat.fx[key];combat.fx[key]=function(...args){actualFX.push({type:key,args:args.map(v=>v?.isVector3?v.clone():v)});return fn.apply(this,args);};}
const contacts=(hit=true,n=12)=>Array.from({length:n},(_,index)=>Object.freeze({index,hit,part:'body',travel:.12+index*.046,before:100,after:99,amount:1,damage:1}));
function launch({scatter=true,guard=false,hit=true,id='shotgun'}={}){
 combat.clear();actualFX=[];
 const rounds=contacts(hit,scatter?12:1),before=JSON.stringify(rounds),weapon=Object.freeze({id,...scatter?{scatter:true,burst:12}:{}});
 const random=Math.random;Math.random=()=>{throw Error('Presentation consumed gameplay RNG');};
 try{combat.launch(actor,target,weapon,0,rounds,guard);if(hit)for(const c of rounds)combat.landed(actor,target,weapon,c,guard);}finally{Math.random=random;}
 assert.equal(JSON.stringify(rounds),before,'Presentation cannot change contact hit, part, damage or timing');
 const streaks=actualFX.filter(f=>f.type==='streak'),sprays=actualFX.filter(f=>f.type==='spray');
 assert.equal(streaks.length,rounds.length,'One actual pooled tracer per rule pellet / slug');
 if(scatter)assert.equal(new Set(streaks.map(f=>f.args[1].toArray().join(','))).size,12,'REGRESSION: twelve pellets must not collapse onto one subsystem point');
 for(const [i,f] of streaks.entries()){
  assert.ok(f.args[0].distanceTo(origin)<1e-8,'Each actual tracer starts at the source muzzle');
  assert.equal(f.args[4],rounds[i].travel,'Each tracer arrives on its rule contact timeline');
  if(hit)assert.ok(sprays[i].args[0].distanceTo(f.args[1])<1e-8,'Actual impact spray lands at its own tracer endpoint');
 }
 assert.equal(sprays.length,hit?rounds.length:0,'Misses add no false landed impacts');
 assert.ok(actualFX.some(f=>f.type==='glow'&&f.args[0].distanceTo(origin)<1e-8),'Shell produces a real muzzle flash');
 return streaks;
}
const radial=streaks=>Math.max(...streaks.map(f=>{const d=f.args[1].clone().sub(anchor());return vertical?Math.hypot(d.x,d.z):Math.hypot(d.y,d.z);}));
let s=launch();
assert.equal(new Set(s.map(f=>f.args[1].toArray().join(','))).size,12,'REGRESSION: twelve pellets must not collapse onto one subsystem point');
assert.ok(radial(s)>.9,'Pellet endpoints form a visible cone at eighteen world units');
const repeat=launch();assert.deepEqual(repeat.map(f=>f.args[1].toArray()),s.map(f=>f.args[1].toArray()),'Spread geometry is deterministic');
const wide=radial(s);range=6;s=launch();assert.ok(radial(s)<wide*.6,'Cone width scales with range');
range=18;s=launch({guard:true});assert.ok(radial(s)>.4&&radial(s)<.66,'Shield interception spreads on the shield patch');
assert.ok(combat.history.filter(e=>e.type==='impact').slice(-12).every(e=>e.shield),'Guard impacts retain their shield flag');
s=launch({hit:false});assert.equal(new Set(s.map(f=>f.args[1].toArray().join(','))).size,12,'Missed shell retains twelve distinct flight paths');
vertical=true;s=launch();assert.ok(s.every(f=>f.args[1].toArray().every(Number.isFinite)),'Near-vertical muzzle direction has a valid spread basis');vertical=false;
s=launch({scatter:false,id:'rampart'});assert.equal(s.length,1,'Shotgun FX archetype heavy slug remains a single tracer');assert.ok(s[0].args[1].distanceTo(anchor())<1e-8,'Slug remains centered without fake pellets');
// Inspect real pooled geometry as well as call-through arguments during flight.
combat.clear();actualFX=[];const rounds=contacts();combat.launch(actor,target,{id:'shotgun',scatter:true,burst:12},0,rounds,false);combat.fx.update(.03);
const geom=scene.children.filter(o=>o.isMesh&&o.visible&&o.geometry.parameters?.width===1&&o.geometry.parameters?.height===1&&o.geometry.parameters?.depth===1&&Math.abs(o.scale.x-.022)<1e-8);   // pellet streaks: thin 0.7 m flicks, not beams (effects.js fireFX)
assert.equal(geom.length,12,'Twelve real additive streak meshes exist during flight');
assert.ok(new Set(geom.map(o=>o.position.toArray().map(n=>n.toFixed(4)).join(','))).size===12,'Real in-flight pellet meshes are spatially separated');
combat.dispose();
console.log('PASS actual shotgun FX: 12 separated pooled pellet meshes, range-scaled deterministic cone, muzzle alignment, per-pellet arrival/impact alignment, shield and miss paths, vertical basis, one centered slug, unchanged contacts and zero gameplay RNG draws');
