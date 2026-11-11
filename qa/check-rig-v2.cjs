#!/usr/bin/env node
// Static export gate for a single chassis and its mounted weapon GLBs.
// It deliberately cannot certify visual quality, intended detachable plates, or gait.
const fs = require('node:fs');
const dims = ['py','spY','legA','legB','ankleH','restX','restZ','lift','stance','toe','reverse','quad','reach','phases','sway'];
const slots = ['paint_primary','paint_secondary','paint_accent','visor','stack'];
const parts = new Set(['body','pilot','right','left','legs']);
function readGLB(file) {
  const b=fs.readFileSync(file);
  if(b.length<20 || b.readUInt32LE(0)!==0x46546c67 || b.readUInt32LE(4)!==2 || b.readUInt32LE(8)!==b.length || b.readUInt32LE(16)!==0x4e4f534a) throw Error(`${file}: invalid GLB header`);
  const length=b.readUInt32LE(12);
  if(20+length>b.length) throw Error(`${file}: truncated JSON chunk`);
  return JSON.parse(b.subarray(20,20+length).toString('utf8'));
}
function renderedTriangles(g) {
  const nodes=g.nodes||[], meshes=g.meshes||[], accessors=g.accessors||[];
  const scenes=g.scenes||[];
  if (!scenes.length || !scenes[g.scene??0]) throw Error('Missing default scene');
  let triangles=0;
  function visit(i, ancestors) {
    if(!nodes[i]) throw Error(`Invalid node index ${i}`);
    if(ancestors.has(i)) throw Error(`Node cycle at ${i}`);
    const n=nodes[i], next=new Set(ancestors).add(i);
    if(n.mesh!==undefined) {
      const mesh=meshes[n.mesh]; if(!mesh) throw Error(`Invalid mesh index ${n.mesh}`);
      for(const p of mesh.primitives||[]) {
        const a=accessors[p.indices ?? p.attributes?.POSITION];
        if(!a || !Number.isInteger(a.count) || a.count<0) throw Error('Invalid triangle accessor');
        const mode=p.mode??4;
        if(mode===4) { if(a.count%3) throw Error('Triangle accessor count is not divisible by 3'); triangles+=a.count/3; }
        else if(mode===5 || mode===6) triangles+=Math.max(0,a.count-2);
        else throw Error(`Unsupported primitive mode ${mode}`);
      }
    }
    for(const child of n.children||[]) visit(child,next);
  }
  for(const node of scenes[g.scene??0].nodes||[]) visit(node,new Set());
  return triangles;
}
function validate(g, weapons=[]) {
  const errors=[], notes=[]; const nodes=g.nodes||[], meshes=g.meshes||[];
  const byName=new Map(); nodes.forEach((n,i)=>{if(n.name) {if(byName.has(n.name)) errors.push(`duplicate node ${n.name}`); else byName.set(n.name,i);}});
  const root=nodes[byName.get('root')];
  for(const d of dims) if(root?.extras?.[d]===undefined || root.extras[d]===null) errors.push(`root missing dimension ${d}`);
  const common=['root','pelvis','spine','neck',...['L','R'].flatMap(s=>['shoulder','elbow','wrist','socket'].map(x=>`${x}.${s}`))];
  const quad=root?.extras?.quad===true || root?.extras?.quad===1;
  const chains=quad ? ['LF','RF','LB','RB'].map(s=>['mount','hip','knee','ankle'].map(x=>`${x}.${s}`)) : ['L','R'].map(s=>['hip','knee','ankle'].map(x=>`${x}.${s}`));
  const arms=['L','R'].map(s=>['shoulder','elbow','wrist','socket'].map(x=>`${x}.${s}`));
  for(const name of [...common,...chains.flat()]) if(!byName.has(name)) errors.push(`missing node ${name}`);
  function descends(parent, child) {
    const queue=[parent], seen=new Set();
    while(queue.length) {const i=queue.pop(); if(seen.has(i)) continue; seen.add(i); for(const c of nodes[i]?.children||[]) {if(c===child)return true; queue.push(c);} }
    return false;
  }
  for(const chain of [['root','pelvis','spine','neck'],...arms.map(chain=>['spine',...chain]),...chains.map(chain=>['pelvis',...chain])]) for(let i=1;i<chain.length;i++) if(byName.has(chain[i-1]) && byName.has(chain[i]) && !descends(byName.get(chain[i-1]),byName.get(chain[i]))) errors.push(`${chain[i]} is not below ${chain[i-1]}`);
  const materials=new Set((g.materials||[]).map(m=>m.name));
  for(const slot of slots) if(!materials.has(slot)) errors.push(`missing material ${slot}`);
  for(const [i,m] of meshes.entries()) if(!parts.has(m.extras?.part)) errors.push(`mesh ${i} (${m.name||'unnamed'}) missing or invalid extras.part`);
  if(!meshes.some(m=>m.extras?.detach===true)) notes.push('No detachable mesh tagged; review intended blow-off plates.');
  const triangles=renderedTriangles(g), weaponTriangles=weapons.map(renderedTriangles), total=triangles+weaponTriangles.reduce((a,b)=>a+b,0);
  if(total>60000) errors.push(`triangle budget exceeded: ${total} > 60000`);
  if(!(g.extensionsUsed||[]).includes('EXT_meshopt_compression')) errors.push('missing EXT_meshopt_compression');
  notes.push('Static checks do not certify dimension values, emissive appearance, attachment placement, rig deformation, detach selection, or animation.');
  return {ok:errors.length===0,triangles,weaponTriangles,total,errors,notes};
}
if(require.main===module) {
  const args=process.argv.slice(2); if(!args.length) {console.error('Usage: node qa/check-rig-v2.cjs chassis.glb [mounted-weapon.glb ...]');process.exit(2);}
  try {const result=validate(readGLB(args[0]),args.slice(1).map(readGLB)); console.log(JSON.stringify(result,null,2)); if(!result.ok)process.exitCode=1;} catch(e){console.error(e.message);process.exitCode=2;}
}
module.exports={readGLB,renderedTriangles,validate};
