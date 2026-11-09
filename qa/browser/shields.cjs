const assert=require('node:assert/strict');
const {join}=require('node:path');

module.exports=async function checkShields({context,page,mobile,origin,tap}){
 const workshop=new URL('?view=workshop',origin).href;
 const tab='[data-armory-class="shields"]',card=id=>page.locator('[data-shield-card="'+id+'"]');
 const buckler='bulwark-shield',tower='citadel-shield';
 const equip=id=>tap('[data-equip="'+id+'"]');
 await page.goto(workshop,{waitUntil:'domcontentloaded'});
 if(mobile)await page.setViewportSize({width:320,height:700});
 await tap(tab);
 assert.equal(await page.locator('[data-shield-card]').count(),2);
 for(const [id,discount] of [[buckler,'−20%'],[tower,'−35%']]){
  await card(id).locator('.weapon-card-art').evaluate(img=>img.decode());
  assert.deepEqual(await card(id).locator('dd').allTextContents(),['Always',discount,'0']);
 }
 assert.ok(await page.locator('.workshop-armory').evaluate(node=>node.scrollWidth<=node.clientWidth+1));
 const help=card(tower).locator('[data-help]');
 await help.scrollIntoViewIfNeeded();
 if(mobile){
  const {x,y,width,height}=await help.boundingBox(),cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x+width/2,y:y+height/2}]});
  await page.locator('#game-help').waitFor({state:'visible'});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.detach();
 }else await help.hover();
 assert.match(await page.locator('#game-help').innerText(),/whole hit that breaks it/);
 if(mobile)await page.setViewportSize({width:390,height:844});
 const proof=process.env.IRON_VOW_SHIELD_PROOF;
 if(proof)await page.locator('.armory-grid[aria-label="Shields"]').screenshot({path:join(proof,mobile?'shields-touch.png':'shields-desktop.png'),style:'#game-help{visibility:hidden}'});

 const preview=page.locator('#paint-preview');
 await preview.waitFor();
 await page.waitForFunction(()=>imageReady(artImages[wardenVisual(0,'rifle',-1).key]));
 const bare=await preview.evaluate(node=>node.toDataURL());
 await equip(buckler);
 assert.match(await page.locator('.armory-mounted').innerText(),/Bulwark B-2/);
 await page.waitForFunction(before=>moduleImages['armory-bulwark-shield-left']?.complete&&document.querySelector('#paint-preview').toDataURL()!==before,bare);
 if(proof)await preview.screenshot({path:join(proof,mobile?'bulwark-mobile.png':'bulwark-mounted.png')});
 await equip(tower);
 assert.equal(await page.evaluate(()=>save.credits),1350);
 await tap('[data-armory-class="melee"]');
 await equip('cleaver');
 assert.deepEqual(await page.evaluate(()=>[save.units[0].shield,save.units[0].melee]),[undefined,'cleaver']);
 await tap(tab);
 await equip(tower);
 await page.reload({waitUntil:'domcontentloaded'});
 assert.match(await page.locator('.armory-mounted').innerText(),/Citadel T-6/);
 await tap(tab);
 await tap('#remove-shield');
 assert.match(await page.locator('.armory-mounted').innerText(),/Free hand/);
 await equip(tower);
 assert.equal(await page.evaluate(()=>save.credits),150);

 await page.waitForFunction(()=>window.IronVowFoundry.previewBastion({weapon:'rifle',shield:'citadel-shield'},0)?.shield?.grip);
 const rig=await page.evaluate(()=>{
  const rig=window.IronVowFoundry;
  const points=[];
  for(const angle of [0,1,2,3])for(const frame of [57,35,95]){
   const fit=rig.previewBastion({weapon:'rifle',shield:'citadel-shield'},angle,frame);
   const position=node=>node.getWorldPosition(new THREE.Vector3());
   const shield=fit.shield;
   points.push({grip:position(shield.grip).distanceTo(position(fit.m.sockets.L)),visible:shield.mount.visible,
    offset:position(shield.face).distanceTo(position(shield.grip)),
    anchor:fit.anchors.shield,primary:!!fit.primary});
  }
  return points;
 });
 assert.ok(rig.every(sample=>sample.visible&&sample.grip<1e-5&&sample.offset>.3&&sample.primary&&sample.anchor.every(Number.isFinite)));
 const generic=await page.evaluate(()=>{
  const rig=window.IronVowFoundry;
  const u={...save.units[0],id:'shield-proof',team:'ally',alive:true,hp:{body:100,pilot:100,right:100,left:100,legs:100}};
  u.max={...u.hp};
  const scope={},sample=(t,heading)=>rig.draw(u,t,{heading,aim:0,brace:0,recoil:0,impact:0,primeProgress:0,strikeProgress:0,deathAge:0},scope,0);
  const fit=sample(0,-Math.PI/4),shield=fit.shield;
  const position=node=>node.getWorldPosition(new THREE.Vector3());
  const seated=position(shield.grip).distanceTo(position(fit.m.rig.arms.L.so));
  const visible=shield.mount.visible;
  u.hp.left=0;
  const broken=!sample(.1,Math.PI/4).shield.mount.visible;
  u.hp.left=20;
  const restored=sample(.2,Math.PI*3/4).shield.mount.visible;
  return {seated,visible,broken,restored};
 });
 assert.ok(generic.seated<1e-5&&generic.visible&&generic.broken&&generic.restored,'live Foundry shield follows its hand and arm health');

 await page.evaluate(()=>{
  deploy(0,false,[0]);Math.random=()=>0;
  const a=current(),enemy=battle.units[1];
  enemy.x=enemy.vx=a.x+2;enemy.z=enemy.vz=a.z;enemy.weapon='rail';
  a.ap=0;a.hp.left=1;window.guardStart={...a.hp};
  const attach=mechAttachmentPoint;
  window.guardImpact=0;
  mechAttachmentPoint=(u,part,t)=>{if(u===a&&part==='shield')window.guardImpact++;return attach(u,part,t)};
  renderBattle();persist();
 });
 await tap('#modal-0');
 assert.equal(await page.locator('#strike').isDisabled(),true);
 assert.match(await page.locator('.shield-status').innerText(),/SHIELD 1\/92 ARM HP/);
 await tap('#end');
 await page.waitForFunction(()=>battle.turn===2&&!battle.busy);
 assert.match(await page.locator('.shield-status').innerText(),/SHIELD ARM LOST/);
 const blocked=await page.evaluate(()=>({before:guardStart,hp:current().hp,hit:current().hitPart,visual:guardImpact}));
 assert.deepEqual(blocked.hp,{...blocked.before,left:0});
 assert.equal(blocked.hit,'left');
 assert.ok(blocked.visual>0,'enemy shot uses the shield attachment');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.shield-status').waitFor();
 assert.match(await page.locator('.shield-status').innerText(),/SHIELD ARM LOST/);
 assert.equal(await page.evaluate(()=>current().hp.left),0);
};
