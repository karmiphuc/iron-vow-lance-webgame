const assert=require('node:assert/strict');
const {writeFileSync}=require('node:fs');
const {join}=require('node:path');

module.exports=async function checkArmory({context,page,mobile,origin,tap}){
 const card=id=>page.locator('[data-weapon-card="'+id+'"]');
 const equip=id=>tap('[data-equip="'+id+'"]');
 const tab=id=>tap('[data-armory-class="'+id+'"]');
 const crew='?view=workshop';
 await page.goto(new URL(crew,origin).href,{waitUntil:'domcontentloaded'});
 await page.locator('[data-armory-class="assault"]').waitFor();
 if(mobile){
  await page.setViewportSize({width:320,height:700});
  await tap('#armory-preview');
  assert.ok(await page.locator('.workshop-chassis').evaluate(node=>node===document.activeElement));
  await tap('#armory-back');
  assert.equal(await page.locator('[data-armory-class="assault"]').evaluate(node=>node===document.activeElement),true);
 }
 const seen=[];
 for(const [group,count] of Object.entries({assault:7,strike:7,melee:8})){
  await tab(group);
  assert.equal(await page.locator('[data-armory-class="'+group+'"]').getAttribute('aria-pressed'),'true');
  const cards=page.locator('[data-weapon-card]');
  assert.equal(await cards.count(),count);
  for(const item of await cards.all()){
   const image=item.locator('.weapon-card-art');
   await image.scrollIntoViewIfNeeded();
   await image.evaluate(async img=>{await img.decode()});
   const id=await item.getAttribute('data-weapon-card');
   seen.push(id);
   const expected=await page.evaluate(id=>{
    const w=weapon(id),training=trainingEffects(selected);
    return {stats:[String(Math.round(w.damage*(w.burst?1.15:1))),weaponRange(w,training)+(w.melee?' tile':' tiles'),String(weaponAP(w,training))],
     pierce:w.pierce,cannotCounter:launchesMissiles(w),burst:w.burst,scatter:w.scatter};
   },id);
   assert.deepEqual(await item.locator('dd').allTextContents(),expected.stats);
   if(expected.pierce)assert.ok((await item.locator('.armory-trait').textContent()).includes(Math.round(expected.pierce*100)+'% ARMOR PIERCE'));
   if(expected.burst)assert.ok((await item.locator('.armory-trait').textContent()).includes(expected.burst+(expected.scatter?' PELLETS':' RD BURST')));
   if(expected.cannotCounter)assert.equal(await item.locator('.armory-trait').textContent(),'CANNOT COUNTER');
  }
  assert.ok(await page.locator('#ui .page').evaluate(node=>node.scrollWidth<=node.clientWidth+1));
 }
 assert.equal(new Set(seen).size,22);
 if(mobile)await page.setViewportSize({width:390,height:844});
 await tab('strike');
 assert.equal(await card('obelisk').locator('[data-equip]').isDisabled(),true);
 assert.match(await card('obelisk').locator('[data-equip]').innerText(),/4,800 CR REQUIRED/);
 const help=card('cerberus').locator('[data-help]');
 await help.scrollIntoViewIfNeeded();
 if(mobile){
  const box=await help.boundingBox(),cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
  await page.locator('#game-help').waitFor({state:'visible'});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.detach();
 }else await help.hover();
 assert.match(await page.locator('#game-help').innerText(),/launcher cannot counter/);
 await page.evaluate(()=>{
  save.units[1].level=5;
  for(const skill of ['sighter','ballistics','rangefinder'])if(!learnTraining(1,skill))throw Error('Training fixture failed');
 });
 await tap('[data-select="1"]');await tab('assault');
 assert.deepEqual(await card('trident').locator('dd').allTextContents(),['49','6 tiles','3']);
 await tap('[data-select="0"]');
 await equip('sidewinder');
 await tab('melee');await equip('pike');
 assert.deepEqual(await page.locator('.armory-mounted b').allTextContents(),['Sidewinder SM-2','Pilum Pike']);
 assert.equal(await page.evaluate(()=>save.credits),1850);
 if(process.env.IRON_VOW_ARMORY_PROOF){
  await page.locator('.armory-title').evaluate(node=>node.scrollIntoView({block:'start'}));
  await page.screenshot({path:join(process.env.IRON_VOW_ARMORY_PROOF,mobile?'workshop-touch.png':'workshop-desktop.png'),style:'#toast{visibility:hidden}'});
 }
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.armory-mounted').waitFor();
 assert.deepEqual(await page.locator('.armory-mounted b').allTextContents(),['Sidewinder SM-2','Pilum Pike']);
 assert.equal(await page.evaluate(()=>save.credits),1850);
 await page.waitForFunction(()=>window.IronVowFoundry?.previewBastion({weapon:'sidewinder',melee:'pike'},0)?.secondary?.tip);
 const rigs=await page.evaluate(async()=>{
  const arsenal=window.IronVowProductionArsenal,scene=await arsenal.load('rig-bench/weapons.glb','rig-bench/expansion-weapons.glb');
  const v=()=>new THREE.Vector3(),point=node=>node.getWorldPosition(v());
  return Object.keys(window.IRON_VOW_EXPANSION_ART).map(id=>{
   const isMelee=weapon(id).melee,rig=new THREE.Group(),w=arsenal.mount(scene,id,rig);
   const end=isMelee?w.tip:w.muzzle;
   const before=point(end),grip=point(w.grip),old=w.pivot&&[w.pivot.position.z,w.pivot.rotation.z];
   arsenal.animate(w,{weaponKick:.7,weaponSpin:.4,strikeProgress:.7});rig.updateMatrixWorld(true);
   const moved=w.pivot&&[w.pivot.position.z,w.pivot.rotation.z].some((value,i)=>Math.abs(value-old[i])>1e-5);
   const shown=window.IronVowFoundry.previewBastion({weapon:isMelee?'sidewinder':id,melee:isMelee?id:'pike'},0,
    isMelee?303:188,{weaponKick:.7,weaponSpin:.4,strikeProgress:.7});
   const equipped=isMelee?shown.secondary:shown.primary;
   const contact=equipped.adapter.parent;
   const socketAxis=contact.worldToLocal(point(equipped.axis)).normalize().z;
   const foundryAxis=point(w.axis).sub(grip).normalize().y;
   const strikeAdvance=isMelee?shown.m.cont.worldToLocal(point(equipped.tip)).z-shown.m.cont.worldToLocal(point(equipped.grip)).z:null;
   const stroke=w.motion?.kind==='strike'?point(end).distanceTo(before):null;
   return {id,clear:before.distanceTo(grip)>.3,locked:point(w.grip).distanceTo(grip)<1e-6,moved,stroke,amount:w.motion?.amount,
    aligned:socketAxis>.999&&foundryAxis<-.999,strikeAdvance,
    fitted:equipped.mount.visible&&point(equipped.grip).distanceTo(point(contact))<1e-6};
  });
 });
 assert.equal(rigs.length,12);
 assert.ok(rigs.filter(r=>r.moved).length>=6);
 for(const rig of rigs)assert.ok(rig.clear&&rig.locked&&rig.fitted&&rig.aligned&&(rig.strikeAdvance==null||rig.strikeAdvance>.35),JSON.stringify(rig));
 for(const rig of rigs.filter(r=>r.stroke!=null))assert.ok(Math.abs(rig.stroke-Math.abs(rig.amount))<1e-5,rig.id+' tip travels with its moving piece');
 if(process.env.IRON_VOW_ARMORY_PROOF&&!mobile){
  const capture=await page.evaluate(()=>{
   const plate=document.createElement('canvas');
   plate.width=1040;plate.height=980;
   const g=plate.getContext('2d');
   g.fillStyle='#111c23';g.fillRect(0,0,1040,980);
   const fittings=[
    ['sidewinder','pike',57,0,'SIDEWINDER / PILUM · READY'],
    ['forge','hatchet',188,1,'FORGE / CINDER · FIRE'],
    ['obelisk','pike',303,0,'OBELISK / PILUM · STRIKE'],
    ['cerberus','anchor-hammer',303,1,'CERBERUS / ANCHOR · STRIKE']
   ];
   for(const [i,[weapon,melee,frame,angle,label]] of fittings.entries()){
    const e=window.IronVowFoundry.previewBastion({weapon,melee},angle,frame,{weaponKick:.8,strikeProgress:.7});
    const x=i%2*520,y=Math.floor(i/2)*490;
    g.drawImage(e.surface,x+30,y,460,460);
    g.fillStyle='#ddd7c5';g.font='600 15px Inter,sans-serif';g.textAlign='center';g.fillText(label,x+260,y+468);
   }
   return plate.toDataURL().split(',')[1];
  });
  writeFileSync(join(process.env.IRON_VOW_ARMORY_PROOF,'armory-mounted.png'),Buffer.from(capture,'base64'));
 }
 const baked=await page.evaluate(async()=>{
  const proof=[];
  for(const id of ['pike','anchor-hammer'])for(const face of [-1,1]){
   const slot=window.IRON_VOW_EXPANSION_ART[id][face===1?'right':'left'];
   await Promise.all([moduleImage(slot.key).decode(),moduleImage(slot.impact.key).decode()]);
   const visual=wardenVisual(0,'rifle',face),bounds={x:0,y:0,w:640,h:640};
   const rest=weaponMount(visual,visual,bounds,id,face,0),hit=weaponMount(visual,visual,bounds,id,face,.7);
   const a=weaponPoint(rest,'tip'),b=weaponPoint(hit,'tip');
   proof.push({id,face,active:rest.asset.key!==hit.asset.key,grip:Math.hypot(rest.grip.x-hit.grip.x,rest.grip.y-hit.grip.y),stroke:Math.hypot(a.x-b.x,a.y-b.y)});
  }
  return proof;
 });
 for(const mount of baked)assert.ok(mount.active&&mount.grip<1e-6&&mount.stroke>2,JSON.stringify(mount));
 await checkCerberusSalvo(page,mobile,tap);
};

