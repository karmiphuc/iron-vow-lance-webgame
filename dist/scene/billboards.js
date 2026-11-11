/* The single temporary sheet adapter, removed when Phase 3 makes every frame live. */
(function(root){
'use strict';
const T=root.THREE,cache=new Map(),SIZE=512,SCALE=96;
let drawing=false,revision=0,requested=null;
function get(u,t){
 if(root.IronVowScene.isLive(u))throw Error('Live frames cannot enter the billboard adapter');
 let entry=cache.get(u.id);
 if(!entry){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;
  const texture=new T.CanvasTexture(canvas);texture.encoding=T.sRGBEncoding;
  const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,alphaTest:.04,depthWrite:false}));sprite.center.set(.5,.16);sprite.scale.set(SIZE/SCALE*3.4,SIZE/SCALE*3.4,1);
  entry={canvas,texture,sprite};cache.set(u.id,entry);
 }
 const poseTime=hitstopTime(u,t),recent=(time,seconds)=>Number.isFinite(time)&&t>=time&&t-time<seconds;
 const animated=u.motion||u.attack||u.kind==='helicopter'&&u.alive||recent(u.hitTime,.9)||recent(u.fireTime,.8)||recent(u.braceTime,1.22)||!u.alive&&recent(u.deathTime,10);
 const stamp=JSON.stringify([revision,u.frame,u.kind,u.paint,u.trim,u.weapon,u.melee,u.shield,u.hp,u.alive,u.heading,u.attack,animated?Math.floor(poseTime*24):null]);
 if(stamp!==entry.stamp){
  const saved={ctx,origin,scale};drawing=true;requested=new Set();
  try{
   ctx=entry.canvas.getContext('2d');ctx.clearRect(0,0,SIZE,SIZE);scale=SCALE;
   origin={x:SIZE/2-(u.vx-u.vz)*SCALE*.866,y:SIZE*.84-(u.vx+u.vz)*SCALE*.42+terrainHeight(u.vx,u.vz)*SCALE};
   drawUnitBody(u,poseTime,false);
   entry.previousAnchors=entry.anchors;entry.anchors={};entry.time=poseTime;
   for(const part of ['body','pilot','right','left','legs','muzzle','muzzle2','shield','meleeTip','leadFoot','gripL','gripR','shoulderMuzzle','shoulderMuzzle2','mortarMuzzle'])entry.anchors[part]=billboardPixelAttachment(u,part,poseTime);
   entry.texture.needsUpdate=true;entry.stamp=stamp;entry.images=[...requested];
   if(!entry.bounds&&entry.images.every(imageReady)){
    const pixels=ctx.getImageData(0,0,SIZE,SIZE).data,bounds={minX:SIZE,minY:SIZE,maxX:0,maxY:0};
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(pixels[(y*SIZE+x)*4+3]>35){bounds.minX=Math.min(bounds.minX,x);bounds.maxX=Math.max(bounds.maxX,x);bounds.minY=Math.min(bounds.minY,y);bounds.maxY=Math.max(bounds.maxY,y);}
    if(bounds.minX<bounds.maxX)entry.bounds=bounds;
   }
  }finally{ctx=saved.ctx;origin=saved.origin;scale=saved.scale;drawing=false;requested=null;}
 }
 entry.sprite.material.color.setHex(!u.alive?0x777777:u.team==='ally'&&spent(u)?0xa0a0a0:0xffffff);
 entry.sprite.position.copy(root.IronVowScene.world(u.vx,u.vz));
 return entry.sprite;
}
function canvasPoint(entry,p,camera){
 const right=new T.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion);
 return entry.sprite.position.clone().addScaledVector(right,(p.x/SIZE-.5)*entry.sprite.scale.x).addScaledVector(up,(1-p.y/SIZE-.16)*entry.sprite.scale.y);
}
function worldAttachment(u,part,t=clock){
 let entry=cache.get(u.id);if(!entry||t>=entry.time-.02){get(u,t);entry=cache.get(u.id);}
 const points=t<entry.time-.02?entry.previousAnchors||entry.anchors:entry.anchors,p=points?.[part]||points?.body||{x:SIZE/2,y:SIZE/2};
 const camera=root.IronVowScene.camera;if(!camera)return entry.sprite.position.clone();
 return canvasPoint(entry,p,camera);
}
function bounds(id,camera){
 const entry=cache.get(id),b=entry?.bounds;if(!b)return null;
 return new T.Box3().setFromPoints([canvasPoint(entry,{x:b.minX,y:b.minY},camera),canvasPoint(entry,{x:b.minX,y:b.maxY},camera),canvasPoint(entry,{x:b.maxX,y:b.minY},camera),canvasPoint(entry,{x:b.maxX,y:b.maxY},camera)]);
}
function clear(){for(const entry of cache.values()){entry.sprite.parent?.remove(entry.sprite);entry.texture.dispose();entry.sprite.material.dispose();}cache.clear();}
root.IronVowBillboards={get,clear,bounds,worldAttachment,pixelAttachment:(...args)=>billboardPixelAttachment(...args),preview:(...args)=>billboardPreview(...args),invalidate(){revision++;},track(image){requested?.add(image);return image;},ready(id){const entry=cache.get(id);return Boolean(entry&&entry.images?.every(imageReady));},get drawing(){return drawing;}};
})(window);

// All remaining sheet, mask and raster deformation helpers are temporary Phase 3 dependencies.
function billboardPreview(canvas,u,model,angle){
 const views=window.IRON_VOW_FOUNDRY_ART?.[model]?.views;
 const view=views?.[angle]||views?.[0];
 const key=view?.key||'foundry-'+model,base=moduleImage(key);
 if(!imageReady(base))return;
 const size=canvas.width,g=canvas.getContext('2d');
 const rendered=foundryPaint(base,key,u.paint,u.trim);
 const bounds={x:0,y:0,w:size,h:size},shield=view&&shieldMount(u,view,bounds,view.direction,view.ortho);
 g.clearRect(0,0,size,size);
 if(view?.direction>0)drawWeaponModule(g,shield);
 g.drawImage(rendered,0,0,size,size);
 if(view){
  drawWeaponModule(g,foundryMount(view,bounds,u.weapon,view.direction,0,view.ortho));
  drawWeaponModule(g,foundryMount(view,bounds,u.melee,view.direction,0,view.ortho));
  if(view.direction<0)drawWeaponModule(g,shield);
 }
}

function activeWardenVisual(u){
 if(u.kind)return;
 const visual=wardenVisual(u.frame,u.weapon,unitFacing(u),u.team==='enemy',u);
 return visual&&(visual.native||imageReady(artImages[visual.key]))?visual:undefined;
}

function spriteFlip(u,visual=activeWardenVisual(u)){return !visual&&unitFacing(u)!==(u.frame===1?1:-1)}

function foundryWalk(u){
 if(window.IronVowScene?.isLive(u))return null;
 const walk=window.IRON_VOW_WALK?.[foundryModel(u.frame)];
 const clip=walk?.directions?.[headingIndex(displayedHeading(u))]??walk;
 return clip?.variants?.[foundryArmVariant(u)]??clip;
}

function motionRaster(key){
 let image=motionImages[key];
 if(!image){
  image=motionImages[key]=new Image();
  image.decoding='async';
  image.onload=()=>window.IronVowBillboards.invalidate();
  image.src=art(key);
 }
 return window.IronVowBillboards.track(image);
}

function motionImage(atlas){
 const mask=partTintKey(atlas.key,atlas.partMask);
 if(mask)motionRaster(mask);
 return motionRaster(atlas.key);
}

function preloadNativeMotion(frame,paint,hull){
 if(window.IronVowScene?.isLive({frame}))return [];

 const atlas=window.IRON_VOW_FOUNDRY_ART?.[foundryModel(frame)];
 if(atlas){
  const death=atlas.destruction,views=death?.directions??(death?[death]:[]);
  const deathImages=views.map(view=>motionImage(view));
  if(death?.paint!==false&&(paint||hull?.trim))for(const view of views)deathImages.push(moduleImage(view.key+'-paint'));
  if(atlas.views?.[0])moduleImage(atlas.views[0].key);
  if(atlas.directions){
   const arm=foundryArmVariant(hull);
   return [motionImage(atlas),...atlas.directions.map(view=>motionImage({key:view.variants[arm]})),...deathImages];
  }
  if(frame===REAVER_FRAME)return [...REAVER_ATLASES.map(key=>motionImage({key})),...deathImages];
  const strike=atlas.strikes?.[hull?.melee];
  if(paint)moduleImage(atlas.key+'-paint');
  if(atlas.variants)return [...atlas.variants.map(key=>motionImage({key})),...deathImages];
  if(atlas.unarmedKey){
   motionImage({key:atlas.unarmedKey});
   if(paint)moduleImage(atlas.unarmedKey+'-paint');
  }
  const images=[motionImage(atlas),...deathImages];
  if(strike)images.push(motionImage(strike));
  return images;
 }
 const views=prototypes[nativeHullKey(frame,hull)];
 return views?Object.values(views).map(visual=>{
  if(paint)moduleImage(visual.motion.key+'-paint');
  return motionImage(visual.motion);
 }):[];
}

async function readyNativeMotion(u,timeout=1400){
 const missing=preloadNativeMotion(u.frame,u.paint,u).filter(im=>!imageReady(im)&&im.decode);
 if(missing.length)await Promise.race([Promise.allSettled(missing.map(im=>im.decode())),delay(timeout)]);
}

function attackMotionImage(atlas,paint){
 if(paint)moduleImage(atlas.key+'-paint');
 return motionImage(atlas);
}

function nearestFrame(frames,level){
 return frames?.length?frames.reduce((best,frame)=>Math.abs(frame.level-level)<Math.abs(best.level-level)?frame:best):undefined;
}

function wardenStrikeClip(u,pose){
 if(!pose?.strikeKind||!u.alive||u.hp.left<=0||(u.brace&&u.hp.legs>0&&pose.brace<1))return null;
 const motion=weaponMotion(pose.strikeKind);
 const style=motion==='breaker'?'maul':['piledriver','blade',FREE_HAND_COUNTER.id].includes(motion)?'thrust':'sweep';
 return u.brace&&u.hp.legs>0?'braced-'+style:style;
}

function wardenStrikeLevel(u,pose){
 return reducedMotion?(Number.isFinite(u.attack?.fireAt)?.70:0):pose.strikeProgress;
}

function nativeAttackProgress(attack,t){
 const {cue,duration}=attack.native,{start,fireAt,primeDuration}=attack;
 return clamp01(Number.isFinite(fireAt)?cue+(t-fireAt)/duration:Math.min(cue,(t-start-primeDuration)/duration));
}

function wardenMotionFrame(u,visual,pose){
 if(!visual)return;
 const strikeAtlas=visual.strikeMotion,clip=strikeAtlas&&pose.primePhase!=='step'&&wardenStrikeClip(u,pose);
 if(clip){
  const image=attackMotionImage(strikeAtlas,u.paint);
  if(imageReady(image))return {atlas:strikeAtlas,image,frame:nearestFrame(strikeAtlas[clip],wardenStrikeLevel(u,pose))};
 }
 if(reducedMotion)return;
 const {motion:atlas,attackMotion}=visual;
 const strike=pose.strikeKind==='blade'||pose.strikeKind===FREE_HAND_COUNTER.id?'cleaver':weaponMotion(pose.strikeKind);
 if(visual.native){
  if(!u.alive||(!u.attack?.native&&!u.motion))return;
  const image=motionImage(atlas);
  if(!imageReady(image))return;
  const native=u.attack?.native;
  if(native){
   if(pose.primePhase==='step'||pose.primePhase==='return'){
    const index=Math.min(atlas.gait.length-1,Math.floor(pose.primeProgress*atlas.gait.length/2));
    return {atlas,image,frame:atlas.gait[index]};
   }
   return{atlas,image,frame:nearestFrame(atlas[native.clip],nativeAttackProgress(u.attack,pose.time))};
  }
  return{atlas,image,frame:atlas.gait[Math.floor((pose.cycle%1)*atlas.gait.length)]};
 }
 if(visual.motion?.brace&&u.alive&&u.brace&&u.hp.legs>0&&!u.motion){
  const image=motionImage(atlas);
  if(imageReady(image)){
   const kick=Math.abs(pose.recoil);
   const frame=pose.brace<1?nearestFrame(atlas.brace,pose.brace):
    kick>.08?nearestFrame(atlas.braceKick,kick):
    pose.aim>.12?nearestFrame(atlas.braceAim,pose.aim):atlas.brace.at(-1);
   return {atlas,image,frame};
  }
 }
 const kick=pose.recoil*(weaponMotion(u.weapon)==='rail'?1.35:.8)*(1-pose.brace*.4);
 if(u.alive&&pose.primePhase&&attackMotion){
  const image=attackMotionImage(attackMotion,u.paint);
  if(imageReady(image)){
   let frame=nearestFrame(attackMotion.prime,pose.primeProgress);
   if(pose.primePhase==='planted'){
    if(pose.strikeKind)frame=nearestFrame(attackMotion[strike],pose.strikeProgress)||frame;
    else if(kick>.11)frame=nearestFrame(attackMotion.kick,kick)||frame;
    else frame=nearestFrame(attackMotion.aim,pose.aim)||frame;
   }
   return {atlas:attackMotion,image,frame};
  }
 }
 if(!atlas)return;
 const image=motionImage(atlas);
 if(!imageReady(image))return;
 let frame;
 if(!u.alive&&atlas.death?.length){
  frame=nearestFrame(atlas.death,pose.kneel);
 }else if(pose.primePhase&&pose.primePhase!=='planted'&&pose.primeProgress>0&&atlas.gait?.length){
  frame=atlas.gait[Math.min(atlas.gait.length-1,Math.floor(pose.primeProgress*atlas.gait.length/2))];
 }else if(pose.strikeKind&&atlas[strike]?.length){
  frame=nearestFrame(atlas[strike],pose.strikeProgress);
 }else if(pose.walk>.12&&atlas.gait?.length){
  const cycle=((pose.cycle%2)+2)%2;
  frame=atlas.gait[Math.min(atlas.gait.length-1,Math.floor(cycle*atlas.gait.length/2))];
 }else{
  if(kick>.11)frame=nearestFrame(atlas.kick,kick);
  else if(pose.aim>.12)frame=nearestFrame(atlas.aim,pose.aim);
 }
 return {atlas,image,frame};
}

