/* The painted Warden, re-rigged for live combat on the Foundry skeleton.
   The authored GLB is a rigid hierarchy (pelvis, hips, knees, feet, torso, optics, pauldrons, shoulders, elbows,
   hands). This builds a Foundry-convention skeleton at the same pivots, poses it to the GLB, and attaches every
   armour part to its new joint without moving it. IronVowFoundryRig.animateMech then drives it: leg IK, gait,
   carry poses, firing stance and melee keys from the dims below. */
(function(){
'use strict';
if(!window.THREE||!window.IronVowFoundryRig||!window.VowChassis)return;
const T=THREE,VC=window.VowChassis,R=window.IronVowFoundryRig,V3=R.V3;
let BIND_CLIP='Aim',BIND_FRAME=0;
const WARDEN_SCALE=1.415;
let asset=null,motion=null,loading=null,failed=false;

function load(url,motionUrl){
 if(asset)return Promise.resolve(asset);
 if(!loading&&!failed){
  const loader=new T.GLTFLoader();
  const glb=typeof url==='string'?loader.loadAsync(url):new Promise((ok,no)=>loader.parse(url,'',ok,no));
  const poses=typeof motionUrl==='string'?fetch(motionUrl).then(r=>{if(!r.ok)throw Error('Warden poses could not load');return r.json()}):Promise.resolve(motionUrl);
  loading=Promise.all([glb,poses]).then(([gltf,clips])=>{
   const root=gltf.scene.getObjectByName('Painted_Warden');
   if(!root)throw Error('Painted Warden root is missing');
   asset=root;motion=clips;return asset;
  }).catch(error=>{failed=true;console.warn('Live Warden unavailable; using baked art',error);throw error});
 }
 return loading||Promise.reject(Error('Live Warden unavailable'));
}
const ready=()=>Boolean(asset);

// Apply one authored clip frame to a cloned GLB so the bind pose is a real, authored stance.
function applyClip(root,name,frame){
 const clip=motion?.[name];
 if(!clip)return;
 const i=Math.min(frame,clip.frames-1);
 for(const [node,values] of Object.entries(clip.nodes)){
  const o=root.getObjectByName(node);if(!o)continue;
  o.position.fromArray(values,10*i);o.quaternion.fromArray(values,10*i+3);o.scale.fromArray(values,10*i+7);
 }
 root.updateMatrixWorld(true);
}

const DIMS={
 // Legs: authored pivots are measured at bind time; these are the gait and stance choices.
 restX:1.1,restZ:.05,toe:.03,lift:.65,duty:.6,stride:.8,walkDrop:.16,sway:.1,
 carry:{lean:.12,swagger:.06,chin:.07,supportYaw:-.4,supportIdle:false,
  gunUp:[-1.4,-1.3,-.3],cross:[-.5,-.6,.9],bladeForward:[-1.25,.05,-.3,1.32],
  dual:[['gunUp'],['bladeForward'],['gunUp','bladeForward']],
  fire:{hips:.4,chest:.5,grip:[-.15,-.6,1.3],step:.9,back:.22,narrow:.12,lift:.4,padLift:.4}},
 // Melee families: an overhead maul, a diagonal sweep and a lunging thrust (pike keys come from the shared rig).
 melee:{wind:{sx:-2.3,sz:-.3,el:-.6,wr:1.27,yaw:-.25,lean:-.1},hit:{sx:-1.3,sz:.1,el:-.12,wr:1.77,yaw:.28,lean:.2},offArm:-.3},
 meleeStyles:{
  maul:{wind:{sx:-2.75,sz:-.12,el:-1.05,wr:.9,yaw:-.1,lean:-.18},hit:{sx:-1.05,sz:.05,el:-.2,wr:1.45,yaw:.12,lean:.32},offArm:-.45},
  sweep:{wind:{sx:-1.55,sz:-.95,el:-.9,wr:1.4,yaw:-.55,lean:-.05},hit:{sx:-1.45,sz:.55,el:-.15,wr:1.62,yaw:.5,lean:.16},offArm:-.25},
  thrust:{wind:{sx:-.7,sz:-.1,el:-1.45,wr:.2,yaw:-.22,lean:-.08},hit:{sx:-1.5,sz:.08,el:-.05,wr:-.05,yaw:.18,lean:.24},offArm:-.35}
 }
};
const MELEE_FAMILY={breaker:'maul','anchor-hammer':'maul','breach-gauntlet':'maul',
 cleaver:'sweep',blade:'sweep',hatchet:'sweep','signal-knife':'sweep','aegis-cleave':'sweep',
 piledriver:'thrust',pike:'thrust',tonfa:'thrust','pulse-bash':'thrust','free-hand':'thrust'};


// Rotate a joint whose segment runs along local -Y so the segment points along dir and its hinge bends toward bend.


// Every authored Warden frame bends the elbows ~25 degrees sideways. Swing each forearm and hand about its own elbow
// pivot into the arm's forward hinge plane (shoulder frame: -Y along the upper arm, +Z body forward), so the
// armour, hand and weapon socket share the axis the animator bends. Torso, legs and upper arms stay as authored.
function straightenElbows(source){
 for(const s of ['L','R']){
  const elbow=source.getObjectByName('Bench_Elbow_'+s),sh=source.getObjectByName('Bench_Shoulder_'+s).getWorldPosition(V3());
  const at=elbow.getWorldPosition(V3()),hand=source.getObjectByName('Bench_Hand_'+s).getWorldPosition(V3());
  const Y=at.clone().sub(sh).normalize().negate(),Z=V3(0,0,1).addScaledVector(Y,-Y.z).normalize(),X=Y.clone().cross(Z);
  const fore=hand.sub(at).normalize(),flat=fore.clone().addScaledVector(X,-fore.dot(X)).normalize();
  const swing=new T.Quaternion().setFromUnitVectors(fore,flat);
  const world=elbow.getWorldQuaternion(new T.Quaternion());
  elbow.quaternion.copy(elbow.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(swing.multiply(world)));
  elbow.updateMatrixWorld(true);
 }
}

// Angle of a world direction from the joint's -Y toward its +Z, measured in the joint's YZ plane.


function build(team,paint,options={}){
 if(!asset)return null;const source=asset.clone(true);applyClip(source,options.clip??BIND_CLIP,options.frame??BIND_FRAME);if(!options.authoredElbows)straightenElbows(source);
 return window.IronVowRigidAdapter.build({source,team,paint,id:'warden',dims:DIMS,trim:options.trim,options:{...options,scale:options.scale??WARDEN_SCALE},enemyPaint:'#9c3a30',
  materialRole:m=>{const role=m.name.split(' / ').pop();return role==='ivory ceramic'?'p':role==='blue graphite armor'?'s':role==='amber optic'?'visor':null;}});
}
// Per-frame extras the shared animator does not know about: knee caps and the melee family for the equipped weapon.
function afterAnimate(m){
 window.IronVowRigidAdapter.afterAnimate(m);
}
function meleeStyle(m,weapon){
 const family=MELEE_FAMILY[weapon]||'sweep';
 m.dims.melee=m.dims.meleeStyles[family];
 return family;
}
window.IronVowWardenRig={load,ready,build,afterAnimate,meleeStyle,DIMS,MELEE_FAMILY};
})();
