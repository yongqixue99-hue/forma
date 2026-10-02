import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {selectWorkRuntime,workRendererFamily,loadWorkRuntime} from '../../src/forma/work-runtime.js';
import {deliveryWorks} from './delivery-fixtures.mjs';
import {cleanWork,presetWork} from '../../src/forma/work-model.js';
import {scenarioPresets} from '../../src/forma/scenario-presets.js';
const manifest=JSON.parse(await readFile(new URL('../../public/forma/work-runtimes.json',import.meta.url)));
test('all existing scenes select a renderer superset; the manifest describes actual smaller files',async()=>{
  for(const preset of scenarioPresets){const w=presetWork(preset.id),p=selectWorkRuntime(w,manifest.profiles);assert.ok(w.steps.every(s=>p.families.includes(workRendererFamily(s))),preset.id);}
  for(const p of manifest.profiles){const data=await readFile(new URL('../../public/forma/'+p.file,import.meta.url));assert.equal(data.length,p.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),p.sha256);}
  const cases=deliveryWorks(),native=selectWorkRuntime(cases.native,manifest.profiles),basic=selectWorkRuntime(cases.basic,manifest.profiles),full=manifest.profiles.find(p=>p.file==='work-player.js');
  assert.equal(native.file,'work-player-single-scientific.js');assert.deepEqual(cases.native.steps.map(workRendererFamily),['scientific','scientific']);assert.ok(native.bytes<full.bytes);assert.ok(basic.bytes<full.bytes*.65);
  const mixed=cleanWork({...cases.basic,steps:[cases.basic.steps[0],cases.series.steps[0],cases.samples.steps[0]]});const picked=selectWorkRuntime(mixed,manifest.profiles);assert.deepEqual(picked.families,['single','series','scientific']);
});
test('engine loading recovers from missing optimized assets and never posts source data',async()=>{
  const calls=[],w=deliveryWorks().basic;
  const source=await loadWorkRuntime(w,{base:'/sub/',fetcher:async(url,options)=>{calls.push([url,options]);return url.endsWith('work-runtimes.json')?new Response(JSON.stringify(manifest)):url.endsWith('work-player.js')?new Response('full runtime'):new Response('',{status:404});}});
  assert.equal(source,'full runtime');assert.equal(calls.length,3);assert.ok(calls.every(([url,options])=>url.startsWith('/sub/forma/')&&!options.body&&!options.method));
});
test('engine fetch cancellation cannot fall back or launch another request',async()=>{
  const signal=AbortSignal.abort();let calls=0;
  await assert.rejects(loadWorkRuntime(deliveryWorks().basic,{signal,fetcher:async()=>{calls++;throw new DOMException('Cancelled','AbortError');}}),{name:'AbortError'});assert.equal(calls,1);
});