function remainingPose(pose,baked){
 return baked?.frame?{...pose,walk:0,recoil:0}:pose;
}

function unitBounds(u,visual=activeWardenVisual(u)){
 if(liveWarden(u)){
  const p=project(u.vx,jumpjetHeight(u,clock),u.vz),size=scale*LIVE_WARDEN_SIZE;
  return{x:p.x-size*.5,y:p.y-size*.84,w:size,h:size};
 }
 const p=project(u.vx,jumpjetHeight(u,clock),u.vz),size=scale*MECH_SIZE[u.frame]*(visual?.scale??1),model=foundryModel(u.frame);
 if(u.lionTrial&&window.IRON_VOW_LION_ART){
  const {ground}=window.IRON_VOW_LION_ART,span=scale*3.45;
  return {x:p.x-span*.5,y:p.y-span*ground,w:span,h:span};
 }
 const atlas=window.IRON_VOW_FOUNDRY_ART?.[model],ground=atlas?.ground;
 const groundX=Array.isArray(ground)?(!atlas.directions&&unitFacing(u)>0?1-ground[0]:ground[0]):undefined;
 const groundY=Array.isArray(ground)?ground[1]:ground;
 return{x:p.x-size*(visual?.groundX??groundX??.5),y:p.y-size*(visual?.ground??groundY??(model!=null?.84:.94)),w:size,h:size};
}

function rotatePoint(v,pivot,angle){const x=v.x-pivot[0],y=v.y-pivot[1],c=Math.cos(angle),s=Math.sin(angle);return{x:pivot[0]+x*c-y*s,y:pivot[1]+x*s+y*c}}

function segmentDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],q=clamp01(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1));return Math.hypot(x-a[0]-q*dx,y-a[1]-q*dy)}

function capsuleWeight(x,y,a,b,r){return 1-smoothRange(r*.72,r,segmentDistance(x,y,a,b))}

function polygonWeight(x,y,points){
 if(!points.length)return 0;let inside=false,edge=Infinity;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  edge=Math.min(edge,segmentDistance(x,y,a,b));
 }
 return inside?1:1-smoothRange(0,.018,edge);
}

function solveJoint(chain,newHip,newFoot){
 const[h,k,f]=chain,l1=dist2(h,k),l2=dist2(k,f),dx=newFoot[0]-newHip[0],dy=newFoot[1]-newHip[1],raw=Math.hypot(dx,dy)||1;
 const d=Math.max(Math.abs(l1-l2)+.0001,Math.min(l1+l2-.0001,raw)),nx=dx/raw,ny=dy/raw;
 const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 const oldCross=(f[0]-h[0])*(k[1]-h[1])-(f[1]-h[1])*(k[0]-h[0]),sign=oldCross>=0?1:-1;
 const knee=[newHip[0]+nx*along-ny*height*sign,newHip[1]+ny*along+nx*height*sign];
 return{hip:newHip,knee,foot:[newHip[0]+nx*d,newHip[1]+ny*d],upper:Math.atan2(knee[1]-newHip[1],knee[0]-newHip[0])-Math.atan2(k[1]-h[1],k[0]-h[0]),lower:Math.atan2(newFoot[1]-knee[1],newFoot[0]-knee[0])-Math.atan2(f[1]-k[1],f[0]-k[0])};
}

function boneMap(v,origin,destination,angle){const r=rotatePoint(v,origin,angle);return{x:r.x+destination[0]-origin[0],y:r.y+destination[1]-origin[1]}}

function upperPose(u,pose){
 const rig=UPPER_RIG[u.frame]||UPPER_RIG[0],native=u.frame===1?1:-1;
 const gunKick=pose.recoil*({rifle:.040,shotgun:.070,rail:.085,missile:.023}[u.weapon]||.04)*(1-pose.brace*.3);
 const angle=-native*(pose.aim*.29+gunKick*.50)+native*pose.kneel*.25;
 const shift={x:-native*gunKick,y:pose.kneel*.012-pose.aim*.008};
 const weaponPoint=v=>{const p=rotatePoint(v,rig.grip,angle);return{x:p.x+shift.x,y:p.y+shift.y}};
 const arms=rig.arms.map((chain,i)=>{
  const s=chain[0],w=chain[2];let target=weaponPoint({x:w[0],y:w[1]});
  if(u.frame===2){const a=(i?1:-1)*(pose.aim*.10+pose.kneel*.14);target=rotatePoint({x:w[0],y:w[1]},s,a);target.y+=pose.kneel*.025}
  const sway=pose.walk*Math.sin(pose.cycle*Math.PI)*(i?1:-1)*.012;
  const shoulder=[s[0]+sway,s[1]+pose.recoil*.008+pose.kneel*.015];
  return solveJoint(chain,shoulder,[target.x,target.y]);
 });
 return{rig,angle,shift,weaponPoint,arms};
}

function articulateUpperVertex(u,x,y,pose){
 const v={x,y},upper=pose.upper,rig=upper.rig;if(y>pose.rig.hip+.10)return{x,y,coverage:0};
 let sx=0,sy=0,total=0,coverage=0;
 for(let i=0;i<2;i++){
  const chain=rig.arms[i],joint=upper.arms[i],radius=chain[3];
  const upperWeight=capsuleWeight(x,y,chain[0],chain[1],radius),lowerWeight=capsuleWeight(x,y,chain[1],chain[2],radius*.96);
  const a=boneMap(v,chain[0],joint.hip,joint.upper),b=boneMap(v,chain[1],joint.knee,joint.lower);
  sx+=(a.x-x)*upperWeight+(b.x-x)*lowerWeight;sy+=(a.y-y)*upperWeight+(b.y-y)*lowerWeight;total+=upperWeight+lowerWeight;coverage=Math.max(coverage,upperWeight,lowerWeight);
 }
 let p={x:x+sx/Math.max(1,total),y:y+sy/Math.max(1,total)};
 for(let i=0;i<2;i++){
  const pad=rig.pads[i],d=Math.hypot((x-pad[0])/pad[2],(y-pad[1])/pad[3]),weight=1-smoothRange(.72,1.04,d);
  if(!weight)continue;
  const native=u.frame===1?1:-1,padRecoil=u.frame===2&&u.weapon==='missile'?(pose.podRecoil[i]||0):pose.recoil,angle=(i?1:-1)*(pose.walk*Math.sin(pose.cycle*Math.PI)*.025+padRecoil*.065)+(-native)*pose.aim*(u.frame===2?.105:.045)+pose.kneel*(i?.08:-.08);
  const q=rotatePoint(v,rig.arms[i][0],angle);q.y+=padRecoil*.012+pose.kneel*.02;
  p.x+=(q.x-p.x)*weight;p.y+=(q.y-p.y)*weight;coverage=Math.max(coverage,weight);
 }
 const weaponWeight=u.frame===2?0:polygonWeight(x,y,rig.weapon);
 if(weaponWeight){const q=upper.weaponPoint(v);p.x+=(q.x-p.x)*weaponWeight;p.y+=(q.y-p.y)*weaponWeight;coverage=Math.max(coverage,weaponWeight)}
 return{x:p.x,y:p.y,coverage};
}

function destructionRoot(u,pose){
 if(u.downReason==='pilot')return {x:0,y:pose.kneel*.075,angle:pose.kneel*.12,scale:1-pose.kneel*.1};
 const fall=destructionStyle(u)==='fall'?smoothRange(.42,.96,pose.deathAge):0;
 return{x:fall*.03,y:0,angle:-fall*1.12,scale:1-fall*.12};
}

function deformDestructionVertex(u,x,y,p,pose,legWeight,rightWeight){
 if(pose.kneel<=0)return p;
 const rig=UPPER_RIG[u.frame]||UPPER_RIG[0],drop=pose.kneel*(destructionStyle(u)==='fall'?.105:.205),forward=(u.frame===1?1:-1)*pose.kneel*.025;
 const torso=1-legWeight;let result={x:p.x+forward*torso,y:p.y+drop*torso};
 for(let side=0;side<2;side++){
  const chain=rig.legs[side],rear=side===0?pose.kneel:0,fold=destructionStyle(u)==='fall'?.3:1,newFoot=[chain[2][0]+rear*.20*fold,chain[2][1]-rear*.12*fold],joint=solveJoint(chain,[chain[0][0]+forward,chain[0][1]+drop],newFoot);
  const upper=boneMap({x,y},chain[0],joint.hip,joint.upper),lower=boneMap({x,y},chain[1],joint.knee,joint.lower);
  const knee=smoothRange(chain[1][1]-.035,chain[1][1]+.04,y),foot=smoothRange(chain[2][1]-.075,chain[2][1]-.018,y);
  let q={x:upper.x+(lower.x-upper.x)*knee,y:upper.y+(lower.y-upper.y)*knee};const heel=boneMap({x,y},chain[2],newFoot,rear*.28*fold);q.x+=(heel.x-q.x)*foot;q.y+=(heel.y-q.y)*foot;
  const weight=(side?rightWeight:1-rightWeight)*legWeight;result.x+=(q.x-p.x)*weight;result.y+=(q.y-p.y)*weight;
 }
 return result;
}

function mechSourcePoint(u,x,y,pose){
 const b=unitBounds(u),p=deformMechVertex(u,x,y,pose),root=destructionRoot(u,pose),lx=(p.x-.5)*b.w,ly=(p.y-1)*b.h,c=Math.cos(root.angle),s=Math.sin(root.angle);
 const dx=(lx*c-ly*s)*root.scale+root.x*b.w,dy=(lx*s+ly*c)*root.scale+root.y*b.h;
 return{x:b.x+b.w/2+(spriteFlip(u)?-dx:dx),y:b.y+b.h+dy};
}

function drawDestructionDebris(u,t,pose){
 const age=pose.deathAge-DESTRUCTION.blast;if(age<0&&!reducedMotion)return;
 const q=reducedMotion?1:clamp01(age/.72),fade=reducedMotion?1:smoothRange(0,.13,age),b=unitBounds(u),visual=activeWardenVisual(u);
 const source=visual?artImages[visual.key]:rigidParts[u.frame]?.wreck||artImages[legacyChassis[u.frame]];if(!source)return;
 const im=visual?.modular||visual?.native?paintedSprite(source,visual.key,u.paint):source;
 const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,ground=project(u.vx,0,u.vz);
 ctx.save();ctx.globalAlpha=fade*.7;ctx.fillStyle='#080e13';ctx.beginPath();ctx.ellipse(ground.x,ground.y,scale*.92,scale*.32,0,0,Math.PI*2);ctx.fill();ctx.restore();
 const pieces=[[.33,.24,.39,.33],[.16,.08,.28,.23],[.65,.10,.25,.25],[.2,.67,.25,.28],[.6,.68,.25,.25]];
 const pace=destructionPace(u),blastPose=animationPose(u,(u.deathTime??t-DESTRUCTION.end*pace)+DESTRUCTION.blast*pace);
 for(let i=0;i<pieces.length;i++){
  const r=pieces[i],seed=(u.index+1)*1.73+i*2.399,range=scale*(i===0?.16:.5+(i%3)*.2),end={x:ground.x+Math.cos(seed)*range,y:ground.y+Math.sin(seed)*range*.32};
  const start=mechSourcePoint(u,r[0]+r[2]/2,r[1]+r[3]/2,blastPose),ease=1-(1-q)**2;
  const x=start.x+(end.x-start.x)*ease,y=start.y+(end.y-start.y)*ease-Math.sin(Math.PI*q)*scale*(i===0?.25:.7);
  ctx.save();ctx.globalAlpha=fade*(1-q*.2);ctx.filter=!visual&&rigidParts[u.frame]?'none':'brightness(.4) saturate(.65)';ctx.translate(x,y);ctx.rotate(Math.sin(seed)*1.3*q);const size=.9-q*.16;
  ctx.drawImage(im,r[0]*iw,r[1]*ih,r[2]*iw,r[3]*ih,-r[2]*b.w*size/2,-r[3]*b.h*size/2,r[2]*b.w*size,r[3]*b.h*size);ctx.restore();
 }
}

