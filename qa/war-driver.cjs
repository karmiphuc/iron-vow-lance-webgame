// Browser-free production encounter driver. The autonomous target/movement idea
// comes from docs/reference/claude/rig-bench.html:2680-2701; legality, actions,
// damage, reactions and enemy turns all come from the game, not that simulation.
const createSimulation=require('./sim-harness.cjs');

module.exports=async function runWar({seed=1,contract=0,maxTurns=30}={}){
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('seed must be a uint32');
 if(!Number.isInteger(contract)||contract<0)throw Error('contract must be a nonnegative integer');
 if(!Number.isInteger(maxTurns)||maxTurns<1)throw Error('maxTurns must be a positive integer');
 const sim=createSimulation({reducedMotion:true});
 sim.run(`window.IronVowScene={ready:true,models:new Map(),covers:[],isLive:()=>false,aimAt:()=>{},attachmentPoint:()=>({}),projectWorld:()=>({x:0,y:0}),project:()=>({x:0,y:0})};window.IronVowRenderer={metrics:()=>({})}`);
 if(contract>=sim.run('CONTRACTS.length'))throw Error('Invalid contract');
 const api=sim.sandbox.window.__ironVow;
 let state=api.start({seed,contract});
 if(!state.units.length)throw Error('Invalid contract');
 const events=[];
 for(let turn=0;turn<maxTurns&&state.units.length;turn++){
  for(const ally of state.units.filter(u=>u.team==='ally'&&u.alive)){
   if(!state.units.find(u=>u.id===ally.id)?.alive)continue;
   // A legal move strictly improves the game's own distance/obstruction score.
   // Once moved, consume legal attacks; AP and weapon locks remain authoritative.
   let choices=api.choices(ally.id);
   const move=choices.moves.filter(m=>m.score<choices.currentScore).sort((a,b)=>a.score-b.score||a.cost-b.cost||a.x-b.x||a.z-b.z)[0];
   if(move){
    await api.move(ally.id,move.x,move.z);
    events.push({turn:state.turn,actor:ally.id,action:'move',x:move.x,z:move.z});
    state=api.snapshot();
    if(!state.units.length)break;
    if(!state.units.find(u=>u.id===ally.id)?.alive)continue;
   }
   for(let count=0;count<32;count++){
    choices=api.choices(ally.id);
    const attack=choices.attacks.sort((a,b)=>a.hp-b.hp||a.target.localeCompare(b.target)||a.mode.localeCompare(b.mode))[0];
    if(!attack)break;
    await api.attack(ally.id,attack.target,attack.part,attack.mode);
    events.push({turn:state.turn,actor:ally.id,action:'attack',target:attack.target,mode:attack.mode});
    state=api.snapshot();
    if(!state.units.length||!state.units.find(u=>u.id===ally.id)?.alive)break;
    if(count===31)throw Error('Attack action limit exceeded');
   }
   state=api.snapshot();if(!state.units.length)break;
  }
  if(!state.units.length)break;
  await api.endTurn();events.push({turn:state.turn,action:'endTurn'});state=api.snapshot();
 }
 return {seed,contract,turn:state.turn,result:state.result??null,unfinished:state.units.length>0,units:state.units.map(({id,team,kind,alive,hp,ap,x,z})=>({id,team,kind,alive,hp,ap,x,z})),events};
};
