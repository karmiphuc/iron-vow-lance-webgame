// Build the source-backed canonical bind with the published Warden rig math.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const hash=bytes=>require('node:crypto').createHash('sha256').update(bytes).digest('hex');

function runtime(repo){
 const dist=path.join(repo,'dist');
 const sandbox={console,TextDecoder,URL,Blob,fetch,ArrayBuffer,Uint8Array,Math:Object.assign(Object.create(Math),{random:()=>.42}),ProgressEvent:globalThis.ProgressEvent??class ProgressEvent{}};
 sandbox.window=sandbox;sandbox.self=sandbox;
 sandbox.document={createElement:()=>{
  const canvas={width:1,height:1,style:{}};
  const pixels=(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)});
  const gradient=()=>({addColorStop(){}});
  canvas.getContext=()=>new Proxy({canvas,createImageData:pixels,getImageData:(x,y,w,h)=>pixels(w,h),
   createLinearGradient:gradient,createRadialGradient:gradient,measureText:()=>({width:10})},{get:(object,key)=>object[key]??(()=>{})});
  return canvas;
 }};
 const files=['rig-bench/vendor/three.min.js','rig-bench/vendor/GLTFLoader.js','rig-bench/vendor/meshopt-decoder.js',
  'foundry/production-arsenal.js','foundry/behemoth-core.js','foundry/chassis.js','foundry/rig-motion.js',
  'foundry/rigid-adapter.js'];
 const context=vm.createContext(sandbox);
 for(const file of files)vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),context,{filename:file});
 const reference=path.join(repo,'tools/authoring/warden/legacy-bind.js');
 vm.runInContext(fs.readFileSync(reference,'utf8'),context,{filename:reference});
 return sandbox;
}

const asBuffer=bytes=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
function decodeGLB(bytes){
 assert.equal(bytes.readUInt32LE(0),0x46546c67);
 const end=20+bytes.readUInt32LE(12);
 return {doc:JSON.parse(bytes.subarray(20,end)),binary:bytes.subarray(end+8)};
}
function encodeGLB(doc,binary){
 const json=Buffer.from(JSON.stringify(doc));
 const padding=(4-json.length%4)%4,padded=json.length+padding;
 const glb=Buffer.alloc(28+padded+binary.length);
 glb.write('glTF',0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);
 glb.writeUInt32LE(padded,12);glb.write('JSON',16);json.copy(glb,20);
 glb.fill(0x20,20+json.length,20+padded);
 glb.writeUInt32LE(binary.length,20+padded);glb.writeUInt32LE(0x004e4942,24+padded);binary.copy(glb,28+padded);
 return glb;
}
const materialNames={'Warden / ivory ceramic':'paint_primary','Warden / blue graphite armor':'paint_secondary','Warden / amber optic':'visor'};
const transform=node=>({translation:node.position.toArray(),rotation:node.quaternion.toArray(),scale:node.scale.toArray()});
const maxDiff=(a,b)=>Math.max(...a.map((value,i)=>Math.abs(value-b[i])));

async function bind(repo,out,sourceBlend){
 assert.ok(repo&&out,'Provide the source repository and a scratch output directory.');
 const blenderSource=hash(fs.readFileSync(sourceBlend));
 fs.mkdirSync(out,{recursive:true});
 const source=fs.readFileSync(path.join(out,'warden-painted.glb'));
 const motionBytes=fs.readFileSync(path.join(out,'warden-painted-motion.json'));
 const motion=JSON.parse(motionBytes);
 const {doc,binary}=decodeGLB(source),originalNodes=doc.nodes;
 const env=runtime(repo),{THREE:T,IronVowWardenRig:warden}=env;
 const BaseLoader=T.GLTFLoader;
 let original;
 T.GLTFLoader=class extends BaseLoader{
  parse(buffer,base,resolve,reject){
   super.parse(buffer,base,result=>{
    const {associations}=result.parser;
    const nodeIndex=node=>{const association=associations.get(node);return association?.type==='nodes'?association.index:association?.nodes;};
    result.scene.traverse(mesh=>{
     if(!mesh.isMesh)return;
     let node=mesh;
     while(node&&nodeIndex(node)===undefined)node=node.parent;
     const index=nodeIndex(node);
     assert.ok(Number.isInteger(index)&&originalNodes[index].mesh!==undefined,mesh.name);
     mesh.userData.sourceNode=index;
    });
    original=result.scene.getObjectByName('Painted_Warden');
    resolve(result);
   },reject);
  }
 };
 await warden.load(asBuffer(source),motion);
 T.GLTFLoader=BaseLoader;
 const genuine=warden.build('ally',null,{keepBind:true,authoredElbows:true,scale:1});
 const bound=warden.build('ally',null,{keepBind:true,scale:1});
 const published=warden.build('ally',null);
 bound.body.name='root';
 for(const side of ['L','R'])bound.rig.arms[side].paul.name='Pauldron.'+side;
 bound.body.updateWorldMatrix(true,true);
 const parts=new Map(Object.entries(bound.build.parts).flatMap(([part,entries])=>entries.map(({m})=>[m,part])));
 const nodes=[],sourceOwners=new Map();
 function add(node){
  const index=nodes.length;
  const output={name:node.name,...transform(node),extras:{wardenJoint:true}};
  nodes.push(output);
  const children=[];
  for(const child of node.children){
   if(!child.isMesh){children.push(add(child));continue;}
   const sourceIndex=child.userData.sourceNode,previous=sourceOwners.get(sourceIndex);
   if(previous){
    assert.equal(previous.parent,node.name);
    assert.ok(maxDiff(previous.matrix,child.matrix.elements)<1e-8,'A multi-material node has inconsistent rigid owners.');
    continue;
   }
   sourceOwners.set(sourceIndex,{parent:node.name,matrix:child.matrix.elements.slice()});
   children.push(nodes.length);
   nodes.push({name:originalNodes[sourceIndex].name,mesh:originalNodes[sourceIndex].mesh,...transform(child),
    extras:{...originalNodes[sourceIndex].extras,part:parts.get(child),publishedNode:sourceIndex}});
  }
  if(children.length)output.children=children;
  return index;
 }
 add(bound.body);
 assert.equal(sourceOwners.size,originalNodes.filter(n=>n.mesh!==undefined).length);
 const provenance={format:'Recovered Warden Blender source through the Warden bench exporter',blenderSource,sourceSha256:hash(source),motionSha256:hash(motionBytes),clip:'Aim',frame:0,elbows:'published forward hinge projection',runtimeScale:published.scale};
 Object.assign(nodes[0].extras,bound.dims,{stance:undefined,reach:0,phases:[0,.5],provenance});
 // The source Warden has no authored stance multiplier. This metadata expresses
 // the explicit restX rather than setting a gait modifier at runtime.
 nodes[0].extras.stance=bound.dims.restX/bound.dims.shX;
 doc.nodes=nodes;doc.scenes=[{name:'Warden | source-backed rig v2',nodes:[0]}];doc.scene=0;
 for(const material of doc.materials)if(materialNames[material.name])material.name=materialNames[material.name];
 const target=encodeGLB(doc,binary);
 fs.writeFileSync(path.join(out,'warden-published-bind.glb'),target);
 for(const [name,values] of Object.entries(motion.Aim.nodes)){
  const node=original.getObjectByName(name);
  if(!node)continue;
  node.position.fromArray(values,0);node.quaternion.fromArray(values,3);node.scale.fromArray(values,7);
 }
 original.updateMatrixWorld(true);genuine.cont.updateMatrixWorld(true);
 const matrices=new Map();
 original.traverse(node=>{if(node.isMesh)matrices.set(node.name,node.matrixWorld.elements);});
 let aimBindError=0;
 genuine.cont.traverse(node=>{if(node.isMesh)aimBindError=Math.max(aimBindError,maxDiff(matrices.get(node.name),node.matrixWorld.elements));});
 console.log(JSON.stringify({sourceMeshNodes:sourceOwners.size,aimBindError,runtimeScale:published.scale}));
 assert.ok(Number.isFinite(aimBindError)&&aimBindError<.001,`Aim matrix error ${aimBindError}`);
}

