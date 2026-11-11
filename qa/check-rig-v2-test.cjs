const assert=require('node:assert/strict');
const {validate,renderedTriangles}=require('./check-rig-v2.cjs');
const dims=['py','spY','legA','legB','ankleH','restX','restZ','lift','stance','toe','reverse','quad','reach','phases','sway'];
const root={name:'root',extras:Object.fromEntries(dims.map(d=>[d,0])),children:[]};
const g={nodes:[root],scenes:[{nodes:[0]}],meshes:[{extras:{part:'body',detach:true},primitives:[{attributes:{POSITION:0}}]}],accessors:[{count:300}],materials:['paint_primary','paint_secondary','paint_accent','visor','stack'].map(name=>({name})),extensionsUsed:['EXT_meshopt_compression']};
function add(name,parent=0) {let i=g.nodes.push({name,children:[]})-1;g.nodes[parent].children.push(i);return i;}
const pelvis=add('pelvis'),spine=add('spine',pelvis);add('neck',spine);
for(const s of ['L','R']) {let p=spine;for(const n of ['shoulder','elbow','wrist','socket'])p=add(`${n}.${s}`,p);p=pelvis;for(const n of ['hip','knee','ankle'])p=add(`${n}.${s}`,p);}
const meshNode=add('geometry');g.nodes[meshNode].mesh=0;
assert.equal(validate(g).ok,true);
// A complete rig outside the default scene cannot be found by the runtime.
const orphaned=structuredClone(g);
orphaned.scenes[0].nodes=[meshNode];
assert(validate(orphaned).errors.includes('missing node root'));
const inactiveDuplicate=structuredClone(g);
inactiveDuplicate.nodes.unshift({name:'root',extras:{quad:true}});
for(const node of inactiveDuplicate.nodes) if(node.children) node.children=node.children.map(i=>i+1);
inactiveDuplicate.scenes[0].nodes=[1];
inactiveDuplicate.scenes.push({nodes:[0]});
assert.equal(validate(inactiveDuplicate).ok,true,'inactive scene names must not affect the rig');
const activeDuplicate=structuredClone(g);
activeDuplicate.scenes[0].nodes.push(activeDuplicate.nodes.push({name:'root'})-1);
assert(validate(activeDuplicate).errors.includes('duplicate node root'));
const siblingMesh=structuredClone(g);
siblingMesh.nodes[0].children=siblingMesh.nodes[0].children.filter(i=>i!==meshNode);
siblingMesh.scenes[0].nodes.push(meshNode);
assert.equal(validate(siblingMesh).ok,true,'scene mesh may be a sibling of the rig');
const noMesh=structuredClone(g);
noMesh.nodes[meshNode].mesh=undefined;
assert(validate(noMesh).errors.includes('default scene contains no mesh'));

// A name-complete skeleton must still connect each major limb to the body.
for(const [parentName,childName] of [['root','pelvis'],['pelvis','spine'],['spine','neck'],['spine','shoulder.L'],['pelvis','hip.R']]) {
  const parent=g.nodes.find(n=>n.name===parentName),child=g.nodes.findIndex(n=>n.name===childName);
  parent.children=parent.children.filter(i=>i!==child);
  g.scenes[0].nodes.push(child);
  assert(validate(g).errors.some(e=>e===`${childName} is not below ${parentName}`), `${childName} must be attached below ${parentName}`);
  g.scenes[0].nodes.pop();
  parent.children.push(child);
}

assert.equal(renderedTriangles(g),100);
const instance=add('instance');g.nodes[instance].mesh=0;
assert.equal(renderedTriangles(g),200,'instances must count towards rendered budget');
const weapon={nodes:[{mesh:0}],scenes:[{nodes:[0]}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],accessors:[{count:180000}]};
assert.equal(validate(g,[weapon]).ok,false,'weapons must count towards budget');
g.meshes[0].extras.part='invalid';assert(validate(g).errors.some(e=>e.includes('extras.part')));
console.log('rig v2 export gate tests passed');
