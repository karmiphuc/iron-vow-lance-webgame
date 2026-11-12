const assert=require('node:assert/strict');
module.exports=async function livePaint({page,origin}){
 await page.goto(origin,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__ironVow&&document.querySelector('#nav button'));
 for(const frames of [[0,5,6],[10,8,9]]){console.log('warming '+frames.join(','));await page.evaluate(frames=>__ironVow.start({seed:4242,frames}),frames);await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});}
 console.log('live preview assets ready');
 for(const frame of [0,5,6,7,8,9,10,12]){
  console.log('checking live preview '+frame);
  const sample=await page.evaluate(frame=>{
   const unit={frame,team:'enemy',paint:'#617caa',trim:{s:'#303a44',a:'#d58837'},weapon:'rifle',melee:'cleaver',upgrade:0};
   const custom=frame===0?'warden':frame===10?'bastion':undefined,entry=IronVowFoundry.preview(unit,foundryModel(frame),custom),expected=[unit.paint,unit.trim.s,unit.trim.a];
   if(!entry)throw Error('Live preview was not ready for '+frame);
   const colors=[];entry.m.cont.traverse(o=>{if(o.isMesh&&o.material.color)colors.push(o.material.color.toArray());});
   const present=expected.map(hex=>{const wanted=new THREE.Color(hex).convertSRGBToLinear().toArray();return colors.some(rgb=>Math.hypot(...rgb.map((v,i)=>v-wanted[i]))<1e-6);});
   const g=entry.surface.getContext('2d'),data=g.getImageData(0,0,640,640).data;let opaque=0;for(let i=3;i<data.length;i+=4)if(data[i]>100)opaque++;
   const url=entry.url,other=IronVowFoundry.preview({...unit,paint:'#a45533'},foundryModel(frame),custom);
   return{present,expected,opaque,width:entry.surface.width,height:entry.surface.height,changed:other?.url!==url};
  },frame);
  const required=frame===0?sample.expected.slice(0,2):sample.expected;
  for(const [i,color] of required.entries())assert.ok(sample.present[i],'Frame '+frame+' applies material color '+color);
  assert.deepEqual([sample.width,sample.height],[640,640]);assert.ok(sample.opaque>1000,'Frame '+frame+' preview contains real rendered geometry');assert.equal(sample.changed,true,'Paint invalidates the live image cache');
 }
};
