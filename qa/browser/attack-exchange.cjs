const assert=require('node:assert/strict');

module.exports=async function checkAttackExchange({page,mobile,origin,tap}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.clock.install({time:new Date('2026-11-11T00:00:00Z')});
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 await page.evaluate(()=>{
  save=fresh();save.owned.push('cleaver');save.units[0].melee='cleaver';
  deploy(0,false,[0]);
  const ally=current(),foe=battle.units[1];
  const dx=[2,-2].find(step=>onBoard(ally.x+step,ally.z)&&!battle.cover.has((ally.x+step)+','+ally.z));
  foe.x=foe.vx=ally.x+dx;foe.z=foe.vz=ally.z;ally.heading=headingTo(-dx,0);
  lockedTarget=foe.id;focusBattleCamera(ally,true);renderBattle();Math.random=()=>0;
  const empty=()=>({panes:{},braced:[],release:{},sequence:null,same:true,camera:[]});
  window.attackQA={ally,foe,dx,trace:empty(),empty};
  const pane=drawAttackPane,fire=drawCinematicFire;
  drawAttackPane=(sequence,bounds,subject,attacking,t)=>{
   const trace=attackQA.trace,phase=sequence.reaction?'return':'opening';
   trace.sequence??=sequence;
   trace.same&&=trace.sequence===sequence;
   (trace.panes[phase]??={})[subject.id]=[bounds.x,bounds.y];
   if(attacking&&sequence.phase==='aim'&&subject.attack&&animationPose(subject,t).primePhase==='step')
    if(!trace.braced.includes(phase))trace.braced.push(phase);
   return pane(sequence,bounds,subject,attacking,t);
  };
  drawCinematicFire=(sequence,actor,bounds,t)=>{
   if(sequence.phase==='fire')attackQA.trace.release[sequence.reaction?'return':'opening']=[actor.id,actor.face,sequence.w.id];
   return fire(sequence,actor,bounds,t);
  };
  new MutationObserver(records=>attackQA.trace.camera.push(...records.map(r=>r.oldValue)))
   .observe(document.body,{attributes:true,attributeOldValue:true,attributeFilter:['data-shot']});
 });
 // Drive each animation frame explicitly. Software WebGL can otherwise skip the
 // opening brace while wall-clock timers continue; all original assertions remain.
 await page.clock.pauseAt(new Date((await page.evaluate(()=>Date.now()))+60000));
 let stepping=true;
 const pumping=(async()=>{
  while(stepping){await page.clock.runFor(1000/60);await new Promise(setImmediate);}
 })();
 const checkExchange=async()=>{
 await tap('#modal-0');
 await tap('#fire');
 const target=await page.evaluate(()=>{
  const {foe}=attackQA,b=travelVisual(foe,clock)?.bounds||unitBounds(foe);
  for(const dy of [.5,.55,.45,.6,.4,.65,.35])for(const dx of [.5,.55,.45,.6,.4,.65,.35]){
   const x=Math.round(b.x+b.w*dx),y=Math.round(b.y+b.h*dy);
   if(document.elementFromPoint(x,y)===canvas&&pick(x,y)===foe)return{x,y};
  }
  throw Error('No exposed target');
 });
 await (mobile?page.touchscreen.tap(target.x,target.y):page.mouse.click(target.x,target.y));
 await page.waitForFunction(()=>!battle.busy&&attackQA.foe.reacted);

 async function check(weapon){
  const trace=await page.evaluate(()=>{const {ally,foe,trace}=attackQA;const {sequence,...report}=trace;return {...report,ally:ally.id,foe:foe.id}});
  assert.deepEqual(trace.camera,[null,'active'],'one uninterrupted split screen');
  assert.ok(trace.same,'both attacks share the camera');
  assert.deepEqual(trace.panes.opening,trace.panes.return,'both combatants stay in the same panes');
  assert.deepEqual(trace.braced,['opening','return'],'both mechs brace inside the camera');
  assert.deepEqual(trace.release.opening,[weapon==='rifle'?trace.ally:trace.foe,1,'rifle']);
  assert.deepEqual(trace.release.return,[weapon==='rifle'?trace.foe:trace.ally,-1,weapon]);
 }
 await check('rifle');
 await page.evaluate(()=>{
  const {ally,foe,dx,empty}=attackQA;
  foe.x=foe.vx=ally.x+Math.sign(dx);
  foe.blackout={ap:4,aim:.2,hold:false};
  attackQA.trace=empty();
 });
 await tap('#end');
 await page.waitForFunction(()=>!battle.busy&&battle.turn===2);
 await check('cleaver');
 };
 try{await Promise.race([checkExchange(),pumping]);}
 finally{stepping=false;await pumping.catch(()=>{});if(!page.isClosed())await page.clock.resume();}
};
