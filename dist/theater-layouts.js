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

// Fixed tactical geography for the three distress calls. The sortie seed only
// varies surface wear, so the promised flanking routes survive every dispatch.
window.IRON_VOW_DISTRESS_MAPS = {
  crossing: {
    label:'SABLE CUT / RAIL VIADUCT', allies:[[8,3],[10,4],[5,9]], goal:[[7,17],[8,17],[9,17]],
    roads:[[[8,1],[8,17]],[[9,4],[9,15]],[[3,5],[3,15],[8,15]],[[3,7],[8,7]],[[1,17],[12,17]]],
    obstacles:{
      'ridge-rock':[[0,11],[1,11],[5,11],[6,11],[11,11],[12,11],[13,11],[14,11],[15,11],[16,11],[17,11],[1,6],[14,4],[13,16]],
      'relay-shield':[[7,3],[10,5],[5,10],[4,10],[4,13],[7,13],[10,14]],
      'conifer':[[2,7],[2,13],[5,14],[14,13],[15,15]], 'transformer':[[11,6],[11,16]]
    }
  },
  lift: {
    label:'CINDER EXCHANGE / FREIGHT LIFT', allies:[[8,12],[5,7],[6,8]], goal:[[8,12],[9,12],[8,13],[9,13]],
    roads:[[[1,16],[9,16],[9,14]],[[4,5],[4,9],[8,9],[8,13]],[[12,2],[12,13],[9,13]],[[5,11],[13,11]]],
    obstacles:{
      'cargo':[[5,6],[5,8],[6,7],[3,10],[4,10],[11,10],[13,10],[8,14],[13,14],[14,14],[14,6],[15,6],[5,15]],
      'transformer':[[7,12],[10,12],[10,5],[11,5],[15,12],[2,5]],
      'relay-shield':[[7,6],[9,8],[7,14],[12,15]]
    }
  },
  quarry: {
    label:'MOTH QUARRY / TERRACED HAUL ROAD', allies:[[8,9],[9,10],[8,11]], goal:[],
    roads:[[[2,17],[6,17],[6,13],[10,13]],[[16,7],[13,7],[13,10],[10,10]],[[4,3],[4,8],[7,8],[7,11]]],
    obstacles:{
      'ridge-rock':[[8,8],[9,9],[8,12],[6,7],[6,9],[12,7],[14,8],[11,12],[11,13],[4,12],[4,13],[3,11],[15,15],[14,16],[9,4],[11,3],[16,6]],
      'cargo':[[3,15],[7,15],[14,9]],'transformer':[[5,13],[12,9]],
      'conifer':[[2,5],[2,6],[15,2],[16,3],[13,17]]
    }
  }
};
window.ironVowDistressTerrain = function(key, seed, {width,depth}, deployment){
  const plan=window.IRON_VOW_DISTRESS_MAPS[key];
  const cellAt=(x,z)=>cells[z*width+x];
  const cells=Array.from({length:width*depth},(_,i)=>{
    const x=i%width,z=Math.floor(i/width);
    let level=0;
    if(key==='crossing'){
      // A sunken cutting splits the two banks. Track and western service
      // crossing carry the raised grade across it.
      const crossing=(x>=7&&x<=10)||(x>=2&&x<=4);
      level=crossing||z<10||z>12?1:0;
      if(x>=12&&z<=6)level=2;
      // Stone firing shelves on opposite sides of the cut.
      if((x===6&&z===10)||(x===10&&z===12))level=1;
      if((x===6&&z===9)||(x===10&&z===13))level=2;
    }else if(key==='lift'){
      if(x>=2&&x<=8&&z>=4&&z<=9)level=1;
      if(x>=3&&x<=7&&z>=5&&z<=8)level=2;
      if(x>=13&&z<=6)level=1;
    }else{
      const rim=Math.max(Math.abs(x-8)-3,Math.abs(z-10)-3);
      level=Math.max(0,Math.min(3,rim));
    }
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return {level,material:Number(level>0),variant:seed>>>30,links:0};
  });
  const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
  for(const route of plan.roads)for(let i=1;i<route.length;i++){
    let [x,z]=route[i-1];
    const [ex,ez]=route[i],dx=Math.sign(ex-x),dz=Math.sign(ez-z);
    const dir=dirs.findIndex(pair=>pair[0]===dx&&pair[1]===dz);
    while(x!==ex||z!==ez){
      const from=cellAt(x,z),to=cellAt(x+dx,z+dz);
      from.links|=1<<dir;to.links|=1<<((dir+2)%4);
      from.material=to.material=2;x+=dx;z+=dz;
    }
  }
  const open=new Set([...deployment,...plan.goal,...plan.allies].map(tile=>tile.join(',')));
  const cover={};
  for(const [type,tiles] of Object.entries(plan.obstacles))for(const tile of tiles){
    const id=tile.join(',');
    if(!open.has(id))cover[id]=type;
  }
  // Growth along the outside berms changes the side approaches while leaving
  // both advertised routes and each allied starting position intact.
  const edgeTrees=[[1,1],[4,1],[7,0],[11,1],[14,0],[17,4],[17,7],[17,13],[16,18],[13,19],[11,18],[1,12],[0,6]];
  for(const [x,z] of edgeTrees){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const id=x+','+z;
    if((seed>>>31)&&!open.has(id)&&!cover[id]&&!cellAt(x,z).links)cover[id]='conifer';
  }
  return {cells,cover,label:plan.label};
};
