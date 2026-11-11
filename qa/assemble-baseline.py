from pathlib import Path
from hashlib import sha256
import json,subprocess,shutil,html,argparse
from PIL import Image,ImageDraw
parser=argparse.ArgumentParser(description='Assemble and pixel-check the reviewed Phase 0 capture runs.')
parser.add_argument('--runs-root',type=Path,required=True)
parser.add_argument('--out',type=Path)
args=parser.parse_args()
repo=Path(__file__).resolve().parent.parent
out=args.out or repo/'design/baseline/reviewed-20261111'
static_runs=[('baseline-original',(args.runs_root/'iron-vow-baseline-final')),('phase0-original',(args.runs_root/'iron-vow-phase0-final')),('baseline-details',(args.runs_root/'iron-vow-baseline-details')),('phase0-details',(args.runs_root/'iron-vow-phase0-details')),('baseline-bench-checked',(args.runs_root/'iron-vow-baseline-bench-final')),('phase0-bench-checked',(args.runs_root/'iron-vow-phase0-bench-final'))]
motion_runs=[('phase0-motion',(args.runs_root/'iron-vow-phase0-motion')),('baseline-motion',(args.runs_root/'iron-vow-baseline-motion')),('reference-motion',(args.runs_root/'iron-vow-reference-motion')),('phase0-destruction-final',(args.runs_root/'iron-vow-phase0-destruction-final')),('baseline-destruction-final',(args.runs_root/'iron-vow-baseline-destruction-final')),('reference-hit-final',(args.runs_root/'iron-vow-reference-hit-final'))]
plan=json.loads(subprocess.check_output(['node','qa/capture.cjs','--plan'],cwd=repo))
expected=set()
for v in plan['viewports']:
 for p in plan['presets']:
  for s in ['baseline','phase0']:expected.add((s,v['width'],v['height'],p['id']))
  if p.get('page') or 'contract' in p and not p.get('weapon'):expected.add(('reference-game',v['width'],v['height'],p['id']))
  if p['id']=='rig-bench':expected.add(('reference-bench',v['width'],v['height'],p['id']))
# Read only completed manifests. Raw attempt/failure reports are kept in the final bundle.
static={};raw={};missing=[]
for label,root in static_runs:
 p=root/'manifest.json'
 if not p.exists():missing.append(label);continue
 m=json.loads(p.read_text());raw[label]=m
 for c in m['captures']:static[(c['source'],c['viewport']['width'],c['viewport']['height'],c['preset'])]=(label,root,c)
if missing:raise SystemExit('Waiting for completed manifests: '+', '.join(missing))
if expected-set(static):raise SystemExit('Missing stills: '+repr(sorted(expected-set(static))))
motion={}
for label,root in motion_runs:
 p=root/'manifest.json'
 if not p.exists():missing.append(label);continue
 m=json.loads(p.read_text());raw[label]=m
 for c in m['strips']:motion[(m['label'],c['action'])]=(label,root,c)
if missing:raise SystemExit('Waiting for completed filmstrips: '+', '.join(missing))
weapons=['rifle','shotgun','missile','rail','blade','parallax'];actions=['attack-'+k for k in weapons]+['walk','hit-reaction','destruction']
expected_motion={(s,a) for s in ['baseline','phase0','reference'] for a in actions if not(s=='reference' and a=='attack-parallax')}
if expected_motion-set(motion):raise SystemExit('Missing filmstrips: '+repr(sorted(expected_motion-set(motion))))
assert len(static)==312 and len(motion)==26
assert all(len(c['frames'])==16 and len({f['png_sha256'] for f in c['frames']})>=4 for _,_,c in motion.values())
assert all(f.get('subject') and f['subject']['hp']['body']<f['subject']['max']['body'] for f in motion[('reference','hit-reaction')][2]['frames'])
out.mkdir(parents=True,exist_ok=True);(out/'runs').mkdir(exist_ok=True)
for label,m in raw.items():(out/'runs'/f'{label}.json').write_text(json.dumps(m,indent=2)+'\n')
for label,root in static_runs:
 for prior in root.glob('prior-*.json'):shutil.copyfile(prior,out/'runs'/f'{label}-{prior.name}')
