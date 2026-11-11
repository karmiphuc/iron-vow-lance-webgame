/* Integration proof: kill a real capture, resume it, then reject a modified PNG. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {createHash}=require('node:crypto');
const [origin,out,runnerArg]=process.argv.slice(2);
if(!origin||!out)throw Error('Usage: node qa/capture-recovery.cjs <origin> <new-output-directory> [runner]');
const runner=path.resolve(runnerArg||path.join(__dirname,'capture.cjs')),root=path.resolve(out);
if(fs.existsSync(root))throw Error('Use a new output directory; recovery proof never replaces existing evidence');
fs.mkdirSync(root,{recursive:true});
const args=['--origin',origin,'--label','recovery','--preset','contracts'];
function run(output,{resume=false,interrupt=false}={}){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[runner,...args,'--out',output,...(resume?['--resume']:[])],{detached:true,stdio:['ignore','pipe','pipe']});
  let log='',killed=false;
  child.stdout.on('data',chunk=>{log+=chunk;if(interrupt&&!killed&&log.includes('SAVED ')){killed=true;process.kill(-child.pid,'SIGKILL');}});
  child.stderr.on('data',chunk=>{log+=chunk;});
  child.on('error',reject);child.on('close',(code,signal)=>resolve({code,signal,killed,log}));
 });
}
async function main(){
 const output=path.join(root,'capture'),first=await run(output,{interrupt:true});
 fs.writeFileSync(path.join(root,'interrupted.log'),first.log);
 assert.equal(first.killed,true,'the capture was actually interrupted after a real screenshot');
 const manifestPath=path.join(output,'manifest.json');
 assert.ok(fs.existsSync(manifestPath),'a forced interruption must preserve a checkpoint manifest');
 const partial=JSON.parse(fs.readFileSync(manifestPath));
 assert.equal(partial.status,'incomplete');assert.ok(partial.captures.length>0&&partial.captures.length<4);
 fs.writeFileSync(path.join(root,'interrupted-manifest.json'),JSON.stringify(partial,null,2)+'\n');
 const retained=partial.captures.map(c=>({file:c.file,hash:c.png_sha256}));
 const resumed=await run(output,{resume:true});fs.writeFileSync(path.join(root,'resumed.log'),resumed.log);
 assert.equal(resumed.code,0,resumed.log);
 const complete=JSON.parse(fs.readFileSync(manifestPath));
 assert.equal(complete.status,'complete');assert.equal(complete.captures.length,4);assert.deepEqual(complete.failures,[]);
 for(const {file,hash} of retained){
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(output,file))).digest('hex'),hash);
  assert.ok(complete.captures.find(c=>c.file===file)?.retained,'resume reused the completed image');
 }
 const corrupt=path.join(root,'modified-image');fs.cpSync(output,corrupt,{recursive:true});
 fs.appendFileSync(path.join(corrupt,complete.captures[0].file),'modified');
 const rejected=await run(corrupt,{resume:true});fs.writeFileSync(path.join(root,'modified-image.log'),rejected.log);
 assert.notEqual(rejected.code,0);assert.match(rejected.log,/Retained screenshot hash mismatch/);
 // The deliberately modified capture is never evidence. Keep only its rejection log.
 fs.rmSync(corrupt,{recursive:true});
 const report={status:'passed',interrupted_after:partial.captures.length,resumed_count:complete.captures.length,modified_png_rejected:true,runner};
 fs.writeFileSync(path.join(root,'result.json'),JSON.stringify(report,null,2)+'\n');
 console.log('PASS real capture interruption, checkpoint recovery and modified-PNG rejection');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
