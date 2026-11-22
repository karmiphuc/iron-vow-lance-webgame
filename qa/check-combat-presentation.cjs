/* Combat presentation (fix/combat-presentation, owner 2026-11-18; FM3 cinematics, owner 2026-11-22).
   Each assertion names the visible behaviour that failed before. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const simulate=require('./sim-harness.cjs');
(async()=>{
 // --- Effects in real Three.js pools ---
 const context={console,Math,Date,clock:0,innerWidth:1440,reducedMotion:false};context.window=context;context.self=context;context.globalThis=context;
 const noop=()=>{},gradient={addColorStop:noop};
 context.document={createElement(){return{width:1,height:1,getContext:()=>new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(t,k)=>t[k]||noop})};}};
 vm.createContext(context);
 for(const file of ['rig-bench/vendor/three.min.js','scene/effects.js','scene/weapon-fx.js','scene/combat.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context,{filename:file});
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

 // FM3 hit: a landed round is an orange-white fireball on the armour with debris and a few short sparks. The previous fan of long
 // white streaks read as planks at duel distance.
 effects.clear();
 effects.impact(V(0,3,0),V(0,0,-1),'rifle');
 const sparks=scene.children.filter(o=>o.isMesh&&o.visible&&o.geometry.parameters?.width===.05&&o.geometry.parameters?.depth===.38);
 const fireball=scene.children.filter(o=>o.isSprite&&o.visible&&o.position.distanceTo(V(0,3,0))<1.5);
 assert.ok(fireball.length>=3,'A rifle hit is a fireball: core glow plus fire sprites at the impact ('+fireball.length+')');
 assert.ok(sparks.length>=1&&sparks.length<=4,'A rifle hit throws only a few short sparks, not a streak fan ('+sparks.length+')');
 assert.equal(streaks().length,0,'A hit draws no streak spray');
 effects.clear();
 effects.impact(V(0,3,0),V(0,0,-1),'missile');
 assert.ok(scene.children.some(o=>o.isSprite&&o.visible&&o.scale.x>=1.3),'A missile hit is a large fireball');
 // A missed round's ground strike: dirt, dust and a scorch where it lands.
 effects.clear();
 effects.groundHit(V(4,0,9),'rifle');
 assert.ok(scene.children.some(o=>o.isMesh&&o.visible&&o.position.distanceTo(V(4,0,9))<.5&&o.geometry.parameters?.width!==.05),'A ground strike kicks up debris at its point');

 // Scatter contacts retain their own hit events but share one mechanical kick.
 context.IronVowRenderer={quality:{tier:'high'}};
 const actor={id:'attacker',alive:true},target={id:'defender',alive:true};
 const springs=()=>Object.fromEntries(['kx','kz','pitch','roll','comp','arm'].map(k=>[k,{v:0}]));
 const model={s:springs()},models=new Map([[target.id,{entry:{m:model}}]]);
 const combat=context.IronVowCombat.create(new THREE.Scene(),{models,sync(){},attachmentPoint:unit=>unit===actor?V(0,3,0):V(0,3,10)});
 const part={part:'right',index:0,before:100,after:95,amount:5,damage:5};
 combat.landed(actor,target,{id:'shotgun'},part,false);
 const single=Object.fromEntries(Object.entries(model.s).map(([k,spring])=>[k,spring.v]));
 model.s=springs();
 for(let i=0;i<12;i++)combat.landed(actor,target,{id:'shotgun',scatter:true,burst:12},{...part,index:i},false);
 for(const [k,value] of Object.entries(single))assert.ok(Math.abs(model.s[k].v-value)<1e-10,'One shell bounds the '+k+' spring impulse');
 assert.ok(model.s.roll.v<0,'A hit turns the struck shoulder');
 assert.equal(combat.history.filter(e=>e.type==='impact').length,13,'Every pellet keeps its own impact');
 model.s=springs();
 combat.landed(actor,target,{id:'shotgun'},{...part,part:'left'},true);
 assert.ok(model.s.roll.v>0,'A shield impact turns the shield shoulder');

 // FM3 realism: a missed round in a burst flew to a point beside the target and vanished in the air. It now strikes the
 // ground: every third short of the target in front of the hit camera, the rest past it, wide of the hull, on both sides.
 Object.assign(context,{effects:[],battle:{units:[]},shake:0,shotMuzzle:()=>'muzzle'});
 const lane=context.IronVowCombat.create(new THREE.Scene(),{models:new Map(),sync(){},groundAt:()=>0,isLive:()=>false,world:()=>V(0,0,0),
  attachmentPoint:unit=>unit===actor?V(0,4,0):V(0,3,22)});
 const strikes=()=>lane.history.filter(e=>e.type==='ground');
 for(const index of [0,1,2,3,4,5]){
  context.clock=10+index;
  lane.launch(actor,target,{id:'rifle'},index,[{part:'body',index,hit:false,travel:.1,before:100,after:100,amount:0,damage:0}],false);
  lane.update(context.clock,1/60);
  assert.equal(strikes().length,index,'A missed round is in the air when it leaves the muzzle');
  for(let f=0;f<36;f++){context.clock+=1/60;lane.update(context.clock,1/60);}
  const g=strikes().at(-1);
  assert.equal(strikes().length,index+1,'The missed round strikes the ground once on arrival');
  assert.equal(g.point[1],0,'It lands on the ground');
  assert.ok(Math.hypot(g.point[0],g.point[2]-22)>=2,'It lands clear of the target, never in it: '+g.point.map(v=>v.toFixed(2)));
  assert.ok(index%3===2?g.point[2]<22-1.5:g.point[2]>22+1.5&&Math.abs(g.point[0])>=2.8,(index%3===2?'Every third falls short':'The rest carry past, wide of the hull')+': '+g.point.map(v=>v.toFixed(2)));
  // arrival scales with the distance flown: a short round lands before its contact time, a long one after
  const arrive=g.time-(10+index),scale=Math.hypot(g.point[0],g.point[1]-4,g.point[2])/Math.hypot(0,-1,22);
  assert.ok(Math.abs(arrive-.1*scale)<1/60+1e-9,'It lands when it gets there: '+arrive.toFixed(3)+' vs '+(.1*scale).toFixed(3));
 }
 assert.ok(strikes().some(g=>g.point[0]>0)&&strikes().some(g=>g.point[0]<0),'Missed rounds in a burst fall on both sides of the target');
 lane.launch(actor,target,{id:'rifle'},6,[{part:'body',index:6,hit:false,travel:.1}],false);lane.clear();context.clock+=2;lane.update(context.clock,1/60);
 assert.equal(strikes().length,6,'Skipping the attack drops rounds still in the air');

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
 run('reducedMotion=true');
 assert.equal(lateral(.31),0,'Switching on reduced motion clears an active sway');
 run('reducedMotion=false;beginEvade(foe,current(),true,clock);beginDestruction(foe)');
 assert.equal(lateral(.3),0,'A destroyed hull stays on its tile during an interrupted dodge');

 // The attack camera rushed the brace, step-up and priming.
 assert.deepEqual(JSON.parse(run("JSON.stringify(CINEMATIC_PACE)")),{step:1.6,aimHold:.45});

 // FM3 duel feedback: no HP strip over the duel (owner did not approve it); a damage number pops at each landed round, a part
 // that breaks names itself, and nothing lingers after the camera closes.
 run("globalThis.duelist=battle.units.find(u=>u.team==='enemy'&&!u.kind);window.IronVowScene.projectWorld=()=>({x:320,y:200});window.IronVowScene.partPoint=()=>({clone(){return {x:1,y:2,z:3}}})");
 run("globalThis.fills=[];globalThis.words=[];ctx.fillRect=(...a)=>fills.push(a);ctx.fillText=(text)=>words.push(String(text));");
 run("activeCinematic={actor:current(),target:duelist,w:unitWeapon(current()),phase:'fire',part:'body'};duelNumbers.length=0;duelBanner=null;drawAttackCamera()");
 assert.equal(run('fills.length'),0,'The duel draws no HP strip or banner box');
 const hitPoint="{clone(){return {x:1,y:2,z:3}}}";
 run(`window.IronVowDuelHit(duelist,${hitPoint},{damage:7,before:20,after:13,part:'left'},false);window.IronVowDuelHit(duelist,${hitPoint},{damage:13,before:13,after:0,part:'left'},false)`);
 assert.deepEqual(JSON.parse(run('JSON.stringify(duelNumbers.map(n=>n.text))')),['7','13','L ARM'],'Each landed round pops its damage; a destroyed part names itself');
 run('drawAttackCamera()');
 assert.ok(run("words.includes('7')&&words.includes('13')"),'The numbers draw at the impact point');
 // an 8-round burst at one impact point: every live number keeps its own place (they overprinted before)
 run(`for(let i=0;i<8;i++,clock+=.06)window.IronVowDuelHit(duelist,${hitPoint},{damage:4+i%2,before:99,after:90,part:'body'},false)`);
 const places=JSON.parse(run("JSON.stringify(duelNumbers.flatMap(n=>n.big?[-1,0,1].map(c=>c*30+','+n.stack):[n.dx+','+n.stack]))"));
 assert.equal(new Set(places).size,places.length,'Simultaneous damage numbers never share a position: '+places.join(' '));
 run("duelText(duelist,'MISS');duelSkill(current(),'Deadeye')");
 assert.equal(run("duelNumbers.at(-1).text+'|'+duelBanner.text+'|'+duelBanner.ally"),'MISS|Deadeye|true','A miss reads MISS; a skill banner names it, coloured by side');
 run('closeAttackCamera(activeCinematic)');
 assert.equal(run('duelNumbers.length+(duelBanner?1:0)'),0,'Nothing lingers after the duel closes');

 // Deaths played too fast to read: the collapse now runs 1.35x slower and opens in slow motion (0.3x for 0.55 s).
 run("globalThis.wreck=battle.units.find(u=>u.team==='enemy'&&!u.kind);wreck.alive=true;delete wreck.downReason;beginDestruction(wreck)");
 assert.deepEqual(JSON.parse(run('JSON.stringify(DEATH_TIME)')),{window:.55,rate:.3,stretch:1.35});
 assert.equal(run('deathSlowmo(clock+.1)'),true,'The first frames of a death run in slow motion');
 assert.equal(run('deathSlowmo(clock+.7)'),false,'Then the collapse resumes normal speed');
 const linear=run('DESTRUCTION.end*destructionPace(wreck)'),span=run('destructionTime(wreck,DESTRUCTION.end)');
 assert.ok(span>linear*1.35,'The whole death plays slower than before: '+span.toFixed(2)+' s vs '+linear.toFixed(2)+' s');
 assert.ok(Math.abs(run('destructionAge(wreck,clock+destructionTime(wreck,1.05))')-1.05)<1e-6,'Beat times invert exactly (the reactor blast lands on its beat)');
 run('reducedMotion=true');
 assert.equal(run('deathSlowmo(clock+.1)'),false,'Reduced motion never slows the scene');
 run('reducedMotion=false');
 console.log('PASS combat presentation: short tracers, 45-degree missiles, fireball hits, misses strike the ground, bounded shell recoil, directional hit reactions, no fire on wrecks, miss evade, cinematic pacing, damage numbers without an HP strip, slow-motion deaths');
})().catch(e=>{console.error(e);process.exit(1);});
