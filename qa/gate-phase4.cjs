const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const checkBrowser=require('./check-browser.cjs');
const checkHangar=require('./browser/hangar.cjs');
const checkHangarLive=require('./browser/hangar-live.cjs');

async function main(){
 const [flag,directory]=process.argv.slice(2);
 assert.ok(flag==='--out'&&directory&&process.argv.length===4,'Usage: node qa/gate-phase4.cjs --out directory');
 const out=path.resolve(directory);
 fs.mkdirSync(out,{recursive:true});
 require('./check-hangar-roster.cjs');
 require('./check-hangar-navigation.cjs');
 process.env.IRON_VOW_HANGAR_PROOF=out;
 process.env.IRON_VOW_QA_REPORT=path.join(out,'summary.json');
 await checkBrowser(undefined,[checkHangar,checkHangarLive]);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