function renderSurface(w,h){
 if(typeof OffscreenCanvas==='function')return new OffscreenCanvas(w,h);
 if(typeof document.createElement==='function'){const c=document.createElement('canvas');if(c.getContext){c.width=w;c.height=h;return c}}return null;
}

function moduleImage(key){
 if(!moduleImages[key]){
  const image=new Image();moduleImages[key]=image;image.decoding='async';
  image.onload=()=>{
   window.IronVowBillboards.invalidate();
   if(key.startsWith('hostile-')||/^foundry-\d-fit$/.test(key)){
    try{
     const mask=renderSurface(112,112)?.getContext('2d',{willReadFrequently:true});
     if(mask){mask.drawImage(image,0,0,112,112);artMasks[key]=mask.getImageData(0,0,112,112)}
    }catch{}
   }
   if(page==='workshop'&&!battle)drawWorkshopPreview();
   if(page==='hangar'&&!battle)drawFoundryHangar();
    if(battle){
     const portraitKey=$('.combat-target img')?.dataset.visualKey;
     if(key===portraitKey||key===portraitKey+'-paint')refreshTargetPortrait();
    }
  };
  image.src=art(key);
 }
 return window.IronVowBillboards.track(moduleImages[key]);
}

function paintedSprite(image,key,paint){
 if(!paint||!imageReady(image))return image;
 const id=key+paint;
 if(paintedImages.has(id))return paintedImages.get(id);
 const mask=moduleImage(key+'-paint');
 if(!imageReady(mask))return image;
 const width=image.naturalWidth,height=image.naturalHeight;
 try{
  const surface=renderSurface(width,height),g=surface.getContext('2d',{willReadFrequently:true});
  g.drawImage(mask,0,0);const maskData=g.getImageData(0,0,width,height).data;
  g.clearRect(0,0,width,height);g.drawImage(image,0,0);
  const color=g.getImageData(0,0,width,height),pixels=color.data;
  const rgb=[1,3,5].map(offset=>parseInt(paint.slice(offset,offset+2),16));
  for(let i=0;i<pixels.length;i+=4){
   if(maskData[i]<16||!pixels[i+3])continue;
   const light=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722;
   const weight=maskData[i]/255*smoothRange(18,56,light);
   for(let c=0;c<3;c++){
    const tone=Math.min(255,rgb[c]*(light/171)**.86);
    pixels[i+c]+=(tone-pixels[i+c])*weight;
   }
  }
  g.putImageData(color,0,0);
  if(paintedImages.size>=18)paintedImages.delete(paintedImages.keys().next().value);
  paintedImages.set(id,surface);return surface;
 }catch{return image}
}

function foundryPaint(image,key,paint,trim,blend=false){
 if((!paint&&!trim)||!imageReady(image))return image;
 const id=[key,paint,trim?.s,trim?.a,blend].join('/');
 if(paintedImages.has(id))return paintedImages.get(id);
 const mask=moduleImage(key+'-paint');
 if(!imageReady(mask))return image;
 const {naturalWidth:width,naturalHeight:height}=image;
 try{
  const surface=renderSurface(width,height),g=surface.getContext('2d',{willReadFrequently:true});
  g.drawImage(mask,0,0);
  const masks=g.getImageData(0,0,width,height).data;
  g.clearRect(0,0,width,height);g.drawImage(image,0,0);
  const color=g.getImageData(0,0,width,height),pixels=color.data;
  const shades=[paint,trim?.s,trim?.a].map(hex=>hex&&[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16)));
  for(let i=0;i<pixels.length;i+=4){
   if(!pixels[i+3])continue;
   const r=masks[i],g=masks[i+1],b=masks[i+2];
   const layer=blend?(r>=g&&r>=b?0:g>=b?1:2):r>.85*255?0:g>.85*255?1:b>.85*255?2:-1;
   const rgb=shades[layer];if(!rgb)continue;
   const weight=blend?smoothRange(15,225,masks[i+layer]):1;
   if(!weight)continue;
   const light=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722;
   const exposure=(light/(layer===1?98:layer===2?125:181))**.70;
   for(let c=0;c<3;c++)pixels[i+c]+=(Math.min(255,rgb[c]*exposure)-pixels[i+c])*weight;
  }
  g.putImageData(color,0,0);
  if(paintedImages.size>=12)paintedImages.delete(paintedImages.keys().next().value);
  paintedImages.set(id,surface);return surface;
 }catch{return image}
}

function spritePoint(bounds,point=[.5,.36]){
 return {x:bounds.x+point[0]*bounds.w,y:bounds.y+point[1]*bounds.h};
}

function weaponMount(visual,frame,bounds,id,direction,strike=0,firing){
 const side=direction===1?'right':'left';
 const slot=id==='blade'?window.IRON_VOW_RAIJIN_ART?.[side]||arsenal.weapons?.cleaver?.[side]:arsenal.weapons?.[id]?.[side];
 if(!slot)return;
 const impact=slot.impact&&moduleImage(slot.impact.key);
 const striking=strike>=.61&&strike<=.81;
 const shot=slot[firing?.weaponSprite];
 const asset=striking?(imageReady(impact)?slot.impact:slot.extended??slot):
  shot&&imageReady(moduleImage(shot.key))?shot:slot;
 const isMelee=weapon(id).melee;
 const grip=spritePoint(bounds,isMelee?frame.gripL:frame.gripR);
 const forearm=weaponMotion(id)==='piledriver'||id==='tonfa';
 const axis=spritePoint(bounds,isMelee?(forearm?frame.ramL||frame.axisL:frame.axisL):frame.axisR);
 const angle=Math.atan2(axis.y-grip.y,axis.x-grip.x)-Math.atan2(asset.axis[1]-asset.grip[1],asset.axis[0]-asset.grip[0]);
 return {asset,grip,angle,scale:bounds.w/visual.ortho/asset.pixelsPerMetre};
}

function weaponPoint(mount,part){
 const {asset,grip,angle,scale:ratio}=mount,p=asset[part]||asset.muzzle||asset.tip||asset.axis;
 const x=(p[0]-asset.grip[0])*ratio,y=(p[1]-asset.grip[1])*ratio;
 return {x:grip.x+x*Math.cos(angle)-y*Math.sin(angle),y:grip.y+x*Math.sin(angle)+y*Math.cos(angle)};
}

function drawWeaponModule(g,mount){
 if(!mount)return;
 const {asset,grip,angle,scale:ratio}=mount,image=moduleImage(asset.key);
 if(!imageReady(image))return;
 g.save();g.translate(grip.x,grip.y);g.rotate(angle);g.scale(ratio,ratio);
 g.drawImage(image,-asset.grip[0],-asset.grip[1]);g.restore();
}

function shieldMount(u,points,bounds,direction,span){
 const asset=window.IRON_VOW_SHIELD_ART?.[u.shield]?.[direction>0?'right':'left'];
 if(!asset)return null;
 const grip=spritePoint(bounds,points?.gripL||points?.left||[direction>0?.28:.72,.63]);
 return {asset,grip,angle:direction*.10,scale:bounds.w/(span||8)/asset.pixelsPerMetre};
}

function shieldBehind(heading){return Math.sin(heading)>0}

function foundryMount(anchors,bounds,id,direction,progress=0,ortho=8,firing){
 if(!id||!anchors?.gripR||!anchors?.gripL)return null;
 // Raijin was rendered in the Foundry's own model scale. Other weapons share the Site arsenal scale.
 return weaponMount({ortho:id==='blade'?ortho*1.4/3.2:ortho},anchors,bounds,id,direction,progress,firing);
}

function buildRigidParts(frame){
 if(rigidParts[frame])return;
 const key=FRAMES[frame].name.toLowerCase(),original=artImages[key],clean=artImages[key+'-base'];if(!decodedArt.has(key)||!decodedArt.has(key+'-base'))return;
 const size=W<760?256:512,source=renderSurface(size,size),base=renderSurface(size,size);if(!source||!base)return;
 const sg=source.getContext('2d',{willReadFrequently:true}),bg=base.getContext('2d',{willReadFrequently:true});sg.drawImage(original,0,0,size,size);bg.drawImage(clean,0,0,size,size);
 const src=sg.getImageData(0,0,size,size),dst=bg.getImageData(0,0,size,size),labels=new Int8Array(size*size);labels.fill(-1);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const index=y*size+x,o=index*4;if(src.data[o+3]<12)continue;
  const label=partLabel(x/size,y/size,frame);if(label<0)continue;
  const difference=Math.max(Math.abs(src.data[o]-dst.data[o]),Math.abs(src.data[o+1]-dst.data[o+1]),Math.abs(src.data[o+2]-dst.data[o+2]));
  if(src.data[o+3]-dst.data[o+3]>24||difference>24)labels[index]=label;
 }
 const parts=[],counts=[],removed=new Uint8Array(size*size),masks=Array.from({length:7},()=>new Uint8Array(size*size));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const label=labels[y*size+x];if(label<0)continue;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const a=x+dx,b=y+dy;if(a>=0&&a<size&&b>=0&&b<size)masks[label][b*size+a]=1}}
 for(let label=0;label<7;label++){
  const c=renderSurface(size,size),g=c.getContext('2d'),pixels=g.createImageData(size,size);let count=0;
  for(let index=0;index<size*size;index++){
   if(!masks[label][index])continue;const o=index*4;if(src.data[o+3]<8)continue;pixels.data[o]=src.data[o];pixels.data[o+1]=src.data[o+1];pixels.data[o+2]=src.data[o+2];pixels.data[o+3]=src.data[o+3];removed[index]=1;count++;
  }
  g.putImageData(pixels,0,0);parts.push(c);counts.push(count);
 }
 const body=renderSurface(size,size),bodyContext=body.getContext('2d'),bodyPixels=bodyContext.createImageData(size,size);for(let i=0;i<size*size;i++){const data=removed[i]?dst.data:src.data;for(let c=0;c<4;c++)bodyPixels.data[i*4+c]=data[i*4+c]}bodyContext.putImageData(bodyPixels,0,0);
 const wreck=renderSurface(size,size),wg=wreck.getContext('2d');wg.filter='brightness(.4) saturate(.55)';wg.drawImage(original,0,0,size,size);
 if(!artMasks[frame])artMasks[frame]=src;
 rigidParts[frame]={parts,wreck,base:body,counts};
}

function mapTorsoPoint(u,p,pose){
 const native=u.frame===1?1:-1,recoilScale=({rifle:.025,shotgun:.047,missile:.021,rail:.062})[weaponMotion(u.weapon)]||.025;
 const kick=pose.recoil*recoilScale*.32*(1-pose.brace*.4),angle=-native*kick*.9+pose.impact*pose.impactX*.033+pose.walk*pose.dx*Math.sin(Math.PI*pose.phase)*.045;
 const q=rotatePoint(p,[pose.rig.split,pose.rig.hip],angle);q.x+=-native*kick+pose.impact*pose.impactX*.025;
 q.y+=pose.idle+pose.brace*.027+pose.land*.013*pose.rig.mass+pose.impact*pose.impactY*.018-Math.sin(Math.PI*pose.phase)**2*.008*pose.walk;
 if(pose.kneel){q.x+=(u.frame===1?1:-1)*pose.kneel*.025;q.y+=pose.kneel*(destructionStyle(u)==='fall'?.105:.205)}return q;
}

function rigidPartPoint(u,index,v,pose){
 const upper=pose.upper,rig=upper.rig;let q;
 if(index===0)q=upper.weaponPoint(v);
 else if(index===1||index===2){
  const i=index-1,native=u.frame===1?1:-1,padRecoil=u.frame===2&&u.weapon==='missile'?(pose.podRecoil[i]||0):pose.recoil,angle=(i?1:-1)*(pose.walk*Math.sin(pose.cycle*Math.PI)*.025+padRecoil*.065)-native*pose.aim*(u.frame===2?.105:.045)+pose.kneel*(i?.08:-.08);
  q=rotatePoint(v,rig.arms[i][0],angle);q.y+=padRecoil*.012+pose.kneel*.02;
 }else{const i=Math.floor((index-3)/2),lower=(index-3)%2,chain=rig.arms[i],joint=upper.arms[i];q=lower?boneMap(v,chain[1],joint.knee,joint.lower):boneMap(v,chain[0],joint.hip,joint.upper)}
 return mapTorsoPoint(u,q,pose);
}

