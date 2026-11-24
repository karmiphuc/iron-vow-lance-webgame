/* Battle vehicles use the authored miniatures in tools/render_vehicles.py:44-177.
   The exported muzzle/body empties are part of the model, not projected sprite offsets. */
(function(root){
'use strict';
const T=root.THREE, SCALE=2.4, HEIGHT=3.4;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>x*x*(3-2*x);
const angle=x=>Math.atan2(Math.sin(x),Math.cos(x));
let generation=0, assets=new Map();
function dispose(node){const seen=new Set();node.traverse(o=>{for(const x of [o.geometry,...[o.material].flat()])if(x&&!seen.has(x)){seen.add(x);x.dispose();}});}
function anchor(object,name){let found;object.traverse(o=>{if(o.userData.vehicleAnchor===name)found=o;});return found||object.getObjectByName(name);}
function load(kinds){
 const current=++generation;assets=new Map();
 const loader=new T.GLTFLoader();
 for(const kind of new Set(kinds)){
  const asset={state:'loading'};assets.set(kind,asset);
  const path='assets/vehicles/'+kind+'.glb',source=root.IRON_VOW_INLINE_ASSETS?.[path]||path+'?rev=vehicle-motion-1';
  loader.loadAsync(source).then(g=>{
   if(current!==generation){dispose(g.scene);return;}
   if(!anchor(g.scene,'muzzle')||!anchor(g.scene,'body')){dispose(g.scene);throw Error('Missing body or muzzle anchor');}
   const joints=new Set();
   g.scene.traverse(node=>joints.add(node.userData.vehicleJoint));
   const required=kind==='tank'?['turret','gun','slide','wheel']:['gun','slide','rotor','tailRotor'];
   if(required.some(role=>!joints.has(role))){dispose(g.scene);throw Error('Missing vehicle motion joints');}
   asset.scene=g.scene;asset.state='ready';
  }).catch(error=>{
   if(current!==generation)return;
   asset.state='error';console.warn('Vehicle model failed to load',kind,error);
  });
 }
}
function create(kind){
 const a=assets.get(kind);if(a?.state!=='ready')return null;
 const object=a.scene.clone(true),materials=[],copies=new Map(),joints={},wheels=[];
 object.scale.setScalar(SCALE);
 object.traverse(o=>{
  const role=o.userData.vehicleJoint;
  if(role==='wheel')wheels.push(o);
  else if(role)joints[role]=o;
  if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(!copies.has(o.material)){const material=o.material.clone();copies.set(o.material,material);materials.push({material,color:material.color.clone()});}o.material=copies.get(o.material);}});
 object.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(object).applyMatrix4(object.matrixWorld.clone().invert());
 return {object,materials,bounds,joints,wheels,slideRest:joints.slide.position.z,
  muzzle:anchor(object,'muzzle'),body:anchor(object,'body'),lastPosition:new T.Vector3(),travel:0,aimYaw:0,aimPitch:0,flightYaw:0};
}
function update(record,u,t,position,heading,reduced,heightScale=HEIGHT,presentation){
 const {object,joints,wheels}=record,air=u.kind==='helicopter',spec=VEHICLES[u.kind];
 const dt=record.time==null?0:Math.max(0,Math.min(.1,t-record.time));
 if(record.time!==t){
  if(record.time!=null&&u.alive&&u.motion&&!reduced){
   record.travel+=Math.hypot(position.x-record.lastPosition.x,position.z-record.lastPosition.z);
  }
  record.lastPosition.copy(position);record.time=t;
 }
 const age=Number.isFinite(u.deathTime)?Math.max(0,t-u.deathTime):Infinity;
 const progress=u.alive?0:reduced?1:clamp(age/spec.wreckAt);
 const lift=spec.altitude*heightScale*(1-smooth(progress));
 const bob=u.alive&&!reduced&&lift?Math.sin(t*5+u.index)*.045*heightScale:0;
 object.position.copy(position);object.position.y+=lift+bob;

 const target=u.alive?presentation?.target:null,attack=u.attack;
 const acquire=target?(reduced||Number.isFinite(attack.fireAt)?1:smooth(clamp((t-attack.start)/Math.max(.06,(attack.windup??.25)*.74)))):0;
 const kick=u.alive&&!reduced?Math.abs(presentation?.recoil??0):0;
 const impact=u.alive&&!reduced?Math.abs(presentation?.impact??0):0;
 const drift=u.alive&&!reduced&&Boolean(u.motion);
 const flightYaw=target?angle(Math.atan2(target.x-position.x,target.z-position.z)-heading)*acquire:
  record.flightYaw*Math.exp(-dt*7)||0;
 record.flightYaw=u.alive&&air?flightYaw:0;
 const pitch=air?(drift?.16:.023*Math.sin(t*3+u.index))*(1-acquire)+kick*.036:
  (drift?.022*Math.sin(record.travel*2.2):0)-kick*.06;
 const roll=air?(drift?.10*Math.sin(t*4+u.index):.028*Math.sin(t*2+u.index))*(1-acquire)+impact*.10:
  (drift?.018*Math.sin(record.travel*3.1):0)+impact*.045;
 const fallBank=air&&progress>0&&progress<1?.64*Math.sin(Math.PI*progress):0;
 object.rotation.set(u.alive&&!reduced?pitch:0,heading+record.flightYaw,u.alive&&!reduced?roll:fallBank,'YXZ');
 object.updateMatrixWorld(true);

 if(target){
  if(joints.turret){
   const local=object.worldToLocal(target.clone()).sub(joints.turret.position);
   record.aimYaw=angle(Math.atan2(local.x,local.z))*acquire;
   joints.turret.rotation.y=record.aimYaw;
   joints.turret.updateMatrixWorld(true);
  }
  const local=joints.gun.parent.worldToLocal(target.clone()).sub(joints.gun.position);
  record.gunYaw=Math.atan2(local.x,local.z)*acquire;
  record.aimPitch=-Math.atan2(local.y,Math.hypot(local.x,local.z))*acquire;
 }else{
  const recovery=u.alive&&!reduced?Math.exp(-dt*7):0;
  record.aimYaw*=recovery;record.aimPitch*=recovery;record.gunYaw=(record.gunYaw??0)*recovery;
  if(joints.turret)joints.turret.rotation.y=record.aimYaw;
 }
 joints.gun.rotation.set(record.aimPitch,record.gunYaw??0,0,'YXZ');
 joints.slide.position.z=record.slideRest-Math.min(1,kick)*(air?.08:.24);
 for(const wheel of wheels)wheel.rotation.x=record.travel/(SCALE*.086);
 if(air&&!reduced){
  // Integrate a linear spin-down analytically so the blades stop on a settled wreck.
  const spinTime=u.alive?t:Math.min(t,u.deathTime??t)+spec.wreckAt*(progress-.5*progress*progress);
  joints.rotor.rotation.y=spinTime*24;
  joints.tailRotor.rotation.x=-spinTime*41;
 }
 const factor=u.alive?(u.hp.body/u.max.body<.24?.68:1):.34;
 for(const {material,color} of record.materials)material.color.copy(color).multiplyScalar(factor);
 object.updateMatrixWorld(true);
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
