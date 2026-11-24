const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');
async function check(){
 const game=simulate({reducedMotion:true,random:()=>.10}),{run}=game;
 run("save.overworld={port:'ridge',arrears:0};ensureWorld();persist()");
 const offer=run("availableOffers('ridge').find(o=>CONTRACTS[o.templateIndex].id==='parapet').id");
 game.node('#aux-pilot').options=[];game.node('#use-aux').checked=false;
 run('prepareWorldOffer('+JSON.stringify(offer)+')');game.node('#modal-1').onclick();
 const saved=simulate({storage:new Map(game.storage)});
 assert.equal(saved.run("battle.contract.id+'/'+battle.units.find(u=>u.team==='enemy').frame"),'parapet/28');
 run("const n=battle.units.find(u=>u.team==='enemy'),a=current(),gun=unitWeapon(n);a.x=3;n.x=9;n.z=a.z=6;battle.cover.clear();battle.field={};a.shield=null;a.armor=5;a.reacted=true;n.reacted=true;");
 assert.ok(run("!playerHull(n.frame)&&!salvageableHull(n.frame)&&!equipmentItem(gun.id)&&livingNetwork.ports.every(p=>!portStock(p.id).frames.includes(n.frame))"));
 assert.ok(run("gun.range===9&&mobility(n)>=6&&enemyDoctrine(n)[0]===8&&!equippedShield(n)"));
 run("const hp=a.hp.body,ap=n.ap;n.hp.left=0;ruleRandom=()=>.10");
 await run("engage(n,a,'body',gun)");
 assert.equal(run('hp-a.hp.body'),36);assert.equal(run('ap-n.ap'),5);
 run("n.hp.right=0");assert.ok(run('!workingWeapon(n,gun)'));
 run("n.surrendered=true;n.alive=false;finish(true)");
 assert.ok(run('!save.captured?.[SAKER_FRAME]&&!save.salvage?.[SAKER_FRAME]&&!save.owned.includes(gun.id)&&validSave(save)'));
 const ai=simulate({reducedMotion:true,random:()=>.1}).run;
 ai("createBattle(CONTRACTS.findIndex(c=>c.id==='parapet'),false,false,[0]);enableMechComputers();const n=battle.units.find(u=>u.team==='enemy'),a=current();a.x=a.vx=3;n.x=n.vx=6;a.z=n.z=a.vz=n.vz=9;battle.cover.clear();battle.field={};a.shield=null;ruleRandom=()=>.10;captureRandom=()=>1;const before=a.hp.body;");
 await ai('runEnemyTurn()');
 assert.ok(ai("distance(a,n)===8&&n.mechState.moved===5&&before-a.hp.body===36"),'opens the range and lands one medium-impact shot');
 console.log('PASS Parapet deployment and reload, enemy-only hull and rifle, right-arm dependency, left arm free, 36 HP through 5 armor for 5 AP, surrender settlement');
}
check().catch(e=>{console.error(e);process.exitCode=1;});
