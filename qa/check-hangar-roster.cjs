// Read-only career-to-scene mapping against shipped saves and the actual catalog support contract.
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join,resolve}=require('node:path');
const vm=require('node:vm');
const dist=join(__dirname,'../dist'),context=vm.createContext({console});context.window=context;
for(const path of [join(dist,'scene/hangar-catalog.js'),process.argv[2]?resolve(process.argv[2]):join(dist,'scene/hangar-roster.js')])
 vm.runInContext(readFileSync(path,'utf8'),context,{filename:path});
const catalog=context.IronVowHangarCatalog.create();
// Mapping is allowed to inspect support, but must never allocate a rig or substitute another frame.
const support={supports:frame=>catalog.supports(frame),create(){throw Error('Roster mapping must not create rigs')}};
const map=(career,options={})=>context.IronVowHangarRoster.fromCareer(career,{catalog:support,...options});
const plain=value=>JSON.parse(JSON.stringify(value));
const fixture=name=>JSON.parse(readFileSync(join(__dirname,'fixtures',name+'.json'),'utf8'));
function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}
function checked(career,options){const before=JSON.stringify(career);freeze(career);const result=map(career,options);assert.equal(JSON.stringify(career),before,'mapping preserves the entire career save');return result;}
{
 const career=fixture('legacy-10x10-scene'),result=checked(career);
 assert.deepEqual(plain(result.active.map(u=>[u.id,u.frame,u.condition,u.weapon])),[
  ['seat:0',0,1,'rifle'],['seat:1',1,1,'rifle'],['seat:2',2,1,'missile']
 ],'published legacy saves fall back to slot frame IDs and normalize percentages');
 assert.equal(result.seatCount,3);assert.equal(result.reserve.length,0);
 assert.deepEqual(plain(result.unsupportedFrames),[1,2]);
 assert.deepEqual(plain(result.active.map(u=>u.canRender)),[true,false,false],'unsupported legacy frames remain explicit');
}
{
 const career=fixture('aero-jumpjet'),result=checked(career);
 assert.equal(result.active[0].frame,19,'stored active frame overrides legacy slot fallback');
 assert.equal(result.active[0].canRender,false,'Aero is reported unsupported without inventing another rig');
 assert.deepEqual(plain(result.reserve.map(u=>[u.id,u.frame,u.condition])),[['reserve:0',0,1]],'stored Warden remains separate from the active Aero');
 assert.deepEqual(plain(result.unsupportedFrames),[1,2,19]);
}
{
 const career=fixture('v31-corridor'),result=checked(career);
 assert.equal(Object.keys(career.reservePilots).length,2);
 assert.deepEqual(plain(result.reserve.map(u=>[u.id,u.frame,u.paint,u.melee])),[['reserve:6',6,'#334455','blade']],
  'reserve pilots and salvage are distinct from stored hulls');
 assert.equal(result.active.length,3,'hired reserve pilots do not create combat assignments');
}
{
 const career={units:[
  {id:'bad-id',frame:5,condition:29,weapon:'autocannon',melee:'breaker',shoulder:'pod',shield:'tower',paint:'#112233',trim:{s:'#445566'},upgrade:2},
  {frame:9,condition:1,weapon:'rifle'},
  {frame:10,condition:100,weapon:'missile'}
 ],reserve:{6:{id:'bad-reserve-id',frame:19,condition:0,weapon:'shotgun',paint:'#abcdef',trim:{a:'#fedcba'}}},
 reservePilots:{scout:{level:1,xp:0,training:[]}},ship:{levels:{drop:2}}};
 const result=checked(career);
 assert.equal(result.seatCount,4,'drop level 2 adds a fourth pad');
 assert.equal(result.active.length,3,'an unlocked pad stays empty without an explicit auxiliary assignment');
 assert.deepEqual(plain(result.active.map(u=>u.condition)),[.29,.01,1],'career condition is always a 0–100 percentage');
 assert.equal(result.active[0].id,'seat:0','source fields cannot replace stable seat IDs');
 assert.deepEqual(plain(result.reserve.map(u=>[u.id,u.frame,u.condition])),[['reserve:6',6,0]],'reserve dictionary key is authoritative over nested frame and ID');
 const active=result.active[0];
 for(const key of ['weapon','melee','shoulder','shield','paint','upgrade'])assert.equal(active[key],career.units[0][key],key+' maps without changing loadout');
 assert.deepEqual(plain(active.trim),career.units[0].trim);
 assert.notEqual(active.trim,career.units[0].trim,'mapped trim is independent from saved paint data');
 active.trim.s='#000000';assert.equal(career.units[0].trim.s,'#445566');
 assert.deepEqual(plain(map(career).active.map(u=>u.id)),['seat:0','seat:1','seat:2'],'repeated mapping retains stable IDs');
}
{
 // Eligibility belongs to the game; this explicit caller-selected assignment references an existing pilot and hull.
 const career=fixture('v31-corridor');career.ship={levels:{drop:2}};
 const result=checked(career,{aux:{frame:6,pilotId:'ghost'}});
 assert.equal(result.seatCount,4);assert.equal(result.active.length,4);
 assert.deepEqual(plain([result.active[3].id,result.active[3].frame,result.active[3].paint]),['seat:3',6,'#334455']);
 assert.equal(result.reserve.length,0,'an explicitly assigned auxiliary hull appears only once');
 assert.equal(career.reserve[6].condition,100,'aux assignment does not remove or alter stored hull data');
}
{
 const career=fixture('v31-corridor');career.ship={levels:{drop:1}};
 const result=checked(career);assert.equal(result.seatCount,3);assert.equal(result.active.length,3);
 assert.throws(()=>map(career,{aux:{frame:6,pilotId:'ghost'}}),/auxiliary/i,'lower drop levels cannot invent a fourth assignment');
}
assert.throws(()=>map(fixture('legacy-10x10-scene'),{catalog:{}}),/catalog/i);
catalog.dispose();
console.log('PASS hangar roster: published legacy/current careers, percent condition, hull/pilot distinction, empty fourth pad, explicit aux, stable IDs, read-only paint/loadouts and unsupported frames');
