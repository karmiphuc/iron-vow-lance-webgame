const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const create=require('./sim-harness.cjs');

async function salvo(id,miss){
 const timers=[];
 const sim=create({random:()=>miss?.999:0,setTimeout:(callback,ms)=>{timers.push({callback,ms});return timers.length}});
 const plays=[];
 const parameter=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){},linearRampToValueAtTime(){}});
 const audioNode=()=>({gain:parameter(),frequency:parameter(),pan:parameter(),connect(){},start(){},stop(){}});
 sim.sandbox.fetch=async url=>{
  const bytes=fs.readFileSync(path.resolve(__dirname,'../dist',url));
  if(url.endsWith('.wav'))assert.equal(bytes.toString('ascii',0,4),'RIFF');
  return {ok:true,arrayBuffer:async()=>({url})};
 };
 sim.sandbox.window.AudioContext=class{
  get currentTime(){return sim.run('clock')}
  createGain(){return audioNode()}
  createStereoPanner(){return audioNode()}
  createDynamicsCompressor(){return {...audioNode(),threshold:parameter(),knee:parameter(),ratio:parameter()}}
  createBuffer(){return {getChannelData:()=>new Float32Array(100)}}
  createOscillator(){return audioNode()}
  createBufferSource(){
   return {...audioNode(),playbackRate:parameter(),start(at){
    if(this.buffer?.url?.endsWith('.wav'))plays.push({cue:path.basename(this.buffer.url,'.wav'),at,rate:this.playbackRate.value});
   }};
  }
  decodeAudioData(bytes){return Promise.resolve(bytes)}
 };
 assert.equal(sim.run('muted'),false);
 sim.run('startAudio(false)');
 await sim.flush();
 assert.equal(sim.run('musicRequest.track'),'hangar');
 assert.ok(sim.run('musicVoice.source.loop'));
 sim.run("createBattle(0);selected=2;sound('click')");
 await sim.flush();
 assert.equal(sim.run('musicRequest.track'),'mission');
 sim.run("$('#sound').onclick()");
 assert.equal(sim.storage.get('iron-vow-sound'),'off');
 assert.equal(sim.run('musicVoice'),null);
 assert.equal(create({storage:new Map(sim.storage)}).run('muted'),true);
 sim.run("$('#sound').onclick()");
 await sim.flush();
 assert.equal(sim.run('combatSamples.size'),11);
 assert.equal(sim.run('machinerySamples.size'),8);
 assert.equal(plays.filter(entry=>entry.cue==='mech-boot').length,1,'unmuting resumes idle without replaying startup');
 assert.ok(sim.run('machineryVoice.idle.loop'));
 if(id==='rifle'){
  sim.run(`const walker=battle.units[0],gaitStart=clock;
   walker.motion={fromX:walker.x,fromZ:walker.z,toX:walker.x+1,toZ:walker.z,
    start:clock,duration:1,gaitBase:0,segment:{index:0,length:1,paces:wardenPaces(1,0,true)}};
   walker.motion.gaitCues=walkSoundMarkers(walker.motion,false,false);`);
  const first=plays.length;
  for(let tick=0;tick<=60;tick++)sim.run(`clock=gaitStart+${tick}/60;advanceUnitAnimation(walker,clock,1/60)`);
  sim.run('walker.motion=null');
  const gait=plays.slice(first);
  assert.deepEqual(gait.map(entry=>entry.cue),[
   'mech-servo','mech-foot-a','mech-vent','mech-servo','mech-foot-b','mech-vent',
   'mech-servo','mech-foot-a','mech-vent','mech-servo','mech-foot-b','mech-vent'
  ]);
  for(let i=1;i<gait.length;i+=3)assert.ok(Math.abs(gait[i+1].at-gait[i].at-.085)<1e-6);
 }
 const initialHP=sim.run('battle.units[3].hp.body');
 if(id==='rifle'){
  sim.run(`const shooter=current(),target=battle.units[3],w=weapon('rifle');
   const chance=hitChance(shooter,target,'body',w);
   const rolls=[0,.999,.86*chance,.999,.93*chance,0,.999,0];
   let index=0;
   Math.random=()=>rolls[index++]??0;
   const riflePlan=planVolley(shooter,target,'body',w,false);
   index=0;`);
 }
 const attack=sim.run(`shoot(current(),battle.units[3],'body',weapon('${id}'))`);
 const changes=[];
 let previous=JSON.stringify(sim.run('battle.units[3].hp'));
 while(timers.length){
  const {callback,ms}=timers.shift();
  sim.run(`clock+=${ms}/1000`);
  callback();
  await sim.flush();
  const next=JSON.stringify(sim.run('battle.units[3].hp'));
  if(next!==previous){changes.push({at:sim.run('clock'),part:sim.run('battle.units[3].hitPart')});previous=next}
 }
 await attack;
 if(id==='rifle'){
  const shots=plays.filter(entry=>entry.cue==='rifle-report');
  const hits=plays.filter(entry=>entry.cue==='plate-strike');
  assert.equal(shots.length,8);
  assert.equal(hits.length,5);
  const landed=JSON.parse(sim.run('JSON.stringify(riflePlan.rounds)')).flatMap((round,index)=>round.hit?[{...round,index}]:[]);
  const travel=sim.run("attackProfile(current(),'rifle').travel");
  assert.deepEqual(changes.map(change=>change.part),landed.map(round=>round.part));
  for(const [i,round] of landed.entries()){
   assert.ok(Math.abs(hits[i].at-shots[round.index].at-travel)<1e-6,'each impact follows its own report');
   assert.ok(Math.abs(hits[i].at-changes[i].at-.005)<1e-6,'impact audio and HP change share a contact');
  }
  return;
 }
 const ballistic=plays.filter(entry=>!entry.cue.startsWith('mech-'));
 assert.deepEqual(ballistic.map(entry=>entry.cue),['pod-arm','rocket-launch','rocket-launch','missile-hit','missile-hit']);
 const [arm,first,second,firstImpact,lastImpact]=ballistic;
 const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`${id} ${actual} != ${expected}`);
 near(first.at-arm.at,.28);
 near(second.at-first.at,sim.run(`ATTACK_PROFILES['${id}'].beats[1]`));
 near(firstImpact.at-first.at,sim.run(`ATTACK_PROFILES['${id}'].travel`));
 near(lastImpact.at-second.at,firstImpact.at-first.at);
 assert.ok(first.rate>second.rate);
 const finalHP=sim.run('battle.units[3].hp.body');
 if(miss)assert.equal(finalHP,initialHP);
 else assert.ok(finalHP<initialHP);
}

(async()=>{
 await salvo('missile',false);
 await salvo('locust',true);
 await salvo('rifle',false);
 console.log('PASS machinery startup and looping idle across mute, alternating gait cues with timed vents, missile launch and detonation, and eight rifle reports with five independent hits.');
})().catch(error=>{console.error(error);process.exitCode=1});
