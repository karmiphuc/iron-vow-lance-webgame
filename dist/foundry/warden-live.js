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

function joint(name,parent,position){const g=new T.Group();g.name=name;if(position)g.position.copy(position);parent.add(g);return g;}
// Rotate a joint whose segment runs along local -Y so the segment points along dir and its hinge bends toward bend.
function aimSegment(node,dir,bend){
 const Y=dir.clone().normalize().negate(),Z=bend.clone().addScaledVector(Y,-bend.dot(Y)).normalize(),X=Y.clone().cross(Z);
 const world=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(X,Y,Z));
 node.quaternion.copy(node.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));
 node.updateMatrixWorld(true);
}

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
function hinge(node,angle){node.quaternion.setFromAxisAngle(V3(1,0,0),angle);node.updateMatrixWorld(true);}
// Angle of a world direction from the joint's -Y toward its +Z, measured in the joint's YZ plane.
function planeAngle(node,dir){const d=dir.clone().applyQuaternion(node.getWorldQuaternion(new T.Quaternion()).invert());return Math.atan2(d.z,-d.y);}

function build(team,paint,options={}){
 if(!asset)return null;
 const source=asset.clone(true);
 const scene=new T.Group();scene.add(source);
 applyClip(source,options.clip??BIND_CLIP,options.frame??BIND_FRAME);
 if(!options.authoredElbows)straightenElbows(source);
 const node=name=>{const o=source.getObjectByName(name);if(!o)throw Error('Painted Warden joint is missing: '+name);return o};
 const at=name=>node(name).getWorldPosition(V3());
 // Materials are per rig so paint, damage and wreck states never leak between units.
 const materials=new Map();
 source.traverse(o=>{if(o.isMesh){if(!materials.has(o.material))materials.set(o.material,o.material.clone());o.material=materials.get(o.material);}});
 const role=m=>m.name.split(' / ').pop();
 let visorMat=null;
 for(const m of materials.values()){
  const r=role(m);
  if(r==='ivory ceramic'){m.userData.paint=true;if(paint)m.color.set(paint).convertSRGBToLinear();else if(team==='enemy')m.color.set('#9c3a30').convertSRGBToLinear();}
  if(r==='blue graphite armor')m.userData.paint=true;
  if(r==='amber optic'){visorMat=m;m.emissive=m.emissive||new T.Color();if(!m.emissiveIntensity)m.emissiveIntensity=1;m.emissive.copy(m.color);}
 }
 visorMat=visorMat||new T.MeshStandardMaterial();
 const stackMat=new T.MeshStandardMaterial();

 // Measured pivots of the authored stance.
 const P={pelvis:at('Bench_Pelvis'),torso:at('Bench_Torso'),optics:at('Bench_Optics')};
 for(const s of ['L','R'])Object.assign(P,{['hip'+s]:at('Bench_Hip_'+s),['knee'+s]:at('Bench_Knee_'+s),['foot'+s]:at('Bench_Foot_'+s),
  ['sh'+s]:at('Bench_Shoulder_'+s),['el'+s]:at('Bench_Elbow_'+s),['hand'+s]:at('Bench_Hand_'+s),['grip'+s]:at('GripContact_'+s)});
 const D={...DIMS,quad:false,reverse:false,scale:1,
  py:P.pelvis.y,spY:P.torso.y-P.pelvis.y,neck:[0,P.optics.y-P.torso.y,P.optics.z-P.torso.z],
  shX:P.shL.x,shY:P.shL.y-P.torso.y,shZ:P.shL.z-P.torso.z,
  up:P.shL.distanceTo(P.elL),fo:P.elL.distanceTo(P.handL),so:P.handL.distanceTo(P.gripL),
  hipX:P.hipL.x,hipY:P.hipL.y-P.pelvis.y,legA:P.hipL.distanceTo(P.kneeL),legB:P.kneeL.distanceTo(P.footL),ankleH:Math.min(P.footL.y,P.footR.y)};
 const pz=P.pelvis.z;

 // Foundry-convention skeleton: segments along -Y, knees bend about X toward -Z, elbows toward +Z.
 // Matches the baked field Warden's on-screen height at the shared Foundry world scale (1 unit = scale/3.65).
 const k=options.scale??WARDEN_SCALE;
 const cont=new T.Group();cont.rotation.order='YXZ';
 const root=new T.Group();root.name='Live Warden';cont.add(root);
 const pelvis=joint('pelvis',root,V3(0,D.py,pz)),spine=joint('spine',pelvis,V3(0,D.spY,0)),neck=joint('neck',spine,V3(...D.neck));
 const arms={},legs=[];
 for(const s of ['L','R']){
  const sign=s==='L'?1:-1;
  const sh=joint('shoulder.'+s,spine,V3(sign*D.shX,D.shY,D.shZ));
  const paul=new T.Group();paul.name='pauldron.'+s;paul.position.copy(sh.position);spine.add(paul);
  const up=P['el'+s].distanceTo(P['sh'+s]),fo=P['hand'+s].distanceTo(P['el'+s]);
  const el=joint('elbow.'+s,sh,V3(0,-up,0)),wr=joint('wrist.'+s,el,V3(0,-fo,0));
  const so=joint('socket.'+s,wr,V3(0,-(D.so),0));
  arms[s]={sh,el,wr,so,paul};
  const hip=joint('hip.'+s,pelvis,V3(sign*D.hipX,D.hipY,0));
  const legA=P['knee'+s].distanceTo(P['hip'+s]),legB=P['foot'+s].distanceTo(P['knee'+s]);
  const kn=joint('knee.'+s,hip,V3(0,-legA,0)),an=joint('ankle.'+s,kn,V3(0,-legB,0));
  // A half-angle knee cap keeps the guard plate over the joint as the shin swings.
  const cap=joint('kneecap.'+s,hip,V3(0,-legA,0));
  legs.push({hip,kn,an,cap,restX:sign*D.restX,restZ:D.restZ,side:s,phase:s==='L'?0:.5,toe:sign*D.toe});
 }
 root.updateMatrixWorld(true);
 // Pose the new skeleton onto the authored stance, then adopt each rigid part in place.
 for(const s of ['L','R']){
  const a=arms[s],l=legs[s==='L'?0:1];
  const upper=P['el'+s].clone().sub(P['sh'+s]),fore=P['hand'+s].clone().sub(P['el'+s]);
  const thigh=P['knee'+s].clone().sub(P['hip'+s]),shin=P['foot'+s].clone().sub(P['knee'+s]);
  // Joint frames take +Z from the body's forward axis (never from the authored bend, which may point sideways), so
  // the animator's pitch means forward. Elbow and knee are hinges about X: the in-plane part of the authored bend is
  // the hinge angle; any sideways residue stays in the part's attachment and is never animated.
  aimSegment(a.sh,upper,V3(0,0,1));
  hinge(a.el,-planeAngle(a.sh,fore));
  aimSegment(l.hip,thigh,V3(0,0,1));
  const knee=-planeAngle(l.hip,shin);
  hinge(l.kn,knee);hinge(l.cap,knee*.5);
  l.an.quaternion.copy(l.an.parent.getWorldQuaternion(new T.Quaternion()).invert());l.an.updateMatrixWorld(true);
 }
 const owner={Bench_Pelvis:pelvis,Bench_ROOT:pelvis,Painted_Warden:pelvis,Bench_Torso:spine,Bench_Optics:neck};
 for(const s of ['L','R']){const a=arms[s],l=legs[s==='L'?0:1];
  Object.assign(owner,{['Bench_Hip_'+s]:l.hip,['Bench_Knee_'+s]:l.kn,['Bench_Foot_'+s]:l.an,['Bench_KneeGuard_'+s]:l.cap,
   ['Bench_Pauldron_'+s]:a.paul,['Bench_Shoulder_'+s]:a.sh,['Bench_Elbow_'+s]:a.el,['Bench_Hand_'+s]:a.wr});}
 const parts={body:[],pilot:[],right:[],left:[],legs:[]};
 const partOf=name=>/Optics/.test(name)?'pilot':/_R\b|_R_|\.R/.test(name)&&/Shoulder|Elbow|Hand|Pauldron/.test(name)?'right':
  /_L\b|_L_|\.L/.test(name)&&/Shoulder|Elbow|Hand|Pauldron/.test(name)?'left':/Hip|Knee|Foot|GuardLink|KneeGuard/.test(name)?'legs':'body';
 const meshes=[];source.traverse(o=>{if(o.isMesh)meshes.push(o)});
 for(const mesh of meshes){
  let p=mesh.parent,target=null,named=null;
  while(p&&!target){if(owner[p.name]){target=owner[p.name];named=p.name}p=p.parent}
  if(!target)target=pelvis;
  target.attach(mesh);
  parts[partOf(named||'')].push({m:mesh});
 }
 scene.remove(source);
 // Scale only after every part is bound at the authored size; binding a scaled skeleton would offset the parts.
 cont.scale.setScalar(k);
 root.updateMatrixWorld(true);
 // Rest the joints in the Foundry neutral; animateMech poses everything from here.
 if(!options.keepBind)for(const s of ['L','R']){const a=arms[s];a.sh.rotation.set(0,0,0);a.el.rotation.set(0,0,0);a.wr.rotation.set(0,0,0);}

 const rig={pelvis,spine,neck,arms,legs,pistons:[],spinners:[],skirts:null};
 const b={root,rig,dims:D,parts,kits:[],mods:{core:'warden',legs:'warden',arms:'warden'},visorMat,stackMat,shield:null,pal:null};
 const m={cont,body:root,rig,dims:D,build:b,frame:'warden',team,yaw:0,scale:k,gait:{phase:0,w:0},
  legs:legs.map(()=>({planted:V3(),from:V3(),to:V3(),swing:false,settle:null,foot:V3()})),
  s:{comp:{x:0,v:0},pitch:{x:0,v:0},roll:{x:0,v:0},arm:{x:0,v:0},kx:{x:0,v:0},kz:{x:0,v:0}},
  aim:{blend:0,point:V3(),until:-1},recoil:0,wrecked:false,shield:null,kitLevel:0,init:false,seed:Math.random()*10,smokeT:0,
  partState:{body:0,pilot:0,right:0,left:0,legs:0},flicker:0,live:'warden'};
 return m;
}
// Per-frame extras the shared animator does not know about: knee caps and the melee family for the equipped weapon.
function afterAnimate(m){
 for(const l of m.rig.legs){l.cap.quaternion.identity().slerp(l.kn.quaternion,.5);}
}
function meleeStyle(m,weapon){
 const family=MELEE_FAMILY[weapon]||'sweep';
 m.dims.melee=m.dims.meleeStyles[family];
 return family;
}
window.IronVowWardenRig={load,ready,build,afterAnimate,meleeStyle,DIMS,MELEE_FAMILY};
})();
