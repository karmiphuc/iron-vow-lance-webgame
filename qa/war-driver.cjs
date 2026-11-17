// Headless production host for the same command runner as Rig Bench War.
const createSimulation=require('./sim-harness.cjs');

module.exports=async function runWar(options={}){
 const sim=createSimulation({reducedMotion:true});
 sim.run(`window.IronVowScene={ready:true,models:new Map(),covers:[],isLive:()=>false,aimAt:()=>{},attachmentPoint:()=>({}),projectWorld:()=>({x:0,y:0}),project:()=>({x:0,y:0})};window.IronVowRenderer={metrics:()=>({})}`);
 return sim.sandbox.window.IRON_VOW_SIM.createWarDriver(sim.sandbox.window.__ironVow).runBattle(options);
};
