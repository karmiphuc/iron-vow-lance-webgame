/* Authored Kenney City Kit Industrial 2.0 (CC0), not collision/gameplay geometry.
 * Source/license and unmodified GLB checksums: assets/environment/industrial/manifest.json.
 * Buildings use human door/story proportions at uniform scale; no axis stretching.
 */
(function(root){
'use strict';
const T=root.THREE,sources=new Map(),states=new WeakMap();
const PRESETS={
 relay:[['building-b','north',-.46,9,0],['building-i','north',.37,9,Math.PI],['building-i','east',-.42,8.5,-Math.PI/2],['building-i','west',.42,8.5,Math.PI/2]],
 corridor:[['building-m','north',-.55,9,0],['building-m','north',.5,9,Math.PI],['building-i','east',-.58,9,-Math.PI/2],['building-i','east',.05,8.5,-Math.PI/2],['building-i','west',.42,8.5,Math.PI/2]],
 frontier:[['building-i','north',.22,8.5,Math.PI]]
};
function load(name){
 if(!sources.has(name)){
  const url=new URL('assets/environment/industrial/'+name+'.glb',document.baseURI).href;
  // This cache owns its source resources for the session. Every placed instance
  // owns independent GPU resources, so disposing an old battle cannot poison it.
  sources.set(name,new T.GLTFLoader().loadAsync(url).then(g=>g.scene).catch(error=>{
   throw Error('Unable to load '+name+'.glb'+(error?.message?': '+error.message:''));
  }));
 }
 return sources.get(name);
}
function ownedClone(source,theater){
 const object=source.clone(true),geometries=new Map(),materials=new Map(),textures=new Map();
 const tint=new T.Color(theater==='corridor'?0xbcb1a1:theater==='frontier'?0xacbab5:0xb5bfc4).convertSRGBToLinear();
 const texture=original=>{
  if(!textures.has(original)){const copy=original.clone();copy.needsUpdate=true;textures.set(original,copy);}
  return textures.get(original);
 };
 const material=original=>{
  if(!materials.has(original)){
   const copy=original.clone();if(copy.color)copy.color.multiply(tint);
   copy.roughness=.94;copy.metalness=.035;
   for(const key of Object.keys(copy))if(copy[key]?.isTexture)copy[key]=texture(copy[key]);
   materials.set(original,copy);
  }
  return materials.get(original);
 };
 object.traverse(node=>{
  if(!node.isMesh)return;
  if(!geometries.has(node.geometry))geometries.set(node.geometry,node.geometry.clone());
  node.geometry=geometries.get(node.geometry);
  node.material=Array.isArray(node.material)?node.material.map(material):material(node.material);
  node.castShadow=true;node.receiveShadow=true;
 });
 return object;
}
function place(source,spec,settings,theater){
 const [name,edge,along,scale,yaw]=spec,object=ownedClone(source,theater),group=new T.Group();
 object.updateMatrixWorld(true);
 const original=new T.Box3().setFromObject(object),center=original.getCenter(new T.Vector3());
 object.position.x-=center.x;object.position.y-=original.min.y;object.position.z-=center.z;
 group.add(object);group.scale.setScalar(scale);group.rotation.y=yaw;group.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(group),halfX=settings.width*settings.tile/2,halfZ=settings.depth*settings.tile/2;
 const clearance=1.6;
 if(edge==='north'){group.position.x=along*halfX;group.position.z=-halfZ-clearance-bounds.max.z;}
 else if(edge==='east'){group.position.x=halfX+clearance-bounds.min.x;group.position.z=along*halfZ;}
 else{group.position.x=-halfX-clearance-bounds.max.x;group.position.z=along*halfZ;}
 group.name='industrial-'+name+'-'+edge;
 group.userData.environmentAsset={model:name,theater,edge,scale,clearance};
 group.updateMatrixWorld(true);
 return group;
}
function warehouseCover(source,cover,tile){
 const model=new T.Group(),object=ownedClone(source,'corridor');
 object.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(object),center=bounds.getCenter(new T.Vector3());
 object.position.x-=center.x;object.position.y-=bounds.min.y;object.position.z-=center.z;model.add(object);
 model.updateMatrixWorld(true);cover.updateWorldMatrix(true,false);
 // Account for the existing group's rotation; its transform and blocking cell stay intact.
 const projected=new T.Box3().setFromObject(model).applyMatrix4(cover.matrixWorld),size=projected.getSize(new T.Vector3());
 model.scale.setScalar(tile*.82/Math.max(size.x,size.z));
 model.name='industrial-warehouse-inboard';model.userData.environmentAsset={model:'warehouse-inboard',source:'building-i',theater:'corridor'};
 return model;
}
function cancel(parent){const state=states.get(parent);if(state){state.cancelled=true;state.status='ready';}parent.userData.environmentDisposed=true;}
function populate(parent,settings){
 const existing=states.get(parent);if(existing)return existing.promise;
 const state={status:'loading',error:null,cancelled:false,promise:null};states.set(parent,state);
 const raw=String(settings.theater??'relay').toLowerCase();
 const theater=/corridor|^1$/.test(raw)?'corridor':/frontier|^2$/.test(raw)?'frontier':'relay';
 const specs=PRESETS[theater];
 state.promise=Promise.resolve().then(async()=>{
  if(![settings.width,settings.depth,settings.tile].every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid battlefield dimensions');
  const loaded=await Promise.all(specs.map(spec=>load(spec[0])));
  if(state.cancelled||parent.userData.environmentDisposed)return;
  // Prepare synchronously and append only after every source succeeds; a failed
  // load leaves no partially owned resources for a detached parent to leak.
  const perimeter=specs.map((spec,i)=>place(loaded[i],spec,settings,theater));
  const warehouseSource=loaded[specs.findIndex(spec=>spec[0]==='building-i')];
  const covers=theater==='corridor'?(settings.coverGroups||[]).filter(cover=>{
   const tile=cover.userData.tile;
   return cover.userData.coverType==='cargo'&&tile&&(tile.x+2*tile.z)%3===0;
  }).slice(0,4):[];
  const replacements=covers.map(cover=>({cover,model:warehouseCover(warehouseSource,cover,settings.tile)}));
  for(const building of perimeter)parent.add(building);
  for(const {cover,model} of replacements){
   // Retain retired resources invisibly for the scene's shared-resource disposer.
   // They fit inside the same cargo claim and introduce no additional collision.
   const retired=new T.Group();retired.name='retired-cargo-resources';retired.visible=false;
   for(const child of [...cover.children])retired.add(child);
   cover.add(retired,model);cover.userData.environmentAsset=model.userData.environmentAsset;
   cover.updateWorldMatrix(true,true);cover.userData.bounds=new T.Box3().setFromObject(cover);
  }
  state.status='ready';
 }).catch(error=>{
  if(state.cancelled||parent.userData.environmentDisposed)return;
  state.status='error';state.error='Industrial scenery: '+String(error?.message||error).slice(0,180);
  console.warn(state.error);
 }).finally(()=>{if(state.cancelled||parent.userData.environmentDisposed)state.status='ready';});
 return state.promise;
}
root.IronVowEnvironmentAssets={populate,cancel,status:parent=>states.get(parent)?.status||'ready',error:parent=>states.get(parent)?.error||null};
})(window);
