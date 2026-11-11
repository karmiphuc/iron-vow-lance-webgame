from pathlib import Path
from hashlib import sha256
from PIL import Image, ImageDraw
import argparse, html, json, subprocess, shutil

parser=argparse.ArgumentParser(description='Assemble Phase 1 captures and compare lossless pixels to PNG originals.')
parser.add_argument('--captures-root',type=Path,required=True)
parser.add_argument('--out',type=Path,default=Path('design/phase1/reviewed-20261111'))
args=parser.parse_args(); out=args.out; out.mkdir(parents=True,exist_ok=True)
repo=Path(__file__).resolve().parent.parent
baseline=repo/'design/baseline/reviewed-20261111'
plan=json.loads(subprocess.check_output(['node','qa/capture.cjs','--plan','--phase1'],cwd=repo))
run=json.loads((args.captures_root/'manifest.json').read_text())
expected={(v['width'],v['height'],p['id']) for v in plan['viewports'] for p in plan['presets']}
actual={(c['viewport']['width'],c['viewport']['height'],c['preset']):c for c in run['captures']}
assert run['status']=='complete' and not run['failures'] and len(actual)==len(run['captures'])==144 and set(actual)==expected, 'Incomplete, duplicate, or failed capture run'
base=json.loads((baseline/'manifest.json').read_text())
lookup={(c['source'],c['viewport']['width'],c['viewport']['height'],c['preset']):c for c in base['captures']}
def digest(p):return sha256(p.read_bytes()).hexdigest()
records=[]
for n,(key,c) in enumerate(sorted(actual.items()),1):
 src=args.captures_root/c['file']; assert digest(src)==c['png_sha256']
 dest=out/Path(c['file']).with_suffix('.webp'); dest.parent.mkdir(parents=True,exist_ok=True)
 with Image.open(src) as im: rgba=im.convert('RGBA'); pixels=rgba.tobytes()
 rgba.save(dest,format='WEBP',lossless=True,method=2,exact=True)
 with Image.open(dest) as check: assert check.size==rgba.size and check.convert('RGBA').tobytes()==pixels
 records.append({**c,'file':str(dest.relative_to(out)),'original_png_sha256':c['png_sha256'],'sha256':digest(dest),'pixel_sha256':sha256(pixels).hexdigest(),'width':rgba.width,'height':rgba.height})
 if n%20==0:print('Converted and pixel-checked',n,'/ 144',flush=True)
result={(c['viewport']['width'],c['viewport']['height'],c['preset']):c for c in records}
styles='body{background:#101820;color:#e5e7eb;font:14px system-ui;margin:24px}table{border-collapse:collapse}td,th{padding:10px;border:1px solid #42505b;vertical-align:top}img{max-width:30vw;height:auto}a{color:#86d3f0}'
rows=[]
for v in plan['viewports']:
 for p in plan['presets']:
  key=(v['width'],v['height'],p['id']); cells=[]
  for source in ('baseline','reference-bench' if p['id']=='rig-bench' else 'reference-game'):
   c=lookup.get((source,*key)); path='../../baseline/reviewed-20261111/'+c['file'] if c else None
   cells.append('<td>'+('<a href="'+html.escape(path)+'"><img loading="lazy" width="400" src="'+html.escape(path)+'"></a>' if path else 'No matching reference preset')+'</td>')
  path=result[key]['file'];cells.append('<td><a href="'+html.escape(path)+'"><img loading="lazy" width="400" src="'+html.escape(path)+'"></a></td>')
  rows.append('<tr><th>'+html.escape(p['id'])+'<br>'+str(v['width'])+'×'+str(v['height'])+'</th>'+''.join(cells)+'</tr>')
(out/'contact-sheet.html').write_text('<!doctype html><meta charset="utf-8"><title>Iron Vow Phase 1 comparison</title><style>'+styles+'</style><h1>Baseline · reference · Phase 1</h1><p>144 candidate stills. Click an image for full size. Candidate lossless WebP pixels match original PNG captures. Eight live-frame views have no earlier matching preset.</p><table><tr><th>Preset</th><th>Deployed v98 baseline</th><th>Reference</th><th>Phase 1</th></tr>'+''.join(rows)+'</table>')
for v in plan['viewports']:
 for group,selected in [('live',[p for p in plan['presets'] if 'liveFrame' in p]),('interface',[p for p in plan['presets'] if p.get('page')]),('combat',[p for p in plan['presets'] if 'contract' in p and 'liveFrame' not in p and not(p.get('detailPart') or p.get('wreck'))]),('damage',[p for p in plan['presets'] if p.get('detailPart') or p.get('wreck')]),('bench',[p for p in plan['presets'] if p.get('path')])]:
  w,h=360,270;sheet=Image.new('RGB',(3*w,(h+28)*len(selected)+30),'#101820');draw=ImageDraw.Draw(sheet)
  for i,title in enumerate(['v98 baseline','reference','Phase 1']):draw.text((i*w+8,8),title,fill='white')
  for row,p in enumerate(selected):
   key=(v['width'],v['height'],p['id']); refs=[lookup.get(('baseline',*key)),lookup.get(('reference-bench' if p['id']=='rig-bench' else 'reference-game',*key)),result[key]]
   for col,c in enumerate(refs):
    x=col*w;y=30+row*(h+28);draw.text((x+8,y+7),p['id'],fill='white')
    if c:
     with Image.open((baseline if col<2 else out)/c['file']) as im: im=im.convert('RGB');im.thumbnail((w,h));sheet.paste(im,(x,y+28))
    else:draw.text((x+8,y+110),'No matching preset',fill='#a0aab4')
  sheet.save(out/f'contact-{group}-{v["width"]}x{v["height"]}.webp',format='WEBP',lossless=True,method=2)
(out/'capture-run.json').write_text(json.dumps(run,indent=2)+'\n')
for prior in args.captures_root.glob('prior-*.json'):shutil.copyfile(prior,out/prior.name)
report={'status':'complete','still_count':len(records),'viewports':plan['viewports'],'presets':plan['presets'],'encoding':'Lossless WebP decoded and compared byte-for-byte with original PNG RGBA pixels; original PNG hashes retained.','baseline_manifest':'../../baseline/reviewed-20261111/manifest.json','capture_run':'capture-run.json','prior_manifests':sorted(p.name for p in args.captures_root.glob('prior-*.json')),'source':run['source'],'dist_tree':run['dist_tree'],'capture_policy':run['candidate_advance_policy'],'limits':['Software WebGL correctness evidence; native iPad performance and context-loss session untested.'],'captures':records}
(out/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')
print('Assembled',len(records),'candidate stills in',out,flush=True)
