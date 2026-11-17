const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const checkOverworld=require('./browser/overworld.cjs');

const root=path.resolve(__dirname,'..');

function parseArgs(args){
 if(!args.length)return null;
 if(args.length!==2||args[0]!=='--out'||!args[1])throw Error('Usage: node qa/check-overworld-chart.cjs [--out directory]');
 return path.resolve(args[1]);
}

function sourceState(){
 const git=(...args)=>spawnSync('git',args,{cwd:root,encoding:'utf8'});
 const commit=git('rev-parse','HEAD'),committedDistTree=git('rev-parse','HEAD:dist'),dirty=git('status','--porcelain','--','dist','qa');
 for(const result of [commit,committedDistTree,dirty])if(result.status!==0)throw Error(result.stderr||'Unable to read Git source state');
 const treeHash=directory=>{
  const listing=git('ls-files','-z','-c','-o','--exclude-standard','--',directory);
  if(listing.status!==0)throw Error(listing.stderr||'Unable to list '+directory);
  const files=[...new Set(listing.stdout.split('\0').filter(Boolean))].sort();
  const hash=crypto.createHash('sha256');
  for(const file of files){
   hash.update(file).update('\0');
   if(fs.existsSync(path.join(root,file)))hash.update(fs.readFileSync(path.join(root,file)));
   else hash.update('<deleted>');
   hash.update('\0');
  }
  return hash.digest('hex');
 };
 return{commit:commit.stdout.trim(),committedDistTree:committedDistTree.stdout.trim(),
  worktreeDistSha256:treeHash('dist'),worktreeQaSha256:treeHash('qa'),dirty:Boolean(dirty.stdout.trim())};
}

function runScript(name,file){
 const result=spawnSync(process.execPath,[path.join(__dirname,file)],{cwd:root,encoding:'utf8'});
 if(result.stdout)process.stdout.write(result.stdout);
 if(result.stderr)process.stderr.write(result.stderr);
 const check={name,status:result.status===0?'passed':'failed'};
 if(result.status!==0){
  check.exitCode=result.status??1;
  throw Object.assign(Error(name+' failed'),{check});
 }
 return check;
}

function writeSummary(directory,summary){
 if(!directory)return;
 fs.mkdirSync(directory,{recursive:true});
 const file=path.join(directory,'summary.json'),temporary=file+'.tmp';
 fs.writeFileSync(temporary,JSON.stringify(summary,null,2)+'\n');
 fs.renameSync(temporary,file);
}

async function main(){
 let outDir;
 try{outDir=parseArgs(process.argv.slice(2));}
 catch(error){console.error(error.message);process.exitCode=64;return;}
 const summary={source:sourceState(),started:new Date().toISOString(),status:'running',checks:[]};
 let browserReport,previousBrowserReport,previousDevices,previousSerial;
 try{
  summary.checks.push(runScript('overworld rules','check-overworld-rules.cjs'));
  summary.checks.push(runScript('career travel and save fixtures','check-overworld-career.cjs'));

  previousBrowserReport=process.env.IRON_VOW_QA_REPORT;
  previousDevices=process.env.IRON_VOW_QA_DEVICES;
  previousSerial=process.env.IRON_VOW_QA_SERIAL;
  if(outDir){
   fs.mkdirSync(outDir,{recursive:true});
   browserReport=path.join(outDir,'browser.json');
   process.env.IRON_VOW_QA_REPORT=browserReport;
  }
  process.env.IRON_VOW_QA_DEVICES='both';
  process.env.IRON_VOW_QA_SERIAL='1';
  try{
   const checkBrowser=require('./check-browser.cjs');
   await checkBrowser(undefined,[checkOverworld]);
   summary.checks.push({name:'overworld browser desktop and touch',status:'passed'});
  }catch(error){
   summary.checks.push({name:'overworld browser desktop and touch',status:'failed'});
   throw error;
  }finally{
   if(previousBrowserReport===undefined)delete process.env.IRON_VOW_QA_REPORT;else process.env.IRON_VOW_QA_REPORT=previousBrowserReport;
   if(previousDevices===undefined)delete process.env.IRON_VOW_QA_DEVICES;else process.env.IRON_VOW_QA_DEVICES=previousDevices;
   if(previousSerial===undefined)delete process.env.IRON_VOW_QA_SERIAL;else process.env.IRON_VOW_QA_SERIAL=previousSerial;
  }
  summary.status='passed';
  console.log('PASS overworld chart gate: route forecast, inline departure, transit rest, save reload and touch layout');
 }catch(error){
  if(error.check){
   const existing=summary.checks.find(check=>check.name===error.check.name);
   if(!existing)summary.checks.push(error.check);
  }
  summary.status='failed';
  summary.error=error.stack||error.message;
  console.error(summary.error);
  process.exitCode=1;
 }finally{
  try{summary.sourceAfter=sourceState();}
  catch(error){summary.sourceAfterError=error.message;summary.status='failed';process.exitCode=1;}
  summary.ended=new Date().toISOString();
  try{writeSummary(outDir,summary);}
  catch(error){console.error('Unable to write gate summary: '+error.message);process.exitCode=1;}
 }
}

main().catch(error=>{console.error(error);process.exitCode=1;});
