const assert=require('node:assert/strict');

module.exports=async function checkVolley({page,mobile,origin,tap}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 if(mobile)await page.setViewportSize({width:320,height:720});
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 await page.evaluate(()=>{
  save=fresh();save.owned.push('shotgun');save.units[0].weapon='shotgun';
  deploy(0,false,[0]);Math.random=()=>0;
  const ally=current(),foe=battle.units[1];
  const dx=[2,-2].find(step=>onBoard(ally.x+step,ally.z)&&!battle.cover.has((ally.x+step)+','+ally.z));
  foe.x=foe.vx=ally.x+dx;foe.z=foe.vz=ally.z;foe.reacted=true;
  lockedTarget=foe.id;focusBattleCamera(ally,true);renderBattle();
  window.volleyQA={ally,foe,before:{...foe.hp},ap:ally.ap,budget:attackBudget(ally,foe,'body',weapon('shotgun'))};
  const paint=drawAttackPartHP;
  drawAttackPartHP=(sequence,pane,subject,t)=>{
   if(subject!==foe||sequence.phase!=='result'||volleyQA.flash)return paint(sequence,pane,subject,t);
   const edges=[],stroke=ctx.strokeRect;
   ctx.strokeRect=function(...args){edges.push(this.strokeStyle);return stroke.apply(this,args)};
   try{
    const result=paint(sequence,pane,subject,t);
    if(edges.includes('#ffe1a2'))volleyQA.flash=edges;
    return result;
   }finally{ctx.strokeRect=stroke}
  };
 });
 await tap('#modal-0');
 await tap('#fire');
 if(mobile)await tap('#target-toggle');
 await tap('[data-part="body"]');
 const point=await page.evaluate(()=>{
  const {foe}=volleyQA,b=travelVisual(foe,clock)?.bounds||unitBounds(foe);
  for(const dy of [.5,.55,.45,.6,.4,.65,.35])for(const dx of [.5,.55,.45,.6,.4,.65,.35]){
   const x=Math.round(b.x+b.w*dx),y=Math.round(b.y+b.h*dy);
   if(document.elementFromPoint(x,y)===canvas&&pick(x,y)===foe)return{x,y};
  }
  throw Error('No exposed target');
 });
 await (mobile?page.touchscreen.tap(point.x,point.y):page.mouse.click(point.x,point.y));
 await page.waitForFunction(()=>volleyQA.flash&&!battle.busy);
 const result=await page.evaluate(()=>{
  const {ally,foe,before,ap,budget,flash}=volleyQA;
  return {loss:Object.fromEntries(Object.keys(before).map(part=>[part,before[part]-foe.hp[part]])),
   cost:ap-ally.ap,budget,flash,log:battle.log.at(-1)};
 });
 assert.deepEqual(result.flash,Array(5).fill('#ffe1a2'),'all five hit parts flash in the same exchange');
 assert.equal(result.cost,3);
 assert.ok(Object.values(result.loss).every(damage=>damage>0));
 assert.equal(Object.values(result.loss).reduce((a,b)=>a+b),result.budget);
 for(const label of ['BODY','PILOT','WEAPON ARM','LEFT ARM','LEGS'])assert.ok(result.log.includes(label));
};
