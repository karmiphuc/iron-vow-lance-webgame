const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const simulate=require('./sim-harness.cjs');

(async()=>{
 const sim=simulate({random:()=>0,travel:true,foundry:true}),{run}=sim;
 run("createBattle(0);battle.cover.clear();const rook=current();const hostile=battle.units[3];const cues=[];sound=(type)=>cues.push(type)");
 assert.equal(run('freeMovement(rook)'),5);
 assert.equal(run('freeMovement(battle.units[1])'),6);
 assert.equal(run('paths(rook).get("1,11")'),5);
 await run('moveUnit(rook,1,11)');
 assert.equal(run('rook.ap'),8);
 assert.equal(run('freeMovement(rook)'),0);
 assert.ok(run('extraMovement(rook)'));
 assert.ok(run("cues.filter(c=>c==='step').length===5&&cues.indexOf('hydraulic')<cues.indexOf('step')"));
 await run('moveUnit(rook,1,10)');
 assert.equal(run('rook.ap'),7);
 assert.equal(run('movementLimit(rook)'),0);
 await run('moveUnit(rook,1,9)');
 assert.equal(run('rook.z'),10);

 run("resetMovement(rook);rook.ap=8;hostile.x=rook.x+1;hostile.z=rook.z;hostile.melee='blade';hostile.ap=0");
 assert.equal(run("reactionWeapon(hostile,rook).id"),'blade');
 assert.equal(run("(()=>{hostile.hp.left=0;const id=reactionWeapon(hostile,rook).id;hostile.hp.left=92;return id})()"),'rifle');
 assert.equal(run("(()=>{hostile.x+=9;const w=reactionWeapon(hostile,rook);hostile.x-=9;return w})()"),null);
 assert.equal(run("reactionWeapon(battle.units[4],rook)"),null);
 run("cues.length=0");
 const rookHP=run('rook.hp.body');
 await run("engage(rook,hostile,'body',weapon('rifle'))");
 assert.equal(run('rook.ap'),5);
 assert.equal(run('hostile.ap'),0);
 assert.equal(run('hostile.reacted'),true);
 assert.equal(run('Boolean(rook.reacted)'),false);
 assert.equal(run('freeMovement(rook)'),0);
 assert.ok(run('rook.hp.body')<rookHP);
 assert.ok(run("cues.indexOf('hydraulic')<cues.indexOf('step')&&cues.indexOf('step')<cues.indexOf('prime')&&cues.indexOf('prime')<cues.indexOf('rifle')"));
 const afterCounter=run('rook.hp.body');
 await run("engage(rook,hostile,'body',weapon('rifle'))");
 assert.equal(run('rook.hp.body'),afterCounter);
 run('persist()');
 const restored=simulate({storage:new Map(sim.storage)});
 assert.equal(restored.run('battle.units[3].reacted'),true);
 assert.equal(restored.run('current().actionPhase'),true);
 assert.equal(restored.run('current().heading'),run('rook.heading'));

 run("createBattle(0);battle.cover.clear();selected=0;action='move';const blocked=battle.units[1];blocked.ap=0;startAction(blocked);renderBattle()");
 assert.ok(sim.node('#ui').innerHTML.includes('SPENT / REACTION READY'));
 run('selectUnit(1)');
 assert.equal(run('selected'),0);
 run("pick=()=>blocked;screenTile=()=>({x:1,z:15})");
 const event={pointerId:1,clientX:500,clientY:450,button:0};
 sim.events.get('#scene:pointerdown')(event);
 await sim.events.get('#scene:pointerup')(event);
 assert.equal(run('current().z'),15);
 assert.equal(run('current().ap'),8);
 assert.equal(run('selected'),0);

 const keys=run('Object.keys(window.IRON_VOW_TRAVEL)');
 assert.equal(keys.length,13);
 for(const key of keys){
  const visual=JSON.parse(run(`JSON.stringify(window.IRON_VOW_TRAVEL['${key}'])`));
  assert.equal(visual.points[0].length,4);
  assert.ok(fs.existsSync(path.join(__dirname,'../dist/assets',visual.key+'.webp')));
 }
 const bins=run(`[[-1,0],[1,0],[0,-1],[0,1]].map(([dx,dz])=>{
  current().heading=headingTo(dx,dz);return travelVisual(current(),clock).heading;
 })`);
 assert.deepEqual(Array.from(bins),[2,0,1,3]);
 for(const kind of ['tank','helicopter']){
  const headings=run(`[[-1,0],[1,0],[0,-1],[0,1]].map(([dx,dz])=>{
   const u=battle.units.find(unit=>unit.kind==='${kind}');
   u.heading=headingTo(dx,dz);return travelVisual(u,clock).heading;
  })`);
  assert.deepEqual(Array.from(headings),[2,0,1,3]);
 }
 assert.ok(run(`[[-7,2],[2,-7],[5,5],[-5,-5],[0,0]].every(([dx,dz])=>FIELD_HEADINGS.includes(headingTo(dx,dz)))`));
 assert.equal(run('headingTo(2,-2,FIELD_HEADINGS[1])'),run('FIELD_HEADINGS[1]'));
 const v24=JSON.parse(sim.storage.get('iron-vow-career'));
 v24.sortie.units[0].heading=0;
 const migrated=simulate({storage:new Map([['iron-vow-career',JSON.stringify(v24)]])});
 assert.ok(migrated.run('FIELD_HEADINGS.includes(battle.units[0].heading)'));
 console.log('PASS: free movement, one paid tile, AP-free melee priority, reaction cap and reload, hydraulic/impact sequence, spent click-through, and four-facing travel assets.');

 const stats=simulate();
 const count=stats.run('FRAMES.length');
 for(let frame=0;frame<count;frame++){
  stats.run(`save=fresh();battle=null;save.credits=10000;assignChassis(0,${frame});save.units[0].upgrade=2;save.units[0].condition=57;page='workshop';render()`);
  const workshop=stats.node('#ui').innerHTML;
  assert.equal((workshop.match(/data-chassis=/g)||[]).length,3);
  const actual=JSON.parse(stats.run(`createBattle(0);JSON.stringify({
   name:current().name,free:freeMovement(current()),armor:current().armor,ap:current().ap,
   hp:current().hp,max:current().max,primary:unitWeapon(current()),melee:current().melee&&weapon(current().melee)
  })`));
  assert.ok(workshop.includes(actual.name+' / SORTIE STATS'));
  for(const [label,value] of [
   ['Free movement',actual.free+' tiles'],['Extra movement','1 tile / 1 AP'],
   ['Armor',actual.armor],['AP per round',actual.ap],
   ...Object.entries(actual.max).filter(([part])=>part!=='pilot').map(([part,max])=>[
    stats.run(`PART_LABEL.${part}`),actual.hp[part]+' / '+max+' HP']),
   ['Pilot',actual.hp.pilot+' HP']
  ])assert.ok(workshop.includes(`<dt>${label}</dt><dd>${value}</dd>`),actual.name+' '+label);
  assert.ok(workshop.includes(`Fire</b> ${actual.primary.ap} AP<small>${actual.primary.name}`));
  assert.ok(workshop.includes(actual.melee?`Strike</b> ${actual.melee.ap} AP<small>${actual.melee.name}`:'Strike</b> <small>No melee equipped'));
  assert.ok(workshop.includes('Counter</b> 0 AP<small>1 / round'));
  assert.ok(workshop.includes('Losing the left arm reduces armor to '+Math.floor(actual.armor/2)));
  stats.run('createBattle(1,true)');
  assert.equal(stats.run('freeMovement(current())'),actual.free-1);
 }
 console.log('PASS: all eleven Workshop stat sheets match deployed HP, armor, mobility, AP and weapons with worn reinforced hulls; legacy mobility retained.');

 const audit=simulate({random:()=>0,reducedMotion:true});
 const exec=audit.run;
 exec(`createBattle(0);battle.cover.clear();const ally=current(),foe=battle.units[3],gunship=battle.units.find(u=>u.kind==='helicopter');
 ally.x=6;ally.z=6;foe.x=7;foe.z=6;ally.melee='cleaver';foe.melee='blade';ally.ap=0;`);
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
 exec('ally.hp.left=0;startAction(ally);renderBattle()');
 assert.ok(audit.node('#ui').innerHTML.includes('SPENT / REACTION UNAVAILABLE'));
 assert.equal(exec('reactionWeapon(ally,foe)'),null);
 exec('ally.hp.right=ally.max.right;ally.hp.left=ally.max.left;foe.ap=8');
 await exec("engage(foe,ally,'body',unitWeapon(foe))");
 assert.equal(exec('ally.ap'),0);
 assert.equal(exec('foe.ap'),5);
 assert.equal(exec('ally.reacted'),true);
 assert.equal(exec('Boolean(foe.reacted)'),false,'a counter cannot trigger a counter');
 const foeHP=exec('foe.hp.body');
 await exec("engage(foe,ally,'body',unitWeapon(foe))");
 assert.equal(exec('foe.hp.body'),foeHP,'no second reaction');
 exec('foe.reacted=true;foe.x=17;foe.z=18;battle.units=[ally,foe]');
 await exec('endTurn()');
 assert.equal(exec('battle.turn'),2);
 assert.equal(exec('ally.reacted||foe.reacted'),false,'both sides reset at the round boundary');
 assert.equal(exec('ally.ap'),8);

 exec('let victim');
 for(const part of ['body','pilot','right','left']){
  exec(`createBattle(0);battle.cover.clear();victim=battle.units[3];victim.x=current().x+1;victim.z=current().z;victim.hp.${part}=1;`);
  exec(part==='right'?'victim.hp.left=0':"victim.hp.right=0;victim.melee='blade'");
  const attackerHP=exec('current().hp.body');
  await exec(`engage(current(),victim,'${part}',unitWeapon(current()))`);
  assert.equal(exec('Boolean(victim.reacted)'),false,part+' destroyed before retaliation');
  assert.equal(exec('current().hp.body'),attackerHP);
 }
 console.log('PASS: both counter paths, diagonal and range limits, aircraft, both arms, disabled bodies and pilots, AP, no chains and round reset.');
})().catch(error=>{console.error(error);process.exitCode=1});