def digest(p):return sha256(p.read_bytes()).hexdigest()
def convert(source,dest):
 dest.parent.mkdir(parents=True,exist_ok=True)
 prior=cached.get(str(dest.relative_to(out)))
 if prior and dest.exists() and digest(source)==prior['original_png_sha256'] and digest(dest)==prior['sha256']:
  return {k:prior[k] for k in ['original_png_sha256','sha256','pixel_sha256','width','height']}
 with Image.open(source) as im:
  rgba=im.convert('RGBA');pixels=rgba.tobytes()
 same=False
 if dest.exists():
  with Image.open(dest) as check:same=check.size==rgba.size and check.convert('RGBA').tobytes()==pixels
 if not same:rgba.save(dest,format='WEBP',lossless=True,method=2,exact=True)
 with Image.open(dest) as check:assert check.size==rgba.size and check.convert('RGBA').tobytes()==pixels,'WebP pixels differ: '+str(source)
 return {'original_png_sha256':digest(source),'sha256':digest(dest),'pixel_sha256':sha256(pixels).hexdigest(),'width':rgba.width,'height':rgba.height}
cached={}
if (out/'manifest.json').exists():
 previous=json.loads((out/'manifest.json').read_text())
 cached={c['file']:c for c in previous.get('captures',[])+previous.get('filmstrips',[])}
records=[]
for n,(key,(run,root,c)) in enumerate(sorted(static.items()),1):
 dest=out/Path(c['file']).with_suffix('.webp');checks=convert(root/c['file'],dest)
 records.append({**c,**checks,'file':str(dest.relative_to(out)),'run':run})
 if n%40==0:print('Converted and pixel-checked',n,'/',len(static),flush=True)
movies=[]
for key,(run,root,c) in sorted(motion.items()):
 dest=out/'motion'/Path(c['file']).with_suffix('.webp');checks=convert(root/c['file'],dest)
 movies.append({**c,**checks,'file':str(dest.relative_to(out)),'source':key[0],'run':run})
lookup={(c['source'],c['viewport']['width'],c['viewport']['height'],c['preset']):c for c in records}
styles='body{background:#101820;color:#e5e7eb;font:14px system-ui;margin:24px}table{border-collapse:collapse}td,th{padding:10px;border:1px solid #42505b;vertical-align:top}img{max-width:30vw;height:auto}a{color:#86d3f0}'
rows=[]
for v in plan['viewports']:
 for p in plan['presets']:
  cells=[]
  for source in ['baseline','reference-bench' if p['id']=='rig-bench' else 'reference-game','phase0']:
   c=lookup.get((source,v['width'],v['height'],p['id']))
   cells.append('<td>'+('<a href="'+html.escape(c['file'])+'"><img loading="lazy" width="400" src="'+html.escape(c['file'])+'"></a>' if c else 'No matching reference preset')+'</td>')
  rows.append('<tr><th>'+html.escape(p['id'])+'<br>'+str(v['width'])+'×'+str(v['height'])+'</th>'+''.join(cells)+'</tr>')
