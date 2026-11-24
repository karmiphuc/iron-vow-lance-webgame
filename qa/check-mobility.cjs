const assert=require('node:assert/strict');
const simulate=require('./sim-harness.cjs');

(async()=>{
 const sim=simulate({random:()=>0,reducedMotion:true}),{run}=sim;
 run(`createBattle(0);battle.cover.clear();battle.field={};const rook=current(),hostile=battle.units[3];
  Object.assign(hostile,{x:2,z:14,ap:6,melee:'blade'});
  const cues=[];sound=type=>cues.push(type);`);
 assert.equal(run('rook.ap'),14);
 assert.equal(run('movementLimit(rook)'),5);
 assert.equal(run('movementLimit(battle.units[1])'),6);
 await run('moveUnit(rook,1,14)');
 assert.equal(run('rook.ap'),12);
 assert.equal(run('rook.heading'),run('headingTo(0,-1)'));
 assert.equal(run('movementLimit(rook)'),3);
 assert.ok(run("cues.indexOf('step')>=0"));
 const rookHP=run('rook.hp.body');
 assert.equal(run('counterCost(hostile,rook,meleeWeapon(hostile))'),3);
 await run("engage(rook,hostile,'body',weapon('rifle'))");
 assert.equal(run('rook.ap'),9);
 assert.equal(run('hostile.ap'),3);
 assert.equal(run('hostile.reacted'),true);
 assert.equal(run('Boolean(rook.reacted)'),false);
 assert.equal(run('movementLimit(rook)'),3);
 assert.ok(run('rook.hp.body')<rookHP);
 await run('moveUnit(rook,1,13)');
 assert.equal(run('rook.ap'),8);
 assert.equal(run('movementLimit(rook)'),2);
 assert.equal(run('reactionWeapon({...hostile,ap:3},rook)'),null,'blade cannot counter beyond an adjacent tile');
 await run('moveUnit(rook,1,14)');
 await run("engage(rook,hostile,'body',weapon('rifle'))");
 assert.equal(run('hostile.ap'),0,'a second counter spends the remaining AP');
 assert.equal(run('rook.ap'),4);
 assert.equal(run('attackAPLeft(rook)'),2);
 assert.equal(run("canUseWeapon(rook,weapon('rifle'))"),false);
 const before=run('JSON.stringify([rook.ap,hostile.hp,rook.attackAPSpent])');
 await run("engage(rook,hostile,'body',weapon('rifle'))");
 assert.equal(run('JSON.stringify([rook.ap,hostile.hp,rook.attackAPSpent])'),before,'over-budget attacks spend nothing');
 run('persist()');
 const restored=simulate({storage:new Map(sim.storage)});
 assert.equal(restored.run('battle.units[3].reacted'),true);
 assert.equal(restored.run('current().attackAPSpent'),6);
 assert.equal(restored.run('current().moveLeft'),1);
 assert.equal(restored.run('current().heading'),run('rook.heading'));
 assert.equal(restored.run('current().ap'),4);
 assert.ok(restored.run("paths(current()).size>1&&!canUseWeapon(current(),weapon('rifle'))"));
 await run('moveUnit(rook,1,13)');
 assert.equal(run('rook.ap'),3);
 assert.equal(run('movementLimit(rook)'),0);
 await run('moveUnit(rook,1,12)');
 assert.equal(run('rook.z'),13);
 assert.equal(run('rook.ap'),3,'extra AP cannot extend maximum movement range');

 run("createBattle(0);battle.cover.clear();selected=0;action='move';const blocked=battle.units[1];blocked.ap=0;renderBattle()");
 assert.ok(sim.node('#ui').innerHTML.includes('SPENT / REACTION LOW AP'));
 run('selectUnit(1)');
 assert.equal(run('selected'),0);
 run("pick=()=>blocked;screenTile=()=>({x:1,z:15})");
 const event={pointerId:1,clientX:500,clientY:450,button:0};
 sim.events.get('#scene:pointerdown')(event);
 await sim.events.get('#scene:pointerup')(event);
 assert.equal(run('current().z'),15);
 assert.equal(run('current().ap'),13);
 assert.equal(run('selected'),0);

 const cardinal=JSON.parse(run(`JSON.stringify([[-1,0],[1,0],[0,-1],[0,1]].map(([dx,dz])=>headingTo(dx,dz)))`));
 assert.deepEqual(cardinal,JSON.parse(run('JSON.stringify([FIELD_HEADINGS[2],FIELD_HEADINGS[0],FIELD_HEADINGS[1],FIELD_HEADINGS[3]])')));
 assert.ok(run(`[[-7,2],[2,-7],[5,5],[-5,-5],[0,0]].every(([dx,dz])=>FIELD_HEADINGS.includes(headingTo(dx,dz)))`));
 assert.equal(run('headingTo(2,-2,FIELD_HEADINGS[1])'),run('FIELD_HEADINGS[1]'));
 const v24=JSON.parse(sim.storage.get('iron-vow-career'));
 v24.sortie.units[0].heading=0;
 const migrated=simulate({storage:new Map([['iron-vow-career',JSON.stringify(v24)]])});
 assert.ok(migrated.run('FIELD_HEADINGS.includes(battle.units[0].heading)'));
 console.log('PASS: shared AP and split movement, paid repeat counters, attack limit, reload, gait cue, spent click-through and facing migration.');

 const stats=simulate();
 const count=stats.run('FRAMES.length');
 for(let frame=0;frame<count;frame++){
  if(!stats.run(`playerHull(${frame})`))continue;
  stats.run(`save=fresh();battle=null;save.credits=FRAMES[${frame}].cost+10000;if(FRAMES[${frame}].marketPort){save.overworld={port:FRAMES[${frame}].marketPort,arrears:0};ensureWorld();persist();buyPortHull(${frame})}if(FRAMES[${frame}].captureOnly){save.captured={[${frame}]:1};acquireHull(${frame},true)}if(FRAMES[${frame}].salvageOnly){save.salvage={[${frame}]:1};acquireHull(${frame},true)}assignChassis(0,${frame},true);save.units[0].upgrade=2;save.units[0].condition=57;page='workshop';render()`);
  assert.equal(stats.run('pilotFrame(0)'),frame);
  const workshop=stats.node('#ui').innerHTML;
  assert.equal((workshop.match(/data-chassis=/g)||[]).length,3);
  const actual=JSON.parse(stats.run(`createBattle(0);JSON.stringify({
   name:current().name,free:movementLimit(current()),armor:current().armor,ap:apCapacity(current()),
   hp:current().hp,max:current().max,primary:unitWeapon(current()),melee:selectedWeapon(current(),'strike')
  })`));
  assert.ok(workshop.includes(actual.name+' / SORTIE STATS'));
  for(const [label,value] of [
   ['Movement range',actual.free+' tiles'],
   ['Armor',actual.armor],['Usable AP',actual.ap+' / '+actual.ap],
   ...Object.entries(actual.max).filter(([part])=>part!=='pilot').map(([part,max])=>[
    stats.run(`PART_LABEL.${part}`),actual.hp[part]+' / '+max+' HP']),
   ['Pilot',actual.hp.pilot+' HP']
  ])assert.ok(workshop.includes(`<dt>${label}</dt><dd>${value}</dd>`),actual.name+' '+label);
  assert.ok(workshop.includes(`Fire</b> ${actual.primary.ap} AP<small>${actual.primary.name}`));
  assert.ok(workshop.includes(actual.melee?`Melee</b> ${actual.melee.ap} AP<small>${actual.melee.name}`:'Melee</b> <small>No melee equipped'));
  assert.ok(workshop.includes('Counter</b> Uses AP<small>'));
  assert.ok(workshop.includes('Losing the left arm reduces armor to '+Math.floor(actual.armor/2)));
  stats.run('createBattle(1,true)');
  assert.equal(stats.run('movementLimit(current())'),actual.free-1);
 }
 console.log('PASS: all '+count+' Workshop stat sheets match deployed HP, armor, mobility, AP and weapons with worn reinforced hulls; legacy mobility retained.');

 const audit=simulate({random:()=>0,reducedMotion:true});
 const exec=audit.run;
 exec(`createBattle(0);battle.cover.clear();const ally=current(),foe=battle.units[3],gunship=battle.units.find(u=>u.kind==='helicopter');
 ally.x=6;ally.z=6;foe.x=7;foe.z=6;ally.melee='cleaver';foe.melee='blade';ally.ap=14;`);
 assert.equal(exec('reactionWeapon(ally,foe).id'),'cleaver');
 assert.equal(exec('reactionWeapon(foe,ally).id'),'blade');
 exec('foe.z=7');
 assert.equal(exec('reactionWeapon(ally,foe).id'),'rifle','diagonal is ranged');
 exec('foe.x=11;foe.z=6');
 assert.equal(exec('reactionWeapon(ally,foe).id'),'rifle','inclusive weapon range');
 exec('foe.x=12');
 assert.equal(exec('reactionWeapon(ally,foe)'),null,'one tile beyond range');
 exec('gunship.x=7;gunship.z=6;foe.x=7');
 assert.equal(exec('reactionWeapon(ally,gunship).id'),'rifle','adjacent aircraft requires ranged counter');
 assert.equal(exec('reactionWeapon(gunship,ally)'),null,'vehicles cannot counter');
 exec('ally.hp.right=0');
 assert.equal(exec('reactionWeapon(ally,gunship)'),null);
 assert.equal(exec('reactionWeapon(ally,foe).id'),'cleaver','left arm alone can counter');
 exec('ally.hp.left=0;ally.ap=0;renderBattle()');
 assert.ok(audit.node('#ui').innerHTML.includes('SPENT / REACTION UNAVAILABLE'));
 assert.equal(exec('reactionWeapon(ally,foe)'),null);
 exec('ally.hp.right=ally.max.right;ally.hp.left=ally.max.left;ally.ap=12;foe.ap=8');
 await exec("engage(foe,ally,'body',unitWeapon(foe))");
 assert.equal(exec('ally.ap'),10);
 assert.equal(exec('foe.ap'),5);
 assert.equal(exec('ally.reacted'),true);
 assert.equal(exec('Boolean(foe.reacted)'),false,'a counter cannot trigger a counter');
 const foeHP=exec('foe.hp.body');
 await exec("engage(foe,ally,'body',unitWeapon(foe))");
 assert.ok(exec('foe.hp.body')<foeHP,'second reaction is legal with enough AP');
 assert.equal(exec('ally.ap'),8);
 exec('foe.reacted=true;foe.x=17;foe.z=18;battle.units=[ally,foe]');
 await exec('endTurn()');
 assert.equal(exec('battle.turn'),2);
 assert.equal(exec('ally.reacted||foe.reacted'),false,'both sides reset at the round boundary');
 assert.equal(exec('ally.ap'),14);

 exec('let victim');
 for(const part of ['body','pilot','right','left']){
  exec(`createBattle(0);battle.cover.clear();victim=battle.units[3];victim.x=current().x+1;victim.z=current().z;victim.hp.${part}=1;`);
  exec(part==='right'?'victim.hp.left=0':"victim.hp.right=0;victim.melee='blade'");
  const attackerHP=exec('current().hp.body');
  // No part aiming: every round hits (0) and rolls a location; the single cockpit check (draw 17 after eight rifle rounds) is .999 only for the cockpit case.
  const place={body:.1,pilot:.1,right:.7,left:.7}[part];
  exec(`Math.random=(()=>{let i=0;return()=>{const n=i++;return n===16?${part==='pilot'?.999:0}:n<16?(n%2?${place}:0):0}})()`);
  await exec(`engage(current(),victim,'body',unitWeapon(current()))`);
  assert.equal(exec('Boolean(victim.reacted)'),false,part+' destroyed before retaliation');
  assert.equal(exec('current().hp.body'),attackerHP);
 }
 console.log('PASS: both counter paths, diagonal and range limits, aircraft, both arms, disabled bodies and pilots, AP, no chains and round reset.');
})().catch(error=>{console.error(error);process.exitCode=1});
