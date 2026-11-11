/* Real Three.js pools and geometry; GPU/action integration is checked separately. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
globalThis.window=globalThis;globalThis.self=globalThis;
const noop=()=>{},gradient={addColorStop:noop};
globalThis.document={createElement(){return{width:1,height:1,getContext:()=>new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(target,key)=>target[key]||noop})};}};
const root=path.resolve(__dirname,'../dist');
for(const file of ['rig-bench/vendor/three.min.js','scene/effects.js','scene/weapon-fx.js'])vm.runInThisContext(fs.readFileSync(file==='scene/effects.js'&&process.env.IRON_VOW_EFFECTS_SOURCE?process.env.IRON_VOW_EFFECTS_SOURCE:path.join(root,file),'utf8'),{filename:file});
const scene=new THREE.Scene(),retained=new THREE.Object3D();scene.add(retained);
const groundAt=(x,z)=>2+x*.08+z*.03;
const effects=IronVowEffects.create(scene,{groundAt,partPoint:()=>new THREE.Vector3(0,3,0)}),fx=effects.fx;
const p=new THREE.Vector3(0,2.15,0);effects.impact(p,new THREE.Vector3(1,.05,0),'rifle');
const sparks=scene.children.filter(o=>o.isMesh&&o.geometry.parameters?.width===.05&&o.geometry.parameters?.depth===.38&&o.visible);
assert.equal(sparks.length,13,'Reference rifle spray emits thirteen actual pooled meshes');
fx.update(.15);
for(const spark of sparks){assert.ok(spark.position.x>0,'Every spark flies back toward the shooter');assert.ok(spark.position.y>=groundAt(spark.position.x,spark.position.z)+.029,'Sparks bounce on local elevated terrain');}
fx.arc(new THREE.Vector3(0,3,0),new THREE.Vector3(3,4,0),.2,1);fx.update(.01);
const arc=scene.children.find(o=>o.isGroup&&o.visible&&o.children.length===14);
assert.ok(arc,'One real seven-segment core/halo arc is visible');
for(const segment of arc.children){assert.equal(segment.material.depthTest,true);assert.equal(segment.material.polygonOffsetFactor,0);assert.equal(segment.material.polygonOffsetUnits,-1);assert.ok(segment.scale.z>0);}
let arrivals=0;
const endpoint=new THREE.Vector3(3,2.5,4);
fx.missile(new THREE.Vector3(0,3,0),endpoint,4,.4,at=>{arrivals++;assert.ok(at.distanceTo(endpoint)<1e-8);});
for(let i=0;i<12;i++)fx.update(.05);
assert.equal(arrivals,1,'The arcing missile calls arrival once at the real endpoint');
effects.clear();fx.light(p,0xffaa44,7);assert.ok(scene.children.some(o=>o.isPointLight&&o.visible&&o.intensity===7),'Lights can be reused after clearing');
const resources=new Set();for(const node of scene.children.filter(o=>o!==retained))node.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of [o.material].flat().filter(Boolean)){resources.add(m);for(const key of ['map','normalMap','roughnessMap','emissiveMap'])if(m[key])resources.add(m[key]);}});
const disposed=new Map();for(const resource of resources)resource.addEventListener('dispose',()=>disposed.set(resource,(disposed.get(resource)||0)+1));
effects.dispose();assert.deepEqual(scene.children,[retained]);for(const resource of resources)assert.equal(disposed.get(resource),1,'Every owned pooled resource is disposed exactly once');
const catalog=fs.readFileSync(path.join(root,'game.js'),'utf8').split('const WEAPONS=[')[1].split('\n];')[0];
const ids=[...catalog.matchAll(/\bid:'([^']+)'/g)].map(m=>m[1]);assert.equal(ids.length,34);IronVowWeaponFX.assertCatalog(ids.map(id=>({id})));
for(const id of ids)assert.ok(['rifle','shotgun','missile','rail','blade'].includes(IronVowWeaponFX.get(id).archetype));
assert.throws(()=>IronVowWeaponFX.get('unmapped-test-weapon'),/Missing 3D weapon profile/);
console.log('PASS real reference FX pools, directional spray, elevated spark floor, final arc depth bias, single missile arrival, reusable lights, exact owned-resource disposal and all 34 weapon mappings (GPU/action integration pending)');
