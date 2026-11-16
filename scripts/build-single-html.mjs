import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const destination=resolve(process.argv[2]||resolve(root,'dist/Product-Quest.html'));
let html=await readFile(resolve(root,'index.html'),'utf8');
// The offline build must never request analytics or external runtime assets.
html=html.replace(/<script\b[^>]*\bsrc=["']https?:\/\/[^"']+["'][^>]*>\s*<\/script>/gi,'');
for(const match of [...html.matchAll(/<script\s+src="([^"]+)"\s*><\/script>/g)]){
  const file=resolve(root,match[1].split('?')[0]);
  if(relative(root,file).startsWith('..'))throw new Error('Script outside source directory');
  const js=(await readFile(file,'utf8')).replace(/<\/script/gi,'<\\/script');
  html=html.replace(match[0],()=>`<script>\n/* ${match[1].split('?')[0]} */\n${js}\n</script>`);
}
for(const match of [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)]){
  const css=await readFile(resolve(root,match[1].split('?')[0]),'utf8');html=html.replace(match[0],()=>`<style>\n${css}\n</style>`);
}
if(/<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(html))throw new Error('External runtime asset remains');
await mkdir(dirname(destination),{recursive:true});await writeFile(destination,html);
console.log(`${destination} (${(Buffer.byteLength(html)/1024/1024).toFixed(2)} MiB)`);
