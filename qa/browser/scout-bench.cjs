const assert=require('node:assert/strict');
const archiveHarness=require('./clip-archive.cjs');
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
function rig(sample){
 const bone=name=>sample.nodes.find(node=>node.name.replace(/[^a-z0-9]/gi,'')===name).position;
 const weapons=sample.nodes.filter(node=>node.tags.scout_weapon);
 const mounts=weapons.map(node=>[node.tags.scout_weapon,node.parentTags.scout_socket]).sort();
 assert.deepEqual(mounts,[['carbine','R'],['knife','L'],['scatter','R']]);
 assert.ok(weapons.every(node=>distance(node.position,node.parentPosition)<.0001));
 return {...sample,pelvis:bone('pelvis'),left:bone('footL'),right:bone('footR'),
  visible:weapons.filter(node=>node.visible).map(node=>node.tags.scout_weapon),
  flashes:sample.nodes.filter(node=>node.visible&&node.tags.archiveFlash).map(node=>node.tags.archiveFlash)};
}
module.exports=async function checkScoutBench({page,origin}){
 const {select,scrub}=await archiveHarness(page,origin);
 await select(18,'scout');
 await page.locator('#bench-view').selectOption('side');
 const start=rig(await scrub('Quickstep',0)),swing=rig(await scrub('Quickstep',.225)),
  leftPlant=rig(await scrub('Quickstep',.46)),rightSwing=rig(await scrub('Quickstep',.665)),finish=rig(await scrub('Quickstep',.999));
 assert.ok(start.duration<=1.04&&start.duration>=.96&&distance(start.pelvis,finish.pelvis)>1.7);
 assert.ok(distance(start.right,swing.right)<.004&&swing.left[1]-start.left[1]>.10);
 assert.ok(distance(leftPlant.left,rightSwing.left)<.004&&rightSwing.right[1]-start.right[1]>.10);
 for(const [clip,weapon,shot] of [['Fire','carbine',.425],['Burst','scatter',.232],['Strike','knife',.432]]){
  const pose=rig(await scrub(clip,shot));
  assert.deepEqual(pose.visible,[weapon]);
  assert.deepEqual(pose.flashes,clip==='Strike'?[]:[weapon]);
 }
 assert.deepEqual(rig(await scrub('Burst',.42)).flashes,[]);
 assert.deepEqual(rig(await scrub('Burst',.60)).flashes,['scatter']);
};
