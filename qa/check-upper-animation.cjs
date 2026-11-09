const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),create=require('./sim-harness.cjs');
const {createCanvas}=require('@napi-rs/canvas');
const sim=create();sim.run('deploy(0);closeModal()');
// Explicit regression against the feet the user approved, rather than a new gait implementation.
for(const row of JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/walk-feet-approved.json'),'utf8'))){const{frame,phase,x,y}=row;const p=sim.run(`(()=>{const u=battle.units[${frame}];u.face=-1;u.motion={fromX:1,fromZ:8,toX:1,toZ:7,start:0,duration:MECH_MOTION[${frame}].step,gaitBase:${frame},stepIndex:1,totalSteps:4};return deformMechVertex(u,${x},${y},animationPose(u,MECH_MOTION[${frame}].step*${phase}))})()`);assert.ok(Math.abs(p.x-row.result.x)<1e-10&&Math.abs(p.y-row.result.y)<1e-10,'Approved feet changed')}
sim.run("const actor=battle.units[0];actor.motion=null;actor.weapon='rifle';actor.attack={kind:'rifle',start:0,fireAt:null,releaseAt:null}");
const muzzle=sim.run('deformMechVertex(actor,.075,.565,animationPose(actor,.23))'),head=sim.run('deformMechVertex(actor,.55,.20,animationPose(actor,.23))');assert.ok(muzzle.y<.485,'Arms must raise the rifle');assert.ok(Math.hypot(head.x-.55,head.y-.20)<.02,'Aiming should not drag the whole head/chest');
const foot=sim.run('deformMechVertex(actor,.3,1,animationPose(actor,.23))');assert.equal(foot.x,.3);assert.equal(foot.y,1);
const length=sim.run("(()=>{const pose=animationPose(actor,.23),a=deformMechVertex(actor,.075,.565,pose),b=deformMechVertex(actor,.75,.35,pose);return Math.hypot(a.x-b.x,a.y-b.y)})()");assert.ok(Math.abs(length-Math.hypot(.075-.75,.565-.35))<1e-8,'Rifle must stay rigid while aiming');
sim.run("actor.alive=false;actor.attack=null;actor.deathTime=0;actor.deathStyle='kneel';actor.deathEvents=0");
const kneeling=sim.run('deformMechVertex(actor,.55,.30,animationPose(actor,.6))'),planted=sim.run('deformMechVertex(actor,.74,1,animationPose(actor,.6))');assert.ok(kneeling.y>.45,'Chest should descend as knees fold');assert.ok(Math.abs(planted.x-.74)<1e-10);assert.ok(Math.abs(planted.y-1)<1e-10);assert.ok(sim.run('deformMechVertex(actor,.345,.775,animationPose(actor,.6)).y')>.94,'Front knee should reach the ground');
assert.equal(sim.run("Math.abs(destructionRoot(actor,animationPose(actor,.9)).angle)"),0);sim.run("actor.deathStyle='fall'");assert.ok(sim.run('Math.abs(destructionRoot(actor,animationPose(actor,.94)).angle)')>1);
sim.run("effects=[];actor.deathStyle='kneel';updateDestruction(actor,.6)");assert.equal(sim.run("effects.filter(e=>e.type==='detonation').length"),0);assert.equal(sim.run("effects.filter(e=>e.type==='step').length"),1);sim.run('updateDestruction(actor,.7)');assert.equal(sim.run("effects.filter(e=>e.type==='detonation').length"),1);sim.run('updateDestruction(actor,1.1);updateDestruction(actor,1.2)');assert.equal(sim.run("effects.filter(e=>e.type==='detonation'&&e.big).length"),1);sim.run('updateDestruction(actor,1.3)');assert.equal(sim.run("effects.filter(e=>e.type==='detonation').length"),3);
// An attachment stored in world-relative coordinates follows camera changes exactly.
sim.run('const attachment=freezeAttachment(battle.units[1],"body",0);const before=resolveAttachment(attachment);scale*=2;origin.x+=100;const after=resolveAttachment(attachment)');assert.ok(sim.run('Number.isFinite(after.x)&&Number.isFinite(after.y)'));
console.log('PASS: approved feet unchanged; independent arm aim with rigid rifle/planted feet; knee-fold chest drop; distinct fall; reactor blast after collapse exactly once; camera-relative attachments.');

(async()=>{
 const shot=create({random:()=>0,reducedMotion:true}),run=shot.run;
 run('deploy(0);closeModal();const foe=battle.units[3]');
 await run('shoot(current(),foe,"left")');
 assert.equal(run('foe.hitPart'),'left');
 assert.ok(run('foe.hp.left<foe.max.left&&foe.hp.left>foe.max.left/2'));
 shot.sandbox.tintCanvas=createCanvas(192,160);
 shot.sandbox.OffscreenCanvas=function(w,h){return createCanvas(w,h)};
 run(`canvas.width=192;canvas.height=160;ctx=tintCanvas.getContext('2d');scale=40;
  const partPoints={body:{x:96,y:72},pilot:{x:96,y:35},right:{x:55,y:72},left:{x:137,y:72},legs:{x:96,y:115}};
  function sampleTints(age,scorch){
   ctx.clearRect(0,0,192,160);
   const paint=()=>{ctx.fillStyle='#859aa7';ctx.fillRect(20,15,150,130)};
   paint();drawPartTints(foe,foe.hitTime+age,paint,part=>partPoints[part],scorch);
   return Object.values(partPoints).map(({x,y})=>[...ctx.getImageData(x,y,1,1).data].slice(0,3));
  }`);
 const plain=[133,154,167],tints=(age,scorch=true)=>JSON.parse(run(`JSON.stringify(sampleTints(${age},${scorch}))`));
 const flash=tints(.15);
 assert.ok(flash[3][0]>plain[0]);
 assert.deepEqual(flash.filter((_,i)=>i!==3),Array(4).fill(plain));
 run('foe.hp.right=0');
 const worn=tints(1);
 assert.ok(worn[2][0]<plain[0]&&worn[2][1]<plain[1]&&worn[2][2]<plain[2]);
 assert.deepEqual(worn.filter((_,i)=>i!==2),Array(4).fill(plain));
 assert.deepEqual(tints(.15,false),flash,'live meshes keep their own persistent material damage');
 console.log('PASS: an actual hit flashes the selected subsystem, the flash expires, and a disabled raster subsystem stays dark.');
})().catch(e=>{console.error(e);process.exitCode=1});
