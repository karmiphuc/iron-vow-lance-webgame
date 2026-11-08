const {spawn}=require('node:child_process');
const {readFileSync,realpathSync}=require('node:fs');
const {basename,join,resolve}=require('node:path');
const root=realpathSync(join(__dirname,'..'));

async function readRequest(){
 const input=process.stdin,tty=input.isTTY;
 let line='';
 if(tty){input.setRawMode(true);console.error('Ready for Site workflow JSON on stdin (input is hidden).')}
 try{
  input.setEncoding('utf8');
  for await(const chunk of input.iterator({destroyOnReturn:false})){
   line+=chunk;
   if(line.includes('\u0003'))throw Error('Site packaging cancelled.');
   if(line.length>65536)throw Error('Workflow input is too large.');
   if(/[\r\n]/.test(line))break;
  }
 }finally{
  if(tty)input.setRawMode(false);
  input.pause();
 }
 try{return JSON.parse(line)}catch{throw Error('Provide one JSON workflow request on stdin.')}
}

async function main(){
 const [helper,...extra]=process.argv.slice(2);
 if(!helper||extra.length||basename(helper)!=='site-workflow.mjs')throw Error('Usage: node qa/site-package.cjs <path to site-workflow.mjs>');
 const {project_id:id}=JSON.parse(readFileSync(join(root,'.openai','hosting.json'),'utf8'));
 const request=await readRequest();
 if(!request?.archivePath||!request.credential||request.source?.project_id!==id||
    typeof request.source.checkout_path!=='string'||realpathSync(request.source.checkout_path)!==root){
  throw Error('Provide the credential, original opening result for this checkout, and archivePath.');
 }
 const input={credential:request.credential,source:request.source,archivePath:request.archivePath,
  commands:[[process.execPath,join(root,'qa','release-check.cjs')]]};
 const child=spawn(process.execPath,[resolve(helper),'--project-id',id],{cwd:root,stdio:['pipe','inherit','inherit']});
 const signals=['SIGINT','SIGTERM'];
 const stop=signal=>child.kill(signal);
 for(const signal of signals)process.on(signal,stop);
 child.stdin.on('error',()=>{}); // The helper may exit before reading invalid input.
 child.stdin.end(JSON.stringify(input)+'\n');
 try{
  process.exitCode=await new Promise((done,fail)=>{
   child.once('error',fail);
   child.once('close',code=>done(code??1));
  });
 }finally{for(const signal of signals)process.removeListener(signal,stop)}
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
