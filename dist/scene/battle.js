/* Shared battle scene. Game state owns rules and movement; this module owns presentation. */
(function(root){
'use strict';
const T=root.THREE,V3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),TILE=3.4;
const LIVE=new Set([0,5,6,7,8,9,10,12]);
let renderer,kit,scene,camera,battleRef,board,units,overlays,selection,targetRing,sun,pathGroup;
let cameraReady=false,lightningAt=4,lightning=0;
const models=new Map(),aimTargets=new Map(),groundMeshes=[],coverMeshes=[];
const raycaster=new T.Raycaster(),pointer=new T.Vector2(),plane=new T.Plane(V3(0,1,0),0);
const cameraTarget=V3(),cameraPosition=V3();
function isLive(u){return !u.kind&&LIVE.has(u.frame);}
function world(x,z,y){
 const size=battle.size;
 return V3((x-(size.width-1)/2)*TILE,y??terrainHeight(x,z)*TILE,(z-(size.depth-1)/2)*TILE);
}
function groundAt(x,z){return terrainHeight(x/TILE+(battle.size.width-1)/2,z/TILE+(battle.size.depth-1)/2)*TILE;}
function disposeTree(node){
 const seen=new Set();node.traverse(o=>{
  if(o.geometry&&!seen.has(o.geometry)){seen.add(o.geometry);o.geometry.dispose();}
  for(const material of [o.material].flat().filter(Boolean))if(!seen.has(material)){
   seen.add(material);for(const key of ['map','roughnessMap','normalMap','emissiveMap'])if(material[key]&&!seen.has(material[key])){seen.add(material[key]);material[key].dispose();}material.dispose();
  }
 });
}
function init(){
 if(renderer)return;
 renderer=root.IronVowRenderer.get();
 root.IronVowRenderer.subscribe(({type})=>{if(type==='restored'){clear();cameraReady=false;}});
}
function clear(){
 root.IronVowFoundry?.clearCombat();root.IronVowBillboards?.clear();models.clear();aimTargets.clear();
 if(scene){sun?.shadow.map?.dispose();disposeTree(scene);}
 kit?.dispose();kit=null;scene=null;battleRef=null;groundMeshes.length=coverMeshes.length=0;
}
function plate(x,z){
 const geometry=new T.PlaneGeometry(TILE-.1,TILE-.1,4,4);geometry.rotateX(-Math.PI/2);
 const positions=geometry.attributes.position;
 for(let i=0;i<positions.count;i++){
  const px=x+positions.getX(i)/TILE,pz=z+positions.getZ(i)/TILE;
  positions.setY(i,terrainHeight(px,pz)*TILE);
 }
 geometry.computeVertexNormals();return geometry;
}
function build(){
 clear();init();battleRef=battle;kit=root.IronVowSceneKit(renderer);kit.setSize(battle.size.width,battle.size.depth);
 const index=Math.max(0,CONTRACTS.indexOf(battle.contract)-1)%3,P=kit.PAL[index];
 scene=new T.Scene();scene.background=kit.C(P.bg);scene.fog=new T.Fog(kit.C(P.fog[0]),P.fog[1],P.fog[2]);scene.environment=kit.envFrom(P.env);
 scene.add(new T.HemisphereLight(kit.C(P.hemi[0]),kit.C(P.hemi[1]),P.hemi[2]));
 sun=new T.DirectionalLight(kit.C(P.sun[0]),P.sun[1]);sun.position.set(...P.dir);sun.castShadow=true;
 const half=Math.max(battle.size.width,battle.size.depth)*TILE*.65;
 Object.assign(sun.shadow.camera,{left:-half,right:half,top:half,bottom:-half,near:1,far:180});
 sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0005;sun.shadow.normalBias=.03;scene.add(sun);
 const rim=new T.DirectionalLight(kit.C(0x9ab8d0),.6);rim.position.set(30,18,-30);scene.add(rim);
 board=new T.Group();scene.add(board);units=new T.Group();scene.add(units);
 const floor=new T.Mesh(new T.PlaneGeometry(300,300),kit.groundMaterial(P));floor.rotation.x=-Math.PI/2;floor.position.y=-.18;floor.receiveShadow=true;board.add(floor);
 const material=new T.MeshStandardMaterial({color:kit.C(index===1?0x6e6152:0x5a6266),map:kit.imgTex('assets/concrete.webp',[1,1]),roughness:.85,metalness:.1});
 const overlayPositions=[],overlayColors=[],tileIndices=[];
 for(let z=0;z<battle.size.depth;z++)for(let x=0;x<battle.size.width;x++){
  const geometry=plate(x,z),p=world(x,z,0),mesh=new T.Mesh(geometry,material);mesh.position.copy(p);mesh.receiveShadow=true;mesh.userData.tile={x,z};board.add(mesh);groundMeshes.push(mesh);
  const positions=geometry.attributes.position,offset=overlayPositions.length/3;
  for(let i=0;i<positions.count;i++){overlayPositions.push(positions.getX(i)+p.x,positions.getY(i)+.025,positions.getZ(i)+p.z);overlayColors.push(1,1,1);}
  tileIndices.push(Array.from(geometry.index.array,v=>v+offset));
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(overlayPositions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(overlayColors,3));geometry.setIndex([]);
 overlays=new T.Mesh(geometry,new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.38,depthWrite:false,polygonOffset:true,polygonOffsetFactor:0,polygonOffsetUnits:-1}));overlays.userData.indices=tileIndices;overlays.renderOrder=2;scene.add(overlays);
 const edgeMaterial=kit.MAT.hazard;
 for(const [x,z,w,d] of [[0,-battle.size.depth*TILE/2,battle.size.width*TILE,.3],[0,battle.size.depth*TILE/2,battle.size.width*TILE,.3],[-battle.size.width*TILE/2,0,.3,battle.size.depth*TILE],[battle.size.width*TILE/2,0,.3,battle.size.depth*TILE]]){
  const mesh=new T.Mesh(new T.BoxGeometry(w,.16,d),edgeMaterial);mesh.position.set(x,-.08,z);mesh.receiveShadow=true;board.add(mesh);
 }
 for(const key of battle.cover){const [x,z]=key.split(',').map(Number),cover=kit.buildCover(key);cover.position.y=terrainHeight(x,z)*TILE;board.add(cover);coverMeshes.push(cover);}
 kit.buildProps(board,index);
 const ring=color=>{const m=new T.Mesh(new T.RingGeometry(1.35,1.46,48),new T.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.renderOrder=3;scene.add(m);return m;};
 selection=ring(0xe6b76a);targetRing=ring(0xe2846e);
 pathGroup=new T.Group();scene.add(pathGroup);
 const surface=document.createElement('canvas');surface.width=surface.height=64;const g=surface.getContext('2d');
 g.fillStyle='#fff';g.beginPath();g.moveTo(14,12);g.lineTo(34,32);g.lineTo(14,52);g.lineTo(24,52);g.lineTo(44,32);g.lineTo(24,12);g.closePath();g.fill();
 const chevTexture=new T.CanvasTexture(surface),chevGeometry=new T.PlaneGeometry(1.3,1.3);chevGeometry.rotateX(-Math.PI/2);
 for(let i=0;i<battle.size.width*battle.size.depth;i++){const mesh=new T.Mesh(chevGeometry,new T.MeshBasicMaterial({map:chevTexture,color:0xe6c182,transparent:true,depthWrite:false}));mesh.renderOrder=4;mesh.visible=false;pathGroup.add(mesh);}
 camera=new T.PerspectiveCamera(30,innerWidth/innerHeight,.3,500);cameraReady=false;
 lightningAt=clock+4;lightning=0;
 updateCamera(clock,0);
}
function partPoint(unit,part='body'){
 const entry=models.get(unit.id)?.entry,m=entry?.m;
 if(m?.rig){
  const r=m.rig,node=part==='pilot'?r.neck:part==='right'?r.arms.R.el:part==='left'?r.arms.L.el:part==='legs'?r.legs[0].kn:r.spine;
  const p=node.getWorldPosition(V3());if(part==='body')p.y+=1.2*(m.scale||1);return p;
 }
 const node=m?.anchors?.[part];if(node)return node.getWorldPosition(V3());
 return world(unit.vx??unit.x,unit.vz??unit.z).add(V3(0,part==='legs'?1:part==='pilot'?5.7:3.8,0));
}
function attachmentPoint(unit,part='body'){
 const entry=models.get(unit.id)?.entry,m=entry?.m;
 if(!m)return partPoint(unit,part);
 const mounts=root.IronVowFoundryRig.mountPoints(m),r=m.rig;
 const node=({body:r.spine,pilot:r.neck,right:r.arms.R.el,left:r.arms.L.el,legs:r.legs[0].kn,leadFoot:r.legs[1].an,
  ...mounts,muzzle:entry.primary?.muzzle||mounts.muzzle,muzzle2:entry.primary?.muzzle2||mounts.muzzle2,
  meleeTip:entry.secondary?.tip,mortarMuzzle:m.mortar?.muzzle,shield:entry.shield?.face})[part];
 return node?.getWorldPosition(V3())||partPoint(unit,part);
}
function projectWorld(point){const p=point.clone().project(camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2,z:p.z};}
function labelPoint(unit){
 const record=models.get(unit.id),m=record?.entry?.m;
 if(!m)return projectWorld(world(unit.vx,unit.vz).add(V3(0,unit.kind?4:7.5,0)));
 const neck=m.rig.neck.getWorldPosition(V3());
 return projectWorld(neck.add(V3(0,record.headHeight+.7,0)));
}
function updateCamera(t,dt){
 const mobile=innerWidth<760,size=battle.size,fov=mobile?40:30;
 camera.aspect=innerWidth/innerHeight;camera.fov=fov;
 const usable=Math.max(200,innerWidth-(mobile?24:380)),hf=2*Math.atan(Math.tan(fov*Math.PI/360)*usable/innerHeight);
 const fit=Math.max(size.width*TILE*1.3/(2*Math.tan(hf/2)),size.depth*TILE*.9/(2*Math.tan(fov*Math.PI/360)));
 const target=fieldCamera.overview?world((size.width-1)/2,(size.depth-1)/2):world(fieldCamera.x,fieldCamera.z);
 const distance=fieldCamera.overview?fit:fit*.47/Math.max(.2,viewZoom),az=mobile?0:Math.PI/4,el=mobile?.8:.66;
 const position=target.clone().add(V3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).multiplyScalar(distance));
 const shot=activeCinematic;
 if(shot&&!reducedMotion){
  const actor=world(shot.actor.vx,shot.actor.vz),victim=partPoint(shot.target,shot.part),direction=victim.clone().sub(actor).setY(0).normalize(),side=V3(direction.z,0,-direction.x);
  target.copy(shot.phase==='result'?victim:victim.clone().lerp(actor,.12));
  position.copy(actor).addScaledVector(direction,-6.5).addScaledVector(side,3.4);position.y=actor.y+6;
 }
 const blend=cameraReady?1-Math.exp(-dt*6):1;cameraTarget.lerp(target,blend);cameraPosition.lerp(position,blend);camera.position.copy(cameraPosition);
 if(!reducedMotion&&shake>.15)camera.position.add(V3(Math.sin(t*110),Math.cos(t*93)*.5,0).multiplyScalar(Math.min(1.4,shake*.03)));
 camera.lookAt(cameraTarget);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);cameraReady=true;
 scene.fog.near=distance*.9;scene.fog.far=distance*2.6;
}
function prepareUnit(u,t){
 let record=models.get(u.id),object;
 if(isLive(u)){
  const pose=animationPose(u,hitstopTime(u,t)),p=world(u.vx,u.vz),goal=aimTargets.get(u.id);
  const motion=u.motion,heading=motion?Math.atan2(motion.toX-motion.fromX,motion.toZ-motion.fromZ):(displayedHeading(u)+Math.PI/4);
  const speed=record?.previousPosition&&t>record.previousTime?p.distanceTo(record.previousPosition)/(t-record.previousTime):0;
  const aim=goal&&goal.target.alive?partPoint(goal.target,goal.part):p.clone().add(V3(Math.sin(heading)*20,4,Math.cos(heading)*20));
  pose.heading=heading;pose.reducedMotion=reducedMotion;pose.world={...p,face:goal?Math.atan2(aim.x-p.x,aim.z-p.z):heading,heading,aim,groundAt,speed};
  const custom=u.frame===0?'warden':u.frame===10?'bastion':undefined;
  const entry=root.IronVowFoundry.draw(u,hitstopTime(u,t),pose,battle,foundryModel(u.frame),custom);
  if(!entry)return;
  object=entry.m.cont;
  if(!record){record={entry};models.set(u.id,record);}else record.entry=entry;
  record.previousPosition=p;record.previousTime=t;
 }else{
  object=root.IronVowBillboards.get(u,t);if(!object)return;
  object.position.copy(world(u.vx,u.vz));
  if(!record){record={};models.set(u.id,record);}
 }
 if(object.parent!==units)units.add(object);record.object=object;
 if(!record.proxy){
  const m=record.entry?.m,bounds=m?new T.Box3().setFromObject(m.cont):null,p=world(u.vx,u.vz);
  record.height=bounds?Math.max(2,bounds.max.y-p.y):u.kind?4:7.5;
  record.headHeight=m?Math.max(0,new T.Box3().setFromObject(m.rig.neck).max.y-m.rig.neck.getWorldPosition(V3()).y):0;
  record.proxy=new T.Mesh(new T.BoxGeometry(bounds?Math.max(2,bounds.max.x-bounds.min.x):3,record.height,bounds?Math.max(2,bounds.max.z-bounds.min.z):3),new T.MeshBasicMaterial({visible:false}));
  record.proxy.userData.unitId=u.id;units.add(record.proxy);
 }
 const p=world(u.vx,u.vz);record.proxy.position.copy(p).add(V3(0,record.height/2,0));record.proxy.visible=u.alive;record.proxy.updateMatrixWorld(true);
}
function updateOverlays(){
 const selectedUnit=current(),ready=battle.phase==='player'&&!battle.busy;
 const reach=selectedUnit&&ready&&action==='move'?paths(selectedUnit):null,jump=selectedUnit&&ready&&action==='jumpjet';
 const w=selectedUnit&&ready&&action!=='move'&&!jump?selectedWeapon(selectedUnit):null;
 const colors=overlays.geometry.attributes.color,indices=[];
 for(let z=0;z<battle.size.depth;z++)for(let x=0;x<battle.size.width;x++){
  const key=x+','+z,index=z*battle.size.width+x;let color;
  if(reach?.get(key)>0)color=reach.get(key)>freeMovement(selectedUnit)?0xcc9b49:0x77b4c5;
  if(jump&&jumpjetLanding(selectedUnit,x,z))color=0x619fcb;
  if(w&&!battle.cover.has(key)&&distance(selectedUnit,{x,z})>0&&distance(selectedUnit,{x,z})<=weaponRange(w,selectedUnit.training)&&!attackObstruction(selectedUnit,{x,z},w))color=0xc48469;
  if(ready&&hover?.x===x&&hover?.z===z)color=0xe7be6e;
  if(color!==undefined){const c=new T.Color(color);for(const i of new Set(overlays.userData.indices[index]))colors.setXYZ(i,c.r,c.g,c.b);indices.push(...overlays.userData.indices[index]);}
 }
 colors.needsUpdate=true;overlays.geometry.setIndex(indices);
 for(const [ring,u] of [[selection,selectedUnit],[targetRing,battle.units.find(u=>u.alive&&u.id===lockedTarget)]]){ring.visible=Boolean(u);if(u)ring.position.copy(world(u.vx,u.vz)).add(V3(0,.04,0));}
 const spot=moveTap??hover,path=selectedUnit&&reach?.get(spot?.x+','+spot?.z)>0?route(selectedUnit,spot.x,spot.z):[];
 let previous=selectedUnit;
 pathGroup.children.forEach((mesh,i)=>{const tile=path[i];mesh.visible=Boolean(tile);if(!tile)return;
  mesh.position.copy(world(tile.x,tile.z)).add(V3(0,.05,0));mesh.rotation.y=-Math.atan2(tile.z-previous.z,tile.x-previous.x);
  mesh.material.color.setHex(i+1>freeMovement(selectedUnit)?0xcc9b49:0xbfe4ee);previous=tile;
 });
}
function render(t,dt){
 init();if(!battle){root.IronVowRenderer.show(false);if(battleRef)clear();return;}
 if(root.IronVowRenderer.lost)return;
 if(battleRef!==battle||!scene)build();
 for(const u of battle.units)prepareUnit(u,t);
 updateCamera(t,dt);updateOverlays();
 const storm=Math.max(0,CONTRACTS.indexOf(battle.contract)-1)%3===2;
 if(storm&&!reducedMotion){if(t>=lightningAt){lightning=1;lightningAt=t+kit.random(5,11);}lightning*=Math.exp(-dt*9);sun.intensity=kit.PAL[2].sun[1]+lightning*2.5*(kit.random(0,1)>.3?1:.4);}
 root.IronVowRenderer.show(true);root.IronVowRenderer.resize(innerWidth,innerHeight);
 const shadow=root.IronVowRenderer.quality.shadow;
 if(sun.shadow.mapSize.x!==shadow){sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(shadow,shadow);}
 renderer.setRenderTarget(null);renderer.render(scene,camera);root.IronVowPerformance?.recordRender(renderer.info);
}
function project(x,y,z){
 if(!scene||battleRef!==battle)build();const p=world(x,z,y*TILE).project(camera);
 return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2,z:p.z};
}
function ray(x,y){pointer.set(x/innerWidth*2-1,1-y/innerHeight*2);raycaster.setFromCamera(pointer,camera);return raycaster;}
function screenTile(x,y){
 if(!scene||battleRef!==battle)build();const hit=ray(x,y).intersectObjects(groundMeshes,false)[0];
 if(!hit)return {x:-1,z:-1};return {x:Math.round(hit.point.x/TILE+(battle.size.width-1)/2),z:Math.round(hit.point.z/TILE+(battle.size.depth-1)/2)};
}
function pick(x,y){
 if(!scene||battleRef!==battle)build();const hit=ray(x,y).intersectObjects([...models.values()].map(m=>m.proxy).filter(Boolean),false)[0];return hit?battle.units.find(u=>u.id===hit.object.userData.unitId):null;
}
function pan(dx,dy){
 if(!scene)return;const a=ray(innerWidth/2,innerHeight/2).ray.intersectPlane(plane,V3()),b=ray(innerWidth/2+dx,innerHeight/2+dy).ray.intersectPlane(plane,V3());
 if(!a||!b)return;fieldCamera.x=Math.max(-.5,Math.min(battle.size.width-.5,fieldCamera.x+(a.x-b.x)/TILE));fieldCamera.z=Math.max(-.5,Math.min(battle.size.depth-.5,fieldCamera.z+(a.z-b.z)/TILE));
}
root.IronVowScene={isLive,render,project,projectWorld,screenTile,pick,pan,partPoint,attachmentPoint,labelPoint,groundAt,world,clear,
 overlayInfo(){return {triangles:overlays.geometry.index.count/3,path:pathGroup.children.filter(m=>m.visible).map(m=>({position:m.position.toArray(),color:m.material.color.getHex()})),selected:selection.visible,target:targetRing.visible};},
 aimAt(actor,victim,part){aimTargets.set(actor.id,{target:victim,part});},
 get camera(){return camera;},get scene(){return scene;},get models(){return models;},get ready(){return Boolean(scene&&battleRef===battle&&battle?.units.every(u=>isLive(u)?models.get(u.id)?.entry.armed:root.IronVowBillboards.ready(u.id)));}
};
})(window);
