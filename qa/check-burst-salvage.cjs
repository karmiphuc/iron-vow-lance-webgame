const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

(async()=>{
 const sim=simulate({random:()=>0,reducedMotion:true}),{run}=sim;
 run("deploy(0,false,[0]);closeModal();const ally=current(),foe=battle.units[1];foe.x=ally.x+1;foe.z=ally.z");
 // Scripted draws in the order planVolley asks for them: a to-hit roll per round (one per shell), a location per
 // landed round, then ONE cockpit check per attack when a body round landed (>=1-pilot chance turns the first body round into the cockpit).
 // Targets list body, right, left, legs.
 run("globalThis.script=values=>{let i=0;Math.random=()=>{if(i>=values.length)throw Error('unexpected random draw');return values[i++]};return()=>i};");
 const LOCATIONS=[[.1,'body'],[.6,'right'],[.7,'left'],[.9,'legs']];
 const scatterDraws=count=>[0,...Array.from({length:count},(_,i)=>LOCATIONS[i%4][0]),.999];
 const scatterParts=count=>Array.from({length:count},(_,i)=>i===0?'pilot':LOCATIONS[i%4][1]);
 assert.ok(run("RANGED.filter(w=>armoryClass(w)==='assault').every(w=>w.burst)"));
 for(const [id,count,scatter=false] of [['rifle',8],['sidewinder',12],['trident',8],['forge',12,true],['ember',12,true],['hailstorm',12],
  ['shotgun',12,true],['needle-carbine',8],['flechette-scattergun',12,true]]){
  const volley=JSON.parse(run(`JSON.stringify(planVolley(ally,foe,'body',weapon('${id}'),false))`));
  assert.equal(volley.rounds.length,count);
  assert.equal(volley.landed,count);
  assert.equal(volley.impacts.reduce((n,p)=>n+p.amount,0),
   run(`Math.round(partDamage(ally,foe,'body',weapon('${id}'))*1.15)`));
  const profile=JSON.parse(run(`JSON.stringify(attackProfile(ally,'${id}'))`));
  assert.equal(profile.beats.length,scatter?1:count);
  if(scatter){
   assert.equal(profile.effect||id,'shotgun');
   // With nothing rolled the pellets all land on the body. Each pellet then rolls its own location.
   assert.deepEqual(volley.impacts.map(hit=>hit.part),['body']);
   run(`script(${JSON.stringify(scatterDraws(count))})`);
   const spread=JSON.parse(run(`JSON.stringify(planVolley(ally,foe,'body',weapon('${id}'),false))`));
   assert.deepEqual(spread.rounds.map(round=>round.part),scatterParts(count));
   assert.deepEqual(spread.impacts.map(hit=>hit.part).sort(),['body','left','legs','pilot','right']);
   for(const {part,amount} of spread.impacts){
    const n=scatterParts(count).filter(p=>p===part).length;
    assert.equal(amount,Math.max(1,Math.round(run(`attackBudget(ally,foe,'${part}',weapon('${id}'))`)*n/count)),id+' '+part+' is charged for its own pellets only');
   }
   run('Math.random=()=>0');
  }
 }
 assert.ok(run("FRAMES.every((_,frame)=>['ally','enemy'].every(team=>dodgeChance({team,frame})===([AERO_FRAME,NIGHTJAR_FRAME].includes(frame)?.15:frame===SAKER_FRAME?.13:.08)))"));
 assert.equal(run("dodgeChance({frame:0,kind:'tank'})"),0);
 run(`let evadeRolls=0;Math.random=()=>{evadeRolls++;return .93};
  const evadedShell=planVolley(ally,foe,'body',weapon('ember'),false);
  Math.random=()=>.90;
  const standard=planVolley(ally,foe,'body',weapon('forge'),false);
  const aero=planVolley(ally,{...foe,frame:AERO_FRAME},'body',weapon('forge'),false)`);
 assert.equal(run('evadeRolls'),1);
 assert.ok(run('evadedShell.dodged&&evadedShell.landed===0&&aero.dodged&&!standard.dodged'));
 run(`const gun=weapon('rifle'),chance=hitChance(ally,foe,'body',gun);
  let calls=0;
  const rng=[0,.1,1,.86*chance,.6,1,.91*chance,.7,.98*chance,.9,0,.1,1,.001];
  Math.random=()=>rng[calls++];const partial=planVolley(ally,foe,'body',gun,false)`);
 assert.equal(run('calls'),14,'each rifle round gets its own to-hit roll, each landed round one location and the attack one cockpit check');
 assert.equal(run('partial.landed'),5);
 assert.deepEqual(JSON.parse(run('JSON.stringify(partial.rounds.map(r=>r.hit?r.part:null))')),['body',null,'right',null,'left','legs','body',null]);
 for(const [part,n] of [['body',2],['right',1],['left',1],['legs',1]]){
  assert.equal(run(`partial.impacts.find(i=>i.part==='${part}').amount`),run(`Math.max(1,Math.round(attackBudget(ally,foe,'${part}',gun)*${n}/8))`));
 }
 run("foe.armor=900;calls=0");
 run(`script(${JSON.stringify(scatterDraws(12))});const blast=planVolley(ally,foe,'body',weapon('shotgun'),false)`);
 assert.equal(run('blast.impacts.length'),5,'even the minimum landed shell reaches each part it strikes');
 assert.ok(run('blast.impacts.every(i=>i.amount>=1)'));
 run("Math.random=()=>0;foe.hp.right=0;Math.random=()=>{calls++;return 1};calls=0;const missed=planVolley(ally,foe,'body',weapon('shotgun'),false)");
 assert.equal(run('missed.landed'),0);
 assert.equal(run('calls'),1,'shotgun rolls the shell once');
 run("Math.random=()=>0;foe.shield='bulwark-shield';foe.hp.left=1;const shielded={...foe.hp};const ap=ally.ap");
 await run("shoot(ally,foe,'body',weapon('shotgun'))");
 assert.equal(run('ally.ap'),run('ap-3'));
 assert.equal(run('foe.hp.left'),0);
 assert.ok(run("['body','pilot','right','legs'].every(p=>foe.hp[p]===shielded[p])"));
 run("foe.armor=0;foe.hp={body:1,pilot:1,right:1,left:1,legs:1};delete foe.shield;ally.ap=8;const kills=save.kills;const xp=save.units[0].xp");
 run(`script(${JSON.stringify(scatterDraws(12))})`);
 await run("shoot(ally,foe,'body',weapon('shotgun'))");
 assert.ok(run('Object.values(foe.hp).every(hp=>hp===0)'));
 assert.equal(run("new Set(effects.filter(e=>e.type==='boom').slice(-12).map(e=>e.part)).size"),5);
 assert.equal(run('foe.downReason'),'body');
 assert.equal(run('save.kills'),run('kills+1'));
 assert.equal(run('save.units[0].xp'),run('xp+35'));

 const destroyed=simulate(),d=destroyed.run;
 d(`createBattle(0,false,false,[0]);const ownedBefore=save.owned.length;
  const payBefore=worldContractPay(battle.contract,1,battle.offer);
  for(const u of battle.units.filter(u=>u.team==='enemy')){
   u.hp.body=0;if(!u.kind)u.hp.pilot=0;beginDestruction(u);
  }
  finish(true)`);
 assert.equal(d('save.salvage'),undefined,'a simultaneous hull and pilot kill destroys the hull');
 assert.equal(d('save.captured'),undefined);
 assert.equal(d('save.owned.length'),d('ownedBefore'));
 assert.equal(d('save.history.at(-1).pay'),d('payBefore'));
 assert.doesNotMatch(destroyed.node('#modal').innerHTML,/VIEW SALVAGE|SCRAP BONUS|EQUIPMENT RECOVERED/);

 const recovery=simulate(),r=recovery.run;
 r("save.day=4;deploy(1,false,[0]);closeModal()");
 assert.equal(r('battle.units[1].frame'),9);
 r("const casualty=battle.units[1];casualty.hp.pilot=0;beginDestruction(casualty,'pilot');persist()");
 const resumed=simulate({storage:new Map(recovery.storage)}),reload=resumed.run;
 assert.equal(reload('battle.units[1].frame'),9,'exact rotated hull survives reload');
 assert.equal(reload('battle.units[1].downReason'),'pilot');
 reload("for(const u of battle.units.filter(u=>u.team==='enemy'&&u.alive)){u.hp.body=0;beginDestruction(u)}finish(true)");
 assert.equal(reload('save.salvage[9]'),1);
 assert.equal(reload('save.salvage[0]'),undefined);
 reload("save.credits=rebuildPrice(9);acquireHull(9,true)");
 assert.equal(reload('hullOwned(9)'),true);
 assert.equal(reload('save.reserve[9].weapon'),'shotgun');
 const previous=simulate(),legacy=previous.run;
 legacy("save.day=4;createBattle(1,false,false,[0],true,null,0,true,true,true,true,true,true,null,0);persist()");
 const restored=simulate({storage:new Map(previous.storage)});
 assert.equal(restored.run('battle.units[1].frame'),0,'older Relay checkpoint keeps its Warden');
 console.log('PASS burst counts, independent misses, scatter, chassis evasion, capped damage, shield break, one kill and XP award, and rotated salvage reload/rebuild.');
})().catch(error=>{console.error(error);process.exitCode=1});