function drawRigidUpper(u,w,h,pose){
 const cache=rigidParts[u.frame];if(!cache)return;
 for(const index of[3,5,4,6,1,2,0]){
  if(!cache.counts[index])continue;
  const a=rigidPartPoint(u,index,{x:0,y:0},pose),b=rigidPartPoint(u,index,{x:1,y:0},pose),c=rigidPartPoint(u,index,{x:0,y:1},pose),im=cache.parts[index],size=im.width;
  ctx.save();ctx.filter='none';
  ctx.transform((b.x-a.x)*w/size,(b.y-a.y)*h/size,(c.x-a.x)*w/size,(c.y-a.y)*h/size,(a.x-.5)*w,(a.y-1)*h);ctx.drawImage(im,0,0);ctx.restore();
 }
}

function deformMechVertex(u,x,y,pose){
 const{rig}=pose,upper=pose.baseOnly||activeWardenVisual(u)?{x,y,coverage:0}:articulateUpperVertex(u,x,y,pose),leg=smoothRange(rig.hip-.035,rig.hip+.065,y)*(1-upper.coverage),torso=1-leg;
 const right=smoothRange(rig.split-.045,rig.split+.045,x),left=1-right;
 let px=upper.x,py=upper.y;
 const nativeDirection=pose.nativeDirection,recoilScale=({rifle:.025,shotgun:.047,missile:.021,rail:.062})[weaponMotion(u.weapon)]||.025;
 const kick=pose.recoil*recoilScale*.32*(1-pose.brace*.4),hipX=rig.split,hipY=rig.hip;
 const tilt=(-nativeDirection*kick*.9)+pose.impact*pose.impactX*.033+pose.walk*pose.dx*Math.sin(Math.PI*pose.phase)*.045;
 const rx=px-hipX,ry=py-hipY;
 px+=((rx*Math.cos(tilt)-ry*Math.sin(tilt))-rx)*torso;
 py+=((rx*Math.sin(tilt)+ry*Math.cos(tilt))-ry)*torso;
 px+=(-nativeDirection*kick+pose.impact*pose.impactX*.025)*torso;
 py+=(pose.idle+pose.brace*.027+pose.land*.013*MECH_MOTION[u.frame].mass+pose.impact*pose.impactY*.018)*torso;
 if(pose.walk){
  for(let side=0;side<2;side++){
   const weight=side?right:left,phase=((pose.cycle+side)%2+2)%2,swing=phase<1;
   const stride=swing?-.5+smoothRange(0,1,phase):1.5-phase;
   const lift=swing?Math.sin(Math.PI*phase):0,foot=smoothRange(rig.hip+.015,rig.foot[side],y);
   const knee=Math.sin(Math.PI*clamp01((y-rig.hip)/(rig.foot[side]-rig.hip)));
   px+=weight*leg*pose.walk*(pose.dx*stride*.62*foot+(side?1:-1)*lift*.012*knee);
   py+=weight*leg*pose.walk*(pose.dy*stride*.62*foot-lift*.064*foot-lift*.01*knee);
  }
  py-=Math.sin(Math.PI*pose.phase)**2*.008*torso*pose.walk;
 }
 if(pose.primeProgress>0&&!activeWardenVisual(u)){
  const lead=nativeDirection>0?right:left,foot=smoothRange(rig.hip,1,y);
  px+=nativeDirection*(lead*leg*foot*.10+torso*.025)*smoothRange(.08,.85,pose.primeProgress);
  py-=lead*leg*foot*.065*Math.sin(Math.PI*smoothRange(.08,.85,pose.primeProgress));
 }
 if(pose.brace){const knee=Math.sin(Math.PI*clamp01((y-rig.hip)/(1-rig.hip)));px+=(right-left)*.012*knee*leg*pose.brace}
 if(u.hitPart==='legs')py+=pose.impact*.035*leg*Math.sin(Math.PI*clamp01((y-rig.hip)/(1-rig.hip)));
 return pose.death>0?deformDestructionVertex(u,x,y,{x:px,y:py},pose,leg,right):{x:px,y:py};
}

function drawMeshTriangle(im,source,dest,renderWidth=im.naturalWidth||im.width,renderHeight=im.naturalHeight||im.height,g=ctx){
 const [a,b,c]=source,[p,q,r]=dest,sx=b.x-a.x,sy=b.y-a.y,tx=c.x-a.x,ty=c.y-a.y,det=sx*ty-tx*sy;
 if(Math.abs(det)<1e-8)return;
 const ax=((q.x-p.x)*ty-(r.x-p.x)*sy)/det,bx=((q.y-p.y)*ty-(r.y-p.y)*sy)/det;
 const cx=(sx*(r.x-p.x)-tx*(q.x-p.x))/det,dx=(sx*(r.y-p.y)-tx*(q.y-p.y))/det;
 const center={x:(p.x+q.x+r.x)/3,y:(p.y+q.y+r.y)/3};
 g.save();g.beginPath();for(let i=0;i<3;i++){const v=dest[i],vx=v.x-center.x,vy=v.y-center.y,len=Math.hypot(vx,vy)||1;const x=v.x+vx/len*.24,y=v.y+vy/len*.24;i?g.lineTo(x,y):g.moveTo(x,y)}g.closePath();g.clip();
 g.transform(ax,bx,cx,dx,p.x-ax*a.x-cx*a.y,p.y-bx*a.x-dx*a.y);g.drawImage(im,0,0,renderWidth,renderHeight);g.restore();
}

function drawArticulatedMech(im,u,w,h,pose,upperTexture=null,g=ctx){
 const upperActive=pose.aim>.001||Math.abs(pose.recoil)>.008||pose.death>0,columns=pose.baseOnly?(u.alive?(pose.walk>.001?(w>210?9:6):3):6):upperActive?(w>210?13:10):(w>210?9:6),rows=pose.baseOnly?(u.alive?(pose.walk>.001?(w>210?13:10):10):14):upperActive?(w>210?18:15):(w>210?13:10),iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height;
 const source=[],dest=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
  const x=i/columns,y=j/rows,v=deformMechVertex(u,x,y,pose);source.push({x:x*iw,y:y*ih});dest.push({x:(v.x-.5)*w,y:(v.y-1)*h});
 }
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
  const a=j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1,texture=upperTexture&&(j+.5)/rows<pose.rig.hip+.08?upperTexture:im;
  drawMeshTriangle(texture,[source[a],source[b],source[d]],[dest[a],dest[b],dest[d]],iw,ih,g);
  drawMeshTriangle(texture,[source[a],source[d],source[c]],[dest[a],dest[d],dest[c]],iw,ih,g);
 }
}

function recoilingBounds(u,b,t){
 if(reducedMotion||!u.alive||(u.brace&&u.hp.legs>0&&upgradedWardenTravel(travelAtlas(u))))return b;
 if(FRAMES[u.frame]?.native&&u.attack?.primeDuration){
  const pose=animationPose(u,t,activeWardenVisual(u)),q=pose.primeProgress;
  const progress=q*q*(3-2*q);
  b={...b,x:b.x+unitFacing(u)*scale*.19*progress,y:b.y-scale*.025*progress};
 }
 if(!u.hitVector)return b;
 const age=t-(u.hitTime??-2);
 if(age<0||age>.55)return b;
 const kick=(1-Math.exp(-age*90))*Math.exp(-age*10)*Math.cos(age*16)*scale*.26;
 return{...b,x:b.x+kick*u.hitVector.x,y:b.y+kick*u.hitVector.y*.55};
}

function vehicleKey(u,wreck=false){return (wreck?'wreck-':'hostile-')+u.kind+'-'+(unitFacing(u)>0?'right':'left')}

function vehicleBounds(u,t){
 const spec=VEHICLES[u.kind];
 const lift=spec.altitude*(u.alive?1:reducedMotion?0:1-smoothRange(0,spec.wreckAt,vehicleDeathAge(u,t)));
 const bob=lift>0&&!reducedMotion&&u.alive?Math.sin(t*6+u.index)*.045:0;
 const p=project(u.vx,lift+bob,u.vz),size=scale*3.9192;
 const recoil=reducedMotion||!u.alive?0:dampedImpulse(t-(u.fireTime??-100),36,15)*unitFacing(u)*scale*.11;
 return recoilingBounds(u,{x:p.x-size*.5-recoil,y:p.y-size*.72,w:size,h:size},t);
}

function vehicleAttachment(u,part,t){
 const view=travelVisual(u,t);
 if(view)return spritePoint(view.bounds,view.points[part]||view.points.body);
 const spec=VEHICLES[u.kind],source=part.startsWith('muzzle')?spec.muzzle:spec.center;
 return spritePoint(vehicleBounds(u,t),[unitFacing(u)>0?1-source[0]:source[0],source[1]]);
}

function travelAtlas(u){
 if(window.IronVowScene?.isLive(u))return null;
 if(!u.kind&&u.frame===0&&u.team==='ally'&&wardenUpgrade)return wardenUpgrade.travel;
 const f=FRAMES[u.frame];
 if(f?.rig==='bastion')return null;
 return window.IRON_VOW_TRAVEL?.[u.kind||(f?.foundry!=null?'foundry-'+f.foundry:nativeHullKey(u.frame,u)||f?.name.toLowerCase())];
}

function upgradedWardenTravel(atlas){return Boolean(atlas&&atlas===wardenUpgrade?.travel)}

function wardenStrikeTexture(u,atlas,heading){
 const key=atlas.strikes?.keys[heading];
 if(!key)return null;
 return {key,image:attackMotionImage({key},u.paint)};
}

function travelDetail(u,atlas,heading){
 const key=atlas?.detail?.keys[heading];
 if(!key)return null;
 if(u.paint||u.trim)moduleImage(key+'-paint');
 return {key,image:motionImage({key})};
}

function preloadTravel(u){
 if(window.IronVowScene?.isLive(u))return null;
 if(equippedShield(u))for(const slot of Object.values(window.IRON_VOW_SHIELD_ART?.[u.shield]??{}))moduleImage(slot.key);
 const atlas=travelAtlas(u);
 if(!atlas)return null;
 const detail=travelDetail(u,atlas.grounded||atlas,headingIndex(displayedHeading(u)));
 if(detail)return detail.image;
 if(u.paint||u.trim)moduleImage(atlas.key+'-paint');
 return motionImage(atlas);
}

