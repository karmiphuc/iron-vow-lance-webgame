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

const smooth = (a,b,t) => {const q=Math.max(0,Math.min(1,(t-a)/(b-a)));return q*q*(3-2*q)};

// A deliberate single step, independent of the looping walk cycle. +Z is forward.
// The rear ankle never moves; all subsequent attack rows retain these targets.
function attackSample(prime=1, recoil=0, elevation=.10, melee=null, leadSide='L') {
  const pose=sample(0,0,recoil,elevation,0,melee);
  const advance=smooth(.20,.875,prime), settle=smooth(.45,1,prime);
  const lift=prime>.125&&prime<.875?.50*Math.sin(Math.PI*(prime-.125)/.75):0;
  const load=smooth(0,.25,prime)*(1-smooth(.55,1,prime));
  pose.pelvis.position[0]=(leadSide==='L'?-1:1)*.12*load;
  pose.pelvis.position[1]-=.09*settle+.045*load;
  pose.pelvis.position[2]+=.28*advance;
  // Keep feet horizontal and solve against fixed world targets even when a
  // melee lunge compresses/translates the pelvis. No foot sliding on recoil.
  pose.leadSide=leadSide;
  pose.footTargets=leadSide==='L'
    ? [[.68,.40+lift,.18+.78*advance],[-.68,.40,-.18]]
    : [[.68,.40,.18],[-.68,.40+lift,-.18+1.14*advance]];
  pose.legs=pose.footTargets.map((target,i)=>motion.solveLeg(
    pose.pelvis.position,[(i===0?1:-1)*.62,-.10,0],0,target));
  return pose;
}

function sampleStrikes(sampler=pose=>sample(0,0,0,0,0,pose)){
  const bench=fs.readFileSync(path.join(__dirname,'../dist/rig-bench/index.html'),'utf8');
  const idle={lsx:-.35,lsz:.18,lel:-1.15,lwr:.15,ty:0,tp:0,lunge:0};
  return Object.fromEntries(['breaker','cleaver','piledriver'].map(id=>{
    const block=bench.slice(bench.indexOf("id:'"+id+"'"));
    const keys=vm.runInNewContext(block.match(/profile:\{keys:(.+),\n/)[1]);
    const impact=Number(block.match(/impact:(\.[0-9]+)/)[1]);
    const end=keys.at(-1)[0];
    const selected=keys.slice(0,-1).map(([t,pose])=>({
      level:t<=impact?.7*t/impact:.7+.3*(t-impact)/(end-impact),
      pose:sampler(pose||idle)
    }));
    selected.push({level:1,pose:sampler(idle)});
    return [id,selected];
  }));
}
function attackRows(leadSide) {
  return {
    prime:Array.from({length:9},(_,i)=>{const level=i/8;return {level,
      pose:attackSample(level,0,.10*smooth(.60,1,level),null,leadSide)}}),
    // Prime finishes aimed; later aim selection must not undo the plant.
    aim:[0,.33,.67,1].map(level=>({level,pose:attackSample(1,0,.10,null,leadSide)})),
    kick:kickLevels.map(level=>({level,pose:attackSample(1,level,.10,null,leadSide)})),
    ...sampleStrikes(pose=>attackSample(1,0,0,pose,leadSide))
  };
}
process.stdout.write(JSON.stringify({
  idle: sample(0, 0, 0),
  strikes: process.argv.includes("--arsenal") ? sampleStrikes() : undefined,
  gait: Array.from({length: gaitFrames}, (_, i) => sample(1, i/gaitFrames, 0)),
  aims: [.33,.67,1].map(level => ({level, pose: sample(0,0,0,.10*level)})),
  deaths: [.2,.4,.6,.8,1].map(level => ({level, pose: sample(0,0,0,0,level)})),
  kicks: kickLevels.map(level => ({level, pose: sample(0, 0, level, .10)})),
  attack: process.argv.includes("--arsenal") ? attackRows('L') : undefined,
  attackLeft: process.argv.includes("--arsenal") ? attackRows('R') : undefined
}));
