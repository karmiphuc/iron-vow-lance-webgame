const assert=require('node:assert/strict'),createSimulation=require('./sim-harness.cjs');
const playerTurn=`(async()=>{
 for(const ally of battle.units.filter(u=>u.team==='ally'&&u.alive)){
  selected=ally.index;
  if(!ally.skill&&ally.index===2&&ally.hp.body<=ally.max.body-30)skill();
  for(let step=0;step<12&&battle&&ally.alive;step++){
   let targets=battle.units.filter(t=>t.team==='enemy'&&t.alive),w=weapon(ally.weapon);
   if(!targets.length)break;
   const armed=targets.filter(t=>isArmed(t));let available=(armed.length?armed:targets).filter(t=>distance(ally,t)<=w.range).sort((a,b)=>Math.min(a.hp.body,a.hp.right||Infinity)-Math.min(b.hp.body,b.hp.right||Infinity));
   if(available.length&&ally.hp.right>0&&ally.ap>=w.ap){
    if(ally.index<2&&!ally.skill)skill();const target=available[0],part=target.hp.body<=damage(ally,target)?'body':!target.kind&&target.hp.right>0?'right':'body';await engage(ally,target,part,w);if(checkEnd())return;continue;
   }
   if(!movementLimit(ally))break;
   const positions=[...paths(ally)].filter(([,cost])=>cost>0).flatMap(([key,cost])=>{const[x,z]=key.split(',').map(Number);return (targets.some(t=>isArmed(t))?targets.filter(t=>isArmed(t)):targets).map(t=>({x,z,cost,d:Math.abs(t.x-x)+Math.abs(t.z-z),t}))});
   const best=positions.map(p=>({...p,score:Math.max(0,p.d-w.range)*20+p.cost*.5+(Math.max(0,p.cost-freeMovement(ally))>ally.ap-w.ap?4:0)-(inCover(p)?1:0)})).sort((a,b)=>a.score-b.score)[0];
   const old=Math.min(...(targets.some(t=>isArmed(t))?targets.filter(t=>isArmed(t)):targets).map(t=>Math.max(0,distance(ally,t)-w.range)))*20;
   if(!best||best.score>=old)break;
   await moveUnit(ally,best.x,best.z,best.cost);
  }
  if(battle&&ally.alive&&ally.ap>=2&&!ally.brace){startAction(ally);ally.ap-=2;ally.brace=true}
 }
 if(battle)await endTurn();
})()`;
async function play(sim,index){sim.run(`deploy(${index});closeModal()`);let rounds=0;while(sim.run('!!battle')&&rounds++<30)await sim.run(playerTurn);assert.ok(rounds<30,'Mission stalled');return{win:sim.run('save.history.at(-1).win'),rounds,condition:sim.run('save.units.map(u=>u.condition)')}}
if(require.main===module)(async()=>{
 const results=[];for(let seed=1;seed<=12;seed++){const sim=createSimulation({seed});results.push(await play(sim,0));assert.equal(sim.run('validSave(save)'),true);assert.equal(sim.run('save.day'),2);assert.ok(sim.storage.has('iron-vow-career'))}
 const wins=results.filter(r=>r.win).length;console.log('Recruit contract, fresh lance:',wins+'/12 victories; rounds',results.map(r=>r.rounds).join(','));
 // A real career loop, using only earned money and documented refits between sorties.
 const career=createSimulation({seed:19});for(let mission=0;mission<5;mission++){if(mission){career.run(`closeModal();for(const u of save.units){const cost=Math.ceil((100-u.condition)*14);if(save.credits>=cost){save.credits-=cost;u.condition=100}else u.condition=Math.max(u.condition,FIELD_PATCH)};if(!save.owned.includes('rail')&&save.credits>=3600){save.credits-=3600;save.owned.push('rail');save.units[0].weapon='rail'};for(const idx of [0,2,1]){const u=save.units[idx];if(save.credits>=1800+u.upgrade*1200&&u.upgrade<3){save.credits-=1800+u.upgrade*1200;u.upgrade++}};persist()`)}const r=await play(career,[0,1,2,0,3][mission]);console.log('Career sortie',mission+1,JSON.stringify(r));assert.equal(r.win,true,'Earned repairs and refits should support the full contract ladder');}
 const recovery=[];for(let seed=1;seed<=12;seed++){const sim=createSimulation({seed});sim.run('save.credits=0;save.units.forEach(u=>u.condition=FIELD_PATCH)');recovery.push(await play(sim,0))};const recovered=recovery.filter(r=>r.win).length;assert.ok(recovered>=9,'Emergency field patches must support a realistic comeback');console.log('Zero-reserve recovery:',recovered+'/12 victories');
 assert.ok(wins>=9,'Starting contract should be approachable with coordinated normal play');
 console.log('PASS: complete seeded missions resolve without forced kills; rewards, persistent damage, repairs, refits and redeployment exercised.');
})().catch(e=>{console.error(e);process.exitCode=1});

module.exports={play};
