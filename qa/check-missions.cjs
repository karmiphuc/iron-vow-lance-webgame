const assert=require('node:assert/strict'),createSimulation=require('./sim-harness.cjs');
const playerTurn=`(async()=>{
 const dangerArm=t=>(t.frame===VANGUARD_FRAME||t.frame===AERO_FRAME)&&t.hp.left>0?'left':'right';
 for(const ally of battle.units.filter(u=>u.team==='ally'&&u.alive)){
  selected=ally.index;
  if(!ally.skill&&ally.index===2&&ally.hp.body<=ally.max.body-30)skill();
  for(let step=0;step<12&&battle&&ally.alive;step++){
   let targets=battle.units.filter(t=>t.team==='enemy'&&t.alive),w=weapon(ally.weapon);
   if(!targets.length)break;
   const armed=targets.filter(t=>isArmed(t)),priority=armed.length?armed:targets;
   const available=priority.filter(t=>distance(ally,t)<=w.range&&!attackObstruction(ally,t,w)).sort((a,b)=>Math.min(a.hp.body,a.hp[dangerArm(a)]||Infinity)-Math.min(b.hp.body,b.hp[dangerArm(b)]||Infinity));
   if(available.length&&ally.hp.right>0&&ally.ap>=w.ap){
    if(ally.index<2&&!ally.skill)skill();const target=available[0],part=target.hp.body<=damage(ally,target)?'body':!target.kind&&target.hp[dangerArm(target)]>0?dangerArm(target):'body';await engage(ally,target,part,w);if(checkEnd())return;continue;
   }
   if(!movementLimit(ally))break;
   const firingScore=(a,t)=>Math.max(0,distance(a,t)-w.range)*20+(attackObstruction(a,t,w)?12+distance(a,t)*2:0);
   const positions=[...paths(ally)].filter(([,cost])=>cost>0).flatMap(([key,cost])=>{const[x,z]=key.split(',').map(Number);return priority.map(t=>({x,z,cost,t}))});
   const best=positions.map(p=>({...p,score:firingScore(p,p.t)+p.cost*.5+(Math.max(0,p.cost-freeMovement(ally))>ally.ap-w.ap?4:0)-(inCover(p)?1:0)})).sort((a,b)=>a.score-b.score)[0];
   const old=Math.min(...priority.map(t=>firingScore(ally,t)));
   if(!best||best.score>=old)break;
   await moveUnit(ally,best.x,best.z,best.cost);
  }
  if(battle&&ally.alive&&ally.ap>=2&&!ally.brace){startAction(ally);ally.ap-=2;ally.brace=true}
 }
 if(battle)await endTurn();
})()`;
async function play(sim,index,slots=[0,1,2]){sim.run(`deploy(${index},false,${JSON.stringify(slots)});closeModal()`);let rounds=0;while(sim.run('!!battle')&&rounds++<30)await sim.run(playerTurn);assert.equal(sim.run('!!battle'),false,'Mission stalled');return{win:sim.run('save.history.at(-1).win'),rounds,condition:sim.run('save.units.map(u=>u.condition)')}}
if(require.main===module)(async()=>{
 const results=[];for(let seed=1;seed<=12;seed++){const sim=createSimulation({seed});results.push(await play(sim,0));assert.equal(sim.run('validSave(save)'),true);assert.equal(sim.run('save.day'),2);assert.ok(sim.storage.has('iron-vow-career'))}
 const wins=results.filter(r=>r.win).length;console.log('Recruit contract, fresh lance:',wins+'/12 victories; rounds',results.map(r=>r.rounds).join(','));
 for(const slots of [[0],[1],[2],[0,2]]){
  let wins=0;
  for(let seed=1;seed<=12;seed++)if((await play(createSimulation({seed}),0,slots)).win)wins++;
  assert.ok(wins>=9,'Picket must support smaller sorties');
  console.log('Picket seats '+slots.join(',')+': '+wins+'/12 victories');
 }
 // A real career loop, spending earned credits and training points between sorties.
 const career=createSimulation({seed:19});
 const ladder=[0,1,2,0,3];
 for(const [mission,contract] of ladder.entries()){
  if(mission)career.run(`
   closeModal();
   for(const i of LANCE_SLOTS)for(const path of PILOT_TREES[pilotClass(i)])for(const node of path.nodes)learnTraining(i,node.id);
   for(const u of save.units){
    const cost=Math.ceil((100-u.condition)*14);
    if(save.credits>=cost){save.credits-=cost;u.condition=100}
    else u.condition=Math.max(u.condition,FIELD_PATCH);
   }
   for(const [slot,id] of [[0,'rail'],[1,'watchman']]){
    const {price}=weapon(id);
    if(save.owned.includes(id)||save.credits<price)continue;
    save.credits-=price;save.owned.push(id);save.units[slot].weapon=id;
   }
   for(const idx of [0,2,1]){
    const u=save.units[idx],cost=1800+u.upgrade*1200;
    if(save.credits>=cost&&u.upgrade<3){save.credits-=cost;u.upgrade++}
   }
   persist();
  `);
  const result=await play(career,contract);
  console.log('Career sortie',mission+1,JSON.stringify(result));
  assert.equal(result.win,true,'Earned refits and training should support the full contract ladder');
 }
 const recovery=[];for(let seed=1;seed<=12;seed++){const sim=createSimulation({seed});sim.run('save.credits=0;save.units.forEach(u=>u.condition=FIELD_PATCH)');recovery.push(await play(sim,0))};const recovered=recovery.filter(r=>r.win).length;assert.ok(recovered>=9,'Emergency field patches must support a realistic comeback');console.log('Zero-reserve recovery:',recovered+'/12 victories');
 assert.ok(wins>=9,'Starting contract should be approachable with coordinated normal play');
 console.log('PASS: complete seeded missions resolve without forced kills; rewards, persistent damage, repairs, refits and redeployment exercised.');
})().catch(e=>{console.error(e);process.exitCode=1});

module.exports={play};
