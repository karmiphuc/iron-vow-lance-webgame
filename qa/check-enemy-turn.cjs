const assert=require('node:assert/strict');
const create=require('./sim-harness.cjs');

(async()=>{
 // Real opening roster with an identical seed must make identical decisions and rolls.
 async function opening(){
  const sim=create({seed:42});
  sim.run(`createBattle(0);selected=0;globalThis.attacks=[];
   battle.units.forEach((u,i)=>{u.x=3+i;u.z=5;u.vx=u.x;u.vz=u.z;u.heading=defaultHeading(u)});
   battle.cover.clear();
   const original=engage;
   engage=(u,t,p,w)=>{attacks.push([u.id,t.id,w.id]);return original(u,t,p,w)};
  `);
  await sim.run('endTurn()');
  return JSON.parse(sim.run(`JSON.stringify({turn:battle.turn,phase:battle.phase,attacks,
   units:battle.units.map(({id,x,z,hp,ap})=>({id,x,z,hp,ap})),log:battle.log})`));
 }
 const actual=await opening();
 assert.deepEqual(actual,await opening());
 assert.equal(actual.turn,2);
 assert.equal(actual.phase,'player');
 for(const vehicle of ['enemy2','enemy3'])assert.equal(actual.attacks.filter(([id])=>id===vehicle).length,1);
 assert.ok(actual.attacks.some(([id])=>id==='enemy0'||id==='enemy1'));
 assert.ok(actual.units.filter(u=>u.id.startsWith('ally')).every(u=>u.ap===8));

 // A wounded, exposed target can beat the nearest shielded target. Replan after the first target falls.
 const tactics=create({random:()=>0});
 tactics.run(`createBattle(0);captureRandom=()=>1;globalThis.targets=[];battle.cover.clear();battle.field={};
  const [near,weak]=battle.units.filter(u=>u.team==='ally'),gun=battle.units.find(u=>u.team==='enemy'&&!u.kind);
  battle.units=[near,weak,gun];Object.assign(gun,{x:6,z:6});
  Object.assign(near,{x:7,z:6,shield:'citadel-shield',reacted:true});
  Object.assign(weak,{x:9,z:6,reacted:true});weak.hp.body=6;
  gun.blackout={hold:true};gun.weapon='rifle';
  engage=async(u,t,p,w)=>{targets.push(t.id);u.ap-=w.ap;t.alive=false};
 `);
 assert.equal(await tactics.run('runEnemyTurn()'),true);
 assert.equal(tactics.run('targets.join(",")'),'ally1,ally0');

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
 const ally={team:'ally',alive:true,x:1,z:0,hp:{body:5}};
 const blade={id:'scout',ap:3,range:1};
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
 console.log('PASS shared enemy turn: deterministic real opening, vehicle limits, target priority and replan, early battle end');
})().catch(error=>{console.error(error);process.exitCode=1});
