// Classify the original rigid rig joints and the prototype bone assemblies.
function stockPart(name){
 if(/^(neck|spine\.geometry\.emissive_visor)(?:\b|_)/i.test(name))return 2;
 if(/^(hip|knee|ankle|foot|toe|leg ram|ankle ram)\./i.test(name))return 5;
 if(/^cannon slide\b/i.test(name))return 3;
 const arm=/^(?:shoulder(?: hardpoint| cannon)?|pauldron|elbow|wrist|arm ram|hardpoint|finger [1-4](?: tip)?|thumb)\.([lr])\b/i.exec(name);
 if(arm)return arm[1].toUpperCase()==='R'?3:4;
 if(/^optics\b/i.test(name))return 2;
 if(/^(pelvis|spine|torso|pod|shutter)\b/i.test(name))return 1;
}
function stockDamageMeshes(root){
 const ids=new Map();
 root.traverse(o=>{
  if(!o.isMesh)return;
  for(let joint=o;joint;joint=joint.parent){
   const part=stockPart(joint.name);
   if(part){ids.set(o,part);return}
  }
  throw Error('Missing damage joint for '+o.name);
 });
 return ids;
}
module.exports={stockDamageMeshes};
