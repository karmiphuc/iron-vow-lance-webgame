const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

const sim=simulate();
const {run}=sim;
assert.ok(run(`FRAMES.every((frame,index)=>!playerHull(index)||index===SHOGUN_FRAME||
 Number.isInteger(frame.cost)&&frame.cost>=50000&&frame.cost<=400000)`));
assert.equal(run('Math.min(...FRAMES.filter((_,i)=>hullOnMarket(i)).map(f=>f.cost))'),50000);
assert.equal(run('Math.max(...FRAMES.filter((_,i)=>hullOnMarket(i)).map(f=>f.cost))'),500000);
assert.equal(run('FRAMES[SHOGUN_FRAME].cost'),500000);
assert.deepEqual(JSON.parse(run('JSON.stringify([FRAMES[3].cost,FRAMES[4].cost])')),[350000,300000]);
assert.ok(run('!acquireHull(3)&&!acquireHull(4)&&!assignChassis(0,3)&&!assignChassis(0,4)'));
assert.equal(run('save.credits'),4500,'a rejected purchase leaves the account intact');
run('save.credits=FRAMES[3].cost-1');
assert.ok(run('!acquireHull(3)&&!assignChassis(0,3)&&!hullOwned(3)'));
run('save.credits++');
assert.ok(run('acquireHull(3)&&save.credits===0&&save.reserve[3].condition===100'));
assert.ok(run('!acquireHull(3)&&assignChassis(0,3)&&save.credits===0'));
run('save.credits=FRAMES[4].cost');
assert.ok(run('assignChassis(1,4)&&save.credits===0'));
assert.ok(run('assignChassis(0,0)&&assignChassis(0,3)&&save.credits===0'),'owned hull swaps are free');
run('persist()');
const resume=simulate({storage:new Map(sim.storage)});
assert.equal(resume.run('pilotFrame(0)+","+pilotFrame(1)+","+save.credits'),'3,4,0');
run('save.salvage={[HELLBREAKER]:1};save.credits=rebuildPrice(HELLBREAKER)');
assert.equal(run('rebuildPrice(HELLBREAKER)'),140000);
assert.ok(run('!hullOnMarket(HELLBREAKER)&&acquireHull(HELLBREAKER,true)&&save.credits===0'));
console.log('PASS market price ladder, paid prototypes, exact deductions, stored hull reassignment, and salvage rebuild');
