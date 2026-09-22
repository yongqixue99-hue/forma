import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';

test('map validation and help bundle only the same-source region index, never geographic geometry',async()=>{
 const modules=new Set();
 await build({
  configFile:false,publicDir:false,logLevel:'silent',
  plugins:[{name:'audit-region-dependencies',generateBundle(){for(const id of this.getModuleIds())modules.add(id);}}],
  build:{write:false,lib:{entry:fileURLToPath(new URL('../../src/forma/volume10-data.js',import.meta.url)),name:'Volume10Data',formats:['iife']},minify:true},
 });
 assert.ok([...modules].some(id=>id.endsWith('/datasets/world-regions.json')),'the validation bundle must retain supported region codes');
 assert.ok(![...modules].some(id=>id.endsWith('/datasets/world-110m.json')),'map geometry must stay out of data validation and basic morph runtimes');
 const index=await readFile(new URL('../../src/forma/datasets/world-regions.json',import.meta.url));
 const world=JSON.parse(await readFile(new URL('../../src/forma/datasets/world-110m.json',import.meta.url)));
 const provenance=JSON.parse(await readFile(new URL('../../src/forma/datasets/world-110m-provenance.json',import.meta.url)));
 assert.deepEqual(JSON.parse(index),world.features.map(f=>f.properties),'the region index must have exactly the geometry codes and labels');
 assert.equal(createHash('sha256').update(index).digest('hex'),provenance.regionIndex.sha256);
 assert.ok(index.length<10_000,'the metadata-only region index must remain lightweight');
});
