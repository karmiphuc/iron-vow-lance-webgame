const assert=require('node:assert/strict');

module.exports=async function checkPaint({page,origin}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 await page.evaluate(()=>{
  createBattle(0,false,true,[0]);
  // Exercise the raster paths even when WebGL is available.
  window.IronVowFoundry.draw=()=>null;
  window.paintSubject=battle.units.find(u=>u.team==='enemy'&&!u.kind);
  window.paintAsset=mode=>{
   const u=window.paintSubject;
   if(mode==='travel'){
    const view=travelVisual(u,5);
    if(view)return {image:view.image,key:view.source.key};
   }else if(mode==='baked'){
    const atlas=window.IRON_VOW_FOUNDRY_ART[foundryModel(u.frame)];
    return {image:motionImage(atlas),key:atlas.key};
   }else{
    const visual=activeWardenVisual(u),frame=wardenMotionFrame(u,visual,animationPose(u,5,visual));
    return frame?.frame?{image:frame.image,key:frame.atlas.key}:{image:artImages[visual.key],key:visual.key};
   }
  };
 });
 const rasterFrames=await page.evaluate(()=>FRAMES.flatMap((f,frame)=>f.rig==='bastion'||frame===LINE_INFANTRY_FRAME?[]:[frame]));
 const cases=[...rasterFrames.map(frame=>({mode:'travel',frame})),
  {mode:'close',frame:0},{mode:'close',frame:3},{mode:'close',frame:11},{mode:'baked',frame:8}];
 for(const sample of cases){
  await page.evaluate(({mode,frame})=>{
   const u=window.paintSubject;
   u.frame=frame;u.weapon=FRAMES[frame].weapon??'rifle';u.melee=FRAMES[frame].melee;
   u.heading=-Math.PI/4;u.face=-1;u.headingOverride=mode==='travel'?undefined:u.heading;
   preloadTravel(u);preloadNativeMotion(frame,u.paint);
  },sample);
  await page.waitForFunction(mode=>{
   const source=window.paintAsset(mode);
   return source&&imageReady(source.image)&&imageReady(moduleImage(source.key+'-paint'));
  },sample.mode);
  const result=await page.evaluate(mode=>{
   const u=window.paintSubject,source=window.paintAsset(mode),mask=moduleImage(source.key+'-paint');
   const draw=ctx.drawImage;
   let body;
   ctx.drawImage=function(image,...args){
    body??={image,args,filter:this.filter};
    return draw.call(this,image,...args);
   };
   ctx.save();ctx.filter='none';
   try{drawUnit(u,5,mode!=='travel')}finally{ctx.restore();ctx.drawImage=draw}
   if(!body)throw Error('No chassis sprite was drawn');
   const region=body.args.length===8?body.args.slice(0,4):[0,0,source.image.naturalWidth,source.image.naturalHeight];
   const [,,width,height]=region;
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const g=canvas.getContext('2d',{willReadFrequently:true});
   function pixels(image){
    g.clearRect(0,0,width,height);g.drawImage(image,...region,0,0,width,height);
    return g.getImageData(0,0,width,height).data;
   }
   const original=pixels(source.image),painted=pixels(body.image),plates=pixels(mask);
   const foundry=foundryModel(u.frame)!=null;
   let changedRed=0,unpainted=0,leaked=0;
   for(let i=0;i<original.length;i+=4){
    if(original[i+3]!==255||painted[i+3]!==255)continue;
    const changed=Math.abs(original[i]-painted[i])>=5||Math.abs(original[i+1]-painted[i+1])>=5||Math.abs(original[i+2]-painted[i+2])>=5;
    const bare=foundry?Math.max(plates[i],plates[i+1],plates[i+2])<=.85*255:plates[i]<16;
    if(bare){unpainted++;if(changed)leaked++}
    if(plates[i]>220&&changed&&painted[i]>Math.max(painted[i+1],painted[i+2])+12)changedRed++;
   }
   return {filter:body.filter,changedRed,unpainted,leaked};
  },sample.mode);
  const label=sample.mode+' chassis '+sample.frame;
  assert.equal(result.filter,'none',label+' uses plate paint instead of a full-body filter');
  assert.ok(result.changedRed>20,label+' has red plates');
  assert.ok(result.unpainted>20,label+' has bare materials to compare');
  assert.equal(result.leaked,0,label+' leaves '+result.unpainted+' bare material pixels untouched');
 }
 for(const frame of [0,8]){
  await page.evaluate(frame=>{
   const foe=window.paintSubject;foe.frame=frame;foe.weapon='rifle';
   lockedTarget=foe.id;targetPanelOpen=true;renderBattle();
  },frame);
  const portrait=page.locator('.combat-target img');
  assert.equal(await portrait.evaluate(el=>getComputedStyle(el).filter),'none','no portrait color filter');
  await page.waitForFunction(()=>document.querySelector('.combat-target img')?.src.startsWith('data:image/png'));
 }
 console.log('PASS crimson plate masks on all '+rasterFrames.length+' travel sprites, native and baked close views, and the target portrait');
};
