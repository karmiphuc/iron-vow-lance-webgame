const assert=require('node:assert/strict');
const archiveHarness=require('./clip-archive.cjs');
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
function joints(sample){
 const role=Object.fromEntries(sample.nodes.filter(n=>n.tags.aegis_role).map(n=>[n.tags.aegis_role,n]));
 for(const [item,socket] of [['cleaver','socket.R'],['shield','socket.L']]){
  assert.equal(role[item].parent,role[socket].name);
  assert.ok(distance(role[item].position,role[socket].position)<.0002);
 }
 const bone=name=>sample.nodes.find(node=>node.name.replace(/[^a-z0-9]/gi,'')===name).position;
 return {tip:sample.nodes.find(n=>n.tags.weapon_marker==='tip').position,foot:bone('FootR'),
  finger:bone('Index03R'),grip:role['socket.R'].position};
}
module.exports=async function checkBulwarkBench({page,origin}){
 const {select,scrub}=await archiveHarness(page,origin);
 await select(17,'bulwark');
 const before=joints(await scrub('Strike',.545)),contact=joints(await scrub('Strike',.587)),after=joints(await scrub('Strike',.630));
 assert.ok(contact.tip[0]-before.tip[0]>.35&&after.tip[0]-contact.tip[0]>.35,'Blade travels through contact');
 assert.ok(distance(before.foot,contact.foot)<.005&&distance(contact.foot,after.foot)<.005,'Lead sole stays planted');
 assert.equal((await scrub('Bash',.4)).clip,'Bash');
 const closed=joints(await scrub('Grip',0)),open=joints(await scrub('Grip',.4));
 assert.ok(distance(closed.finger,open.finger)>.10&&distance(closed.grip,open.grip)<.001);
 await select(3,'gatecrasher');
 assert.equal(await page.locator('#bench-clip option[value=Grip]').count(),0);
 assert.equal(await page.locator('#bench-clip option[value=Strike]').count(),1);
};