async function checkCerberusSalvo(page,mobile,tap){
 const before=await page.evaluate(()=>{
  save.credits=6000;equipWeapon('cerberus');attackCameraEnabled=false;
  createBattle(0,false,false,[0]);selected=0;action='move';targetPart='body';Math.random=()=>0;
  const actor=current(),foe=battle.units.find(u=>u.team==='enemy'&&!u.kind);
  const valid=(x,z)=>onBoard(x,z)&&!battle.cover.has(x+','+z)&&!battle.units.some(u=>u!==actor&&u!==foe&&u.x===x&&u.z===z);
  let spot;
  for(let x=4;x<10&&!spot;x++)for(let z=11;z<15&&!spot;z++)if(valid(x,z)&&valid(x+2,z-1))spot=[x,z];
  if(!spot)throw Error('No clear Cerberus fixture');
  [actor.x,actor.z]=[actor.vx,actor.vz]=spot;
  [foe.x,foe.z]=[foe.vx,foe.vz]=[spot[0]+2,spot[1]-1];
  foe.reacted=true;lockedTarget=foe.id;
  focusBattleCamera(actor,true);renderBattle();
  window.armoryQA={actor,foe,origins:[]};
  const frame=draw;
  draw=time=>{
   frame(time);
   const shot=effects.find(e=>e.type==='shot'&&e.kind==='cerberus');
   if(shot?.origins.length===2)armoryQA.origins=shot.origins;
  };
  return {hp:foe.hp.body,ap:actor.ap,damage:partDamage(actor,foe,'body',weapon('cerberus'))};
 });
 await tap('#fire');
 const target=await page.evaluate(()=>{
  const {foe}=armoryQA,b=travelVisual(foe,clock)?.bounds||unitBounds(foe);
  for(const dy of [.48,.55,.42,.62,.35,.68])for(const dx of [.5,.55,.45,.6,.4,.65,.35]){
   const x=Math.round(b.x+b.w*dx),y=Math.round(b.y+b.h*dy);
   if(document.elementFromPoint(x,y)===canvas&&pick(x,y)===foe)return {x,y};
  }
  throw Error('No clickable Cerberus target');
 });
 if(mobile)await page.touchscreen.tap(target.x,target.y);else await page.mouse.click(target.x,target.y);
 await page.waitForFunction(hp=>armoryQA.foe.hp.body<hp&&!battle.busy,before.hp);
 const result=await page.evaluate(()=>({hp:armoryQA.foe.hp.body,ap:armoryQA.actor.ap,origins:armoryQA.origins}));
 assert.equal(result.hp,before.hp-before.damage);
 assert.equal(result.ap,before.ap-5);
 assert.equal(result.origins.length,2);
 const [a,b]=result.origins;
 assert.ok(Math.hypot(a.ox-b.ox,a.oy-b.oy)>.015,'both rockets use distinct launch points');
}
