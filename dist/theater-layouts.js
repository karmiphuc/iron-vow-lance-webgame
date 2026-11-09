/* Original 18 × 20 theater cover layouts. Deployment apron x=0..4, z=14..19 remains open. */
window.IRON_VOW_THEATERS = [
  {"cover": {
    "3,2":"ridge-rock", "4,2":"ridge-rock", "2,6":"ridge-rock", "3,7":"ridge-rock", "6,5":"ridge-rock",
    "7,11":"ridge-rock", "8,11":"ridge-rock", "11,14":"ridge-rock", "12,14":"ridge-rock", "16,10":"ridge-rock",
    "16,11":"ridge-rock", "5,15":"ridge-rock", "14,17":"ridge-rock", "8,4":"relay-shield", "9,4":"relay-shield",
    "12,6":"relay-shield", "12,7":"relay-shield", "15,3":"relay-shield", "15,4":"relay-shield", "5,10":"relay-shield",
    "4,11":"relay-shield", "13,12":"relay-shield", "14,12":"relay-shield", "8,16":"relay-shield"
  }},
  {"cover": {
    "4,3":"cargo", "5,3":"cargo", "3,7":"cargo", "4,7":"cargo", "7,12":"cargo", "7,13":"cargo",
    "12,4":"cargo", "13,4":"cargo", "15,8":"cargo", "16,8":"cargo", "12,16":"cargo", "13,16":"cargo",
    "6,16":"cargo", "15,13":"cargo", "8,2":"transformer", "7,2":"transformer", "10,6":"transformer",
    "10,7":"transformer", "5,10":"transformer", "6,10":"transformer", "11,11":"transformer", "12,11":"transformer",
    "16,3":"transformer", "16,15":"transformer"
  }},
  {"cover": {
    "3,3":"conifer", "4,3":"conifer", "6,6":"conifer", "7,6":"conifer", "2,9":"conifer", "3,10":"conifer",
    "5,13":"conifer", "6,13":"conifer", "11,2":"conifer", "12,2":"conifer", "15,6":"conifer", "16,6":"conifer",
    "13,11":"conifer", "14,11":"conifer", "15,16":"conifer", "16,16":"conifer", "7,2":"bunker", "11,5":"bunker",
    "10,10":"bunker", "5,8":"bunker", "12,14":"bunker", "8,16":"bunker", "15,3":"bunker", "16,12":"bunker"
  }}
];

// Version 1 sortie generator. Old checkpoints continue to use the layouts above.
window.ironVowTerrain = function(index, seed, {width,depth}, deployment){
  const roll = max => {
    seed = (Math.imul(seed,1664525)+1013904223)>>>0;
    return Math.floor(seed/4294967296*max);
  };
  const id = (x,z) => z*width+x;
  const cells = Array.from({length:width*depth}, () => ({level:0, material:0, variant:roll(4), links:0}));
  const steps = [[1,0],[0,1],[-1,0],[0,-1]];
  const inside = (x,z) => x>=0&&z>=0&&x<width&&z<depth;
  const reserved = (x,z) => x<5&&z>=14 || deployment.some(([a,b])=>Math.abs(x-a)+Math.abs(z-b)<=1);
  const routes = [];
  function road(x,z,nx,nz){
    const direction = steps.findIndex(([dx,dz])=>x+dx===nx&&z+dz===nz);
    cells[id(x,z)].links |= 1<<direction;
    cells[id(nx,nz)].links |= 1<<((direction+2)%4);
    routes.push([x,z],[nx,nz]);
  }
  let lane = 7+roll(6);
  const spacing = index===1?5:3;
  const turn = roll(spacing);
  const cross = 6+roll(7);
  for(let z=0;z<depth-1;z++){
    if(z>0&&z%spacing===turn){
      const next = Math.max(5,Math.min(width-5,lane+roll(3)-1));
      if(next!==lane)road(lane,z,next,z);
      lane = next;
    }
    if(z===cross&&index!==2)for(let x=index===1?0:2;x<width-1;x++)road(x,z,x+1,z);
    road(lane,z,lane,z+1);
  }
  const ridges = Array.from({length:index===1?4:7},(_,n)=>({
    x:2+roll(width-4),z:2+roll(depth-4),radius:2+roll(3),height:1+roll(n<3?3:2)
  }));
  for(let z=0;z<depth;z++)for(let x=0;x<width;x++){
    const cell = cells[id(x,z)];
    if(cell.links){cell.material=2;continue}
    const apronDistance = Math.max(0,x-4)+Math.max(0,14-z);
    const routeDistance = Math.min(...routes.map(([a,b])=>Math.abs(x-a)+Math.abs(z-b)));
    const ridge = Math.max(0,...ridges.map(r=>{
      const dx=Math.abs(x-r.x),dz=Math.abs(z-r.z);
      const distance=index===1?Math.max(dx,dz):dx+dz;
      return r.height-Math.max(0,distance-r.radius+1);
    }));
    cell.level = Math.min(ridge,routeDistance,apronDistance);
    cell.material = Number(cell.level>0||roll(8)<2);
  }
  const cover = {};
  const placed = [];
  for(const [key,type] of Object.entries(window.IRON_VOW_THEATERS[index].cover)){
    const [a,b] = key.split(',').map(Number);
    for(let attempt=0;attempt<10;attempt++){
      const x=a+roll(7)-3,z=b+roll(7)-3,next=x+','+z;
      if(!inside(x,z)||reserved(x,z)||cells[id(x,z)].links||cover[next])continue;
      cover[next]=type;placed.push(next);break;
    }
  }
  function connected(){
    const seen = new Set([id(0,depth-1)]), queue = [[0,depth-1]];
    for(const [x,z] of queue)for(const [dx,dz] of steps){
      const a=x+dx,b=z+dz,k=id(a,b);
      if(!inside(a,b)||seen.has(k)||cover[a+','+b])continue;
      seen.add(k);queue.push([a,b]);
    }
    return seen.size+placed.length===cells.length;
  }
  while(!connected())delete cover[placed.pop()];
  return {cells,cover};
};
