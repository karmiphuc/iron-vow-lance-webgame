/* Real arsenal meshes for the temporary body adapter; UI images use this same
 * geometry through the shared render target. No weapon sheet is composited. */
(function(root){
'use strict';
const T=root.THREE,A=root.IronVowProductionArsenal,V3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const layouts=new Map(),records=new Map(),stock=new Set();let source,version=0,target;
const file=path=>new URL(path,document.baseURI).href;
A.load(file('rig-bench/weapons.glb'),file('rig-bench/expansion-weapons.glb?rev=heavy-ordnance'),file('rig-bench/shields.glb')).then(value=>{
 source=value;source.traverse(o=>{if(o.geometry)stock.add(o.geometry);for(const material of [o.material].flat().filter(Boolean))stock.add(material);});version++;
 root.IronVowBillboards?.invalidate();if(document.querySelector('#nav button'))render();
}).catch(error=>root.IronVowRenderer.fatal(error));
function make(id,shield=false){
 if(!id||!source)return null;const parent=new T.Group();parent.name='adapter.weapon.'+id;const profile=shield?null:root.IronVowWeaponFX.get(id);
 const weapon=shield?A.mountShield(source,id,parent):A.mount(source,profile.asset,parent);
 if(!weapon)return null;
 if(!shield)weapon.mount.quaternion.identity();
 return{parent,weapon,shield,id,bindPosition:weapon.mount.position.clone()};
}
function layout(id,direction,shield=false){
 if(!id)return null;const key=id+'/'+direction;if(layouts.has(key))return layouts.get(key);const item=make(id,shield);if(!item)return null;
 const {parent,weapon}=item,scene=new T.Scene();scene.add(parent);
 scene.add(new T.HemisphereLight(0xe7edf3,0x414b59,2));const sun=new T.DirectionalLight(0xffefdc,2.2);sun.position.set(-4,8,6);scene.add(sun);
 const camera=new T.OrthographicCamera(-1,1,.5,-.5,.01,100),bounds=new T.Box3().setFromObject(parent),center=bounds.getCenter(V3());
 camera.position.copy(center).add(V3(direction===1?6:-6,3,3));camera.lookAt(center);camera.updateMatrixWorld(true);
 const projected=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])projected.push(V3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
 const span=Math.max(Math.max(...projected.map(p=>p.x))-Math.min(...projected.map(p=>p.x)),2*(Math.max(...projected.map(p=>p.y))-Math.min(...projected.map(p=>p.y))))*1.12;
 camera.left=-span/2;camera.right=span/2;camera.top=span/4;camera.bottom=-span/4;camera.updateProjectionMatrix();
 const point=node=>{const p=(node?node.getWorldPosition(V3()):V3()).project(camera);return[(p.x+1)*320,(1-p.y)*160];};
 const result={...item,scene,camera,key:'3d:'+key,pixelsPerMetre:640/span,grip:point(weapon.grip),axis:point(new T.Object3D()),surface:null};
 const axis=V3(0,0,1).project(camera);result.axis=[(axis.x+1)*320,(1-axis.y)*160];
 for(const part of ['muzzle','muzzle2','tip','base','face'])if(weapon[part])result[part]=point(weapon[part]);
 layouts.set(key,result);return result;
}
function image(asset){
 if(asset.surface)return asset.surface;
 const r=root.IronVowRenderer.get();target=target||new T.WebGLRenderTarget(640,320,{depthBuffer:true});target.texture.encoding=T.sRGBEncoding;
 const previous=r.getRenderTarget(),clear=r.getClearColor(new T.Color()),alpha=r.getClearAlpha(),pixels=new Uint8Array(640*320*4);
 try{r.setRenderTarget(target);r.setClearColor(0,0);r.clear();r.render(asset.scene,asset.camera);r.readRenderTargetPixels(target,0,0,640,320,pixels);}
 finally{r.setRenderTarget(previous);r.setClearColor(clear,alpha);}
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=320;const g=canvas.getContext('2d'),data=g.createImageData(640,320);
 for(let y=0;y<320;y++)data.data.set(pixels.subarray((319-y)*640*4,(320-y)*640*4),y*640*4);g.putImageData(data,0,0);asset.surface=canvas;return canvas;
}
function release(item){
 item.parent.parent?.remove(item.parent);item.parent.traverse(o=>{for(const material of [o.material].flat().filter(Boolean))if(!stock.has(material))material.dispose();});
}
function update(u,camera,container,aim){
 let record=records.get(u.id);if(!record){record=new Map();records.set(u.id,record);}
 const requests=root.IronVowBillboards.weaponRequests(u.id),used=new Set();
 for(const request of requests){
  const slot=request.slot||'primary',key=slot+'/'+request.id;used.add(key);let item=record.get(key);
  if(!item){item=make(request.id,slot==='shield');if(!item)continue;record.set(key,item);container.add(item.parent);}
  const grip=root.IronVowBillboards.canvasWorldPoint(u.id,request.grip,camera),pixelAxis={x:request.grip.x+Math.cos(request.angle+Math.atan2(request.asset.axis[1]-request.asset.grip[1],request.asset.axis[0]-request.asset.grip[0])),y:request.grip.y+Math.sin(request.angle+Math.atan2(request.asset.axis[1]-request.asset.grip[1],request.asset.axis[0]-request.asset.grip[0]))};
  const axis=root.IronVowBillboards.canvasWorldPoint(u.id,pixelAxis,camera).sub(grip).normalize();
  item.parent.position.copy(grip);item.parent.scale.setScalar(.9);item.parent.quaternion.identity();
  if(item.shield){item.weapon.mount.position.copy(item.bindPosition);item.weapon.mount.quaternion.copy(camera.quaternion);item.parent.updateMatrixWorld(true);if(item.weapon.grip)item.weapon.mount.position.addScaledVector(item.weapon.grip.getWorldPosition(V3()).sub(grip),-1/.9);}
  else{
   const pose=animationPose(u,clock);item.weapon.mount.quaternion.setFromUnitVectors(V3(0,0,1),axis);
   if(aim&&slot==='primary'&&pose.aim>0)item.weapon.mount.quaternion.slerp(new T.Quaternion().setFromUnitVectors(V3(0,0,1),aim.clone().sub(grip).normalize()),Math.min(1,pose.aim));
   A.animate(item.weapon,pose);
   if(!A.isExpansion(item.weapon.id))item.weapon.recoil.position.z=-Math.abs(pose.recoil)*.22;
  }
  item.parent.visible=u.alive&&u.hp[slot==='primary'?'right':'left']>0;item.parent.updateMatrixWorld(true);
 }
 for(const [key,item] of record)if(!used.has(key)){release(item);record.delete(key);}
}
function attachment(u,part){
 const record=records.get(u.id);if(!record)return null;
 const slot=part==='shield'?'shield':part==='meleeTip'?'secondary':'primary';
 const item=[...record.entries()].find(([key])=>key.startsWith(slot+'/'))?.[1];if(!item)return null;
 const node=part==='meleeTip'?item.weapon.tip:part==='shield'?item.weapon.face:(part==='muzzle2'||part==='shoulderMuzzle2'?item.weapon.muzzle2||item.weapon.muzzle:part==='shoulderMuzzle'?item.weapon.muzzle:item.weapon[part]);return node?.getWorldPosition(V3())||null;
}
function aimAt(u,target){
 const item=[...(records.get(u.id)||[])].find(([key])=>key.startsWith('primary/'))?.[1];
 if(!item?.weapon.muzzle)return null;
 root.IronVowFoundry.aimMounted({cont:item.parent},item.weapon,target,1,item.weapon.mount);
 item.parent.updateMatrixWorld(true);return item.weapon;
}
function clear(){for(const record of records.values())for(const item of record.values())release(item);records.clear();}
root.IronVowAdapterWeapons={layout,image,update,attachment,aimAt,clear,bounds(id){const record=records.get(id),box=new T.Box3();if(record)for(const item of record.values())if(item.parent.visible)box.union(new T.Box3().setFromObject(item.parent));return box.isEmpty()?null:box;},get ready(){return Boolean(source);},get version(){return version;}};
})(window);
