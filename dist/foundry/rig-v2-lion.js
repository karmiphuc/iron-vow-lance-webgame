/* The practice-range Lion plays the source strike, including its planted-foot keys. */
(function(root){
'use strict';
const T=root.THREE;
const ids=['cleaver','hatchet','breaker'];
const contact=18/24,raise=(18-3)/24;
root.IronVowRigV2.register('lion',{
 id:'lion',assetPath:'rig-bench/rig-v2/lion.glb',factoryLivery:true,
 setup({source,bone,find,animations}){
  const grip=bone('weapon_socket.L');
  const weapons=new Map(ids.map(id=>[id,{id,carrier:grip,mount:bone('melee.'+id),tip:bone('strike.tip.'+id)}]));
  const originals=new Map();
  const clips=new Map(animations.filter(clip=>ids.includes(clip.name.slice(5))&&clip.name.startsWith('lion.')).map(clip=>{
   const tracks=clip.tracks.map(track=>{
    const {nodeName,propertyName}=T.PropertyBinding.parseTrackName(track.name);
    const node=find(nodeName),value=node?.[propertyName];
    if(!value?.fromArray)throw Error('Lion track cannot bind '+track.name);
    if(!originals.has(value))originals.set(value,value.clone());
    return {value,sample:track.createInterpolant()};
   });
   return [clip.name.slice(5),{duration:clip.duration,tracks}];
  }));
  function sample(clip,time){
   for(const {value,sample} of clip.tracks)value.fromArray(sample.evaluate(time));
  }
  const legs={};
  for(const side of ['L','R'])legs[side]=['hip','knee','ankle'].map(part=>bone(part+'.'+side));
  const at=node=>node.getWorldPosition(new T.Vector3());
  const local=node=>source.worldToLocal(at(node));
  const bindClip=clips.values().next().value;
  const supports={};
  if(bindClip){
   sample(bindClip,0);
   supports.right=local(legs.R[2]);supports.left=local(legs.L[2]);
   sample(bindClip,13/24);
   supports.planted=local(legs.L[2]);
   for(const [value,rest] of originals)value.copy(rest);
  }
  // glTF interpolation can move the decoded ankle inside the source's fixed
  // plant intervals. Keep the authored knee plane and segment lengths while
  // re-solving those small errors, and keep the authored boot orientation.
  function pin([hip,knee,ankle],plant,weight=1){
   const a=at(hip),b=at(knee),c=at(ankle),target=c.clone().lerp(source.localToWorld(plant.clone()),weight);
   if(c.distanceToSquared(target)<1e-12)return;
   const first=a.distanceTo(b),second=b.distanceTo(c),axis=target.clone().sub(a);
   const reach=Math.min(axis.length(),first+second-1e-5);
   axis.normalize();
   const along=(first*first-second*second+reach*reach)/(2*reach);
   const pole=b.clone().sub(a);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
   const mid=a.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,first*first-along*along)));
   const footRotation=ankle.getWorldQuaternion(new T.Quaternion());
   function aim(node,child,destination){
    const origin=at(node),from=at(child).sub(origin).normalize(),to=destination.clone().sub(origin).normalize();
    const worldRotation=new T.Quaternion().setFromUnitVectors(from,to).multiply(node.getWorldQuaternion(new T.Quaternion()));
    node.quaternion.copy(node.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(worldRotation));
   }
   aim(hip,knee,mid);aim(knee,ankle,target);
   ankle.quaternion.copy(ankle.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(footRotation));
  }
  let current,time=0;
  return {
   anchors:{body:bone('spine'),pilot:bone('neck'),right:bone('elbow.R'),left:bone('elbow.L'),legs:bone('knee.L'),leadFoot:bone('ankle.L')},
   authoredStrike:id=>clips.has(id),
   strikeContact(id){
    if(!current||clips.get(id)!==current)return null;
    time=contact;
    return weapons.get(id).tip;
   },
   pose(entry,unit,pose,now){
    entry.secondary=weapons.get(unit.melee);
    for(const [id,weapon] of weapons)weapon.mount.visible=unit.alive&&unit.hp.left>0&&id===unit.melee;
    const clip=unit.alive&&unit.hp.legs>0&&!unit.motion&&clips.get(unit.melee);
    if(current&&!clip)for(const [value,rest] of originals)value.copy(rest);
    current=clip;
    if(!clip)return;
    const attack=unit.attack;
    if(!attack)time=0;
    else if(pose.reducedMotion)time=Number.isFinite(attack.fireAt)?contact:0;
    else if(Number.isFinite(attack.releaseAt))time=Math.min(clip.duration,contact+Math.max(0,now-attack.releaseAt));
    else if(Number.isFinite(attack.fireAt))time=Math.min(contact,raise+Math.max(0,now-attack.fireAt));
    else time=Math.min(raise,Math.max(0,now-attack.start));
   },
   afterSync(){
    if(!current)return;
    sample(current,time);
    pin(legs.R,supports.right);
    const frame=time*24;
    if(frame<=5)pin(legs.L,supports.left,Math.min(1,5-frame));
    if(frame>=13&&frame<25)pin(legs.L,supports.planted,Math.min(1,25-frame));
   }
  };
 }
});
})(window);
