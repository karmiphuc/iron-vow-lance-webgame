/* Read-only bridge from a validated career save to the Phase 4 hangar. */
(function(root){
'use strict';
function fromCareer(career,{catalog,aux}={}){
 if(!catalog||typeof catalog.supports!=='function')throw Error('A hangar catalog with supports(frame) is required');
 if(!career||!Array.isArray(career.units)||career.units.length!==3)throw Error('A career with three active units is required');
 const stored=career.reserve??{};
 if(!stored||typeof stored!=='object'||Array.isArray(stored))throw Error('Invalid reserve hulls');
 const dropLevel=career.ship?.levels?.drop??0,seatCount=dropLevel===2?4:3;
 const unsupported=new Set(),assigned=new Set();
 function entry(hull,frame,id){
  if(!hull||typeof hull!=='object'||!Number.isInteger(frame)||frame<0||!Number.isFinite(hull.condition)||hull.condition<0||hull.condition>100)throw Error('Invalid hangar hull: '+id);
  if(assigned.has(frame))throw Error('Duplicate hangar frame: '+frame);
  assigned.add(frame);
  const canRender=Boolean(catalog.supports(frame));if(!canRender)unsupported.add(frame);
  const {weapon,melee,shoulder,shield,paint,trim,upgrade}=hull;
  return {id,frame,weapon,melee,shoulder,shield,paint,trim:trim==null?trim:{...trim},condition:hull.condition/100,upgrade,canRender};
 }
 const active=career.units.map((hull,slot)=>entry(hull,hull?.frame??slot,'seat:'+slot));
 if(aux!=null){
  if(dropLevel!==2||!Number.isInteger(aux.frame)||typeof aux.pilotId!=='string'||!Object.hasOwn(career.reservePilots??{},aux.pilotId)||!Object.hasOwn(stored,aux.frame)||!(stored[aux.frame]?.condition>=30))throw Error('Invalid auxiliary hangar assignment');
  active.push(entry(stored[aux.frame],aux.frame,'seat:3'));
 }
 const reserve=Object.entries(stored).filter(([key])=>aux==null||key!==String(aux.frame)).map(([key,hull])=>{
  const frame=Number(key);if(!Number.isInteger(frame)||frame<0||String(frame)!==key)throw Error('Invalid reserve frame: '+key);
  return entry(hull,frame,'reserve:'+key);
 });
 return {active,reserve,seatCount,unsupportedFrames:[...unsupported].sort((a,b)=>a-b)};
}
root.IronVowHangarRoster={fromCareer};
})(typeof window==='undefined'?globalThis:window);
