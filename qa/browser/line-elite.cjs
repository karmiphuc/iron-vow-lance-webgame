const assert=require('node:assert/strict');
const {join}=require('node:path');

module.exports=async function checkLineElite({page,mobile,origin,tap}){
 await page.goto(new URL('?view=workshop',origin).href,{waitUntil:'domcontentloaded'});
 await tap('[data-bay="market"]');
 assert.equal(await page.getByRole('heading',{name:'LINE INFANTRY ELITE',exact:true}).count(),0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{Math.random=()=>0});
 await tap('#nav [data-page="contracts"]');
 await tap('[data-deploy="2"]');
 await tap('#modal-1');
 await tap('#modal-0');
 const result=await page.evaluate(async()=>{
  const foe=battle.units[1],atlas=window.IRON_VOW_FOUNDRY_ART[foundryModel(foe.frame)];
  const armed=motionImage(atlas),unarmed=motionImage({key:atlas.unarmedKey});
  const mask=moduleImage(atlas.key+'-paint'),disabledMask=moduleImage(atlas.unarmedKey+'-paint');
  await Promise.all([armed,unarmed,mask,disabledMask].map(img=>img.decode()));
  const defaultView=foundryRender(foe,clock);
  const authoredFinish=defaultView.surface===armed&&foe.paint===null;
  const armHP=foe.hp.right;
  foe.hp.right=0;
  const disabled=foundryRender(foe,clock).surface===foundryPaint(unarmed,atlas.unarmedKey,foe.paint,foe.trim,atlas.paintBlend);
  foe.hp.right=armHP;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=atlas.cell;
  const g=canvas.getContext('2d',{willReadFrequently:true});
  function readCell(image){
   g.clearRect(0,0,atlas.cell,atlas.cell);
   g.drawImage(image,3*atlas.cell,2*atlas.cell,atlas.cell,atlas.cell,0,0,atlas.cell,atlas.cell);
   return g.getImageData(0,0,atlas.cell,atlas.cell).data;
  }
  const original=readCell(armed),layers=readCell(mask);
  const mainPaint=readCell(foundryPaint(armed,atlas.key,'#ba715a',null,atlas.paintBlend));
  const secondaryPaint=readCell(foundryPaint(armed,atlas.key,null,{s:'#6f965c'},atlas.paintBlend));
  let primary=0,secondary=0,bare=0,leak=0;
  const differs=(image,i)=>[0,1,2].some(c=>image[i+c]!==original[i+c]);
  for(let i=0;i<original.length;i+=4){
   if(original[i+3]!==255)continue;
   const a=differs(mainPaint,i),b=differs(secondaryPaint,i);
   if(layers[i]>216){if(a)primary++;if(b)leak++}
   else if(layers[i+1]>216){if(b)secondary++;if(a)leak++}
   else if(Math.max(layers[i],layers[i+1],layers[i+2])<16){
    bare++;
    if(a||b)leak++;
   }
  }
  return {contract:battle.contract.id,name:foe.name,disabled,authoredFinish,primary,secondary,bare,leak};
 });
 assert.equal(result.contract,'corridor');
 assert.equal(result.name,'LINE INFANTRY ELITE 1');
 assert.equal(result.disabled,true);
 assert.equal(result.authoredFinish,true);
 assert.ok(result.primary>500&&result.secondary>50&&result.bare>100,JSON.stringify(result));
 assert.equal(result.leak,0,'each paint channel preserves the other layer and the mechanical surfaces');
 await tap('#end');
 await page.waitForFunction(()=>battle?.turn===2&&!battle.busy);
 await tap('#end');
 await page.waitForFunction(()=>activeCinematic?.actor.frame===LINE_ELITE_FRAME&&activeCinematic.phase==='fire');
 if(process.env.IRON_VOW_ELITE_PROOF){
  await page.screenshot({path:join(process.env.IRON_VOW_ELITE_PROOF,mobile?'corridor-elite-touch.png':'corridor-elite-desktop.png')});
 }
 await page.waitForFunction(()=>battle?.turn===3&&!battle.busy);
 const attack=await page.evaluate(()=>battle.log.find(line=>line.startsWith('LINE INFANTRY ELITE 1 → WARDEN')));
 assert.match(attack,/BODY −\d+/);
 console.log('PASS Corridor hostile phase '+attack+', separate primary and secondary plate colors');
};
