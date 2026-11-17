/* IV-S07 carries a source Needle carbine and knife; its Flechette follows the scout authoring recipe. */
(function(root){
'use strict';
const T=root.THREE;
root.IronVowRigV2.register(18,{
 id:'ashigaru',assetPath:'rig-bench/rig-v2/ashigaru.glb',factoryLivery:true,
 setup({bone,driver,marker,bounds,rig}){
  const sockets={};
  for(const side of ['L','R']){
   const wrist=rig.arms[side].wr;
   sockets[side]=driver('SOCKET_Weapon.'+side,wrist,wrist.getWorldQuaternion(new T.Quaternion()));
  }
  const guns={};
  for(const [id,anchor] of [['carbine','muzzle.carbine'],['scatter','muzzle.scatter']]){
   const name='module.'+id,model=bone(name),mount=driver(name,sockets.R);
   guns[id]={id:id==='carbine'?'needle-carbine':'flechette-scattergun',model,mount,carrier:sockets.R,
    muzzle:marker(anchor,mount,[0,0,-1]),bounds:()=>bounds(name)};
  }
  const knifeModel=bone('module.knife'),knifeMount=driver('module.knife',sockets.L);
  const knife={id:'signal-knife',model:knifeModel,mount:knifeMount,carrier:sockets.L,tip:marker('tip.knife',knifeMount),bounds:()=>bounds('module.knife')};
  return {boundsNames:['module.carbine','module.scatter','module.knife'],pose(entry,u){
   const right=u.alive&&u.hp.right>0,left=u.alive&&u.hp.left>0;
   const active=u.attack?.kind==='flechette-scattergun'?'scatter':'carbine';
   for(const [id,gun] of Object.entries(guns))gun.model.visible=gun.mount.visible=right&&id===active;
   knifeModel.visible=knifeMount.visible=left;
   entry.primary=guns[active];entry.secondary=knife;
  }};
 }
});
})(window);
