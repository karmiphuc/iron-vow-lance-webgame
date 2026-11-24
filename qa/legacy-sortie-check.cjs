module.exports=function assertLegacySortie(assert,current,legacy,message){
 const {apRules,units,...metadata}=current;
 assert.equal(apRules,2);
 assert.deepEqual({...metadata,units:units.map(({attackAPSpent,moveBonus,apMastered,...unit})=>unit)},
  {...legacy,units:legacy.units.map(({actionPhase,extraStep,...unit})=>unit)},message);
};
