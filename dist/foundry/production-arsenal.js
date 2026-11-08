/* The Foundry mounts the production Site arsenal. This file is shared with the offline bake. */
(function(){
'use strict';
const T=window.THREE;
if(!T?.GLTFLoader)return;
const names={rifle:'kestrel',shotgun:'breacher',missile:'vesper',rail:'longbow',
 hailstorm:'hailstorm',rampart:'rampart',breaker:'breaker',cleaver:'cleaver',piledriver:'piledriver',blade:'cleaver'};
let arsenal;
function load(source){
 if(!arsenal){
  const loader=new T.GLTFLoader();
  const loading=typeof source==='string'?loader.loadAsync(source):
   new Promise((resolve,reject)=>loader.parse(source,'',resolve,reject));
  arsenal=loading.then(({scene})=>{
   scene.traverse(o=>{if(typeof o.userData.name==='string')o.name=o.userData.name});
   return scene;
  });
 }
 return arsenal;
}
function mount(scene,id,socket){
 if(!Object.hasOwn(names,id))return null;
 const original=scene.getObjectByName(names[id]);
 if(!original)return null;
 const model=original.clone(true),mount=new T.Group(),recoil=new T.Group();
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
 const spike=model.getObjectByName('spike');
 recoil.add(model);mount.add(recoil);socket.add(mount);
 return {id,model,mount,recoil,muzzle:model.getObjectByName('muzzle'),
  muzzle2:model.getObjectByName('muzzle2'),tip:model.getObjectByName('tip'),
  base:model.getObjectByName('base'),spike,spikeRest:spike?.position.z};
}
window.IronVowProductionArsenal={load,mount};
})();
