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
assert.equal(renderedTriangles(g),100);
const instance=add('instance');g.nodes[instance].mesh=0;
assert.equal(renderedTriangles(g),200,'instances must count towards rendered budget');
const weapon={nodes:[{mesh:0}],scenes:[{nodes:[0]}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],accessors:[{count:180000}]};
assert.equal(validate(g,[weapon]).ok,false,'weapons must count towards budget');
g.meshes[0].extras.part='invalid';assert(validate(g).errors.some(e=>e.includes('extras.part')));
console.log('rig v2 export gate tests passed');
