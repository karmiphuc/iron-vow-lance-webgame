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
})().catch(error=>{console.error(error);process.exitCode=1});
