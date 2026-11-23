/* Rig-v2 skins use the shared Foundry animator and the exported rest pivots.
 * The driver uses -Y down each limb, as in foundry/rigid-adapter.js. Keep the
 * Blender joints in their authored bases for skinning. */
(function(root){
'use strict';
const T=root.THREE,R=root.IronVowFoundryRig,VC=root.VowChassis;
const V3=R.V3,Q=()=>new T.Quaternion();
const profiles=new Map(),assets={battle:new Map(),preview:new Map(),portrait:new Map(),hangar:new Map(),workshop:new Map(),bench:new Map()};
const profileKey=u=>u.lionTrial?'lion':u.frame;
const applies=u=>!u.kind&&profiles.has(profileKey(u));
const assetKey=u=>profiles.get(profileKey(u))?.assetPath;

function releaseStock(source){
 const geometry=new Set(),materials=new Set(),textures=new Set();
 source.traverse(node=>{if(node.isMesh){geometry.add(node.geometry);materials.add(node.material);}});
 for(const material of materials){
  for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
  material.dispose();
 }
 for(const texture of textures)texture.dispose();
 for(const buffer of geometry)buffer.dispose();
}
function load(units,scope='battle'){
 const cache=assets[scope],loader=new T.GLTFLoader().setMeshoptDecoder(root.MeshoptDecoder);
 const wanted=new Map(units.filter(applies).map(unit=>[assetKey(unit),profiles.get(profileKey(unit))]));
 return Promise.all([...wanted.values()].map(({id,assetPath})=>{
  const cached=cache.get(assetPath);
  if(cached)return cached.request;
  const asset={status:'loading'};
  cache.set(assetPath,asset);
  asset.request=loader.loadAsync(root.IRON_VOW_INLINE_ASSETS?.[assetPath]||assetPath).then(({scene,parser,animations})=>{
   if(cache.get(assetPath)!==asset){releaseStock(scene);return false;}
   // The vendored renderer samples all color maps through the primary attribute.
   scene.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const index=parser.associations.get(mesh.material)?.materials;
    const color=parser.json.materials?.[index]?.pbrMetallicRoughness?.baseColorTexture;
    if(color?.texCoord===1&&mesh.geometry.attributes.uv2){
     mesh.geometry.setAttribute('uv',mesh.geometry.attributes.uv2);
    }
   });
   asset.scene=scene;asset.animations=animations;asset.status='ready';
   return true;
  }).catch(error=>{
   if(cache.get(assetPath)!==asset)return false;
   asset.status='error';console.warn(id+' rig-v2 load failed',error);
   return false;
  });
  return asset.request;
 }));
}
function clear(scope='battle'){
 const cache=assets[scope];
 for(const asset of cache.values())if(asset.scene)releaseStock(asset.scene);
 cache.clear();
}
function retain(units,scope){
 const cache=assets[scope],wanted=new Set(units.filter(applies).map(assetKey));
 for(const [key,asset] of cache)if(!wanted.has(key)){
  cache.delete(key);if(asset.scene)releaseStock(asset.scene);
 }
 return load(units,scope);
}
function cloneSkin(stock){
 const source=stock.clone(true),nodes=new Map(),skeletons=new Map();
 function map(original,copy){
  nodes.set(original,copy);
  original.children.forEach((child,index)=>map(child,copy.children[index]));
 }
 map(stock,source);
 for(const [original,copy] of nodes){
  if(!original.isSkinnedMesh)continue;
  const skin=original.skeleton;
  if(!skeletons.has(skin))skeletons.set(skin,new T.Skeleton(skin.bones.map(bone=>nodes.get(bone)),skin.boneInverses));
  copy.bind(skeletons.get(skin),original.bindMatrix);
  copy.frustumCulled=false;
 }
 return {source,skeletons};
}

function workshopMounts(sockets){
 const arsenal=root.IronVowProductionArsenal,workshop=root.IronVowWeaponFX,fitted={};
 function remove(side){
  const weapon=fitted[side];
  if(!weapon)return;
  weapon.carrier.remove(weapon.mount);
  for(const material of weapon.ownedMaterials)material.dispose();
  delete fitted[side];
 }
 return {
  fit(side,id,armory){
   if(fitted[side]?.fitId!==id)remove(side);
   if(id&&armory&&!fitted[side]){
    const weapon=arsenal.mount(armory,workshop.get(id).asset??id,sockets[side]);
    if(weapon)fitted[side]={...weapon,carrier:sockets[side],fitId:id};
   }
   return fitted[side];
  },
  dispose(){for(const side of Object.keys(fitted))remove(side);}
 };
}

