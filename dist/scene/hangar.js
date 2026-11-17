/* Shared hangar scene. Adapted from docs/reference/claude/mercenary-command.html:1982–2078
 * through the prepared Phase 4 fixture. The caller owns navigation and rig assets. */
(function(root){
'use strict';
const T=root.THREE, V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
function layout(seats,reserves){
 if(!Number.isInteger(seats)||seats<0||!Number.isInteger(reserves)||reserves<0)throw Error('Invalid hangar counts');
 const row=(n,z,spacing)=>Array.from({length:n},(_,i)=>({x:(i-(n-1)/2)*spacing,z}));
 return {bays:row(seats,0,11),reserves:row(reserves,-15,8)};
}
function create({catalog,onSelect=()=>{},onReserve=()=>{}}){
 if(!catalog||typeof catalog.create!=='function')throw Error('A live rig catalog is required');
 const renderer=root.IronVowRenderer.get(),scene=new T.Scene(),camera=new T.PerspectiveCamera(48,1,.2,400);
 const kit=root.IronVowSceneKit(renderer),scalar=kit.C;
 scene.background=scalar(0x14191c);scene.fog=new T.Fog(scalar(0x1a1d1e),50,180);
 scene.environment=kit.envFrom([0x1c1a17,0xffd6a0,0xffc98a,0x6d8aa6,0x3a352e]);
 scene.add(new T.HemisphereLight(scalar(0xd9c7a8),scalar(0x15171a),.45));
 const sun=new T.DirectionalLight(scalar(0xffd29a),2.1);sun.position.set(-18,30,-22);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-35,right:35,top:25,bottom:-20,near:1,far:100});sun.shadow.bias=-.0005;sun.shadow.normalBias=.03;scene.add(sun);
 const fill=new T.DirectionalLight(scalar(0x8fb0d0),.7);fill.position.set(16,10,18);scene.add(fill);
 const owned=new Set(),dynamic=new T.Group();scene.add(dynamic);
 function mat(color,opts={}){const m=new T.MeshStandardMaterial({color:scalar(color),roughness:.8,metalness:.2,...opts});owned.add(m);return m;}
 const floor=kit.groundMaterial({ground:0x4a4843,wet:.25});
 owned.add(floor);owned.add(floor.map);owned.add(floor.roughnessMap);
 const wall=kit.MAT.wall,metal=mat(0x293135),yellow=mat(0xa97b26),glow=mat(0x3c8c84,{emissive:0x16796b,emissiveIntensity:1.2}),scorch=mat(0x211d1b);
 function mesh(parent,geometry,material,x,y,z){owned.add(geometry);const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function box(parent,w,h,d,m,x,y,z){return mesh(parent,new T.BoxGeometry(w,h,d),m,x,y,z);}
  const base=mesh(scene,new T.PlaneGeometry(160,90),floor,0,0,-5);base.rotation.x=-Math.PI/2;base.castShadow=false;
 box(scene,160,35,.5,wall,0,17,-27).castShadow=false;
 box(scene,.5,35,80,wall,-55,17,-7).castShadow=false;
 box(scene,.5,35,80,wall,55,17,-7).castShadow=false;
 const destinations={ship:[-13,5.4,-23],facilities:[0,5.4,-23],'crew-cabin':[13,5.4,-23]};
 for(const [x,,z] of Object.values(destinations)){
  box(scene,5.6,5.4,.75,metal,x,2.7,z);
  box(scene,5,.14,.8,glow,x,5.2,z+.1);
 }
 const windowGlass=mat(0xc8a87a,{emissive:scalar(0xffc678),emissiveIntensity:.9,metalness:.35});
 for(let x=-45;x<=45;x+=18){
  box(scene,1,35,1,metal,x,17,-26);
  box(scene,10,7,.2,metal,x+7.5,21,-26.5);
  for(const rx of [-3,0,3])for(const y of [19.3,22.6])box(scene,2.8,3,.15,windowGlass,x+7.5+rx,y,-26.36).castShadow=false;
 }
 box(scene,110,.3,2.6,metal,0,8,-24);
 box(scene,108,.08,.08,yellow,0,9.25,-22.8).castShadow=false;
 for(let x=-54;x<=54;x+=4)box(scene,.08,1.1,.08,yellow,x,8.7,-22.8).castShadow=false;
 box(scene,100,1.1,1.2,yellow,0,17,-5).castShadow=false;
 box(scene,100,1.1,1.2,yellow,0,17,-1).castShadow=false;
 const hook=new T.Group();hook.name='crane hook';hook.position.set(5,16,-3);scene.add(hook);box(hook,.1,5,.1,metal,0,-2.5,0);box(hook,1,.8,.8,yellow,0,-5.2,0);
 // Translucent light shafts, beacons and drifting dust are contained in this scene.
 for(const x of [-28,-10,8,26]){const m=new T.MeshBasicMaterial({color:0xffd9a0,transparent:true,opacity:.045,depthWrite:false,side:T.DoubleSide});owned.add(m);const p=mesh(scene,new T.PlaneGeometry(9,35),m,x,13,-15);p.rotation.x=-.4;p.castShadow=false;}
 const beacon=mat(0xff8a1c,{emissive:scalar(0xff8a1c),emissiveIntensity:2.8});
 for(const x of [-35,35])mesh(scene,new T.SphereGeometry(.3,8,6),beacon,x,9,-25);
 const points=new Float32Array(180*3);for(let i=0;i<180;i++){points[i*3]=((i*37)%100)-50;points[i*3+1]=(i*13%170)/10;points[i*3+2]=(i*23%55)-26;}
 const dustGeo=new T.BufferGeometry();dustGeo.setAttribute('position',new T.BufferAttribute(points,3));owned.add(dustGeo);const dustMat=new T.PointsMaterial({size:.09,color:0xffe0aa,transparent:true,opacity:.5,depthWrite:false});owned.add(dustMat);const dust=new T.Points(dustGeo,dustMat);scene.add(dust);
 function worker(x,z){const w=new T.Group();w.position.set(x,0,z);scene.add(w);box(w,.5,.7,.3,metal,0,1.2,0);box(w,.38,.3,.35,yellow,0,1.7,0);const legs=[-1,1].map(s=>box(w,.15,.85,.2,metal,s*.14,.45,0));const arms=[-1,1].map(s=>box(w,.14,.7,.16,metal,s*.32,1.2,0));return{w,legs,arms};}
 const walking=worker(-8,7),consoleWorker=worker(-8,-2),welder=worker(7,-9);
 walking.w.name='walking technician';consoleWorker.w.name='console technician';welder.w.name='welding technician';box(scene,1.4,1.2,.8,metal,-8,.6,-3);
 const weldLight=new T.PointLight(0xaaddff,0,8);weldLight.position.set(7,1.4,-10);scene.add(weldLight);
 const sparkMat=new T.MeshBasicMaterial({color:0xd7efff});owned.add(sparkMat);const sparks=[];for(let i=0;i<8;i++)sparks.push(mesh(scene,new T.SphereGeometry(.055,5,4),sparkMat,7,1.4,-10));
 const ray=new T.Raycaster(),pointer=new T.Vector2(),records=[],targets=new Map();let selected=null,cameraReady=false,disposed=false,view="overview";
 function disposeRecords(){for(const r of records){r.rig?.dispose?.();if(r.rig?.object)r.group.remove(r.rig.object);r.group.traverse(o=>{if(o.geometry&&owned.delete(o.geometry))o.geometry.dispose();if((o.material===r.hit.material||o.material===r.ring?.material)&&owned.delete(o.material))o.material.dispose();});dynamic.remove(r.group);}records.length=0;}
 function setRoster({active=[],reserve=[],seatCount=active.length}){
  if(active.length>seatCount)throw Error('More active units than combat seats');
  const ids=[...active,...reserve].map(u=>u.id);if(new Set(ids).size!==ids.length)throw Error('Hangar unit ids must be unique');
  disposeRecords();const positions=layout(seatCount,reserve.length);
  function add(unit,p,index,isReserve){
   const group=new T.Group();group.position.set(p.x,0,p.z);dynamic.add(group);
   let ring;
   if(!isReserve){
    const pad=mesh(group,new T.CylinderGeometry(4.3,4.6,.3,6),metal,0,.15,0);pad.rotation.y=Math.PI/6;
    const lamp=new T.MeshBasicMaterial({color:0x5fd4c4,transparent:true,opacity:.12,depthWrite:false});owned.add(lamp);
    ring=mesh(group,new T.TorusGeometry(4,.07,6,24),lamp,0,.32,0);ring.rotation.x=Math.PI/2;ring.castShadow=false;
   }
   let rig=null;if(unit){rig=catalog.create(unit);if(rig?.object){rig.object.position.y=isReserve?0:.3;group.add(rig.object);}}
   if(unit&&unit.condition<.3){
    const service=new T.Group();service.name='maintenance gantry';group.add(service);
    const mark=mesh(service,new T.CircleGeometry(2.9,24),scorch,0,isReserve?.018:.34,0);mark.rotation.x=-Math.PI/2;mark.castShadow=false;
    box(service,.25,7,.25,yellow,-3.4,3.5,-1);box(service,7,.25,.25,yellow,0,7,-1);
   }
   const hit=mesh(group,new T.BoxGeometry(7,8,5),new T.MeshBasicMaterial({visible:false}),0,4,0);owned.add(hit.material);hit.userData.hangarId=unit?.id;hit.userData.frame=unit?.frame;hit.userData.reserve=isReserve;
   records.push({unit,group,rig,hit,index,isReserve,ring});
  }
  positions.bays.forEach((p,i)=>add(active[i],p,i,false));positions.reserves.forEach((p,i)=>add(reserve[i],p,i,true));
  if(!records.some(r=>r.unit?.id===selected&&!r.isReserve))selected=active[0]?.id??null;
 }
 function select(id,notify=true,focus=true){if(records.some(r=>r.unit?.id===id&&!r.isReserve)){selected=id;if(focus)view="selected";if(notify)onSelect(id);return true;}return false;}
 function overview(){view="overview";}
 function pick(clientX,clientY,rect){pointer.set((clientX-rect.left)/rect.width*2-1,1-(clientY-rect.top)/rect.height*2);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(records.map(r=>r.hit),false)[0];if(!hit||hit.object.userData.hangarId==null)return null;const {hangarId,frame,reserve}=hit.object.userData;if(reserve)onReserve(hangarId,frame);else select(hangarId);return hangarId;}
 function setHotspots(items){targets.clear();for(const item of items)targets.set(item.element,item.position);}
 function placeHotspots(rect){for(const [element,position] of targets){const p=V(...position).project(camera);element.style.left=`${rect.left+(p.x+1)*rect.width/2}px`;element.style.top=`${rect.top+(1-p.y)*rect.height/2}px`;element.hidden=p.z>1||p.z< -1||Math.abs(p.x)>1||Math.abs(p.y)>1;}}
 function render(t,dt,width,height,reducedMotion=false){if(disposed||root.IronVowRenderer.lost)return;dt=Math.max(0,Math.min(.05,dt));root.IronVowRenderer.show(true);root.IronVowRenderer.resize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();
  const focus=records.find(r=>r.unit?.id===selected)||records[0],x=focus?.group.position.x||0;
  let target,position;
  if(view==='overview'){
   // Fit the widest row even on narrow viewports, while looking down between rows.
   const halfWidth=Math.max(8,...records.map(r=>Math.abs(r.group.position.x)+5));
   const distance=Math.max(45,halfWidth/(Math.tan(T.MathUtils.degToRad(camera.fov/2))*camera.aspect)*1.18);
   target=V(0,3,records.some(r=>r.isReserve)?-7.5:0);position=V(0,3+distance*.55,target.z+distance*.84);
  }else{target=V(x,4,0);position=V(x+9,10,36);}if(!cameraReady||reducedMotion){camera.position.copy(position);camera.userData.target=target.clone();cameraReady=true;}const k=1-Math.exp(-dt*2.6);camera.position.lerp(position,k);camera.userData.target.lerp(target,k);camera.lookAt(camera.userData.target);camera.updateMatrixWorld();
  for(const r of records){
   const focus=Boolean(r.unit&&r.unit.id===selected);
   r.rig?.update({time:t,dt,selected:focus,reducedMotion});
   if(r.ring)r.ring.material.opacity=focus?(reducedMotion?.7:.55+.4*Math.sin(t*3)):.12;
  }
  if(!reducedMotion){
  walking.w.position.x=-8+Math.sin(t*.16)*8;const step=Math.sin(t*5)*.4;walking.legs[0].rotation.x=step;walking.legs[1].rotation.x=-step;walking.arms[0].rotation.x=-step;walking.arms[1].rotation.x=step;consoleWorker.arms.forEach((a,i)=>a.rotation.x=-.9+Math.sin(t*6+i)*.08);welder.arms[1].rotation.x=-1;
  const welding=Math.sin(t*1.3)>-.2;weldLight.intensity=welding?4+2*Math.sin(t*27):0;sparks.forEach((s,i)=>{s.visible=welding;s.position.set(7+Math.sin(t*13+i)*.45,1.4-((t*2+i*.13)%1),-10+Math.cos(t*11+i)*.3);});hook.rotation.z=Math.sin(t*.6)*.04;dust.rotation.y=t*.002;beacon.emissiveIntensity=Math.sin(t*4)>.3?2.8:.25;  }else{weldLight.intensity=0;sparks.forEach(spark=>{spark.visible=false;});}
  renderer.setRenderTarget(null);renderer.render(scene,camera);
  root.IronVowPerformance?.recordRender(renderer.info);
 }
 function dispose(){if(disposed)return;disposed=true;disposeRecords();for(const item of owned)item.dispose();sun.shadow.map?.dispose();kit.dispose();}
 function cameraState(){return cameraReady?{view,selected,position:camera.position.toArray(),target:camera.userData.target.toArray()}:null;}
 function restoreCamera(state){
  if(!state)return;
  view=state.view;selected=state.selected;camera.position.fromArray(state.position);
  camera.userData.target=V(...state.target);cameraReady=true;
 }
 return {scene,camera,destinations,setRoster,select,overview,pick,setHotspots,placeHotspots,render,dispose,cameraState,restoreCamera,get records(){return records.slice();}};
}
root.IronVowHangar={create,layout};
})(typeof window==='undefined'?globalThis:window);
