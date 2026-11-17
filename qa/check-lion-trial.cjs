const assert=require('node:assert/strict');
const createSimulation=require('./sim-harness.cjs');
const audit=require('./fixtures/lion-export.json');

const ids=['cleaver','hatchet','breaker'];
assert.deepEqual(Object.keys(audit.strikes),ids);
assert.deepEqual([audit.fps,audit.contact,audit.finish,audit.pullback],[24,18,22,25]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const distance=(a,b)=>Math.hypot(...sub(a,b));
function flex({shoulder,elbow,wrist}){
 const a=sub(elbow,shoulder),b=sub(wrist,elbow);
 return Math.acos(a.reduce((sum,v,i)=>sum+v*b[i],0)/Math.hypot(...a)/Math.hypot(...b))*180/Math.PI;
}
for(const id of ids){
 const {frames}=audit.strikes[id];
 assert.equal(frames.length,32);
 const hit=flex(frames[audit.contact]),finish=flex(frames[audit.finish]),pullback=flex(frames[audit.pullback]);
 assert.ok(Math.abs(hit-27.578)<.002&&Math.abs(finish-hit)<.002&&Math.abs(pullback-54.948)<.002,id+' preserves elbow timing');
 assert.ok(frames[audit.contact].meleeTip[2]-frames[audit.finish].meleeTip[2]>.7,id+' drops through contact');
 for(const [i,frame] of frames.entries()){
  assert.equal(frame.sourceFrame,frames[0].sourceFrame+i);
  assert.ok(distance(frame.socketMatrix,frame.mountMatrix)<.00001,id+' weapon seats on the source socket');
  for(const digit of ['1','2','3','4','thumb'])
   assert.ok(distance(frame.fingerPadsInGrip[digit],frames[0].fingerPadsInGrip[digit])<.00002,id+' grip stays closed');
 }

}

const sim=createSimulation({lion:'cleaver'}),{run}=sim;
for(const id of ids){
 run(`startLionTrial('${id}')`);
 assert.equal(run('current().melee'),id);
 assert.equal(run("distance(current(),battle.units[1])"),1);
 assert.equal(run("canUseWeapon(current(),selectedWeapon(current(),'fire'))"),false);
 const timings=JSON.parse(run(`JSON.stringify((()=>{const u=current(),p=attackProfile(u,'${id}');
  u.attack={kind:'${id}',start:0,fireAt:p.raise,releaseAt:p.raise+p.travel};
  return [p.raise,p.travel,p.recover,animationPose(u,u.attack.releaseAt).strikeProgress,
   animationPose(u,u.attack.releaseAt+p.recover).strikeProgress];
 })())`));
 assert.deepEqual(timings.slice(0,4),[15/24,3/24,13/24,.7]);
 assert.ok(Math.abs(timings[4]-1)<1e-6);
 run('persist();finish(true)');
 assert.equal(sim.storage.has('iron-vow-career'),false);
}
console.log('PASS Lion closed grip export, authored attack phases, playable loadouts, and isolated career state');
