const {spawnSync}=require('node:child_process');
const {readdirSync}=require('node:fs');
const {join}=require('node:path');

const excluded=new Set(['check-browser.cjs','check-simulation.cjs','check-scene.cjs','check-rig-v2.cjs']);
const cases=readdirSync(__dirname).filter(file=>/^check-.*\.cjs$/.test(file)&&!excluded.has(file)).sort();
if(cases.length===0)throw Error('No simulation checks found.');
for(const file of cases){
 const result=spawnSync(process.execPath,[join(__dirname,file)],{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
console.log('PASS '+cases.length+' simulation suites');
