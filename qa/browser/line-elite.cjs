const {checkInfantry}=require('./line-infantry-common.cjs');

module.exports=async function checkLineElite(context){
 return checkInfantry(context,{contract:2,frame:14,name:'LINE INFANTRY ELITE',turns:2,proof:process.env.IRON_VOW_ELITE_PROOF});
};