(out/'contact-sheet.html').write_text('<!doctype html><meta charset="utf-8"><title>Iron Vow Phase 0 comparison</title><style>'+styles+'</style><h1>Baseline · reference · Phase 0</h1><p>312 stills. Click an image for full size. Lossless WebP pixels match the original PNG captures.</p><table><tr><th>Preset</th><th>Deployed v98 source</th><th>Reference</th><th>Phase 0</th></tr>'+''.join(rows)+'</table>')
# Compact category sheets for viewing directly in a PR.
for v in plan['viewports']:
 for group,selected in [('interface',[p for p in plan['presets'] if p.get('page')]),('combat',[p for p in plan['presets'] if 'contract' in p and not(p.get('detailPart') or p.get('wreck'))]),('damage',[p for p in plan['presets'] if p.get('detailPart') or p.get('wreck')]),('bench',[p for p in plan['presets'] if p.get('path')])]:
  w,h=360,270;sheet=Image.new('RGB',(3*w,(h+28)*len(selected)+30),'#101820');draw=ImageDraw.Draw(sheet)
  for i,title in enumerate(['v98 baseline','reference','Phase 0']):draw.text((i*w+8,8),title,fill='white')
  for row,p in enumerate(selected):
   for col,s in enumerate(['baseline','reference-bench' if p['id']=='rig-bench' else 'reference-game','phase0']):
    x=col*w;y=30+row*(h+28);draw.text((x+8,y+7),p['id'],fill='white');c=lookup.get((s,v['width'],v['height'],p['id']))
    if c:
     with Image.open(out/c['file']) as im:im=im.convert('RGB');im.thumbnail((w,h));sheet.paste(im,(x,y+28))
    else:draw.text((x+8,y+110),'No corresponding reference still',fill='#a0aab4')
  sheet.save(out/f'contact-{group}-{v["width"]}x{v["height"]}.webp',format='WEBP',lossless=True,method=2)
movie_rows=[]
for action in actions:
 cells=[]
 for source in ['baseline','reference','phase0']:
  c=next((c for c in movies if c['source']==source and c['action']==action),None)
  cells.append('<td>'+('<a href="'+html.escape(c['file'])+'"><img loading="lazy" width="500" src="'+html.escape(c['file'])+'"></a>' if c else 'No reference expansion weapon')+'</td>')
 movie_rows.append('<tr><th>'+action+'</th>'+''.join(cells)+'</tr>')
(out/'motion-contact-sheet.html').write_text('<!doctype html><meta charset="utf-8"><title>Iron Vow motion baseline</title><style>'+styles+'</style><h1>Real action filmstrips</h1><p>16 frames per strip. Game attacks use real shoot/move/destruction handling; the reference uses Rig Bench fireFX/meleeUpdate and real War applyDamage for the hit reaction. Reference walking is its treadmill demonstration. No native device performance claim.</p><table><tr><th>Action</th><th>v98 baseline</th><th>3D reference</th><th>Phase 0</th></tr>'+''.join(movie_rows)+'</table>')
report={'status':'complete','still_count':len(records),'filmstrip_count':len(movies),'viewports':plan['viewports'],'presets':plan['presets'],'encoding':'Lossless WebP; every image was decoded and compared byte-for-byte with the original PNG RGBA pixels. Original PNG file hashes are retained.',
 'source_notes':{'baseline':'853f1e7510dc2ca5940f09575efea737cfe2ea5a / deployed v98','phase0_runtime_tree':'2f643d767b4b7b4ca3bc5c3bf67f6f97add404f1','reference_main':'973567c5726a836e827fbe85b3b34675a769fc0b','reference_bench_note':'Reference baseline is frozen at PR #8; PR #9 follow-up evidence is stored separately.', 'runtime_unchanged_during_collection':'Subsequent commits change QA, inventory and evidence only; each original run manifest retains its source and document hashes.'},
 'limits':['Software WebGL correctness only. iPad Safari/Chrome fps, p95 and context-loss session remain untested.','The reference hit strip exposes existing War applyDamage through a temporary QA API and holds/hides unrelated actors; the reference source file is unchanged.','The current renderer wreck has faint embers after two seconds, not the future Phase 2 14-second burn. This gap is preserved.',
 'This establishes the current renderer baseline; it does not certify the future shared scene, 640px images, planted feet, true aim or zero anomalies.'],
 'captures':records,'filmstrips':movies,'raw_runs':list(raw)}
(out/'manifest.json.tmp').write_text(json.dumps(report,indent=2)+'\n')
(out/'manifest.json.tmp').replace(out/'manifest.json')
print('Assembled',len(records),'stills and',len(movies),'filmstrips in',out,flush=True)