function travelVisual(u,t){
 if(!u.alive||u.headingOverride!==undefined)return null;
 const atlas=travelAtlas(u);
 if(!atlas)return null;
 const angle=displayedHeading(u),direction=Math.sin(angle)<0?-1:1;
 const heading=headingIndex(angle);
 const phase=u.motion?clamp01((t-u.motion.start)/u.motion.duration):0;
 const detail=travelDetail(u,atlas.grounded||atlas,heading);
 if(atlas.grounded&&imageReady(detail?.image)){
  const data=atlas.grounded,{cell,columns}=data.detail;
  const motion=u.motion,segment=motion?.segment;
  let row=u.attack&&u.attack.kind!=='missile'?1:0,x=u.vx,z=u.vz;
  if(segment&&!reducedMotion){
   const distance=segment.index+fieldStepProgress(phase,segment);
   const pace=segment.paces.find(step=>distance<=step.to)??segment.paces.at(-1);
   const frame=Math.round(clamp01((distance-pace.from)/(pace.to-pace.from))*(data.samples-1));
   row=data.walk[pace.kind]+frame;
   // Draw at the sampled root distance so the planted sole stays fixed.
   const q=pace.from+(pace.to-pace.from)*frame/(data.samples-1)-segment.index;
   x=motion.fromX+(motion.toX-motion.fromX)*q;
   z=motion.fromZ+(motion.toZ-motion.fromZ)*q;
  }else if(data.strike&&u.attack?.native?.clip==='strike'&&!reducedMotion){
   const progress=nativeAttackProgress(u.attack,t),levels=data.strike.levels;
   const frame=levels?levels.findIndex((level,index)=>index===levels.length-1||progress<=(level+levels[index+1])*.5):
    Math.round(progress*(data.strike.samples-1));
   row=data.strike.first+frame;
  }
  const p=project(x,0,z),size=scale*groundedTravelSpan(u,data);
  const bounds=recoilingBounds(u,{x:p.x-size*.5,y:p.y-size*data.ground,w:size,h:size},t);
  const source={key:detail.key,cell,x:row%columns,y:Math.floor(row/columns),idleX:0};
  const strike=u.attack&&ATTACK_PROFILES[u.attack.kind].melee?animationPose(u,t):null;
  return {atlas,image:detail.image,source,bounds,row,heading,points:data.points[row][heading],direction,strike,grounded:true};
 }
 if(u.frame===3)return null;
 const gait=u.motion?(u.motion.stepBeats!=null?fieldStepProgress(phase,u.motion.segment):
  FRAMES[u.frame]?.native?phase:((u.motion.gaitBase+phase)/2)%1):0;
 const prime=u.attack?.primeDuration?clamp01((t-u.attack.start)/u.attack.primeDuration):0;
 const stockRow=u.kind?0:u.motion&&!reducedMotion?1+Math.min(5,Math.floor(gait*6)):
  prime>0&&prime<1?1+Math.min(5,Math.floor(prime*6)):u.attack?7:0;
 const revised=upgradedWardenTravel(atlas);
 const pose=revised?animationPose(u,t):null;
 const strike=u.attack&&ATTACK_PROFILES[u.attack.kind].melee?(pose||animationPose(u,t)):null;
 let row=stockRow;
 if(revised){
  const special=atlas.special;
  if(u.motion&&!reducedMotion){
   const segment=u.motion.segment??{index:0,length:1,paces:wardenPaces(1,u.motion.gaitBase)};
   const distance=segment.index+fieldStepProgress(phase,segment);
   const pace=segment.paces.find(step=>distance<=step.to)??segment.paces.at(-1);
   const progress=(distance-pace.from)/(pace.to-pace.from);
   row=atlas.walk[pace.kind]+Math.round(clamp01(progress)*(atlas.samples-1));
  }else if(u.brace&&u.hp.legs>0){
   const recoil=Math.abs(pose.recoil);
   const step=Math.round(pose.brace*atlas.braceSamples);
   row=pose.brace<1?(step?special.brace+step-1:0):
    recoil>.08?special.braceKick+Math.min(2,Math.floor(recoil*3)):
    pose.aim>.12?special.braceAim+Math.min(2,Math.floor(pose.aim*3)):special.brace+atlas.braceSamples-1;
  }else{
   const recoil=Math.abs(pose.recoil);
   row=recoil>.08?special.kick+Math.min(2,Math.floor(recoil*3)):
    pose.aim>.12?special.aim+Math.min(2,Math.floor(pose.aim*3)):0;
  }
 }
 const high=!atlas.grounded&&imageReady(detail?.image);
 let image=high?detail.image:motionImage(atlas);
 if(!imageReady(image))return null;
 const cell=high?atlas.detail.cell:atlas.cell;
 const index=4*row+heading;
 let source=high?{key:detail.key,cell,x:row%atlas.detail.columns,y:Math.floor(row/atlas.detail.columns),idleX:0}:
  {key:atlas.key,cell,x:revised?index%atlas.columns:heading,y:revised?Math.floor(index/atlas.columns):row,idleX:heading};
 let points=atlas.points[row][heading];
 const clip=revised&&!u.motion&&atlas.strikes&&wardenStrikeClip(u,strike);
 let strikeFrame=null;
 if(clip){
  const frames=atlas.strikes,texture=wardenStrikeTexture(u,atlas,heading);
  if(imageReady(texture?.image)){
   const level=wardenStrikeLevel(u,strike);
   const step=frames.levels.reduce((best,value,i)=>Math.abs(value-level)<Math.abs(frames.levels[best]-level)?i:best,0);
   strikeFrame=frames.clips[clip]+step;
   image=texture.image;
   source={key:texture.key,cell:frames.cell,x:strikeFrame%frames.columns,y:Math.floor(strikeFrame/frames.columns),idleX:0};
   points=frames.points[strikeFrame][heading];
  }
 }
 let bounds;
 if(u.kind)bounds=vehicleBounds(u,t);
 else{
  const ground=project(u.vx,0,u.vz),size=scale*atlas.span/3.65;
  const stride=revised?0:scale*(prime*.15+(strike?.strikeProgress?Math.sin(strike.strikeProgress*Math.PI)*.22:0));
  bounds={x:ground.x-size*.5+Math.sin(angle)*stride,y:ground.y-size*atlas.ground+Math.cos(angle)*stride*.44,w:size,h:size};
  bounds=recoilingBounds(u,bounds,t);
 }
 return {atlas,image,source,bounds,row,heading,points,direction,strike,strikeFrame};
}

function travelMount(view,u,id,progress=0,t=clock){
 const mount=foundryMount(view.points,view.bounds,id,view.direction,progress,
  foundryModel(u.frame)!=null?view.atlas.span/1.4:view.atlas.span,id===u.weapon?firingPose(u,t):undefined);
 if(mount&&view.strike&&id===u.attack.kind&&!upgradedWardenTravel(view.atlas))mount.angle+=view.direction*(.9-1.85*smoothRange(.36,.78,progress));
 return mount;
}

function partTintKey(key,declared){
 return declared??window.IRON_VOW_PART_MASKS?.[key];
}

function partTintSource(key,source,bounds,draw,cell=0,sx=0,sy=0,declared){
 const partMask=partTintKey(key,declared);
 if(!partMask||!source)return null;
 const width=source.naturalWidth||source.width,height=source.naturalHeight||source.height;
 return {key:partMask,width,height,sx,sy,cell,w:cell||width,h:cell||height,bounds,draw};
}

function tintLayer(name,w,h){
 let surface=partTintLayers[name];
 if(!surface||surface.width<w||surface.height<h)
  surface=partTintLayers[name]=renderSurface(Math.max(w,surface?.width??0),Math.max(h,surface?.height??0));
 return surface;
}

function tintNoise(){
 if(partTintLayers.noise)return partTintLayers.noise;
 const surface=renderSurface(160,160),g=surface.getContext('2d');
 let seed=11;const rand=()=>(seed=seed*16807%2147483647)/2147483647;
 for(let i=0;i<60;i++){
  const x=rand()*160,y=rand()*160,r=5+rand()*22,a=.18+rand()*.42;
  for(const dx of [-160,0,160])for(const dy of [-160,0,160]){
   const gr=g.createRadialGradient(x+dx,y+dy,0,x+dx,y+dy,r);
   gr.addColorStop(0,`rgba(9,6,4,${a})`);gr.addColorStop(1,'rgba(9,6,4,0)');
   g.fillStyle=gr;g.fillRect(x+dx-r,y+dy-r,r*2,r*2);
  }
 }
 return partTintLayers.noise=surface;
}

function tintMaskCell(mask,image,part){
 const {key,w,h,sx,sy}=mask,id=PART_TINTS.findIndex(([name])=>name===part)+1;
 const cacheKey=[key,w,h,sx,sy,id].join('/');
 if(partTintCells.has(cacheKey))return partTintCells.get(cacheKey);
 const surface=renderSurface(w,h),g=surface.getContext('2d',{willReadFrequently:true});
 g.drawImage(image,sx,sy,w,h,0,0,w,h);
 const pixels=g.getImageData(0,0,w,h),data=pixels.data;
 for(let i=0;i<data.length;i+=4){
  const color=(data[i]===255?1:0)|(data[i+1]===255?2:0)|(data[i+2]===255?4:0);
  if(color!==id)data[i+3]=0;
 }
 g.putImageData(pixels,0,0);
 if(partTintCells.size>=32)partTintCells.delete(partTintCells.keys().next().value);
 partTintCells.set(cacheKey,surface);
 return surface;
}

function tintPartRegion(site,sites,w,h){
 let polygon=[[0,0],[w,0],[w,h],[0,h]];
 for(const other of sites){
  if(other===site)continue;
  const nx=2*(other.x-site.x),ny=2*(other.y-site.y);
  const limit=other.x**2+other.y**2-other.radius**2-(site.x**2+site.y**2-site.radius**2),next=[];
  for(let i=0;i<polygon.length;i++){
   const p=polygon[i],q=polygon[(i+1)%polygon.length];
   const a=nx*p[0]+ny*p[1]-limit,b=nx*q[0]+ny*q[1]-limit;
   if(a<=0)next.push(p);
   if((a<=0)!==(b<=0)){const t=a/(a-b);next.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t])}
  }
  polygon=next;if(polygon.length<3)return [];
 }
 return polygon;
}

function drawPartTints(u,t,paint,anchor,scorch=true,mask=null){
 if(u.kind||(!u.alive&&!TINT_DEBUG))return;
 const age=t-(u.hitTime??-Infinity),hits=age>=0&&age<.72?u.hitParts??[u.hitPart]:null;
 const jobs=[];
 for(const [part] of PART_TINTS)if(u.max[part]){
  const health=clamp01(u.hp[part]/u.max[part]),flash=hits?.includes(part);
  if(TINT_DEBUG||(scorch&&health<.5))jobs.push({part,health,flash:false});
  if(!TINT_DEBUG&&flash)jobs.push({part,health,flash:true});
 }
 if(!jobs.length||typeof ctx.getTransform!=='function')return;
 const m=ctx.getTransform();
 if(!m)return;
 const unit=scale*Math.hypot(m.a,m.b),image=mask&&motionRaster(mask.key);
 const exact=imageReady(image)&&mask.width===image.naturalWidth&&mask.height===image.naturalHeight&&
  mask.sx>=0&&mask.sy>=0&&mask.sx+mask.w<=mask.width&&mask.sy+mask.h<=mask.height;
 const project=({x,y})=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f});
 const sites=exact?[]:PART_TINTS.flatMap(([part,radius])=>{
  const p=u.max[part]&&anchor(part);
  return p?[{part,radius:radius*unit,...project(p)}]:[];
 });
 const b=exact&&mask.bounds;
 const points=b?[project(b),project({x:b.x+b.w,y:b.y}),project({x:b.x,y:b.y+b.h}),project({x:b.x+b.w,y:b.y+b.h})]:sites;
 if(!points.length)return;
 const pad=exact?2:unit;
 const x=Math.max(0,Math.floor(Math.min(...points.map(p=>p.x))-pad));
 const y=Math.max(0,Math.floor(Math.min(...points.map(p=>p.y))-pad));
 const w=Math.min(ctx.canvas.width,Math.ceil(Math.max(...points.map(p=>p.x))+pad))-x;
 const h=Math.min(ctx.canvas.height,Math.ceil(Math.max(...points.map(p=>p.y))+pad))-y;
 if(w<4||h<4)return;
 const sprite=tintLayer('sprite',w,h),layer=tintLayer('part',w,h),regionLayer=exact?tintLayer('region',w,h):null;
 if(!sprite||!layer||(exact&&!regionLayer))return;
 const a=sprite.getContext('2d'),g=layer.getContext('2d'),main=ctx,alpha=main.globalAlpha;
 const transform=target=>target.setTransform(m.a,m.b,m.c,m.d,m.e-x,m.f-y);
 a.save();a.clearRect(0,0,w,h);transform(a);
 a.imageSmoothingEnabled=main.imageSmoothingEnabled;
 a.imageSmoothingQuality=main.imageSmoothingQuality;
 ctx=a;try{paint()}finally{ctx=main;a.restore()}
 const local=sites.map(p=>({...p,x:p.x-x,y:p.y-y}));
 main.save();
 try{
  main.setTransform(1,0,0,1,0,0);
  // Do not increase the opacity of the sprite's antialiased silhouette.
  main.globalCompositeOperation='source-atop';
  for(const {part,health,flash} of jobs){
   const cell=exact?tintMaskCell(mask,image,part):null;
   const site=local.find(p=>p.part===part),region=site?tintPartRegion(site,local,w,h):[];
   if(!cell&&!region.length)continue;
   if(cell){
    const r=regionLayer.getContext('2d');
    r.save();r.clearRect(0,0,w,h);transform(r);r.imageSmoothingEnabled=false;
    try{mask.draw(r,cell)}finally{r.restore()}
   }
   g.save();
   try{
    const applyRegion=()=>{
     g.globalCompositeOperation='destination-in';g.globalAlpha=1;
     if(cell)g.drawImage(regionLayer,0,0,w,h,0,0,w,h);
     else{
      g.beginPath();g.moveTo(...region[0]);
      for(const p of region.slice(1))g.lineTo(...p);
      g.closePath();g.fill();
     }
    };
    g.globalCompositeOperation='copy';g.drawImage(sprite,0,0,w,h,0,0,w,h);
    applyRegion();
    const burn=1-health*2;
    if(TINT_DEBUG){
     g.globalCompositeOperation='source-atop';g.fillStyle=TINT_DEBUG[part];g.fillRect(0,0,w,h);
    }else{
     if(flash){
      g.globalCompositeOperation='screen';g.fillStyle='#ffe2b8';g.globalAlpha=.4;g.fillRect(0,0,w,h);
     }else{
      g.globalCompositeOperation='saturation';g.fillStyle='#808080';g.globalAlpha=.55+.35*burn;g.fillRect(0,0,w,h);
      g.globalCompositeOperation='multiply';g.fillStyle='#4a423a';g.globalAlpha=1;g.fillRect(0,0,w,h);
     }
     g.globalAlpha=1;g.globalCompositeOperation='destination-in';g.drawImage(sprite,0,0,w,h,0,0,w,h);
     applyRegion();
     if(!flash){
      g.globalCompositeOperation='source-atop';g.globalAlpha=.3+.4*burn;
      g.fillStyle=g.createPattern(tintNoise(),'repeat');
      const offset=(u.index||0)*41;g.translate(-offset,-offset*.6);g.fillRect(offset,offset*.6,w,h);
     }
    }
    main.globalAlpha=alpha*(TINT_DEBUG?1:flash?.85*(1-age/.72):.55+.4*burn);
    main.drawImage(layer,0,0,w,h,x,y,w,h);
   }finally{g.restore()}
  }
 }finally{main.restore()}
}

