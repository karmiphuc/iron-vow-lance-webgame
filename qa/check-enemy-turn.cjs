const assert=require('node:assert/strict');
const create=require('./sim-harness.cjs');

(async()=>{
 // Golden result captured before extracting the production enemy turn. This
 // exercises mech and vehicle attacks, reactions, seeded rolls and round reset.
 const sim=create({seed:42});
 sim.run(`createBattle(0);selected=0;
  battle.units.forEach((u,i)=>{u.x=3+i;u.z=5;u.vx=u.x;u.vz=u.z;u.heading=defaultHeading(u)});
  battle.cover=new Set();`);
 await sim.run('endTurn()');
 const actual=JSON.parse(sim.run(`JSON.stringify({turn:battle.turn,phase:battle.phase,
  units:battle.units.map(u=>({id:u.id,x:u.x,z:u.z,hp:u.hp,ap:u.ap,reacted:u.reacted})),log:battle.log})`));
 assert.deepEqual(actual,{turn:2,phase:'player',units:[
  {id:'ally0',x:3,z:5,hp:{body:160,pilot:70,right:92,left:92,legs:110},ap:8,reacted:false},
  {id:'ally1',x:4,z:5,hp:{body:126,pilot:55,right:78,left:78,legs:100},ap:8,reacted:false},
  {id:'ally2',x:5,z:5,hp:{body:129,pilot:80,right:70,left:88,legs:67},ap:8,reacted:false},
  {id:'enemy0',x:6,z:5,hp:{body:151,pilot:70,right:81,left:87,legs:98},ap:2,reacted:false},
  {id:'enemy1',x:7,z:5,hp:{body:82,pilot:55,right:45,left:45,legs:72},ap:3,reacted:false},
  {id:'enemy2',x:8,z:5,hp:{body:64},ap:4,reacted:false},
  {id:'enemy3',x:9,z:5,hp:{body:43},ap:4,reacted:false}],
  log:['ASHIGARU 2 · Flechette scattergun → BASILISK / BODY −19 · LEGS −7 · WEAPON ARM −2','JAVELIN TANK 3 → BASILISK / WEAPON ARM −20',
   'KITE GUNSHIP 4 → BASILISK / BODY −12','Round 2. Your lance has the initiative.']});
 // An ending during an enemy attack must stop the loop before the next actor.
 const sim2=create({random:()=>0});
 sim2.run(`createBattle(0);selected=0;globalThis.calls=0;
  battle.units.forEach((u,i)=>{u.x=3+i;u.z=5;u.vx=u.x;u.vz=u.z});battle.cover=new Set();`);
 sim2.run(`globalThis.driver=window.IRON_VOW_SIM.createEnemyTurn({getBattle:()=>battle,ROUND_AP,resetMovement,renderBattle,unitWeapon,distance,meleeWeapon,scoutWeapon,targetParts,canUseWeapon,attackObstruction,combatRange,launchesMissiles,hasMechSkill,paths,movementLimit,canJumpjet,jumpjetDestination,useJumpjet,moveUnit,engage:async()=>{calls++},checkEnd:()=>true,isArmed,addLog,VANGUARD_FRAME,BULWARK_FRAME,ASHIGARU_FRAME,AERO_FRAME,CITADEL_FRAME})`);
 assert.equal(await sim2.run('driver.runEnemyTurn()'),true);
 assert.equal(sim2.run('calls'),1);
 // Load the module without game.js globals: every rule dependency must be injected.
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
 const context={window:{}};vm.createContext(context);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/combat-simulation.js'),'utf8'),context);
 const scout={frame:5,team:'enemy',alive:true,x:0,z:0,hp:{right:1},ap:0};
 const ally={team:'ally',alive:true,x:1,z:0};
 const blade={id:'scout'};
 const isolated=context.window.IRON_VOW_SIM.createEnemyTurn({getBattle:()=>({units:[scout,ally],turn:1}),
  ROUND_AP:8,resetMovement:()=>{},renderBattle:()=>{},unitWeapon:()=>({range:1}),
  distance:(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z),meleeWeapon:()=>blade,
  scoutWeapon:()=>blade,targetParts:()=>['right'],canUseWeapon:()=>true,
  attackObstruction:()=>false,combatRange:()=>1,launchesMissiles:()=>false,hasMechSkill:()=>false,
  paths:()=>new Map(),movementLimit:()=>0,canJumpjet:()=>false,jumpjetDestination:()=>null,
  useJumpjet:()=>{},moveUnit:()=>{},engage:async()=>{},checkEnd:()=>true,
  isArmed:()=>true,addLog:()=>{},VANGUARD_FRAME:1,BULWARK_FRAME:2,ASHIGARU_FRAME:5,AERO_FRAME:3,CITADEL_FRAME:4});
 assert.equal(isolated.enemyAttackWeapon(scout,ally,blade),blade);
 assert.equal(await isolated.runEnemyTurn(),true);
 scout.frame=0;scout.max={right:1};ally.x=20;
 assert.equal(await isolated.runEnemyTurn(),false);
 console.log('PASS shared enemy turn: seeded production baseline, vehicles, reactions and early battle end');
})().catch(error=>{console.error(error);process.exitCode=1});
