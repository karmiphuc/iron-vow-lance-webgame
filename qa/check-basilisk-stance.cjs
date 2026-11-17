const assert=require('node:assert/strict');
const {join}=require('node:path');
const {readGLB}=require('./check-rig-v2.cjs');

const directory=join(__dirname,'../dist/rig-bench/rig-v2');
const basilisk=readGLB(join(directory,'basilisk.glb'));
const kestrel=readGLB(join(directory,'kestrel.glb'));
function stance({nodes}){
 const node=name=>nodes.find(candidate=>candidate.name===name);
 return {
  hips:Math.abs(node('hip.L').translation[0]-node('hip.R').translation[0]),
  stance:node('root').extras.restX*2,
 };
}
const heavy=stance(basilisk),scout=stance(kestrel);
assert.ok(heavy.hips>=1.75,'Basilisk keeps the wider authored hip span');
assert.ok(heavy.stance>=1.75&&heavy.stance>scout.stance+.5,'The active GLB preserves the wide stance');
// browser/stock-v2.cjs checks actual planted ankles and piston fits under the live animator.
console.log('PASS Basilisk hip clearance and wide stance in the active rig-v2 export');
