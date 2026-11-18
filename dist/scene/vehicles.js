/* Battle vehicles use the authored miniatures in tools/render_vehicles.py:44-177.
   The exported muzzle/body empties are part of the model, not projected sprite offsets. */
(function(root){
'use strict';
const T=root.THREE, SCALE=2.4, HEIGHT=3.4;
let generation=0, assets=new Map();
function dispose(node){const seen=new Set();node.traverse(o=>{for(const x of [o.geometry,...[o.material].flat()])if(x&&!seen.has(x)){seen.add(x);x.dispose();}});}
function anchor(object,name){let found;object.traverse(o=>{if(o.userData.vehicleAnchor===name)found=o;});return found||object.getObjectByName(name);}
function load(kinds){
 const current=++generation;assets=new Map();
 const loader=new T.GLTFLoader();
 for(const kind of new Set(kinds)){
  const asset={state:'loading'};assets.set(kind,asset);
  const path='assets/vehicles/'+kind+'.glb',source=root.IRON_VOW_INLINE_ASSETS?.[path]||path;
  loader.loadAsync(source).then(g=>{
   if(current!==generation){dispose(g.scene);return;}
   if(!anchor(g.scene,'muzzle')||!anchor(g.scene,'body')){dispose(g.scene);throw Error('Missing body or muzzle anchor');}
   asset.scene=g.scene;asset.state='ready';
  }).catch(error=>{
   if(current!==generation)return;
   asset.state='error';console.warn('Vehicle model failed to load',kind,error);
  });
 }
}
function create(kind){
 const a=assets.get(kind);if(a?.state!=='ready')return null;
 const object=a.scene.clone(true),materials=[],copies=new Map();
 object.scale.setScalar(SCALE);
 object.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(!copies.has(o.material)){const material=o.material.clone();copies.set(o.material,material);materials.push({material,color:material.color.clone()});}o.material=copies.get(o.material);}});
 object.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(object).applyMatrix4(object.matrixWorld.clone().invert());
 return {object,materials,bounds,muzzle:anchor(object,'muzzle'),body:anchor(object,'body')};
}
function update(record,u,t,position,heading,reduced,heightScale=HEIGHT){
 const spec=VEHICLES[u.kind],age=Number.isFinite(u.deathTime)?Math.max(0,t-u.deathTime):Infinity;
 const progress=u.alive?0:reduced?1:Math.min(1,age/spec.wreckAt),lift=spec.altitude*heightScale*(1-progress*progress*(3-2*progress));
 const bob=u.alive&&!reduced&&lift?Math.sin(t*6+u.index)*.045*heightScale:0;
 record.object.position.copy(position);record.object.position.y+=lift+bob;
 const roll=u.kind==='helicopter'&&!reduced?.25*Math.sin(Math.PI*progress)*(1-progress):0;
 record.object.rotation.set(0,heading,roll);
 const factor=u.alive?(u.hp.body/u.max.body<.24?.68:1):.34;
 for(const {material,color} of record.materials)material.color.copy(color).multiplyScalar(factor);
 record.object.updateMatrixWorld(true);
}
function release(record){
 record.object.parent?.remove(record.object);
 for(const {material} of record.materials)material.dispose();
}
function clear(){
 generation++;
 for(const asset of assets.values())if(asset.scene)dispose(asset.scene);
 assets.clear();
}
root.IronVowVehicles={load,create,update,release,clear,status:kind=>assets.get(kind)?.state};
})(window);
