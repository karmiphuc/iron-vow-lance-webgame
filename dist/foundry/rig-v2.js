/* Rig-v2 skins use the shared Foundry animator and the exported rest pivots.
 * The driver uses -Y down each limb, as in foundry/rigid-adapter.js. Keep the
 * Blender joints in their authored bases for skinning. */
(function(root){
'use strict';
const T=root.THREE,R=root.IronVowFoundryRig,VC=root.VowChassis;
const V3=R.V3,Q=()=>new T.Quaternion();
const assetPath='rig-bench/rig-v2/gatecrasher-r2-reference.glb';
const applies=u=>!u.kind&&!u.lionTrial&&u.frame===3;
let stock,status,generation=0;

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
 if(!units.some(applies))return;
 const current=++generation;
 status='loading';
 const loader=new T.GLTFLoader().setMeshoptDecoder(root.MeshoptDecoder);
 loader.loadAsync(root.IRON_VOW_INLINE_ASSETS?.[assetPath]||assetPath).then(({scene,parser})=>{
  if(current!==generation){releaseStock(scene);return;}
  // This export uses its second UV set on a subset of the base-color maps.
  // The vendored renderer samples all color maps through the primary attribute.
  scene.traverse(mesh=>{
   if(!mesh.isMesh)return;
   const index=parser.associations.get(mesh.material)?.materials;
   const color=parser.json.materials[index]?.pbrMetallicRoughness?.baseColorTexture;
   if(color?.texCoord===1&&mesh.geometry.attributes.uv2){
    mesh.geometry.setAttribute('uv',mesh.geometry.attributes.uv2);
   }
  });
  stock=scene;status='ready';
 }).catch(error=>{
  if(current!==generation)return;
  status='error';console.warn('Gatecrasher rig-v2 load failed',error);
 });
}
function clear(){
 generation++;
 if(stock)releaseStock(stock);
 stock=null;status=undefined;
}
function cloneSkin(){
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
 if(!stock)return null;
 const {source,skeletons}=cloneSkin();
 const body=new T.Group();
 body.name='Gatecrasher rig v2';body.add(source);body.updateMatrixWorld(true);
 const nodes=new Map(),drivers=new Map();
 source.traverse(node=>nodes.set(node.name,node));
 function bone(name){
  const node=nodes.get(T.PropertyBinding.sanitizeNodeName(name));
  if(!node)throw Error('Gatecrasher rig-v2 joint is missing: '+name);
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
 function segment(name,child,parent){
  const up=at(name).sub(at(child)).normalize();
  const forward=V3(0,0,1).addScaledVector(up,-up.z).normalize();
  return driver(name,parent,Q().setFromRotationMatrix(new T.Matrix4().makeBasis(up.clone().cross(forward),up,forward)));
 }
 function marker(name,parent){
  const authored=bone(name),peg=new T.Object3D();
  peg.name=name;
  const original=authored.getWorldQuaternion(Q());
  // The exported muzzle bones point their +Y down the barrel. Combat aims +Z.
  const forward=V3(0,1,0).applyQuaternion(original);
  peg.quaternion.copy(parent.getWorldQuaternion(Q()).invert().multiply(Q().setFromUnitVectors(V3(0,0,1),forward)));
  peg.position.copy(parent.worldToLocal(authored.getWorldPosition(V3())));
  parent.add(peg);
  return peg;
 }
 const dims={...bone('root').userData,shX:Math.abs(at('shoulder.L').x),hipY:at('hip.L').y-at('pelvis').y,
  up:at('shoulder.L').distanceTo(at('elbow.L')),fo:at('elbow.L').distanceTo(at('wrist.L')),
  so:at('wrist.L').distanceTo(at('socket.L')),walkDrop:.14};
 const pelvis=driver('pelvis',body),spine=driver('spine',pelvis),neck=driver('neck',spine);
 const arms={},legs=[];
 for(const [i,side] of ['L','R'].entries()){
  const sh=segment('shoulder.'+side,'elbow.'+side,spine);
  const el=segment('elbow.'+side,'wrist.'+side,sh);
  const wr=driver('wrist.'+side,el,el.getWorldQuaternion(Q()));
  const so=driver('socket.'+side,wr,wr.getWorldQuaternion(Q()));
  const paul=driver('Pauldron.'+side,spine);
  arms[side]={sh,el,wr,so,paul};
  const hip=segment('hip.'+side,'knee.'+side,pelvis),kn=segment('knee.'+side,'ankle.'+side,hip);
  const an=driver('ankle.'+side,kn);
  const sign=i===0?1:-1;
  legs.push({hip,kn,an,side,restX:sign*dims.restX,restZ:dims.restZ,toe:sign*dims.toe,phase:dims.phases[i]});
 }
 const slide=driver('Cannon Slide',arms.R.wr),slideRest=slide.position.clone();
 const slideForward=V3(0,0,1).applyQuaternion(arms.R.wr.getWorldQuaternion(Q()).invert());
 const primary={id:'morrow',carrier:arms.R.wr,mount:slide,muzzle:marker('muzzle.upper',slide),muzzle2:marker('muzzle.lower',slide)};
 const shoulder=driver('mount.shoulderR',arms.R.paul);
 const vesper={id:'vesper',carrier:arms.R.paul,mount:shoulder,muzzle:marker('muzzle.vesper.1',shoulder),muzzle2:marker('muzzle.vesper.2',shoulder)};
 const cleaver={id:'cleaver',mount:arms.L.so,tip:marker('Cleaver Tip.L',arms.L.so)};
 const parts=Object.fromEntries(R.parts.map(part=>[part,[]])),materials=new Map();
 const boxes=new Map(['neck','ankle.L','ankle.R','Cannon Slide','mount.shoulderR'].map(name=>[bone(name),new T.Box3()]));
 function bounds(name){
  const joint=bone(name);
  return boxes.get(joint).clone().applyMatrix4(joint.matrixWorld);
 }
 primary.bounds=()=>bounds('Cannon Slide');
 vesper.bounds=()=>bounds('mount.shoulderR');
 const channels={paint_primary:unit.paint||(unit.team==='enemy'?'#9c3a30':null),paint_secondary:unit.trim?.s,paint_accent:unit.trim?.a};
 source.traverse(mesh=>{
  if(!mesh.isMesh)return;
  // Gatecrasher's mesh assemblies are rigid-weighted. Bind these picking and
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
  if(!parts[part])throw Error('Missing Gatecrasher rig-v2 part on '+mesh.name);
  parts[part].push({m:mesh,detach:mesh.userData.detach===true||mesh.geometry.userData.detach===true});
 });
 const ownedMaterials=[...materials.values()];
 function emissive(name){
  const found=ownedMaterials.find(material=>material.name===name);
  if(!found)throw Error('Missing Gatecrasher rig-v2 material '+name);
  return found;
 }
 const rig={pelvis,spine,neck,arms,legs,pistons:[],spinners:[]};
 const mech=R.createMech({root:body,rig,dims,parts,kits:[],mods:{core:'gatecrasher'},
  visorMat:emissive('visor'),stackMat:emissive('stack'),ownedMaterials},'gatecrasher',unit.team,unit.upgrade);
 mech.live='gatecrasher';
 // Bind a fixed offset from each normalized driver to the authored bone,
 // in hierarchy order. The underlying skin weights and inverse binds stay intact.
 const pairs=[];
 source.traverse(authored=>{
  const joint=drivers.get(authored);
  if(joint)pairs.push({authored,joint,offset:new T.Matrix4().copy(joint.matrixWorld).invert().multiply(authored.matrixWorld)});
 });
 const rams=[];
 for(const side of ['L','R'])for(const name of ['Arm ram','Leg ram','Ankle ram']){
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
  source.updateMatrixWorld(true);
 }
 const cleaverSocket=bone('socket.L'),shoulderSocket=bone('mount.shoulderR');
 mech.nativeV2={
  source,primary,vesper,cleaver,sync,bounds,
  pose(unit,pose){
   cleaverSocket.visible=unit.alive&&unit.hp.left>0&&unit.melee==='cleaver'&&!unit.shield;
   shoulderSocket.visible=unit.alive&&unit.hp.body>0&&unit.shoulder==='vesper-shoulder';
   slide.position.copy(slideRest).addScaledVector(slideForward,-Math.abs(pose.recoil)*.22);
   shoulder.quaternion.identity();
  },
  dispose(){for(const skeleton of skeletons.values())skeleton.boneTexture?.dispose();}
 };
 return mech;
}

root.IronVowRigV2={applies,load,build,clear,get status(){return status;}};
})(window);
