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
  const s=__ironVow.snapshot(),camera=IronVowScene.camera;let tested=0;
  for(let z=0;z<s.size.depth;z++)for(let x=0;x<s.size.width;x++){
   const p=IronVowScene.projectWorld(IronVowScene.world(x,z));if(p.x<0||p.x>innerWidth||p.y<0||p.y>innerHeight||p.z<0||p.z>1)continue;
   const hit=IronVowScene.screenTile(Math.round(p.x),Math.round(p.y));if(hit.x!==x||hit.z!==z)throw Error('Raycast missed visible tile '+x+','+z+' -> '+JSON.stringify(hit));tested++;
  }
  const u=battle.units.find(u=>u.id==='ally0'),p=IronVowScene.projectWorld(IronVowScene.partPoint(u));
  return{tested,unit:IronVowScene.pick(p.x,p.y)?.id};
 });
 assert.ok(picks.tested>=50,'Ground raycasts cover visible overview plates at actual pointer pixel coordinates');assert.equal(picks.unit,'ally0');
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
 let attack;
 for(let attempt=0;attempt<4;attempt++){
  const decision=await page.evaluate(()=>{
   for(const u of battle.units.filter(u=>u.team==='ally')){const choice=__ironVow.choices(u.id).attacks.find(a=>a.mode==='fire');if(choice)return{attack:{id:u.id,...choice}};}
   for(const u of battle.units.filter(u=>u.team==='ally')){const choices=__ironVow.choices(u.id),move=choices.moves.sort((a,b)=>a.score-b.score)[0];if(move&&move.score<choices.currentScore)return{move:{id:u.id,...move}};}
  });
  if(decision?.attack){attack=decision.attack;break;}
  if(!decision?.move)break;
  await page.evaluate(move=>{void __ironVow.move(move.id,move.x,move.z);},decision.move);
  await page.waitForFunction(()=>!__ironVow.pending,null,{timeout:120000});
 }
 assert.ok(attack,'Real campaign deployment has a legal attack');
 console.log('legal campaign attack ready');
 // Hold short camera stages on software GL while still drawing the real scene and running real timers.
 await page.evaluate(()=>__stopNativeSceneFrames());
 const epoch=new Date('2026-11-11T00:00:00Z');await page.clock.install({time:epoch});await page.clock.pauseAt(new Date(epoch.getTime()+10000));
 await page.evaluate(()=>{last=performance.now();requestAnimationFrame(draw);});
 await page.evaluate(a=>{void __ironVow.attack(a.id,a.target,a.part,a.mode);},attack);
 assert.equal(await page.evaluate(()=>Boolean(activeCinematic)),true,'Real attack opens the camera');
 await page.clock.fastForward(34);
 assert.equal(await page.evaluate(()=>IronVowScene.camera.isPerspectiveCamera),true);
 const shoulder=await page.evaluate(id=>{IronVowScene.render(clock,1);const actor=battle.units.find(u=>u.id===id);return IronVowScene.camera.position.distanceTo(IronVowScene.world(actor.vx,actor.vz));},attack.id);
 assert.ok(shoulder<12,'The actual camera moves over the attacker shoulder: '+shoulder);
 await page.evaluate(()=>document.querySelector('#skip-shot').click());
 for(let i=0;i<20&&await page.evaluate(()=>__ironVow.pending);i++)await page.clock.fastForward(1000);
 assert.equal(await page.evaluate(()=>__ironVow.pending||Boolean(activeCinematic)),false,'Skip resolves the real exchange');
 console.log('3D attack camera and Skip passed');
 const before=await page.evaluate(()=>({checkpoint:__ironVow.checkpoint(),generation:IronVowRenderer.generation}));
 // The extension exercises real GL resource loss; the game state must survive untouched.
 await page.evaluate(()=>{window.__loseContext=IronVowRenderer.get().getContext().getExtension('WEBGL_lose_context');__loseContext.loseContext();});
 for(let i=0;i<100&&!await page.evaluate(()=>IronVowRenderer.lost);i++)await new Promise(resolve=>setTimeout(resolve,25));
 assert.equal(await page.evaluate(()=>IronVowRenderer.lost),true,'Actual context-loss event is observed');
 await page.evaluate(()=>__loseContext.restoreContext());
 for(let i=0;i<100&&await page.evaluate(()=>IronVowRenderer.lost);i++)await new Promise(resolve=>setTimeout(resolve,25));
 await page.clock.fastForward(34);
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
