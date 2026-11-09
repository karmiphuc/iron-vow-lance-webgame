const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

(async()=>{
 const sim=simulate({random:()=>0,reducedMotion:true}),{run}=sim;
 run("deploy(0,false,[0]);closeModal();const ally=current(),foe=battle.units[1];foe.x=ally.x+1;foe.z=ally.z");
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
   assert.deepEqual(volley.impacts.map(hit=>hit.part).sort(),['body','left','legs','pilot','right']);
  }
 }
 assert.ok(run("FRAMES.every((_,frame)=>['ally','enemy'].every(team=>dodgeChance({team,frame})===(frame===AERO_FRAME?.15:.08)))"));
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
  const rng=[0,1,.86*chance,1,.91*chance,.98*chance,0,1];
  Math.random=()=>rng[calls++];const partial=planVolley(ally,foe,'body',gun,false)`);
 assert.equal(run('calls'),8,'each rifle round gets its own roll');
 assert.equal(run('partial.landed'),5);
 assert.ok(run('partial.impacts.length>=3'));
 assert.equal(run('partial.impacts.reduce((n,p)=>n+p.amount,0)'),run("Math.round(attackBudget(ally,foe,'body',gun)*5/8)"));
 run("Math.random=()=>0;foe.armor=900;const blast=planVolley(ally,foe,'body',weapon('shotgun'),false)");
 assert.equal(run('blast.impacts.length'),5,'even the minimum landed shell reaches each live part');
 assert.equal(run('blast.impacts.reduce((n,p)=>n+p.amount,0)'),6);
 run("foe.hp.right=0;Math.random=()=>{calls++;return 1};calls=0;const missed=planVolley(ally,foe,'body',weapon('shotgun'),false)");
 assert.equal(run('missed.landed'),0);
 assert.equal(run('calls'),1,'shotgun rolls the shell once');
 run("Math.random=()=>0;foe.shield='bulwark-shield';foe.hp.left=1;const shielded={...foe.hp};const ap=ally.ap");
 await run("shoot(ally,foe,'body',weapon('shotgun'))");
 assert.equal(run('ally.ap'),run('ap-3'));
 assert.equal(run('foe.hp.left'),0);
 assert.ok(run("['body','pilot','right','legs'].every(p=>foe.hp[p]===shielded[p])"));
 run("foe.armor=0;foe.hp={body:1,pilot:1,right:1,left:1,legs:1};delete foe.shield;ally.ap=8;const kills=save.kills;const xp=save.units[0].xp");
 await run("shoot(ally,foe,'body',weapon('shotgun'))");
 assert.ok(run('Object.values(foe.hp).every(hp=>hp===0)'));
 assert.equal(run('foe.hitParts.length'),5);
 assert.equal(run('foe.downReason'),'body');
 assert.equal(run('save.kills'),run('kills+1'));
 assert.equal(run('save.units[0].xp'),run('xp+35'));

 const recovery=simulate(),r=recovery.run;
 r("save.day=4;deploy(1,false,[0]);closeModal();persist()");
 assert.equal(r('battle.units[1].frame'),9);
 const resumed=simulate({storage:new Map(recovery.storage)}),reload=resumed.run;
 assert.equal(reload('battle.units[1].frame'),9,'exact rotated hull survives reload');
 reload("for(const u of battle.units.filter(u=>u.team==='enemy')){u.hp.body=0;beginDestruction(u)};finish(true)");
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
