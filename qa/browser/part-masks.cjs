const assert=require('node:assert/strict');
const {writeFileSync}=require('node:fs');
const {join}=require('node:path');

module.exports=async function checkPartMasks({page,mobile,origin}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(new URL('?tintdebug',origin).href,{waitUntil:'domcontentloaded'});
 await page.locator('#nav button').first().waitFor({state:'attached'});
 const result=await page.evaluate(async capture=>{
  // Exercise the shipped sprite path where an optional WebGL render is unavailable.
  window.IronVowFoundry.draw=()=>null;
  drawMechSmoke=()=>{};
  drawUnitReadout=()=>{};
  drawWeaponModule=()=>{};
  const tint=drawPartTints,readCell=tintMaskCell;
  const size=220,sheet=document.createElement('canvas'),expected=document.createElement('canvas');
  sheet.width=size*4;sheet.height=size*9;expected.width=expected.height=size;
  const contact=sheet.getContext('2d'),labels=expected.getContext('2d',{willReadFrequently:true});
  const swatches=Object.values(TINT_DEBUG).map(hex=>parseInt(hex.slice(1),16));
  const x=Math.round(canvas.width/2),y=Math.round(canvas.height/2)+55,left=x-size/2,top=y-size+24;
  const cases=[];
  save=fresh();deploy(0,false,[0]);closeModal();
  const u=current(),oldOrigin=origin,oldScale=scale;
  try{
   for(const [chassis,model] of [0,5,10].entries()){
    const frame=FRAMES.findIndex(f=>f.foundry===model),atlas=window.IRON_VOW_FOUNDRY_ART[model];
    Object.assign(u,{frame,weapon:FRAMES[frame].weapon,melee:FRAMES[frame].melee});
    const keys=[atlas.key,...(atlas.directions??[]).map(v=>v.variants[foundryArmVariant(u)]),
     ...(atlas.destruction?.directions??(atlas.destruction?[atlas.destruction]:[])).map(v=>v.key)];
    const travel=travelAtlas(u);
    if(travel)keys.push(travel.key);
    await Promise.all(keys.flatMap(key=>[motionRaster(key),motionRaster(window.IRON_VOW_PART_MASKS[key])]).map(im=>im.decode()));
    for(const [pose,mode] of ['walk','attack','death'].entries())for(const [heading,angle] of FIELD_HEADINGS.entries()){
     const t=10,close=mode!=='walk';
     Object.assign(u,{heading:angle,face:Math.sign(Math.sin(angle)),headingOverride:close?angle:undefined,
      motion:mode==='walk'?{start:9.55,duration:1,gaitBase:0,fromX:u.x,fromZ:u.z,toX:u.x+1,toZ:u.z,stepIndex:0,totalSteps:1}:null,
      attack:mode==='attack'?{kind:u.weapon,start:9.7,windup:.25,fireAt:9.98,returnAt:10.2}:null,
      alive:mode!=='death',downReason:mode==='death'?'body':null,deathTime:mode==='death'?8.7:undefined});
     scale=58;origin={x:x-(u.vx-u.vz)*scale*.866,y:y-(u.vx+u.vz)*scale*.42};
     const calls=[];
     tintMaskCell=(mask,image,part)=>{calls.push(part);return readCell(mask,image,part)};
     let key,cell,plain,pixels;
     drawPartTints=(unit,time,paint,anchor,scorch,mask)=>{
      if(mask){
       key=mask.key;cell=[mask.sx,mask.sy];
       const m=ctx.getTransform(),source=document.createElement('canvas');
       source.width=mask.w;source.height=mask.h;
       source.getContext('2d').drawImage(motionRaster(key),mask.sx,mask.sy,mask.w,mask.h,0,0,mask.w,mask.h);
       labels.resetTransform();labels.clearRect(0,0,size,size);labels.imageSmoothingEnabled=false;
       labels.setTransform(m.a,m.b,m.c,m.d,m.e-left,m.f-top);mask.draw(labels,source);
      }
      plain=ctx.getImageData(left,top,size,size).data;
      tint(unit,time,paint,anchor,scorch,mask);
      pixels=ctx.getImageData(left,top,size,size).data;
     };
     ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
     try{drawUnit(u,t,close)}finally{ctx.restore();drawPartTints=tint;tintMaskCell=readCell}
     const reference=labels.getImageData(0,0,size,size).data;
     const seen=new Set();
     let alpha=0,outside=0,core=0,labeled=0,colored=0,mismatch=0;
     for(let i=0;i<pixels.length;i+=4){
      alpha=Math.max(alpha,Math.abs(plain[i+3]-pixels[i+3]));
      if(!plain[i+3]&&pixels[i+3])outside++;
      if(plain[i+3]<250)continue;
      core++;
      if(reference[i+3]<250)continue;
      const part=(reference[i]===255?1:0)|(reference[i+1]===255?2:0)|(reference[i+2]===255?4:0);
      if(!swatches[part-1])continue;
      labeled++;
      // Both passes antialias the silhouette and the animated death mesh.
      // Compare color inside each plate, separately from edge coverage.
      if(plain[i+3]!==255||reference[i+3]!==255||[-4,4,-4*size,4*size].some(d=>
       [0,1,2,3].some(c=>reference[i+d+c]!==reference[i+c])))continue;
      const distance=rgb=>Math.hypot(pixels[i]-(rgb>>16),pixels[i+1]-(rgb>>8&255),pixels[i+2]-(rgb&255));
      const color=swatches.reduce((best,rgb)=>distance(rgb)<distance(best)?rgb:best);
      if(color===swatches[part-1]&&distance(color)<40){colored++;seen.add(part)}
      else mismatch++;
     }
     const label=FRAMES[frame].name+' / '+mode+' / '+heading;
     cases.push({label,key,cell,calls:[...calls],alpha,outside,core,labeled,colored,mismatch,parts:seen.size});
     if(capture){
      const column=heading*size,row=(chassis*3+pose)*size;
      contact.fillStyle='#111923';contact.fillRect(column,row,size,size);
      contact.drawImage(canvas,left,top,size,size,column,row,size,size);
      contact.fillStyle='#e9eef3';contact.font='12px sans-serif';contact.fillText(label,column+7,row+size-5);
     }
    }
   }
  }finally{origin=oldOrigin;scale=oldScale;drawPartTints=tint;tintMaskCell=readCell}
  return {cases,png:capture?sheet.toDataURL('image/png'):null};
 },Boolean(process.env.IRON_VOW_MASK_PROOF));
 if(result.png)writeFileSync(join(process.env.IRON_VOW_MASK_PROOF,mobile?'tintdebug-touch.png':'tintdebug-desktop.png'),
  Buffer.from(result.png.split(',')[1],'base64'));
 assert.equal(result.cases.length,36);
 for(const frame of result.cases){
  const info=JSON.stringify(frame);
  assert.ok(frame.key?.endsWith('-parts')&&frame.calls.length===5,info);
  assert.equal(new Set(frame.calls).size,5,info);
  assert.ok(frame.core>100&&frame.parts>=3,info);
  assert.ok(frame.labeled/frame.core>.9&&frame.colored>100&&frame.mismatch<frame.colored*.01,info);
  assert.equal(frame.outside,0,info);
  assert.ok(frame.alpha<=2,info);
 }
 console.log('PASS 36 tintdebug views with baked cell selection, part colors and unchanged silhouette');
};
