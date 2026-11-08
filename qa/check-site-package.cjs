const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {mkdtempSync,readFileSync,realpathSync,rmdirSync,unlinkSync,writeFileSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const root=realpathSync(join(__dirname,'..'));
const {project_id}=JSON.parse(readFileSync(join(root,'.openai','hosting.json'),'utf8'));
const directory=mkdtempSync(join(tmpdir(),'iron-vow-package-'));
const helper=join(directory,'site-workflow.mjs');

try{
 writeFileSync(helper,`
import assert from 'node:assert/strict';
import path from 'node:path';
let raw='';
for await(const chunk of process.stdin)raw+=chunk;
const input=JSON.parse(raw);
assert.deepEqual(process.argv.slice(2),['--project-id',input.source.project_id]);
assert.deepEqual(input.commands,[[process.execPath,path.join(process.cwd(),'qa','release-check.cjs')]]);
assert.equal(input.credential.token,'synthetic-package-test-value');
console.log('Verified mandatory release command');
process.exitCode=23;
`);
 const request={
  credential:{token:'synthetic-package-test-value'},source:{project_id,checkout_path:root},
  archivePath:join(directory,'unused.tar'),commands:[]
 };
 const packageWith=input=>spawnSync(process.execPath,[join(__dirname,'site-package.cjs'),helper],{
  input:JSON.stringify(input)+'\n',encoding:'utf8'
 });
 const result=packageWith(request);
 assert.equal(result.status,23,result.stderr);
 assert.match(result.stdout,/Verified mandatory release command/);
 assert.ok(!(result.stdout+result.stderr).includes(request.credential.token));
 const mismatch=packageWith({...request,source:{project_id,checkout_path:directory}});
 assert.equal(mismatch.status,1);
 assert.doesNotMatch(mismatch.stdout,/Verified mandatory release command/);
 console.log('PASS package gate is always inserted, helper failures propagate and other checkouts are rejected');
}finally{
 unlinkSync(helper);
 rmdirSync(directory);
}
