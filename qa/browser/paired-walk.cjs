const assert=require('node:assert/strict');

module.exports=async function checkPairedWalk({page,mobile,origin}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 const baked=['AERO','LINE INFANTRY','LINE INFANTRY ELITE','GRAVEMAW','REAVER','BULWARK-AEGIS','ASHIGARU'];
 for(const name of [...baked,'CICADA','VALKYRIE','ONI','BEHEMOTH','AEGIS','SHRIKE','BASTION','CITADEL']){
  const fixture=await page.evaluate(name=>{
   createBattle(0,false,false,[0]);surveyTerrain(0);battle.cover.clear();
   for(const cell of battle.field.cells)cell.level=0;
   const u=current(),frame=FRAMES.findIndex(f=>f.name===name);
   Object.assign(u,{frame,x:8,z:10,vx:8,vz:10,moveLeft:4,paint:null,trim:null,attack:null,
    heading:headingTo(1,0),face:1,weapon:FRAMES[frame].weapon,melee:FRAMES[frame].melee});
   battle.units.filter(other=>other!==u).forEach((other,i)=>Object.assign(other,{x:17,z:i+1,vx:17,vz:i+1}));
   effects=[];action='move';closeModal();focusBattleCamera(u,true);renderBattle();
   const steps=[],renders=new Set(),track={u,steps,renders,seam:false};
   if(!window.pairedWalkQA){
    const push=Array.prototype.push,render=foundryRender,advance=advanceUnitAnimation;
    Array.prototype.push=function(...items){
     const watch=window.pairedWalkQA;
     if(this===effects&&watch&&battle.busy)for(const item of items)if(item.type==='step')push.call(watch.steps,[item.x,item.z]);
     return push.apply(this,items);
    };
    foundryRender=(unit,time,liveOnly)=>{
     const result=render(unit,time,liveOnly),watch=window.pairedWalkQA;
     if(unit===watch?.u&&unit.motion&&result?.baked&&result.cell)watch.renders.add(result.key+':'+result.index);
     return result;
    };
    advanceUnitAnimation=(unit,time,dt)=>{
     const watch=window.pairedWalkQA,m=unit.motion;
     if(unit===watch?.u&&m?.stepIndex===1&&m.segment?.length===2){
      const p=fieldStepProgress(.02,m.segment);
      watch.seam=p>.019&&p<.022&&animationPose(unit,m.start).stride===0;
     }
     return advance(unit,time,dt);
    };
   }
   window.pairedWalkQA=track;
   return {ap:u.ap,move:u.moveLeft};
  },name);
  const {x,y}=await page.evaluate(async()=>{
   await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
   const point=project(10,0,10),element=document.elementFromPoint(point.x,point.y);
   if(element!==canvas)throw Error('Walk target is covered by '+element?.id+' '+element?.className);
   return point;
  });
  if(mobile){await page.touchscreen.tap(x,y);await page.touchscreen.tap(x,y)}
  else await page.mouse.click(x,y);
  await page.waitForFunction(()=>!battle.busy&&current().x===10&&current().z===10);
  const result=await page.evaluate(()=>({steps:pairedWalkQA.steps,renders:[...pairedWalkQA.renders],seam:pairedWalkQA.seam,
   ap:current().ap,move:current().moveLeft,walks:current().walkCount,motion:current().motion}));
  assert.deepEqual(result.steps,[[8.5,10],[9,10],[9.5,10],[10,10]],name+' lands two alternating beats per tile');
  assert.ok(result.seam,name+' keeps its speed through the straight tile seam');
  assert.deepEqual([result.ap,result.move,result.walks,result.motion],[fixture.ap,fixture.move-2,2,null]);
  if(baked.includes(name)){
   const sheet=result.renders.filter(entry=>name==='ASHIGARU'?entry.startsWith('ashigaru-combat:'):entry.includes('-walk'));
   assert.ok(sheet.length>=13,name+' draws a dense sequence in the battle canvas: '+sheet.join(', '));
  }
 }
 const damage=await page.evaluate(async()=>{
  const result=[];
  for(const frame of [LINE_INFANTRY_FRAME,LINE_ELITE_FRAME,REAVER_FRAME,BULWARK_FRAME]){
   const unit={...current(),frame,hp:{...current().hp,right:0},motion:{start:0,duration:1,
    gaitBase:0,stepIndex:0,totalSteps:1,stepBeats:0,fromX:2,fromZ:2,toX:3,toZ:2}};
   for(const heading of frame===BULWARK_FRAME?FIELD_HEADINGS:[FIELD_HEADINGS[0],FIELD_HEADINGS[2]]){
    Object.assign(unit,{heading,face:Math.sign(Math.sin(heading))});
    const clip=foundryWalk(unit);
    await motionImage(clip).decode();
    const pose=foundryRender(unit,.32,true);
    result.push([pose.key,pose.partMask,pose.flip]);
   }
  }
  return result;
 });
 assert.deepEqual(damage.map(([key])=>key),[
  'foundry-6-walk-unarmed','foundry-6-walk-unarmed','foundry-7-walk-unarmed','foundry-7-walk-unarmed',
  'reaver-walk-left','reaver-walk-left',...Array.from({length:4},(_,i)=>`aegis-walk-d${i}-right-down`)
 ]);
 assert.ok(damage.every(([key,mask])=>mask===key+'-parts'));
 assert.deepEqual(damage.slice(0,6).map(([, ,flip])=>flip),[true,false,true,false,true,false]);
};
