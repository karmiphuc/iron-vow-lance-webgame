const assert=require('node:assert/strict'),createSimulation=require('./sim-harness.cjs');
const playerTurn=`(async()=>{
 for(const ally of battle.units.filter(u=>u.team==='ally'&&u.alive)){
  selected=ally.index;
  if(!ally.skill&&ally.index===2&&ally.hp.body<=ally.max.body-30)skill();
  for(let step=0;step<12&&battle&&ally.alive;step++){
   let targets=battle.units.filter(t=>t.team==='enemy'&&t.alive),w=unitWeapon(ally);
   if(!targets.length)break;
   const armed=targets.filter(t=>isArmed(t)),priority=armed.length?armed:targets;
   const available=priority.filter(t=>distance(ally,t)<=w.range&&!attackObstruction(ally,t,w)).sort((a,b)=>a.hp.body-b.hp.body);
   const canShoot=available.length&&canUseWeapon(ally,w);
   const firingScore=(a,t)=>{
    const enemyWeapon=unitWeapon(t),firingLane=distance(a,t)<=enemyWeapon.range&&!attackObstruction(t,a,enemyWeapon);
    const returnAim=firingLane?highGroundAim(t,a,enemyWeapon):0;
    return Math.max(0,distance(a,t)-w.range)*20+(attackObstruction(a,t,w)?12+distance(a,t)*2:0)-highGroundAim(a,t,w)*22+returnAim*24-(inCover(a)?3:0);
   };
   const positions=[...movementPlans(ally).values()].filter(plan=>plan.tiles>0).flatMap(plan=>priority.map(t=>({...plan,t})));
   const best=positions.filter(p=>!canShoot||(p.ap+w.ap<=ally.ap&&distance(p,p.t)<=w.range&&!attackObstruction(p,p.t,w)))
    .map(p=>({...p,score:firingScore(p,p.t)+p.tiles*.5+p.ap+(p.ap>ally.ap-w.ap?4:0)})).sort((a,b)=>a.score-b.score)[0];
   const old=Math.min(...(canShoot?available:priority).map(t=>firingScore(ally,t)));
   if(best&&best.score<old-(canShoot?2:0)){
    await moveUnit(ally,best.x,best.z);continue;
   }
   if(!canShoot)break;
   if(ally.index<2&&!ally.skill)skill();
   await engage(ally,available[0],'body',w);if(checkEnd())return;
  }
  if(battle&&ally.alive&&ally.ap>=2&&!ally.brace){ally.ap-=2;ally.brace=true}
 }
 if(battle)await endTurn();
})()`;
async function play(sim,index,slots=[0,1,2]){sim.run(`deploy(${index},false,${JSON.stringify(slots)});closeModal()`);let rounds=0;while(sim.run('!!battle')&&rounds++<30)await sim.run(playerTurn);assert.equal(sim.run('!!battle'),false,sim.run(`battle&&JSON.stringify({stall:battle.contract.name,log:battle.log,units:battle.units.filter(u=>u.alive).map(({name,weapon,hp,x,z})=>({name,weapon,hp,x,z}))})`)||'Mission stalled');return{win:sim.run('save.history.at(-1).win'),rounds,condition:sim.run('save.units.map(u=>u.condition)')}}
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
 for(const seed of [5,8])await checkCareer(seed);
 const recovery=[];for(let seed=1;seed<=12;seed++){const sim=createSimulation({seed});sim.run('save.credits=0;save.units.forEach(u=>u.condition=FIELD_PATCH)');recovery.push(await play(sim,0))};const recovered=recovery.filter(r=>r.win).length;assert.ok(recovered>=9,'Emergency field patches must support a realistic comeback');console.log('Zero-reserve recovery:',recovered+'/12 victories');
 assert.ok(wins>=9,'Starting contract should be approachable with coordinated normal play');
 console.log('PASS: complete seeded missions resolve without forced kills; rewards, persistent damage, repairs, refits and redeployment exercised.');
})().catch(e=>{console.error(e);process.exitCode=1});

async function checkCareer(seed){
 const career=createSimulation({seed});
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
   // Burst fire spreads its damage across rolled locations; prioritize live bodies above disabled limbs.
   for(const [slot,id] of [[0,'trident'],[1,'watchman']]){
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
  console.log('Career seed',seed,'sortie',mission+1,JSON.stringify(result));
  assert.equal(result.win,true,'Earned refits and training should support the full contract ladder');
 }
}

module.exports={play};
