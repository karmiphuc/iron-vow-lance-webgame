const assert=require('node:assert/strict');

module.exports=async function checkLionTrial({page,mobile,origin,tap}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{
  const draw=CanvasRenderingContext2D.prototype.drawImage;
  window.lionDraws=[];
  CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
   const match=image?.src?.match(/\/lion-(cleaver|hatchet|breaker)-(left|right)\.webp$/);
   if(match&&args.length===8){
    const [sx,sy,cell]=args;
    window.lionDraws.push([match[1],match[2],sx/cell+4*sy/cell]);
   }
   return draw.call(this,image,...args);
  };
 });
 await page.goto(new URL('?lion=cleaver',origin).href);
 await page.getByRole('heading',{name:'LION WEAPONS TRIAL'}).waitFor();
 const career=await page.evaluate(()=>localStorage.getItem('iron-vow-career'));
 await page.evaluate(()=>{Math.random=()=>0});
 for(const id of ['cleaver','hatchet','breaker']){
  await tap(`[data-lion-weapon="${id}"]`);
  await page.waitForFunction(id=>current()?.melee===id&&lionMotionImages(id).every(imageReady),id);
  await tap('#strike');
  await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
  const target=await page.evaluate(()=>{
   window.lionDraws.length=0;
   const foe=battle.units[1],p=IronVowScene.projectWorld(IronVowScene.partPoint(foe));
   if(IronVowScene.pick(p.x,p.y)!==foe)throw Error('Visible target failed its actual raycast');return p;
  });
  await (mobile?page.touchscreen.tap(target.x,target.y):page.mouse.click(target.x,target.y));
  await page.waitForFunction(()=>!battle.busy&&battle.units[1].hp.body<battle.units[1].max.body);
  const result=await page.evaluate(()=>({frames:window.lionDraws,ap:current().ap,damage:200-battle.units[1].hp.body}));
  const active=result.frames.filter(([weapon,,frame])=>weapon===id&&frame>0);
  assert.ok(result.ap<8&&result.damage>0,id+' uses the real Strike command');
  assert.ok(active.some(([, ,frame])=>frame>=17&&frame<=19),id+' shows contact in the Canvas');
  const finish=active.findIndex(([, ,frame])=>frame>=20&&frame<=23);
  assert.ok(finish>=0&&active.slice(finish+1).some(([, ,frame])=>frame>=24&&frame<=30),id+' renders the downward finish before recovery');
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('iron-vow-career')),career,'trial does not overwrite the career');
 await tap('#end');
 await page.waitForFunction(()=>battle.units[1].hp.body===200&&current().melee==='breaker');
};
