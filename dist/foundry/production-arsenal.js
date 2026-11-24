/* The Foundry mounts the production Site arsenal. This file is shared with the offline bake. */
(function(){
'use strict';
const T=window.THREE;
if(!T?.GLTFLoader)return;
const names={rifle:'kestrel',shotgun:'breacher',missile:'vesper',rail:'longbow',
 hailstorm:'hailstorm',rampart:'rampart',breaker:'breaker',cleaver:'cleaver',piledriver:'piledriver',blade:'cleaver'};
// GLB node names are independent of the temporary 2D weapon-art metadata.
const expansion=new Set(['sidewinder','trident','forge','ember','watchman','falcon',
 'cerberus','obelisk','hatchet','pike','tonfa','anchor-hammer','rivet','parallax','salt-mg']);
const rigs=window.IRON_VOW_EXPANSION_RIG??{};
const meleeStyles={
 cleaver:'sweep',blade:'sweep',hatchet:'sweep',breaker:'maul','anchor-hammer':'maul',
 piledriver:'thrust',pike:'thrust',tonfa:'thrust'
};
const isExpansion=id=>expansion.has(id);
const assetNodeName=id=>isExpansion(id)?id:Object.hasOwn(names,id)?names[id]:undefined;
let arsenal;
function load(source,expansionSource,shieldSource,saltGunSource){
 if(!arsenal){
  const loader=new T.GLTFLoader();
  const read=source=>typeof source==='string'?loader.loadAsync(source):
   new Promise((resolve,reject)=>loader.parse(source,'',resolve,reject));
  arsenal=Promise.all([read(source),expansionSource?read(expansionSource).catch(error=>{
   console.warn('Expanded arsenal GLB failed to load',error);
  }):null,shieldSource?read(shieldSource).catch(error=>{
   console.warn('Shield arsenal GLB failed to load',error);
  }):null,saltGunSource?read(saltGunSource).catch(error=>{
   console.warn('Salt Works MG model failed to load',error);
  }):null]).then(([{scene},extra,shields,saltGun])=>{
   if(saltGun)scene.add(saltGun.scene);
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
 const mount=new T.Group(),model=original.clone(true);
 const marker=part=>model.getObjectByName(id+'.'+part)
  ??model.getObjectByName(T.PropertyBinding.sanitizeNodeName(id+'.'+part));
 // The shield roots are authored at the grip. Grow the face while retaining
 // its depth and arm clearance; chassis-specific fit scales apply to the mount.
 const size=id==='citadel-shield'?2.25:2;
 const grip=marker('grip'),face=marker('face');
 const hardware=model.children.filter(part=>/Arm.?saddle|Grip.?lug|Insulated.?handgrip/i.test(part.name));
 mount.add(model,grip,...hardware);
 model.scale.x*=size;model.scale.y*=size;
 socket.add(mount);
 return {mount,grip,face,rotation:new T.Quaternion()};
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
 const name=assetNodeName(id);
 if(!name)return null;
 const original=scene.getObjectByName(name);
 if(!original)return null;
 const model=original.clone(true),mount=new T.Group(),recoil=new T.Group(),ownedMaterials=[];
 const marker=part=>added?(model.getObjectByName(id+'.'+part)??model.getObjectByName(T.PropertyBinding.sanitizeNodeName(id+'.'+part))):model.getObjectByName(part);
 const sword=['breaker','cleaver','blade'].includes(id);
 mount.rotation.x=sword?0:Math.PI/2;
 if(id==='blade'){
  model.traverse(o=>{
   if(o.isMesh&&o.material.name==='emissive_edge'){
    o.material=o.material.clone();
    ownedMaterials.push(o.material);
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
   ownedMaterials.push(o.material);
  }
 });
 if(added&&grip){
  model.updateMatrixWorld(true);
  model.position.sub(model.worldToLocal(grip.getWorldPosition(new T.Vector3())));
 }
 recoil.add(model);mount.add(recoil);socket.add(mount);
 return {id,model,mount,recoil,grip,gripPitch:mount.rotation.x,meleeStyle:meleeStyles[id],axis:marker('axis'),muzzle:marker('muzzle'),
  muzzle2:marker('muzzle2'),tip:marker('tip'),base:marker('base'),spike,spikeRest:spike?.position.z,
  pivot,motion,pivotRest:pivot?(motion.kind==='spin'?pivot.rotation.z:pivot.position.z):0,belt,chargeMaterials,ownedMaterials};
}
// Work with the actual grip-to-tip vector. The stock, expansion and Aero
// exports do not share the same forward axis or rest transform.
function meleeBasis(forward,right,rotation){
 right.addScaledVector(forward,-right.dot(forward)).normalize();
 const up=new T.Vector3().crossVectors(forward,right);
 return rotation.setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward));
}
function poseMelee(weapon,side,heading,progress,target){
 if(!weapon?.meleeStyle||!weapon.tip||!weapon.mount.visible)return;
 const {mount,grip,tip,base,meleeStyle}=weapon;
 const breaker=weapon.id==='breaker'&&Boolean(base);
 if(!weapon.gripBasis){
  const localPoint=node=>mount.worldToLocal(node.getWorldPosition(new T.Vector3()));
  const pivot=localPoint(grip??mount);
  const shaft=localPoint(tip).sub(pivot).normalize();
  // The Breaker's impact shoe is offset from its haft. Use the actual head
  // and haft plane to keep the teeth on the leading face of the drop.
  const up=breaker?localPoint(base).sub(pivot):new T.Vector3(0,1,0);
  const right=up.cross(shaft).normalize();
  weapon.gripBasis=meleeBasis(shaft,right,new T.Quaternion()).invert();
 }
 const sign=side==='L'?1:-1,ram=meleeStyle==='thrust',maul=meleeStyle==='maul';
 const sine=Math.sin(heading),cosine=Math.cos(heading);
 const right=new T.Vector3(cosine,0,-sine);
 const facing=new T.Vector3(sine,0,cosine);
 const carry=new T.Vector3(0,breaker?.82:ram?.14:.69,0).addScaledVector(right,sign*.22)
  .addScaledVector(facing,breaker?.52:ram?.96:.69).normalize();
 const wind=new T.Vector3(0,breaker?.79:ram?.24:.93,0).addScaledVector(right,sign*(ram?.32:maul?.24:.62))
  .addScaledVector(facing,ram?.88:breaker?-.53:maul?-.34:.12).normalize();
 if(progress>0){
  const contact=target?target.clone().sub(mount.getWorldPosition(new T.Vector3())):facing.clone();
  if(contact.lengthSq()<1e-6)contact.copy(facing);
  contact.normalize();
  const blend=(from,to)=>{const q=Math.min(1,Math.max(0,(progress-from)/(to-from)));return q*q*(3-2*q);};
  if(breaker&&progress>.7){
   // Let the head finish the downswing before the wrist lifts back to guard.
   const follow=contact.clone().addScaledVector(new T.Vector3(0,1,0),-.46).addScaledVector(right,sign*.10).normalize();
   if(progress<=.81)carry.copy(contact).lerp(follow,blend(.70,.81));
   else carry.lerp(follow,1-blend(.81,1));
  }else if(progress<=.52)carry.lerp(wind,blend(0,.52));
  else if(progress<=.81)carry.copy(wind).lerp(contact,blend(.52,.70));
  else carry.lerp(contact,1-blend(.81,1));
 }
 carry.normalize();
 // Use the chassis lateral axis to keep roll continuous when the blade is raised.
 // A close target can be directly beside the fist, so keep a second reference.
 if(Math.abs(right.dot(carry))>.98)right.set(0,1,0).cross(carry).normalize();
 const rotation=meleeBasis(carry,right,new T.Quaternion()).multiply(weapon.gripBasis);
 mount.quaternion.copy(mount.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotation));
}
function animate(weapon,{weaponKick=0,weaponSpin=0,weaponFeed=0,weaponCharge=0,strikeProgress=0}={}){
 if(weapon.spike)weapon.spike.position.z=weapon.spikeRest+(strikeProgress>=.61&&strikeProgress<=.81?.5:0);
 if(weapon.belt)weapon.belt.position.x=weapon.motion.feedTravel*weaponFeed;
 for(const material of weapon.chargeMaterials)material.emissiveIntensity=.2+5.8*weaponCharge;
 if(!weapon.pivot)return;
 const {kind,amount}=weapon.motion;
 const drive=kind==='strike'?Math.max(0,1-Math.abs(strikeProgress-.7)/.16):kind==='spin'?weaponSpin:weaponKick;
 const value=weapon.pivotRest+drive*amount;
 if(kind==='spin')weapon.pivot.rotation.z=value;
 else weapon.pivot.position.z=value;
}
window.IronVowProductionArsenal={load,mount,isExpansion,assetNodeName,animate,mountShield,poseShield,poseMelee};
})();
