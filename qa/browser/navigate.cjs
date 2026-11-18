// Navigate through the same controls available to a player; never alter game state.
module.exports=async function navigate(page,view,tap,mobile=false){
 tap??=(selector=>mobile?page.locator(selector).tap():page.locator(selector).click());
 const primary=name=>tap(`#nav [data-primary="${name}"]`);
 if(view==='journal')return tap('#field-journal');
 if(view==='overworld'||view==='bridge')return primary('bridge');
 if(view==='ship'){await primary('bridge');return tap('[data-page="ship"]');}
 if(view==='contracts'){
  await primary('bridge');
  const port=await page.evaluate(()=>companyPort());
  const contracts=page.locator(`[data-chart-contracts="${port}"]`);
  if(!await contracts.count())await tap(`[data-overworld-port="${port}"]`);
  return tap(`[data-chart-contracts="${port}"]`);
 }
 if(view==='mech-bay'||view==='hangar'||view==='workshop'){
  await primary('bay');
  if(view==='hangar')return tap('[data-hangar-deck="base"]');
  if(view==='workshop')return tap('.command-deck [data-page="workshop"]');
  return;
 }
 if(['pilots','company','inn','career'].includes(view)){
  await primary('company');
  if(view==='inn'||view==='career')return tap(`[data-page="${view}"]`);
  return;
 }
 throw Error(`Unknown navigation destination: ${view}`);
};
