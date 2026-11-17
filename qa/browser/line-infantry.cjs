const {checkInfantry}=require('./line-infantry-common.cjs');

module.exports=async function checkLineInfantry(context){
 return checkInfantry(context,{contract:0,frame:13,name:'LINE INFANTRY',turns:1,proof:process.env.IRON_VOW_LI01_PROOF});
};
