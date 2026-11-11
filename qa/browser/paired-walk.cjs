const assert=require('node:assert/strict');

module.exports=async function checkPairedWalk({page,mobile,origin}){
 await page.addInitScript(()=>{const request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),pending=new Set();window.requestAnimationFrame=fn=>{const id=request(t=>{pending.delete(id);fn(t);});pending.add(id);return id;};window.__stopPairedFrames=()=>{for(const id of pending)cancel(id);pending.clear();};});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 await page.evaluate(()=>__stopPairedFrames());const epoch=new Date('2026-11-11T00:00:00Z');await page.clock.install({time:epoch});await page.clock.pauseAt(new Date(epoch.getTime()+10000));
 await page.evaluate(()=>{requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),1000/30);last=performance.now();requestAnimationFrame(draw);});
 const ready=async()=>{for(let i=0;i<200;i++){await page.clock.runFor(34);if(await page.evaluate(()=>IronVowScene.ready))return;await new Promise(resolve=>setTimeout(resolve,25));}throw Error('Paired walk art did not load');};
 const baked=['AERO','LINE INFANTRY','LINE INFANTRY ELITE','GRAVEMAW','REAVER','BULWARK-AEGIS','ASHIGARU'];
 // Live gait is checked on actual bones by check-scene.cjs; only temporary sheets remain here.
 for(const name of baked){
  const fixture=await page.evaluate(name=>{
   createBattle(0,false,false,[0]);surveyTerrain(0);battle.cover.clear();
   for(const cell of battle.field.cells)cell.level=0;
   const u=current(),frame=FRAMES.findIndex(f=>f.name===name);
   Object.assign(u,{frame,x:8,z:10,vx:8,vz:10,moveLeft:4,paint:null,trim:null,attack:null,
    heading:headingTo(1,0),face:1,weapon:FRAMES[frame].weapon,melee:FRAMES[frame].melee});
   battle.units.filter(other=>other!==u).forEach((other,i)=>Object.assign(other,{x:17,z:i+1,vx:17,vz:i+1}));
   effects=[];action='move';closeModal();focusBattleCamera(u,true);fieldCamera.x=9.5;IronVowScene.clear();renderBattle();IronVowScene.render(clock,1);
   const steps=[],sounds=[],renders=new Set(),track={u,steps,sounds,renders,seam:false};
   if(!window.pairedWalkQA){
    const push=Array.prototype.push,render=foundryRender,advance=advanceUnitAnimation,cue=gaitSound;
    gaitSound=(unit,kind,side)=>{
     if(unit===window.pairedWalkQA?.u)window.pairedWalkQA.sounds.push([kind,side]);
     return cue(unit,kind,side);
    };
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
  await ready();await page.evaluate(()=>IronVowScene.render(clock,1));
  const {x,y}=await page.evaluate(()=>{
   IronVowScene.render(clock,1);
   if(!paths(current()).has('10,10'))throw Error('Two-tile destination must be legal');
   for(const ox of [0,-.2,.2,-.4,.4])for(const oz of [0,-.2,.2,-.4,.4]){
    const raw=IronVowScene.projectWorld(IronVowScene.world(10+ox,10+oz)),p={x:Math.round(raw.x),y:Math.round(raw.y)},tile=screenTile(p.x,p.y);
    if(tile.x===10&&tile.z===10&&document.elementFromPoint(p.x,p.y)===canvas&&pick(p.x,p.y)?.team!=='enemy')return p;
   }
   throw Error('No exposed raycastable two-tile destination');
  });
  if(mobile){await page.touchscreen.tap(x,y);await page.touchscreen.tap(x,y)}
  else await page.mouse.click(x,y);
  for(let i=0;i<400&&await page.evaluate(()=>battle.busy||current().x!==10||current().z!==10);i++)await page.clock.runFor(34);
  const state=await page.evaluate(()=>({x:current().x,z:current().z,busy:battle.busy,ready:IronVowScene.ready,action,moveTap,modal:!document.querySelector('#modal').hidden}));
  assert.equal(!state.busy&&state.x===10&&state.z===10,true,name+' completes its real two-tile move: '+JSON.stringify(state));
  const result=await page.evaluate(()=>({steps:pairedWalkQA.steps,sounds:pairedWalkQA.sounds,renders:[...pairedWalkQA.renders],seam:pairedWalkQA.seam,
   ap:current().ap,move:current().moveLeft,walks:current().walkCount,motion:current().motion}));
  assert.deepEqual(result.steps,[[8.5,10],[9,10],[9.5,10],[10,10]],name+' lands two alternating beats per tile');
  assert.deepEqual(result.sounds,[['lift',1],['land',1],['lift',-1],['land',-1],
   ['lift',1],['land',1],['lift',-1],['land',-1]],name+' cues both feet in walking order');
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
