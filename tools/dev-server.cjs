const http=require('node:http');
const fs=require('node:fs');
const {stat}=require('node:fs/promises');
const path=require('node:path');

const root=path.resolve(__dirname,'../dist');
const port=Number(process.env.IRON_VOW_PORT??5173),host=process.env.IRON_VOW_HOST||'127.0.0.1';
if(!Number.isInteger(port)||port<0||port>65535)throw Error('IRON_VOW_PORT must be between 0 and 65535.');
const mime={
 '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
 '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
 '.webp':'image/webp','.gif':'image/gif','.glb':'model/gltf-binary','.gltf':'model/gltf+json',
 '.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf',
 '.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav','.mp4':'video/mp4',
 '.wasm':'application/wasm','.txt':'text/plain; charset=utf-8'
};
const server=http.createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return}
 try{
  const url=new URL(req.url,'http://localhost');
  let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  let info=await stat(file);
  if(info.isDirectory()){
   if(!url.pathname.endsWith('/')){
    res.writeHead(308,{Location:url.pathname+'/'+url.search,'Cache-Control':'no-store'}).end();return;
   }
   file=path.join(file,'index.html');info=await stat(file);
  }
  if(!info.isFile()){res.writeHead(404).end();return}
  res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream',
   'Content-Length':info.size,'Cache-Control':'no-store'});
  if(req.method==='HEAD'){res.end();return}
  fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
 }catch(error){res.writeHead(error instanceof URIError?400:404).end()}
});
server.on('error',error=>{console.error(error.message);process.exitCode=1});
server.listen(port,host,()=>console.log('Iron Vow: http://'+host+':'+server.address().port));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
