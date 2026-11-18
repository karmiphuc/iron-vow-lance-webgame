/* Walk tuning for the 3D board (owner-approved walk-weight demo, 2026-11-18).
 * The per-tile move time (game.js moveUnit: .22 + 1.3 x MECH_MOTION step) and the 1.7 m step length were tuned for the old 3.4 m tile.
 * The 3D board tile is 7.4 m (scene/battle.js TILE), so every hull covered 2.2x the ground in the same time: light hulls ran at 9-13 m/s
 * with 7-13 steps a second, and long-legged ones outran their feet (catch-up steps). This module restores the designed walking speed,
 * caps the step rate near Gatecrasher's, and corrects the step length and foot track that made several hulls patter or walk A-framed.
 * Every number below was measured with the shipped rigs and walk code; frame IDs are the stable FRAMES indices in game.js. */
(function(root){
'use strict';
const BOARD_TILE=7.4,DESIGN_TILE=3.4;   // scene/battle.js TILE; the board tile the move timeline was tuned for
const STEP_LEN=1.7;                     // scene-rigs.js world stepLen, scaled per rig by dims.stride
const CADENCE_CAP=2.2;                  // steps per second; Gatecrasher at its designed speed takes ~1.9
const TOE=2*Math.PI/180;                // toe-out; the rigs shipped with 10 deg, which reads as a duck walk
/* dims.stride overrides: the shortest step at which no leg runs out of reach mid-stride (no catch-up steps while walking).
   Kestrel and Basilisk drop the 0.6 that rig-v2-stock.js gives them, which made them patter. */
const STRIDE={1:1,2:1,13:.75,14:.65,16:.55,19:.65};
/* foot track half-width (leg restX, rig units): the narrowest track at which the feet stand at least 6 cm apart. Where restX is wider than
   the hip the leg solver rolls the whole leg outward (chassis.js solveLeg), so the hull walks A-framed. Gravemaw (15) is absent: its feet are
   too large for its hip spacing, and Cicada (4) keeps 14 deg for the same reason; both need their hip joints moved out in the model.
   Cairn (21) was added after the demo: hips at 0.68, shipped track 1.485 with 1.34 m between the feet, so 0.82 keeps about 10 cm. */
const STANCE={0:.86,4:1.21,5:.96,6:.80,8:1.19,9:.95,10:1.24,12:1.04,13:.64,14:.64,17:1.04,18:.86,19:.36,20:1.11,21:.82};
function stride(frame,rigStride){return STRIDE[frame]??rigStride??1;}
/* seconds per tile for a walking hull: the designed speed on the 7.4 m tile, slowed further where the step rate would pass the cap */
function tileDuration(frame,base,rigStride){
 const designed=base*BOARD_TILE/DESIGN_TILE,capped=BOARD_TILE/(CADENCE_CAP*STEP_LEN*stride(frame,rigStride));
 return Math.max(designed,capped);
}
/* applied once to each built rig (battle, hangar and previews alike); mass drives the footfall weight in scene/effects.js onStep */
function apply(m,frame,mass){
 if(!m||m.walkTuned||frame==null)return m;
 m.walkTuned=true;
 if(Number.isFinite(mass))m.stepMass=mass;
 if(STRIDE[frame]!==undefined)m.dims.stride=STRIDE[frame];
 if(!m.dims.quad)for(const leg of m.rig.legs){
  const side=Math.sign(leg.restX)||1;
  if(STANCE[frame]!==undefined)leg.restX=side*STANCE[frame];
  if(leg.toe!==undefined)leg.toe=Math.sign(leg.toe||side)*TOE;
 }
 return m;
}
root.IronVowWalk={BOARD_TILE,DESIGN_TILE,STEP_LEN,CADENCE_CAP,TOE,STRIDE,STANCE,stride,tileDuration,apply};
})(window);
