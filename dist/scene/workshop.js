/* Workshop optics, pad and drag response adapted from
 * docs/reference/claude/mercenary-command.html:2078–2110. The common renderer
 * owns the screen canvas. Only its visible Workshop viewport is drawn. */
(function(root){
'use strict';
const T=root.THREE,owner=root.IronVowRenderer,rigs=root.IronVowRigV2,foundry=root.IronVowFoundry;
const VIEW='workshop',ID='turntable',DEFAULT_YAW=.6;
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
let host,unit,model,key,stage,dragEvents,demo,entry;
let yaw=DEFAULT_YAW,zoom=1,velocity=0,lastTap,pinch;
const pointers=new Map();
function reset(){yaw=DEFAULT_YAW;zoom=1;velocity=0;lastTap=null;}
function pointerDown(e){
 if(e.button!==0||pointers.size===2)return;
 host.setPointerCapture?.(e.pointerId);
 velocity=0;
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,time:e.timeStamp,moved:false});
 if(pointers.size===2){
  const [a,b]=pointers.values();
  pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom};
  a.moved=b.moved=true;lastTap=null;
 }
}
function pointerMove(e){
 const p=pointers.get(e.pointerId);
 if(!p)return;
 const dx=e.clientX-p.x;
 p.moved||=Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>5;
 if(pointers.size===1&&p.moved){
  yaw+=dx*.012;
  velocity=clamp(dx*.012/Math.max(.012,(e.timeStamp-p.time)/1000),-4.5,4.5);
 }
 Object.assign(p,{x:e.clientX,y:e.clientY,time:e.timeStamp});
 if(pinch&&pointers.size===2){
  const [a,b]=pointers.values();
  zoom=clamp(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance,.72,1.7);
 }
}
function pointerUp(e){
 const p=pointers.get(e.pointerId);
 if(!p)return;
 pointers.delete(e.pointerId);
 pinch=null;
 if(e.type!=='pointerup')velocity=0;
 else velocity*=Math.exp(-4*Math.max(0,(e.timeStamp-p.time)/1000));
 if(e.type==='pointerup'&&!p.moved&&pointers.size===0){
  const tap={time:e.timeStamp,x:e.clientX,y:e.clientY};
  if(lastTap&&tap.time-lastTap.time<360&&Math.hypot(tap.x-lastTap.x,tap.y-lastTap.y)<28)reset();
  else lastTap=tap;
 }
}
function attach(element){
 dragEvents?.abort();
 pointers.clear();pinch=lastTap=null;velocity=0;
 host=element;
 if(!host)return;
 dragEvents=new AbortController();
 const options={signal:dragEvents.signal};
 host.addEventListener('pointerdown',pointerDown,options);
 host.addEventListener('pointermove',pointerMove,options);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(type,pointerUp,options);
 host.addEventListener('keydown',e=>{
  if(e.key==='Home'){e.preventDefault();reset();}
  else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
   e.preventDefault();velocity=0;yaw+=(e.key==='ArrowRight'?1:-1)*.3;
  }else if(e.key==='+'||e.key==='-'){
   e.preventDefault();zoom=clamp(zoom+(e.key==='+'?.12:-.12),.72,1.7);
  }
 },options);
}
function buildStage(){
 const renderer=owner.get(),kit=root.IronVowSceneKit(renderer),scene=new T.Scene(),pad=new T.Group(),owned=new Set();
 const camera=new T.PerspectiveCamera(28,1,.3,100);
 scene.environment=kit.envFrom([0x151a1d,0xffd9a8,0x9fc6d8,0x6d8aa6,0x2a2f33]);
 scene.add(new T.HemisphereLight(kit.C(0xdfe8ec),kit.C(0x101315),.5));
 const key=new T.DirectionalLight(kit.C(0xffe0b8),2.6);
 key.position.set(-6,10,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
 Object.assign(key.shadow.camera,{left:-7,right:7,top:9,bottom:-4,near:1,far:40});
 key.shadow.normalBias=.03;scene.add(key);
 const rim=new T.DirectionalLight(kit.C(0x6fd8e8),2.2);rim.position.set(6,6,-8);scene.add(rim,pad);
 const deck=kit.cy(pad,4,4.3,.4,kit.MAT.graphite,0,.2,0,0,0,0,48);owned.add(deck.geometry);
 const lamp=new T.MeshBasicMaterial({color:0x5fd4c4,transparent:true,opacity:.7});
 const ring=kit.mesh(pad,new T.TorusGeometry(3.8,.04,6,64),lamp,0,.42,0,Math.PI/2,0,0,false);
 owned.add(lamp);owned.add(ring.geometry);
 for(let i=0;i<12;i++){
  const a=i/12*Math.PI*2;
  kit.bx(pad,.5,.06,.12,kit.MAT.amber,Math.cos(a)*4.05,.41,Math.sin(a)*4.05,0,-a,0,false);
 }
 stage={renderer,scene,pad,camera,dispose(){for(const item of owned)item.dispose();key.shadow.map?.dispose();kit.dispose();}};
}
function clearModel(){foundry.releaseStageRig(VIEW,ID);entry=null;demo=null;}
function close(){
 if(!host&&!stage)return;
 attach(null);clearModel();stage?.dispose();stage=null;
 rigs.clear(VIEW);key=undefined;unit=null;reset();
}
function show(element,next,foundryModel){
 if(!element){close();return;}
 if(element!==host){attach(element);demo=null;}
 const signature=JSON.stringify([next.frame,next.weapon,next.melee,next.shoulder,next.shield,next.paintFinish,next.paint,next.trim,next.upgrade,next.condition]);
 if(signature===key)return;
 if(unit?.frame!==next.frame)reset();
 clearModel();key=signature;model=foundryModel;
 const condition=next.condition,health=condition===0?1:condition;
 // Career condition is the surviving armor percentage after a sortie.
 const hp={body:health,right:health,left:health,legs:health,pilot:100};
 unit={...next,id:ID,team:'ally',alive:true,hp,max:{body:100,right:100,left:100,legs:100,pilot:100}};
 rigs.retain([unit],VIEW);
}
function play(actor,poseAt,duration){
 if(host&&unit)demo={actor:{...unit,...actor,id:ID,hp:unit.hp,max:unit.max},poseAt,duration,start:null};
}
function paint(t,dt,width,height,reducedMotion){
 if(!host||owner.lost)return;
 const frame=host.getBoundingClientRect(),page=host.closest('.page').getBoundingClientRect();
 const left=Math.max(0,page.left,frame.left),right=Math.min(width,page.right,frame.right);
 const top=Math.max(0,page.top,frame.top),bottom=Math.min(height,page.bottom,frame.bottom);
 if(right-left<1||bottom-top<1){owner.show(false);return;}
 if(!stage)buildStage();
 const {renderer,scene,camera,pad}=stage;
 if(!pointers.size){
  if(reducedMotion)velocity=0;
  yaw+=velocity*dt;velocity*=Math.exp(-1.5*dt);
 }
 const native=rigs.applies(unit);
 if(!native||rigs.status(unit,VIEW)==='ready'){
  if(demo){demo.start??=t;if(t-demo.start>demo.duration)demo=null;}
  const age=demo?t-demo.start:0,overrides=demo?.poseAt(demo.actor,age)||{};
  const pose={stage:VIEW,phase:0,primeProgress:0,strikeProgress:0,aim:0,recoil:0,impact:0,land:0,brace:0,
   ...overrides,reducedMotion,world:{x:0,y:.4,z:0,aim:new T.Vector3(0,4,20),face:0,heading:0,speed:0,noPlant:true}};
  entry=foundry.draw(demo?.actor||unit,t,pose,null,model,native?'rig-v2':undefined);
  if(entry&&entry.m.cont.parent!==pad)pad.add(entry.m.cont);
  if(demo&&entry)host.dataset.rigTime=age.toFixed(3);
  else delete host.dataset.rigTime;
 }
 camera.aspect=frame.width/frame.height;
 // Keep the full chassis and pad framed in narrower scroll panels.
 const distance=21/(Math.min(1,camera.aspect)*zoom);
 camera.position.set(Math.sin(yaw)*distance,5.4,Math.cos(yaw)*distance);
 camera.lookAt(0,3.4,0);camera.updateProjectionMatrix();
 owner.show(true);owner.resize(width,height);
 const target=renderer.getRenderTarget(),viewport=renderer.getViewport(new T.Vector4()),scissor=renderer.getScissor(new T.Vector4());
 const scissorTest=renderer.getScissorTest();
 try{
  renderer.setRenderTarget(null);
  renderer.setScissorTest(false);renderer.clear();
  renderer.setViewport(frame.left,height-frame.bottom,frame.width,frame.height);
  renderer.setScissor(left,height-bottom,right-left,bottom-top);renderer.setScissorTest(true);
  renderer.render(scene,camera);
  root.IronVowPerformance?.recordRender(renderer.info);
 }finally{
  renderer.setRenderTarget(target);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);
 }
}
owner.subscribe(({type})=>{
 if(type!=='restored'||!host)return;
 clearModel();stage?.dispose();stage=null;rigs.clear(VIEW);rigs.load([unit],VIEW);
});
root.IronVowWorkshop={show,close,play,paint,rotate(){yaw+=Math.PI/2;velocity=0;},
 snapshot:()=>host?{yaw,zoom,velocity,entry}:null};
})(window);
