const assert=require('node:assert/strict'),create=require('./sim-harness.cjs');
(async()=>{
 const scheduled=[],sim=create({setTimeout:(fn,ms)=>{scheduled.push({fn,ms});return scheduled.length}});
 sim.run('deploy(1,true);closeModal();current().heading=headingTo(-1,0)');
 const movement=sim.run('moveUnit(current(),1,7)');
 assert.ok(scheduled[0].ms>110&&scheduled[0].ms<=260);
 assert.equal(sim.run('current().z'),8);
 assert.equal(sim.run('current().motion'),undefined);
 sim.run(`clock=${scheduled[0].ms/1000}`);scheduled[0].fn();await sim.flush();
 assert.equal(scheduled[1].ms,310);assert.equal(sim.run('current().ap'),8);
 assert.equal(sim.run('current().heading'),sim.run('headingTo(0,-1)'));
 sim.run('advanceUnitAnimation(current(),clock+.155,1/60)');assert.ok(Math.abs(sim.run('current().vz')-7.5)<1e-8);assert.equal(sim.run('current().motion.fromZ'),8);
 const foot=sim.run('deformMechVertex(current(),.3,.96,animationPose(current(),clock+.155))');assert.ok(foot.y<.94,'Swing foot should lift');
 sim.run('clock+=.31');scheduled[1].fn();await movement;assert.equal(sim.run('current().motion'),null);assert.equal(sim.run('current().vz'),7);assert.equal(sim.run('current().walkCount'),1);assert.equal(sim.run("effects.at(-1).type"),'step');
 for(const fps of[30,60,144]){sim.run('current().motion={fromX:1,fromZ:7,toX:2,toZ:7,start:0,duration:.31,gaitBase:0,stepIndex:0,totalSteps:1}');for(let f=0;f<=Math.ceil(fps*.31);f++)sim.run(`advanceUnitAnimation(current(),${Math.min(.31,f/fps)},${1/fps})`);assert.equal(sim.run('current().vx'),2);assert.equal(sim.run('current().vz'),7)}
 sim.run("current().motion=null;current().fireTime=0;current().weapon='rail';current().brace=false;current().braceBlend=0");
 assert.ok(sim.run('Math.abs(animationPose(current(),.04).recoil)')>.1);assert.equal(sim.run('animationPose(current(),1).recoil'),0);
 const stable=sim.run('deformMechVertex(current(),.3,1,animationPose(current(),.04))');assert.equal(stable.x,.3);assert.equal(stable.y,1);
 const torso=sim.run('deformMechVertex(current(),.6,.3,animationPose(current(),.04))');assert.notEqual(torso.x,.6);
 sim.run("const fallen=current();fallen.alive=false;fallen.deathTime=0");assert.equal(sim.run('animationPose(fallen,.56).kneel'),1);assert.equal(sim.run('animationPose(fallen,.9).explosion'),0);assert.equal(sim.run('animationPose(fallen,1.3).explosion'),1);assert.equal(sim.run('animationPose(fallen,2).death'),1);
 const reduced=create({reducedMotion:true});reduced.run("deploy(1,true);closeModal();current().fireTime=0;current().hitTime=0;current().motion={fromX:1,fromZ:8,toX:1,toZ:7,start:0,duration:.3,gaitBase:0,stepIndex:0,totalSteps:1}");assert.equal(reduced.run('animationPose(current(),.1).walk'),0);assert.equal(reduced.run('animationPose(current(),.1).recoil'),0);assert.equal(reduced.run('animationPose(current(),.1).impact'),0);
 const duration=sim.run('MECH_MOTION.map(m=>m.step)');assert.ok(duration[1]<duration[0]&&duration[0]<duration[2]);
 console.log('PASS: alternating foot lift, frame-independent movement at 30/60/144Hz, landing/AP timing, planted-foot rail recoil, collapse progression, weight-specific speeds and reduced-motion behavior.');
})().catch(e=>{console.error(e);process.exitCode=1});
