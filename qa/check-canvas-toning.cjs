const assert=require('node:assert/strict');
const path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const create=require(path.join(root,'qa/sim-harness.cjs'));

function setup(){
 const sim=create(),surface=createCanvas(160,160),raw=surface.getContext('2d');
 const filterless=new Proxy(raw,{
  get(target,key){if(key==='filter')return 'none';const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value},
  set(target,key,value){if(key==='filter')return true;return Reflect.set(target,key,value,target)}
 });
 sim.sandbox.testContext=filterless;
 sim.sandbox.document.createElement=()=>createCanvas(1,1);
 sim.run('ctx=testContext;scale=25;project=()=>({x:80,y:100})');
 return {...sim,surface,raw};
}
{
 const {run,raw}=setup();
 run(`createBattle(0,false,false,[0]);globalThis.exhausted=current();exhausted.ap=0;exhausted.moveLeft=0;exhausted.extraStep=true;
  drawUnitBody=()=>{ctx.fillStyle='rgb(120,200,80)';ctx.fillRect(40,40,60,60)};drawUnit(exhausted,0)`);
 const p=raw.getImageData(60,60,1,1).data;
 assert.ok(p[0]<65&&p[1]<90&&p[2]<65,'spent units darken even when CanvasRenderingContext2D.filter is ignored');
 assert.equal(p[3],255,'toning preserves opaque pixels');
 assert.equal(raw.getImageData(20,20,1,1).data[3],0,'toning preserves the sprite silhouette');
}
{
 const {run,raw}=setup();
 run(`ctx.translate(18,12);ctx.scale(1.2,1.1);ctx.globalAlpha=.5;
  drawToned({x:15,y:15,w:60,h:60},.5,.4,()=>{ctx.fillStyle='#ffffff';ctx.fillRect(20,20,40,40)})`);
 const p=raw.getImageData(55,50,1,1).data;
 assert.ok(p[0]<140&&p[0]>50,'transformed sprite is toned');
 assert.ok(p[3]>=126&&p[3]<=129,'global alpha is applied once');
 assert.equal(raw.getImageData(10,10,1,1).data[3],0,'transformed crop does not paint outside the sprite');
 assert.equal(run('ctx===testContext'),true,'the main context is restored');
 assert.throws(()=>run(`drawToned({x:0,y:0,w:20,h:20},.5,.5,()=>{throw Error('paint failed')})`),/paint failed/);
 assert.equal(run('ctx===testContext'),true,'the main context is restored after a failed paint');
}
{
 const {run,raw,sandbox}=setup();
 const vehicle=createCanvas(20,20);vehicle.getContext('2d').fillStyle='#80c060';vehicle.getContext('2d').fillRect(0,0,20,20);
 sandbox.testVehicle=vehicle;
 run(`moduleImage=()=>testVehicle;vehicleWreckVisible=()=>false;imageReady=image=>Boolean(image);
  vehicleBounds=()=>({x:40,y:40,w:60,h:60});drawMechSmoke=()=>{};
  drawVehicle({kind:'tank',alive:false,vx:0,vz:0,face:1,hp:{body:0},max:{body:100}},0,true)`);
 const p=raw.getImageData(65,65,1,1).data;
 assert.ok(p[0]<110&&p[1]<130,'vehicle wreck fallback darkens with canvas filters disabled');
}
console.log('PASS filterless spent units, vehicle wrecks, transformed crops, silhouette alpha and context restoration');
