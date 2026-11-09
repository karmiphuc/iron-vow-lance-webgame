const assert=require('node:assert/strict');

module.exports=async function checkBulwarkBench({page,origin,tap}){
 await page.route('**/rig-bench/prototypes/bay.js?*',async route=>{
  const response=await route.fetch();
  await route.fulfill({response,body:(await response.text())+`
    window.bulwarkSample=()=>{
      model.updateMatrixWorld(true);
      const role={};
      const bones={};
      let tip;
      model.traverse(node=>{
        if(node.userData.aegis_role)role[node.userData.aegis_role]=node;
        if(node.userData.weapon_marker==='tip')tip=node;
        if(node.isBone)bones[node.name.replace(/[^a-z0-9]/gi,'')]=node;
      });
      const position=node=>node.getWorldPosition(new THREE.Vector3()).toArray();
      return {
        tip:position(tip),foot:position(bones.FootR),finger:position(bones.Index03R),
        grip:position(role['socket.R']),time:action.time,clip:activeClip,
        attachments:[['cleaver','socket.R'],['shield','socket.L']].map(([item,socket])=>({
          parent:role[item].parent===role[socket],
          gap:role[item].getWorldPosition(new THREE.Vector3()).distanceTo(role[socket].getWorldPosition(new THREE.Vector3())),
        })),
      };
    };
  `});
 });
 await page.goto(new URL('rig-bench/',origin).href,{waitUntil:'domcontentloaded'});
 await page.locator('body[data-rig-model=painted]').waitFor();
 await tap('.prototype-links a[href$="chassis=bulwark"]');
 await page.waitForFunction(()=>document.querySelector('#status').textContent==='Live 3D · Rig online');
 assert.equal(await page.locator('#name').textContent(),'Bulwark-Aegis');
 assert.equal(await page.locator('[data-chassis="bulwark"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('[data-clip="Fire"]').isVisible(),false);
 assert.equal(await page.locator('#equipment-preview').isVisible(),false);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===window.innerWidth));
 const sample=()=>page.evaluate(()=>window.bulwarkSample());
 const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
 const checkMounts=pose=>assert.ok(pose.attachments.every(item=>item.parent&&item.gap<.0002));
 const scrub=async value=>{
  await page.locator('#time').evaluate((input,v)=>{
   input.value=String(v);
   input.dispatchEvent(new Event('input',{bubbles:true}));
  },value);
  const pose=await sample();
  checkMounts(pose);
  return pose;
 };
 await tap('[data-clip="Strike"]');
 const initial=await sample();
 await tap('#play');
 await page.waitForFunction(()=>window.bulwarkSample().time>.30);
 assert.ok(distance(initial.tip,(await sample()).tip)>.20,'the live blade moves under playback');
 const before=await scrub(545),contact=await scrub(587),after=await scrub(630);
 assert.ok(contact.tip[0]-before.tip[0]>.35&&after.tip[0]-contact.tip[0]>.35,
  'the strike travels through contact in the same direction');
 assert.ok(distance(before.foot,contact.foot)<.005&&distance(contact.foot,after.foot)<.005,
  'the lead sole stays planted across contact');
 await tap('[data-clip="Bash"]');
 assert.equal((await scrub(400)).clip,'Bash');
 await tap('[data-clip="Grip"]');
 const closed=await scrub(0),open=await scrub(400);
 assert.ok(distance(closed.finger,open.finger)>.10,'the authored digit links open in the consumer');
 assert.ok(distance(closed.grip,open.grip)<.001,'the mount stays seated during the grip check');
 await tap('#rig');
 assert.equal(await page.locator('#rig').getAttribute('aria-pressed'),'true');
 await tap('[data-chassis="gatecrasher"]');
 await page.waitForFunction(()=>document.querySelector('#status').textContent==='Live 3D · Rig online');
 assert.equal(await page.locator('#name').textContent(),'Gatecrasher');
 assert.equal(await page.locator('[data-clip="Grip"]').isVisible(),false);
 assert.equal(await page.locator('[data-clip="Strike"]').isVisible(),false);
 await tap('#preview-cleaver');
 assert.equal(await page.locator('[data-clip="Strike"]').isVisible(),true);
};
