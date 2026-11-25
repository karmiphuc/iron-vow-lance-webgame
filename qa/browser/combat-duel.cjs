const assert=require('node:assert/strict');
const {join}=require('node:path');

module.exports=async function checkCombatDuel({page,origin,mobile,out}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{
  const request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),pending=new Set();
  window.requestAnimationFrame=fn=>{const id=request(t=>{pending.delete(id);fn(t);});pending.add(id);return id;};
  window.stopDuelFrames=()=>{for(const id of pending)cancel(id);pending.clear();};
 });
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ironVow);

 async function fixture(range){
  const attack=await page.evaluate(range=>{
   const weapon=range===7?'missile':'rail';
   __ironVow.start({seed:4242,contract:0,frames:[0,1],loadouts:[{weapon,condition:100,upgrade:0}]});
   const [actor,bystander]=battle.units.filter(u=>u.team==='ally');
   const target=battle.units.find(u=>u.team==='enemy'&&!u.kind);
   battle.units=[actor,bystander,target];
   battle.cover.clear();
   for(const cell of battle.field.cells)cell.level=0;
   for(const [unit,x,z] of [[actor,4,8],[target,4+range,8],[bystander,3,10]]){
    Object.assign(unit,{x,z,vx:x,vz:z,ap:20});
   }
   if(range===7)target.hp.right=0;
   else{
    Object.assign(target,{frame:0,weapon:'rifle',melee:null,shield:null});
    for(const unit of [actor,target])for(const part in unit.hp)unit.hp[part]=unit.max[part]=1000;
   }
   ruleRandom=()=>0;
   IronVowScene.clear();IronVowScene.render(clock,1);
   const choice=__ironVow.choices(actor.id).attacks.find(a=>a.target===target.id&&a.mode==='fire'&&a.part==='body');
   window.duelWatch=choice?{choice,range,actor:actor.id,target:target.id,bystander:bystander.id,frames:{}}:null;
   return Boolean(choice);
  },range);
  assert.ok(attack,'The '+range+'-tile shot is legal');
 }
 const advanceUntil=async(predicate,message)=>{
  for(let i=0;i<180;i++){
   if(await page.evaluate(predicate))return;
   await page.clock.runFor(34);
  }
  throw Error(message);
 };
 await fixture(7);
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:90000});
 await page.evaluate(()=>stopDuelFrames());
 const epoch=new Date('2026-11-11T00:00:00Z');
 await page.clock.install({time:epoch});
 await page.clock.pauseAt(new Date(epoch.getTime()+10000));
 // FM3 duel grammar (owner, 2026-11-22): sample the first rendered frame of every camera beat. Each beat frames ONE hull: the
 // attacker through brace and release, the defender on the hit; a lane-side flight shot only for rounds long in the air. The ally
 // keeps the left of the screen through return fire.
 await page.evaluate(()=>{
  const drawHealth=drawDuelHealth,drawPanel=drawDuelPanel;
  drawDuelPanel=(shot,unit,x,y,w,h,mirror)=>{
   window.duelPanels.push({id:unit.id,x,y,w,h,mirror});
   drawPanel(shot,unit,x,y,w,h,mirror);
  };
  drawDuelHealth=shot=>{
   window.duelPanels=[];
   drawHealth(shot);
   if(shot.cameraBeat&&window.duelWatch){
    const key=(shot.actor.id===duelWatch.actor?'':'counter-')+shot.cameraBeat;
    (duelWatch.panels??={})[key]=window.duelPanels;
   }
  };
  const render=IronVowScene.render;
  IronVowScene.render=function(t,dt){
   const result=render.call(this,t,dt),shot=activeCinematic,watch=window.duelWatch;
   if(!shot||!watch||!shot.cameraBeat)return result;
   const key=(shot.actor.id===watch.actor?'':'counter-')+shot.cameraBeat;
   if(watch.frames[key])return result;
   const {camera,scene,models}=IronVowScene;
   const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
   const direction=models.get(watch.target).proxy.position.clone().sub(models.get(watch.actor).proxy.position);
   const box=id=>{
    const b=new THREE.Box3().setFromObject(models.get(id).proxy),{min,max}=b;
    let edge=0,depth=0,top=-Infinity,bottom=Infinity,left=Infinity,rightmost=-Infinity,front=true;
    for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z]){
     const point=new THREE.Vector3(x,y,z),ndc=point.clone().project(camera),view=-point.clone().applyMatrix4(camera.matrixWorldInverse).z;
     front&&=view>0;edge=Math.max(edge,Math.abs(ndc.x));left=Math.min(left,ndc.x);rightmost=Math.max(rightmost,ndc.x);depth=Math.max(depth,view);top=Math.max(top,ndc.y);bottom=Math.min(bottom,ndc.y);
    }
    const center=b.getCenter(new THREE.Vector3()).project(camera).toArray();
    // on screen = in front of the camera and overlapping the frame horizontally and vertically
    const onScreen=front&&rightmost>-1&&left<1&&top>-1&&bottom<1;
    return {edge,depth,front,onScreen,height:(Math.min(1,top)-Math.max(-1,bottom))/2,center};
   };
   watch.frames[key]={actor:shot.actor.id,target:shot.target.id,boxes:{[watch.actor]:box(watch.actor),[watch.target]:box(watch.target)},
    screenDirection:Math.sign(direction.dot(right)),roll:Math.asin(Math.max(-1,Math.min(1,right.y)))*180/Math.PI,dt,fogNear:scene.fog.near,
    bystanderVisible:models.get(watch.bystander).object.visible,overlays:IronVowScene.overlayInfo()};
   return result;
  };
  last=performance.now();requestAnimationFrame(draw);
 });
 const fire=()=>page.evaluate(()=>{
  const {actor,choice}=window.duelWatch;
  void __ironVow.attack(actor,choice.target,choice.part,choice.mode);
 });
 const assertCinematic=(frame,label)=>{
  assert.ok(frame.dt>0&&frame.dt<=.05,label+': sampled at a normal frame delta');
  assert.equal(frame.bystanderVisible,false,label+': bystanders are hidden');
  assert.equal(frame.overlays.selected||frame.overlays.target,false,label+': no board rings');
  assert.equal(frame.screenDirection,1,label+': the ally stays on the left of the enemy');
 };
 // one hull carries the shot: big, in frame, clear of fog; the other is small or out of the picture
 const assertSingle=(frame,subject,label,min=.45)=>{
  assertCinematic(frame,label);
  const own=frame.boxes[subject],other=frame.boxes[Object.keys(frame.boxes).find(id=>id!==subject)];
  assert.ok(own.front&&own.height>=min&&own.height<=1,label+': one hull fills the frame '+JSON.stringify(own));
  assert.ok(own.depth<frame.fogNear,label+': the subject is clear of the fog');
  assert.ok(!other.onScreen||other.height<own.height*.7,label+': no second hull competes for the frame '+JSON.stringify(other));
 };
 const assertPanels=async (beat,ally,enemy)=>{
  const panels=await page.evaluate(beat=>duelWatch.panels?.[beat],beat);
  assert.ok(panels?.length===2,beat+': both sides have a health panel');
  assert.deepEqual(panels.map(panel=>panel.id),[ally,enemy],beat+': both sides retain their panel');
  assert.deepEqual(panels.map(panel=>panel.mirror),[false,true]);
  assert.ok(mobile?panels[0].y+panels[0].h<panels[1].y:panels[0].x+panels[0].w<panels[1].x,
   beat+': both panels fit without overlapping');
 };
 const skip=async()=>{
  await page.evaluate(()=>document.querySelector('#skip-shot').click());
  await advanceUntil(()=>!__ironVow.pending&&!activeCinematic,'Skip did not return to the tactical board');
  await page.clock.runFor(34);
  assert.equal(await page.evaluate(()=>IronVowScene.models.get(window.duelWatch.bystander).object.visible),true);
 };

 // Long range: missiles brace, release (Dutch tilt), fly with the defender ahead, then hit.
 await fire();
 await advanceUntil(()=>window.duelWatch.frames.hit,'The missile never reached the hit camera');
 const missile=await page.evaluate(()=>window.duelWatch.frames),attacker=missile.brace.actor,defender=missile.brace.target;
 assertSingle(missile.brace,attacker,'Missile brace');
 assertSingle(missile.release,attacker,'Missile release');
 assert.ok(Math.abs(Math.abs(missile.release.roll)-5)<.6,'The release shot leans about 5 degrees: '+missile.release.roll);
 assert.ok(Math.abs(missile.brace.roll)<.1,'The brace shot is level');
 assertCinematic(missile.flight,'Missile flight');
 assert.ok(missile.flight.boxes[defender].front&&missile.flight.boxes[defender].edge<1&&missile.flight.boxes[defender].height>=.25,'The flight shot holds the defender ahead: '+JSON.stringify(missile.flight.boxes[defender]));
 assertSingle(missile.hit,defender,'Missile hit');
 for(const beat of ['brace','release','flight','hit'])await assertPanels(beat,attacker,defender);
 assert.ok(Math.abs(missile.hit.boxes[defender].center[0])<.5,'The hit frames the defender near centre');
 if(out){await page.clock.runFor(120);await page.screenshot({path:join(out,mobile?'missile-hit-touch.png':'missile-hit-desktop.png')});}
 await skip();

 await fixture(2);
 for(let i=0;i<120&&!await page.evaluate(()=>IronVowScene.ready);i++){
  await new Promise(resolve=>setTimeout(resolve,20));await page.clock.runFor(34);
 }
 assert.equal(await page.evaluate(()=>IronVowScene.ready),true,'The short exchange rigs are ready');
 // Short range: no flight shot; brace, release, hit, then the counter mirrors it with the ally still on the left.
 await fire();
 await advanceUntil(()=>window.duelWatch.frames['counter-hit'],'The defender did not return fire');
 const exchange=await page.evaluate(()=>window.duelWatch.frames),ally=exchange.brace.actor,enemy=exchange.brace.target;
 assert.equal(exchange.flight,undefined,'A short exchange has no flight shot');
 assertSingle(exchange.release,ally,'Rail release');
 assertSingle(exchange.hit,enemy,'Rail hit');
 assertSingle(exchange['counter-release'],enemy,'Counter release');
 assertSingle(exchange['counter-hit'],ally,'Counter hit');
 for(const beat of ['hit','counter-release','counter-hit'])await assertPanels(beat,ally,enemy);
 assert.ok(Math.sign(exchange.release.roll)===-Math.sign(exchange['counter-release'].roll),'Each side leans toward its own line of fire');
 if(out)await page.screenshot({path:join(out,mobile?'counter-touch.png':'counter-desktop.png')});
 await skip();
 console.log('PASS FM3 duel beats: single-hull brace, tilted release, lane-side flight, defender hit, mirrored counter, fixed screen sides, tactical return');
};