function createScrubber(source,clips){
 const rest=[];
 source.traverse(node=>rest.push([node,node.position.clone(),node.quaternion.clone(),node.scale.clone()]));
 let mixer;
 function dispose(){
  if(!mixer)return;
  mixer.stopAllAction();mixer.uncacheRoot(source);mixer=null;
 }
 function sample(name,time){
  const clip=clips.find(candidate=>candidate.name===name);
  if(!clip){dispose();return;}
  mixer??=new T.AnimationMixer(source);
  mixer.stopAllAction();
  for(const [node,position,rotation,scale] of rest){
   node.position.copy(position);node.quaternion.copy(rotation);node.scale.copy(scale);
  }
  const action=mixer.clipAction(clip).setLoop(T.LoopOnce,1);
  action.reset().play();action.paused=true;action.time=Math.min(clip.duration,Math.max(0,time));
  mixer.update(0);source.updateMatrixWorld(true);
 }
 return {sample,dispose};
}
async function loadClipArchive(file){
 const {scene,animations}=await new T.GLTFLoader().setMeshoptDecoder(root.MeshoptDecoder)
  .loadAsync(root.IRON_VOW_INLINE_ASSETS?.[file]||file);
 const scrubber=createScrubber(scene,animations);
 scene.traverse(node=>{if(node.isSkinnedMesh)node.frustumCulled=false;});
 return {source:scene,clips:animations,sample:scrubber.sample,dispose(){
  scrubber.dispose();
  const skeletons=new Set();
  scene.traverse(node=>{if(node.isSkinnedMesh)skeletons.add(node.skeleton);});
  for(const skeleton of skeletons)skeleton.boneTexture?.dispose();
  releaseStock(scene);
 }};
}

