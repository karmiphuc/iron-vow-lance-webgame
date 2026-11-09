const {createHash}=require('node:crypto');
const {execFileSync,spawnSync}=require('node:child_process');
const {readFileSync,readdirSync}=require('node:fs');
const {join,resolve}=require('node:path');
const checkBrowser=require('./check-browser.cjs');
const root=resolve(__dirname,'..');

function digestFiles(){
 const names=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
 const hash=createHash('sha256');
 for(const name of [...new Set(names)].sort()){
  let contents;
  try{contents=readFileSync(join(root,name))}catch(error){if(error.code!=='ENOENT')throw error}
  hash.update(name+'\0');
  hash.update(contents?createHash('sha256').update(contents).digest('hex'):'deleted');
 }
 return hash.digest('hex');
}

function servedSource(file,bytes){
 if(!file.endsWith('.html'))return bytes;
 // Sites injects the Cloudflare bootstrap into HTML at request time.
 return bytes.toString('utf8').replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi,(tag,code)=>
  code.includes('__CF$cv$params')&&code.includes('/cdn-cgi/challenge-platform/')?'':tag);
}

async function verifyLive(url){
 const dist=join(root,'dist'),base=new URL(url);
 if(base.protocol!=='https:'||base.username||base.password)throw Error('Use the public HTTPS Site URL.');
 const files=readdirSync(dist,{recursive:true}).filter(file=>file===join('assets','theater-tiles.webp')||file.endsWith('-parts.webp')||/\.(?:html|js|css)$|(?:^|[\\/])(?:(?:aero-[^\\/]+|armory-[^\\/]+|foundry-[6789](?:-[^\\/]+)?|reaver-[^\\/]+|bulwark|scout|ashigaru(?:-combat)?|foundry-1[01]|foundry-1[0-2]-death(?:-[0-3])?|aegis-(?:idle|[0-3]-(?:full|right-down|left-down|disarmed)))\.webp|expansion-weapons\.glb|shields\.glb|bulwark\.glb|scout\.glb)$/.test(file));
 for(const file of files){
  const asset=new URL(file.replaceAll('\\','/'),base);
  const options={cache:'no-store',signal:AbortSignal.timeout(20000)};
  let response=await fetch(asset,{...options,redirect:'manual'});
  const location=response.headers.get('location');
  if(response.status>=300&&response.status<400&&location){
   const canonical=new URL(location,asset);
   if(canonical.origin!==base.origin||canonical.username||canonical.password)throw Error('Live asset redirected away from the Site: '+file);
   await response.body?.cancel();
   response=await fetch(canonical,{...options,redirect:'error'});
  }
  if(!response.ok)throw Error('Live asset returned '+response.status+' for '+file);
  const local=createHash('sha256').update(readFileSync(join(dist,file))).digest('hex');
  const live=createHash('sha256').update(servedSource(file,Buffer.from(await response.arrayBuffer()))).digest('hex');
  if(local!==live)throw Error('Live asset differs from the checkout: '+file);
 }
 console.log('PASS '+files.length+' live code and selected art files match the checkout');
 await checkBrowser(base.href);
}

async function main(args){
 if(args.length===2&&args[0]==='--live'){await verifyLive(args[1]);return}
 if(args.length)throw Error('Usage: node qa/release-check.cjs [--live https://example.com/]');
 const before=digestFiles(),env={...process.env};
 delete env.IRON_VOW_QA_OUTPUT;
 const result=spawnSync(process.execPath,[join(__dirname,'check-simulation.cjs')],{cwd:root,env,stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error('Simulation checks failed.');
 await checkBrowser();
 if(digestFiles()!==before)throw Error('Source changed while checks were running. Run the release check again.');
 console.log('PASS release gate, source '+before);
}
main(process.argv.slice(2)).catch(error=>{console.error(error);process.exitCode=1});
