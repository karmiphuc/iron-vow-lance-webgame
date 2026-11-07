const motion = require('../dist/rig-bench/rig-motion.js');
const gaitFrames = 12;
const kickLevels = [.22, .48, .8];

function sample(blend, cycle, recoil, elevation = 0, kneel = 0) {
  const pelvis = motion.walkPelvis(blend, cycle, 0, 0, 0, 0);
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
    leftShoulder: -.15+blend*.14*Math.sin(2*Math.PI*cycle-.6),
    spinePitch: blend*.05-recoil*.025+kneel*.18};
}

process.stdout.write(JSON.stringify({
  idle: sample(0, 0, 0),
  gait: Array.from({length: gaitFrames}, (_, i) => sample(1, i/gaitFrames, 0)),
  aims: [.33,.67,1].map(level => ({level, pose: sample(0,0,0,.10*level)})),
  deaths: [.2,.4,.6,.8,1].map(level => ({level, pose: sample(0,0,0,0,level)})),
  kicks: kickLevels.map(level => ({level, pose: sample(0, 0, level, .10)}))
}));
