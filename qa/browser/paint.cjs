const assert=require('node:assert/strict');

module.exports=async function checkPaint({page,origin}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 await page.evaluate(()=>{
  createBattle(0,false,true,[0]);
  // Exercise the raster paths even when WebGL is available.
  window.realFoundryDraw=window.IronVowFoundry.draw;
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
 const rasterFrames=await page.evaluate(()=>FRAMES.flatMap((f,frame)=>f.rig==='bastion'||frame===LINE_INFANTRY_FRAME||frame===LINE_ELITE_FRAME||frame===VANGUARD_FRAME?[]:[frame]));
 const cases=[...rasterFrames.map(frame=>({mode:'travel',frame})),
  {mode:'close',frame:0},{mode:'close',frame:3},{mode:'close',frame:11},{mode:'baked',frame:8},
  ...(await page.evaluate(()=>[LINE_INFANTRY_FRAME,LINE_ELITE_FRAME])).map(frame=>({mode:'baked',frame}))];
 for(const sample of cases){
  await page.evaluate(({mode,frame})=>{
   const u=window.paintSubject;
   u.frame=frame;u.weapon=FRAMES[frame].weapon??'rifle';u.melee=FRAMES[frame].melee;
   const [paint,trim]=HOSTILE_LIVERIES[6+frame%2];
   u.paint=paint;u.trim={s:trim};
   u.heading=-Math.PI/4;u.face=-1;u.headingOverride=mode==='travel'?undefined:u.heading;
   preloadTravel(u);preloadNativeMotion(frame,u.paint);
  },sample);
  await page.waitForFunction(mode=>{
   const source=window.paintAsset(mode);
   return source&&imageReady(source.image)&&imageReady(moduleImage(source.key+'-paint'));
  },sample.mode);
  const result=await page.evaluate(mode=>{
   const u=window.paintSubject,source=window.paintAsset(mode),mask=moduleImage(source.key+'-paint');
   function renderedBody(){
    const draw=ctx.drawImage,render=drawUnit;
    let body;
    drawUnit=(subject,t,close)=>{
     ctx.drawImage=function(image,...args){
      body??={image,args,filter:this.filter};
      return draw.call(this,image,...args);
     };
     try{render(subject,t,close)}finally{ctx.drawImage=draw}
    };
    ctx.save();ctx.filter='none';
    try{
     if(mode==='travel')drawUnit(u,5);
     else drawAttackPane({start:5,phase:'aim',part:'body'},{x:0,y:0,w:W/2,h:H/2},u,false,5);
    }finally{ctx.restore();drawUnit=render}
    if(!body)throw Error('No chassis sprite was drawn');
    return body;
   }
   const body=renderedBody();
   const region=body.args.length===8?body.args.slice(0,4):[0,0,source.image.naturalWidth,source.image.naturalHeight];
   const [,,width,height]=region;
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const g=canvas.getContext('2d',{willReadFrequently:true});
   function pixels(image){
    g.clearRect(0,0,width,height);g.drawImage(image,...region,0,0,width,height);
    return g.getImageData(0,0,width,height).data;
   }
   const original=pixels(source.image),painted=pixels(body.image),plates=pixels(mask);
   const model=foundryModel(u.frame),foundry=model!=null;
   const blend=foundry&&window.IRON_VOW_FOUNDRY_ART[model].paintBlend;
   const vivid=(data,i)=>data[i]>160&&data[i]>Math.max(data[i+1],data[i+2])+45;
   let primary=0,secondary=0,unpainted=0,leaked=0,brightRed=0;
   for(let i=0;i<original.length;i+=4){
    if(original[i+3]!==255||painted[i+3]!==255)continue;
    const changed=Math.abs(original[i]-painted[i])>=5||Math.abs(original[i+1]-painted[i+1])>=5||Math.abs(original[i+2]-painted[i+2])>=5;
    const bare=foundry?Math.max(plates[i],plates[i+1],plates[i+2])<=(blend?15:.85*255):plates[i]<16;
    if(bare){unpainted++;if(changed)leaked++}
    if(plates[i]>220&&changed)primary++;
    if(foundry&&plates[i]<=216&&plates[i+1]>220&&changed)secondary++;
    if(changed&&vivid(painted,i)&&!vivid(original,i))brightRed++;
   }
   return {filter:body.filter,foundry,primary,secondary,unpainted,leaked,brightRed};
  },sample.mode);
  const label=sample.mode+' chassis '+sample.frame;
  assert.equal(result.filter,'none',label+' uses no full-body filter');
  assert.ok(result.primary>20,label+' repaints primary plates');
  if(result.foundry)assert.ok(result.secondary>20,label+' repaints secondary plates');
  assert.ok(result.unpainted>20,label+' has bare materials to compare');
  assert.equal(result.leaked,0,label+' leaves '+result.unpainted+' bare material pixels untouched');
  assert.ok(result.brightRed<=Math.max(4,result.primary*.005),label+' keeps crimson muted');
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
 const live=await page.evaluate(()=>{
  window.IronVowFoundry.draw=window.realFoundryDraw;
  return [0,6].map(index=>{
   const [paint,trim]=HOSTILE_LIVERIES[index],unit={...window.paintSubject,id:'paint-'+index,frame:8,paint,trim:{s:trim}};
   const pal=foundryRender(unit,clock,true)?.m.build.pal;
   return {actual:[pal?.p,pal?.s],expected:[paint,trim].map(hex=>parseInt(hex.slice(1),16))};
  });
 });
 for(const sample of live)assert.deepEqual(sample.actual,sample.expected,'live Foundry honors both paint colors');
 console.log('PASS muted hostile liveries across travel, native and baked split screen, live Foundry, and target portraits');
};