// Restore the canonical joint bases and unchanged PBR values around the compressed geometry.
async function pack(repo,folder){
 const exact=fs.readFileSync(path.join(folder,'warden-published-bind.glb'));
 const editable=fs.readFileSync(path.join(folder,'warden-blender-roundtrip.glb'));
 const env=runtime(repo),T=env.THREE;
 const parse=bytes=>new Promise((resolve,reject)=>new T.GLTFLoader().setMeshoptDecoder(env.MeshoptDecoder).parse(asBuffer(bytes),'',resolve,reject));
 const [original,roundtrip]=await Promise.all([parse(exact),parse(editable)]);
 const {doc:canonical}=decodeGLB(exact),{doc:compressed,binary}=decodeGLB(editable);
 assert.ok(compressed.extensionsUsed.includes('EXT_meshopt_compression'));
 const byName=new Map(compressed.nodes.map(node=>[node.name,node]));
 let matrices=0,geometry=0,meshCount=0;
 for(const node of canonical.nodes){
  const target=byName.get(node.name);
  if(node.mesh===undefined)continue;
  const a=original.scene.getObjectByName(node.name),b=roundtrip.scene.getObjectByName(node.name);
  a.updateWorldMatrix(true,true);b.updateWorldMatrix(true,true);
  matrices=Math.max(matrices,maxDiff(a.matrixWorld.elements,b.matrixWorld.elements));
  const boxA=new T.Box3().setFromObject(a),boxB=new T.Box3().setFromObject(b);
  geometry=Math.max(geometry,boxA.min.distanceTo(boxB.min),boxA.max.distanceTo(boxB.max));
  assert.equal(target.extras.part,node.extras.part);
  compressed.meshes[target.mesh].extras={...compressed.meshes[target.mesh].extras,part:node.extras.part,...(node.extras.detach?{detach:true}:{})};
  node.mesh=target.mesh;
  meshCount++;
 }
 assert.equal(meshCount,canonical.nodes.filter(n=>n.mesh!==undefined).length);
 assert.ok(matrices<1e-5&&geometry<1e-3,JSON.stringify({matrices,geometry}));
 const names=new Map(canonical.materials.map((material,index)=>[material.name,index]));
 for(const mesh of compressed.meshes)for(const primitive of mesh.primitives){
  const source=compressed.materials[primitive.material]?.name;
  assert.ok(names.has(source),source);
  primitive.material=names.get(source);
 }
 compressed.materials=canonical.materials;
 compressed.nodes=canonical.nodes;
 compressed.scenes=canonical.scenes;
 compressed.scene=canonical.scene;
 const result=encodeGLB(compressed,binary);
 fs.writeFileSync(path.join(folder,'warden.glb'),result);
 const report={meshes:meshCount,rawRoundtripMaxMeshMatrixDelta:matrices,rawRoundtripMaxBoundsDisplacement:geometry,materialsUnchanged:true,meshopt:true,bytes:result.length};
 console.log(JSON.stringify(report));
}

const [mode,...args]=process.argv.slice(2);
({bind,pack})[mode](...args).catch(error=>{console.error(error);process.exitCode=1;});
