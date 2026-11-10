const assert=require('node:assert/strict');
const {join}=require('node:path');

module.exports=async function checkInfantryDestruction({page,mobile,origin,tap}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 let release,requests=0;
 const coldAtlas=new Promise(resolve=>{release=resolve});
 const hold=async route=>{requests++;await coldAtlas;await route.continue()};
 await page.route('**/assets/foundry-6-death*.webp',hold);
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 for(const [contract,part] of [[0,'body'],[2,'body'],[2,'pilot']]){
  await page.evaluate(({contract,part})=>{
   battle=null;save=fresh();deploy(contract,false,[0]);
   const ally=current(),foe=battle.units.find(u=>u.frame===(contract?LINE_ELITE_FRAME:LINE_INFANTRY_FRAME));
   const dx=[1,-1].find(step=>onBoard(ally.x+step,ally.z)&&!battle.cover.has((ally.x+step)+','+ally.z));
   foe.x=foe.vx=ally.x+dx;foe.z=foe.vz=ally.z;ally.heading=headingTo(dx,0);
   if(!contract)battle.units=battle.units.filter(u=>u===ally||u===foe);
   foe.hp[part]=1;foe.reacted=true;Math.random=()=>0;
   lockedTarget=foe.id;focusBattleCamera(ally,true);renderBattle();
   window.deathTrace={foe,frames:{field:[],camera:[]}};
   window.originalUnitBody??=drawUnitBody;
   drawUnitBody=(u,t,close)=>{
    if(u.id===foe.id&&!u.alive){
     const render=foundryRender(u,t);
     const stream=deathTrace.frames[close?'camera':'field'],last=stream.at(-1);
     if(last?.index!==render.index){
      const age=t-u.deathTime;
      stream.push({age,index:render.index,body:render.anchors.body,loaded:!!render.destruction&&render.cell>0});
     }
    }
    return window.originalUnitBody(u,t,close);
   };
  },{contract,part});
  await tap('#modal-0');
  await tap('#fire');
  if(part==='pilot'){
   if(mobile)await tap('#target-toggle');
   await tap('[data-part="pilot"]');
  }
  const target=await page.evaluate(()=>{
   const foe=deathTrace.foe,b=travelVisual(foe,clock)?.bounds||unitBounds(foe);
   for(const dy of [.5,.55,.45,.6,.4,.65,.35])for(const dx of [.5,.55,.45,.6,.4,.65,.35]){
    const x=Math.round(b.x+b.w*dx),y=Math.round(b.y+b.h*dy);
    if(document.elementFromPoint(x,y)===canvas&&pick(x,y)===foe)return{x,y};
   }
   throw Error('No exposed infantry target');
  });
  await (mobile?page.touchscreen.tap(target.x,target.y):page.mouse.click(target.x,target.y));
  if(!contract){
   await page.waitForFunction(()=>battle?.busy);
   await new Promise(resolve=>setTimeout(resolve,1950));
   release();
   assert.ok(requests>0,'first kill exercises the delayed destruction art request');
  }
  if(process.env.IRON_VOW_DEATH_PROOF){
   for(const [age,label] of [[.14,'hit'],[.50,'buckle'],[.98,'contact'],[1.63,'settle']]){
    await page.waitForFunction(age=>!deathTrace.foe.alive&&clock-deathTrace.foe.deathTime>=age,age);
    await page.screenshot({path:join(process.env.IRON_VOW_DEATH_PROOF,`${mobile?'touch':'desktop'}-${contract}-${part}-${label}.png`)});
   }
  }
  await page.waitForFunction(()=>!deathTrace.foe.alive&&!battle?.busy);
  const report=await page.evaluate(()=>{
   const {foe,frames}=deathTrace;
   const atlas=window.IRON_VOW_FOUNDRY_ART[foundryModel(foe.frame)].destruction;
   const restored={...foe,deathTime:undefined};
   const settled=foundryRender(restored,clock).index;
   const detonation=foe.deathEvents&2;
   return {frames,reason:foe.downReason,detonation,settled,victory:!battle,
    clip:atlas?.clips[foe.downReason],end:foundryRender(foe,clock).index};
  });
  const frames=mobile?report.frames.field:report.frames.camera;
  assert.ok(frames.length>=6,'lethal hit plays intermediate poses instead of jumping to the corpse: '+JSON.stringify(frames));
  assert.ok(frames.every(frame=>frame.loaded),'death poses are loaded from the first rendered frame: '+JSON.stringify(frames.slice(0,3)));
  assert.equal(report.reason,part);
  assert.equal(report.victory,!contract);
  assert.ok(frames[0].body[1]+.10<frames.at(-1).body[1],'torso drops through the sequence');
  assert.equal(report.end,report.clip.start+report.clip.count-1);
  assert.equal(report.settled,report.end,'restored wrecks use the last pose without replaying');
  assert.equal(frames.at(-1).index,report.end,'the settle pose is shown before the attack ends');
  assert.equal(Boolean(report.detonation),part==='body','only a body kill detonates');
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>reducedMotion);
 assert.equal(await page.evaluate(()=>{
  const u=deathTrace.foe,clip=window.IRON_VOW_FOUNDRY_ART[foundryModel(u.frame)].destruction.clips.pilot;
  return foundryRender(u,u.deathTime+.05).index===clip.start+clip.count-1;
 }),true,'reduced motion goes directly to the settled pose');
};
