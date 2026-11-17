/* Hangar adapters own only view holders. Foundry supplies the same loadouts and pose as combat. */
(function(root){
'use strict';
function create(){
 const T=root.THREE,R=root.IronVowRigV2,F=root.IronVowFoundry;
 const entries=new Set();
 function rigKind(frame,model){
  if(R.applies({frame}))return 'rig-v2';
  return model!=null?'kit':null;
 }
 function make(unit){
  const object=new T.Group(),kind=rigKind(unit.frame,unit.model);
  const integrity=unit.condition<.3?30:100;
  const hp={body:integrity,right:integrity,left:integrity,legs:integrity,pilot:100};
  const max={body:100,right:100,left:100,legs:100,pilot:100};
  const actor={...unit,alive:true,team:'ally',hp,max};
  let dead=false;
  const entry={object,update({time,selected,reducedMotion}){
   if(dead||!kind||kind==='rig-v2'&&R.status(actor,'hangar')!=='ready')return;
   const facing=.3,aim=new T.Vector3(selected&&!reducedMotion?Math.sin(time*.7)*8:0,6,20);
   const pose={hangar:true,reducedMotion,heading:facing,phase:0,primeProgress:0,strikeProgress:0,
    aim:selected&&!reducedMotion&&time%9<1.6?.35:0,recoil:0,impact:0,land:0,brace:0,
    world:{x:0,y:0,z:0,aim,heading:facing,face:facing,speed:0,groundAt:()=>0}};
   const live=F.draw(actor,time,pose,null,actor.model,kind==='kit'?undefined:kind);
   if(live&&live.m.cont.parent!==object)object.add(live.m.cont);
  },dispose(){
   if(dead)return;dead=true;entries.delete(entry);F.releaseHangarRig(unit.id);
  }};
  entries.add(entry);return entry;
 }
 return {
  create:make,supports(frame,model){return Boolean(rigKind(frame,model));},
  load(units){return R.retain(units,'hangar');},
  dispose(){for(const entry of [...entries])entry.dispose();R.clear('hangar');}
 };
}
root.IronVowHangarCatalog={create};
})(window);
