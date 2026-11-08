const assert=require('node:assert/strict');
const {writeFileSync}=require('node:fs');
const {join}=require('node:path');

module.exports=async function checkWardenMelee({page,mobile,origin,tap}){
 const weapons=mobile?['piledriver']:['cleaver','breaker','piledriver','blade'];
 for(const weapon of weapons){
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.emulateMedia({reducedMotion:'no-preference'});
  const capture=!mobile&&weapon==='cleaver'&&process.env.WARDEN_HANDS_PROOF;
  const braced=weapon==='piledriver';
  await page.evaluate(({weapon,capture})=>{
   battle=null;closeModal();save=fresh();save.units[0].melee=weapon;deploy(0,false,[0]);
   const ally=current(),foe=battle.units.find(u=>u.team==='enemy'&&!u.kind);
   const candidates=[];
   const clear=(x,z)=>!battle.cover.has(x+','+z)&&!battle.units.some(u=>u!==ally&&u!==foe&&u.x===x&&u.z===z);
   for(let x=5;x<=9;x++)for(let z=5;z<=9;z++)if(clear(x,z)&&clear(x+1,z))candidates.push({x,z});
   candidates.sort((a,b)=>Math.abs(a.x-7)+Math.abs(a.z-7)-Math.abs(b.x-7)-Math.abs(b.z-7));
   const {x,z}=candidates[0];
   ally.x=ally.vx=x;ally.z=ally.vz=z;ally.heading=headingTo(1,0);ally.face=1;
   foe.x=foe.vx=x+1;foe.z=foe.vz=z;foe.reacted=true;
   Math.random=()=>0;
   lockedTarget=foe.id;focusBattleCamera(ally,true);renderBattle();
   window.wardenStrikeQA={ally,foe,trace:[],capture:[]};
   let lastCapture=0;
   setInterval(()=>{
    if(!ally.attack)return;
    const travel=travelVisual(ally,hitstopTime(ally,clock));
    if(travel?.strikeFrame==null)return;
    const pose=travel.strike;
    const mount=travelMount(travel,ally,weapon,pose.strikeProgress);
    const blade=weaponPoint(mount,'tip'),effect=mechAttachmentPoint(ally,'meleeTip',clock);
    const actor={...ally,face:1,headingOverride:Math.PI/4};
    const view=activeWardenVisual(actor);
    const close=view&&wardenMotionFrame(actor,view,animationPose(actor,clock,view));
    window.wardenStrikeQA.trace.push({
     frame:travel.strikeFrame,left:travel.points.gripL,right:travel.points.gripR,soleL:travel.points.soleL,soleR:travel.points.soleR,
     error:Math.hypot(blade.x-effect.x,blade.y-effect.y),close:close?.atlas.key,
    });
    if(capture&&activeCinematic&&clock-lastCapture>.065){
     const margin=Math.max(18,W*.095),width=W-2*margin,height=Math.min(H*.61,width*.42);
     const y=Math.max(50,(H-height)*.51),pane=(width-8)/2;
     const crop=document.createElement('canvas');
     crop.width=480;crop.height=380;
     crop.getContext('2d').drawImage(canvas,margin*DPR,(y+43)*DPR,pane*DPR,(height-74)*DPR,0,0,crop.width,crop.height);
     window.wardenStrikeQA.capture.push(crop.toDataURL('image/webp',.9).split(',')[1]);
     lastCapture=clock;
    }
   },20);
  },{weapon,capture:!!capture});
  await tap('#modal-0');
  await page.waitForFunction(()=>travelVisual(current(),clock)?.source.cell===272);
  const ready=await page.evaluate(()=>travelVisual(current(),clock).points);
  assert.ok(ready.gripR[0]<ready.gripL[0],'front-facing right-hand socket appears on viewer left');
  if(braced){
   await tap('#brace');
   await page.waitForFunction(()=>current().braceBlend===1);
  }
  const planted=await page.evaluate(()=>travelVisual(current(),clock).points);
  await tap('#strike');
  const target=await page.evaluate(()=>{
   const {foe}=window.wardenStrikeQA,b=travelVisual(foe,clock)?.bounds||unitBounds(foe);
   for(const dy of [.5,.55,.45,.6,.4,.65,.35,.73])for(const dx of [.5,.55,.45,.6,.4,.65,.35]){
    const x=Math.round(b.x+b.w*dx),y=Math.round(b.y+b.h*dy);
    if(document.elementFromPoint(x,y)===canvas&&pick(x,y)===foe)return{x,y};
   }
   throw Error('No exposed melee target');
  });
  await (mobile?page.touchscreen.tap(target.x,target.y):page.mouse.click(target.x,target.y));
  await page.waitForFunction(()=>{
   const {foe}=window.wardenStrikeQA;
   return !battle.busy&&foe.hp.body<foe.max.body;
  });
  const trace=await page.evaluate(()=>window.wardenStrikeQA.trace);
  assert.ok(new Set(trace.map(s=>s.frame)).size>=5,weapon+' plays a strike sequence');
  assert.ok(trace.some(s=>Math.hypot(s.left[0]-planted.gripL[0],s.left[1]-planted.gripL[1])>.045),
   weapon+' moves the left grip in the battle view');
  assert.ok(trace.every(s=>Math.hypot(s.right[0]-planted.gripR[0],s.right[1]-planted.gripR[1])<.002),
   weapon+' leaves the ranged grip planted in the right hand');
  assert.ok(trace.every(s=>s.error<.01),weapon+' impact follows left-hand weapon tip');
  assert.ok(trace.some(s=>s.close?.endsWith('-strike')),'close camera uses the strike bake');
  if(braced)for(const s of trace){
   assert.deepEqual(s.soleL,planted.soleL);
   assert.deepEqual(s.soleR,planted.soleR);
  }
  if(capture){
   const frames=await page.evaluate(()=>window.wardenStrikeQA.capture);
   writeFileSync(join(capture,'melee-battle-capture.json'),JSON.stringify(frames));
  }
 }
 console.log('PASS Warden right ranged socket and left-hand strikes: '+weapons.join(', '));
};
