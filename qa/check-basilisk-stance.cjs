const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const T=require('../dist/rig-bench/vendor/three.min.js');
const root=path.resolve(__dirname,'..');
const base=process.env.IRON_VOW_BASILISK_BASELINE;
const bytes=file=>base?execFileSync('git',['show',base+':'+file],{cwd:root,maxBuffer:8e6}):fs.readFileSync(path.join(root,file));
const glb=bytes('dist/rig-bench/basilisk.glb');
const gltf=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
const node=name=>gltf.nodes.find(n=>(n.extras?.name||n.name)===name);
const sampler=bytes('tools/sample_warden_motion.cjs').toString();
function samples(model){
 let out='';
 vm.runInNewContext(sampler,{require:require('node:module').createRequire(path.join(root,'tools/sample_warden_motion.cjs')),
  __dirname:path.join(root,'tools'),process:{argv:['node','sampler','--arsenal','--model',model],stdout:{write:s=>out+=s}}});
 return JSON.parse(out);
}
const basilisk=samples('basilisk');
assert.ok(node('hip.L').translation[0]-node('hip.R').translation[0]>=1.75,'Basilisk thighs need a wider hip span');
function ankles(pose){
 const pelvis=new T.Group();pelvis.position.fromArray(pose.pelvis.position);pelvis.rotation.z=pose.pelvis.roll;
 return pose.legs.map((leg,i)=>{
  const hip=new T.Group(),knee=new T.Group(),ankle=new T.Group();
  hip.position.fromArray(node('hip.'+'LR'[i]).translation);knee.position.set(0,-1.45,0);ankle.position.set(0,-1.55,0);
  pelvis.add(hip);hip.add(knee);knee.add(ankle);
  if(pose.footTargets)hip.quaternion.setFromAxisAngle(new T.Vector3(0,0,1),leg.hip[2]).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),leg.hip[0]));
  else hip.rotation.set(...leg.hip);
  knee.rotation.x=leg.knee;pelvis.updateMatrixWorld(true);return ankle.getWorldPosition(new T.Vector3());
 });
}
for(const pose of [basilisk.idle,...basilisk.gait,...basilisk.kicks.map(r=>r.pose)]){
 const feet=ankles(pose);assert.ok(feet[0].x-feet[1].x>1.95,'heavy boots must stay visibly separated at rest and in motion');
}
for(const attack of [basilisk.attack,basilisk.attackLeft])for(const rows of Object.values(attack))for(const {pose} of rows){
 const feet=ankles(pose);
 feet.forEach((foot,i)=>assert.ok(foot.distanceTo(new T.Vector3(...pose.footTargets[i]))<1e-5,'Basilisk attack feet stay planted'));
 assert.ok(feet[0].x-feet[1].x>=2.1,'attack stance must retain wide boot spacing');
}
const before=execFileSync('git',['show','686a69c63ef66c06c3990775028473b7dda10183:tools/sample_warden_motion.cjs'],{cwd:root,encoding:'utf8'});
let original='';vm.runInNewContext(before,{require:require('node:module').createRequire(path.join(root,'tools/sample_warden_motion.cjs')),__dirname:path.join(root,'tools'),process:{argv:['node','sampler','--arsenal'],stdout:{write:s=>original+=s}}});
for(const model of ['warden','kestrel'])assert.equal(JSON.stringify(samples(model)),JSON.stringify(JSON.parse(original)),model+' keeps approved animation');
console.log('PASS Basilisk hip clearance, boot separation, planted attack feet and unchanged Warden/Kestrel motion');
