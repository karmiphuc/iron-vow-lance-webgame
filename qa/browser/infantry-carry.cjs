const assert=require('node:assert/strict');

module.exports=async function checkInfantryCarry({page,origin}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 const frames=await page.evaluate(async()=>{
  createBattle(0,false,false,[0]);
  const span=values=>Math.max(...values)-Math.min(...values);
  const results=[];
  for(const frame of [LINE_INFANTRY_FRAME,LINE_ELITE_FRAME]){
   const atlas=window.IRON_VOW_FOUNDRY_ART[foundryModel(frame)];
   const unit={...current(),frame,weapon:'rifle',paint:null,trim:null,attack:null,
    motion:{start:0,duration:1,gaitBase:0,stepIndex:0,totalSteps:1,fromX:2,fromZ:2,toX:3,toZ:2}};
   const mask=motionRaster(window.IRON_VOW_PART_MASKS[atlas.key]);
   await Promise.all([motionImage(atlas).decode(),mask.decode()]);
   const probe=new OffscreenCanvas(5,5),g=probe.getContext('2d',{willReadFrequently:true});
   const gripOnArm=pose=>{
    const [x,y]=pose.anchors.gripR;
    const sx=pose.index%4*atlas.cell+Math.floor((pose.flip?1-x:x)*atlas.cell)-2;
    const sy=Math.floor(pose.index/4)*atlas.cell+Math.floor(y*atlas.cell)-2;
    g.clearRect(0,0,5,5);g.drawImage(mask,sx,sy,5,5,0,0,5,5);
    const pixels=g.getImageData(0,0,5,5).data;
    for(let i=0;i<pixels.length;i+=4)
     if(pixels[i]===255&&pixels[i+1]===255&&pixels[i+2]===0&&pixels[i+3]>=128)return true;
    return false;
   };
   for(const facing of [-1,1]){
    unit.face=facing;unit.heading=facing*Math.PI/4;
    const walk=Array.from({length:8},(_,i)=>foundryRender(unit,(i+.5)/8));
    const grip=walk.map(p=>p.anchors.gripR[0]-p.anchors.body[0]);
    const feet=walk.map(p=>p.anchors.leadFoot[0]-p.anchors.body[0]);
    results.push({name:FRAMES[frame].name,facing,indices:walk.map(p=>p.index),
     armed:walk.every(p=>p.key===atlas.key&&p.primary&&gripOnArm(p)),grip:span(grip),feet:span(feet)});
   }
  }
  return results;
 });
 for(const frame of frames){
  assert.deepEqual(frame.indices,[0,1,2,3,4,5,6,7]);
  assert.ok(frame.armed&&frame.grip<.045&&frame.feet>.045,JSON.stringify(frame));
 }
};
