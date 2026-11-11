const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const simulate=require(process.env.IRON_VOW_BASELINE_HARNESS||'./sim-harness.cjs');
const {run}=simulate({travel:true,foundry:true,reducedMotion:true});
run(readFileSync(join(__dirname,'../dist/shield-visuals.js'),'utf8'));
// UI composition order uses the physical preview cache contract; battle shields are real meshes.
run(`window.IronVowAdapterWeapons={layout:(id,direction)=>({key:'3d:'+id+'/'+direction,grip:[0,0],axis:[1,0],face:[.3,0],pixelsPerMetre:70})};`);
const passes=JSON.parse(run(`JSON.stringify((()=>{
 save.credits=FRAMES[3].cost+10000;
 assignChassis(0,3);
 equipWeapon('citadel-shield');
 createBattle(0,false,false,[0]);
 const u=current(),orders=[];
 let calls=[];
 const draw=ctx.drawImage,weaponDraw=drawMountedPreview;
 ctx.drawImage=()=>calls.push('hull');
 drawMountedPreview=(g,mount)=>{if(mount?.asset.key.includes('citadel-shield'))calls.push('shield')};
 try{
  for(const heading of FIELD_HEADINGS){
   u.heading=heading;u.face=Math.sign(Math.sin(heading));
   calls=[];drawTravel(u,0,travelVisual(u,0));orders.push(calls);
   calls=[];drawUnitBody({...u,headingOverride:heading},0,true);orders.push(calls);
  }
  u.hp.left=0;calls=[];drawTravel(u,0,travelVisual(u,0));orders.push(calls);
 }finally{ctx.drawImage=draw;drawMountedPreview=weaponDraw}
 return orders;
})())`));
assert.deepEqual(passes,[
 ['shield','hull'],['shield','hull'],
 ['shield','hull'],['shield','hull'],
 ['hull','shield'],['hull','shield'],
 ['hull','shield'],['hull','shield'],
 ['hull']
],'a far-side shield is occluded by the hull in both field and cinematic passes');
console.log('PASS Gatecrasher field and cinematic shield depth across four headings and left-arm loss');
