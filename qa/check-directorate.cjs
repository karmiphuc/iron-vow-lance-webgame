const assert=require('node:assert/strict');
const sim=require('./sim-harness.cjs')();

assert.equal(sim.run(`(()=>{
 const w=worldRules;
 let c=w.startCampaign(1);
 c=w.queueCampaignProject(c,'signals',1);
 if(w.queueCampaignProject(c,'ordnance',2)!==null||!w.validCampaign(c,1))return false;
 if(w.campaignResult(c,'relay',2)!==null||!w.campaignResult(c,'cinder',3))return false;
 if(w.campaignSupport(c,'glass',10)!==null||w.campaignSupport(c,'glass',11)!=='tank'||w.campaignSupport(c,'mercy',15)!=='helicopter')return false;
 for(const [port,day] of [['cinder',3],['relay',11],['brine',15]])c=w.campaignResult(c,port,day).campaign;
 if(w.campaignResult(c,'corridor',16)!==null||w.campaignSupport(c,'glass',16)!==null)return false;
 const final=w.campaignResult(c,'corridor',16,true);
 return final.credits===5000&&w.validCampaign(final.campaign,16)&&w.campaignResult(final.campaign,'corridor',16,true)===null;
})()`),true,'Campaign clocks, alternative counters, enemy support and one-time finale');
assert.equal(sim.run(`(()=>{
 save.day=11;save.world=worldRules.createWorld(42,11);save.strategy=worldRules.startCampaign(1);
 save.overworld={port:'glass',arrears:0};
 const offer=availableOffers('glass')[0],size=CONTRACTS[offer.templateIndex].seats??dispatchSizes()[offer.templateIndex];
 deploy(offer.templateIndex,false,LANCE_SLOTS.slice(0,size),null,null,offer);
 if(battle?.campaignSupport!=='tank')return false;
 const snapshot=JSON.stringify(captureSortie());battle=null;
 return Boolean(restoreSortie())&&JSON.stringify(captureSortie())===snapshot;
})()`),true,'A real north sortie and its arriving Javelin resume as the same battle');
assert.equal(sim.run(`(()=>{
 const career={day:1,strategy:{projects:{workshop:3}},units:[{condition:50}]};
 return overworld.travelRest(career,1).units[0].condition===50&&overworld.travelRest(career,3).units[0].condition===66;
})()`),true,'Workshop work starts paying off on its completion day');
console.log('PASS Directorate dates, counter paths, finale, travel engineering and extra vehicle checkpoint');