function drawTravel(u,t,view){
 const {atlas,image,source,bounds,heading}=view,p=project(u.vx,0,u.vz),{cell}=source;
 const foundry=foundryModel(u.frame)!=null;
 const body=foundry?foundryPaint(image,atlas.key,u.paint,u.trim):paintedSprite(image,source.key,u.paint);
 ctx.save();ctx.fillStyle='#060d148c';ctx.beginPath();
 ctx.ellipse(p.x,p.y,scale*(u.kind||foundryModel(u.frame)===5?.76:.62),scale*.22,0,0,Math.PI*2);ctx.fill();
 if(view.grounded){
  const contacts=view.points.planted?[view.points.planted]:[view.points.footL,view.points.footR];
  ctx.fillStyle='#060d149e';
  for(const anchor of contacts){
   const foot=spritePoint(bounds,anchor);
   ctx.beginPath();ctx.ellipse(foot.x,foot.y,scale*.24,scale*.09,0,0,Math.PI*2);ctx.fill();
  }
 }
 const painted=upgradedWardenTravel(atlas);
 const behind=painted&&(heading===1||heading===2);
 const shield=activeShield(u)&&shieldMount(u,view.points,bounds,view.direction,atlas.span);
 const farShield=shieldBehind(FIELD_HEADINGS[heading]);
 const melee=!atlas.grounded?.strike&&u.hp.left>0&&(view.strike||(foundry&&u.melee&&foundryModel(u.frame)===4&&!u.attack))?
  travelMount(view,u,view.strike?u.attack.kind:u.melee,view.strike?.strikeProgress):null;
 if(behind&&u.hp.right>0)drawWeaponModule(ctx,travelMount(view,u,u.weapon,0,t));
 if(behind&&melee)drawWeaponModule(ctx,melee);
 if(farShield)drawWeaponModule(ctx,shield);
 const paint=()=>ctx.drawImage(body,source.x*cell,source.y*cell,cell,cell,bounds.x,bounds.y,bounds.w,bounds.h);
 const mask=partTintSource(source.key,image,bounds,(g,part)=>g.drawImage(part,bounds.x,bounds.y,bounds.w,bounds.h),
  cell,source.x*cell,source.y*cell,source.key===atlas.key?atlas.partMask:undefined);
 paint();
 drawPartTints(u,t,paint,part=>view.points[part]&&spritePoint(bounds,view.points[part]),true,mask);
 ctx.restore();
 if(!behind&&!u.kind&&u.hp.right>0&&!(u.frame===2&&u.weapon==='missile')){
  drawWeaponModule(ctx,travelMount(view,u,u.weapon,0,t));
 }
 if(!behind&&melee)drawWeaponModule(ctx,melee);
 if(!farShield)drawWeaponModule(ctx,shield);
 if(!u.kind&&u.brace){ctx.strokeStyle='#8fc6d29c';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(p.x,p.y,scale*.8,scale*.28,0,0,Math.PI*2);ctx.stroke()}
 if(u.hp.body/u.max.body<.4)drawMechSmoke(u,t);
 drawUnitReadout(u,u.kind?1.5+VEHICLES[u.kind].altitude:2.30);
}

function drawVehicle(u,t,close=false){
 const wreck=vehicleWreckVisible(u,t)?moduleImage(vehicleKey(u,true)):null;
 const wreckReady=imageReady(wreck),image=wreckReady?wreck:moduleImage(vehicleKey(u));
 const bounds=vehicleBounds(u,t),spec=VEHICLES[u.kind];
 const p=project(u.vx,0,u.vz),altitude=spec.altitude;
 ctx.save();
 ctx.fillStyle=u.alive?(altitude?'#06101670':'#050c12a0'):'#0a1117a8';
 ctx.beginPath();ctx.ellipse(p.x,p.y,scale*(altitude?.78:.66),scale*(altitude?.24:.23),0,0,Math.PI*2);ctx.fill();
 if(imageReady(image)){
  if(!u.alive&&!wreckReady){
   const pad=Math.max(bounds.w,bounds.h)*.45;
   (()=>{
    ctx.save();
    try{
     if(altitude&&!reducedMotion&&!vehicleWreckVisible(u,t)){
      const x=bounds.x+bounds.w*.5,y=bounds.y+bounds.h*.65;
      ctx.translate(x,y);ctx.rotate(unitFacing(u)*.36*smoothRange(0,spec.wreckAt,vehicleDeathAge(u,t)));ctx.translate(-x,-y);
     }
     ctx.drawImage(image,bounds.x,bounds.y,bounds.w,bounds.h);
    }finally{ctx.restore()}
   })();
  }else ctx.drawImage(image,bounds.x,bounds.y,bounds.w,bounds.h);
 }
 ctx.restore();
 if(!u.alive||u.hp.body/u.max.body<.35)drawMechSmoke(u,t,!u.alive);
 if(!close&&u.alive)drawUnitReadout(u,1.5+altitude);
}

function vanguardArtFrame(u,pose,atlas){
 if(!u.alive)return u.downReason==='pilot'?atlas.pilotDown:atlas.wreck;
 const clips=atlas.clips;
 if(pose.strikeKind){
  if(pose.primePhase==='step')return clips.prime[Math.round(pose.primeProgress*(clips.prime.length-1))];
  const levels=atlas.levels.strike;
  return clips.strike[levels.findIndex((level,i)=>i===levels.length-1||pose.strikeProgress<=(level+levels[i+1])/2)];
 }
 if(u.attack&&u.hp.right>0){
  const age=pose.time-(u.attack.fireAt??Infinity);
  if(age>=0&&age<.33&&!reducedMotion)return clips.kick[Math.min(clips.kick.length-1,Math.floor(age/.11))];
  if(pose.aim>.02)return clips.aim[Math.round(pose.aim*(clips.aim.length-1))];
 }
 return u.motion&&!reducedMotion?Math.floor(pose.cycle*8)%8:atlas.idle;
}

function bulwarkArtFrame(u,pose,atlas){
 if(!u.alive)return u.downReason==='pilot'?atlas.pilotDown:atlas.wreck;
 const attack=u.attack,profile=ATTACK_PROFILES[attack?.kind],clip=atlas.clips[profile?.power?.clip];
 if(clip){
  const {time}=pose,landed=Number.isFinite(attack.releaseAt),released=Number.isFinite(attack.fireAt);
  const phase=landed?'recover':released?'release':'pull';
  const progress=clamp01(landed?(time-(attack.resumeAt??attack.releaseAt))/profile.recover:
   released?(time-attack.fireAt)/profile.travel:(time-attack.start)/attack.windup);
  const levels=atlas.levels[phase];
  return clip[phase][levels.findIndex((level,i)=>i===levels.length-1||progress<=(level+levels[i+1])/2)];
 }
 return u.motion&&!reducedMotion?Math.floor(pose.cycle*8)%8:atlas.idle;
}

function bulwarkBaked(u,pose,atlas){
 const heading=headingIndex(pose.heading),view=atlas.directions[heading],arm=foundryArmVariant(u);
 const key=view.variants[arm],image=motionImage({key}),loaded=imageReady(image);
 const idle=motionImage(atlas),idleReady=imageReady(idle);
 const frame=loaded&&u.alive?bulwarkArtFrame(u,pose,atlas):atlas.idle;
 return stagedFoundryDeath(u,pose,atlas,{surface:loaded?image:idleReady?idle:artImages[legacyChassis[u.frame]],
  cell:loaded?atlas.cell:idleReady?atlas.fallbackCell:0,
  index:loaded?atlas.layouts[arm][frame]:heading*4+arm,anchors:view.frames[frame],
  key:loaded?key:idleReady?atlas.key:legacyChassis[u.frame],partMask:!loaded&&idleReady?atlas.partMask:undefined,
  flip:false,baked:true,primary:true,secondary:true,shield:true},view.frames[frame]);
}

function authoredFoundryDeath(u,pose,atlas){
 const destruction=atlas?.destruction;
 if(u.alive||u.deathFallback||!destruction)return null;
 const view=destruction.directions?.[headingIndex(pose.heading)]??destruction;
 const image=motionImage(view);
 if(!imageReady(image))return null;
 const clip=destruction.clips[u.downReason==='pilot'?'pilot':'body'];
 const q=reducedMotion?1:clamp01(pose.deathAge/clip.duration);
 const index=clip.start+Math.round(q*(clip.count-1)),span=destruction.span||1;
 const flip=!destruction.directions&&unitFacing(u)>0;
 const anchors=mapFoundryAnchors(view.frames[index],flip,([x,y])=>[.5+(x-.5)*span,.5+(y-.5)*span]);
 const surface=destruction.paint===false?image:foundryPaint(image,view.key,u.paint,u.trim,atlas.paintBlend);
 return {surface,key:view.key,partMask:view.partMask,cell:destruction.cell??atlas.cell,index,anchors,flip,span,destruction,baked:true,primary:true,secondary:true};
}

function stagedFoundryDeath(u,pose,atlas,render,frame){
 if(u.alive)return render;
 const cockpit=u.downReason==='pilot',age=reducedMotion?DESTRUCTION.end:Math.min(pose.deathAge,DESTRUCTION.end);
 const ground=(Array.isArray(atlas?.ground)?atlas.ground[1]:atlas?.ground)??.84;
 const hip=frame.body[1]+(ground-frame.body[1])*.43,center=frame.legs?.[0]??frame.body[0];
 const side=(frame.muzzle?.[0]??frame.gripR?.[0]??.28)<frame.body[0]?-1:1;
 const buckle=smoothRange(.07,cockpit?.82:DESTRUCTION.kneelEnd,age);
 const fall=cockpit?0:smoothRange(.44,DESTRUCTION.fallEnd,age);
 const flinch=(1-smoothRange(.09,.29,age))*smoothRange(0,.09,age);
 const impactAge=Math.max(0,age-DESTRUCTION.fallEnd);
 const bounce=fall*Math.sin(impactAge*20)*Math.exp(-impactAge*10)*.035;
 const shift=side*(.03*buckle+.065*fall-.028*flinch);
 const drop=(ground-hip)*((cockpit?.35:.44)*buckle+.37*fall)+bounce;
 const angle=side*(.18*buckle+.95*fall-.13*flinch),c=Math.cos(angle),s=Math.sin(angle);
 const collapse=([x,y])=>{
  const dx=x-center,dy=y-hip;
  const mix=1-smoothRange(hip-.045,hip+.09,y),leg=smoothRange(hip,ground,y);
  const bend=side*Math.sin(leg*Math.PI)*(.04*buckle+.035*fall);
  return [
   mix*(center+shift+dx*c-dy*s)+(1-mix)*(x+(1-leg)*shift+bend),
   mix*(hip+drop+(dx*s+dy*c)*(1-.31*fall))+(1-mix)*(y+drop*(1-leg))
  ];
 };
 return {...render,collapse,settled:age>=DESTRUCTION.end?(cockpit?'pilot':'body'):null,
  anchors:mapFoundryAnchors(frame,render.flip,collapse)};
}

function lionMotionImages(id){
 const strike=window.IRON_VOW_LION_ART?.strikes[id];
 return strike?Object.values(strike).map(motionImage):[];
}

function lionBaked(u,t){
 const art=window.IRON_VOW_LION_ART,attack=u.attack;
 const view=art?.strikes[u.melee]?.[unitFacing(u)>0?'right':'left'];
 if(!view)return null;
 const surface=motionImage(view),cue=art.contact-3,last=view.frames.length-1;
 if(!imageReady(surface))return null;
 let tick=0;
 if(attack){
  const profile=attackProfile(u,attack.kind);
  tick=reducedMotion?(Number.isFinite(attack.fireAt)?art.contact:0):
   Number.isFinite(attack.releaseAt)?art.contact+(last-art.contact)*clamp01((t-attack.releaseAt)/profile.recover):
   Number.isFinite(attack.fireAt)?cue+(art.contact-cue)*clamp01((t-attack.fireAt)/profile.travel):
   cue*clamp01((t-attack.start)/profile.raise);
 }
 const index=Math.round(tick);
 return {surface,key:view.key,cell:art.cell,index,anchors:view.frames[index],flip:false,baked:true,
  primary:true,secondary:true,ortho:art.ortho,strikeProgress:tick/last};
}

