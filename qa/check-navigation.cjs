// Focused, real-game touch regression at both iPad orientations.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const crypto=require('node:crypto');
const {createServer}=require('node:http');
const {resolve,join,sep,extname}=require('node:path');
const {chromium}=require('playwright');
const checkNavigation=require('./browser/navigation.cjs');

function sourceState(){
 const root=resolve(__dirname,'..');
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const files=git('status','--porcelain','--','dist','qa');
 const diff=git('diff','--binary','--','dist','qa');
 const untracked=git('ls-files','--others','--exclude-standard','--','dist','qa').split('\n').filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(resolve(root,file))).digest('hex')}));
 return {commit:git('rev-parse','HEAD'),distTree:git('rev-parse','HEAD:dist'),dirty:Boolean(files),status:files,untracked,diffSha256:crypto.createHash('sha256').update(diff).digest('hex'),scenarioSha256:crypto.createHash('sha256').update(fs.readFileSync(resolve(__dirname,'browser/navigation.cjs'))).digest('hex')};
}

async function main(){
 const args=process.argv.slice(2);
 if(args.length!==2||args[0]!=='--out')throw Error('Usage: node qa/check-navigation.cjs --out <directory>');
 const out=resolve(args[1]);fs.mkdirSync(out,{recursive:true});
 const source=sourceState();
 const root=resolve(process.env.IRON_VOW_NAV_DIST||resolve(__dirname,'../dist'));
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary','.svg':'image/svg+xml','.woff2':'font/woff2','.ogg':'audio/ogg','.mp3':'audio/mpeg'};
 const server=createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=resolve(root,'.'+pathname);if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return}
  if(file===root)file=join(root,'index.html');
  fs.stat(file,(err,stat)=>{
   if(err||!stat.isFile()){res.writeHead(404).end();return}
   res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
  });
 });
 await new Promise((ok,fail)=>server.once('error',fail).listen(0,'127.0.0.1',ok));
 let browser;
 try{
  const executablePath=process.env.IRON_VOW_CHROME||([chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync));
  assert.ok(executablePath,'Install Playwright Chromium or set IRON_VOW_CHROME');
  browser=await chromium.launch({executablePath,args:['--enable-unsafe-swiftshader']});
  const results=[];
  for(const viewport of [{width:320,height:700},{width:1024,height:1366},{width:1366,height:1024}]){
   const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,deviceScaleFactor:1,reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];
   page.setDefaultTimeout(15000);
   page.on('pageerror',error=>errors.push(error.message));
   page.on('response',response=>{if(response.status()>=400&&response.url().startsWith(`http://127.0.0.1:${server.address().port}/`))errors.push(`${response.status()} ${response.url()}`)});
   try{
    await checkNavigation({page,context,origin:`http://127.0.0.1:${server.address().port}/`,out,viewport});
    assert.deepEqual(errors,[],'No browser or asset errors');
    results.push({viewport,status:'passed'});console.log(`PASS ${viewport.width}x${viewport.height}`);
   }finally{await context.close()}
  }
  const sourceAfter=sourceState();
  assert.deepEqual(sourceAfter,source,'Source must remain unchanged throughout capture');
  fs.writeFileSync(join(out,'summary.json'),JSON.stringify({status:'passed',sourceBefore:source,sourceAfter,results},null,2)+'\n');
 }finally{await browser?.close();await new Promise(done=>server.close(done))}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
