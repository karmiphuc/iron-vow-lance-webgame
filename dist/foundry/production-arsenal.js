/* The Foundry mounts the production Site arsenal. This file is shared with the offline bake. */
(function(){
'use strict';
const T=window.THREE;
if(!T?.GLTFLoader)return;
const names={rifle:'kestrel',shotgun:'breacher',missile:'vesper',rail:'longbow',
 hailstorm:'hailstorm',rampart:'rampart',breaker:'breaker',cleaver:'cleaver',piledriver:'piledriver',blade:'cleaver'};
const expansion=window.IRON_VOW_EXPANSION_ART??{};
const rigs=window.IRON_VOW_EXPANSION_RIG??{};
const isExpansion=id=>Object.hasOwn(expansion,id);
let arsenal;
function load(source,expansionSource,shieldSource){
 if(!arsenal){
  const loader=new T.GLTFLoader();
  const read=source=>typeof source==='string'?loader.loadAsync(source):
   new Promise((resolve,reject)=>loader.parse(source,'',resolve,reject));
  arsenal=Promise.all([read(source),expansionSource?read(expansionSource).catch(error=>{
   console.warn('Expanded arsenal using baked weapon art',error);
  }):null,shieldSource?read(shieldSource).catch(error=>{
   console.warn('Shield arsenal using baked art',error);
  }):null]).then(([{scene},extra,shields])=>{
   if(extra)scene.add(extra.scene);
   if(shields)scene.add(shields.scene);
   scene.traverse(o=>{if(typeof o.userData.name==='string')o.name=o.userData.name});
   return scene;
  });
 }
 return arsenal;
}
function mountShield(scene,id,socket){
 if(!id||!socket)return null;
 const original=scene.getObjectByName(id);
 if(!original)return null;
 const mount=original.clone(true);
 socket.add(mount);
 const marker=part=>mount.getObjectByName(id+'.'+part);
 return {mount,grip:marker('grip'),face:marker('face'),rotation:new T.Quaternion()};
}
function poseShield(shield,u,heading){
 if(!shield)return;
 shield.mount.visible=u.alive&&u.hp.left>0;
 // Follow the animated grip, holding the armor face upright as the wrist rotates.
 shield.mount.parent.getWorldQuaternion(shield.rotation);
 shield.mount.rotation.set(.09,heading-.17,-.12,'YXZ');
 shield.mount.quaternion.premultiply(shield.rotation.invert());
}
function mount(scene,id,socket){
 const added=isExpansion(id);
 if(!added&&!Object.hasOwn(names,id))return null;
 const original=scene.getObjectByName(added?id:names[id]);
 if(!original)return null;
 const model=original.clone(true),mount=new T.Group(),recoil=new T.Group();
 const marker=part=>added?(model.getObjectByName(id+'.'+part)??model.getObjectByName(T.PropertyBinding.sanitizeNodeName(id+'.'+part))):model.getObjectByName(part);
 const sword=['breaker','cleaver','blade'].includes(id);
 mount.rotation.x=sword?0:Math.PI/2;
 if(id==='blade'){
  model.traverse(o=>{
   if(o.isMesh&&o.material.name==='emissive_edge'){
    o.material=o.material.clone();
    o.material.color.set(0xff7435);o.material.emissive.set(0xff5122);o.material.emissiveIntensity=2.1;
   }
  });
 }
 const grip=marker('grip'),spike=marker('spike'),motion=rigs[id],pivot=motion?marker(motion.node):null;
 const belt=id==='rivet'?marker('belt'):null,chargeMaterials=[];
 if(id==='parallax')model.traverse(o=>{
  if(o.isMesh&&o.material.name==='armory_charge'){
   o.material=o.material.clone();
   chargeMaterials.push(o.material);
  }
 });
 if(added&&grip){
  model.updateMatrixWorld(true);
  model.position.sub(model.worldToLocal(grip.getWorldPosition(new T.Vector3())));
 }
 recoil.add(model);mount.add(recoil);socket.add(mount);
 return {id,model,mount,recoil,grip,axis:marker('axis'),muzzle:marker('muzzle'),
  muzzle2:marker('muzzle2'),tip:marker('tip'),base:marker('base'),spike,spikeRest:spike?.position.z,
  pivot,motion,pivotRest:pivot?(motion.kind==='spin'?pivot.rotation.z:pivot.position.z):0,belt,chargeMaterials};
}
function animate(weapon,{weaponKick=0,weaponSpin=0,weaponFeed=0,weaponCharge=0,strikeProgress=0}={}){
 if(weapon.belt)weapon.belt.position.x=.14*weaponFeed;
 for(const material of weapon.chargeMaterials)material.emissiveIntensity=.2+5.8*weaponCharge;
 if(!weapon.pivot)return;
 const {kind,amount}=weapon.motion;
 const drive=kind==='strike'?Math.max(0,1-Math.abs(strikeProgress-.7)/.16):kind==='spin'?weaponSpin:weaponKick;
 const value=weapon.pivotRest+drive*amount;
 if(kind==='spin')weapon.pivot.rotation.z=value;
 else weapon.pivot.position.z=value;
}
window.IronVowProductionArsenal={load,mount,isExpansion,animate,mountShield,poseShield};
})();