function build(unit,scope='battle'){
 const key=profileKey(unit),asset=assets[scope].get(assetKey(unit));
 if(!asset?.scene)return null;
 const profile=profiles.get(key);
 if(profile.build)return profile.build(unit,asset.scene.clone(true),asset.animations);
 const {source,skeletons}=cloneSkin(asset.scene);
 const scrubber=scope==='bench'&&asset.animations.length?createScrubber(source,asset.animations):null;
 const body=new T.Group();
 body.name=profile.id+' rig v2';body.add(source);body.updateMatrixWorld(true);
 const nodes=new Map(),drivers=new Map();
 source.traverse(node=>nodes.set(node.name,node));
 const find=name=>nodes.get(T.PropertyBinding.sanitizeNodeName(name));
 function bone(name){
  const node=find(name);
  if(!node)throw Error(profile.id+' rig-v2 joint is missing: '+name);
  return node;
 }
 const at=name=>bone(name).getWorldPosition(V3());
 function driver(name,parent,worldRotation=Q()){
  const authored=bone(name);
  if(profile.canonical)return authored;
  const joint=new T.Group();
  joint.name=name;
  joint.position.copy(parent.worldToLocal(authored.getWorldPosition(V3())));
  joint.quaternion.copy(parent.getWorldQuaternion(Q()).invert().multiply(worldRotation));
  parent.add(joint);joint.updateMatrixWorld(true);
  drivers.set(authored,joint);
  return joint;
 }
 function segment(name,child,parent,axis=V3(0,0,1)){
  if(profile.canonical)return bone(name);
  const up=at(name).sub(at(child)).normalize();
  const forward=axis.clone().addScaledVector(up,-up.dot(axis)).normalize();
  return driver(name,parent,Q().setFromRotationMatrix(new T.Matrix4().makeBasis(up.clone().cross(forward),up,forward)));
 }
 function marker(name,parent,axis=[0,1,0]){
  const authored=bone(name),peg=new T.Object3D();
  peg.name=name;
  const original=authored.getWorldQuaternion(Q());
  // The exported muzzle bones point their +Y down the barrel. Combat aims +Z.
  const forward=V3(...axis).applyQuaternion(original);
  peg.quaternion.copy(parent.getWorldQuaternion(Q()).invert().multiply(Q().setFromUnitVectors(V3(0,0,1),forward)));
  peg.position.copy(parent.worldToLocal(authored.getWorldPosition(V3())));
  parent.add(peg);
  return peg;
 }
 const rest=bone('root').userData,legSides=rest.quad?['LF','RF','LB','RB']:['L','R'];
 const hipRest=at('hip.'+legSides[0]),ankleRest=at('ankle.'+legSides[0]);
 const dims=profile.canonical?{...rest}:{...rest,shX:Math.abs(at('shoulder.L').x),hipY:hipRest.y-at('pelvis').y,
  hipX:Math.abs(hipRest.x),hipZ:Math.abs(hipRest.z),
  up:at('shoulder.L').distanceTo(at('elbow.L')),fo:at('elbow.L').distanceTo(at('wrist.L')),
  so:at('wrist.L').distanceTo(at('socket.L')),walkDrop:.14,...profile.dimensions};
 const pelvis=driver('pelvis',body),spine=driver('spine',pelvis),neck=driver('neck',spine);
 const arms={},legs=[];
 for(const side of ['L','R']){
  const sh=segment('shoulder.'+side,'elbow.'+side,spine);
  const el=segment('elbow.'+side,'wrist.'+side,sh);
  const wr=driver('wrist.'+side,el,el.getWorldQuaternion(Q()));
  const so=driver('socket.'+side,wr,wr.getWorldQuaternion(Q()));
  const paulName=find('Pauldron.'+side)?'Pauldron.'+side:'pauldron.'+side;
  const paul=find(paulName)?driver(paulName,spine):new T.Group();
  arms[side]={sh,el,wr,so,paul};
 }
 // Share the yaw mounts and -Y limb convention from the Foundry quad in chassis.js:133-134.
 if(rest.quad)dims.reach=Math.hypot(ankleRest.x-hipRest.x,ankleRest.z-hipRest.z);
 for(const [i,side] of legSides.entries()){
  const hipName='hip.'+side,kneeName='knee.'+side,ankleName='ankle.'+side;
  const foot=at(ankleName),hipPoint=at(hipName),kneePoint=at(kneeName);
  let parent=pelvis,ankleBasis=Q();
  if(rest.quad){
   // The authored mounts include thigh pitch. Isolate the radial yaw for the leg solver.
   const radial=kneePoint.clone().sub(hipPoint);
   ankleBasis=Q().setFromAxisAngle(V3(0,1,0),Math.atan2(radial.x,radial.z));
   parent=driver('mount.'+side,pelvis,ankleBasis);
  }
  const axis=V3(0,0,1).applyQuaternion(ankleBasis);
  const hip=segment(hipName,kneeName,parent,axis),kn=segment(kneeName,ankleName,hip,axis);
  const an=driver(ankleName,kn,ankleBasis),sign=i===0?1:-1;
  legs.push({hip,kn,an,side,restX:rest.quad?foot.x:sign*dims.restX,restZ:rest.quad?foot.z:dims.restZ,
   toe:rest.quad?0:sign*dims.toe,phase:dims.phases[i],legA:hipPoint.distanceTo(kneePoint),legB:kneePoint.distanceTo(foot)});
 }
 const rig={pelvis,spine,neck,arms,legs,pistons:[],spinners:[]};
 const equipment=profile.setup({source,bone,find,driver,marker,bounds,rig,workshopMounts,animations:asset.animations});
 const parts=Object.fromEntries(R.parts.map(part=>[part,[]])),materials=new Map();
 const boxes=new Map(['neck',...legSides.map(side=>'ankle.'+side),...(equipment.boundsNames||[])].map(name=>[bone(name),new T.Box3()]));
 function bounds(name){
  const joint=bone(name);
  return boxes.get(joint).clone().applyMatrix4(joint.matrixWorld);
 }
 const channels={paint_primary:unit.paint||(unit.team==='enemy'&&!profile.factoryLivery?'#9c3a30':null),
  paint_secondary:unit.trim?.s,paint_accent:unit.trim?.a||(profile.accentInheritsSecondary?unit.trim?.s:null)};
 const paintRole={paint_primary:'p',paint_secondary:'s',paint_accent:'a'};
 source.traverse(mesh=>{
  if(!mesh.isMesh)return;
  // These assemblies use rigid weights or rigid parenting. Bind picking and
  // inspection boxes to their authored owner to follow the rendered pose.
  const weights=mesh.geometry.attributes.skinIndex;
  let owner=mesh.isSkinnedMesh&&weights?.count?mesh.skeleton.bones[weights.getX(0)]:mesh.parent;
  while(owner&&!boxes.has(owner))owner=owner.parent;
  if(owner){
   if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
   const toBone=new T.Matrix4().copy(owner.matrixWorld).invert().multiply(mesh.matrixWorld);
   boxes.get(owner).union(mesh.geometry.boundingBox.clone().applyMatrix4(toBone));
  }
  const original=mesh.material;
  if(!materials.has(original)){
   const material=original.clone();
   if(Object.hasOwn(channels,material.name)){
    const override=channels[material.name];
    if(override)material.color.set(override).convertSRGBToLinear();
    if(!profile.authoredPaint){
     const paint=VC.paint(material.color.clone().convertLinearToSRGB().getHex());
     material.map=material.map||paint.map;
     if(!material.normalMap){
      material.normalMap=paint.normalMap;
      material.normalScale.copy(paint.normalScale).multiplyScalar(.35);
     }
    }
    material.userData.paint=true;material.userData.paintChannel=paintRole[material.name];
   }else if(profile.authoredPaint&&material.name==='visor'){
    if(!material.emissiveIntensity)material.emissiveIntensity=1;
    material.emissive.copy(material.color);
   }
   materials.set(original,material);
  }
  mesh.material=materials.get(original);mesh.castShadow=true;mesh.receiveShadow=true;
  const part=mesh.userData.part||mesh.geometry.userData.part;
  if(!parts[part])throw Error('Missing '+profile.id+' rig-v2 part on '+mesh.name);
  parts[part].push({m:mesh,detach:mesh.userData.detach===true||mesh.geometry.userData.detach===true});
 });
 const ownedMaterials=[...materials.values()];
 function emissive(name){
  const found=ownedMaterials.find(material=>material.name===name);
  if(!found)throw Error('Missing '+profile.id+' rig-v2 material '+name);
  return found;
 }
 const mech=R.createMech({root:body,rig,dims,parts,kits:[],mods:profile.canonical?{core:profile.id,arms:profile.id,legs:profile.id}:{core:profile.id},
  visorMat:emissive('visor'),stackMat:emissive('stack'),ownedMaterials},profile.id,unit.team,unit.upgrade);
 mech.live=profile.id;
 mech.scale=profile.scale??1;mech.cont.scale.setScalar(mech.scale);
 mech.previewSpan=profile.previewSpan;mech.equipmentScale=profile.equipmentScale;
 // Bind a fixed offset from each normalized driver to the authored bone,
 // in hierarchy order. The underlying skin weights and inverse binds stay intact.
 const pairs=[];
 source.traverse(authored=>{
  const joint=drivers.get(authored);
  if(joint)pairs.push({authored,joint,offset:new T.Matrix4().copy(joint.matrixWorld).invert().multiply(authored.matrixWorld)});
 });
 const rams=[];
 for(const side of ['L','R'])for(const name of equipment.rams||[]){
  const a=bone(name+'.'+side+' Housing'),b=bone(name+'.'+side+' Rod');
  rams.push({a,b,restA:a.quaternion.clone(),restB:b.quaternion.clone()});
 }
 const local=new T.Matrix4(),rotation=Q(),parentQ=Q(),delta=Q();
 function pointRam(a,b,rest){
  a.quaternion.copy(rest);
  a.parent.getWorldQuaternion(parentQ);
  rotation.copy(parentQ).multiply(rest);
  const direction=b.getWorldPosition(V3()).sub(a.getWorldPosition(V3())).normalize();
  delta.setFromUnitVectors(V3(0,1,0).applyQuaternion(rotation),direction);
  a.quaternion.copy(parentQ.invert().multiply(delta.multiply(rotation)));
 }
 function sync(){
  mech.cont.updateMatrixWorld(true);
  for(const {authored,joint,offset} of pairs){
   local.copy(authored.parent.matrixWorld).invert().multiply(joint.matrixWorld).multiply(offset);
   local.decompose(authored.position,authored.quaternion,authored.scale);
   authored.updateMatrixWorld(true);
  }
  for(const {a,b,restA,restB} of rams){pointRam(a,b,restA);pointRam(b,a,restB);}
  equipment.afterSync?.();
  source.updateMatrixWorld(true);
 }
 mech.nativeV2={
  source,sync,bounds,clips:asset.animations,scrub:scrubber?.sample,pose:equipment.pose,beforeAnimate:equipment.beforeAnimate,shieldSocket:equipment.shieldSocket,shieldScale:profile.shieldScale,
  jetNozzles:equipment.jetNozzles,dodge:equipment.dodge,
  anchors:equipment.anchors,nativeShield:equipment.nativeShield,meleeSide:equipment.meleeSide,authoredStrike:equipment.authoredStrike,strikeContact:equipment.strikeContact,
  dispose(){
   scrubber?.dispose();equipment.dispose?.();
   for(const skeleton of skeletons.values())skeleton.boneTexture?.dispose();
  }
 };
 return mech;
}

