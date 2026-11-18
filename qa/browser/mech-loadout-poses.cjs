const assert=require('node:assert/strict');

module.exports=async function checkMechLoadoutPoses({page,origin}){
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ironVow);
 await page.evaluate(()=>__ironVow.start({seed:427,contract:1,frames:[0,1,2]}));
 await page.waitForFunction(()=>IronVowScene.ready&&battle.units.filter(u=>u.team==='ally')
  .every(u=>IronVowScene.models.get(u.id)?.entry?.armed),null,{timeout:120000});

 const cases=await page.evaluate(()=>{
  const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),world=o=>o.getWorldPosition(V());
  const specs=[
   ['Kestrel, empty',1,'shotgun',null,null],
   ['Basilisk, torso pods',2,'missile',null,null],
   ['Basilisk, pods and shield',2,'missile',null,'citadel-shield'],
   ['Valkyrie, rifle',5,'rifle',null,null],
   ['Cairn, rifle',CAIRN_FRAME,'rifle',null,null],
   ['Cairn, hand-held missile',CAIRN_FRAME,'missile',null,null],
   ['Cairn, unsupported heavy gun',CAIRN_FRAME,'parallax',null,null],
   ['Shrike, long gun',9,'rail',null,null],
   ['Oni, rifle',6,'rifle',null,null],
   ['Oni, blade',6,'rifle','blade',null],
   ['Valkyrie, maul',5,'trident','anchor-hammer',null],
   ['Warden, shield',0,'shotgun',null,'citadel-shield']
  ];
  return specs.map(([name,frame,weapon,melee,shield],i)=>{
   const hp={body:100,pilot:100,right:100,left:100,legs:100};
   const u={id:'pose-qa-'+i,team:'ally',frame,weapon,melee,shield,alive:true,hp,max:{...hp}};
   const custom=IronVowRigV2.applies(u)?'rig-v2':undefined;
   let t=clock,z=0;
   function sample({moving=false,airborne=false,brace=0,aim=0,strikeKind,reducedMotion=false}={}){
    // Advance the production renderer at a fixed rate so a short transition can't hide a bad pose.
    t+=1/60;if(moving)z+=2.6/60;
    u.motion=moving?{toX:0,toZ:1}:null;
    const pose={brace,aim,strikeKind,reducedMotion,phase:0,primeProgress:0,strikeProgress:strikeKind ? .6 : 0,recoil:0,
     world:{x:0,y:airborne?1:0,z,airborne,face:0,heading:0,aim:V(4,4,z+18),groundAt:()=>0,speed:moving?2.6:0}};
    const entry=IronVowFoundry.draw(u,t,pose,battle,foundryModel(frame),custom);
    if(!entry?.primary)throw Error('Missing production equipment for '+name);
    const {m,primary,secondary,shield:guard}=entry,{L,R}=m.rig.arms;
    const drop=arm=>(world(arm.sh).y-world(arm.so).y)/(m.scale*(m.dims.up+m.dims.fo));
    const left=world(L.so),base=world(R.so);
    const axis=(primary.muzzle?world(primary.muzzle):base.clone()).sub(base);
    const along=axis.lengthSq()?left.clone().sub(base).dot(axis)/axis.lengthSq():0;
    const gap=left.distanceTo(base.addScaledVector(axis,Math.max(0,Math.min(1,along))))/m.scale;
    return {left:drop(L),right:drop(R),gap,along,guard:m.readyGuard,
     firingStance:m.fireStance,pod:primary.carrier===m.rig.spine,
     shield:Boolean(guard?.mount.visible&&guard.mount.parent===L.so),
     blade:Boolean(secondary?.mount.visible&&secondary.mount.parent===L.so)};
   }
   function settle(pose,frames=72){let result;for(let i=0;i<frames;i++)result=sample(pose);return result;}
   const idle=settle(),startWalk=sample({moving:true});
   const walk=Array.from({length:72},()=>sample({moving:true}));
   const brace=settle({brace:1}),aim=settle({aim:1}),recovered=settle();
   const air=sample({moving:true,airborne:true});
   settle();
   u.hp.right=0;
   const rightLost=sample({moving:true});
   u.hp.right=u.max.right;
   settle();
   u.hp.left=0;
   const leftLost=sample({moving:true});
   u.hp.left=u.max.left;
   const repaired=settle();
   const reduced=sample({brace:1,reducedMotion:true});
   const strike=melee?settle({strikeKind:melee},18):null;
   let unreachable;
   if(name==='Cairn, rifle'){
    // Move the gun's muzzle far enough that the entire handguard sample range is out of reach.
    // This exercises the actual IK along the mounted weapon, with all meshes and joints in the renderer.
    const muzzle=IronVowFoundry.entry(u.id).primary.muzzle;
    const rest=muzzle.position.clone();
    muzzle.position.add(V(80,0,0));
    unreachable=settle({moving:true});
    muzzle.position.copy(rest);
   }
   return {name,idle,startWalk,walk,brace,aim,recovered,air,rightLost,leftLost,repaired,reduced,strike,unreachable};
  });
 });
 const failures=[];
 function expect(ok,description,pose){if(!ok)failures.push(description+' '+JSON.stringify(pose));}
 for(const {name,idle,startWalk,walk,brace,aim,recovered,air,rightLost,leftLost,repaired,reduced,strike,unreachable} of cases){
  const relaxed=(pose,label)=>expect(pose.left>.28,name+' '+label+' lowers the empty left hand',pose);
  const grip=(pose,label)=>expect(pose.gap<.09&&pose.along>.12&&pose.along<.67,name+' '+label+' puts the hand on the gun',pose);
  const braceWithShield=idle.shield;
  if(braceWithShield){
   expect(brace.shield&&brace.left<walk.at(-1).left-.24,name+' raises the mounted shield',brace);
   expect(!leftLost.shield,name+' hides the shield when the arm breaks',leftLost);
  }else relaxed(brace,'braced');
  relaxed(leftLost,'with left arm disabled');
  if(!braceWithShield)relaxed(rightLost,'with right arm disabled');
  if(!braceWithShield)relaxed(reduced,'with reduced motion');
  expect(air.guard===0,name+' releases the ground stance on takeoff',air);
  if(name==='Basilisk, torso pods'){
   expect(idle.pod&&idle.right>.34,name+' keeps its empty right arm lowered',idle);
   expect(aim.right>.60,name+' aims the torso pods with both empty arms lowered',aim);
   relaxed(idle,'at rest');relaxed(startWalk,'on the first step');walk.forEach(pose=>relaxed(pose,'walking'));
  }
  if(name==='Cairn, unsupported heavy gun'||name==='Cairn, hand-held missile'||name==='Kestrel, empty'){
   for(const [label,pose] of Object.entries({idle,startWalk,aim,recovered,repaired}))relaxed(pose,label);
   walk.forEach(pose=>relaxed(pose,'walking'));
   expect(!aim.firingStance,name+' skips the shouldered rifle stance',aim);
  }
  if(name==='Cairn, rifle'||name==='Valkyrie, rifle'||name==='Shrike, long gun'){
   grip(idle,'at rest');grip(recovered,'returns from aim');grip(repaired,'after repair');
  }
  if(name==='Cairn, rifle'||name==='Oni, rifle')walk.slice(-24).forEach(pose=>grip(pose,'walking'));
  if(unreachable)relaxed(unreachable,'walking with an unreachable grip');
  if(strike)expect(strike.blade&&strike.guard<idle.guard,name+' retains the held melee attack and releases the idle guard',strike);
 }
 assert.deepEqual(failures,[],'Production pose regressions');
 console.log('PASS '+cases.length+' loadouts across ready, walk, brace, aim, takeoff, damage and recovery');
};
