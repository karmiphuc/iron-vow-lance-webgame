const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const {join}=require('node:path');
const vm=require('node:vm');
const {decode,pack}=require('../tools/authoring/warden/pack-bench-clips.cjs');
const bench=join(__dirname,'../dist/rig-bench');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const motionBytes=readFileSync(join(__dirname,'../tools/authoring/warden/approved-bench-motion.json'));
const fixture=JSON.parse(motionBytes),glb=readFileSync(join(bench,'warden-painted.glb'));
const [doc,binary]=decode(glb),original=doc.extras.approvedWardenBench;
assert.equal(hash(motionBytes),'0a6b1a6cbb2fb5806b76934dc54fc1739b9cf99b969d136a6f3a0f082fddb53d');
assert.equal(original.sourceSha256,hash(motionBytes));
assert.equal(hash(binary.subarray(0,original.bytes)),'8cc7805da39c51b8a9edf346d6daa531003c9018414890734eb249633c10d6da',
 'Published geometry BIN payload is unchanged');
assert.ok(pack(glb,motionBytes).equals(glb),'Native-clip export is deterministic');

const native={console};
native.self=native;
native.window=native;
vm.createContext(native);
for(const file of ['three.min.js','GLTFLoader.js'])
 vm.runInContext(readFileSync(join(bench,'vendor',file),'utf8'),native,{filename:file});
native.IronVowFoundryRig={V3:()=>new native.THREE.Vector3()};
vm.runInContext(readFileSync(join(__dirname,'../dist/foundry/rig-v2.js'),'utf8'),native,{filename:'rig-v2.js'});
async function run(){
 const T=native.THREE;
 const data=vm.runInContext('new ArrayBuffer('+glb.length+')',native);
 new Uint8Array(data).set(glb);
 // The VM has no HTTP transport. Decode the real bytes through the vendored loader.
 T.GLTFLoader.prototype.loadAsync=function(file){
  assert.equal(file,'warden-painted.glb');
  return new Promise((resolve,reject)=>this.parse(data,'',resolve,reject));
 };
 const archive=await native.IronVowRigV2.loadClipArchive('warden-painted.glb');
 assert.deepEqual(Array.from(archive.clips,clip=>clip.name).sort(),Object.keys(fixture).sort());
 const root=archive.source.getObjectByName('Painted_Warden');
 const overrides=['Bench_Torso','Bench_Hand_R','Bench_Hand_L'].map(name=>root.getObjectByName(name));
 let maxPosition=0,maxAngle=0,maxScale=0,count=0;
 for(const [name,clip] of Object.entries(fixture)){
  const channels=doc.animations.find(animation=>animation.name===name).channels;
  assert.equal(channels.length,Object.keys(clip.nodes).length*3);
  const duration=(clip.frames-1)/clip.fps;
  assert.ok(Math.abs(archive.clips.find(candidate=>candidate.name===name).duration-duration)<1e-6);
  const nodes=Object.entries(clip.nodes).map(([name,values])=>[root.getObjectByName(name),values]);
  for(let frame=0;frame<=clip.frames-1;frame+=.5){
   const from=Math.floor(frame),to=Math.min(from+1,clip.frames-1),mix=frame-from;
   const time=frame/clip.fps;
   archive.sample(name,time);
   // A repeated time must restore the sampled pose after gameplay changes it.
   for(const node of overrides){node.position.x+=10;node.rotateY(1);}
   archive.sample(name,time);
   for(const [node,values] of nodes){
    const translation=new T.Vector3().fromArray(values,from*10)
     .lerp(new T.Vector3().fromArray(values,to*10),mix);
    const rotation=new T.Quaternion().fromArray(values,from*10+3).normalize()
     .slerp(new T.Quaternion().fromArray(values,to*10+3).normalize(),mix);
    const scale=new T.Vector3().fromArray(values,from*10+7)
     .lerp(new T.Vector3().fromArray(values,to*10+7),mix);
    maxPosition=Math.max(maxPosition,node.position.distanceTo(translation));
    maxAngle=Math.max(maxAngle,node.quaternion.clone().normalize().angleTo(rotation.clone().normalize()));
    maxScale=Math.max(maxScale,node.scale.distanceTo(scale));
    count++;
   }
  }
 }
 archive.dispose();
 assert.ok(maxPosition<1e-5, 'Local position error '+maxPosition);
 assert.ok(maxAngle<1e-5, 'Local rotation error '+maxAngle);
 assert.ok(maxScale<1e-5, 'Local scale error '+maxScale);
 console.log('PASS 7 native Warden Bench clips: '+count+' local pose checks; maximum position '+maxPosition.toExponential(2)+
  ', rotation '+maxAngle.toExponential(2)+' rad, scale '+maxScale.toExponential(2));
}
run().catch(error=>{console.error(error);process.exitCode=1;});