function register(frame,profile){profiles.set(frame,profile);}
root.IronVowRigV2={applies,register,load,retain,build,clear,loadClipArchive,status:(unit,scope='battle')=>assets[scope].get(assetKey(unit))?.status};

function breachSetup({bone,driver,marker,bounds,rig:{arms}}){
  const slide=driver('Cannon Slide',arms.R.wr),slideRest=slide.position.clone();
  const slideForward=V3(0,0,1).applyQuaternion(arms.R.wr.getWorldQuaternion(Q()).invert());
  const primary={id:'morrow',carrier:arms.R.wr,mount:slide,muzzle:marker('muzzle.upper',slide),muzzle2:marker('muzzle.lower',slide),bounds:()=>bounds('Cannon Slide')};
  const shoulder=driver('mount.shoulderR',arms.R.paul);
  const vesper={id:'missile',subsystem:'right',carrier:arms.R.paul,mount:shoulder,muzzle:marker('muzzle.vesper.1',shoulder),muzzle2:marker('muzzle.vesper.2',shoulder),aimPivot:()=>shoulder,bounds:()=>bounds('mount.shoulderR')};
  const cleaver={id:'cleaver',mount:arms.L.so,tip:marker('Cleaver Tip.L',arms.L.so),bounds:()=>bounds('socket.L')};
  const cleaverSocket=bone('socket.L'),shoulderSocket=bone('mount.shoulderR');
  return {
   boundsNames:['Cannon Slide','mount.shoulderR','socket.L'],rams:['Arm ram','Leg ram','Ankle ram'],
   pose(entry,unit,pose){
    entry.primary=primary;
    entry.secondary=unit.melee==='cleaver'&&!unit.shield?cleaver:null;
    entry.shoulderWeapon=['vesper-shoulder','missile'].includes(unit.shoulder)?vesper:null;
    cleaverSocket.visible=unit.alive&&unit.hp.left>0&&Boolean(entry.secondary);
    shoulderSocket.visible=unit.alive&&unit.hp.body>0&&unit.hp.right>0&&Boolean(entry.shoulderWeapon);
    slide.position.copy(slideRest).addScaledVector(slideForward,-Math.abs(pose.recoil)*.22);
    shoulder.quaternion.identity();
   }
  };
}
register(3,{id:'gatecrasher',assetPath:'rig-bench/rig-v2/gatecrasher-r2-reference.glb',setup:breachSetup});
register(20,{id:'shogun',assetPath:'rig-bench/rig-v2/shogun.glb',factoryLivery:true,setup:breachSetup});

