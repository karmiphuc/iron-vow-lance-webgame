const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.join(__dirname,'../dist/assets/environment/industrial'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(manifest.license,'CC0-1.0');assert.equal(manifest.author,'Kenney');
assert.match(fs.readFileSync(path.join(dir,'License.txt'),'utf8'),/Creative Commons Zero, CC0/);
let triangles=0,total=0;
for(const [name,info] of Object.entries(manifest.models)){
 const bytes=fs.readFileSync(path.join(dir,name));assert.equal(sha(bytes),info.sha256);assert.equal(bytes.length,info.bytes);
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));
 let count=0;for(const mesh of gltf.meshes)for(const p of mesh.primitives){assert.equal(p.mode??4,4);count+=(p.indices===undefined?gltf.accessors[p.attributes.POSITION]:gltf.accessors[p.indices]).count/3;}
 assert.equal(count,info.triangles);assert.ok(count<3000);triangles+=count;total+=bytes.length;
 for(const image of gltf.images){assert.equal(image.uri,'Textures/colormap.png');assert.ok(fs.existsSync(path.join(dir,image.uri)));}
}
const texture=fs.readFileSync(path.join(dir,manifest.texture.file));assert.equal(sha(texture),manifest.texture.sha256);total+=texture.length;
assert.equal(Object.keys(manifest.models).length,3);assert.ok(total<2_000_000);
console.log(`PASS 3 licensed industrial GLBs, ${triangles} triangles, ${total} bytes, original hashes and local texture dependencies`);
