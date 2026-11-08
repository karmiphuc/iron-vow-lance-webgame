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
 assert.equal(sim.run('combatSamples.size'),5);
 const initialHP=sim.run('battle.units[3].hp.body');
 const attack=sim.run(`shoot(current(),battle.units[3],'body',weapon('${id}'))`);
 while(timers.length){
  const {callback,ms}=timers.shift();
  sim.run(`clock+=${ms}/1000`);
  callback();
  await sim.flush();
 }
 await attack;
 assert.deepEqual(plays.map(entry=>entry.cue),['pod-arm','rocket-launch','rocket-launch','missile-hit','missile-hit']);
 const [arm,first,second,firstImpact,lastImpact]=plays;
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
 console.log('PASS: both missile launchers use the authored arming, paired ignition, and synchronized detonation sounds on hits and misses.');
})().catch(error=>{console.error(error);process.exitCode=1});