register(4,{
 id:'cicada',assetPath:'rig-bench/rig-v2/cicada-reference.glb',
 setup({bone,driver,marker,bounds,workshopMounts,rig:{spine,arms}}){
  const {fit,dispose}=workshopMounts({L:arms.L.so,R:arms.R.so});
  const left=driver('Pod.L',spine),right=driver('Pod.R',spine);
  const leftShell=bone('Pod.L / rigid assembly'),rightShell=bone('Pod.R / rigid assembly');
  const muzzle=marker('muzzle.locust.L',left),muzzle2=marker('muzzle.locust.R',right);
  const locust={id:'locust',subsystem:'right',carrier:spine,mount:left,muzzle,muzzle2,
   aimPivot:peg=>peg.parent,bounds:()=>bounds('Pod.L')};
  const emitter={id:'pulse-bash',mount:arms.L.so,tip:arms.L.so};
  return {
   boundsNames:['Pod.L','Pod.R'],rams:['Arm ram','Leg ram'],
   pose(entry,unit,pose,time,armory){
    const rightMelee=unit.meleeHand==='right',leftMelee=!unit.shield&&!rightMelee?unit.melee:null;
    const handId=unit.weapon==='locust'?null:unit.weapon;
    const hand=fit('R',rightMelee?unit.melee:handId,armory);
    const offhand=fit('L',leftMelee==='pulse-bash'?null:leftMelee,armory);
    if(hand)hand.mount.visible=unit.alive&&unit.hp.right>0;
    if(offhand)offhand.mount.visible=unit.alive&&unit.hp.left>0;
    const online=unit.alive&&unit.hp.body>0,leftOnline=unit.hp.left>0,rightOnline=unit.hp.right>0;
    left.visible=leftShell.visible=online&&leftOnline;
    right.visible=rightShell.visible=online&&rightOnline;
    locust.subsystem=leftOnline?'left':'right';
    locust.mount=leftOnline?left:right;
    locust.muzzle=leftOnline?muzzle:muzzle2;
    locust.muzzle2=rightOnline?muzzle2:locust.muzzle;
    entry.primary=(rightMelee?null:hand)??locust;
    entry.shoulderWeapon=locust;
    entry.secondary=rightMelee?hand:leftMelee==='pulse-bash'?emitter:offhand;
    left.quaternion.identity();
    right.quaternion.identity();
    return (!handId||rightMelee||Boolean(hand))&&(!unit.melee||Boolean(entry.secondary));
   },dispose
  };
 }
});
})(window);
