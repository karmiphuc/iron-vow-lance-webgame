const assert=require('node:assert/strict');

module.exports=async function checkMeleeGrip({page,origin}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ironVow);
 await page.evaluate(()=>__ironVow.start({seed:42,contract:1,frames:[0,AERO_FRAME,2]}));
 await page.waitForFunction(()=>IronVowScene.ready,null,{timeout:90000});
 const result=await page.evaluate(()=>{
  const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
  const pos=node=>node.getWorldPosition(V());
  const weapons=['cleaver','breaker','piledriver','blade','hatchet','pike','tonfa','anchor-hammer'];
  let now=clock,cases=0;
  const failures=[];
  for(const frame of [0,AERO_FRAME])for(const side of ['L','R'])for(const melee of weapons)for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
   const hp={body:100,pilot:100,right:100,left:100,legs:100};
   const right=side==='R';
   const unit={id:'grip-'+cases++,frame,team:'ally',weapon:right?null:'rifle',melee,
    meleeHand:right?'right':undefined,shield:right?'citadel-shield':null,alive:true,hp,max:{...hp}};
   const facing=V(Math.sin(heading),0,Math.cos(heading)),out=V(Math.cos(heading),0,-Math.sin(heading)).multiplyScalar(right?-1:1);
   const aim=facing.clone().multiplyScalar(7).setY(3);
   const label=[frame,side,melee,heading].join('/');
   const drop={};
   function check(progress,expected){
    now+=1/60;
    const pose=animationPose(unit,now);
    Object.assign(pose,{heading,strikeKind:progress===null?null:melee,strikeProgress:progress??0,
     world:{x:0,y:0,z:0,face:heading,heading,aim,targetRoot:aim.clone().setY(0),lungeLimit:1,groundAt:()=>0,speed:0}});
    const entry=IronVowFoundry.draw(unit,now,pose,battle,foundryModel(frame),'rig-v2');
    const gear=entry?.secondary;
    if(!gear?.tip){failures.push(label+' missing melee model');return;}
    const socket=frame===AERO_FRAME?entry.m.nativeV2.source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName('Socket.Weapon.'+side)):
     entry.m.rig.arms[side].so;
    const grip=pos(gear.grip??gear.mount),shaft=pos(gear.tip).sub(grip).normalize();
    if(grip.distanceTo(pos(socket))>.01)failures.push(label+' grip moved off the hand');
    if(gear.mount.visible!==expected)failures.push(label+' weapon visibility does not follow arm health');
    if(!expected)return;
    if(progress===null&&(shaft.y<.06||shaft.dot(out)<.12||shaft.dot(facing)<(melee==='breaker'?.47:.58)))failures.push(label+' unsafe carry '+shaft.toArray());
    if(progress===.7&&shaft.dot(aim.clone().sub(grip).normalize())<.985)failures.push(label+' misses contact direction '+shaft.toArray());
    if(melee==='breaker'){
     // The head's impact shoe must lead an overhead drop with the same model in either hand.
     if(!gear.base||gear.model.name!=='breaker'){
      failures.push(label+' does not have the production hammer and its haft marker');
      return;
     }
     const haft=pos(gear.base).sub(grip).normalize();
     const shoe=shaft.clone().addScaledVector(haft,-shaft.dot(haft)).normalize();
     drop[progress]={head:pos(gear.tip),shaft,shoe};
    }
    if(right&&!entry.shield?.mount.visible)failures.push(label+' lost its left-hand shield');
   }
   check(null,true);
   check(.52,true);
   check(.7,true);
   check(.81,true);
   if(melee==='breaker'&&drop[.52]&&drop[.7]&&drop[.81]){
    const wind=drop[.52],impact=drop[.7],follow=drop[.81];
    if(wind.shaft.dot(facing)>-.35||wind.head.y<impact.head.y+.40||
       impact.shoe.y>-.55||follow.shaft.y>impact.shaft.y-.14)
     failures.push(label+' hammer does not lead with its impact shoe through the drop');
   }
   check(.91,true);
   check(null,true);
   unit.hp[right?'right':'left']=0;
   check(null,false);
  }
  return {cases,failures};
 });
 // A cached Workshop render must keep the equipped hand in its identity.
 for(const frame of [0,19]){
  const rendered=await page.waitForFunction(frame=>{
   const loadout={frame,weapon:null,melee:'hatchet'};
   const left=IronVowFoundry.preview(loadout,foundryModel(frame),'rig-v2');
   const right=IronVowFoundry.preview({...loadout,meleeHand:'right'},foundryModel(frame),'rig-v2');
   if(!left?.secondary||!right?.secondary)return false;
   const socket=(entry,side)=>frame===AERO_FRAME?entry.m.nativeV2.source.getObjectByName(THREE.PropertyBinding.sanitizeNodeName('Socket.Weapon.'+side)):
    entry.m.rig.arms[side].so;
   const pos=node=>node.getWorldPosition(new THREE.Vector3());
   return [left!==right,pos(left.secondary.grip).distanceTo(pos(socket(left,'L'))),pos(right.secondary.grip).distanceTo(pos(socket(right,'R')))];
  },frame,{timeout:90000});
  const [separate,left,right]=await rendered.jsonValue();
  assert.ok(separate&&left<.01&&right<.01,'Workshop cached render keeps the mounted hand');
 }
 assert.equal(result.cases,128);
 assert.deepEqual(result.failures,[]);
 console.log('PASS 128 production melee fits across Warden and Aero, both hands, all weapon models and four facings');
};
