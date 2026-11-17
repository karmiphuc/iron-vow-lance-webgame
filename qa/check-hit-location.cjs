// Front Mission 3 style hit location: nobody aims, every landed round rolls its own location.
// Shares: body 55 / arms 12.5 each / legs 20 among live non-cockpit parts, cockpit 1-5% per attack that strikes the body (one round at most).
const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

function mulberry32(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const LANDED=24000,TOLERANCE=.015;

(async()=>{
 const sim=simulate({random:mulberry32(20261117),reducedMotion:true}),{run}=sim;
 const SIM=run('window.IRON_VOW_SIM');
 assert.deepEqual({...SIM.HIT_LOCATION},{body:.55,left:.125,right:.125,legs:.20});
 assert.equal(Object.values(SIM.HIT_LOCATION).reduce((a,b)=>a+b,0),1);
 assert.deepEqual([SIM.PILOT_HIT_BASE,SIM.PILOT_HIT_MIN,SIM.PILOT_HIT_MAX],[.03,.01,.05]);
 for(const [pilotHit,expected] of [[undefined,.03],[0,.03],[.10,.05],[.20,.05],[.5,.05],[-.5,.01]])
  assert.ok(Math.abs(SIM.pilotHitChance(pilotHit===undefined?{}:{pilotHit})-expected)<1e-9,'pilot chance for pilotHit '+pilotHit);

 // Fire rifle volleys at a fresh enemy mech until enough rounds have landed. Returns counts by part.
 run(`createBattle(0);selected=0;
  var ally=current(),foe=battle.units.find(u=>u.team==='enemy'&&!u.kind),tank=battle.units.find(u=>u.kind==='tank'),rifle=weapon('rifle');
  foe.x=ally.x+1;foe.z=ally.z;
  globalThis.tally=(attacker,target,w,landedGoal)=>{
   const counts={body:0,pilot:0,left:0,right:0,legs:0},guards=[];let landed=0,rounds=0,volleys=0,guard=0,bodyVolleys=0,cockpitVolleys=0;
   while(landed<landedGoal){
    const v=planVolley(attacker,target,'body',w,false);volleys++;rounds+=v.rounds.length;
    let cp=0,bd=0;for(const r of v.rounds)if(r.hit){counts[r.part]++;landed++;if(r.part==='pilot')cp++;if(r.part==='body')bd++}
    if(cp>1)throw Error('more than one cockpit round in one attack');if(cp||bd)bodyVolleys++;if(cp)cockpitVolleys++;
    guard+=v.guard?1:0;
    for(const i of v.impacts)if(!(i.part in counts)||i.amount<1)throw Error('bad impact '+JSON.stringify(i));
   }
   return JSON.stringify({counts,landed,rounds,volleys,guard,bodyVolleys,cockpitVolleys});
  }`);
 const tally=(attacker,target,weapon='rifle')=>JSON.parse(run(`tally(${attacker},${target},weapon('${weapon}'),${LANDED})`));
 const shares=({counts,landed})=>Object.fromEntries(Object.entries(counts).map(([part,n])=>[part,n/landed]));
 const near=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<=TOLERANCE,`${label}: ${(100*actual).toFixed(2)}% vs ${(100*expected).toFixed(2)}% (±1.5)`);
 // Shares of the non-cockpit rounds, so the cockpit chance does not distort the 55/12.5/12.5/20 table.
 const frame=result=>{const rest=result.landed-result.counts.pilot;return Object.fromEntries(['body','left','right','legs'].map(part=>[part,result.counts[part]/rest]))};

 // 1. Fresh mech, default training: 55 / 12.5 / 12.5 / 20 and a cockpit share of 1-5%.
 const fresh=tally('ally','foe');
 assert.ok(fresh.landed>=20000);
 let f=frame(fresh);
 near(f.body,.55,'body');near(f.left,.125,'left arm');near(f.right,.125,'right arm');near(f.legs,.20,'legs');
 // Cockpit is rolled once per attack that strikes the body, not per round.
 const cockpit=fresh.cockpitVolleys/fresh.bodyVolleys;
 assert.ok(fresh.bodyVolleys>=2000,'enough attacks: '+fresh.bodyVolleys);
 assert.ok(Math.abs(cockpit-.03)<.012,'default cockpit chance per body-hitting attack is about 3%: '+(100*cockpit).toFixed(2)+'%');
 assert.equal(fresh.guard,0);

 // 2. Training raises the cockpit chance but never past 5%.
 run("ally.training={pilotHit:.10}");
 const trained=tally('ally','foe');
 assert.ok(Math.abs(trained.cockpitVolleys/trained.bodyVolleys-.05)<.014,'Cockpit Read lifts the cockpit chance to 5% per attack');
 run("ally.training={pilotHit:.5}");
 {const c=tally('ally','foe');assert.ok(c.cockpitVolleys/c.bodyVolleys<=.064,'the cockpit chance is clamped at 5% per attack');}
 run("delete ally.training");

 // 3. Destroyed parts never take hits and the remaining weights renormalise.
 run("foe.hp.right=0;foe.hp.legs=0");
 const arm=tally('ally','foe');
 assert.equal(arm.counts.right+arm.counts.legs,0,'destroyed parts take no hits');
 f=frame(arm);near(f.body,.55/.675,'body without right arm and legs');near(f.left,.125/.675,'left arm without right arm and legs');
 run("foe.hp.pilot=0");
 assert.equal(tally('ally','foe').counts.pilot,0,'a destroyed cockpit takes no hits');
 run("foe.hp.right=foe.max.right;foe.hp.legs=foe.max.legs;foe.hp.left=0");
 const noLeft=tally('ally','foe');
 assert.equal(noLeft.counts.left+noLeft.counts.pilot,0);
 f=frame(noLeft);near(f.body,.55/.875,'body without left arm');near(f.right,.125/.875,'right arm without left arm');near(f.legs,.20/.875,'legs without left arm');
 run("foe.hp.pilot=foe.max.pilot;foe.hp.left=foe.max.left");

 // 4. A vehicle only has a hull: it always takes the body.
 const hull=tally('ally','tank');
 assert.deepEqual(hull.counts,{body:hull.landed,pilot:0,left:0,right:0,legs:0});

 // 5. An active shield turns every landed hit into a hit on the left arm.
 run("foe.shield='citadel-shield'");
 assert.ok(run('activeShield(foe)'));
 const shield=tally('ally','foe');
 assert.deepEqual(shield.counts,{body:0,pilot:0,left:shield.landed,right:0,legs:0});
 assert.ok(shield.guard>0);
 // ...until the shield arm is gone, after which the normal table applies again.
 run("foe.hp.left=0");
 assert.equal(run('activeShield(foe)'),undefined);
 const broken=tally('ally','foe');
 assert.equal(broken.counts.left,0);assert.ok(broken.counts.body>0&&broken.counts.legs>0&&broken.counts.right>0);
 run("delete foe.shield;foe.hp.left=foe.max.left");

 // 6. A Breach charged shot rolls only among live limbs (arms 25 : legs 20) with the old limb accuracy.
 run("ally.breach=1");
 const body=run("hitChance(ally,foe,'body',rifle)"),limb=run("hitChance(ally,foe,'right',rifle)");
 assert.ok(run("chargedLimbShot(ally,rifle,'body',false)")&&!run("chargedLimbShot(ally,rifle,'body',true)"),'charged regardless of the passed part, never for a reaction');
 const charged=tally('ally','foe');
 assert.equal(charged.counts.body+charged.counts.pilot,0,'a charged shot never hits the body or cockpit while a limb lives');
 const limbs=charged.landed;
 near(charged.counts.right/limbs,.125/.45,'charged right arm');near(charged.counts.left/limbs,.125/.45,'charged left arm');near(charged.counts.legs/limbs,.20/.45,'charged legs');
 assert.ok(Math.abs(charged.landed/charged.rounds-limb)<.02,'charged shots use limb accuracy');
 run("foe.hp.legs=0");
 const noLegs=tally('ally','foe');
 assert.equal(noLegs.counts.body+noLegs.counts.pilot+noLegs.counts.legs,0);
 near(noLegs.counts.right/noLegs.landed,.5,'charged right arm without legs');
 run("foe.hp.right=0;foe.hp.left=0");
 const bodyOnly=tally('ally','foe');
 assert.equal(bodyOnly.counts.body,bodyOnly.landed,'with no limb alive a charged shot falls back to the body');
 run("foe.hp.right=foe.max.right;foe.hp.left=foe.max.left;foe.hp.legs=foe.max.legs;delete ally.breach");
 assert.ok(limb<=body,'a limb shot is never easier than a body shot');

 // 7. The charge is spent once per charged shot, whichever part the caller passes, and only limbs are hurt.
 run("ally.breach=2;ally.ap=8;foe.hp={...foe.max};var before=JSON.stringify([foe.hp.body,foe.hp.pilot]);Math.random=()=>0");
 await run("shoot(ally,foe,'body',rifle)");
 assert.equal(run('ally.breach'),1);
 assert.equal(run('JSON.stringify([foe.hp.body,foe.hp.pilot])'),run('before'));
 assert.ok(run("foe.hp.right<foe.max.right||foe.hp.left<foe.max.left||foe.hp.legs<foe.max.legs"));
 await run("ally.ap=8;shoot(ally,foe,'body',rifle)");
 assert.equal(run('ally.breach'),undefined);

 // 8. The preview and the volley agree that nothing is aimed: the body chance is used for normal shots.
 assert.equal(run("shotPart(ally,rifle,false)"),'body');
 console.log('PASS hit location: '+fresh.landed+' landed rounds at 55/12.5/12.5/20 with cockpit hits on '+(100*cockpit).toFixed(1)+'% of body-hitting attacks, renormalised weights, shields, vehicles and Breach charges');
})().catch(error=>{console.error(error);process.exitCode=1});
