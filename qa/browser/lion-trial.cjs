const assert=require('node:assert/strict');

module.exports=async function checkLionTrial({page,mobile,origin,tap}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{
  const request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),pending=new Set();
  window.requestAnimationFrame=fn=>{const id=request(t=>{pending.delete(id);fn(t);});pending.add(id);return id;};
  window.__stopLionFrames=()=>{for(const id of pending)cancel(id);pending.clear();};
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
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
 await page.evaluate(()=>__stopLionFrames());
 const epoch=new Date('2026-11-11T00:00:00Z');await page.clock.install({time:epoch});await page.clock.pauseAt(new Date(epoch.getTime()+10000));
 await page.evaluate(()=>{const renderer=IronVowRenderer.get();window.__lionRender=renderer.render;renderer.render=()=>{};requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),1000/30);last=performance.now();requestAnimationFrame(draw);});
 const click=async selector=>{const box=await page.locator(selector).boundingBox();if(!box)throw Error('Missing trial control '+selector);const x=box.x+box.width/2,y=box.y+box.height/2;await(mobile?page.touchscreen.tap(x,y):page.mouse.click(x,y));};
 const ready=async()=>{for(let i=0;i<200;i++){await page.clock.runFor(34);if(await page.evaluate(()=>IronVowScene.ready&&lionMotionImages(current().melee).every(imageReady)))return;await new Promise(resolve=>setTimeout(resolve,25));}throw Error('Lion trial art did not load');};
 const career=await page.evaluate(()=>localStorage.getItem('iron-vow-career'));
 await page.evaluate(()=>{Math.random=()=>0});
 for(const id of ['cleaver','hatchet','breaker']){
  await click(`[data-lion-weapon="${id}"]`);await ready();
  await click('#strike');
  const target=await page.evaluate(()=>{
   window.lionDraws.length=0;
   const foe=battle.units[1],p=IronVowScene.projectWorld(IronVowScene.partPoint(foe));
   if(IronVowScene.pick(p.x,p.y)!==foe)throw Error('Visible target failed its actual raycast');return p;
  });
  await (mobile?page.touchscreen.tap(target.x,target.y):page.mouse.click(target.x,target.y));
  await page.clock.runFor(3000);
  assert.equal(await page.evaluate(()=>!battle.busy&&battle.units[1].hp.body<battle.units[1].max.body),true);
  const result=await page.evaluate(()=>({frames:window.lionDraws,ap:current().ap,damage:200-battle.units[1].hp.body}));
  const active=result.frames.filter(([weapon,,frame])=>weapon===id&&frame>0);
  assert.ok(result.ap<8&&result.damage>0,id+' uses the real Strike command');
  assert.ok(active.some(([, ,frame])=>frame>=17&&frame<=19),id+' shows contact in the Canvas');
  const finish=active.findIndex(([, ,frame])=>frame>=20&&frame<=23);
  assert.ok(finish>=0&&active.slice(finish+1).some(([, ,frame])=>frame>=24&&frame<=30),id+' renders the downward finish before recovery: '+JSON.stringify(result.frames));
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('iron-vow-career')),career,'trial does not overwrite the career');
 await click('#end');await page.clock.runFor(100);await ready();
 assert.equal(await page.evaluate(()=>battle.units[1].hp.body===200&&current().melee==='breaker'),true);
 await page.evaluate(()=>{IronVowRenderer.get().render=__lionRender;});await page.clock.runFor(34);
};
