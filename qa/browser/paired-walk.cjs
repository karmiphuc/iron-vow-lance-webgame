const assert=require('node:assert/strict');

module.exports=async function checkPairedWalk({page,mobile,origin}){
 await page.addInitScript(()=>{const request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),pending=new Set();window.requestAnimationFrame=fn=>{const id=request(t=>{pending.delete(id);fn(t);});pending.add(id);return id;};window.__stopPairedFrames=()=>{for(const id of pending)cancel(id);pending.clear();};});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 await page.evaluate(()=>__stopPairedFrames());const epoch=new Date('2026-11-11T00:00:00Z');await page.clock.install({time:epoch});await page.clock.pauseAt(new Date(epoch.getTime()+10000));
 await page.evaluate(()=>{requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),1000/30);last=performance.now();requestAnimationFrame(draw);});
 const ready=async()=>{for(let i=0;i<200;i++){await page.clock.runFor(34);if(await page.evaluate(()=>IronVowScene.ready))return;await new Promise(resolve=>setTimeout(resolve,25));}throw Error('Paired walk live rigs did not load');};
 const frames=['AERO','LINE INFANTRY','LINE INFANTRY ELITE','GRAVEMAW','REAVER','BULWARK-AEGIS','ASHIGARU'];
 for(const name of frames){
  const fixture=await page.evaluate(name=>{
   createBattle(0,false,false,[0]);surveyTerrain(0);battle.cover.clear();
   for(const cell of battle.field.cells)cell.level=0;
   const u=current(),frame=FRAMES.findIndex(f=>f.name===name);
   Object.assign(u,{frame,x:8,z:10,vx:8,vz:10,moveLeft:4,paint:null,trim:null,attack:null,
    heading:headingTo(1,0),face:1,weapon:FRAMES[frame].weapon,melee:FRAMES[frame].melee});
   battle.units.filter(other=>other!==u).forEach((other,i)=>Object.assign(other,{x:17,z:i+1,vx:17,vz:i+1}));
   effects=[];action='move';closeModal();focusBattleCamera(u,true);fieldCamera.x=9.5;IronVowScene.clear();renderBattle();IronVowScene.render(clock,1);
   const steps=[],sounds=[],bones=[],track={u,steps,sounds,bones,seam:false};
   if(!window.pairedWalkQA){
    const push=Array.prototype.push,advance=advanceUnitAnimation,cue=gaitSound;
    gaitSound=(unit,kind,side)=>{
     if(unit===window.pairedWalkQA?.u)window.pairedWalkQA.sounds.push([kind,side]);
     return cue(unit,kind,side);
    };
    Array.prototype.push=function(...items){
     const watch=window.pairedWalkQA;
     if(this===effects&&watch&&battle.busy)for(const item of items)if(item.type==='step')push.call(watch.steps,[item.x,item.z]);
     return push.apply(this,items);
    };
    advanceUnitAnimation=(unit,time,dt)=>{
     const watch=window.pairedWalkQA,m=unit.motion;
     if(unit===watch?.u&&m?.stepIndex===1&&m.segment?.length===2){
      const p=fieldStepProgress(.02,m.segment);
      watch.seam=p>.019&&p<.022&&animationPose(unit,m.start).stride===0;
     }
     return advance(unit,time,dt);
    };
    const renderScene=IronVowScene.render;
    IronVowScene.render=function(...args){
     const result=renderScene.apply(this,args),watch=window.pairedWalkQA;
     if(watch?.u.motion){
      const m=IronVowScene.models.get(watch.u.id)?.entry?.m;
      if(m?.rig?.legs?.length){
       m.cont.updateMatrixWorld(true);
       const root=m.cont.getWorldPosition(new THREE.Vector3());
       watch.bones.push(m.rig.legs.map(leg=>leg.an.getWorldPosition(new THREE.Vector3()).sub(root).toArray()));
      }
     }
     return result;
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
  const result=await page.evaluate(()=>({steps:pairedWalkQA.steps,sounds:pairedWalkQA.sounds,bones:pairedWalkQA.bones,seam:pairedWalkQA.seam,
   ap:current().ap,move:current().moveLeft,walks:current().walkCount,motion:current().motion}));
  assert.deepEqual(result.steps,[[8.5,10],[9,10],[9.5,10],[10,10]],name+' lands two alternating beats per tile');
  assert.deepEqual(result.sounds,[['lift',1],['land',1],['lift',-1],['land',-1],
   ['lift',1],['land',1],['lift',-1],['land',-1]],name+' cues both feet in walking order');
  assert.ok(result.seam,name+' keeps its speed through the straight tile seam');
  assert.deepEqual([result.ap,result.move,result.walks,result.motion],[fixture.ap,fixture.move-2,2,null]);
  assert.ok(result.bones.length>1,name+' updates live leg bones during its move');
  const first=result.bones[0],maxBoneMotion=Math.max(...result.bones.flatMap(pose=>pose.map((point,index)=>
   Math.hypot(...point.map((value,axis)=>value-first[index][axis])))));
  assert.ok(maxBoneMotion>.05,name+' articulates its actual ankle bones during the walk: '+maxBoneMotion);
 }
};
