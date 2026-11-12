/* Shared rigid-GLB adapter, extracted from the painted Warden's measured-pivot binding. */
(function(root){
'use strict';const T=root.THREE,V3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
function joint(name,parent,position){const g=new T.Group();g.name=name;if(position)g.position.copy(position);parent.add(g);return g;}
function aimSegment(node,dir,bend){
 const Y=dir.clone().normalize().negate(),Z=bend.clone().addScaledVector(Y,-bend.dot(Y)).normalize(),X=Y.clone().cross(Z);
 const world=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(X,Y,Z));
 node.quaternion.copy(node.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));
 node.updateMatrixWorld(true);
}
function hinge(node,angle){node.quaternion.setFromAxisAngle(V3(1,0,0),angle);node.updateMatrixWorld(true);}
function planeAngle(node,dir){const d=dir.clone().applyQuaternion(node.getWorldQuaternion(new T.Quaternion()).invert());return Math.atan2(d.z,-d.y);}
function build(config){
 const {source,team,paint}=config,options=config.options||{},DIMS=config.dims;
 const scene=new T.Group();scene.add(source);source.updateMatrixWorld(true);
 const node=name=>{const o=source.getObjectByName(T.PropertyBinding.sanitizeNodeName(config.names?.[name]||name));if(!o)throw Error('Rigid chassis joint is missing: '+name);return o};
 const at=name=>node(name).getWorldPosition(V3());
 // Materials are per rig so paint, damage and wreck states never leak between units.
 const materials=new Map();
 source.traverse(o=>{if(o.isMesh){if(!materials.has(o.material))materials.set(o.material,o.material.clone());o.material=materials.get(o.material);}});
 let visorMat=null,stackMat=null;
 for(const m of materials.values()){
  const r=config.materialRole(m);
  if(['p','s','a'].includes(r)){m.userData.paint=true;m.userData.paintChannel=r;const color=r==='p'?paint:config.trim?.[r];if(color)m.color.set(color).convertSRGBToLinear();else if(r==='p'&&team==='enemy'&&config.enemyPaint)m.color.set(config.enemyPaint).convertSRGBToLinear();}
  if(r==='visor'){visorMat=m;m.emissive=m.emissive||new T.Color();if(!m.emissiveIntensity)m.emissiveIntensity=1;m.emissive.copy(m.color);}
  if(r==='stack')stackMat=m;
 }
 visorMat=visorMat||new T.MeshStandardMaterial();
 stackMat=stackMat||new T.MeshStandardMaterial();

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
 const k=options.scale??1;
 const cont=new T.Group();cont.rotation.order='YXZ';
 const root=new T.Group();root.name='Live '+config.id;cont.add(root);
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
  legs.push({hip,kn,an,cap,restX:config.measuredStance?P['foot'+s].x:sign*D.restX,restZ:config.measuredStance?P['foot'+s].z:D.restZ,side:s,phase:s==='L'?0:.5,toe:sign*D.toe});
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
 const logicalNames={};
 for(const [name,target] of Object.entries(owner)){const actual=T.PropertyBinding.sanitizeNodeName(config.names?.[name]||name);owner[actual]=target;logicalNames[actual]=name;}
 const extras=config.extraOwners?.({root,pelvis,spine,neck,arms,legs,source})||{owners:{},pistons:[]};Object.assign(owner,extras.owners);
 const parts={body:[],pilot:[],right:[],left:[],legs:[]};
 const partOf=name=>/Optics/.test(name)?'pilot':/_R\b|_R_|\.R/.test(name)&&/Shoulder|Elbow|Hand|Pauldron/.test(name)?'right':
  /_L\b|_L_|\.L/.test(name)&&/Shoulder|Elbow|Hand|Pauldron/.test(name)?'left':/Hip|Knee|Foot|GuardLink|KneeGuard/.test(name)?'legs':'body';
 const meshes=[];source.traverse(o=>{if(o.isMesh)meshes.push(o)});
 for(const mesh of meshes){
  let p=mesh.parent,target=null,named=null;
  while(p&&!target){if(owner[p.name]){target=owner[p.name];named=p.name}p=p.parent}
  if(!target)target=pelvis;
  target.attach(mesh);
  parts[config.partOf?.(named)||partOf(logicalNames[named]||named||'')].push({m:mesh});
 }
 scene.remove(source);
 // Scale only after every part is bound at the authored size; binding a scaled skeleton would offset the parts.
 cont.scale.setScalar(k);
 root.updateMatrixWorld(true);
 // Rest the joints in the Foundry neutral; animateMech poses everything from here.
 if(!options.keepBind)for(const s of ['L','R']){const a=arms[s];a.sh.rotation.set(0,0,0);a.el.rotation.set(0,0,0);a.wr.rotation.set(0,0,0);}

 const rig={pelvis,spine,neck,arms,legs,pistons:[],spinners:[],skirts:null};
 const b={root,rig,dims:D,parts,kits:[],mods:{core:config.refModel??config.id,legs:config.refModel??config.id,arms:config.refModel??config.id},visorMat,stackMat,
  ownedMaterials:[...materials.values(),stackMat],shield:null,pal:null};
 const m={cont,body:root,rig,dims:D,build:b,frame:config.id,team,yaw:0,scale:k,gait:{phase:0,w:0},
  legs:legs.map(()=>({planted:V3(),from:V3(),to:V3(),swing:false,settle:null,foot:V3()})),
  s:{comp:{x:0,v:0},pitch:{x:0,v:0},roll:{x:0,v:0},arm:{x:0,v:0},kx:{x:0,v:0},kz:{x:0,v:0}},
  aim:{blend:0,point:V3(),until:-1},recoil:0,wrecked:false,shield:null,kitLevel:0,init:false,seed:Math.random()*10,smokeT:0,
  partState:{body:0,pilot:0,right:0,left:0,legs:0},flicker:0,live:config.id,nativePistons:extras.pistons};
 return m;
}
function afterAnimate(m){
 for(const l of m.rig.legs)if(l.cap)l.cap.quaternion.identity().slerp(l.kn.quaternion,.5);
 m.cont.updateMatrixWorld(true);
 for(const p of m.nativePistons||[]){const a=p.a.getWorldPosition(V3()),b=p.b.getWorldPosition(V3());p.a.lookAt(b);p.a.quaternion.multiply(p.biasA);p.b.lookAt(a);p.b.quaternion.multiply(p.biasB);}
}
root.IronVowRigidAdapter={build,afterAnimate};
})(window);
