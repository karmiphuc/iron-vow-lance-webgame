const assert=require('node:assert/strict');
const {readFileSync,writeFileSync}=require('node:fs');
const {join}=require('node:path');
const simulate=require('./sim-harness.cjs');

for(let kind=0;kind<8;kind++){
 const sim=simulate({seed:42,reducedMotion:true}),run=sim.run,slot=kind<3?kind:0;
 if(kind>=3)assert.equal(run(`hirePilot(${kind})&&assignPilot(0,${kind})`),true);
 const tracks=JSON.parse(run(`JSON.stringify(PILOT_TREES[${kind}])`));
 assert.equal(tracks.length,3);
 assert.ok(tracks.every(track=>track.nodes.length===6));
 assert.equal(new Set(tracks.flatMap(track=>track.nodes.map(node=>node.id))).size,18);
 const licenses=Array.from(run(`PILOT_LICENSES[${kind}]`));
 assert.equal(new Set(licenses).size,3);
 run(`save.units[${slot}].level=2`);
 const third=tracks[2].nodes;
 assert.ok(run(`learnTraining(${slot},'${third[0].id}')&&learnTraining(${slot},'${third[1].id}')`));
 assert.equal(run(`setFieldLicense(${kind},2,'${licenses[0]}')`),false);
 run(`save.units[${slot}].level=10`);
 assert.ok(run(`setFieldLicense(${kind},10,'${licenses[0]}')`));
 assert.ok(run(`PILOT_TREES[${kind}][2].nodes.slice(2).every(node=>learnTraining(${slot},node.id))`));
 assert.equal(run(`selectedDoctrine(${kind},learnedTraining(${slot})).name`),tracks[2].name);
 assert.equal(run(`trainingStatus(${kind},'${tracks[0].nodes[2].id}',learnedTraining(${slot}),10)`),'CAPSTONE CHOSEN');
 run(`trainingTree(${slot},false)`);
 for(const track of tracks)assert.ok(sim.node('#modal').innerHTML.includes(track.name));
 assert.ok(sim.node('#modal').innerHTML.includes('FIELD')||sim.node('#modal').innerHTML.includes('Field license'));
 assert.ok(run(`resetPilotTraining(${slot})`));
 assert.equal(run(`trainingPoints(${slot})`),8);
 assert.equal(run(`fieldLicense(${kind})`),licenses[0]);
 assert.equal(run(`retrainWait(${kind})`),30);
 assert.ok(run(`learnTraining(${slot},'${tracks[0].nodes[0].id}')`));
 assert.equal(run(`resetPilotTraining(${slot})`),false);
 const reload=simulate({storage:new Map(sim.storage)});
 assert.equal(reload.run(`retrainWait(${kind})`),30);
 assert.equal(reload.run(`fieldLicense(${kind})`),licenses[0]);
}

const effects={
 guard:[0,'ally','receiver.brace'],
 paint:[0,'enemy','receiver.painted.aim===.20'],
 jam:[1,'enemy','receiver.blackout.aim===.20'],
 repair:[0,'ally','receiver.hp.right===receiver.max.right-5'],
 relay:[1,'ally','receiver.order.discount===2 && paidAttackAP(receiver,weapon("rifle"))===Math.max(1,weaponAP(weapon("rifle"),receiver.training)-2)'],
 patch:[1,'ally','receiver.hp.body===receiver.max.body-5']
};
const fixturePath=join(__dirname,'fixtures','field-license-used.json');
for(const [name,[kind,team,result]] of Object.entries(effects)){
 const sim=simulate({seed:42,reducedMotion:true}),run=sim.run;
 run(`
 save.units[${kind}].level=3;
 setFieldLicense(${kind},3,'${name}');
 createBattle(0,false,false,[0,1,2]);
 selected=${kind};
 var officer=current();
 var receiver=battle.units.find(u=>u.team==='${team}'&&u!==officer);
 Object.assign(receiver,{x:officer.x+1,z:officer.z});
 battle.cover.delete(receiver.x+','+receiver.z);
 receiver.hp.right-=25;receiver.hp.body-=35;
 var ap=officer.ap;
 `);
 assert.equal(run('useFieldLicense(officer,receiver)'),true,name);
 assert.equal(run(result),true,name);
 assert.equal(run('officer.ap===ap-2&&officer.licenseUsed===true&&!officer.skill'),true,name);
 assert.equal(run('useFieldLicense(officer,receiver)'),false,name);
 assert.equal(run('setFieldLicense(officer.pilot,3,"")'),false,name);
 assert.match(sim.node('#ui').innerHTML,/field-license/);
 if(name==='relay'&&process.argv.includes('--write-fixture'))writeFileSync(fixturePath,JSON.stringify(JSON.parse(sim.storage.get('iron-vow-career')),null,2)+'\n');
 const reload=simulate({storage:new Map(sim.storage)});
 assert.equal(reload.run('current().licenseUsed'),true,name);
 assert.equal(reload.run(`fieldLicense(${kind})`),name);
}

const sim=simulate({storage:new Map([['iron-vow-career',readFileSync(fixturePath,'utf8')]])});
assert.equal(sim.run('current().licenseUsed'),true);
sim.run(`
 var [rook,ghost,anchor]=battle.units;
 rook.training={shieldNet:.15};ghost.training={shieldNet:.25};
 rook.brace=false;ghost.brace=true;
 Object.assign(rook,{x:4,z:5});Object.assign(anchor,{x:5,z:5});Object.assign(ghost,{x:5,z:6});
`);
assert.equal(sim.run('shieldProtection(anchor)'),.25);
sim.run('rook.brace=true');
assert.equal(sim.run('shieldProtection(anchor)'),.25,'overlapping networks do not stack');
console.log('PASS eight pilots, 24 doctrine paths, six combat licenses, reserve-compatible unlocks, cooldown, existing save and active license reload.');
