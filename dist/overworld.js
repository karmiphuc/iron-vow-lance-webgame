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
 return{PORTS,ROUTES,operatingRates,travelQuote,settleExpenses,validState};
})();
