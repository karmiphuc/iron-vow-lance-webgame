// Deterministic map and operating costs shared by the career and its UI.
window.IronVowOverworld=(()=>{
 const PORTS=Object.freeze([
  Object.freeze({id:'picket',name:'Karst Anchorage',region:'Picket',x:15,y:67}),
  Object.freeze({id:'relay',name:'Relay Station',region:'Relay',x:38,y:32}),
  Object.freeze({id:'corridor',name:'Vanta Shipyards',region:'Corridor',x:63,y:57}),
  Object.freeze({id:'frontier',name:'Halcyon Outpost',region:'Frontier',x:85,y:27})
 ]);
 const ROUTES=Object.freeze([
  Object.freeze({from:'picket',to:'relay',days:1,fuel:120}),
  Object.freeze({from:'relay',to:'corridor',days:1,fuel:180}),
  Object.freeze({from:'corridor',to:'frontier',days:2,fuel:260}),
  Object.freeze({from:'picket',to:'corridor',days:1,fuel:850})
 ]);
 const knownPort=id=>PORTS.some(port=>port.id===id);
 function operatingRates(career){
  const units=career.units??[],reservePilots=Object.values(career.reservePilots??{}),reserveHulls=Object.values(career.reserve??{});
  const wages=[...units,...reservePilots].reduce((sum,pilot)=>sum+70+10*(pilot.level-1),0);
  const hulls=units.reduce((sum,hull)=>sum+35+10*hull.upgrade,0)+reserveHulls.reduce((sum,hull)=>sum+15+5*hull.upgrade,0);
  const ship=75+20*Object.values(career.ship?.levels??{}).reduce((sum,level)=>sum+level,0);
  return{wages,ship,hulls,total:wages+ship+hulls};
 }
 function travelQuote(from,to,rates){
  const route=ROUTES.find(route=>route.from===from&&route.to===to||route.from===to&&route.to===from);
  if(!route)return null;
  const {days,fuel}=route,wages=rates.wages*days,ship=rates.ship*days,hulls=rates.hulls*days;
  return{days,fuel,wages,ship,hulls,total:fuel+wages+ship+hulls};
 }
 // Enumerate each simple route once, in the stable order of ROUTES.
 function routeOptions(from,to){
  if(!knownPort(from)||!knownPort(to)||from===to)return [];
  const paths=[];
  function visit(port,path){
   if(port===to){paths.push(path);return;}
   for(const route of ROUTES){
    const next=route.from===port?route.to:route.to===port?route.from:null;
    if(next&&!path.includes(next))visit(next,[...path,next]);
   }
  }
  visit(from,[from]);
  return paths;
 }
 function itineraryQuote(path,rates,credits,arrears=0){
  if(!Array.isArray(path)||path.length<2||new Set(path).size!==path.length||
   !path.every(knownPort)||!record(rates)||!['wages','ship','hulls'].every(key=>nonnegative(rates[key]))||
   !Number.isFinite(credits)||credits<0||!nonnegative(arrears))return null;
  let days=0,fuel=0;
  for(let i=1;i<path.length;i++){
   const leg=travelQuote(path[i-1],path[i],rates);
   if(!leg)return null;
   days+=leg.days;fuel+=leg.fuel;
  }
  const wages=rates.wages*days,ship=rates.ship*days,hulls=rates.hulls*days,total=fuel+wages+ship+hulls;
  if(![days,fuel,wages,ship,hulls,total].every(nonnegative))return null;
  return Object.freeze({path:Object.freeze([...path]),days,fuel,wages,ship,hulls,total,cashAfterArrival:credits-total,arrears});
 }
 // All hulls and pilots are aboard during transit. Return copies for preview or
 // a single application after the entire itinerary has been validated.
 function travelRest(career,days){
  if(!record(career)||!nonnegative(days))return null;
  const repair=career.ship?.levels?.repair??0,crew=career.ship?.levels?.crew??0;
  const service=hull=>({...hull,condition:Math.min(100,hull.condition+repair*12*days)});
  const units=(career.units??[]).map(service);
  const reserve=Object.fromEntries(Object.entries(career.reserve??{}).map(([id,hull])=>[id,service(hull)]));
  const wounds=Object.fromEntries(Object.entries(career.wounds??{}).flatMap(([id,remaining])=>{
   const rest=remaining-days*(crew?2:1);
   return rest>0?[[id,rest]]:[];
  }));
  return{units,reserve,wounds};
 }
 function settleExpenses(credits,arrears,expense){
  const paid=Math.min(Math.floor(credits),expense),remaining=credits-paid,arrearsPaid=Math.min(Math.floor(remaining),arrears);
  const debt=arrears-arrearsPaid,unpaid=expense-paid;
  return{credits:remaining-arrearsPaid,arrears:debt+Math.min(unpaid,Number.MAX_SAFE_INTEGER-debt),paid,arrearsPaid};
 }
 const nonnegative=value=>Number.isSafeInteger(value)&&value>=0;
 const positive=value=>Number.isSafeInteger(value)&&value>0;
 const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 function validState(state){
  if(!record(state)||!knownPort(state.port)||!nonnegative(state.arrears))return false;
  if(state.lastExpense===undefined)return true;
  const expense=state.lastExpense;
  if(!record(expense)||!['travel','sortie'].includes(expense.kind)||!positive(expense.day)||!positive(expense.days)||
   !['fuel','wages','ship','hulls','total','paid','arrearsPaid'].every(key=>nonnegative(expense[key])))return false;
  if(expense.total!==expense.fuel+expense.wages+expense.ship+expense.hulls||expense.paid>expense.total)return false;
  return expense.kind==='travel'
   ?expense.destination===state.port&&expense.paid===expense.total&&expense.arrearsPaid===0
   :expense.days===1&&expense.fuel===0&&expense.destination===undefined;
 }
 return{PORTS,ROUTES,operatingRates,travelQuote,routeOptions,itineraryQuote,travelRest,settleExpenses,validState};
})();
