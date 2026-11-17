const {writeFileSync}=require('node:fs');
const {createCanvas,loadImage}=require('@napi-rs/canvas');

module.exports=async function saveWebp(page,path){
 const image=await loadImage(await page.screenshot());
 const canvas=createCanvas(image.width,image.height);
 canvas.getContext('2d').drawImage(image,0,0);
 writeFileSync(path,await canvas.encode('webp',86));
};
