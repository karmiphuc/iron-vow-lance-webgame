/* Shared Warden kinematics. Bench runtime and Blender bake use the same math. */
(function (scope) {
  'use strict';
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const TAU = 2 * Math.PI, stance = .6;
  const smoother = q => q*q*q*(q*(q*6-15)+10);

  function gaitFoot(cycle, stride = 1, lift = .85) {
    const phase = ((cycle % 1) + 1) % 1;
    if (phase < stance) return {phase, z: stride - 2 * stride * phase / stance, y: 0, pitch: 0};
    const q = (phase - stance) / (1 - stance);
    return {
      phase,
      z: -stride + 2 * stride * smoother(q),
      y: q < .42 ? lift * (1 - Math.pow(1 - q / .42, 3)) : lift * (1 - Math.pow((q - .42) / .58, 3)),
      pitch: q < .3 ? .5 * Math.sin(Math.PI * q / .3) : q > .62 ? -.38 * Math.sin(Math.PI * (q - .62) / .38) : 0
    };
  }

  function walkPelvis(blend, cycle, breathe, compression, knock, lunge) {
    const sway = Math.sin(TAU * (cycle - .05));
    return {
      position: [blend * .22 * sway, 3.46 + blend * (.05 * Math.cos(2 * TAU * (cycle - .3)) - .09) + breathe + compression - Math.max(0, lunge) * .3, lunge * .55 + knock],
      roll: blend * .05 * sway
    };
  }

  function solveLeg(pelvis, hip, roll, target) {
    const A = 1.45, B = 1.55;
    const [x, y, z] = target.map((value, i) => value - pelvis[i] - hip[i]);
    const lateral = Math.atan2(x, -y);
    const length = Math.min(Math.hypot(x, y, z), A + B - .001);
    const pitch = Math.atan2(z, Math.hypot(x, y));
    const alpha = Math.acos(clamp((A*A + length*length - B*B) / (2*A*length), -1, 1));
    const knee = Math.PI - Math.acos(clamp((A*A + B*B - length*length) / (2*A*B), -1, 1));
    return {
      hip: [-(pitch + alpha), 0, lateral - roll],
      knee,
      ankle: [(pitch + alpha) - knee, 0, -lateral + roll]
    };
  }

  const recoilOffset = recoil => -.35 * recoil;

  function gunPose(elevation, recoil, armSpring = 0, restShoulder = -.5) {
    const shoulder = restShoulder - .55 * elevation + armSpring * .05;
    const elbow = -Math.PI / 2 - elevation - shoulder;
    return {
      shoulder: [shoulder + recoil * .38, 0, -.06],
      elbow: Math.min(0, elbow - recoil * .6),
      wrist: -recoil * .12,
      offset: recoilOffset(recoil)
    };
  }

  const api = {stance, gaitFoot, walkPelvis, solveLeg, gunPose, recoilOffset};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else scope.IronVowRigMotion = api;
})(globalThis);
