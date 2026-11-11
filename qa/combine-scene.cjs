/* Combine two immutable 15-battle shards; never substitute missing or failed seeds. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const [output,...inputs]=process.argv.slice(2);
assert.ok(output&&inputs.length===2,'Usage: node qa/combine-scene.cjs <output.json> <shard-0-14.json> <shard-15-29.json>');
const reports=inputs.map(file=>({file:path.resolve(file),raw:fs.readFileSync(file,'utf8')})).map(item=>({...item,report:JSON.parse(item.raw)}));
const source=reports[0].report.source,types=['nan','footGround','footSlide','bounds','overlap','stuck','ikReach','aimOff','weaponMount','muzzleFar','noDamage','deadPartDamage','hpRange','wreckActs','partVisual','popSwap'];
for(const {report:r} of reports){
 assert.equal(r.status,'passed','Every shard completed its final assertions');assert.equal(r.formal,true);assert.equal(r.combatGate,true);
 assert.equal(r.skipProbes,false);assert.equal(r.rasterPair,false);assert.equal(r.tileOverride,null);assert.equal(r.clockHz,30);
 assert.equal(r.source.distDirty,false);assert.equal(r.source.distTree,source.distTree);assert.equal(r.source.checkerSha256,source.checkerSha256);
 assert.equal(r.cpuRaster,reports[0].report.cpuRaster);assert.deepEqual(r.errors,[]);assert.equal(r.battles.length,15);
 assert.deepEqual(r.faultProbes.map(p=>p.type).sort(),[...types].sort(),'Every shard proves all sixteen negative controls');
}
const battles=reports.flatMap(x=>x.report.battles).sort((a,b)=>a.seed-b.seed),expected=Array.from({length:30},(_,i)=>4242+i);
assert.deepEqual(battles.map(b=>b.seed),expected,'Exactly thirty unique expected seeds, without gaps or repeats');
for(const b of battles){assert.deepEqual(b.anomalies,[],'No anomalies in seed '+b.seed);assert.deepEqual(b.commandErrors,[]);assert.ok(b.ticks>0);assert.ok(b.result&&typeof b.result.win==='boolean');}
const unique=values=>[...new Set(values)],frames=unique(battles.flatMap(b=>b.frames)).sort((a,b)=>a-b),assigned=unique(battles.flatMap(b=>b.assignedWeapons)).sort();
assert.deepEqual(frames,[0,5,6,7,8,9,10,12],'All eight actual live rigs');assert.equal(assigned.length,24,'All twenty-four Workshop weapons assigned');
const combined={schema:1,status:'passed',source:{distTree:source.distTree,checkerSha256:source.checkerSha256},policy:'Two disjoint fifteen-battle formal shards. Each includes all sixteen real-state negative controls and immutable application/checker guards. Campaign assignments and actual commanded weapons are reported separately; all-weapon landed-contact evidence is in action-evidence-manifest.json. No device performance claim.',shards:reports.map(({file,raw,report:r})=>({report:path.relative(path.dirname(path.resolve(output)),file),sha256:crypto.createHash('sha256').update(raw).digest('hex'),source:r.source,seeds:r.battles.map(b=>b.seed),negativeControls:r.faultProbes.map(p=>p.type)})),seeds:expected,battleCount:30,ticks:battles.reduce((n,b)=>n+b.ticks,0),rasterOmitted:battles.reduce((n,b)=>n+b.rasterOmitted,0),frames,assignedWeapons:assigned,commandedWeapons:unique(battles.flatMap(b=>b.weapons)).sort(),combatCounts:battles.reduce((all,b)=>{for(const [type,count] of Object.entries(b.combatCounts))all[type]=(all[type]||0)+count;return all;},{}),maximumLaunchAimError:Math.max(...battles.map(b=>b.maximumLaunchAimError)),aimClearance:{calls:battles.reduce((n,b)=>n+b.aimClearance.calls,0),infeasibleCount:battles.reduce((n,b)=>n+b.aimClearance.infeasibleCount,0),minimumTravel:Math.min(...battles.map(b=>b.aimClearance.minimumTravel).filter(n=>n!==null)),minimumDiscriminant:Math.min(...battles.map(b=>b.aimClearance.minimumDiscriminant).filter(n=>n!==null))},anomalies:[],errors:[],battles:battles.map(({seed,frames,assignedWeapons,weapons,ticks,result})=>({seed,frames,assignedWeapons,commandedWeapons:weapons,ticks,result}))};
fs.writeFileSync(output,JSON.stringify(combined,null,2)+'\n');
console.log('PASS 30 unique seeded campaign battles, '+combined.ticks+' actual-bone ticks, all eight rigs and twenty-four Workshop assignments; sixteen negative controls per shard');
