const assert=require('node:assert/strict');

module.exports=async function checkAeroReview({page,origin,tap}){
 await page.goto(new URL('rig-bench/aero.html?weapon=breaker',origin).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!document.querySelector('#time').disabled,null,{timeout:120000});
 assert.equal(await page.locator('[data-weapon="breaker"]').getAttribute('aria-pressed'),'true');
 const read=()=>page.locator('#motion').evaluate(canvas=>{
  const rgba=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  return {painted:rgba.some((byte,i)=>i%4===3&&byte>64),image:canvas.toDataURL()};
 });
 for(const id of ['cleaver','breaker','piledriver','blade']){
  await tap('[data-weapon="'+id+'"]');
  await page.waitForFunction(()=>!document.querySelector('#time').disabled);
  const idle=await read();
  assert.ok(idle.painted,id+' shows the live guard pose');
  await page.locator('#time').evaluate(slider=>{
   const id=document.querySelector('[data-weapon][aria-pressed="true"]').dataset.weapon;
   const {raise,travel,recover}=IRON_VOW_AERO_STRIKES[id].timing;
   slider.value=Math.ceil((raise+travel)/(raise+travel+recover)*1000);
   slider.dispatchEvent(new Event('input'));
  });
  const impact=await read();
  assert.ok(impact.painted&&impact.image!==idle.image,id+' scrub renders an actual changed pose');
  assert.equal(await page.locator('#phase').textContent(),'IMPACT');
 }
 assert.equal(await page.evaluate(()=>IronVowRenderer.metrics().contexts),1);
};
