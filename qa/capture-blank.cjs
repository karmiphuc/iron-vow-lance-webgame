/* A painted-ready DOM marker must not let a blank WebGL viewport pass. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('node:http'),{spawn}=require('node:child_process');
const [out,runnerArg]=process.argv.slice(2);
if(!out)throw Error('Usage: node qa/capture-blank.cjs <new-output-directory> [runner]');
if(fs.existsSync(out))throw Error('Use a new output directory');
const server=createServer((req,res)=>res.writeHead(200,{'Content-Type':'text/html'}).end(`<!doctype html><canvas id="c" width="256" height="256"></canvas><script>
document.body.dataset.rigModel='painted';const gl=document.getElementById('c').getContext('webgl2');
function draw(){gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);requestAnimationFrame(draw);}requestAnimationFrame(draw);
</script>`));
(async()=>{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 try{
  const runner=path.resolve(runnerArg||path.join(__dirname,'capture.cjs'));
  const child=spawn(process.execPath,[runner,'--origin','http://127.0.0.1:'+server.address().port+'/','--preset','rig-bench','--label','blank-proof','--out',path.resolve(out)],{stdio:['ignore','pipe','pipe']});
  let log='';child.stdout.on('data',v=>log+=v);child.stderr.on('data',v=>log+=v);
  const code=await new Promise((done,no)=>{child.on('error',no);child.on('close',done);});
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'run.log'),log);
  assert.notEqual(code,0,'a blank real WebGL viewport must fail capture');
  assert.match(log,/Rig Bench WebGL canvas is blank/);
  const report=JSON.parse(fs.readFileSync(path.join(out,'manifest.json')));
  assert.equal(report.captures.length,0);assert.equal(report.failures.length,4);
  console.log('PASS blank real-WebGL fixture rejected at all four viewports despite painted-ready marker');
 }finally{await new Promise(done=>server.close(done));}
})().catch(error=>{console.error(error);process.exitCode=1;});
