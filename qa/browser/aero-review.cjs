const assert=require('node:assert/strict');

module.exports=async function checkAeroReview({page,origin,tap}){
 await page.goto(new URL('rig-bench/aero.html?weapon=breaker',origin).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!document.querySelector('#time').disabled,null,{timeout:120000});
 assert.equal(await page.locator('[data-weapon="breaker"]').getAttribute('aria-pressed'),'true');
 // Measure the posed chassis in game units independently of canvas zoom and weapon bounds.
 const size=await page.evaluate(()=>{
  const hp={body:100,pilot:100,left:100,right:100,legs:100};
  const unit={id:'aero-scale-review',frame:19,team:'enemy',alive:true,weapon:'rifle',melee:'blade',hp,max:hp};
  const {m}=IronVowFoundry.previewAnimated(unit,0,{reducedMotion:true},11,'rig-v2');
  const position=node=>node.getWorldPosition(new THREE.Vector3());
  const {arms,legs,neck}=m.rig,left=position(arms.L.sh),right=position(arms.R.sh);
  const across=left.clone().sub(right).normalize(),point=new THREE.Vector3();
  let low=Infinity,high=-Infinity;
  for(const part of ['left','right'])for(const {m:mesh,detach} of m.build.parts[part]){
   if(!detach||!mesh.visible)continue;
   const vertices=mesh.geometry.attributes.position;
   for(let i=0;i<vertices.count;i++){
    const x=point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld).dot(across);
    low=Math.min(low,x);high=Math.max(high,x);
   }
  }
  return {neckAboveAnkles:position(neck).y-(position(legs[0].an).y+position(legs[1].an).y)/2,
   capOverHinges:(high-low)/left.distanceTo(right)};
 });
 assert.ok(size.neckAboveAnkles>4.0&&size.neckAboveAnkles<4.45,'scout scale: '+JSON.stringify(size));
 assert.ok(size.capOverHinges>1.82&&size.capOverHinges<2.20,'pauldron silhouette: '+JSON.stringify(size));
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
