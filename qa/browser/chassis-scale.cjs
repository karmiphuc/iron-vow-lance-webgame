const assert=require('node:assert/strict');

module.exports=async function checkChassisScale({page,mobile,origin}){
 if(mobile)await page.setViewportSize({width:320,height:568});
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(async()=>{
  save.credits=FRAMES[3].cost+FRAMES[SHOGUN_FRAME].cost+FRAMES[AERO_FRAME].cost;
  if(!assignChassis(0,3))throw Error('Gatecrasher procurement failed');
  if(!assignChassis(1,AERO_FRAME))throw Error('Aero procurement failed');
  if(!acquireHull(SHOGUN_FRAME))throw Error('Shogun procurement failed');
  createBattle(0,false,false,[0,1,2]);
  const heavy=current(),scout=battle.units.find(u=>u.frame===ASHIGARU_FRAME),aero=battle.units[1];
  battle.units=[heavy,scout,aero];battle.cover.clear();
  Object.assign(heavy,{x:7,vx:7,z:12,vz:12});
  Object.assign(scout,{x:9,vx:9,z:10,vz:10});
  Object.assign(aero,{x:8,vx:8,z:11,vz:11});
  const probe=document.createElement('canvas');
  probe.width=probe.height=224;
  const pixels=probe.getContext('2d',{willReadFrequently:true});
  function measure(render){
   let bounds;
   const drawImage=ctx.drawImage;
   ctx.drawImage=function(image,...args){
    if(!bounds&&/gatecrasher|shogun|ashigaru-combat|aero-motion/.test(image.src||'')){
     const [sx,sy,sw,sh,dx,dy,dw,dh]=args.length===8?args:[0,0,image.width,image.height,...args];
     pixels.clearRect(0,0,224,224);
     pixels.drawImage(image,sx,sy,sw,sh,0,0,224,224);
     const alpha=pixels.getImageData(0,0,224,224).data;
     let first=224,last=-1;
     for(let i=3;i<alpha.length;i+=4)if(alpha[i]>64){
      const row=Math.floor(i/(4*224));
      first=Math.min(first,row);last=Math.max(last,row);
     }
     if(last<first)throw Error('Empty chassis sprite');
     const y=ctx.getTransform().f+dy;
     bounds={top:y+first*dh/224,bottom:y+(last+1)*dh/224,scale};
     bounds.height=(bounds.bottom-bounds.top)/scale;
    }
    return drawImage.call(this,image,...args);
   };
   try{render()}finally{ctx.drawImage=drawImage}
   if(!bounds)throw Error('Chassis sprite was not drawn');
   return bounds;
  }
  const samples=[];
  const loadouts=[[null,null],['cleaver',null],[null,'vesper-shoulder'],['cleaver','vesper-shoulder']];
  for(const [frame,melee,shoulder] of [3,SHOGUN_FRAME].flatMap(frame=>loadouts.map(kit=>[frame,...kit]))){
   Object.assign(heavy,{frame,melee,shoulder});
   const atlas=travelAtlas(heavy).grounded;
   await Promise.all([
    ...preloadNativeMotion(heavy.frame,heavy.paint,heavy),
    ...preloadNativeMotion(scout.frame,scout.paint,scout),
    ...preloadNativeMotion(aero.frame,aero.paint,aero),
    ...FIELD_HEADINGS.map((_,heading)=>travelDetail(heavy,atlas,heading).image)
   ].map(image=>image.decode()));
   setFieldProjection();
   const field=FIELD_HEADINGS.map(heading=>[heavy,scout,aero].map(u=>{
    u.heading=heading;u.face=Math.sign(Math.sin(heading));
    return measure(()=>drawUnit(u,clock,false)).height;
   }));
   const sequence={actor:heavy,target:scout,w:unitWeapon(heavy),part:'body',start:clock,phase:'aim'};
   // Use the same desktop and stacked layouts as the live camera.
   const stacked=W<640&&H>W,margin=stacked?12:Math.max(18,W*.095),gap=stacked?6:8;
   const width=W-2*margin,height=stacked?H*.69:Math.min(H*.61,width*.42);
   const pane={x:margin,y:0,w:stacked?width:(width-gap)/2,h:stacked?(height-gap)/2:height};
   const close=[heavy,scout].map((u,i)=>measure(()=>drawAttackPane(sequence,pane,u,i===0,clock+.29)));
   close.push(measure(()=>drawAttackPane({...sequence,actor:aero,target:heavy,w:unitWeapon(aero)},pane,aero,true,clock+.29)));
   samples.push({field,close,paneHeight:pane.h,shoulder});
  }
  return samples;
 });
 for(const {field,close:[heavy,scout,aero],paneHeight,shoulder} of result){
  for(const [h,s,a] of field){
   assert.ok(h>=s*1.12,`heavy and scout visible height on the grid: ${h} vs ${s}`);
   assert.ok(a<h&&a<s*1.15,`Aero visible height on the grid: ${a} vs ${h} and ${s}`);
   // A visible missile pod can extend beyond the base hull from the rear.
   assert.ok(Math.abs(h-heavy.height)<heavy.height*(shoulder?.20:.10),`heavy hull scale between cameras: ${h} vs ${heavy.height}`);
  }
  assert.equal(heavy.scale,scout.scale,'opponents share a camera scale');
  assert.ok(heavy.height>=scout.height*1.12,'heavy is visibly taller in the exchange');
  assert.ok(aero.height<heavy.height&&aero.height<scout.height*1.15,'Aero keeps its relative height in the exchange');
  for(const body of [heavy,scout,aero])assert.ok(body.top>=43&&body.bottom<=paneHeight-31,
   `the chassis clears the attack pane labels: ${body.top}, ${body.bottom} in ${paneHeight}`);
 }
};
