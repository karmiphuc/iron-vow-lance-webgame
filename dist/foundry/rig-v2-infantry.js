/* LI-01 R32 and LI-02 E7 share a rigid right-hand carbine socket. */
(function(root){
'use strict';
function setup({bone,driver,marker,bounds,rig}){
 const socket='WEAPON_SOCKET_R',authored=bone(socket),carrier=rig.arms.R.so;
 const mount=driver(socket,carrier);
 // Blender's +Y barrel becomes glTF -Z in the carbine's local axes.
 const muzzle=marker('muzzle.main',mount,[0,0,-1]);
 const primary={id:'rifle',carrier,mount,muzzle,bounds:()=>bounds(socket)};
 return {
  boundsNames:[socket],
  pose(entry,unit){
   entry.primary=primary;
   const armed=unit.alive&&unit.hp.right>0;
   mount.visible=authored.visible=armed;
  }
 };
}
for(const [frame,id] of [[13,'li-01'],[14,'li-02']]){
 root.IronVowRigV2.register(frame,{id,assetPath:`rig-bench/rig-v2/${id}.glb`,setup});
}
})(window);
