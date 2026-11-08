const motion = require('../dist/rig-bench/rig-motion.js');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const gaitFrames = 12;
const kickLevels = [.22, .48, .8];

function sample(blend, cycle, recoil, elevation = 0, kneel = 0, melee = null) {
  const pelvis = motion.walkPelvis(blend, cycle, 0, 0, 0, melee?.lunge??0);
  // The tactical ready pose crouches at rest, with its soles at 0.10 m.
  pelvis.position[1] -= (1-blend)*.115 + kneel*1.05;
  pelvis.position[2] += kneel*.25;
  const legs = [1, -1].map((side, i) => {
    const foot = motion.gaitFoot(cycle+i*.5);
    const target = [side*.68, .40+foot.y*blend, side*.18*(1-blend)+foot.z*blend+(i===0?-kneel*.70:0)];
    const leg = motion.solveLeg(pelvis.position, [side*.62, -.10, 0], pelvis.roll, target);
    leg.ankle[0] += foot.pitch*blend;
    return leg;
  });
  return {pelvis, legs, gun: motion.gunPose(elevation, recoil, 0, -.96+kneel*.30),
    leftShoulder: melee?.lsx??(-.15+blend*.14*Math.sin(2*Math.PI*cycle-.6)),
    left: melee,
    spinePitch: (melee?.tp??0)+blend*.05-recoil*.025+kneel*.18};
}

function sampleStrikes(){
  const bench=fs.readFileSync(path.join(__dirname,'../dist/rig-bench/index.html'),'utf8');
  const idle={lsx:-.35,lsz:.18,lel:-1.15,lwr:.15,ty:0,tp:0,lunge:0};
  return Object.fromEntries(['breaker','cleaver','piledriver'].map(id=>{
    const block=bench.slice(bench.indexOf("id:'"+id+"'"));
    const keys=vm.runInNewContext(block.match(/profile:\{keys:(.+),\n/)[1]);
    const impact=Number(block.match(/impact:(\.[0-9]+)/)[1]);
    const end=keys.at(-1)[0];
    const selected=keys.slice(0,-1).map(([t,pose])=>({
      level:t<=impact?.7*t/impact:.7+.3*(t-impact)/(end-impact),
      pose:sample(0,0,0,0,0,pose||idle)
    }));
    selected.push({level:1,pose:sample(0,0,0,0,0,idle)});
    return [id,selected];
  }));
}
process.stdout.write(JSON.stringify({
  idle: sample(0, 0, 0),
  strikes: process.argv.includes("--arsenal") ? sampleStrikes() : undefined,
  gait: Array.from({length: gaitFrames}, (_, i) => sample(1, i/gaitFrames, 0)),
  aims: [.33,.67,1].map(level => ({level, pose: sample(0,0,0,.10*level)})),
  deaths: [.2,.4,.6,.8,1].map(level => ({level, pose: sample(0,0,0,0,level)})),
  kicks: kickLevels.map(level => ({level, pose: sample(0, 0, level, .10)}))
}));
