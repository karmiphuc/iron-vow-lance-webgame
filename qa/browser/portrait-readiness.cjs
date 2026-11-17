module.exports=async function waitForLivePortraits(page,selector,count){
 await page.waitForFunction(({selector,count})=>{
  const images=[...document.querySelectorAll(selector)];
  for(const image of images)image.loading='eager';
  return images.length>0&&(count==null||images.length===count)&&images.every(image=>
   image.complete&&image.naturalWidth===640&&image.naturalHeight===640);
 },{selector,count},{timeout:120000});
 return page.locator(selector);
};
