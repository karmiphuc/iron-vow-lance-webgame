/* BST-04 uses rigid glTF animation, with production weapons attached to its authored hand sockets. */
(function(){
'use strict';
const T=window.THREE, arsenal=window.IronVowProductionArsenal;
if(!T?.GLTFLoader)return;
const path='rig-bench/bastion-bst04.glb',carbinePath='rig-bench/bastion-carbine.glb',meleePath='rig-bench/bastion-melee.glb';
let asset, pending;
function load(){
 if(!pending){
  const url=file=>window.IRON_VOW_INLINE_ASSETS?.[file]||file+'?rev=weapon-sockets';
  const loader=new T.GLTFLoader();
  pending=Promise.all([path,carbinePath,meleePath].map(file=>loader.loadAsync(url(file)))).then(([data,carbine,melee])=>{
   if(!data.animations.length)throw Error('BST-04 combat animation missing');
   melee.scene.traverse(o=>{if(o.userData.bastion_socket)o.name=o.userData.bastion_socket});
   const tracks=data.animations.flatMap(clip=>clip.tracks);
   asset={...data,carbine:carbine.scene,melee:melee.scene,clip:new T.AnimationClip('BST-04 Combat',-1,tracks),
    start:Math.min(...tracks.map(track=>track.times[0]))};
   window.dispatchEvent(new window.Event('bastion-art-ready'));
  }).catch(error=>console.warn('Bastion using still art',error));
 }
 return pending;
}
const name=(root,id)=>root.getObjectByName(T.PropertyBinding.sanitizeNodeName(id));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const points=['body','pilot','right','left','legs'];
const base=t=>new T.Color(t).convertSRGBToLinear();
function build(){
 if(!asset){load();return null}
 const cont=new T.Group(),body=asset.scene.clone(true),mixer=new T.AnimationMixer(body);
 cont.add(body);
 const action=mixer.clipAction(asset.clip);
 action.play();action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;
 const materials=new Map();
 body.traverse(o=>{
  if(!o.isMesh)return;
  const region=o.parent.userData.part||o.userData.part;
  const old=o.material,k=old.uuid+'|'+region;
  if(!materials.has(k)){
   const mat=old.clone();
   materials.set(k,{mat,original:old.color.clone(),name:old.name,region});
  }
  const next=materials.get(k);
  o.material=next.mat;
 });
 return {cont,body,mixer,action,materials,root:name(body,'ROOT'),weapon:null,
  sockets:{R:name(body,'BastionGrip.R'),gun:name(body,'BastionGunPivot.R'),L:name(body,'BastionGrip.L'),ram:name(body,'BastionRamGrip.L')},
  anchors:Object.fromEntries([...points.map(k=>[k,name(body,'BastionPart.'+k)]),
    ['leadFoot',name(body,'BastionLeadFoot')],['pod1',name(body,'MissileSocket.01')],['pod2',name(body,'MissileSocket.04')]])};
}





// The authored GLB is bound to the same measured-pivot animator as the live Warden.
// This runtime adapter remains until Phase 3 exports the contract into the GLB itself.
function buildRuntime(team,paint,trim){
 const authored=build();if(!authored)return null;
 authored.mixer.setTime(asset.start+56/24);authored.body.updateMatrixWorld(true);
 const names={Painted_Warden:'ROOT',Bench_ROOT:'ROOT',Bench_Pelvis:'Pelvis',Bench_Torso:'Chest',Bench_Optics:'Cockpit'};
 for(const side of ['L','R'])Object.assign(names,{['Bench_Hip_'+side]:'Thigh.'+side,['Bench_Knee_'+side]:'Shin.'+side,['Bench_Foot_'+side]:'Foot.'+side,
  ['Bench_Pauldron_'+side]:'Pauldron.'+side,['Bench_Shoulder_'+side]:'UpperArm.'+side,['Bench_Elbow_'+side]:'Forearm.'+side,['Bench_Hand_'+side]:'Hand.'+side,['GripContact_'+side]:'BastionGrip.'+side});
 const extraOwners=rig=>{
  const owners={},pistons=[],nodes=[];authored.body.traverse(o=>{if(!o.isMesh&&/^Piston.*cylinder/.test(o.name))nodes.push(o);});
  const bias=(a,b,q)=>{const temp=new T.Object3D();temp.position.copy(a);temp.lookAt(b);return temp.quaternion.invert().multiply(q);};
  for(const source of nodes){
   const other=authored.body.getObjectByName(source.name.replace('cylinder','sliding_rod'));if(!other)throw Error('Bastion piston pair missing: '+source.name);
   const side=/_[L][12]?_/.test(source.name)?'L':'R',leg=rig.legs[side==='L'?0:1],arm=rig.arms[side];
   const ankle=/ankle/.test(source.name),knee=/knee/.test(source.name),elbow=/elbow/.test(source.name);
   const boneA=ankle?leg.kn:knee?leg.hip:elbow?arm.sh:rig.pelvis,boneB=ankle?leg.an:knee?leg.kn:elbow?arm.el:rig.spine;
   const pa=source.getWorldPosition(new T.Vector3()),pb=other.getWorldPosition(new T.Vector3()),qa=source.getWorldQuaternion(new T.Quaternion()),qb=other.getWorldQuaternion(new T.Quaternion());
   const a=new T.Group(),b=new T.Group();a.position.copy(pa);a.quaternion.copy(qa);b.position.copy(pb);b.quaternion.copy(qb);rig.root.add(a,b);rig.root.updateMatrixWorld(true);boneA.attach(a);boneB.attach(b);
   owners[source.name]=a;owners[other.name]=b;pistons.push({a,b,biasA:bias(pa,pb,qa),biasB:bias(pb,pa,qb)});
  }
  return {owners,pistons};
 };
 const result=window.IronVowRigidAdapter.build({source:authored.body,id:'bastion',team,paint,trim,names,refModel:2,dims:window.VowChassis.DIMS[2],measuredStance:true,options:{scale:1},extraOwners,
  materialRole:m=>/bone ceramic|Warm face/.test(m.name)?'p':/Blue charcoal/.test(m.name)?'s':/Safety amber/.test(m.name)?'a':/Lime optics/.test(m.name)?'visor':/White-hot exhaust/.test(m.name)?'stack':null,
  partOf:name=>/Piston/.test(name||'')?(/ankle|knee/.test(name)?'legs':/elbow/.test(name)?(/_L_/.test(name)?'left':'right'):'body'):null});
 authored.mixer.stopAllAction();authored.mixer.uncacheRoot(authored.body);for(const {mat} of authored.materials.values())mat.dispose();
 return result;
}
window.IronVowBastion={buildRuntime,afterAnimate:m=>window.IronVowRigidAdapter.afterAnimate(m)};
})();
