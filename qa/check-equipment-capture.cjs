const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');
const checkpoint=require('./fixtures/equipment-capture.json');

(async()=>{
 const sim=simulate({reducedMotion:true}),{run}=sim;
 assert.equal(run("availableCopies('rifle')"),0);
 assert.equal(run("portStock('picket').weapons.includes('trident')"),true);
 assert.equal(run("portStock('relay').weapons.includes('rail')"),true);
 assert.notEqual(run("portStock('picket').weapons.join('/')"),run("portStock('relay').weapons.join('/')"));
 const rotations=new Set();
 for(let day=1;day<=8;day++)rotations.add(run(`save.day=${day};portStock('picket').weapons.join('/')`));
 assert.ok(rotations.size>1,'stock rotates on the next campaign day');
 run('save=fresh();save.credits=24000');
 const tridentPrice=run("weapon('trident').price");
 assert.equal(run("equipWeapon('trident');selected=1;equipWeapon('trident');copies(save.owned,'trident')"),2);
 assert.equal(run('save.credits'),24000-2*tridentPrice,'two fitted items cost two purchases');
 assert.equal(run("equipWeapon('trident');copies(save.owned,'trident')"),2);
 assert.equal(run("equipWeapon('rifle');availableCopies('trident')"),1);
 assert.equal(run("selected=2;equipWeapon('trident');availableCopies('trident')"),0);
 assert.equal(run('save.credits'),24000-2*tridentPrice,'a released spare can be transferred without paying again');
 assert.equal(run("save.units[2].shoulder"),'missile');
 assert.equal(run("equipWeapon('cleaver','right');equipWeapon('bulwark-shield');validSave(save)"),true);
 assert.equal(run("save.units[2].weapon===null&&save.units[2].meleeHand==='right'&&save.units[2].shoulder==='missile'"),true);
 assert.equal(run("validSave({...save,owned:save.owned.filter(id=>id!=='missile')})"),false);
 run('createBattle(0);selected=2;const ally=current(),foe=battle.units.find(u=>u.team==="enemy"&&!u.kind);battle.cover.clear();foe.x=ally.x+1;foe.z=ally.z');
 assert.equal(run("reactionWeapon(ally,foe).id"),'cleaver');
 assert.equal(run('animationPose({...ally,shoulder:null},0).strikeKind'),null);
 assert.equal(run("canUseWeapon(ally,shoulderWeapon(ally))"),true);
 run('ally.hp.right=0');
 assert.equal(run("canUseWeapon(ally,meleeWeapon(ally))"),false);
 assert.equal(run("canUseWeapon(ally,shoulderWeapon(ally))"),true,'the intact left pod remains');
 assert.equal(run("salvoWeapon(ally,shoulderWeapon(ally)).rounds"),1);
 assert.equal(run("salvoWeapon({...ally,hp:{...ally.hp,right:1}},shoulderWeapon(ally)).rounds"),2);
 for(const [frame,id] of [[2,'missile'],[4,'locust']]){
  run(`var rackTest={...ally,frame:${frame},shoulder:'${id}',hp:{...ally.hp,left:100,right:100},ap:8}`);
  for(const arm of ['left','right']){
   run(`rackTest.hp.left=rackTest.hp.right=100;rackTest.hp.${arm}=0;ruleRandom=()=>0;effects=[]`);
   await run("shoot(rackTest,foe,'body',shoulderWeapon(rackTest))");
   assert.equal(run("effects.find(e=>e.type==='shot').contacts.length"),1,frame+' '+arm+' loses one rocket');
   run('rackTest.ap=8;foe.hp={...foe.max}');
  }
  assert.equal(run("canUseWeapon({...rackTest,hp:{...rackTest.hp,left:0,right:0}},shoulderWeapon(rackTest))"),false);
 }
 assert.equal(run("canUseWeapon({...ally,frame:3},weapon('missile'))"),false,'right-only shoulder is disabled by right arm loss');
 assert.equal(run("canUseWeapon({...ally,frame:3,hp:{...ally.hp,right:1,left:0}},weapon('missile'))"),true);


 run("battle=null;save.credits=FRAMES[4].cost+10000;assignChassis(1,4);selected=1;equipWeapon('rifle');equipWeapon('citadel-shield')");
 assert.equal(run('validSave(save)'),true);
 assert.equal(run("shoulderWeapon({...save.units[1],frame:4}).id"),'locust');
 assert.equal(run("save.units[1].weapon+'/'+save.units[1].shield"),'rifle/citadel-shield');
 assert.equal(run("save.reserve[1].weapon"),'rifle','stored hulls keep their fitted items');

 const resumed=simulate({storage:new Map([['iron-vow-career',JSON.stringify(checkpoint)]]),reducedMotion:true});
 const battleRun=resumed.run;
 assert.equal(battleRun('battle.units.filter(u=>u.surrendered).length'),1);
 assert.equal(battleRun("battle.units.find(u=>u.surrendered).weapon"),'trident');
 assert.equal(battleRun("battle.units.find(u=>u.surrendered).hp.body"),20);
 assert.equal(battleRun("battle.units.find(u=>u.surrendered).downReason"),'surrender');
 assert.equal(battleRun("copies(save.owned,'trident')"),0,'gear is awarded only when the sortie is won');
 battleRun("const pilot=current(),target=battle.units.find(u=>u.team==='enemy'&&!u.kind&&u.alive);target.hp.right=0;target.weapon='rifle';target.melee=null;target.shoulder=null;let rolls=0;captureRandom=()=>{rolls++;return .3}");
 assert.equal(battleRun('surrenderEligible(target,[pilot])'),true);
 assert.equal(battleRun("surrenderEligible({...target,shoulder:'missile'},[pilot])"),true);
 for(const [part,max,at,surrenders] of [['pilot',80,8,false],['pilot',80,7,true],['body',200,30,false],['body',200,29,true],['right',100,15,false],['right',100,14,true]]){
  assert.equal(battleRun(`surrenderEligible({...target,max:{...target.max,${part}:${max}},hp:{...target.max,${part}:${at}}},[pilot])`),surrenders,part+' '+at);
 }
 assert.equal(battleRun("surrenderEligible({...target,kind:'tank'},[pilot])"),false);
 assert.equal(battleRun("surrenderEligible({...target,melee:'cleaver',hp:{...target.hp,legs:0}},[pilot])"),true);
 assert.equal(battleRun('trySurrender(target,[pilot])'),false,'exactly 30% is outside the surrender interval');
 assert.equal(battleRun('rolls'),1);
 battleRun('captureRandom=()=>.2999');
 assert.equal(battleRun('trySurrender(target,[pilot])'),true);
 battleRun('for(const u of battle.units)if(u.team==="enemy")u.alive=false;checkEnd()');
 assert.equal(battleRun('battle'),null);
 assert.equal(battleRun('save.captured[LINE_INFANTRY_FRAME]'),1);
 assert.equal(battleRun("copies(save.owned,'trident')"),1);
 assert.equal(battleRun('save.salvage?.[LINE_INFANTRY_FRAME]'),undefined);
 battleRun("selected=0;equipWeapon('trident');workshopView='salvage'");
 assert.match(battleRun('chassisAssignments(0)'),/RECOVER INTACT/);
 assert.equal(battleRun('acquireHull(LINE_INFANTRY_FRAME,true)'),true);
 assert.equal(battleRun('save.reserve[LINE_INFANTRY_FRAME].condition'),100);
 assert.equal(battleRun('acquireHull(LINE_INFANTRY_FRAME,true)'),false);
 assert.equal(battleRun("copies(save.owned,'trident')"),1,'recovering the hull does not duplicate the captured gun');
 battleRun("equipWeapon('rifle');assignChassis(0,LINE_INFANTRY_FRAME);equipWeapon('trident');page='workshop';workshopView='assigned';render()");
 assert.equal(battleRun('save.units[0].weapon'),'trident', battleRun("JSON.stringify({u:save.units,selected,owned:save.owned,port:companyPort(),free:availableCopies('trident')})"));
 assert.equal(battleRun('validSave(save)'),true);
 assert.equal(JSON.parse(resumed.storage.get('iron-vow-career')).units[0].weapon,'trident');
 assert.equal(simulate({storage:new Map(resumed.storage)}).run("save.units[0].weapon"),'trident');

 const lost=simulate({storage:new Map([['iron-vow-career',JSON.stringify(checkpoint)]]),reducedMotion:true});
 lost.run('finish(false)');
 assert.equal(lost.run('save.captured'),undefined);
 assert.equal(lost.run("copies(save.owned,'trident')"),0);
 const loot=new Set();
 for(let seed=0;seed<10;seed++){
  const sortie=simulate({reducedMotion:true});
  loot.add(sortie.run(`createBattle(0);battle.terrainSeed=${seed};finish(true);save.owned.slice(3).join('/')`));
 }
 assert.ok(loot.has('')&&loot.size>2,'victories may award different equipment or no equipment');
 console.log('PASS physical copy counts, port rotation, right-hand melee and shield, shoulder loss and half salvos, surrender threshold, checkpoint, capture payout and refit');
})().catch(error=>{console.error(error);process.exitCode=1});
