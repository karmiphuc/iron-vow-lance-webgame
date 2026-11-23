const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

const cases=[
 {port:'ridge',frame:24,mission:'whiteout-patrol',hostiles:[24],weapon:'shotgun'},
 {port:'corridor',frame:25,mission:'kiln-nine',hostiles:[25,23],weapon:'rifle'},
 {port:'frontier',frame:26,mission:'broken-grid',hostiles:[26,24],weapon:'vyzov-knuckle'}
];
for(const {port,frame,mission,hostiles,weapon} of cases){
 const game=simulate(),{run}=game;
 run('ensureWorld();save.credits=400000;persist()');
 assert.deepEqual(JSON.parse(run(`JSON.stringify(livingNetwork.ports.filter(p=>portStock(p.id).frames.includes(${frame})).map(p=>p.id))`)),[port]);
 assert.equal(run(`buyPortHull(${frame},'${port}')||acquireHull(${frame})||assignChassis(0,${frame})`),false);
 run(`save.overworld={port:'${port}',arrears:0};persist()`);
 const price=run(`portStockPrice(FRAMES[${frame}].cost,'${port}')`);
 assert.ok(run(`buyPortHull(${frame})&&assignChassis(0,${frame})&&validSave(save)`));
 assert.equal(run('save.credits'),400000-price);
 assert.equal(run('save.units[0].weapon'),weapon);
 const offerId=run(`availableOffers('${port}').find(o=>CONTRACTS[o.templateIndex].id==='${mission}').id`);
 game.node('#aux-pilot').options=[];game.node('#use-aux').checked=false;
 run(`prepareWorldOffer(${JSON.stringify(offerId)})`);
 game.node('#modal-1').onclick();
 assert.equal(run('battle.contract.id'),mission);
 assert.deepEqual(JSON.parse(run("JSON.stringify(battle.units.filter(u=>u.team==='enemy'&&!u.kind).map(u=>u.frame))")),hostiles);
 const loaded=simulate({storage:new Map(game.storage)}),check=loaded.run;
 assert.equal(check('battle?.offer.id'),offerId);
 assert.equal(check('current().frame'),frame);
 assert.equal(check('unitWeapon(current()).id'),weapon);
 assert.ok(check(`save.world.consumed.includes('${offerId}')&&battle.mechComputers`));
 check("const a=current(),t=battle.units.find(u=>u.team==='enemy');a.x=2;a.z=t.z=4;t.x=4;const shot=unitWeapon(a)");
 if(frame===24)assert.ok(check("a.mechState={moved:1};Math.abs(mechAim(a,t,shot,false)-.08)<1e-9&&((t.x=6),mechAim(a,t,shot,false)===0)"));
 if(frame===25)assert.ok(check("t.x=7;Math.abs(mechAim(a,t,shot,false)-.06)<1e-9&&((a.mechState={moved:1}),mechAim(a,t,shot,false)===0)"));
 if(frame===26)assert.ok(check("t.x=3;t.brace=true;const powered=damage(a,t,shot);a.mechSkills=null;powered>damage(a,t,shot)&&shot.melee&&shot.range===1"));
}
console.log('PASS regional exclusivity, port purchases, assignments, rival rosters, accepted contract reloads and all three signature effects');

const fixture=require('./fixtures/broken-grid-spent-mortar.json');
const resumed=simulate({storage:new Map([['iron-vow-career',JSON.stringify(fixture)]])});
assert.ok(resumed.run("battle.contract.id==='broken-grid'&&current().tacticalUsed&&!canTactical(current())"));
assert.ok(resumed.run("battle.units.some(u=>u.team==='enemy'&&u.frame===VYZOV_FRAME&&!u.tacticalUsed)"));

// Use the resolved health delta, including the critical-hit stage after armor.
async function checkFistBalance(){
 const {run}=simulate({reducedMotion:true,random:()=>.1});
 run(`
  const prepare=frame=>{
   battle=null;Object.assign(save.units[0],stockHull(frame),{frame});createBattle(1,false,true,[0]);enableMechComputers();
   const actor=current(),target=battle.units.find(u=>u.team==='enemy'&&!u.kind);
   actor.x=2;actor.z=target.z=4;target.x=3;target.armor=5;target.brace=false;target.reacted=true;
   return [actor,target];
  };
  let [actor,target]=prepare(VYZOV_FRAME),hp=target.hp.body;
 `);
 assert.equal(run("unitWeapon(actor).damage"),20);
 await run("engage(actor,target,'body',unitWeapon(actor))");
 assert.equal(run("hp-target.hp.body"),15,'stock Vyzov lands a 15 HP punch into five armor');
 run("[actor,target]=prepare(HUSKY_FRAME);actor.hp.right=0;const fist=reactionWeapon(actor,target);hp=target.hp.body;");
 assert.equal(run("fist.id"),'free-hand');
 await run("shoot(actor,target,'body',fist,true)");
 assert.equal(run("hp-target.hp.body"),5,'a stock Husky fallback punch pays armor');
 run("actor.level=50;actor.training={meleeHit:2};ruleRandom=()=>.85;const legs=target.hp.legs;");
 await run("shoot(actor,target,'body',fist,true)");
 assert.equal(run("legs-target.hp.legs"),10,'a high-level critical free-hand reaction respects its final cap');
 console.log('PASS actual fist hits against five armor: Vyzov 15 HP, Husky 5 HP, boosted Husky capped at 10 HP');
}
checkFistBalance().catch(error=>{console.error(error);process.exitCode=1;});
