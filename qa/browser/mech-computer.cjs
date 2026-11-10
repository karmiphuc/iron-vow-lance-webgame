const assert=require('node:assert/strict');

module.exports=async function checkMechComputer({page,mobile,origin,tap}){
 const workshop=new URL('?view=workshop',origin).href;
 await page.goto(workshop,{waitUntil:'domcontentloaded'});
 await page.locator('[data-mech-pilot="0"]').waitFor();
 await page.evaluate(()=>{save.mechMastery={[pilotId(0)]:{kills:{0:24,1:5,2:5}}}});
 const open=()=>tap('[data-mech-pilot="0"]');
 const computer=page.locator('.mech-computer');
 const first=computer.locator('[data-mech-slot="0"]'),second=computer.locator('[data-mech-slot="1"]');
 await open();
 assert.match(await computer.innerText(),/BUILT-IN\s+Steady Aim/);
 assert.match(await computer.innerText(),/24 \/ 25 MASTERY/);
 assert.equal(await second.count(),0);
 await first.selectOption('1');
 await tap('#modal-0');
 await page.evaluate(()=>{save.mechMastery[pilotId(0)].kills[0]=25});
 await open();
 assert.match(await computer.innerText(),/MECH MASTERY/);
 assert.equal(await first.inputValue(),'1');
 assert.ok(await second.locator('option[value="1"]').evaluate(option=>option.disabled));
 await second.selectOption('2');
 await page.evaluate(()=>pendingCareerWrite);
 await page.reload({waitUntil:'domcontentloaded'});
 await open();
 assert.equal(await first.inputValue(),'1');
 assert.equal(await second.inputValue(),'2');
 await tap('#modal-0');

 const layout=await page.evaluate(()=>{
  createBattle(0,false,false,[0]);enableMechComputers();renderBattle();
  return healthRows(battle.units[1]);
 });
 const rows=[['body'],['left','right'],['legs','pilot']];
 assert.deepEqual(layout,rows);
 if(mobile)await tap('#target-toggle');
 const panel=page.locator('#target-panel');
 assert.deepEqual(await panel.locator('.hp-row').evaluateAll(nodes=>nodes.map(row=>[...row.children].map(button=>button.dataset.part))),rows);
 await tap('#target-panel [data-part="left"]');
 assert.equal(await panel.locator('[data-part="left"]').getAttribute('aria-pressed'),'true');

 const rebuilt=await page.evaluate(()=>{
  battle=null;save.credits=1000000;page='workshop';workshopView='assigned';
  return Object.keys(MECH_SIGNATURES).map(Number).filter(frame=>FRAMES[frame].enemyOnly).map(frame=>{
   (save.salvage??={})[frame]=1;
   return {frame,ready:acquireHull(frame,true),signature:MECH_SIGNATURES[frame][0]};
  });
 });
 assert.equal(rebuilt.length,5);
 for(const {frame,ready,signature} of rebuilt){
  assert.equal(ready,true);
  assert.equal(await page.evaluate(frame=>{const assigned=assignChassis(0,frame);render();return assigned},frame),true);
  assert.match(await page.locator('[data-mech-pilot="0"]').innerText(),new RegExp(signature,'i'));
  assert.match(await page.locator('.workshop-armory').innerText(),/FACTORY ARMAMENT/);
  assert.doesNotMatch(await page.locator('.chassis-assignment').innerText(),/Dodge/i);
  await page.locator('.bay-card img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
 }
};
