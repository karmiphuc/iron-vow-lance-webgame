const assert=require('node:assert/strict');
const runWar=require('./war-driver.cjs');
(async()=>{
 const first=await runWar({seed:42});
 const again=await runWar({seed:42});
 const other=await runWar({seed:43});
 assert.equal(JSON.stringify(first),JSON.stringify(again),'seeded encounter must replay identically');
 assert.notEqual(JSON.stringify(first.events),JSON.stringify(other.events),'different seed should affect combat');
 assert.equal(first.unfinished,false);
 assert.equal(first.result.win,true);
 assert.ok(first.events.some(e=>e.action==='move'));
 assert.ok(first.events.some(e=>e.action==='attack'));
 assert.ok(first.events.some(e=>e.action==='endTurn'));
 const round=await runWar({seed:42,maxTurns:1});
 assert.equal(round.unfinished,true);
 assert.equal(round.turn,2);
 const total=hp=>Object.values(hp).reduce((sum,value)=>sum+value,0);
 assert.equal(round.units.find(u=>u.id==='enemy0').z,10,'distant infantry keeps its post on the opening turn');
 const third=await runWar({seed:42,maxTurns:3});
 assert.ok(third.units.filter(u=>u.team==='ally').some(u=>total(u.hp)<total(u.max)),
  'the enemy engages once the player moves into detection range');
 assert.ok(third.events.filter(e=>e.action==='endTurn').at(-1).log.some(line=>line.startsWith('LINE INFANTRY 1 →')));
 assert.ok(third.units.some(u=>u.kind==='tank'&&!u.alive),'production vehicle can be defeated');
 const citadel=await runWar({seed:31718,contract:0,maxTurns:1,frames:[12,15,16],
  loadouts:[{weapon:'missile',condition:100,upgrade:0},{weapon:'hailstorm',melee:'piledriver',condition:100,upgrade:0},
   {weapon:'rifle',condition:100,upgrade:0}]});
 const barrage=citadel.events.filter(event=>event.actor==='ally0'&&event.action==='attack');
 assert.equal(barrage.length,1);
 assert.ok(barrage[0].log.some(line=>line.includes('marks tile')));
 assert.equal(citadel.turn,2);
 await assert.rejects(runWar({seed:-1}),/uint32/);
 await assert.rejects(runWar({contract:999}),/Invalid contract/);
 await assert.rejects(runWar({maxTurns:0}),/positive integer/);
 console.log('PASS War driver: seeded legal actions, enemy turn, vehicle damage, completion and turn limit');
})().catch(error=>{console.error(error);process.exitCode=1});
