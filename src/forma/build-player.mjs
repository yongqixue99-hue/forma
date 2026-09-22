import { build } from 'vite';
import { fileURLToPath } from 'node:url';
await build({configFile:false,publicDir:false,build:{lib:{entry:fileURLToPath(new URL('./morph-sequence-entry.js',import.meta.url)),name:'FormaMorphSequence',formats:['iife'],fileName:()=> 'morph-sequence-player.js'},outDir:'public/forma',emptyOutDir:false,copyPublicDir:false,minify:true}});
await build({configFile:false,publicDir:false,build:{lib:{entry:fileURLToPath(new URL('./player.js',import.meta.url)),name:'FormaPlayer',formats:['iife'],fileName:()=> 'player.js'},outDir:'public/forma',emptyOutDir:false,copyPublicDir:false,minify:true}});

await build({configFile:false,publicDir:false,build:{lib:{entry:fileURLToPath(new URL('./morph-player.js',import.meta.url)),name:'FormaMotion',formats:['iife'],fileName:()=> 'morph-player.js'},outDir:'public/forma',emptyOutDir:false,copyPublicDir:false,minify:true}});

await build({configFile:false,publicDir:false,build:{lib:{entry:fileURLToPath(new URL('./canvas-player.js',import.meta.url)),name:'FormaCanvas',formats:['iife'],fileName:()=> 'canvas-player.js'},outDir:'public/forma',emptyOutDir:false,copyPublicDir:false,minify:true}});

await build({configFile:false,publicDir:false,build:{lib:{entry:fileURLToPath(new URL('./work-player-entry.js',import.meta.url)),name:'FormaWorkPlayer',formats:['iife'],fileName:()=> 'work-player.js'},outDir:'public/forma',emptyOutDir:false,copyPublicDir:false,minify:true}});

// A work carries only the renderers it uses. Mixed morph families have exact
// union profiles; native templates retain the full compatible renderer.
const {readFile,writeFile}=await import('node:fs/promises');
const {createHash}=await import('node:crypto');
const modules={single:['MorphChart','morph'],series:['SeriesMorphChart','series-morph'],paired:['PairedMorphChart','paired-morph'],hierarchy:['HierarchyMorphChart','hierarchy-morph'],scientific:['ScientificMorphChart','scientific-morph']};
const registry=fileURLToPath(new URL('./work-renderers.js',import.meta.url));
const directory=fileURLToPath(new URL('.',import.meta.url));
const groups=['series','paired','hierarchy','scientific'],profiles=[];
for(let mask=0;mask<16;mask++){
  const families=['single',...groups.filter((_,i)=>mask&(1<<i))],file=`work-player-${families.join('-')}.js`;
  const source=families.map(f=>`import {${modules[f][0]}} from ${JSON.stringify(`${directory}${modules[f][1]}.js`)};`).join('\n')+`\nexport const workRenderers={${families.map(f=>`${f}:${modules[f][0]}`).join(',')}};`;
  await build({configFile:false,publicDir:false,logLevel:'warn',plugins:[{name:'work-renderer-profile',enforce:'pre',load(id){if(id===registry)return source;}}],build:{lib:{entry:fileURLToPath(new URL('./work-player-entry.js',import.meta.url)),name:'FormaWorkPlayer',formats:['iife'],fileName:()=>file},outDir:'public/forma',emptyOutDir:false,copyPublicDir:false,minify:true}});
  const data=await readFile(`public/forma/${file}`);profiles.push({file,families,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
const full=await readFile('public/forma/work-player.js');profiles.push({file:'work-player.js',families:['native',...Object.keys(modules)],bytes:full.length,sha256:createHash('sha256').update(full).digest('hex')});
await writeFile('public/forma/work-runtimes.json',JSON.stringify({version:1,profiles},null,2)+'\n');
console.log('Work renderer profiles:',profiles.map(p=>`${p.families.join('+')}: ${Math.round(p.bytes/1024)} KiB`).join('\n'));
const {buildAgentRuntimes}=await import('./build-agent-runtimes.mjs');
await buildAgentRuntimes();
