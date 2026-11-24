const assert=require('node:assert/strict');
module.exports=async function checkNightjarStop({page,origin}){
 await page.goto(new URL('?bench=rig&frame=27',origin).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__bench?.state.loaded&&__bench.state.metrics);
 await page.locator('#bench-walk').click();
 // Observe the exported links in the same scene passed to the renderer.
 await page.evaluate(()=>{
  const renderer=IronVowRenderer.get(),original=renderer.render.bind(renderer),v=new THREE.Vector3();
  const samples=window.stopSamples=[];
  renderer.render=(scene,camera)=>{
   original(scene,camera);
   const keel=scene.getObjectByName('Keel');
   if(keel&&scene.getObjectByName('GunGrip'))samples.push({
    walk:document.querySelector('#bench-walk').getAttribute('aria-pressed')==='true',
    forward:keel.position.z,height:keel.position.y,
    toes:['AnkleL','AnkleR'].map(name=>scene.getObjectByName(name).getWorldPosition(v).y)
   });
  };
 });
 await page.waitForFunction(()=>stopSamples.filter(p=>p.walk).length>=32);
 await page.locator('#bench-walk').click();
 await page.waitForFunction(()=>stopSamples.filter(p=>!p.walk).length>=50);
 const samples=await page.evaluate(()=>stopSamples.filter(p=>!p.walk));
 const rest=samples.at(-1),contacts=[];
 for(let leg=0;leg<2;leg++){
  const lift=samples.findIndex(s=>s.toes[leg]>rest.toes[leg]+.18);
  const land=samples.findIndex((s,i)=>i>lift&&s.toes[leg]<rest.toes[leg]+.035);
  assert.ok(lift>=0&&land>lift,'each rear claw lifts and lands during the stop');
  contacts.push(land);
 }
 assert.notEqual(contacts[0],contacts[1],'catch steps land on separate frames');
 assert.ok(Math.max(...samples.map(s=>s.forward))-rest.forward>.29,'hull carries forward beyond its final stance');
 assert.ok(rest.height-Math.min(...samples.map(s=>s.height))>.20,'suspension compresses under the landing');
};
