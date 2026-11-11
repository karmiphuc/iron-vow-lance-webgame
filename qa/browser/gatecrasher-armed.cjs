const assert=require('node:assert/strict');

async function checkSamuraiWalk({page,mobile,origin}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 await page.emulateMedia({reducedMotion:'no-preference'});
 const target=await page.evaluate(async()=>{
  battle=null;save=fresh();save.credits=FRAMES[3].cost+10000;
  if(!acquireHull(3)||!assignChassis(0,3,true))throw Error('Gatecrasher procurement failed');
  createBattle(0,false,false,[0]);surveyTerrain(0);battle.cover.clear();
  for(const cell of battle.field.cells)cell.level=0;
  const actor=current();
  Object.assign(actor,{x:8,z:10,vx:8,vz:10,moveLeft:4,heading:headingTo(1,0),face:1});
  battle.units.filter(u=>u!==actor).forEach((u,i)=>Object.assign(u,{x:17,z:i+1,vx:17,vz:i+1}));
  action='move';closeModal();focusBattleCamera(actor,true);renderBattle();
  await Promise.all(FIELD_HEADINGS.map((_,i)=>travelDetail(actor,travelAtlas(actor).grounded,i).image.decode()));
  const rows=new Map(),previous=draw;
  window.samuraiWalkQA={rows};
  draw=time=>{
   previous(time);
   if(!actor.motion)return;
   const view=travelVisual(actor,clock);
   if(view?.grounded&&view.points.planted)rows.set(view.row,view.source.key);
  };
  await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
  return project(10,0,10);
 });
 if(mobile){await page.touchscreen.tap(target.x,target.y);await page.touchscreen.tap(target.x,target.y)}
 else await page.mouse.click(target.x,target.y);
 await page.waitForFunction(()=>!battle.busy&&current().x===10&&current().z===10);
 const rows=await page.evaluate(()=>[...samuraiWalkQA.rows]);
 assert.ok(rows.length>=8,'the battlefield draws multiple planted-foot poses');
 assert.ok(rows.every(([,key])=>/^grid-travel-gatecrasher-bare-ground-[0-3]$/.test(key)));
}

