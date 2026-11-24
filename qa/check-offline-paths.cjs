const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {join}=require('node:path');
// Load only the packager's reader functions; fake files keep this check small.
const python=String.raw`
import ast, re, sys
from pathlib import Path
from urllib.parse import urlsplit
source=Path(sys.argv[1]).read_text()
tree=ast.parse(source)
functions=[node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name in ('stylesheet','script')]
assert len(functions)==2
files={'style.css':'@import url("fonts.css?rev=2"); .hero{background:url(assets/pic.webp)}',
       'fonts.css':'body{color:red}',
       'rig-bench/workbench.js':'<a href="rig-bench/vyzov.html">Vyzov</a>',
       'game.js':'<a href="rig-bench/index.html">bench</a>'}
class FakePath:
 def __truediv__(self, path):
  assert path in files, path
  return self.__class__(path)
 def __init__(self, path=''): self.path=path
 def read_text(self): return files[self.path]
namespace={'dist':FakePath(), 're':re, 'urlsplit':urlsplit, 'assets':{'assets/pic.webp':'data:image/example'}, 'site':'https://example.test/'}
exec(compile(ast.Module(body=functions,type_ignores=[]),sys.argv[1],'exec'),namespace)
css=namespace['stylesheet']('style.css?rev=1')
assert 'body{color:red}' in css and 'data:image/example' in css, css
js=namespace['script']('game.js?rev=3')
assert 'https://example.test/rig-bench/index.html' in js, js
assert 'https://example.test/rig-bench/vyzov.html' in namespace['script']('rig-bench/workbench.js')
print('PASS offline cache-busted CSS and script paths')
`;
const result=spawnSync('python3',['-c',python,join(__dirname,'../tools/package_offline.py')],{encoding:'utf8'});
assert.equal(result.status,0,result.stderr || result.stdout);
process.stdout.write(result.stdout);
