/* Combat presentation (fix/combat-presentation, owner 2026-11-18). Each assertion names the visible behaviour that failed before. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const simulate=require('./sim-harness.cjs');
(async()=>{
 // --- Effects in real Three.js pools ---
 const context={console,Math,Date};context.window=context;context.self=context;context.globalThis=context;
 const noop=()=>{},gradient={addColorStop:noop};
 context.document={createElement(){return{width:1,height:1,getContext:()=>new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(t,k)=>t[k]||noop})};}};
 vm.createContext(context);
 for(const file of ['rig-bench/vendor/three.min.js','scene/effects.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context,{filename:file});
 const {THREE,IronVowEffects}=context,V=(x,y,z)=>new THREE.Vector3(x,y,z);
 const scene=new THREE.Scene(),effects=IronVowEffects.create(scene,{groundAt:()=>0,partPoint:()=>V(0,3,0)});
 const shooter={wpn:{muzzle:new THREE.Object3D()},yaw:0,recoil:0,s:{pitch:{v:0},kx:{v:0},kz:{v:0}}};
 const streaks=()=>scene.children.filter(o=>o.isMesh&&o.visible&&o.geometry.parameters?.width===1&&o.geometry.parameters?.depth===1);

 // Bullets were 10 m beams of white light: the tail was 35% of a 30 m path on every round.
 for(const index of [0,1]){
  effects.clear();
  effects.fireFX(shooter,V(0,3,30),'rifle','body',{at:0,index,origin:V(0,3,0),target:V(0,3,30),flight:.4});
  effects.fx.update(.2);
  const s=streaks();assert.equal(s.length,1,'One round, one streak');
  assert.ok(s[0].scale.z<=(index?.95:2.25),`Round ${index} streak is a short tracer, not a beam: ${s[0].scale.z.toFixed(2)} m`);
  assert.ok(s[0].scale.x<=.05,'Rounds are thin');
  if(index)assert.ok(s[0].material.opacity<=.5,'Non-tracer rounds are faint');
 }

 // Missiles flew a flat arc (control point 4-6.5 m up); they now launch about 45 degrees and drop onto the target.
 effects.clear();
 const from=V(0,4,0),to=V(0,3,28);
 effects.fireFX(shooter,to,'missile','body',{at:0,index:0,origin:from,target:to,flight:1});
 const missile=scene.children.find(o=>o.isGroup&&o.visible&&o.children.length===3);
 effects.fx.update(.02);const early=missile.position.clone();
 const launch=Math.atan2(early.y-from.y,Math.hypot(early.x-from.x,early.z-from.z))*180/Math.PI;
 assert.ok(launch>=40&&launch<=50,'Missiles launch near 45 degrees: '+launch.toFixed(1));
 let apex=0;for(let i=0;i<60;i++){effects.fx.update(1/60);if(missile.visible)apex=Math.max(apex,missile.position.y);}
 assert.ok(apex-from.y>=6.5,'Missiles climb well above the shooter before dropping: '+(apex-from.y).toFixed(1)+' m');

 // Hits were barely visible: the flash and sparks are sized for the board camera, and kinetic hits leave a puff.
 effects.clear();
 effects.impact(V(0,3,0),V(0,0,-1),'rifle');
 const sparks=scene.children.filter(o=>o.isMesh&&o.visible&&o.geometry.parameters?.width===.05&&o.geometry.parameters?.depth===.38);
 assert.ok(sparks.length>=17&&sparks.every(o=>o.scale.x>=1.1),'Rifle hits throw at least 17 sparks, a little thicker than the bench');
 assert.ok(scene.children.some(o=>o.isSprite&&o.visible&&o.scale.x>=2.7),'Rifle hits flash at least 2.7 m wide');

 // --- Game rules and timeline ---
 const sim=simulate({random:()=>0}),{run}=sim;
 run("createBattle(0);battle.cover.clear();battle.busy=true");

 // Destroyed mechs could still be tapped and fired on.
 run("window.IronVowScene={...(window.IronVowScene||{}),pick:()=>battle.units.find(u=>u.team==='enemy')}");
 run("lockedTarget=battle.units.find(u=>u.team==='enemy').id;beginDestruction(battle.units.find(u=>u.team==='enemy'))");
 assert.equal(run("pick(0,0)"),null,'A destroyed mech under the pointer is not a pick');
 assert.equal(run("lockedTarget"),null,'Destroying the locked target releases the lock');
 assert.equal(await run("engage(current(),battle.units.find(u=>u.team==='enemy'),'body',unitWeapon(current()))"),null,'Firing on a wreck resolves to nothing');

 // A totally missed volley had no telegraph; the defender now sidesteps (dodge) or ducks (miss) as the rounds arrive, then returns.
 run("globalThis.foe=battle.units.find(u=>u.team==='enemy'&&u.alive&&!u.kind);beginEvade(foe,current(),true,clock+.1)");
 const lateral=t=>run(`(()=>{advanceUnitAnimation(foe,clock+${t},1/60);return Math.hypot(foe.vx-foe.x,foe.vz-foe.z)})()`);
 assert.equal(lateral(0),0,'Still before the rounds arrive');
 assert.ok(Math.abs(lateral(.45)-.22)<1e-6,'Dodge hops about 1.6 m back and aside while the rounds pass');
 assert.equal(lateral(1.3),0,'And settles back on its own tile');
 assert.equal(run("[foe.x,foe.z].every(Number.isInteger)"),true,'The rule position never moves');
 run("beginEvade(foe,current(),false,clock)");
 assert.ok(Math.abs(lateral(.3)-.07)<1e-6,'A plain miss is a short sway and duck, not a full hop');

 // The attack camera rushed the brace, step-up and priming.
 assert.deepEqual(JSON.parse(run("JSON.stringify(CINEMATIC_PACE)")),{step:1.6,aimHold:.45});
 console.log('PASS combat presentation: short tracers, 45-degree missiles, game-scale hits, no fire on wrecks, miss evade, cinematic pacing');
})().catch(e=>{console.error(e);process.exit(1);});
