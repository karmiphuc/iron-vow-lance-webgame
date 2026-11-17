const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const checkBrowser=require('./check-browser.cjs');
const scenarios=[
 require('./browser/workbench.cjs'),require('./browser/warden-rig-bench.cjs'),require('./browser/bulwark-bench.cjs'),
 require('./browser/scout-bench.cjs'),require('./browser/war-mode.cjs')
];
async function main(){
 const [flag,directory,...rest]=process.argv.slice(2);
 if(flag!=='--out'||!directory||rest.length)throw Error('Usage: node qa/gate-phase6.cjs --out directory');
 const out=path.resolve(directory),root=path.resolve(__dirname,'..');
 fs.mkdirSync(out,{recursive:true});
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const source={commit:git('rev-parse','HEAD'),distTree:git('rev-parse','HEAD:dist'),dirty:Boolean(git('status','--porcelain','--','dist','qa'))};
 const results={desktop:{},touch:{}};
 const tests=scenarios.map(test=>Object.defineProperty(async context=>{
  const result=await test({...context,out});
  results[context.mobile?'touch':'desktop'][test.name]=result??true;
 },'name',{value:test.name}));
 await checkBrowser(undefined,tests);
 fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({source,status:'pass',...results},null,2)+'\n');
 console.log('PASS Phase 6 gate: live roster, source clips, production War parity and diagnostics');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
