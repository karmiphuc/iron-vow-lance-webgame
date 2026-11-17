/* Package the seven approved Warden Bench pose streams without re-exporting its meshes. */
const assert=require('node:assert/strict');
const {readFileSync,writeFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const clipNames=['Aim','Brace','Melee maul','Melee sweep','Melee thrust','Recoil','Walk'];
const provenanceKey='approvedWardenBench';

function decode(bytes){
 assert.equal(bytes.readUInt32LE(0),0x46546c67);
 assert.equal(bytes.readUInt32LE(4),2);
 assert.equal(bytes.readUInt32LE(8),bytes.length);
 assert.equal(bytes.readUInt32LE(16),0x4e4f534a);
 const end=20+bytes.readUInt32LE(12);
 assert.equal(bytes.readUInt32LE(end+4),0x004e4942);
 assert.equal(end+8+bytes.readUInt32LE(end),bytes.length);
 return [JSON.parse(bytes.subarray(20,end)),bytes.subarray(end+8)];
}

function encode(doc,buffer){
 const json=Buffer.from(JSON.stringify(doc)),size=Math.ceil(json.length/4)*4;
 const output=Buffer.alloc(28+size+buffer.length);
 output.write('glTF');output.writeUInt32LE(2,4);output.writeUInt32LE(output.length,8);
 output.writeUInt32LE(size,12);output.write('JSON',16);json.copy(output,20);output.fill(32,20+json.length,20+size);
 output.writeUInt32LE(buffer.length,20+size);output.writeUInt32LE(0x004e4942,24+size);buffer.copy(output,28+size);
 return output;
}

function pack(asset,motion){
 const [doc,oldBuffer]=decode(asset),clips=JSON.parse(motion);
 const prior=doc.extras?.[provenanceKey];
 if(doc.animations?.length)assert.ok(prior,'Will not replace unrelated animations');
 const original=prior??{bytes:oldBuffer.length,views:doc.bufferViews.length,accessors:doc.accessors.length};
 assert.ok(doc.buffers.length===1&&original.bytes%4===0&&original.bytes<=oldBuffer.length);
 doc.bufferViews.length=original.views;doc.accessors.length=original.accessors;
 const chunks=[oldBuffer.subarray(0,original.bytes)];
 let cursor=original.bytes;
 function append(values,type,count,properties={}){
  assert.ok(values.every(Number.isFinite));
  const data=Buffer.alloc(values.length*4);
  values.forEach((value,i)=>data.writeFloatLE(value,i*4));
  const bufferView=doc.bufferViews.push({buffer:0,byteOffset:cursor,byteLength:data.length})-1;
  cursor+=data.length;chunks.push(data);
  return doc.accessors.push({bufferView,componentType:5126,count,type,...properties})-1;
 }
 const nodes=new Map(doc.nodes.map(({name},index)=>[name,index]));
 assert.ok(nodes.has('Painted_Warden'));
 assert.deepEqual(Object.keys(clips).sort(),clipNames.slice().sort());
 doc.animations=clipNames.map(name=>{
  const {frames,fps,nodes:motionNodes}=clips[name];
  assert.ok(Number.isInteger(frames)&&frames>1&&Number.isInteger(fps)&&fps>0);
  const time=Array.from({length:frames},(_,frame)=>Math.fround(frame/fps));
  const input=append(time,'SCALAR',frames,{min:[0],max:[time.at(-1)]}),channels=[],samplers=[];
  for(const [joint,values] of Object.entries(motionNodes)){
   const node=nodes.get(joint);
   assert.ok(Number.isInteger(node)&&values.length===10*frames,joint);
   for(const [path,offset,count] of [['translation',0,3],['rotation',3,4],['scale',7,3]]){
    const components=[];
    for(let frame=0;frame<frames;frame++){
     const data=values.slice(frame*10+offset,frame*10+offset+count);
     const length=path==='rotation'?Math.hypot(...data):1;
     assert.ok(length>0);
     components.push(...data.map(value=>value/length));
    }
    const output=append(components,'VEC'+count,frames);
    const sampler=samplers.push({input,output,interpolation:'LINEAR'})-1;
    channels.push({sampler,target:{node,path}});
   }
  }
  return {name,channels,samplers};
 });
 doc.extras={...doc.extras,[provenanceKey]:{bytes:original.bytes,views:original.views,accessors:original.accessors,
  sourceSha256:createHash('sha256').update(motion).digest('hex')}};
 doc.buffers[0].byteLength=cursor;
 return encode(doc,Buffer.concat(chunks,cursor));
}

if(require.main===module){
 const [asset,motion,output]=process.argv.slice(2);
 assert.ok(asset&&motion&&output,'Usage: node pack-bench-clips.cjs source.glb approved-bench-motion.json output.glb');
 writeFileSync(output,pack(readFileSync(asset),readFileSync(motion)));
}
module.exports={pack,decode};
