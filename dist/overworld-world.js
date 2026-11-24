// Pure, deterministic world data. Integrators decide when effects enter a career.
window.IronVowWorld=(()=>{
 const PORTS=Object.freeze([
  Object.freeze({id:'picket',name:'Karst Anchorage',x:15,y:67}),
  Object.freeze({id:'relay',name:'Relay Station',x:38,y:32}),
  Object.freeze({id:'corridor',name:'Vanta Shipyards',x:63,y:57}),
  Object.freeze({id:'frontier',name:'Halcyon Outpost',x:85,y:27}),
  Object.freeze({id:'ridge',name:'Ridge Mast',x:35,y:75}),
  Object.freeze({id:'haven',name:'Haven Reach',x:72,y:80}),
  Object.freeze({id:'cinder',name:'Cinder Junction',x:13,y:40,region:'North Divide',role:'Freight exchange'}),
  Object.freeze({id:'glass',name:'Glasswatch',x:25,y:17,region:'North Divide',role:'Signals post',intel:true}),
  Object.freeze({id:'iron',name:'Iron Pass',x:57,y:16,region:'North Divide',role:'Forward staging',launchAP:1}),
  Object.freeze({id:'brine',name:'Brine Causeway',x:25,y:91,region:'Salt March',role:'Road transfer'}),
  Object.freeze({id:'mercy',name:'Mercy Yard',x:54,y:88,region:'Salt March',role:'Repair depot',repairCap:75}),
  Object.freeze({id:'black',name:'Black Basin',x:88,y:64,region:'Salt March',role:'Forward staging',launchAP:1})
 ]);
 const ROUTES=Object.freeze([
  ['picket','relay',1,120],['relay','corridor',1,180],['corridor','frontier',2,260],['picket','corridor',1,850],
  ['picket','ridge',1,140],['ridge','haven',2,220],['haven','corridor',1,150],['haven','frontier',2,240],
  ['picket','cinder',1,160],['cinder','glass',1,130],['glass','iron',1,165],['iron','relay',2,180],['iron','frontier',2,250],
  ['ridge','brine',1,110,true],['brine','mercy',1,155,true],['mercy','haven',1,170],['mercy','black',1,210,true],['black','frontier',1,235]
 ].map(([from,to,days,fuel,road])=>Object.freeze({from,to,days,fuel,road:!!road})));
 const originalRoutes=ROUTES.slice(0,8),outerRoutes=ROUTES.slice(8);
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
 const PRESSURES=[
  {port:'relay',name:'Relay blockade',from:'relay',to:'corridor',cost:550},
  {port:'ridge',name:'Ridge freight seizure',from:'picket',to:'ridge',cost:450},
  {port:'haven',name:'Haven junction embargo',from:'haven',to:'frontier',cost:650}
 ];
 const REWARDS={
  picket:{credits:650,label:'650 CR supply bonus',window:3},
  relay:{xp:40,label:'+40 XP per deployed pilot',window:1},
  corridor:{gear:'forge',label:'Forge SG-12',window:2},
  frontier:{xp:60,label:'+60 XP per deployed pilot',window:2},
  ridge:{gear:'pike',label:'Pilum Pike',window:1},
  haven:{repair:20,label:'+20% integrity to each assigned hull',window:2},
  cinder:{standing:2,label:'+2 extra local standing',window:2},
  glass:{xp:50,label:'+50 XP per deployed pilot',window:3},
  iron:{gear:'falcon',label:'Falcon AC-7',window:3},
  brine:{credits:780,label:'780 CR cargo recovery bonus',window:3},
  mercy:{repair:25,label:'+25% integrity to each assigned hull',window:3},
  black:{gear:'cerberus',label:'Cerberus RP-6',window:3}
 };
 // Each counter has an opportunity window followed by a persistent consequence.
 const CAMPAIGN_FRONTS=[
  {id:'signals',name:'Blind the Divide',port:'glass',alternate:'cinder',opens:0,deadline:5,
   effect:'Glasswatch loses free hostile intel until its jammer is taken offline.'},
  {id:'armor',name:'Foundry Mobilization',port:'iron',alternate:'relay',opens:2,deadline:9,
   effect:'A Javelin reinforces each North Divide sortie until you stop the mobilization.'},
  {id:'air',name:'Salt March Air Wing',port:'black',alternate:'brine',opens:4,deadline:13,
   effect:'A Kite reinforces each Salt March sortie until you ground the wing.'}
 ];
 const CAMPAIGN_PROJECTS={
  signals:{name:'Signals network',cost:900,days:2,detail:'Opens an alternate counter railhead for each enemy operation and reveals exact enemy intel on all offer cards.'},
  workshop:{name:'Mobile overhaul',cost:750,days:3,detail:'Adds 8 integrity per day to every hull serviced during travel or a hold.'},
  ordnance:{name:'Reactor reserves',cost:1250,days:4,detail:'Grants +1 opening AP on contracts in both outer regions. Stacks with forward staging.'}
 };
 function startCampaign(day){return {start:day,projects:{},cleared:{}};}
 function validCampaign(campaign,day){
  if(campaign===undefined)return true;
  if(!record(campaign)||!keys(campaign,['start','projects','cleared','victory'])||
   !integer(campaign.start)||campaign.start<1||campaign.start>day||!record(campaign.projects)||!record(campaign.cleared))return false;
  const projects=Object.entries(campaign.projects);
  if(!projects.every(([id,finish])=>Object.hasOwn(CAMPAIGN_PROJECTS,id)&&integer(finish)&&finish>=campaign.start+CAMPAIGN_PROJECTS[id].days&&finish-CAMPAIGN_PROJECTS[id].days<=day))return false;
  const ordered=[...projects].sort((a,b)=>a[1]-CAMPAIGN_PROJECTS[a[0]].days-(b[1]-CAMPAIGN_PROJECTS[b[0]].days));
  if(ordered.some(([id,finish],i)=>i>0&&finish-CAMPAIGN_PROJECTS[id].days<ordered[i-1][1]))return false;
  if(!Object.entries(campaign.cleared).every(([id,date])=>{
   const front=CAMPAIGN_FRONTS.find(item=>item.id===id);
   return !!front&&integer(date)&&date>=campaign.start+front.opens&&date<=day;
  }))return false;
  return campaign.victory===undefined||(integer(campaign.victory)&&campaign.victory<=day&&
   CAMPAIGN_FRONTS.every(front=>integer(campaign.cleared[front.id])&&campaign.cleared[front.id]<campaign.victory));
 }
 const projectOnline=(campaign,id,day)=>campaign?.projects[id]!==undefined&&campaign.projects[id]<=day;
 function campaignReports(campaign,day){
  if(!campaign)return [];
  return CAMPAIGN_FRONTS.map(front=>{
   const opens=campaign.start+front.opens,deadline=campaign.start+front.deadline;
   const ports=[front.port,...(projectOnline(campaign,'signals',day)?[front.alternate]:[])];
   const status=campaign.cleared[front.id]!==undefined&&campaign.cleared[front.id]<=day?'secured':day<opens?'incoming':day>deadline?'active':'exposed';
   return {...front,opens,deadline,ports,status};
  });
 }
 function queueCampaignProject(campaign,id,day){
  const project=Object.hasOwn(CAMPAIGN_PROJECTS,id)?CAMPAIGN_PROJECTS[id]:null;
  if(!campaign||!project||Object.hasOwn(campaign.projects,id)||Object.values(campaign.projects).some(finish=>finish>day)||!integer(day+project.days))return null;
  return {...campaign,projects:{...campaign.projects,[id]:day+project.days}};
 }
 function campaignResult(campaign,port,day,finalOperation=false){
  if(!campaign||campaign.victory)return null;
  const reports=campaignReports(campaign,day);
  const final=finalOperation&&port==='corridor'&&reports.every(front=>front.status==='secured'&&campaign.cleared[front.id]<day);
  const front=reports.find(entry=>['exposed','active'].includes(entry.status)&&entry.ports.includes(port));
  if(final)return {campaign:{...campaign,victory:day},name:'Directorate depot secured',credits:5000};
  if(front)return {campaign:{...campaign,cleared:{...campaign.cleared,[front.id]:day}},name:front.name+' stopped',credits:0};
  return null;
 }
 function campaignSupport(campaign,port,day){
  const region=PORTS.find(site=>site.id===port)?.region;
  const front=region==='North Divide'?'armor':region==='Salt March'?'air':null;
  if(!front||!campaignReports(campaign,day).some(report=>report.status==='active'&&report.id===front))return null;
  return front==='armor'?'tank':'helicopter';
 }
 function regionalReward(offer,day,history){
  const reward=REWARDS[offer.port];
  if(!reward)return null;
  const until=offer.postedDay+reward.window;
  const claimed=history.some(entry=>entry.win&&entry.port===offer.port&&entry.offerId&&entry.day>=offer.postedDay&&entry.day<=until);
  return {...reward,until,available:!claimed&&day<=until,claimed};
 }
 function pressureFor(seed,start){
  return PRESSURES[start===1?0:hash(seed,start,'pressure')%PRESSURES.length];
 }
 function railPressure(world,history){
  const start=period(world.day);
  const stopped=(pressure,from)=>history.some(entry=>entry.win&&entry.offerId&&entry.port===pressure.port&&entry.day>=from&&entry.day<=from+3);
  const next=pressureFor(world.seed,start),prior=start>1?pressureFor(world.seed,start-4):null;
  return {next:stopped(next,start)?null:{...next,until:start+3},active:prior&&!stopped(prior,start-4)?{...prior,until:start+3}:null};
 }
 function railNetwork(world,history){
  const {active}=railPressure(world,history);
  const freight=freightToday(world);
  return {ports:PORTS,routes:ROUTES.map(route=>{
   const relief=[route.from,route.to].some(port=>(world.standings[port]??0)>=6);
   const toll=active&&edge(active.from,active.to)===route?active.cost:0;
   const shared=freight.from===route.from&&freight.to===route.to;
   const discount=Math.floor(route.fuel*(Number(relief)*.25+Number(shared)*.20));
   return {...route,fuel:route.fuel+toll-discount,toll,discount,shared,
    road:route.road||route.from==='ridge'&&route.to==='haven'||route.from==='haven'&&route.to==='corridor'};
  })};
 }
 function offer(seed,port,postedDay,slot,featuredTemplate){
  const h=hash(seed,port,postedDay,slot);
  const base=port==='picket'&&postedDay===1?0:hash(seed,port,postedDay,'template')%4;
  return {id:`offer:${port}:${postedDay}:${slot}`,templateIndex:featuredTemplate??(base+slot)%4,port,postedDay,expiryDay:Math.min(Number.MAX_SAFE_INTEGER,postedDay+3),
   payPercent:90+(h>>>4)%21,intel:{minMechs:1+(h>>>9)%2,maxMechs:3+(h>>>11)%2}};
 }
 function pool(seed,day){
  const postedDay=period(day),result=[];
  const counts=ids.map(port=>port==='picket'&&postedDay===1?1+hash(seed,port,postedDay,'count')%3:PORTS.find(site=>site.id===port).region?1+hash(seed,port,postedDay,'count')%2:hash(seed,port,postedDay,'count')%4);
  const response=ids.indexOf(pressureFor(seed,postedDay).port);
  counts[response]=Math.max(1,counts[response]);
  ids.forEach((port,i)=>{for(let slot=0;slot<counts[i];slot++)result.push(offer(seed,port,postedDay,slot));});
  // Salt Works reserves Vanta's fourth slot. Existing offer IDs stay stable across upgrades.
  result.push(offer(seed,'corridor',postedDay,3,4),
   offer(seed,'ridge',postedDay,3,5),offer(seed,'corridor',postedDay,4,6),offer(seed,'frontier',postedDay,3,7),
   offer(seed,'brine',postedDay,3,10));
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
 function blockades(world,history,day=world?.day){
  if(!world||day<5)return [];
  const rotation=period(day);
  return [['North Divide','armor'],['Salt March','air']].flatMap(([region,kind])=>{
   const stops=PORTS.filter(port=>port.region===region);
   const port=stops[(hash(world.seed,kind,'occupation')%stops.length+(rotation-5)/4)%stops.length].id;
   const id='occupation:'+kind+':'+rotation;
   return history.some(entry=>entry.win&&entry.occupation===id)?[]:[{id,port,kind}];
  });
 }
 function firstBlockade(world,history,path){
  if(!world)return null;
  let day=world.day;
  for(let i=1;i<path.length;i++){
   const leg=edge(path[i-1],path[i]);if(!leg)return null;
   day+=leg.days;
   const patrol=blockades(world,history,day).find(entry=>entry.port===path[i]);
   if(patrol)return {...patrol,day,path:path.slice(0,i+1)};
  }
  return null;
 }
 function freightToday(world){
  // Paired with a campaign-day fare, so the activity has a reason to be on the chart.
  const index=(hash(world.seed,'shared freight')%outerRoutes.length+world.day%outerRoutes.length)%outerRoutes.length;
  const {from,to}=outerRoutes[index];
  return {id:'freight',kind:'freight',from,to,day:world.day,fraction:.32+(world.day%5)*.09};
 }
 function markersFor(seed,day,routes=originalRoutes){
  return ['storm','patrol'].map((kind,i)=>{
   const route=routes[(hash(seed,kind)%routes.length+(day%routes.length)*(i+1))%routes.length];
   const id=routes===originalRoutes?kind:'outer-'+kind;
   let idHash=0;
   for(const c of id)idHash=(Math.imul(idHash,31)+c.charCodeAt(0))>>>0;
   const fraction=.2+(((day%61)*17+idHash%41)%61)/100;
   const from=PORTS.find(port=>port.id===route.from),to=PORTS.find(port=>port.id===route.to);
   const x=(from.x+(to.x-from.x)*fraction)/100,y=(from.y+(to.y-from.y)*fraction)/100;
   return {id,kind,from:route.from,to:route.to,day,fraction,x,y};
  });
 }
 function markersAt(world,day=world?.day){
  if(!validWorld(world)||!integer(day)||day<world.day)return null;
  return [...markersFor(world.seed,day),...markersFor(world.seed,day,outerRoutes)];
 }
 const MARKET={
  picket:{faction:'Karst Wardens',frames:[0,1,2],weapons:['rifle','sidewinder','trident','cleaver']},
  relay:{faction:'Relay Union',frames:[1,5,9],weapons:['watchman','rail','parallax','tonfa']},
  corridor:{faction:'Vanta Combine',frames:[6,7,8,22,25],weapons:['rampart','forge','piledriver','pike','salt-mg']},
  frontier:{faction:'Halcyon Guard',frames:[5,7,10,26],weapons:['cerberus','obelisk','anchor-hammer','rivet']},
  ridge:{faction:'Ridge Freeholders',frames:[0,3,8,24],weapons:['shotgun','breaker','falcon','blade']},
  haven:{faction:'Haven Salvors',frames:[2,4,9],weapons:['missile','hailstorm','ember','hatchet']},
  cinder:{faction:'Cinder Freight Guild',frames:[1,2],weapons:['sidewinder','hailstorm','rampart']},
  glass:{faction:'Glasswatch Signals',frames:[1,5],weapons:['watchman','rail','tonfa']},
  iron:{faction:'Iron Pass Garrison',frames:[3,8],weapons:['falcon','pike','breaker']},
  brine:{faction:'Causeway Haulers',frames:[2,7],weapons:['shotgun','missile','cleaver']},
  mercy:{faction:'Mercy Engineering',frames:[0,8],weapons:['trident','blade','piledriver']},
  black:{faction:'Basin Prospectors',frames:[6,7],weapons:['cerberus','obelisk','anchor-hammer']}
 };
 function portProfile(seed,port){
  if(!integer(seed)||seed>0xffffffff||!known(port))return null;
  const h=hash(seed,port,'market');
  const cap=PORTS.find(site=>site.id===port).repairCap??115;
  return {port,faction:MARKET[port].faction,frames:[...MARKET[port].frames],weapons:[...MARKET[port].weapons],
   repairPercent:Math.min(cap,85+(h>>>8)%31)};
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
  const hazards=markersFor(seed,legDay,originalRoutes.includes(edge(from,to))?originalRoutes:outerRoutes).filter(marker=>marker.from===from&&marker.to===to||marker.from===to&&marker.to===from);
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
 return {PORTS,ROUTES,createWorld,validWorld,validOptionalWorld,advanceWorld,offersAt,scoutOffer,consumeOffer,markersAt,portProfile,setStanding,regionalReward,railPressure,railNetwork,freightToday,blockades,firstBlockade,CAMPAIGN_PROJECTS,startCampaign,validCampaign,projectOnline,campaignReports,queueCampaignProject,campaignResult,campaignSupport,transitEvents,queueTransitEvents,pendingEvents,resolveEvent};
})();
