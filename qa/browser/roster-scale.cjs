const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

module.exports=async function checkRosterScale({page,mobile,origin}){
 await page.goto(new URL('/',origin).href,{waitUntil:'domcontentloaded'});
 const capture=!mobile&&Boolean(process.env.IRON_VOW_ROSTER_SHEET);
 const {sheet,...report}=await page.evaluate(async capture=>{
  const foundry=IronVowFoundry,rigs=IronVowRigV2,scene=IronVowScene;
  const max={body:100,pilot:100,right:100,left:100,legs:100};
  const roster=FRAMES.map((frame,id)=>({id:'scale-'+id,index:id,frame:id,name:frame.name,...stockHull(id),
   team:frame.enemyOnly?'enemy':'ally',pilot:0,hp:{...max},max,alive:true,heading:-Math.PI/4}));
  roster.push({...roster[0],id:'scale-lion',name:'LION',lionTrial:true,melee:'cleaver'});

  // Three's ordinary object bounds use bind-pose boxes for these skinned meshes.
  // Use visible posed vertices, counting native and fitted standard equipment once.
  const minimumNormalizedVertex=new THREE.Vector3(-1,-1,-1);
  function measure(mech){
   const {cont,rig,scale}=mech;
   const bounds=new THREE.Box3(),vertex=new THREE.Vector3(),local=new THREE.Matrix4();
   cont.updateMatrixWorld(true);
   const root=cont.getWorldPosition(new THREE.Vector3());
   const rotation=cont.getWorldQuaternion(new THREE.Quaternion()).invert();
   const unrotate=new THREE.Matrix4().makeRotationFromQuaternion(rotation)
    .multiply(new THREE.Matrix4().makeTranslation(-root.x,-root.y,-root.z));
   cont.traverseVisible(mesh=>{
    const position=mesh.isMesh&&mesh.geometry.attributes.position;
    if(!position)return;
    // Saltjack's Meshopt-compressed positions are signed normalized integers.
    const array=position.array??position.data?.array;
    const divisor=position.normalized&&array instanceof Int16Array?32767:1;
    local.multiplyMatrices(unrotate,mesh.matrixWorld);
    for(let i=0;i<position.count;i++){
     vertex.fromBufferAttribute(position,i);
     if(divisor!==1)vertex.divideScalar(divisor).max(minimumNormalizedVertex);
     if(mesh.isSkinnedMesh)mesh.boneTransform(i,vertex);
     bounds.expandByPoint(vertex.applyMatrix4(local));
    }
   });
   const anklePoints=rig.legs.map(leg=>leg.an.getWorldPosition(new THREE.Vector3()).applyMatrix4(unrotate));
   const ankles=new THREE.Box3().setFromPoints(anklePoints);
   const size=bounds.getSize(new THREE.Vector3()),track=ankles.getSize(new THREE.Vector3());
   const number=n=>Math.round(n*1000)/1000;
   return {scale:number(scale),legs:rig.legs.length,height:number(size.y),width:number(size.x),depth:number(size.z),
    footprint:number(size.x*size.z),ankleWidth:number(track.x),ankleDepth:number(track.z)};
  }
  function portraitFraming({surface,anchors}){
   const context=surface.getContext('2d'),size=surface.width;
   const pixels=context.getImageData(0,0,size,size).data;
   const [x,y]=anchors.body.map(value=>Math.round(value*size));
   const alpha=(x,y)=>pixels[(y*size+x)*4+3];
   const clipped=Array.from({length:size},(_,index)=>index).some(index=>
    alpha(index,0)||alpha(index,size-1)||alpha(0,index)||alpha(size-1,index));
   return {bodyAnchor:Boolean(alpha(x,y)),clipped};
  }
  const result=[];
  const tilePitch=scene.terrainMetrics.tilePitch;
  const canvas=capture?document.createElement('canvas'):null;
  const context=canvas?.getContext('2d');
  const columns=7,cell=208,row=224,heading=70;
  let view,grid;
  if(context){
   canvas.width=columns*cell;canvas.height=heading+Math.ceil(roster.length/columns)*row;
   context.fillStyle='#10191f';context.fillRect(0,0,canvas.width,canvas.height);
   context.fillStyle='#eef4f5';context.font='600 24px system-ui';context.fillText('Iron Vow roster at a common scale',14,29);
   context.fillStyle='#9fb3bc';context.font='14px system-ui';
   context.fillText(`Standing stock loadouts · each floor grid is one ${tilePitch}-unit battle tile`,14,53);
   const half=4.9,wide=half*innerWidth/innerHeight;
   view=new THREE.OrthographicCamera(-wide,wide,half,-half,.1,100);
   view.position.set(11,9,17);view.lookAt(0,2.65,0);
   grid=new THREE.GridHelper(tilePitch,4,0x4c6873,0x4c6873);
  }
  function captureFrame(mech,{name,stage}){
   const index=result.length-1,x=index%columns*cell,y=heading+Math.floor(index/columns)*row;
   foundry.renderInspection([mech.cont,grid],view);
   const raster=IronVowRenderer.get().domElement,side=raster.height;
   context.drawImage(raster,(raster.width-side)/2,0,side,side,x+8,y,cell-16,cell-16);
   context.fillStyle='#eef4f5';context.font='600 12px system-ui';context.textAlign='center';
   context.fillText(name,x+cell/2,y+201);
   context.fillStyle='#9fb3bc';context.font='11px system-ui';
   context.fillText([stage.height,stage.width,stage.depth].map(value=>value.toFixed(2)).join(' × ')+'  H × W × D',x+cell/2,y+217);
  }
  const stagePose={stage:'workshop',reducedMotion:true,heading:0,phase:0,primeProgress:0,
   strikeProgress:0,aim:0,recoil:0,impact:0,land:0,brace:0,
   world:{x:0,y:0,z:0,aim:new THREE.Vector3(0,4,20),face:0,heading:0,speed:0,noPlant:true,groundAt:()=>0}};
  createBattle(0,false,true,[0]);
  battle.cover.clear();
  battle.field={...battle.field,cells:null,cover:{}};
  selected=0;action='move';
  for(let offset=0;offset<roster.length;offset+=4){
   const batch=roster.slice(offset,offset+4);
   for(const [cell,unit] of batch.entries())Object.assign(unit,{index:cell,x:2+cell*2,z:10,vx:2+cell*2,vz:10});
   battle.units=batch;
   battle.lionTrial=false;
   scene.clear();
   scene.render(clock,.016);
   const loaded=await Promise.all(['battle','workshop','bench'].map(scope=>rigs.load(batch,scope)));
   if(!loaded.flat().every(Boolean))throw Error('Missing production rig in batch '+offset);
   // A render warm-up loads the armory and fits normal field gear before sampling.
   for(let retry=0;retry<100;retry++){
    scene.render(clock,.016);
    if(batch.every(unit=>scene.models.get(unit.id)?.entry.armed))break;
    await new Promise(resolve=>setTimeout(resolve,50));
   }
   for(const unit of batch){
    const model=foundryModel(unit.frame),authored=rigs.applies(unit);
    const field=scene.models.get(unit.id)?.entry;
    const stage=foundry.draw(unit,0,stagePose,null,model,authored?'rig-v2':undefined);
    const preview=foundry.preview(unit,model,undefined,0,'bench');
    if(!field?.armed||!stage?.armed||!preview?.armed)throw Error('Incomplete production view for '+unit.name+
     ' '+[field,stage,preview].map(entry=>entry?String(entry.armed):'missing').join('/'));
    result.push({name:unit.name,frame:unit.lionTrial?'lion':unit.frame,authored:field.m.live??null,
     field:measure(field.m),stage:measure(stage.m),preview:measure(preview.m),
     ...(unit.frame===0&&!unit.lionTrial?{framing:portraitFraming(preview)}:{})});
    if(context)captureFrame(stage.m,result.at(-1));
    foundry.releaseStageRig('workshop',unit.id);
   }
   rigs.clear('workshop');
  }
  grid?.geometry.dispose();grid?.material.dispose();
  return {tilePitch,frames:result,sheet:canvas?.toDataURL('image/webp',.86)};
 },capture);
 if(!mobile&&process.env.IRON_VOW_ROSTER_REPORT){
  const output=path.resolve(process.env.IRON_VOW_ROSTER_REPORT);
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 }
 if(capture){
  assert.ok(sheet?.startsWith('data:image/webp;base64,'));
  fs.writeFileSync(path.resolve(process.env.IRON_VOW_ROSTER_SHEET),Buffer.from(sheet.split(',')[1],'base64'));
 }
 assert.ok(report.frames.length>=28,'The full frame registry and the Lion trial were measured');
 for(const {name,field,stage,preview} of report.frames){
  assert.equal(field.scale,stage.scale,name+' uses the same physical size in combat and the Workshop');
  for(const [view,size] of Object.entries({field,stage})){
   assert.ok(size.height>=4.2&&size.height<=6.45,`${name} ${view}: standing height ${size.height}`);
   assert.ok(Math.max(size.width,size.depth)<=report.tilePitch*.9,`${name} ${view}: fits within its tile`);
   assert.ok(size.footprint<=33.5,`${name} ${view}: standing footprint ${size.footprint}`);
  }
  assert.ok(preview.height>=4.65&&preview.height<=7.05,`${name}: portrait height ${preview.height}`);
  assert.ok(Math.max(preview.width,preview.depth)<=6.25&&preview.footprint<=33.5,`${name}: portrait silhouette`);
 }
 const reaver=report.frames.find(frame=>frame.name==='REAVER');
 const behemoth=report.frames.find(frame=>frame.name==='BEHEMOTH');
 const aero=report.frames.find(frame=>frame.name==='AERO');
 const husky=report.frames.find(frame=>frame.name==='HUSKY');
 const warden=report.frames.find(frame=>frame.name==='WARDEN');
 assert.deepEqual(warden.framing,{bodyAnchor:true,clipped:false},'Warden portrait is fully framed and its body anchor stays on the silhouette');
 for(const view of ['field','stage','preview']){
  assert.ok(reaver[view].footprint<=behemoth[view].footprint*1.04,`Reaver stays in the heavy quad's footprint class in ${view}`);
  assert.ok(reaver[view].legs===4&&reaver[view].ankleWidth>behemoth[view].ankleWidth&&reaver[view].ankleDepth>behemoth[view].ankleDepth,
   `Reaver retains its wider four-foot stance in ${view}`);
  assert.ok(Math.abs(aero[view].height-husky[view].height)<.5,`Aero stays at trail-scout height in ${view}`);
 }
};
