const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');
const createSimulation=require('./sim-harness.cjs');
const audit=require('./fixtures/lion-export.json');

const dist=join(__dirname,'../dist'),window={};
runInNewContext(readFileSync(join(dist,'lion-art.js'),'utf8'),{window});
const art=window.IRON_VOW_LION_ART;
const ids=['cleaver','hatchet','breaker'];
assert.deepEqual(Object.keys(art.strikes),ids);
assert.deepEqual([art.fps,art.contact,art.finish,art.pullback],[24,18,22,25]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const distance=(a,b)=>Math.hypot(...sub(a,b));
function flex({shoulder,elbow,wrist}){
 const a=sub(elbow,shoulder),b=sub(wrist,elbow);
 return Math.acos(a.reduce((sum,v,i)=>sum+v*b[i],0)/Math.hypot(...a)/Math.hypot(...b))*180/Math.PI;
}
for(const id of ids){
 const {frames,atlases}=audit.strikes[id];
 assert.equal(frames.length,32);
 const hit=flex(frames[art.contact]),finish=flex(frames[art.finish]),pullback=flex(frames[art.pullback]);
 assert.ok(Math.abs(hit-27.578)<.002&&Math.abs(finish-hit)<.002&&Math.abs(pullback-54.948)<.002,id+' preserves elbow timing');
 assert.ok(frames[art.contact].meleeTip[2]-frames[art.finish].meleeTip[2]>.7,id+' drops through contact');
 for(const [i,frame] of frames.entries()){
  assert.equal(frame.sourceFrame,frames[0].sourceFrame+i);
  assert.ok(distance(frame.socketMatrix,frame.mountMatrix)<.00001,id+' weapon seats on the source socket');
  for(const digit of ['1','2','3','4','thumb'])
   assert.ok(distance(frame.fingerPadsInGrip[digit],frames[0].fingerPadsInGrip[digit])<.00002,id+' grip stays closed');
 }
 for(const face of ['left','right']){
  const {key,frames:screen}=art.strikes[id][face];
  assert.equal(screen.length,32);
  assert.ok(screen.every(f=>Object.values(f).flat().every(v=>v>0&&v<1)));
  assert.ok(screen[art.finish].meleeTip[1]>screen[art.contact].meleeTip[1],id+' tip descends in '+face+' projection');
  const bytes=readFileSync(join(dist,'assets',key+'.webp'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),atlases[face].sha256);
 }
}

const sim=createSimulation({lion:'cleaver'}),{run}=sim;
for(const id of ids){
 run(`startLionTrial('${id}')`);
 assert.equal(run('current().melee'),id);
 assert.equal(run("distance(current(),battle.units[1])"),1);
 assert.equal(run("canUseWeapon(current(),selectedWeapon(current(),'fire'))"),false);
 assert.equal(run(`(()=>{const u=current(),p=attackProfile(u,'${id}');u.attack={kind:'${id}',start:0,fireAt:p.raise,releaseAt:p.raise+p.travel};
  const index=tick=>lionBaked(u,u.attack.releaseAt+(tick-18)/24).index;
  return [index(18),index(22),index(25),index(31)].join(',');
 })()`),'18,22,25,31');
 run('persist();finish(true)');
 assert.equal(sim.storage.has('iron-vow-career'),false);
}
console.log('PASS Lion closed grip export, authored attack phases, playable loadouts, and isolated career state');
