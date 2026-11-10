const assert=require('node:assert/strict');
const fx=require('../dist/pixelfx-vfx.js');
const createSimulation=require('./sim-harness.cjs');
function recording(width=390){
 const calls=[],gradient={addColorStop:(...args)=>calls.push(['stop',...args])};
 const ctx=new Proxy({canvas:{width},createRadialGradient:(...args)=>{calls.push(['gradient',...args]);return gradient}},
  {get:(target,key)=>key in target?target[key]:(...args)=>{calls.push([key,...args])},
   set:(target,key,value)=>{target[key]=value;return true}});
 return{ctx,calls};
}
const run=(fn,width=390)=>{const{ctx,calls}=recording(width);fn(ctx);return calls};
const args={point:{x:140,y:100},normal:{x:-1,y:-.15},progress:.32,kind:'rifle',seed:531,scale:44,broken:true};
const one=run(ctx=>fx.impact(ctx,args)),two=run(ctx=>fx.impact(ctx,args));
assert.deepEqual(one,two,'Sparks must be deterministic at a given timestamp');
assert.ok(one.some(call=>call[0]==='lineTo'),'Impact should include actual metal streaks');
// The flash lasts 140 ms; .32 of a 440 ms impact is already 140.8 ms.
const flash=run(ctx=>fx.impact(ctx,{...args,progress:.2}));
assert.ok(flash.some(call=>call[0]==='gradient'),'Early impact should have a short contact flash');
assert.ok(!one.some(call=>call[0]==='gradient'),'Contact flash must clear after 140 ms');
const ends=one.filter(call=>call[0]==='lineTo');
assert.ok(ends.filter(call=>call[1]<args.point.x).length>ends.length*.58,'Most ricochets should favor the impact normal');
for(const kind of ['rifle','shotgun','rail','missile','blade']){
 const ops=run(ctx=>fx.impact(ctx,{...args,kind,progress:.47}));
 assert.ok(ops.length>10,kind+' has too little effect geometry');
}
const lightning={a:{x:24,y:61},b:{x:108,y:75},progress:.18,seed:7,scale:44};
const arc=run(ctx=>fx.arc(ctx,lightning));
assert.ok(arc.filter(call=>call[0]==='lineTo').length>=14,'Electrical path needs layered segments');
assert.deepEqual(arc,run(ctx=>fx.arc(ctx,lightning)),'Arcs must be deterministic');
assert.notDeepEqual(arc,run(ctx=>fx.arc(ctx,{...lightning,progress:.3})),'Arc should flicker between time slices');
const collapse=run(ctx=>fx.ground(ctx,{point:{x:100,y:160},progress:.45,seed:3,scale:44,mass:1.4}));
assert.ok(collapse.some(call=>call[0]==='ellipse'),'Collapse must include a ground-pressure ring');
for(const call of [...one,...arc,...collapse])for(const value of call.slice(1))
 if(typeof value==='number')assert.ok(Number.isFinite(value),'All canvas arguments must be finite');
const sim=createSimulation();let hits=0,arcs=0,grounds=0;
sim.sandbox.window.IronVowVFX={impact:()=>{hits++},arc:()=>{arcs++},ground:()=>{grounds++}};
sim.run("createBattle(0);effects=[{type:'boom',target:battle.units[0].id,part:'body',x:battle.units[0].x,z:battle.units[0].z,t:.75,fxKind:'rifle',fxSeed:5,nx:-1,ny:0}]");
sim.run('drawEffects(clock)');assert.equal(hits,1,'Damage event must call new impact renderer');
sim.run("effects=[];const victim=battle.units[0];victim.alive=false;victim.downReason='body';victim.deathTime=0;drawPixelfxFaults(.28,victim,false)");
assert.ok(arcs>0,'Falling mech must arc at real subsystem anchors');
sim.run('drawPixelfxFaults(.6,victim,false)');assert.ok(grounds>0,'Knee impact must kick up grounded debris');
const oldArcs=arcs;
sim.run("victim.downReason='pilot';drawPixelfxFaults(.28,victim,false)");
assert.equal(arcs,oldArcs,'Pilot incapacitation must not arc like a body kill');
const reduced=createSimulation({reducedMotion:true});
reduced.run("createBattle(0);battle.units[0].alive=false;battle.units[0].downReason='body';battle.units[0].deathTime=0;drawPixelfxFaults(.28,battle.units[0],false)");
console.log('PASS: PixelFX-inspired weapon impacts, rig-anchored arcs, deterministic trajectories, collapse, pilot-down and reduced-motion behavior.');
