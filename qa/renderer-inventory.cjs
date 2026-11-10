const fs=require('node:fs');
const path=require('node:path');
const createSimulation=require('./sim-harness.cjs');
const root=path.resolve(__dirname,'..');
const dimensions=['py','spY','legA','legB','ankleH','restX','restZ','lift','stance','toe','reverse','quad','reach','phases','sway'];
const mapping={
 WARDEN:['rig-bench/warden-painted.glb','rig-bench/warden.glb'],KESTREL:['rig-bench/kestrel.glb'],BASILISK:['rig-bench/basilisk.glb'],
 GATECRASHER:['rig-bench/prototypes/gatecrasher.glb'],CICADA:['rig-bench/prototypes/cicada.glb'],
 BASTION:['rig-bench/bastion-bst04.glb'],HELLBREAKER:['rig-bench/prototypes/hellbreaker.glb'],
 'BULWARK-AEGIS':['rig-bench/prototypes/bulwark.glb'],ASHIGARU:['rig-bench/prototypes/scout.glb']
};
function readGLB(file){
 const bytes=fs.readFileSync(path.join(root,'dist',file));
 if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2)throw Error('Invalid GLB: '+file);
 const length=bytes.readUInt32LE(12);
 if(bytes.readUInt32LE(16)!==0x4e4f534a)throw Error('Missing GLB JSON: '+file);
 const gltf=JSON.parse(bytes.subarray(20,20+length).toString('utf8'));
 const nodes=gltf.nodes??[],meshes=gltf.meshes??[],materials=(gltf.materials??[]).map(m=>m.name??'(unnamed)');
 let triangles=0;
 for(const mesh of meshes)for(const p of mesh.primitives??[]){
  const count=gltf.accessors?.[p.indices??p.attributes?.POSITION]?.count??0;
  if((p.mode??4)===4)triangles+=count/3;
  else if(p.mode===5||p.mode===6)triangles+=Math.max(0,count-2);
 }
 const rootNode=nodes.find(n=>n.name==='root');
 return {file,bytes:bytes.length,nodes:nodes.length,meshes:meshes.length,unique_mesh_triangles:triangles,
  skins:gltf.skins?.length??0,clips:(gltf.animations??[]).map(a=>a.name??'(unnamed)'),materials,
  node_names:nodes.map(n=>n.name).filter(Boolean),
  nodes_with_part:nodes.filter(n=>n.extras?.part).length,meshes_with_part:meshes.filter(m=>m.extras?.part).length,
  detachable_nodes:nodes.filter(n=>n.extras?.detach===true).length,
  missing_root_dimensions:dimensions.filter(key=>rootNode?.extras?.[key]===undefined)};
}
function inventory(){
 const sim=createSimulation();
 const frames=JSON.parse(JSON.stringify(sim.run('FRAMES.map((f,id)=>({id,name:f.name,model:f.model,foundry:f.foundry,native:f.native,rig:f.rig}))')));
 const glbs=fs.readdirSync(path.join(root,'dist'),{recursive:true}).filter(f=>f.endsWith('.glb')).sort().map(readGLB);
 return {baseline:'f264567f01d0501b11f40e1ffdc15a314f47993d',
  frames:frames.map(f=>({...f,glbs:mapping[f.name]??[],source:f.foundry<6?'procedural kit':'GLB or baked-only; see markdown'})),
  glbs,optional_chassis:[{name:'LION',in_frames:false,glbs:[],source:'lion-art.js; external Lion-Rigged.blend required'}],
  note:'GLB presence does not establish rig contract v2. Counts inspect file JSON, not live renderer.info. Unique mesh triangles exclude node instancing.'};
}
if(require.main===module){
 const output=process.argv[2];
 if(output)fs.writeFileSync(path.resolve(output),JSON.stringify(inventory(),null,2)+'\n');
 else process.stdout.write(JSON.stringify(inventory(),null,2)+'\n');
}
module.exports={inventory,readGLB};
