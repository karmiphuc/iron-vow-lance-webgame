/* Combat presentation in the existing battle scene. Rule contacts and HP remain in game.js. */
(function(root){
'use strict';
const T=root.THREE,V3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
root.IronVowCombat={create(scene,api){
 const seen=new WeakSet(),history=[],states=new Map();let sequence=0;
 const low=()=>innerWidth<760||root.IronVowRenderer.quality.tier==='low';
 const effect=root.IronVowEffects.create(scene,{camera:api.camera,groundAt:api.groundAt,low,contactsExternal:true,
  reducedMotion:()=>reducedMotion,shake:value=>{shake=Math.max(shake,value*10);},
  partPoint:(m,part)=>{
   const r=m.rig,node=({pilot:r.neck,right:r.arms.R.el,left:r.arms.L.el,legs:r.legs[0].kn})[part]||r.spine;
   const p=node.getWorldPosition(V3());if(part==='body')p.y+=1.2*m.scale;return p;
  }}),fx=effect.fx;
 const log=(type,data)=>{history.push({sequence:++sequence,type,time:clock,...data});if(history.length>600)history.splice(0,100);};
 const point=(unit,part)=>api.attachmentPoint(unit,part);
 const profileFor=(actor,w)=>root.IronVowWeaponFX.get(w.id);
 function launch(actor,target,w,index,contacts,guard){
  api.sync(actor);api.sync(target);
  const profile=profileFor(actor,w),kind=profile.archetype;
  if(kind==='blade')return;
  const socket=profile.socket?(profile.socket+(index%2&&profile.launchers>1?'2':'')):shotMuzzle(actor,w.id,index);
  const selected=contacts.filter(c=>c.index===index||w.scatter&&index===0),contact=selected[0]||contacts[0];
  const part=guard?'shield':contact?.part||'body',to=point(target,part);
  if(contact&&!contact.hit)to.add(V3(.6,0,.4));
  const mounted=api.models.get(actor.id)?.entry;
  if(mounted?.primary)root.IronVowFoundry.aimMounted(mounted.m,mounted.primary,to,1,mounted.primarySocket?mounted.primary.mount:null);
  const adapter=!mounted?root.IronVowAdapterWeapons.aimAt(actor,to):null;
  const from=point(actor,socket);
  const flight=Math.max(.025,contact?.travel||attackProfile(actor,w.id).travel);
  const entry=mounted,barrel=entry?.primary||adapter,axis=barrel?.muzzle?.getWorldDirection(V3()),muzzle=barrel?.muzzle?.getWorldPosition(V3());
  const aimError=axis&&muzzle?axis.angleTo(to.clone().sub(muzzle)):null;
  const expectedMarker=socket==='muzzle2'||socket==='shoulderMuzzle2'?barrel?.muzzle2||barrel?.muzzle:barrel?.muzzle;
  log('launch',{archetype:kind,expectedOrigin:expectedMarker?.getWorldPosition(V3()).toArray(),actorAlive:actor.alive,aimError,mounted:entry?.m?barrel?.mount.parent===(entry.primarySocket||entry.m.rig.arms.R.so):null,actor:actor.id,target:target.id,weapon:w.id,index,socket,origin:from.toArray(),targetPoint:to.toArray(),flight});
  const model=api.models.get(actor.id)?.entry?.m;
  if(model){model.recoil=Math.max(model.recoil,.8);model.s.comp.v-=.28;}
  const targets=(w.scatter?selected:[contact]).filter(Boolean).map(c=>{const p=point(target,guard?'shield':c.part);return c.hit?p:p.add(V3(.5+(c.index%3)*.17,-.3,.2));});
  const source=model||{wpn:{},yaw:0,recoil:0,s:{pitch:{v:0},kx:{v:0},kz:{v:0}}};source.wpn=source.wpn||{};
  effect.fireFX(source,to,kind,part,{at:clock,origin:from,target:to,targets,flight,arrival:at=>{effect.explode(at,false);log('arrival',{actor:actor.id,weapon:w.id,index,point:at.toArray(),expected:to.toArray()});}});
 }
 function landed(actor,target,w,contact,guard){
  api.sync(actor);api.sync(target);
  const profile=profileFor(actor,w),part=guard?'shield':contact.part,p=point(target,part),back=point(actor,'body').sub(p).normalize();
  effect.impact(p,back,profile.archetype);
  if(contact.before>0&&contact.after===0){fx.debris(p,low()?3:6,4);fx.smoke(p,3,1.7,0x817b73,.4,.7,1.3,.25);}
  log('impact',{actor:actor.id,target:target.id,weapon:w.id,index:contact.index,part:contact.part,shield:guard,point:p.toArray(),back:back.toArray(),planned:contact.amount,damage:contact.damage,before:contact.before,after:contact.after,actorAlive:actor.alive});
  const m=api.models.get(target.id)?.entry?.m;
  if(m){const kick=profile.archetype==='blade'?3.6:profile.archetype==='rail'?2.4:.7;m.s.kx.v-=back.x*kick;m.s.kz.v-=back.z*kick;m.s.pitch.v-=profile.archetype==='blade'?2:.55;m.s.comp.v-=contact.part==='legs'?1.4:.7;m.s.arm.v+=contact.part==='right'?1.8:.8;m.flicker=contact.part==='pilot'?1:m.flicker;}
  if(profile.archetype==='blade'&&!reducedMotion){actor.hitstop=target.hitstop={at:clock,until:clock+.085};shake=Math.max(shake,6);}
 }
 function step(m,p,index,amount){if(!reducedMotion)effect.onStep(m,p,index,amount);}
 function update(t,dt){
  for(const e of effects){
   if(seen.has(e)||['shot','boom','text','heal'].includes(e.type))continue;seen.add(e);
   const unit=e.actor&&battle.units.find(u=>u.id===e.actor);
   if(e.type==='step'){
    if(unit&&api.isLive(unit)&&!e.attackPlant&&!e.deathImpact)continue;
    const p=unit&&e.attackPlant?point(unit,'leadFoot'):api.world(e.x,e.z);
    if(!reducedMotion){fx.dustwave(p,low()?5:10,3*(e.mass||1),1.4,0xb8ad99,.4,1.1,.4);fx.smoke(p,2,1.7,0x9e968a,.3,.35,1.3,.4);}
   }else if(e.type==='detonation')effect.explode(api.world(e.x,e.z).add(V3(0,2,0)),e.big);
   else if(e.type==='skill')fx.ring(api.world(e.x,e.z),0xaedacc,2.7,.45);
  }
  for(const u of battle.units){
   const record=api.models.get(u.id),m=record?.entry?.m;
   let state=states.get(u.id);if(!state){state={smoke:t,jet:t};states.set(u.id,state);}
   if(m){
    const I={alive:u.alive,down:u.downReason,deathAge:t-(u.deathTime??t),bodyRatio:u.hp.body/u.max.body,armDead:u.hp.right<=0||u.hp.left<=0,legsDead:u.hp.legs<=0};
    effect.faultFX(m,I,t);
    if(m.melee&&!reducedMotion)effect.meleeUpdate(m,t,0);
   }
   const age=t-(u.deathTime??t),wreck=!u.alive&&u.downReason!=='pilot'&&age<14,damaged=u.alive&&u.hp.body/u.max.body<.24;
   if((wreck||damaged)&&t>=state.smoke){state.smoke=t+(low()?.25:.12);const p=point(u,'body');fx.smoke(p,1,wreck?3.2:1.8,wreck?0x4b4743:0x817a70,.4,wreck?1.4:.9,2.4,.25);if(wreck&&age<5)fx.fire(p,1.5,.65,null,.9);}
   if(u.motion?.jumpjet&&t>=state.jet){state.jet=t+.045;const p=point(u,'legs');fx.fire(p,1.8,.2,V3(0,-5,0));fx.smoke(p,low()?1:2,2,0x9faaa9,.45,-.4,.8,.2);}
  }
  effect.update(t,Math.min(.05,dt));
 }
 return {launch,landed,step,update,history,fx,dispose:()=>effect.dispose(),clear:()=>effect.clear()};
}};
})(window);
