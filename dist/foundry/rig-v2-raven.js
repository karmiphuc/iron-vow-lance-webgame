/* Raven's shoulder shields, right-arm muzzle and left clamp are built into the hull. */
(function(root){
'use strict';
const T=root.THREE,R=root.IronVowFoundryRig,V=R.V3;
const clamp=T.MathUtils.clamp;
const smooth=x=>{const f=clamp(x,0,1);return f*f*(3-2*f);};
const fireCue=.37;

function makeContactShadow(ankles){
 const geometry=new T.BufferGeometry(),grid=5,perStamp=grid*grid,total=perStamp*3;
 const positions=new Float32Array(total*3),uv=new Float32Array(total*2),strengths=new Float32Array(total),indices=[];
 for(let stamp=0;stamp<3;stamp++)for(let row=0;row<grid;row++)for(let col=0;col<grid;col++){
  const i=stamp*perStamp+row*grid+col;
  uv[i*2]=col/(grid-1);uv[i*2+1]=row/(grid-1);
  if(row<grid-1&&col<grid-1)indices.push(i,i+grid,i+1,i+1,i+grid,i+grid+1);
 }
 geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));
 geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
 geometry.setAttribute('contactStrength',new T.BufferAttribute(strengths,1).setUsage(T.DynamicDrawUsage));
 geometry.setIndex(indices);
 // A decal must not extend the chassis bounds used by the battlefield picker.
 geometry.boundingBox=new T.Box3();
 const material=new T.MeshBasicMaterial({color:0x05060a,transparent:true,depthWrite:false,
  polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 material.onBeforeCompile=shader=>{
  const vary='varying vec2 contactUV; varying float contactOpacity;\n';
  shader.vertexShader='attribute float contactStrength;\n'+vary+shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\ncontactUV=uv;contactOpacity=contactStrength;');
  shader.fragmentShader=vary+shader.fragmentShader.replace('#include <color_fragment>',
   '#include <color_fragment>\ndiffuseColor.a*=contactOpacity*(1.-smoothstep(.10,1.,length(contactUV*2.-1.)));');
 };
 const mesh=new T.Mesh(geometry,material);
 mesh.name='Raven foot contact';mesh.frustumCulled=false;mesh.raycast=()=>{};
 const inverse=new T.Matrix4(),rootAt=V(),center=V(),point=V();
 return {
  update(m,world,stage,alive){
   const cont=m.cont,k=m.scale,angle=m.yaw;
   if(mesh.parent!==cont)cont.add(mesh);
   rootAt.setFromMatrixPosition(cont.matrixWorld);inverse.copy(cont.matrixWorld).invert();
   const groundAt=stage?()=>rootAt.y:world.groundAt;
   for(let stamp=0;stamp<3;stamp++){
    const foot=stamp<2;
    if(foot)ankles[stamp].getWorldPosition(center);else center.copy(rootAt);
    const turn=angle+(foot?(stamp===0?.3:-.3):0),s=Math.sin(turn),c=Math.cos(turn);
    if(foot){center.x+=s*.28*k;center.z+=c*.28*k;}
    const level=groundAt(center.x,center.z);
    const lift=center.y-level-(foot?m.dims.ankleH*k:0);
    const offset=foot?.025:.015;
    const opacity=foot?(alive?.58*clamp(1-lift/(.58*k),0,1):0):.35*clamp(1-lift/(1.7*k),.25,1);
    for(let n=0;n<perStamp;n++){
     const i=stamp*perStamp+n,x=(uv[i*2]*2-1)*(foot?.96:2.9)*k,z=(uv[i*2+1]*2-1)*(foot?1.22:1.8)*k;
     const px=center.x+c*x+s*z,pz=center.z-s*x+c*z,py=groundAt(px,pz);
     point.set(px,py+offset,pz).applyMatrix4(inverse).toArray(positions,i*3);
     strengths[i]=opacity*clamp(1-Math.abs(py-level)/(.75*k),0,1);
    }
   }
   geometry.attributes.position.needsUpdate=geometry.attributes.contactStrength.needsUpdate=true;
  },
  dispose(){mesh.parent?.remove(mesh);geometry.dispose();material.dispose();}
 };
}

function setup({bone,animations,rig}){
 const both=base=>['L','R'].map(side=>bone(base+'.'+side));
 const shoulders=both('Shoulder'),shields=both('Shield'),upper=both('shoulder');
 const elbows=both('elbow'),hands=both('wrist'),faces=both('ShieldFace');
 const spine=bone('spine'),neck=bone('neck'),pelvis=bone('pelvis');
 const driven=[spine,neck,...shoulders,...shields,...upper,...elbows,...hands];
 const firing=new Set([spine,neck,upper[1],elbows[1],hands[1],shoulders[1]]);
 const clips=new Map(animations.map(clip=>[clip.name,{
  duration:clip.duration,
  tracks:new Map(clip.tracks.map(track=>[track.name,track.createInterpolant()]))
 }]));
 const idle=clips.get('Idle'),walk=clips.get('Walk'),enter=clips.get('BraceEnter');
 const hold=clips.get('BraceHold'),exit=clips.get('BraceExit'),fire=clips.get('Fire');
 const rest=new Map(driven.map(joint=>[joint,joint.quaternion.clone()]));
 const value=new T.Quaternion(),fireRest=new T.Quaternion();
 const muzzleBone=bone('Muzzle.R'),muzzle=new T.Object3D();
 muzzle.name='raven.muzzle';
 // Blender bones point along +Y. The engine fires along a marker's +Z.
 muzzle.quaternion.setFromUnitVectors(V(0,0,1),V(0,1,0));
 muzzleBone.add(muzzle);
 const clampTip=bone('ClampTip.L');
 const primary={id:'raven-gauntlet',subsystem:'right',mount:elbows[1],carrier:elbows[1].parent,muzzle,aimPivot:()=>elbows[1],
  bounds:()=>new T.Box3().setFromPoints([elbows[1].getWorldPosition(V()),hands[1].getWorldPosition(V())]).expandByScalar(.49)};
 const secondary={id:'raven-clamp',mount:hands[0],carrier:hands[0].parent,tip:clampTip};
 const anchors={body:spine,pilot:neck,left:elbows[0],right:elbows[1]};
 const hinges=rig.legs.map(leg=>{
  const at=bone('ankle.'+leg.side).getWorldPosition(V());
  leg.restX=at.x;leg.restZ=at.z;
  return makeLeg(bone,leg.side);
 });
 const pelvisTrack=clip=>clip.tracks.get(pelvis.name+'.position');
 const bindPelvis=pelvis.position.clone();
 let guard,guardSince,unit,strikeProgress,contactShadow;

 function rotation(joint,clip,time,out){
  const track=clip.tracks.get(joint.name+'.quaternion');
  return track?out.fromArray(track.evaluate(time)):out.copy(rest.get(joint));
 }
 function prepare(m,input,dt,time){
  const bracing=input.alive&&unit.brace&&!input.moving;
  // New presentation instances can appear during a duel or after reload.
  // Use the command's clock so their shield position matches the field view.
  if(guard===undefined)guard=bracing?clamp((time-(unit.braceTime??-Infinity))/enter.duration,0,1):0;
  if(input.reducedMotion||!input.alive)guard=Number(bracing);
  else guard=clamp(guard+(bracing?dt/enter.duration:-dt/exit.duration),0,1);
  if(guard<1)guardSince=undefined;
  else guardSince??=time;
  const clip=guard===1?hold:bracing?enter:exit;
  const at=guard===1?(input.reducedMotion?0:(time-guardSince)%hold.duration):
   clip.duration*(bracing?guard:1-guard);
  const authored=pelvisTrack(clip)?.evaluate(at)??bindPelvis.toArray();
  const pelvisDrop=bindPelvis.y-authored[1];
  return {clip,at,input:{...input,brace:Math.max(0,pelvisDrop/.34)},guard,pelvisShift:authored[2]-bindPelvis.z};
 }

 function afterAnimate(m,input,dt,time,pose){
  if(!input.alive)return;
  pelvis.position.z+=pose.pelvisShift;
  const phase=((m.gait.phase%1)+1)%1;
  const stride=input.reducedMotion?0:m.gait.w;
  const idleAt=input.reducedMotion?0:time%idle.duration;
  const attack=input.attack?.kind===primary.id?input.attack:null;
  let firedAt=null,kick=0;
  if(attack&&!input.armDead){
   const contact=attack.fireAt??attack.start+(attack.primeDuration||0)+(attack.windup||.30);
   const age=time-contact;
   if(age<=0)firedAt=fireCue*smooth(1+age/Math.max(.01,attack.windup||.30));
   else if(Number.isFinite(attack.releaseAt)&&time>=attack.releaseAt+.10){
    firedAt=.63+.37*smooth((time-attack.releaseAt-.10)/.25);
   }else firedAt=fireCue+Math.min(.26,age/fire.duration);
   if(input.reducedMotion)firedAt=fireCue;
   else kick=Math.min(1,m.recoil);
  }
  for(const joint of driven){
   const base=joint.quaternion,solved=base.clone();
   rotation(joint,idle,idleAt,base);
   if(stride>0)base.slerp(rotation(joint,walk,phase*walk.duration,value),stride);
   if(pose.guard>0)rotation(joint,pose.clip,pose.at,base);
   if(firedAt!==null&&firing.has(joint)&&!(pose.guard&&joint===shoulders[1])){
    rotation(joint,fire,0,fireRest).invert();
    base.multiply(fireRest.multiply(rotation(joint,fire,firedAt*fire.duration,value)));
   }
   // The planted melee solver owns the left clamp during contact.
   if(strikeProgress>0&&[upper[0],elbows[0],hands[0]].includes(joint))base.slerp(solved,smooth(strikeProgress*5)*smooth((1-strikeProgress)*5));
  }
  if(kick>0)elbows[1].rotateX(-.09*kick);
  for(const [i,hinge] of hinges.entries())hinge.solve(m,m.legs[i].foot);
 }

 return {prepare,afterAnimate,anchors,nativeShield:true,
  meleeSide:()=> 'L',strikeContact:id=>id===secondary.id?clampTip:null,
  groundShadow(m,world,stage){
   if(!world||!stage&&!world.groundAt)return;
   contactShadow??=makeContactShadow(both('ankle'));
   contactShadow.update(m,world,stage,unit.alive);
  },
  dispose(){contactShadow?.dispose();},
  pose(entry,actor,pose){
   unit=actor;strikeProgress=pose.strikeKind===secondary.id?pose.strikeProgress:0;
   anchors.left=actor.brace?faces[0]:elbows[0];
   anchors.right=actor.brace?faces[1]:elbows[1];
   entry.primary=actor.alive&&actor.hp.right>0?primary:null;
   entry.secondary=actor.alive&&actor.hp.left>0?secondary:null;
  }
 };
}

// Preserve the splayed Raven knees and exact rigid shoe basis. The shared gait
// chooses world contacts and support timing, the shoulder silhouette stays authored.
function makeLeg(bone,side){
 const hip=bone('hip.'+side),knee=bone('knee.'+side),ankle=bone('ankle.'+side);
 const patella=bone('Patella.'+side);
 const hipRest=hip.quaternion.clone(),kneeRest=knee.quaternion.clone(),patellaRest=patella.quaternion.clone();
 const shoeRest=ankle.getWorldQuaternion(new T.Quaternion());
 const hipAt=hip.getWorldPosition(V()),kneeAt=knee.getWorldPosition(V()),ankleAt=ankle.getWorldPosition(V());
 const thigh=kneeAt.clone().sub(hipAt),shin=ankleAt.clone().sub(kneeAt);
 const restAxis=ankleAt.sub(hipAt).normalize();
 const bend=thigh.clone().addScaledVector(restAxis,-thigh.dot(restAxis)).normalize();
 const a=thigh.length(),b=shin.length();
 const parentQ=new T.Quaternion(),rootQ=new T.Quaternion(),delta=new T.Quaternion();
 const start=V(),axis=V(),pole=V(),jointAt=V(),direction=V();
 function point(node,rest,child,goal){
  node.parent.getWorldQuaternion(parentQ).invert();
  direction.copy(goal).sub(node.getWorldPosition(jointAt)).applyQuaternion(parentQ).normalize();
  const from=V().copy(child.position).applyQuaternion(rest).normalize();
  node.quaternion.copy(delta.setFromUnitVectors(from,direction)).multiply(rest);
 }
 return {solve(m,target){
  m.cont.getWorldQuaternion(rootQ);
  hip.getWorldPosition(start);
  axis.copy(target).sub(start);
  const length=clamp(axis.length()/m.scale,Math.abs(a-b)+.001,a+b-.001);
  axis.normalize();pole.copy(bend).applyQuaternion(rootQ);
  pole.addScaledVector(axis,-pole.dot(axis)).normalize();
  const along=(a*a+length*length-b*b)/(2*length);
  const kneeGoal=start.clone().addScaledVector(axis,along*m.scale)
   .addScaledVector(pole,Math.sqrt(Math.max(0,a*a-along*along))*m.scale);
  point(hip,hipRest,knee,kneeGoal);
  point(knee,kneeRest,ankle,target);
  patella.quaternion.copy(patellaRest).multiply(delta.identity().slerp(kneeRest.clone().invert().multiply(knee.quaternion),.5));
  ankle.quaternion.copy(knee.getWorldQuaternion(parentQ).invert()).multiply(rootQ).multiply(shoeRest);
 }};
}

root.IronVowRigV2.register(30,{id:'raven',assetPath:'rig-bench/rig-v2/raven.glb?rev=raven-matte',factoryLivery:true,
 // The posed wing span fits the field tile at world scale and the tighter portrait crop at preview scale.
 scale:.78,worldScale:.832,dimensions:{walkDrop:.085,stride:.68,duty:.57},setup});
})(window);
