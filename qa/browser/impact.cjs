const assert=require('node:assert/strict');

module.exports=async function checkImpact({page,mobile,origin,tap}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 for(const mode of ['travel','native','hellbreaker','baked','live']){
  await page.evaluate(mode=>{
   window.originalFoundryDraw??=window.IronVowFoundry.draw;
   window.IronVowFoundry.draw=mode==='live'?window.originalFoundryDraw:()=>null;
   const foundry=mode==='live'||mode==='baked';
   createBattle(foundry?2:0,false,!foundry,LANCE_SLOTS,true,null,0,true,false,false);
   const foe=battle.units.find(u=>u.team==='enemy'&&!u.kind&&(!foundry||foundryModel(u.frame)!=null&&u.frame!==LINE_ELITE_FRAME));
   if(mode==='native'){foe.frame=3;foe.weapon='morrow';preloadNativeMotion(3);}
   if(mode==='hellbreaker'){foe.frame=HELLBREAKER;foe.weapon='morrow';preloadNativeMotion(HELLBREAKER);}
   foe.headingOverride=mode==='travel'?undefined:-Math.PI/4;
   window.impactSubject=foe;
  },mode);
  await page.waitForFunction(mode=>{
   const u=window.impactSubject;
   if(mode==='travel')return !!travelVisual(u,1);
   if(mode==='baked')return !!foundryRender(u,1)?.cell;
   if(mode==='live')return !!foundryRender(u,1,true)?.surface;
   return imageReady(artImages[activeWardenVisual(u).key]);
  },mode);
  const result=await page.evaluate(({mode})=>{
   const u=window.impactSubject,close=mode!=='travel',oldOrigin=origin,oldScale=scale;
   const part='left',max=u.max[part],y=Math.round(H*.61),x=Math.round(W*.51),span=240,t=5;
   function sample(age,hp,facing=-1){
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
    scale=70;
    origin={x:x-(u.vx-u.vz)*scale*.866,y:y-(u.vx+u.vz)*scale*.42};
    u.face=facing;u.heading=facing*Math.PI/4;
    if(close)u.headingOverride=u.heading;
    u.hp[part]=hp;u.hitTime=age==null?undefined:t-age;u.hitPart=age==null?undefined:part;
    drawUnit(u,t,close);
    const anchor=mechAttachmentPoint(u,part,t);
    const data=ctx.getImageData(x-span/2,y-span,span,span+30).data;
    origin=oldOrigin;scale=oldScale;ctx.restore();
    return {data,anchor};
   }
   function diff(a,b){
    let count=0,outside=0,alpha=0;
    for(let i=0;i<a.data.length;i+=4){
     if(!a.data[i+3]||!b.data[i+3]){if(a.data[i+3]!==b.data[i+3])alpha++;continue}
     const d=Math.max(...[0,1,2].map(c=>Math.abs(a.data[i+c]-b.data[i+c])));
     if(d<7)continue;
     const p=i/4;
     if(Math.hypot(x-span/2+p%span-b.anchor.x,y-span+Math.floor(p/span)-b.anchor.y)>32)outside++;
     count++;
    }
    return {count,outside,alpha};
   }
   // Warm the canvas readback path before making pixel comparisons.
   for(let i=0;i<5;i++)sample(null,max);
   const undamaged=sample(null,max),moderate=sample(null,Math.ceil(max*.7)),hit=sample(.17,Math.ceil(max*.7)),aged=sample(3,Math.ceil(max*.7)),worn=sample(null,Math.ceil(max*.3));
   const report={flash:diff(moderate,hit),damage:diff(undamaged,worn),aged:diff(moderate,aged)};
   if(mode==='travel'){
    report.facings=[-3,-1,1,3].map(heading=>{
     const before=sample(null,Math.ceil(max*.7),heading),rightHit=sample(.17,Math.ceil(max*.7),heading);
     return diff(before,rightHit);
    });
   }
   return report;
  },{mode});
  assert.ok(result.flash.count>15,mode+' visible impact');
  assert.equal(result.flash.outside,0,mode+' flash stays on the hit subsystem');
  assert.ok(result.damage.count>15,mode+' persistent damage');
  assert.equal(result.aged.count,0,mode+' flash clears');
  if(mode!=='live')assert.equal(result.damage.outside,0,mode+' damage stays localized');
  if(result.facings)assert.ok(result.facings.every(facing=>facing.count>15&&facing.outside===0),'tint follows all four facings');
 }
 if(!mobile)await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{
  window.IronVowFoundry.draw=window.originalFoundryDraw;
  battle=null;save=fresh();deploy(0,false,[0]);
  Math.random=()=>0;
  const foe=battle.units[1],ally=current();
  foe.x=foe.vx=ally.x+1;foe.z=foe.vz=ally.z-2;
  foe.hp.left=Math.floor(foe.max.left*.60);foe.reacted=true;
  lockedTarget=foe.id;focusBattleCamera(ally,true);renderBattle();persist();
  window.partTrace={field:false,camera:false,scorch:false};
  const draw=drawPartTints;
  drawPartTints=(u,t,paint,anchor,scorch)=>draw(u,t,paint,part=>{
   if(u.id===foe.id&&part==='left'&&u.hitPart===part){
    const age=t-u.hitTime;
    if(age>=0&&age<.72)window.partTrace[u.headingOverride===undefined?'field':'camera']=true;
    else if(age>=.72&&u.headingOverride===undefined)window.partTrace.scorch=true;
   }
   return anchor(part);
  },scorch);
 });
 await tap('#modal-0');
 await tap('#fire');
 if(mobile)await tap('#target-toggle');
 await tap('[data-part="left"]');
 const target=await page.evaluate(()=>{
  const foe=battle.units[1],bounds=travelVisual(foe,clock)?.bounds||unitBounds(foe);
  for(const dy of [.5,.55,.45,.6,.4,.65,.35])for(const dx of [.5,.55,.45,.6,.4,.65,.35]){
   const x=Math.round(bounds.x+bounds.w*dx),y=Math.round(bounds.y+bounds.h*dy);
   if(document.elementFromPoint(x,y)===canvas&&pick(x,y)===foe)return{x,y};
  }
  throw Error('No exposed target');
 });
 await (mobile?page.touchscreen.tap(target.x,target.y):page.mouse.click(target.x,target.y));
 await page.waitForFunction(()=>window.partTrace.scorch&&!battle.busy);
 const trace=await page.evaluate(()=>({events:window.partTrace,part:battle.units[1].hitPart,hp:battle.units[1].hp,max:battle.units[1].max}));
 assert.equal(trace.part,'left');
 assert.ok(trace.hp.left>0&&trace.hp.left<trace.max.left/2);
 assert.equal(trace.hp.right,trace.max.right);
 assert.ok(mobile?trace.events.field:trace.events.camera,'a real shot shows the local hit flash');
 console.log('PASS real '+(mobile?'touch battlefield shot':'desktop attack-camera shot'),trace.events);
};
