const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const world={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/theater-layouts.js'),'utf8'),world);
const {IRON_VOW_DISTRESS_MAPS:maps,ironVowDistressTerrain:survey}=world.window;
const size={width:18,depth:20},dirs=[[1,0],[0,1],[-1,0],[0,-1]];
for(const [key,plan] of Object.entries(maps)){
 const {cells,cover}=survey(key,17,size,[]);
 const reset=survey(key,17,size,[]);
 assert.equal(JSON.stringify(reset),JSON.stringify({cells,cover,label:plan.label}));
 assert.equal(cells.length,360);
 const minLevel=Math.min(...cells.map(cell=>cell.level)),maxLevel=Math.max(...cells.map(cell=>cell.level));
 assert.ok(maxLevel-minLevel>=2,key+' needs elevation choices');
 for(const [x,z] of plan.allies){
  assert.ok(dirs.some(([dx,dz])=>cover[[x+dx,z+dz].join(',')]),key+' ally must deploy in cover');
 }
 const seen=new Set(['1,16']),queue=[[1,16]];
 for(const [x,z] of queue)for(const [dx,dz] of dirs){
  const a=x+dx,b=z+dz,id=[a,b].join(',');
  if(a<0||b<0||a>=size.width||b>=size.depth||cover[id]||seen.has(id))continue;
  seen.add(id);queue.push([a,b]);
 }
 assert.equal(seen.size+Object.keys(cover).length,360,key+' has isolated ground');
 for(let z=0;z<size.depth;z++)for(let x=0;x<size.width;x++){
  for(const [i,[dx,dz]] of dirs.entries()){
   if(!(cells[z*size.width+x].links&(1<<i)))continue;
   assert.ok(!cover[[x,z].join(',')],key+' has a blocked road at '+[x,z]);
   assert.ok(cells[(z+dz)*size.width+x+dx].links&(1<<((i+2)%4)));
  }
 }
 for(const tile of [...plan.goal,...plan.allies])assert.ok(seen.has(tile.join(',')),key+' objective unreachable');
 if(key==='lift')assert.equal(plan.goal.some(tile=>tile.join()===plan.allies[0].join()),true);
}
console.log('Distress maps passed connectivity, deployment cover, reciprocal road links, goal access and seeded replay.');
