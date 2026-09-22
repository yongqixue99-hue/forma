import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {verifyBetaVideos} from './beta-video-integrity.mjs';
const config=JSON.parse(await fs.readFile('wrangler.jsonc','utf8')),root=path.resolve(config.assets.directory),files=[];
async function walk(directory){for(const entry of await fs.readdir(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);assert.ok(!entry.isSymbolicLink(),`Unexpected symlink: ${file}`);if(entry.isDirectory())await walk(file);else files.push({path:path.relative(root,file),bytes:(await fs.stat(file)).size});}}
await walk(root);
assert.ok(files.length<=20000,'Workers Free allows at most 20,000 static assets.');
assert.ok(files.every(f=>f.bytes<=25*1024*1024),'An asset exceeds 25 MiB.');
assert.ok(files.every(f=>!/^((src|qa|output|node_modules)\/|\.env)/.test(f.path)),'Source-only directories should not be served.');
for(const name of ['index.html','404.html','_headers','forma/work-player.js','forma/beta/en/public-revenue.html','data/nist-flowrate.csv'])assert.ok(files.some(f=>f.path===name),`Missing ${name}`);
assert.equal(config.assets.not_found_handling,'404-page');
await verifyBetaVideos(root);
console.log(JSON.stringify({passed:true,mode:'local preflight; not deployed',files:files.length,totalBytes:files.reduce((n,f)=>n+f.bytes,0),largest:files.sort((a,b)=>b.bytes-a.bytes).slice(0,3),hosting:'Cloudflare Workers Static Assets'},null,2));