module.exports=async function checkGatecrasherArmed({page,mobile,origin,tap}){
 for(const mode of ['missile','strike']){
  await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
  await page.locator('#nav button').first().waitFor({state:'attached'});
  await page.emulateMedia({reducedMotion:'no-preference'});
  const credits=await page.evaluate(()=>{
   battle=null;closeModal();save=fresh();save.credits=FRAMES[3].cost+10000;
   if(!acquireHull(3)||!assignChassis(0,3,true))throw Error('Gatecrasher procurement failed');
   selected=0;page='workshop';workshopView='assigned';render();
   return save.credits;
  });
  assert.equal(await page.evaluate(()=>nativeHullKey(3,save.units[0])),'gatecrasher-bare');
  assert.match(await page.locator('[data-equip="cleaver"]').innerText(),/BUY & EQUIP/);
  assert.match(await page.locator('[data-equip="vesper-shoulder"]').innerText(),/BUY & EQUIP/);
  const item=mode==='missile'?'vesper-shoulder':'cleaver';
  await tap('[data-equip="'+item+'"]');
  assert.equal(await page.evaluate(()=>save.credits),credits-(mode==='missile'?2400:1200));
  if(mode==='missile'){
   await tap('[data-equip="cleaver"]');
   assert.equal(await page.evaluate(()=>nativeHullKey(3,save.units[0])),'gatecrasher');
   await tap('#remove-melee');
   await tap('[data-equip="cleaver"]');
   assert.equal(await page.evaluate(()=>save.credits),credits-3600,'owned cleaver equips without a second charge');
   await tap('#remove-melee');
   await tap('#remove-shoulder');
   assert.equal(await page.evaluate(()=>nativeHullKey(3,save.units[0])),'gatecrasher-bare');
   await tap('[data-equip="vesper-shoulder"]');
   assert.equal(await page.evaluate(()=>save.credits),credits-3600,'owned pod equips without a second charge');
  }
  const start=await page.evaluate(mode=>{
   createBattle(3,false,false,[0]);
   const actor=battle.units.find(u=>u.team==='ally'),foe=battle.units.find(u=>u.team==='enemy'&&!u.kind);
   for(const unit of battle.units)if(unit.kind){unit.hp.body=0;unit.alive=false;unit.downReason='body'}
   const clear=(x,z)=>onBoard(x,z)&&!battle.cover.has(x+','+z)&&!battle.units.some(u=>u.kind&&u.x===x&&u.z===z);
   let placement;
   for(let x=5;x<10&&!placement;x++)for(let z=11;z<15&&!placement;z++){
    const target=mode==='strike'?[x+1,z]:[x+3,z-2];
    if(clear(x,z)&&clear(...target))placement=[[x,z],target];
   }
   for(const [unit,[x,z]] of [[actor,placement[0]],[foe,placement[1]]]){unit.x=unit.vx=x;unit.z=unit.vz=z}
   selected=0;action='move';lockedTarget=foe.id;targetPart='body';foe.reacted=true;
   effects=[];focusBattleCamera(actor,true);renderBattle();Math.random=()=>0;
   window.breachQA={actor,foe,rows:new Map(),rockets:[]};
   const drawFrame=draw;
   draw=time=>{
    drawFrame(time);
    if(!actor.attack)return;
    const view=travelVisual(actor,clock),qa=window.breachQA;
    if(view?.grounded)qa.rows.set(view.row,{cell:view.source.cell,tip:view.points.meleeTip});
    const shot=effects.find(e=>e.type==='shot'&&e.actor===actor.id&&e.kind==='missile');
    if(shot?.origins.length===2)qa.rockets=shot.origins.map((point,i)=>{
     const expected=freezeAttachment(actor,i?'shoulderMuzzle2':'shoulderMuzzle',shot.born+ATTACK_PROFILES.missile.beats[i]);
     return {x:point.ox,y:point.oy,error:Math.hypot(point.ox-expected.ox,point.oy-expected.oy)};
    });
   };
   const w=selectedWeapon(actor,mode);
   return {ap:actor.ap,hp:foe.hp.body,cost:paidAttackAP(actor,w),damage:partDamage(actor,foe,'body',w),kit:nativeHullKey(actor.frame,actor)};
  },mode);
  assert.equal(start.kit,mode==='missile'?'gatecrasher-vesper':'gatecrasher-cleaver');
  if(mode==='missile')assert.equal(await page.locator('#strike').isDisabled(),true);
  else assert.equal(await page.locator('#missile').count(),0);
  if(mobile&&mode==='missile'){
   const viewport=page.viewportSize();
   await page.setViewportSize({width:320,height:735});
   assert.ok(await page.locator('.actionbuttons').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'all seven action buttons fit at 320px');
   await page.setViewportSize(viewport);
  }
  await page.waitForFunction(()=>travelVisual(breachQA.actor,clock)?.grounded&&travelVisual(breachQA.foe,clock)?.grounded);
  await tap('#'+mode);
  if(mode==='missile')for(let i=0;i<(mobile?5:2);i++)await tap('#map-zoom-out');
  const target=await page.evaluate(()=>{
   const {foe}=breachQA,b=travelVisual(foe,clock).bounds;
   for(const dy of [.48,.55,.42,.62,.35,.68])for(const dx of [.5,.55,.45,.6,.4,.65,.35]){
    const x=Math.round(b.x+b.w*dx),y=Math.round(b.y+b.h*dy);
    if(document.elementFromPoint(x,y)===canvas&&pick(x,y)===foe)return {x,y};
   }
   throw Error('No clickable hostile silhouette');
  });
  if(mobile)await page.touchscreen.tap(target.x,target.y);else await page.mouse.click(target.x,target.y);
  await page.waitForFunction(hp=>breachQA.foe.hp.body<hp&&!battle.busy,start.hp);
  const result=await page.evaluate(async()=>{
   await pendingCareerWrite;
   const {actor,foe,rows,rockets}=breachQA;
   return {ap:actor.ap,hp:foe.hp.body,rows:[...rows],rockets,sortie:JSON.stringify(captureSortie())};
  });
  assert.equal(start.cost,mode==='missile'?4:2);
  assert.equal(result.ap,start.ap-start.cost);
  assert.equal(result.hp,start.hp-start.damage);
  assert.ok(result.rows.length&&result.rows.every(([,row])=>row.cell===384));
  if(mode==='missile'){
   assert.equal(result.rockets.length,2);
   assert.ok(result.rockets.every(rocket=>rocket.y<-1&&rocket.error<.001),'both rockets emit from the shoulder pod');
   assert.ok(Math.abs(result.rockets[0].x-result.rockets[1].x)>.025,'two distinct launch cells');
  }else{
   const cut=result.rows.filter(([frame])=>frame>=68).map(([,row])=>row.tip);
   assert.ok(cut.length>=7,'windup, swing and follow-through play at battlefield scale');
   const sweep=Math.max(...cut.flatMap(a=>cut.map(b=>Math.hypot(a[0]-b[0],a[1]-b[1]))));
   assert.ok(sweep>.28,'blade tip sweeps through the forward view');
  }
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!battle&&!battle.busy&&!!document.querySelector('#move'));
  assert.equal(await page.evaluate(()=>JSON.stringify(captureSortie())),result.sortie);
  assert.equal(await page.evaluate(()=>nativeHullKey(current().frame,current())),start.kit);
 }
 await checkSamuraiWalk({page,mobile,origin});
 if(!mobile){
  await page.goto(new URL('rig-bench/prototypes/',origin).href);
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Live 3D'));
  const visible=()=>page.evaluate(()=>{
   const value={};
   model.traverse(node=>{
    const name=node.name.replace(/[^a-z0-9]/gi,'');
    if(['HardpointL','ShoulderHardpointR'].includes(name))value[name]=node.visible;
   });
   return value;
  });
  assert.deepEqual(await visible(),{HardpointL:false,ShoulderHardpointR:false});
  assert.equal(await page.locator('[data-clip="Strike"]').isVisible(),false);
  await page.locator('#preview-cleaver').check();
  assert.deepEqual(await visible(),{HardpointL:true,ShoulderHardpointR:false});
  assert.equal(await page.locator('[data-clip="Strike"]').isVisible(),true);
  await page.locator('#preview-vesper').check();
  assert.deepEqual(await visible(),{HardpointL:true,ShoulderHardpointR:true});
 }
};
