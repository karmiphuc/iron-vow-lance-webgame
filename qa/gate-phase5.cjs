const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const checkBrowser=require('./check-browser.cjs');
const checkWorkshopTurntable=require('./browser/workshop.cjs');
const checkWorkshopPaint=require('./browser/workshop-paint.cjs');
const checkWorkshopPortraits=require('./browser/workshop-portraits.cjs');

async function main(){
 const [flag,directory]=process.argv.slice(2);
 assert.ok(flag==='--out'&&directory&&process.argv.length===4,'Usage: node qa/gate-phase5.cjs --out directory');
 const out=path.resolve(directory);
 fs.mkdirSync(out,{recursive:true});
 process.env.IRON_VOW_WORKSHOP_PROOF=out;
 process.env.IRON_VOW_QA_REPORT=path.join(out,'summary.json');
 await checkBrowser(undefined,[checkWorkshopTurntable,checkWorkshopPaint,checkWorkshopPortraits]);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
