import {build} from 'vite';
import {copyFile,mkdir} from 'node:fs/promises';
await build({configFile:false,publicDir:false,build:{lib:{entry:new URL('./agent-api.js',import.meta.url).pathname,formats:['es'],fileName:()=> 'agent-api.mjs'},outDir:'public/forma',emptyOutDir:false,copyPublicDir:false,minify:true}});
await copyFile('public/forma/agent-api.mjs','skills/forma-charts/scripts/agent-api.mjs');
await copyFile('skills/forma-charts/references/configuration.md','public/forma/agent-api.md');
