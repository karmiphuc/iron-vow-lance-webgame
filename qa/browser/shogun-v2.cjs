const breach=require('./gatecrasher-v2.cjs');
module.exports=async function checkShogunV2(context){return breach({...context,frame:20});};
