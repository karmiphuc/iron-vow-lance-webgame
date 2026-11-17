/* Gravemaw's R10 fitted Hailstorm and Piledriver share the authored hand mounts. */
(function(root){
'use strict';
const T=root.THREE,V3=root.IronVowFoundryRig.V3,Q=()=>new T.Quaternion();
root.IronVowRigV2.register(15,{
 id:'vanguard',assetPath:'rig-bench/rig-v2/vanguard.glb',factoryLivery:true,
 setup({bone,driver,marker,bounds,rig}){
  const right=rig.arms.R.so,left=rig.arms.L.so;
  const gun=driver('SOCKET.weapon.R',right),ram=driver('SOCKET.weapon.L',left);
  const rotorNode=bone('Hailstorm | six-barrel rotor'),augerNode=bone('Piledriver | translating auger');
  const rotor=driver('Hailstorm | six-barrel rotor',gun,rotorNode.getWorldQuaternion(Q()));
  const auger=driver('Piledriver | translating auger',ram,augerNode.getWorldQuaternion(Q()));
  const rotorRest=rotor.quaternion.clone(),turn=Q();
  let lastTime,rotorAngle=0,rotorSpeed=0;
  const tip=marker('tip.piledriver',auger,[0,1,0]);
  const rest=auger.position.clone();
  const axis=auger.parent.worldToLocal(tip.getWorldPosition(V3())).sub(rest).normalize();
  // vanguard/bake.py:97-113 defines the six barrels at radius .209 and
  // +Z=1.915 in Blender; GLTF converts those to radius XZ and +Y.
  const muzzles=Array.from({length:6},(_,i)=>{
   const a=i*Math.PI/3,peg=new T.Object3D();
   const world=rotorNode.localToWorld(V3(.209*Math.cos(a),1.915,-.209*Math.sin(a)));
   peg.position.copy(rotor.worldToLocal(world));
   const forward=V3(0,1,0).applyQuaternion(rotorNode.getWorldQuaternion(Q()));
   peg.quaternion.copy(rotor.getWorldQuaternion(Q()).invert().multiply(Q().setFromUnitVectors(V3(0,0,1),forward)));
   rotor.add(peg);return peg;
  });
  const primary={id:'hailstorm',carrier:right,mount:gun,muzzle:muzzles[0],muzzles,bounds:()=>bounds('SOCKET.weapon.R')};
  const secondary={id:'piledriver',carrier:left,mount:ram,tip,bounds:()=>bounds('SOCKET.weapon.L')};
  return {boundsNames:['SOCKET.weapon.R','SOCKET.weapon.L'],pose(entry,unit,pose,time){
   const alive=unit.alive;gun.visible=bone('SOCKET.weapon.R').visible=alive&&unit.hp.right>0;
   ram.visible=bone('SOCKET.weapon.L').visible=alive&&unit.hp.left>0;
   entry.primary=primary;entry.secondary=secondary;
   const dt=lastTime===undefined?0:Math.min(.05,Math.max(0,time-lastTime));
   lastTime=time;
   const spinning=alive&&unit.hp.right>0&&unit.attack?.kind==='hailstorm'&&!pose.reducedMotion;
   rotorSpeed+=((spinning?22:0)-rotorSpeed)*(1-Math.exp(-12*dt));
   if(!pose.reducedMotion)rotorAngle=(rotorAngle+rotorSpeed*dt)%(2*Math.PI);
   rotor.quaternion.copy(rotorRest).multiply(turn.setFromAxisAngle(V3(0,1,0),rotorAngle));
   const progress=pose.strikeKind==='piledriver'?Math.max(0,Math.min(1,pose.strikeProgress||0)):0;
   auger.position.copy(rest).addScaledVector(axis,Math.sin(Math.PI*progress)*.35);
  }};
 }
});
})(window);