function foundryRender(u,t,liveOnly=false){
 if(window.IronVowScene?.isLive(u))return window.IronVowFoundry.preview(u,foundryModel(u.frame),u.frame===0?'warden':u.frame===10?'bastion':undefined);

 if(u.lionTrial)return lionBaked(u,hitstopTime(u,t));
 const model=foundryModel(u.frame);
 if(model==null)return null;
 const poseTime=hitstopTime(u,t);
 const pose=animationPose(u,poseTime);
 pose.heading=displayedHeading(u);pose.cinematic=u.headingOverride!==undefined;pose.reducedMotion=reducedMotion;
 const atlas=window.IRON_VOW_FOUNDRY_ART?.[model];
 const death=authoredFoundryDeath(u,pose,atlas);
 if(death)return death;
 const walk=u.alive&&!u.attack&&u.motion?.stepBeats!=null&&!u.motion.jumpjet&&foundryWalk(u);
 if(walk){
  const image=motionImage(walk);
  if(imageReady(image)){
   const sample=Math.round(pose.stride*walk.frames.length),index=sample%walk.frames.length;
   const flip=!atlas.directions&&unitFacing(u)>0,frame=walk.frames[index];
   return {surface:walk.paint?foundryPaint(image,walk.key,u.paint,u.trim,atlas.paintBlend):image,
    key:walk.key,partMask:walk.partMask,cell:walk.cell,index,anchors:flip?mapFoundryAnchors(frame,flip):frame,
    strideOffset:sample/walk.frames.length-pose.stride,flip,baked:true,
    primary:atlas.primary===true,secondary:u.frame===REAVER_FRAME||atlas.secondary===true,
    shield:atlas.shield===true||Boolean(atlas.directions),ortho:atlas.ortho};
  }
 }
 if(atlas?.directions)return bulwarkBaked(u,pose,atlas);
 const reaver=u.frame===REAVER_FRAME;
 if(liveOnly&&!reaver&&u.frame!==ASHIGARU_FRAME)return null;
 if(bastionRig(u)){
  const anchors={body:[.50,.46],pilot:[.50,.29],right:[.31,.59],left:[.70,.59],legs:[.50,.72],muzzle:[.20,.53],leadFoot:[.43,.84]};
  return stagedFoundryDeath(u,pose,atlas,{surface:artImages['bastion-bst04'],key:'bastion-bst04',cell:0,anchors,flip:false,baked:true,primary:true},anchors);
 }
 if(!atlas||atlas.frames.length<19)return null;
 const strike=u.alive&&u.hp.left>0?atlas.strikes?.[pose.strikeKind]:null;
 const strikeImage=strike&&motionImage(strike);
 if(strike&&imageReady(strikeImage)){
  const level=reducedMotion?(Number.isFinite(u.attack.fireAt)?.70:0):pose.strikeProgress;
  const index=strike.levels.findIndex((value,i)=>i===strike.levels.length-1||level<=(value+strike.levels[i+1])/2);
  const flip=unitFacing(u)>0,frame=strike.frames[index];
  const anchors=flip?mapFoundryAnchors(frame,flip):frame;
  return {surface:strikeImage,key:strike.key,partMask:strike.partMask,cell:atlas.cell,index,anchors,flip,baked:true,primary:false,secondary:true,ortho:atlas.ortho,
   strikeProgress:pose.strikeProgress};
 }
 const variantIndex=foundryArmVariant(u);
 const variant=reaver?REAVER_ATLASES[2*Number(u.hp.right>0)+Number(u.hp.left>0)]:atlas.variants?.[variantIndex];
 const sprite=variant?{key:variant}:u.hp.right<=0&&atlas.unarmedKey?{key:atlas.unarmedKey}:atlas;
 const image=motionImage(sprite);
 const index=!u.alive?atlas.bare??atlas.idle??16:
  u.frame===ASHIGARU_FRAME?ashigaruArtFrame(u,pose,atlas):
  u.frame===VANGUARD_FRAME?vanguardArtFrame(u,pose,atlas):
  pose.strikeKind&&pose.primePhase!=='step'?13+Math.min(2,Math.floor(pose.strikeProgress*3)):
  Math.abs(pose.recoil)>.05?12:pose.aim>.35?11:
  pose.primeProgress>0?8+Math.min(2,Math.floor(pose.primeProgress*3)):
  u.motion&&!u.motion.jumpjet&&!reducedMotion?Math.floor(pose.cycle*8)%8:16;
 const flip=unitFacing(u)>0,frame=atlas.frames[index];
 const anchors=flip?mapFoundryAnchors(frame,flip):frame;
 const loaded=imageReady(image),key=loaded?sprite.key:legacyChassis[u.frame],base=loaded?image:artImages[key];
 const surface=loaded?foundryPaint(base,key,u.paint,u.trim,atlas.paintBlend):base;
 return stagedFoundryDeath(u,pose,atlas,{surface,key,partMask:loaded?sprite.partMask:undefined,cell:loaded?atlas.cell:0,index:atlas.layouts?.[variantIndex]?.[index]??index,anchors,flip,baked:true,
  primary:atlas.primary===true,secondary:reaver||atlas.secondary===true,shield:atlas.shield===true,strikeProgress:pose.strikeProgress,ortho:atlas.ortho},frame);
}

function mapFoundryAnchors(frame,flip,transform=p=>p){
 return Object.fromEntries(Object.entries(frame).filter(([,p])=>Array.isArray(p)).map(([key,p])=>{
  const [x,y]=transform(p);return [key,[flip?1-x:x,y]];
 }));
}

function sampledWalkBounds(u,bounds,walk){
 if(!walk?.strideOffset)return bounds;
 const m=u.motion,q=walk.strideOffset;
 const center=project(u.vx,0,u.vz);
 const sampled=project(u.vx+(m.toX-m.fromX)*q,0,u.vz+(m.toZ-m.fromZ)*q);
 return {...bounds,x:bounds.x+sampled.x-center.x,y:bounds.y+sampled.y-center.y};
}

function drawFoundryCollapse(render,w,h,g=ctx){
 if(!render.settled){paintFoundryCollapse(render,w,h,g);return}
 let frames=settledFoundryArt.get(render.surface);
 if(!frames){frames=new Map();settledFoundryArt.set(render.surface,frames)}
 const key=[render.cell,render.index,render.settled].join('/');
 let surface=frames.get(key);
 if(!surface){
  surface=renderSurface(450,450);
  const layer=surface.getContext('2d');
  layer.imageSmoothingEnabled=g.imageSmoothingEnabled;
  layer.translate(225,75);paintFoundryCollapse(render,300,300,layer);
  frames.set(key,surface);
 }
 g.drawImage(surface,-.75*w,-.25*h,1.5*w,1.5*h);
}

function paintFoundryCollapse(render,w,h,g){
 const {surface,cell,index,collapse}=render;
 const iw=surface.naturalWidth||surface.width,ih=surface.naturalHeight||surface.height;
 const sx=cell?index%4*cell:0,sy=cell?Math.floor(index/4)*cell:0;
 const sw=cell||iw,sh=cell||ih,columns=2,rows=9,source=[],dest=[];
 for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
  const x=col/columns,y=row/rows,[dx,dy]=collapse([x,y]);
  source.push({x:sx+x*sw,y:sy+y*sh});dest.push({x:(dx-.5)*w,y:dy*h});
 }
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  const a=row*(columns+1)+col,b=a+1,c=a+columns+1,d=c+1;
  drawMeshTriangle(surface,[source[a],source[b],source[d]],[dest[a],dest[b],dest[d]],iw,ih,g);
  drawMeshTriangle(surface,[source[a],source[d],source[c]],[dest[a],dest[d],dest[c]],iw,ih,g);
 }
}

function ashigaruArtFrame(u,pose,atlas){
 if(!u.alive)return u.downReason==='pilot'?atlas.pilotDown:atlas.wreck;
 const attack=u.attack,profile=attack&&attackProfile(u,attack.kind),clip=attack&&atlas.attacks[weapon(attack.kind).scout];
 if(clip){
  const {cue,contact}=profile,last=clip.length-1;
  if(reducedMotion)return clip[Number.isFinite(attack.fireAt)?contact:0];
  const duration=profile.beats.at(-1)+profile.travel;
  const f=Number.isFinite(attack.releaseAt)?contact+(last-contact)*clamp01((pose.time-attack.releaseAt)/profile.recover):
   Number.isFinite(attack.fireAt)?cue+(contact-cue)*clamp01((pose.time-attack.fireAt)/duration):
   cue*clamp01((pose.time-attack.start)/profile.raise);
  return clip[Math.round(f)];
 }
 if(u.motion&&!reducedMotion)return atlas.walk[Math.round(pose.stride*atlas.walk.length)%atlas.walk.length];
 return u.hp.right>0?atlas.idle:atlas.bare;
}

