const assert=require('node:assert/strict');
module.exports=async function checkLiveWarden({page,mobile,origin}){
 await page.addInitScript(()=>{window.IRON_VOW_LIVE_WARDEN=true});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 await page.evaluate(()=>{
  createBattle(0,false,false,[0]);surveyTerrain(0);const u=current();battle.cover.clear();
  for(const cell of battle.field.cells)cell.level=0;
  Object.assign(u,{x:8,z:10,vx:8,vz:10,moveLeft:4,heading:headingTo(1,0),face:1,attack:null});
  battle.units.filter(other=>other!==u).forEach((other,i)=>Object.assign(other,{x:17,z:i+1,vx:17,vz:i+1}));
  action='move';closeModal();focusBattleCamera(u,true);renderBattle();
 });
 await page.waitForFunction(()=>window.IronVowFoundry?.wardenReady?.());
 await page.evaluate(()=>{
  const draw=IronVowFoundry.draw,unit=current();
  window.liveWardenQA={unit,draws:0,unpaired:false,invalidAnchors:false};
  IronVowFoundry.draw=(...args)=>{
   const result=draw(...args),qa=liveWardenQA;
   if(args[0]===qa.unit&&result){
    qa.draws++;qa.pixels=result.surface.width;qa.span=result.span;
    if(qa.unit.motion&&!qa.unit.motion.jumpjet&&qa.unit.motion.stepBeats==null)qa.unpaired=true;
    qa.invalidAnchors||=Object.values(result.anchors).some(point=>!point.every(Number.isFinite));
   }
   return result;
  };
 });
 const point=await page.evaluate(()=>project(10,0,10));
 if(mobile){await page.touchscreen.tap(point.x,point.y);await page.touchscreen.tap(point.x,point.y)}
 else await page.mouse.click(point.x,point.y);
 await page.waitForFunction(()=>!battle.busy&&current().x===10&&current().z===10);
 const result=await page.evaluate(()=>{
  const u=current(),ground=unitBounds(u).y;
  u.motion={jumpjet:true,start:clock-.5,duration:1};const airborne=unitBounds(u).y;u.motion=null;
  window.IRON_VOW_LIVE_WARDEN=false;const fallback=foundryRender(u,clock,true)===null;
  return {...liveWardenQA,unit:null,ground,airborne,fallback};
 });
 assert.ok(result.draws>0,'the real WebGL Warden draws');
 assert.equal(result.pixels,mobile?704:896,'live Warden uses the HD target');
 assert.equal(result.span,1.3,'overhead poses use the tall field frame');
 assert.equal(result.unpaired,false,'live movement keeps continuous gait coordinates');
 assert.equal(result.invalidAnchors,false,'weapon and damage anchors remain finite');
 assert.ok(result.airborne<result.ground,'mastered Jumpjet raises the live Warden');
 assert.equal(result.fallback,true,'the baked opt-out remains available');
};
