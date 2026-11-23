const assert=require('node:assert/strict');

async function install(page,weapon){
 await page.addInitScript(weapon=>{
  window.saltFirstRifles={};
  window.saltRiflePose=entry=>{
   const {m,primary}=entry;
   const body=m.cont.getWorldQuaternion(new THREE.Quaternion()).invert();
   const bore=primary.muzzle.getWorldDirection(new THREE.Vector3()).applyQuaternion(body);
   const top=new THREE.Vector3(0,1,0).applyQuaternion(primary.model.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(body);
   const right=new THREE.Vector3(1,0,0).addScaledVector(bore,-bore.x).normalize();
   return {roll:bore.clone().cross(right).dot(top),pitch:bore.y,weapon:primary.id};
  };
  Object.defineProperty(window,'IronVowScene',{configurable:true,set(api){
   const render=api.render;
   api.render=function(...args){
    // In the trial, exercise the alternate refit before the rig is ever drawn.
    const actors=battle?.units.filter(unit=>unit.frame===22||unit.frame===23)??[];
    if(weapon&&location.search.includes('trial=salt-works'))for(const unit of actors)unit.weapon=weapon;
    const result=render.apply(this,args);
    for(const unit of actors){
     if(saltFirstRifles[unit.frame])continue;
     const record=api.models.get(unit.id),entry=record?.entry;
     if(record?.object?.visible&&entry?.primary?.mount.visible)saltFirstRifles[unit.frame]=saltRiflePose(entry);
    }
    return result;
   };
   Object.defineProperty(window,'IronVowScene',{value:api,writable:true,configurable:true});
  }});
 },weapon);
}

async function assertFirst(page,id){
 await page.waitForFunction(()=>saltFirstRifles[22]&&saltFirstRifles[23],null,{timeout:90000});
 const frames=await page.evaluate(()=>saltFirstRifles);
 for(const [frame,pose] of Object.entries(frames)){
  assert.equal(pose.weapon,id);
  assert.ok(pose.roll>.98,`Frame ${frame} first visible ${id} has the optic above the grip: ${JSON.stringify(pose)}`);
  assert.ok(pose.pitch>.15&&pose.pitch<.60,`Frame ${frame} first visible ${id} starts in low carry: ${JSON.stringify(pose)}`);
 }
 return frames;
}

module.exports={install,assertFirst};
