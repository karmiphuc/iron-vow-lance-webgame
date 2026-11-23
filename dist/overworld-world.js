// Pure, deterministic world data. Integrators decide when effects enter a career.
window.IronVowWorld=(()=>{
 const PORTS=Object.freeze([
  Object.freeze({id:'picket',name:'Karst Anchorage',x:15,y:67}),
  Object.freeze({id:'relay',name:'Relay Station',x:38,y:32}),
  Object.freeze({id:'corridor',name:'Vanta Shipyards',x:63,y:57}),
  Object.freeze({id:'frontier',name:'Halcyon Outpost',x:85,y:27}),
  Object.freeze({id:'ridge',name:'Ridge Mast',x:35,y:75}),
  Object.freeze({id:'haven',name:'Haven Reach',x:72,y:80})
 ]);
 const ROUTES=Object.freeze([
  ['picket','relay',1,120],['relay','corridor',1,180],['corridor','frontier',2,260],['picket','corridor',1,850],
  ['picket','ridge',1,140],['ridge','haven',2,220],['haven','corridor',1,150],['haven','frontier',2,240]
 ].map(([from,to,days,fuel])=>Object.freeze({from,to,days,fuel})));
 const ids=PORTS.map(port=>port.id),known=id=>ids.includes(id);
 const edge=(from,to)=>ROUTES.find(r=>r.from===from&&r.to===to||r.from===to&&r.to===from);
 const integer=n=>Number.isSafeInteger(n)&&n>=0;
 const record=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
 const keys=(o,allowed)=>Object.keys(o).every(k=>allowed.includes(k));
 // FNV-1a over explicit inputs; no mutable PRNG or clock dependency.
 function hash(...parts){
  let n=2166136261;
  for(const c of parts.join('|')){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}
  return n>>>0;
 }
 const period=day=>Math.floor((day-1)/4)*4+1;
 function offer(seed,port,postedDay,slot,featuredTemplate){
  const h=hash(seed,port,postedDay,slot);
  const base=port==='picket'&&postedDay===1?0:hash(seed,port,postedDay,'template')%4;
  return {id:`offer:${port}:${postedDay}:${slot}`,templateIndex:featuredTemplate??(base+slot)%4,port,postedDay,expiryDay:Math.min(Number.MAX_SAFE_INTEGER,postedDay+3),
   payPercent:90+(h>>>4)%21,intel:{minMechs:1+(h>>>9)%2,maxMechs:3+(h>>>11)%2}};
 }
 function pool(seed,day){
  const postedDay=period(day),result=[];
  const counts=ids.map(port=>port==='picket'&&postedDay===1?1+hash(seed,port,postedDay,'count')%3:hash(seed,port,postedDay,'count')%4);
  if(counts.every(count=>count===0))counts[0]=1;
  ids.forEach((port,i)=>{for(let slot=0;slot<counts[i];slot++)result.push(offer(seed,port,postedDay,slot));});
  // Salt Works reserves Vanta's fourth slot. Existing offer IDs stay stable across upgrades.
  result.push(offer(seed,'corridor',postedDay,3,4));
  return result;
 }
 function validWorld(w){
  if(!record(w)||!keys(w,['version','seed','day','consumed','scouted','pendingEvents','resolvedEvents','standings'])||w.version!==1||
   !integer(w.seed)||w.seed>0xffffffff||!integer(w.day)||w.day<1||
   !Array.isArray(w.consumed)||!Array.isArray(w.scouted)||!Array.isArray(w.pendingEvents)||w.pendingEvents.length>PORTS.length-1||!Array.isArray(w.resolvedEvents)||w.resolvedEvents.length>10000||!record(w.standings)||
   !keys(w.standings,ids)||!Object.values(w.standings).every(n=>Number.isInteger(n)&&n>=-100&&n<=100))return false;
  const offered=new Set(pool(w.seed,w.day).map(o=>o.id));
  return new Set(w.consumed).size===w.consumed.length&&w.consumed.every(id=>offered.has(id))&&
   new Set(w.scouted).size===w.scouted.length&&w.scouted.every(id=>offered.has(id)&&!w.consumed.includes(id))&&
   new Set(w.pendingEvents).size===w.pendingEvents.length&&w.pendingEvents.every(id=>eventFromId(w.seed,id,w.day)!==null&&!w.resolvedEvents.includes(id))&&
   new Set(w.resolvedEvents).size===w.resolvedEvents.length&&w.resolvedEvents.every(id=>eventFromId(w.seed,id,w.day)?.day===w.day);
 }
 const validOptionalWorld=w=>w===undefined||validWorld(w);
 function createWorld(seed,day){
  const world={version:1,seed,day,consumed:[],scouted:[],pendingEvents:[],resolvedEvents:[],standings:{}};
  return validWorld(world)?world:null;
 }
 function advanceWorld(world,day){
  if(!validWorld(world)||!integer(day)||day<world.day)return null;
  return {...world,day,consumed:period(day)===period(world.day)?[...world.consumed]:[],scouted:period(day)===period(world.day)?[...world.scouted]:[],pendingEvents:[...world.pendingEvents],
   resolvedEvents:day===world.day?[...world.resolvedEvents]:[],standings:{...world.standings}};
 }
 // Arrival forecast only shows currently known offers, not unknown future postings.
 function offersAt(world,port,arrivalDay=world?.day){
  if(!validWorld(world)||!known(port)||!integer(arrivalDay)||arrivalDay<world.day)return null;
  return pool(world.seed,world.day).filter(o=>o.port===port&&!world.consumed.includes(o.id))
   .map(o=>({...o,intel:{...o.intel},scouted:world.scouted.includes(o.id),availableOnArrival:arrivalDay<=o.expiryDay}));
 }
 function scoutOffer(world,id){
  if(!validWorld(world)||!pool(world.seed,world.day).some(o=>o.id===id)||world.consumed.includes(id)||world.scouted.includes(id))return null;
  return {...world,scouted:[...world.scouted,id],consumed:[...world.consumed],pendingEvents:[...world.pendingEvents],resolvedEvents:[...world.resolvedEvents],standings:{...world.standings}};
 }
 function consumeOffer(world,id){
  if(!validWorld(world)||!pool(world.seed,world.day).some(o=>o.id===id)||world.consumed.includes(id))return null;
  return {...world,consumed:[...world.consumed,id],scouted:world.scouted.filter(offerId=>offerId!==id),pendingEvents:[...world.pendingEvents],resolvedEvents:[...world.resolvedEvents],standings:{...world.standings}};
 }
 function markersFor(seed,day){
  return ['storm','patrol'].map((kind,i)=>{
   const route=ROUTES[(hash(seed,kind)%ROUTES.length+(day%ROUTES.length)*(i+1))%ROUTES.length];
   let idHash=0;
   for(const c of kind)idHash=(Math.imul(idHash,31)+c.charCodeAt(0))>>>0;
   const fraction=.2+(((day%61)*17+idHash%41)%61)/100;
   const from=PORTS.find(port=>port.id===route.from),to=PORTS.find(port=>port.id===route.to);
   const x=(from.x+(to.x-from.x)*fraction)/100,y=(from.y+(to.y-from.y)*fraction)/100;
   return {id:kind,kind,from:route.from,to:route.to,day,fraction,x,y};
  });
 }
 function markersAt(world,day=world?.day){
  if(!validWorld(world)||!integer(day)||day<world.day)return null;
  return markersFor(world.seed,day);
 }
 const MARKET={
  picket:{faction:'Karst Wardens',frames:[0,1,2],weapons:['rifle','sidewinder','trident','cleaver']},
  relay:{faction:'Relay Union',frames:[1,5,9],weapons:['watchman','rail','parallax','tonfa']},
  corridor:{faction:'Vanta Combine',frames:[6,7,8,22],weapons:['rampart','forge','piledriver','pike','salt-mg']},
  frontier:{faction:'Halcyon Guard',frames:[5,7,10],weapons:['cerberus','obelisk','anchor-hammer','rivet']},
  ridge:{faction:'Ridge Freeholders',frames:[0,3,8],weapons:['shotgun','breaker','falcon','blade']},
  haven:{faction:'Haven Salvors',frames:[2,4,9],weapons:['missile','hailstorm','ember','hatchet']}
 };
 function portProfile(seed,port){
  if(!integer(seed)||seed>0xffffffff||!known(port))return null;
  const h=hash(seed,port,'market');
  return {port,faction:MARKET[port].faction,frames:[...MARKET[port].frames],weapons:[...MARKET[port].weapons],
   repairPercent:85+(h>>>8)%31};
 }
 function setStanding(world,port,value){
  if(!validWorld(world)||!known(port)||!Number.isInteger(value)||value< -100||value>100)return null;
  return {...world,consumed:[...world.consumed],scouted:[...world.scouted],pendingEvents:[...world.pendingEvents],resolvedEvents:[...world.resolvedEvents],standings:{...world.standings,[port]:value}};
 }
 const EVENTS=[
  {kind:'distress',choices:[{id:'help',credits:-150,hullCondition:0,delayDays:0,rep:2},{id:'pass',credits:0,hullCondition:0,delayDays:0,rep:0}]},
  {kind:'salvage',choices:[{id:'recover',credits:250,hullCondition:-5,delayDays:0,rep:0},{id:'leave',credits:0,hullCondition:0,delayDays:0,rep:0}]},
  {kind:'toll',choices:[{id:'pay',credits:-200,hullCondition:0,delayDays:0,rep:1},{id:'detour',credits:0,hullCondition:0,delayDays:1,rep:0}]},
  {kind:'weather',choices:[{id:'supplies',credits:-180,hullCondition:0,delayDays:0,rep:0},{id:'brace',credits:0,hullCondition:-5,delayDays:0,rep:0},{id:'wait',credits:0,hullCondition:0,delayDays:1,rep:0}]},
  {kind:'patrol',choices:[{id:'bribe',credits:-200,hullCondition:0,delayDays:0,rep:0},{id:'run',credits:0,hullCondition:-5,delayDays:0,rep:0},{id:'detour',credits:0,hullCondition:0,delayDays:1,rep:0}]}
 ];
 function eventFromId(seed,id,maxDay){
  if(typeof id!=='string')return null;
  const m=/^event:(\d+):(\d+):(\d+):([a-z]+):([a-z]+)$/.exec(id);
  if(!m)return null;
  const day=Number(m[1]),legDay=Number(m[2]),index=Number(m[3]),from=m[4],to=m[5];
  if(!integer(day)||day<1||day>maxDay||!integer(legDay)||legDay<day||!integer(index)||index>=PORTS.length-1||!edge(from,to)||
   String(day)!==m[1]||String(legDay)!==m[2]||String(index)!==m[3]||hash(seed,day,legDay,index,from,to,'incident')%3!==0)return null;
  const hazards=markersFor(seed,legDay).filter(marker=>marker.from===from&&marker.to===to||marker.from===to&&marker.to===from);
  const kind=hazards.some(marker=>marker.kind==='storm')?'weather':hazards.some(marker=>marker.kind==='patrol')?'patrol':null;
  const e=kind?EVENTS.find(event=>event.kind===kind):EVENTS[hash(seed,day,legDay,index,from,to,'kind')%3];
  return {id,day,legDay,from,to,kind:e.kind,choices:e.choices.map(choice=>({...choice}))};
 }
 function transitEvents(world,path,departureDay=world?.day){
  if(!validWorld(world)||!Array.isArray(path)||path.length<2||path.length>PORTS.length||new Set(path).size!==path.length||
   !path.every(known)||!integer(departureDay)||departureDay<world.day)return null;
  const result=[];let legDay=departureDay;
  for(let i=1;i<path.length;i++){
   const leg=edge(path[i-1],path[i]);
   if(!leg)return null;
   const id=`event:${departureDay}:${legDay}:${i-1}:${path[i-1]}:${path[i]}`;
   const event=eventFromId(world.seed,id,departureDay);
   if(event&&!world.resolvedEvents.includes(id))result.push(event);
   if(i<path.length-1){legDay+=leg.days;if(!integer(legDay))return null;}
  }
  return result;
 }
 function queueTransitEvents(world,path){
  if(!validWorld(world)||world.pendingEvents.length)return null;
  const events=transitEvents(world,path);
  if(!events)return null;
  return {...world,consumed:[...world.consumed],scouted:[...world.scouted],pendingEvents:events.map(e=>e.id),resolvedEvents:[...world.resolvedEvents],standings:{...world.standings}};
 }
 function pendingEvents(world){
  return validWorld(world)?world.pendingEvents.map(id=>eventFromId(world.seed,id,world.day)):null;
 }
 // Caller applies the returned effect once, atomically with storing returned world.
 function resolveEvent(world,id,choiceId){
  if(!validWorld(world)||!world.pendingEvents.includes(id)||world.resolvedEvents.length>=10000)return null;
  const event=eventFromId(world.seed,id,world.day),choice=event?.choices.find(c=>c.id===choiceId);
  if(!choice)return null;
  const resolvedEvents=event.day===world.day?[...world.resolvedEvents,id]:[...world.resolvedEvents];
  return {world:{...world,consumed:[...world.consumed],scouted:[...world.scouted],pendingEvents:world.pendingEvents.filter(pending=>pending!==id),resolvedEvents,standings:{...world.standings}},
   choiceId,effect:{credits:choice.credits,hullCondition:choice.hullCondition,delayDays:choice.delayDays,rep:choice.rep,port:event.to}};
 }
 return {PORTS,ROUTES,createWorld,validWorld,validOptionalWorld,advanceWorld,offersAt,scoutOffer,consumeOffer,markersAt,portProfile,setStanding,transitEvents,queueTransitEvents,pendingEvents,resolveEvent};
})();
