/* The campaign Warden's rigid geometry, authored poses, and hand contacts. */
(() => {
  'use strict';
  const T = THREE;
  const v = (x=0,y=0,z=0) => new T.Vector3(x,y,z);
  const q = () => new T.Quaternion();
  const basis = new T.Matrix4();
  const localForward = v(0,0,-1); // Blender bone +Y after the glTF axis conversion.
  const width = v(1,0,0), up = v(0,1,0);
  const pistolGrip = v(0,-.075,.015), shaftGrip = v();
  const weaponScale = .62;

  async function load(loadGlb, floor){
    const [asset,motion] = await Promise.all([
      loadGlb('./warden-painted.glb'),
      fetch('./warden-painted-motion.json').then(response => {
        if(!response.ok)throw Error('Painted Warden poses could not load');
        return response.json();
      })
    ]);
    const root=asset.getObjectByName('Painted_Warden');
    if(!root)throw Error('Painted Warden root is missing');
    const required=name=>{
      const node=root.getObjectByName(name);
      if(!node)throw Error('Painted Warden joint is missing: '+name);
      return node;
    };
    const tracks={};
    for(const [name,clip] of Object.entries(motion)){
      tracks[name]={frames:clip.frames,fps:clip.fps,nodes:Object.entries(clip.nodes).map(([node,values])=>[required(node),values])};
    }
    const arms={};
    for(const side of ['R','L'])arms[side]={
      hand:required('Bench_Hand_'+side),wrist:required('WristContact_'+side),
      so:required('GripContact_'+side),direction:required(side==='R'?'Bench_Rifle':'Bench_Melee'),
    };
    root.scale.setScalar(1.18);
    root.position.y=floor-.025*1.18;
    const joints=[];
    root.traverse(node=>{
      if(!node.isMesh&&!['Bench_Rifle','Bench_Melee'].includes(node.name)&&!node.name.startsWith('Bench_GuardLink')&&(node.name.startsWith('Bench_')||node.name.startsWith('GripContact_'))){
        joints.push({obj:node,parent:node.parent===root?null:node.parent,socket:node.name.startsWith('GripContact_')});
      }
    });
    const spine=required('Bench_Torso');
    const rig={painted:true,root,tracks,arms,joints,spine,pistons:[],stackTops:[],walkTime:0,aim:0,
      stackGlow:{emissiveIntensity:0}};
    pose(rig,'Aim',0);
    return rig;
  }

  function pose(rig,name,progress){
    const clip=rig.tracks[name];
    const f=Math.max(0,Math.min(1,progress))*(clip.frames-1),i=Math.floor(f),j=Math.min(i+1,clip.frames-1),a=f-i;
    const from=v(),to=v(),qa=q(),qb=q();
    for(const [node,data] of clip.nodes){
      node.position.copy(from.fromArray(data,10*i)).lerp(to.fromArray(data,10*j),a);
      node.quaternion.copy(qa.fromArray(data,10*i+3)).slerp(qb.fromArray(data,10*j+3),a);
      node.scale.copy(from.fromArray(data,10*i+7)).lerp(to.fromArray(data,10*j+7),a);
    }
    rig.root.updateMatrixWorld(true);
  }

  function mount(rig,slot,instance,target,recoil){
    const arm=rig.arms[slot==='gun'?'R':'L'];
    const pistol=slot==='gun'||instance.def.id==='piledriver';
    const forward=localForward.clone().applyQuaternion(arm.direction.getWorldQuaternion(q())).normalize();
    if(target&&rig.aim>.001){
      const aimDirection=target.clone().sub(arm.so.getWorldPosition(v())).normalize();
      aimDirection.y+=recoil*.035;
      forward.lerp(aimDirection.normalize(),rig.aim).normalize();
    }
    const across=up.clone().cross(forward);
    if(across.lengthSq()<.01)across.copy(width).addScaledVector(forward,-width.dot(forward));
    across.normalize();
    const upright=forward.clone().cross(across).normalize();
    const weaponRotation=q().setFromRotationMatrix(basis.makeBasis(across,upright,forward));

    // Align the cylinder of the grip across the curled fingers while the
    // original wrist joint remains at the end of the forearm.
    const hand=arm.hand,old=hand.getWorldQuaternion(q());
    const fingerAxis=(pistol?upright:forward).clone();
    if(fingerAxis.dot(width.clone().applyQuaternion(old))<0)fingerAxis.negate();
    const wristToPalm=v(0,0,1).applyQuaternion(old);
    wristToPalm.addScaledVector(fingerAxis,-wristToPalm.dot(fingerAxis));
    if(wristToPalm.lengthSq()<.01)wristToPalm.copy(across);
    wristToPalm.normalize();
    const palmNormal=wristToPalm.clone().cross(fingerAxis).normalize();
    const handWorld=q().setFromRotationMatrix(basis.makeBasis(fingerAxis,palmNormal,wristToPalm));
    const wrist=hand.parent.worldToLocal(arm.wrist.getWorldPosition(v()));
    hand.quaternion.copy(hand.parent.getWorldQuaternion(q()).invert().multiply(handWorld));
    hand.position.copy(wrist).sub(arm.wrist.position.clone().multiply(hand.scale).applyQuaternion(hand.quaternion));
    hand.updateMatrixWorld(true);

    instance.mount.quaternion.copy(arm.so.getWorldQuaternion(q()).invert().multiply(weaponRotation));
    instance.model.scale.setScalar(weaponScale);
    instance.model.position.copy(pistol?pistolGrip:shaftGrip).multiplyScalar(-weaponScale);
    instance.mount.updateMatrixWorld(true);
  }

  window.IronVowPaintedWarden={load,pose,mount};
})();
