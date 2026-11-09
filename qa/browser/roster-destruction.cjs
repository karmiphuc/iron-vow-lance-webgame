const assert=require('node:assert/strict');
const {join}=require('node:path');

module.exports=async function checkRosterDestruction({page,mobile,origin,tap}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 for(const [contract,model,part] of [[0,'ASHIGARU','body'],[3,'BULWARK-AEGIS','body'],
   [3,'BULWARK-AEGIS','pilot'],[1,'AERO','body']]){
  await page.evaluate(({contract,model,part})=>{
   battle=null;save=fresh();deploy(contract,false,[0,1,2]);
   const ally=current(),foe=battle.units.find(u=>FRAMES[u.frame]?.name===model);
   if(!foe)throw Error(model+' is missing from the encounter');
   battle.cover.clear();
   battle.units=battle.units.filter(u=>u===ally||u===foe);
   foe.x=foe.vx=ally.x+2;foe.z=foe.vz=ally.z-1;
   ally.heading=headingTo(foe.x-ally.x,foe.z-ally.z);
   foe.hp[part]=1;foe.reacted=true;Math.random=()=>.20;
   if(model==='BULWARK-AEGIS')foe.hp.left=0;
   lockedTarget=foe.id;focusBattleCamera(ally,true);renderBattle();
   window.rosterTrace={foe,field:[],camera:[]};
   window.rosterDraw??=drawUnitBody;
   drawUnitBody=(u,t,close)=>{
    if(u.id===foe.id&&!u.alive){
     const render=foundryRender(u,t),stream=rosterTrace[close?'camera':'field'];
     const last=stream.at(-1),y=render.anchors.body[1];
     if(!last||last.index!==render.index||Math.abs(y-last.y)>.015){
      stream.push({age:t-u.deathTime,y,index:render.index,ready:!!render.destruction,collapse:!!render.collapse});
     }
    }
    return rosterDraw(u,t,close);
   };
  },{contract,model,part});
  await tap('#modal-0');
  await tap('#fire');
  if(part==='pilot'){
   if(mobile)await tap('#target-toggle');
   await tap('[data-part="pilot"]');
  }
  const point=await page.evaluate(()=>{
   const u=rosterTrace.foe,b=travelVisual(u,clock)?.bounds||unitBounds(u);
   for(const dy of [.50,.55,.45,.60,.40,.65,.35])for(const dx of [.50,.55,.45,.60,.40,.65,.35]){
    const x=Math.round(b.x+b.w*dx),y=Math.round(b.y+b.h*dy);
    if(document.elementFromPoint(x,y)===canvas&&pick(x,y)===u)return{x,y};
   }
   throw Error('Target cannot be picked');
  });
  await (mobile?page.touchscreen.tap(point.x,point.y):page.mouse.click(point.x,point.y));
  if(process.env.IRON_VOW_ROSTER_DEATH_PROOF){
   for(const [age,label] of [[.36,'buckle'],[1.04,'contact']]){
    await page.waitForFunction(age=>!rosterTrace.foe.alive&&destructionAge(rosterTrace.foe,clock)>=age,age);
    await page.screenshot({path:join(process.env.IRON_VOW_ROSTER_DEATH_PROOF,
     `${model}-${part}-${mobile?'touch':'desktop'}-${label}.png`)});
   }
  }
  await page.waitForFunction(()=>!rosterTrace.foe.alive&&!battle);
  const report=await page.evaluate(mobile=>{
   const {foe,field,camera}=rosterTrace;
   return {frames:mobile?field:camera,reason:foe.downReason,events:foe.deathEvents,age:clock-foe.deathTime};
  },mobile);
  const {frames}=report;
  assert.equal(report.reason,part);
  assert.ok(frames.length>=5,model+' plays intermediate poses '+JSON.stringify(frames));
  assert.ok(frames.at(-1).y>frames[0].y+.06,model+' chassis visibly drops');
  assert.ok(frames.every(f=>f.ready),model+' uses the authored collapse from the first pose');
  assert.equal(Boolean(report.events&2),part==='body',model+' reactor blast belongs to body kills');
  if(model==='BULWARK-AEGIS')assert.ok(report.age>2.7,model+' gets the heavy settle before victory');
 }
 console.log('PASS Ashigaru and Aero deaths, and distinct Bulwark cockpit and heavy reactor kills');
};
