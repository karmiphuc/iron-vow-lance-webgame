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
 await page.waitForFunction(()=>IronVowFoundry.wardenReady(),null,{timeout:120000});
 const bare=await preview.evaluate(node=>node.toDataURL());
 await equip(buckler);
 assert.match(await page.locator('.armory-mounted').innerText(),/Bulwark B-2/);
 await page.waitForFunction(before=>document.querySelector('#paint-preview').toDataURL()!==before,bare);
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

 await page.waitForFunction(()=>IronVowFoundry.preview({frame:0,weapon:'rifle',shield:'citadel-shield'},0,'warden')?.shield?.grip,null,{timeout:120000});
 const rig=await page.evaluate(()=>{
  const u={frame:0,weapon:'rifle',shield:'citadel-shield'},point=node=>node.getWorldPosition(new THREE.Vector3()),records=[];
  for(const angle of [0,1,2,3]){
   const fit=IronVowFoundry.preview(u,0,'warden',angle),shield=fit.shield;
   records.push({grip:point(shield.grip).distanceTo(point(fit.m.rig.arms.L.so)),visible:shield.mount.visible,offset:point(shield.face).distanceTo(point(shield.grip))});
  }
  const hp={body:100,pilot:100,right:100,left:0,legs:100},lost=IronVowFoundry.preview({...u,hp},0,'warden');
  return{records,broken:!lost.shield.mount.visible};
 });
 assert.ok(rig.records.every(sample=>sample.visible&&sample.grip<1e-5&&sample.offset>.1));assert.equal(rig.broken,true,'The actual shield mesh hides with its arm');

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
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
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
