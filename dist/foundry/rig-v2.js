/* Rig-v2 skins use the shared Foundry animator and the exported rest pivots.
 * The driver uses -Y down each limb, as in foundry/rigid-adapter.js. Keep the
 * Blender joints in their authored bases for skinning. */
(function(root){
'use strict';
const T=root.THREE,R=root.IronVowFoundryRig,VC=root.VowChassis;
const V3=R.V3,Q=()=>new T.Quaternion();
const profiles=new Map(),assets=new Map();
const profileKey=u=>u.lionTrial?'lion':u.frame;
const applies=u=>!u.kind&&profiles.has(profileKey(u));
let generation=0;

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
function load(units){
 const current=generation;
 const loader=new T.GLTFLoader().setMeshoptDecoder(root.MeshoptDecoder);
 for(const frame of new Set(units.filter(applies).map(profileKey))){
  if(assets.has(frame))continue;
  const {id,assetPath}=profiles.get(frame),asset={status:'loading'};
  assets.set(frame,asset);
  loader.loadAsync(root.IRON_VOW_INLINE_ASSETS?.[assetPath]||assetPath).then(({scene,parser,animations})=>{
   if(current!==generation){releaseStock(scene);return;}
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
  }).catch(error=>{
   if(current!==generation)return;
   asset.status='error';console.warn(id+' rig-v2 load failed',error);
  });
 }
}
function clear(){
 generation++;
 for(const asset of assets.values())if(asset.scene)releaseStock(asset.scene);
 assets.clear();
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

function build(unit){
 const key=profileKey(unit),asset=assets.get(key);
 if(!asset?.scene)return null;
 const profile=profiles.get(key);
 const {source,skeletons}=cloneSkin(asset.scene);
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
  const authored=bone(name),joint=new T.Group();
  joint.name=name;
  joint.position.copy(parent.worldToLocal(authored.getWorldPosition(V3())));
  joint.quaternion.copy(parent.getWorldQuaternion(Q()).invert().multiply(worldRotation));
  parent.add(joint);joint.updateMatrixWorld(true);
  drivers.set(authored,joint);
  return joint;
 }
 function segment(name,child,parent,axis=V3(0,0,1)){
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
 const dims={...rest,shX:Math.abs(at('shoulder.L').x),hipY:hipRest.y-at('pelvis').y,
  hipX:Math.abs(hipRest.x),hipZ:Math.abs(hipRest.z),
  up:at('shoulder.L').distanceTo(at('elbow.L')),fo:at('elbow.L').distanceTo(at('wrist.L')),
  so:at('wrist.L').distanceTo(at('socket.L')),walkDrop:.14};
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
 const equipment=profile.setup({source,bone,find,driver,marker,bounds,rig,animations:asset.animations});
 const parts=Object.fromEntries(R.parts.map(part=>[part,[]])),materials=new Map();
 const boxes=new Map(['neck',...legSides.map(side=>'ankle.'+side),...(equipment.boundsNames||[])].map(name=>[bone(name),new T.Box3()]));
 function bounds(name){
  const joint=bone(name);
  return boxes.get(joint).clone().applyMatrix4(joint.matrixWorld);
 }
 const channels={paint_primary:unit.paint||(unit.team==='enemy'&&!profile.factoryLivery?'#9c3a30':null),paint_secondary:unit.trim?.s,paint_accent:unit.trim?.a};
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
    const paint=VC.paint(material.color.clone().convertLinearToSRGB().getHex());
    material.map=material.map||paint.map;
    if(!material.normalMap){
     material.normalMap=paint.normalMap;
     material.normalScale.copy(paint.normalScale).multiplyScalar(.35);
    }
    material.userData.paint=true;
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
 const mech=R.createMech({root:body,rig,dims,parts,kits:[],mods:{core:profile.id},
  visorMat:emissive('visor'),stackMat:emissive('stack'),ownedMaterials},profile.id,unit.team,unit.upgrade);
 mech.live=profile.id;
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
  source,sync,bounds,pose:equipment.pose,shieldSocket:equipment.shieldSocket,
  jetNozzles:equipment.jetNozzles,dodge:equipment.dodge,
  anchors:equipment.anchors,authoredStrike:equipment.authoredStrike,strikeContact:equipment.strikeContact,
  dispose(){
   equipment.dispose?.();
   for(const skeleton of skeletons.values())skeleton.boneTexture?.dispose();
  }
 };
 return mech;
}

function register(frame,profile){profiles.set(frame,profile);}
root.IronVowRigV2={applies,register,load,build,clear,status:unit=>assets.get(profileKey(unit))?.status};

register(3,{
 id:'gatecrasher',assetPath:'rig-bench/rig-v2/gatecrasher-r2-reference.glb',
 setup({bone,driver,marker,bounds,rig:{arms}}){
  const slide=driver('Cannon Slide',arms.R.wr),slideRest=slide.position.clone();
  const slideForward=V3(0,0,1).applyQuaternion(arms.R.wr.getWorldQuaternion(Q()).invert());
  const primary={id:'morrow',carrier:arms.R.wr,mount:slide,muzzle:marker('muzzle.upper',slide),muzzle2:marker('muzzle.lower',slide),bounds:()=>bounds('Cannon Slide')};
  const shoulder=driver('mount.shoulderR',arms.R.paul);
  const vesper={id:'vesper',subsystem:'body',carrier:arms.R.paul,mount:shoulder,muzzle:marker('muzzle.vesper.1',shoulder),muzzle2:marker('muzzle.vesper.2',shoulder),aimPivot:()=>shoulder,bounds:()=>bounds('mount.shoulderR')};
  const cleaver={id:'cleaver',mount:arms.L.so,tip:marker('Cleaver Tip.L',arms.L.so)};
  const cleaverSocket=bone('socket.L'),shoulderSocket=bone('mount.shoulderR');
  return {
   boundsNames:['Cannon Slide','mount.shoulderR'],rams:['Arm ram','Leg ram','Ankle ram'],
   pose(entry,unit,pose){
    entry.primary=primary;
    entry.secondary=unit.melee==='cleaver'&&!unit.shield?cleaver:null;
    entry.shoulderWeapon=unit.shoulder==='vesper-shoulder'?vesper:null;
    cleaverSocket.visible=unit.alive&&unit.hp.left>0&&Boolean(entry.secondary);
    shoulderSocket.visible=unit.alive&&unit.hp.body>0&&Boolean(entry.shoulderWeapon);
    slide.position.copy(slideRest).addScaledVector(slideForward,-Math.abs(pose.recoil)*.22);
    shoulder.quaternion.identity();
   }
  };
 }
});

register(4,{
 id:'cicada',assetPath:'rig-bench/rig-v2/cicada-reference.glb',
 setup({driver,marker,bounds,rig:{spine,arms}}){
  const left=driver('Pod.L',spine),right=driver('Pod.R',spine);
  const muzzle=marker('muzzle.locust.L',left),muzzle2=marker('muzzle.locust.R',right);
  const locust={id:'locust',carrier:spine,mount:left,muzzle,muzzle2,
   aimPivot:peg=>peg.parent,bounds:()=>bounds('Pod.L')};
  const emitter={id:'pulse-bash',mount:arms.L.so,tip:arms.L.so};
  return {
   boundsNames:['Pod.L','Pod.R'],rams:['Arm ram','Leg ram'],
   pose(entry){
    entry.primary=entry.shoulderWeapon=locust;
    entry.secondary=emitter;
    left.quaternion.identity();
    right.quaternion.identity();
   }
  };
 }
});
})(window);