function drawUnitBody(u,t,close){
 if(window.IronVowScene?.isLive(u))throw Error('A live frame reached the temporary sprite renderer');
 t=hitstopTime(u,t);
 const live=foundryRender(u,t,true),travel=!close&&!live&&travelVisual(u,t);
 if(travel){drawTravel(u,t,travel);return}
 if(u.kind){drawVehicle(u,t,close);return}
 const foundry=live||foundryRender(u,t);
 const visual=activeWardenVisual(u),p=project(u.vx,0,u.vz),raw=sampledWalkBounds(u,unitBounds(u,visual),foundry),b=!u.lionTrial&&(visual?.modular||visual?.native||foundryModel(u.frame)!=null)?recoilingBounds(u,raw,t):raw,pose=animationPose(u,t,visual);
 const key=visual?.key||legacyChassis[u.frame],original=artImages[key];
 // Fallback sprites without four views are flipped to match the current facing.
 const facing=unitFacing(u),farShield=shieldBehind(facing*Math.PI/4);
 if(foundry){
  const chest=!u.alive?spritePoint(b,foundry.anchors.body):null;
  const fall=chest&&u.downReason!=='pilot'?(reducedMotion?1:smoothRange(DESTRUCTION.kneelEnd,DESTRUCTION.fallEnd,pose.deathAge)):0;
  ctx.save();ctx.fillStyle='#050c12ac';ctx.beginPath();
  ctx.ellipse(p.x+((chest?.x??p.x)-p.x)*fall,p.y+scale*.025,scale*(foundryModel(u.frame)===5?.92:.64+fall*.36),scale*.22,0,0,Math.PI*2);ctx.fill();
  drawJumpjetExhaust(u,t);
  const shield=activeShield(u)&&!foundry.shield&&shieldMount(u,foundry.anchors,b,facing,foundry.ortho||8);
  if(farShield)drawWeaponModule(ctx,shield);
  if(foundry.surface&&(!foundry.baked||imageReady(foundry.surface)||typeof foundry.surface.getContext==='function')){
   const {cell,index,span=1}=foundry;
   const sx=cell?index%4*cell:0,sy=cell?Math.floor(index/4)*cell:0;
   const draw=(g,part)=>{
    g.save();g.translate(b.x+b.w/2,b.y);if(foundry.flip)g.scale(-1,1);
    if(foundry.collapse)drawFoundryCollapse(part?{...foundry,surface:part,cell:0,index:0}:foundry,b.w,b.h,g);
    else if(cell&&!part)g.drawImage(foundry.surface,sx,sy,cell,cell,-b.w*span/2,(1-span)*b.h/2,b.w*span,b.h*span);
    else g.drawImage(part||foundry.surface,-b.w*span/2,(1-span)*b.h/2,b.w*span,b.h*span);
    g.restore();
   };
   const area=foundry.collapse?{x:b.x-b.w*.5,y:b.y-b.h*.5,w:b.w*2,h:b.h*2}:
    {x:b.x+(1-span)*b.w/2,y:b.y+(1-span)*b.h/2,w:b.w*span,h:b.h*span};
   const mask=partTintSource(foundry.key,foundry.surface,area,draw,cell,sx,sy,foundry.partMask);
   const paint=()=>draw(ctx);
   paint();
   drawPartTints(u,t,paint,part=>foundry.anchors[part]&&spritePoint(b,foundry.anchors[part]),foundry.baked,mask);
  }
  ctx.restore();
  if(u.alive){
   ctx.save();
   if(u.hp.right>0&&!foundry.primary)drawWeaponModule(ctx,foundryMount(foundry.anchors,b,u.weapon,facing,0,foundry.ortho,pose));
   if(u.hp.left>0&&!foundry.secondary&&(pose.strikeKind||(foundryModel(u.frame)===4&&pose.aim<.2)))drawWeaponModule(ctx,foundryMount(foundry.anchors,b,u.melee,facing,foundry.strikeProgress));
   if(!farShield)drawWeaponModule(ctx,shield);
   ctx.restore();
  }
  if(!u.alive&&u.downReason!=='pilot'&&pose.deathAge>=DESTRUCTION.kneelEnd)
   drawMechSmoke(u,t,true,chest);
  if(u.alive&&u.brace){ctx.strokeStyle='#8fc6d29c';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(p.x,p.y,scale*.8,scale*.28,0,0,Math.PI*2);ctx.stroke()}
  if(u.alive&&!close)drawUnitReadout(u,(u.frame===ASHIGARU_FRAME?2.0:foundryModel(u.frame)===5?2.12:2.35)+jumpjetHeight(u,t));
  return;
 }
 const baked=wardenMotionFrame(u,visual,pose),remaining=remainingPose(pose,baked);
 const body=baked?.frame?baked.image:original,bodyKey=baked?.frame?baked.atlas.key:key;
 const im=visual?.modular||visual?.native?paintedSprite(body,bodyKey,u.paint):body;
 ctx.save();ctx.fillStyle=u.alive?'#050c12aa':'#090e13c9';ctx.beginPath();ctx.ellipse(p.x,p.y+scale*.025,scale*(.67+pose.brace*.05),scale*.22,0,0,Math.PI*2);ctx.fill();ctx.restore();if(!imageReady(original))return;
 if(!u.alive&&pose.explosion>=1){drawDestructionDebris(u,t,pose);drawMechSmoke(u,t,true);return}
 ctx.save();
 const shield=activeShield(u)&&shieldMount(u,baked?.frame||visual,b,facing,visual?.ortho);
 if(farShield)drawWeaponModule(ctx,shield);
 const articulated=!reducedMotion&&(pose.walk>.001||pose.primeProgress>0||Math.abs(pose.recoil)>.008||Math.abs(pose.impact)>.008||pose.brace>.008||pose.aim>.001||(!u.alive&&pose.explosion<1));
 const sheet=baked?.frame?baked.atlas:null,cell=sheet?.cell??0,index=baked?.frame?.index;
 const sx=cell?index%sheet.columns*cell:0,sy=cell?Math.floor(index/sheet.columns)*cell:0;
 const rigid=articulated&&!visual&&rigidParts[u.frame];
 const warped=articulated&&!visual?.modular&&!visual?.native&&foundryModel(u.frame)==null;
 const draw=(g,part)=>{
  g.save();g.translate(b.x+b.w/2,b.y+b.h);if(pose.flip)g.scale(-1,1);
  if(!u.alive){
   const root=destructionRoot(u,pose);
   if(!part)g.globalAlpha=u.downReason==='pilot'?.65:1-pose.explosion;
   g.translate(root.x*b.w,root.y*b.h);g.rotate(root.angle);g.scale(root.scale,root.scale);
  }
  if(sheet){
   if(part)g.drawImage(part,-b.w/2,-b.h,b.w,b.h);
   else g.drawImage(im,sx,sy,cell,cell,-b.w/2,-b.h,b.w,b.h);
  }else if(rigid){drawArticulatedMech(im,u,b.w,b.h,{...pose,baseOnly:true},rigid.base,g);drawRigidUpper(u,b.w,b.h,pose)}
  else if(warped)drawArticulatedMech(part||im,u,b.w,b.h,{...remaining,baseOnly:true},null,g);
  else{if(u.alive&&!reducedMotion&&!spent(u))g.rotate(Math.sin(t*.85+u.index)*.001);g.drawImage(part||im,-b.w/2,-b.h,b.w,b.h)}
  g.restore();
 };
 const area=u.alive&&(sheet||!warped)?b:{x:b.x-b.w*.65,y:b.y-b.h*.4,w:b.w*2.3,h:b.h*1.8};
 const mask=rigid?null:partTintSource(bodyKey,body,area,draw,cell,sx,sy,sheet?sheet.partMask:visual?.partMask);
 const paint=()=>draw(ctx);
 paint();
 drawPartTints(u,t,paint,part=>mechAttachmentPoint(u,part,t),true,mask);
 ctx.restore();
 if(!u.alive){if(u.downReason!=='pilot'){drawDestructionDebris(u,t,pose);drawMechSmoke(u,t,true)}return}
 if(visual?.modular){
  const frame=baked?.frame||visual,face=unitFacing(u);
  if(u.hp.right>0&&!(u.frame===2&&u.weapon==='missile'))drawWeaponModule(ctx,weaponMount(visual,frame,b,u.weapon,face,0,pose));
  if(u.hp.left>0&&u.melee&&(pose.strikeKind||(action==='strike'&&current()===u))){
   drawWeaponModule(ctx,weaponMount(visual,frame,b,pose.strikeKind||u.melee,face,pose.strikeProgress));
  }
 }
 if(!farShield)drawWeaponModule(ctx,shield);
 if(u.attack&&!pose.strikeKind&&weaponMotion(u.weapon)==='rail'&&!Number.isFinite(u.attack.fireAt)&&!reducedMotion){
  const muzzle=mechAttachmentPoint(u,'muzzle',t),plasma=u.weapon==='ember';
  ctx.save();ctx.globalAlpha=pose.aim*.8;ctx.fillStyle=plasma?'#ffdfb0':'#b1e7ed';ctx.shadowColor=plasma?'#f88547':'#8ac8e5';
  ctx.shadowBlur=15;ctx.beginPath();ctx.arc(muzzle.x,muzzle.y,scale*(.025+pose.aim*.065),0,Math.PI*2);ctx.fill();ctx.restore();
 }
 if(u.brace){ctx.strokeStyle='#8fc6d29c';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(p.x,p.y,scale*.8,scale*.28,0,0,Math.PI*2);ctx.stroke()}
 if(u.hp.body/u.max.body<.4||u.hp.right===0)drawMechSmoke(u,t);
 if(!close)drawUnitReadout(u);
}

function drawBulwarkCharge(actor,t){
 const attack=actor.attack,power=ATTACK_PROFILES[attack?.kind]?.power;
 if(!power||reducedMotion||Number.isFinite(attack.fireAt))return;
 const charge=smoothRange(.20,.91,(t-attack.start)/attack.windup);
 if(charge<=0)return;
 const p=mechAttachmentPoint(actor,power.anchor,t),radius=scale*(.12+.28*charge);
 ctx.save();ctx.globalAlpha=charge*.88;
 const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);
 glow.addColorStop(0,'#faffdf');glow.addColorStop(.29,power.color);glow.addColorStop(1,power.color+'00');
 ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle=power.color;ctx.lineWidth=1+charge;
 ctx.beginPath();ctx.arc(p.x,p.y,radius*(.62-.16*charge),t*2,t*2+Math.PI*(.6+charge));ctx.stroke();ctx.restore();
}


function billboardPixelAttachment(u,part='muzzle',t=clock){
 t=hitstopTime(u,t);
 if(part==='meleeTip'&&u.attack?.kind===FREE_HAND_COUNTER.id)part=upgradedWardenTravel(travelAtlas(u))?'gripL':'left';
 if(u.kind)return vehicleAttachment(u,part,t);
 const live=foundryRender(u,t,true),travel=!live&&travelVisual(u,t);
 if(travel){
  if(part==='shield'){
   const mount=shieldMount(u,travel.points,travel.bounds,travel.direction,travel.atlas.span);
   if(mount)return weaponPoint(mount,'face');
  }
  if(part==='meleeTip'){
   if(travel.atlas.grounded?.strike)return spritePoint(travel.bounds,travel.points.meleeTip);
   const blade=travelMount(travel,u,u.attack?.kind||u.melee,travel.strike?.strikeProgress);
   return blade?weaponPoint(blade,'tip'):spritePoint(travel.bounds,travel.points.left||travel.points.body);
  }
  const mount=part.startsWith('muzzle')&&!(u.frame===2&&u.weapon==='missile')?travelMount(travel,u,u.weapon,0,t):null;
  if(mount)return weaponPoint(mount,part);
  return spritePoint(travel.bounds,travel.points[part]||travel.points.muzzle||travel.points.body);
 }
 const foundry=live||foundryRender(u,t);
 if(foundry){
  const raw=sampledWalkBounds(u,unitBounds(u),foundry);
  const bounds=u.lionTrial?raw:recoilingBounds(u,raw,t),facing=unitFacing(u),strike=part==='meleeTip';
  if(part==='shield'&&!foundry.anchors.shield){
   const mount=shieldMount(u,foundry.anchors,bounds,facing,8);
   if(mount)return weaponPoint(mount,'face');
  }
  if(strike||part.startsWith('muzzle')){
   const production=Boolean(strike?foundry.secondary:foundry.primary);
   if(production&&foundry.anchors[part])return spritePoint(bounds,foundry.anchors[part]);
   const mount=foundryMount(foundry.anchors,bounds,strike?u.melee:u.weapon,facing,foundry.strikeProgress,foundry.ortho,strike?undefined:firingPose(u,t));
   if(mount)return weaponPoint(mount,strike?'tip':part);
  }
  return spritePoint(bounds,foundry.anchors[part]||foundry.anchors.body);
 }
 const visual=activeWardenVisual(u),raw=unitBounds(u,visual),b=visual?.modular||visual?.native?recoilingBounds(u,raw,t):raw,pose=animationPose(u,t,visual),rig=pose.rig;
 const locations={body:[rig.split,.34],pilot:[rig.split,.21],right:[u.frame===1?.38:.30,.46],left:[.81,.39],legs:[rig.split,.79]};
 const baked=wardenMotionFrame(u,visual,pose),frame=baked?.frame||visual;
 if(part==='shield'){
  const mount=shieldMount(u,frame,b,unitFacing(u),visual?.ortho);
  if(mount)return weaponPoint(mount,'face');
 }
 if(visual?.native){
  const p=frame[part]||visual[part]||(part==='pilot'?[frame.body[0],frame.body[1]-.14]:frame.body);
  if(u.alive)return spritePoint(b,p);
  const root=destructionRoot(u,pose),q=rotatePoint({x:(p[0]-.5)*root.scale,y:(p[1]-1)*root.scale},[0,0],root.angle);
  return spritePoint(b,[q.x+.5+root.x,q.y+1+root.y]);
 }
 if(part==='leadFoot'&&!frame?.leadFoot){const p=project(u.vx,0,u.vz);return{x:p.x+unitFacing(u)*scale*.22,y:p.y}}
 if(!visual){const source=part.startsWith('muzzle')?(u.weapon==='missile'?[u.frame===2?(part==='muzzle2'?.76:.36):(part==='muzzle2'?.29:.69),.16]:rig.muzzle):(locations[part]||locations.body);return mechSourcePoint(u,source[0],source[1],pose)}
 if(visual.modular){
  if(part==='meleeTip'||part.startsWith('muzzle')){
   const melee=part==='meleeTip',id=melee?(pose.strikeKind||u.melee):u.weapon;
   if(!melee&&u.frame===2&&id==='missile')return spritePoint(b,part==='muzzle2'?frame.podL:frame.podR);
   const mount=weaponMount(visual,frame,b,id,unitFacing(u),pose.strikeProgress,melee?undefined:pose);
   if(mount)return weaponPoint(mount,melee?'tip':part);
  }
  return spritePoint(b,frame[part]||visual[part]||(part==='pilot'?[frame.body[0],frame.body[1]-.14]:frame.body));
 }
 const source=frame[part]||visual[part]||locations[part]||visual.body;
 if(baked?.frame&&u.alive)return{x:b.x+(pose.flip?1-source[0]:source[0])*b.w,y:b.y+source[1]*b.h};
 return mechSourcePoint(u,source[0],source[1],{...remainingPose(pose,baked),baseOnly:true,kneel:baked?.frame?0:pose.kneel});
}

function drawJumpjetExhaust(u,t){
 const lift=jumpjetHeight(u,t);
 if(lift<=0)return;
 const nozzle=project(u.vx,lift+1.47,u.vz);
 const rear=-unitFacing(u);
 const length=scale*(.40+lift*.33);
 for(const offset of [.20,.32]){
  const x=nozzle.x+rear*scale*offset,y=nozzle.y-offset*scale*.18;
  const glow=ctx.createLinearGradient(x,y,x+rear*length*.35,y+length);
  glow.addColorStop(0,'#fff5dc');
  glow.addColorStop(.28,'#88e4ff');
  glow.addColorStop(1,'#4c9cfa00');
  polygon([{x:x-scale*.10,y},{x:x+scale*.10,y},{x:x+rear*length*.35,y:y+length}],glow);
 }
}
