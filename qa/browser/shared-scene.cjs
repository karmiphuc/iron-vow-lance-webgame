const assert=require('node:assert/strict');
const legacy=require('../fixtures/legacy-10x10-scene.json');
module.exports=async function sharedScene({page,context,mobile,origin,tap}){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{
  const get=HTMLCanvasElement.prototype.getContext,contexts=new Set();window.__webglContextCount=0;
  const request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),frames=new Set();
  window.requestAnimationFrame=fn=>{const id=request(t=>{frames.delete(id);fn(t);});frames.add(id);return id;};
  window.__stopNativeSceneFrames=()=>{for(const id of frames)cancel(id);frames.clear();};
  HTMLCanvasElement.prototype.getContext=function(type,...args){if(/webgl/.test(type))args[0]={...args[0],preserveDrawingBuffer:true};const result=get.call(this,type,...args);if(/webgl/.test(type)&&result){contexts.add(result);window.__webglContextCount=contexts.size;}return result;};
  window.__readBattlePixels=()=>{const gl=IronVowRenderer.get().getContext(),pixels=new Uint8Array(32*32*4);gl.readPixels(Math.floor(gl.drawingBufferWidth/2),Math.floor(gl.drawingBufferHeight/2),32,32,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let visible=0;for(let i=0;i<pixels.length;i+=4)if(Math.max(pixels[i],pixels[i+1],pixels[i+2])>10)visible++;return visible;};
 });
 await page.goto(origin,{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.__ironVow&&document.querySelector('#nav button'));
 await page.evaluate(()=>__ironVow.start({seed:4242,frames:[10,8,7]}));
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:120000});
 console.log('shared scene ready: '+(mobile?'touch':'desktop'));
 assert.equal(await page.evaluate(()=>__webglContextCount),1,'One actual WebGL context, including UI previews');
 assert.ok(await page.evaluate(()=>__readBattlePixels())>64,'Actual main framebuffer contains the rendered battlefield');
 await tap('#map-overview');await page.waitForFunction(()=>fieldCamera.overview);await page.evaluate(()=>IronVowScene.render(clock,1));
 const picks=await page.evaluate(()=>{
  const s=__ironVow.snapshot(),{camera,scene}=IronVowScene;
  const cliff=scene.getObjectByName('rock-cut-cliffs'),board=cliff.parent;
  const surfaces=[cliff,...board.children.filter(object=>object.userData.tile)];
  const ray=new THREE.Raycaster(),pixel=new THREE.Vector2();
  let tested=0,cliffOcclusions=0;
  for(let z=0;z<s.size.depth;z++)for(let x=0;x<s.size.width;x++){
   const center=IronVowScene.world(x,z),p=IronVowScene.projectWorld(center);
   if(p.x<0||p.x>innerWidth||p.y<0||p.y>innerHeight||p.z<0||p.z>1)continue;
   const px=Math.round(p.x),py=Math.round(p.y);
   ray.setFromCamera(pixel.set(px/innerWidth*2-1,1-py/innerHeight*2),camera);
   // A projected tile center can lie behind the visible face of a higher terrace.
   const surface=ray.intersectObjects(surfaces,true)[0];
   if(!surface)throw Error('No rendered battlefield surface at tile '+x+','+z);
   let expected;
   if(surface.object===cliff){
    const index=cliff.userData.faceTiles[surface.faceIndex];
    expected={x:index%s.size.width,z:Math.floor(index/s.size.width)};
   }else{
    let object=surface.object;
    while(object&&!object.userData.tile)object=object.parent;
    expected=object?.userData.tile;
   }
   const hit=IronVowScene.screenTile(px,py);
   if(hit.x!==expected?.x||hit.z!==expected?.z)throw Error('Raycast should pick the foreground surface at '+x+','+z+' -> '+JSON.stringify({expected,hit}));
   if(expected.x===x&&expected.z===z)tested++;
   else if(surface.object===cliff&&surface.distance<ray.ray.origin.distanceTo(center)-.1)cliffOcclusions++;
  }
  const u=battle.units.find(u=>u.id==='ally0'),p=IronVowScene.projectWorld(IronVowScene.partPoint(u));
  return{tested,cliffOcclusions,unit:IronVowScene.pick(p.x,p.y)?.id};
 });
 assert.ok(picks.tested>=50,'Ground raycasts cover visible overview plates at actual pointer pixel coordinates');assert.equal(picks.unit,'ally0');
 assert.ok(picks.cliffOcclusions>0,'A foreground cliff resolves to its terrace before the hidden tile');
 await tap('#map-center');await page.waitForFunction(()=>!fieldCamera.overview);await page.evaluate(()=>IronVowScene.render(clock,1));
 assert.deepEqual(await page.evaluate(()=>[fieldCamera.x,fieldCamera.z]),await page.evaluate(()=>[current().x,current().z]));
 console.log('raycasts, Overview and centre passed');
 const radar=await page.locator('#map-radar').boundingBox();
 const mapX=radar.x+radar.width*.75,mapY=radar.y+radar.height*.25;
 if(mobile)await page.touchscreen.tap(mapX,mapY);else await page.mouse.click(mapX,mapY);
 const jump=await page.evaluate(()=>({x:fieldCamera.x,z:fieldCamera.z,size:battle.size}));
 assert.ok(Math.abs(jump.x-(jump.size.width*.75-.5))<.2&&Math.abs(jump.z-(jump.size.depth*.25-.5))<.2,'Tactical map jumps to tapped location: '+JSON.stringify({jump,radar,mapX,mapY}));
 await tap('#map-center');
 console.log('map jump, zoom and pan passed');
 const start=await page.evaluate(()=>({x:fieldCamera.x,z:fieldCamera.z,zoom:viewZoom}));
 if(mobile){
  const cdp=await context.newCDPSession(page),x=page.viewportSize().width*.5,y=page.viewportSize().height*.5;
  const touches=gap=>[{x:x-gap,y,id:1},{x:x+gap,y,id:2}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches(45)});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touches(70)});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 }else{
  await page.mouse.move(600,470);await page.mouse.wheel(0,-120);
 }
 await page.waitForFunction(zoom=>viewZoom>zoom,start.zoom);
 console.log('wheel/pinch zoom passed');
 if(mobile){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:150,y:410,id:1}]});for(let i=1;i<=4;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:150+i*11,y:410+i*7,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 else{await page.mouse.move(600,470);await page.mouse.down();await page.mouse.move(655,510,{steps:4});await page.mouse.up();}
 assert.ok(await page.evaluate(({x,z})=>Math.hypot(fieldCamera.x-x,fieldCamera.z-z)>.01,start),'Pointer drag pans through world-space rays');
 await tap('#map-center');
 const move=await page.evaluate(()=>{
  const u=current(),free=freeMovement(u),moves=__ironVow.legalMoves(u.id).filter(m=>m.cost>free);
  return moves.map(m=>({...m,p:IronVowScene.project(m.x,terrainHeight(m.x,m.z),m.z)})).find(m=>m.p.x>180&&m.p.x<innerWidth-280&&m.p.y>230&&m.p.y<innerHeight-180&&IronVowScene.pick(m.p.x,m.p.y)?.team!=='enemy');
 });
 if(move&&!mobile){await page.mouse.move(move.p.x,move.p.y);await page.waitForFunction(()=>IronVowScene.overlayInfo().path.length>0);const info=await page.evaluate(()=>IronVowScene.overlayInfo());assert.ok(info.triangles>0&&info.path.some(p=>p.color===0xcc9b49),'Reach and paid-move path render actual amber geometry');assert.equal(info.selected,true);}
 const attack=await page.evaluate(()=>{
  const defender=battle.units.find(u=>u.team==='enemy'&&!u.kind);
  // Use a clear nearby tile so the fixture always tests a mech defending a legal shot.
  for(const actor of battle.units.filter(u=>u.team==='ally')){
   for(const [dx,dz] of [[2,0],[0,-2],[-2,0],[0,2],[1,0],[0,-1],[-1,0],[0,1]]){
    const x=actor.x+dx,z=actor.z+dz;
    if(!onBoard(x,z)||battle.cover.has(x+','+z)||occupied(x,z))continue;
    defender.x=defender.vx=x;defender.z=defender.vz=z;
    const shot=__ironVow.choices(actor.id).attacks.find(choice=>choice.target===defender.id&&choice.mode==='fire');
    if(shot)return {id:actor.id,...shot};
   }
  }
 });
 assert.ok(attack,'Campaign fixture has a legal attack on a mech');
 console.log('legal campaign attack ready');
 // Hold short camera stages on software GL while still drawing the real scene and running real timers.
 await page.evaluate(()=>__stopNativeSceneFrames());
 const epoch=new Date('2026-11-11T00:00:00Z');await page.clock.install({time:epoch});await page.clock.pauseAt(new Date(epoch.getTime()+10000));
 await page.evaluate(()=>{last=performance.now();requestAnimationFrame(draw);});
 const beforeGuard=await page.evaluate(({id,target,offset})=>{
  const actor=battle.units.find(u=>u.id===id),defender=battle.units.find(u=>u.id===target);
  const bearing=Math.atan2(actor.vx-defender.vx,actor.vz-defender.vz);
  // Exercise a flank attack on desktop and a rear attack on touch.
  defender.headingOverride=bearing+offset-Math.PI/4;
  const model=IronVowScene.models.get(target).entry.m;
  model.init=false;
  IronVowScene.render(clock,1/60);
  return {bearing,yaw:model.yaw,hip:model.rig.pelvis.position.y,heading:defender.heading,brace:defender.brace,ap:defender.ap};
 },{...attack,offset:mobile?Math.PI:Math.PI/2});
 await page.evaluate(a=>{void __ironVow.attack(a.id,a.target,a.part,a.mode);},attack);
 assert.equal(await page.evaluate(()=>Boolean(activeCinematic)),true,'Real attack opens the camera');
 await page.clock.fastForward(34);
 assert.equal(await page.evaluate(()=>IronVowScene.camera.isPerspectiveCamera),true);
 // Duel framing (FM3 grammar, owner 2026-11-22): during the brace the camera stands ahead of the attacker, three-quarter front, framing it.
 const framing=await page.evaluate(({id,target})=>{
  IronVowScene.render(clock,1);
  const camera=IronVowScene.camera,actor=battle.units.find(u=>u.id===id),victim=battle.units.find(u=>u.id===target);
  const a=IronVowScene.world(actor.vx,actor.vz),b=IronVowScene.world(victim.vx,victim.vz),toward=b.clone().sub(a).setY(0).normalize();
  const offset=camera.position.clone().sub(a),chest=a.clone();chest.y+=4;
  const view=camera.getWorldDirection(new THREE.Vector3()),half=Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect);
  return {ahead:offset.setY(0).dot(toward),distance:camera.position.distanceTo(a),offAxis:view.angleTo(chest.sub(camera.position)),half};
 },attack);
 assert.ok(framing.ahead>0,'The actual camera stands ahead of the attacker, facing its front: '+JSON.stringify(framing));
 assert.ok(framing.offAxis<framing.half,'and frames the attacker: '+JSON.stringify(framing));
 const duringGuard=await page.evaluate(({id,target})=>{
  // Sample the aim stage before any volley result, with real rig and GPU updates.
  for(let frame=1;frame<=12;frame++)IronVowScene.render(clock+frame/30,1/30);
  const defender=battle.units.find(u=>u.id===target),model=IronVowScene.models.get(target).entry.m;
  const camera=IronVowScene.camera,attackerMeshes=[];
  IronVowScene.models.get(id).object.traverseVisible(mesh=>{if(mesh.isMesh)attackerMeshes.push(mesh);});
  const landmarks=[model.rig.pelvis,model.rig.arms.L.el];
  const landmarkViews=landmarks.map(node=>{
   const point=node.getWorldPosition(new THREE.Vector3()),ndc=point.clone().project(camera);
   const direction=point.sub(camera.position),distance=direction.length();
   const ray=new THREE.Raycaster(camera.position,direction.normalize(),0,distance);
   return {x:+ndc.x.toFixed(2),y:+ndc.y.toFixed(2),z:+ndc.z.toFixed(3),occluded:ray.intersectObjects(attackerMeshes,false).length>0};
  });
  const guardVisible=landmarkViews.every(v=>Math.abs(v.x)<1&&Math.abs(v.y)<1&&v.z<1&&!v.occluded);
  const {so,sh}=model.rig.arms.L;
  const leftHandHeight=so.getWorldPosition(new THREE.Vector3()).y-sh.getWorldPosition(new THREE.Vector3()).y;
  return {yaw:model.yaw,hip:model.rig.pelvis.position.y,leftHandHeight,
   heading:defender.heading,brace:defender.brace,ap:defender.ap,guardVisible,landmarkViews};
 },attack);
 const separation=yaw=>Math.acos(Math.min(1,Math.max(-1,Math.cos(yaw-beforeGuard.bearing))));
 assert.ok(separation(duringGuard.yaw)<separation(beforeGuard.yaw)-.4,
  `The defending rig turns toward the actual attacker (${separation(beforeGuard.yaw)} to ${separation(duringGuard.yaw)} rad)`);
 assert.ok(duringGuard.hip<beforeGuard.hip-.12&&duringGuard.leftHandHeight<-.3,'The defender lowers its hull and keeps the empty left hand down');
 // FM3 grammar (owner, 2026-11-22): the brace frames the attacker alone; the defender's lowered stance and guard read on the hit
 // shot, which frames the defender clear of the attacker.
 for(let i=0;i<240&&await page.evaluate(()=>activeCinematic&&activeCinematic.cameraBeat!=='hit');i++)await page.clock.fastForward(34);
 const onHit=await page.evaluate(({id,target})=>{
  IronVowScene.render(clock,1/30);
  const model=IronVowScene.models.get(target).entry.m,camera=IronVowScene.camera,attackerMeshes=[];
  IronVowScene.models.get(id).object.traverseVisible(mesh=>{if(mesh.isMesh)attackerMeshes.push(mesh);});
  const views=[model.rig.pelvis,model.rig.arms.L.el].map(node=>{
   const point=node.getWorldPosition(new THREE.Vector3()),ndc=point.clone().project(camera);
   const direction=point.sub(camera.position),distance=direction.length();
   const ray=new THREE.Raycaster(camera.position,direction.normalize(),0,distance);
   return {x:+ndc.x.toFixed(2),y:+ndc.y.toFixed(2),z:+ndc.z.toFixed(3),occluded:ray.intersectObjects(attackerMeshes,false).length>0};
  });
  return {beat:activeCinematic?.cameraBeat,views};
 },attack);
 assert.equal(onHit.beat,'hit','The exchange reaches its hit shot');
 assert.ok(onHit.views.every(v=>Math.abs(v.x)<1&&Math.abs(v.y)<1&&v.z<1&&!v.occluded),'The hit shot leaves the defender\'s stance and guard in view, clear of the attacker: '+JSON.stringify(onHit.views));
 assert.deepEqual([duringGuard.heading,duringGuard.brace,duringGuard.ap],[beforeGuard.heading,beforeGuard.brace,beforeGuard.ap],'The camera pose does not alter the defender’s rules or heading');
 await page.evaluate(()=>document.querySelector('#skip-shot').click());
 for(let i=0;i<20&&await page.evaluate(()=>__ironVow.pending);i++)await page.clock.fastForward(1000);
 assert.equal(await page.evaluate(()=>__ironVow.pending||Boolean(activeCinematic)),false,'Skip resolves the real exchange');
 console.log('3D attack camera, defender guard and Skip passed');
 const before=await page.evaluate(()=>({checkpoint:__ironVow.checkpoint(),generation:IronVowRenderer.generation}));
 // The extension exercises real GL resource loss; the game state must survive untouched.
 await page.evaluate(()=>{window.__loseContext=IronVowRenderer.get().getContext().getExtension('WEBGL_lose_context');__loseContext.loseContext();});
 for(let i=0;i<100&&!await page.evaluate(()=>IronVowRenderer.lost);i++)await new Promise(resolve=>setTimeout(resolve,25));
 assert.equal(await page.evaluate(()=>IronVowRenderer.lost),true,'Actual context-loss event is observed');
 await page.evaluate(()=>__loseContext.restoreContext());
 // Once the context is back, rebuild and decode the sortie's GLBs as the
 // controlled animation clock advances.
 for(let i=0;i<100&&!await page.evaluate(()=>IronVowScene.ready);i++){
  await new Promise(resolve=>setTimeout(resolve,25));await page.clock.fastForward(34);
 }
 assert.equal(await page.evaluate(()=>!IronVowRenderer.lost&&IronVowScene.ready),true,'Context restoration rebuilds the live scene');
 const after=await page.evaluate(()=>({checkpoint:__ironVow.checkpoint(),generation:IronVowRenderer.generation,contexts:__webglContextCount}));
 assert.ok(await page.evaluate(()=>__readBattlePixels())>64,'The restored context actually redraws the battlefield');
 assert.deepEqual(after.checkpoint,before.checkpoint,'Context restoration rebuilds presentation from exact game state');assert.equal(after.generation,before.generation+1);assert.equal(after.contexts,1);
 console.log('actual context restoration and preserved checkpoint passed');
 await page.evaluate(record=>__ironVow.loadCareer(record),legacy);
 for(let i=0;i<100&&!await page.evaluate(()=>IronVowScene.ready);i++){await new Promise(resolve=>setTimeout(resolve,25));await page.clock.fastForward(34);}
 assert.equal(await page.evaluate(()=>IronVowScene.ready),true,'Legacy scene is fully loaded');
 assert.deepEqual(await page.evaluate(()=>__ironVow.snapshot().size),{width:10,depth:10});
 const restored=await page.evaluate(()=>__ironVow.checkpoint());assert.equal(restored.legacy,true);
 assert.ok(await page.evaluate(()=>__ironVow.legalMoves(__ironVow.snapshot().units.find(u=>u.team==='ally').id).some(m=>m.cost>0)),'Legacy checkpoint remains playable');
};
