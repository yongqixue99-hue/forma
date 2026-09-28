import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {unzipSync,strFromU8} from 'fflate';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {chartUseCases,recommendationGoals} from '../../src/forma/chart-use-cases.js';
import {validateDocument} from '../../src/forma/data.js';
import {stepEligibility,stepView} from '../../src/forma/work-model.js';
import {setLocale} from '../../src/forma/locale.js';
const root=new URL('../../public/forma/',import.meta.url),read=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
test('published contracts preserve both language examples, all fields, native limits and valid alternative links',async()=>{
 const directory=await read('chart-recommendations.json');assert.equal(directory.chartCount,catalog.length);
 assert.deepEqual(directory.charts.map(c=>c.id),catalog.map(t=>t.id));
 for(const t of catalog){
  const p=chartUseCases[t.id],r=await read(`chart-guides/${t.id}.json`);assert.ok(recommendationGoals[p.goal]);
  for(const lang of ['en','zh-CN']){
   const d=r.locales[lang];assert.ok(d.contract.rowMeaning);assert.ok(d.contract.limits);
   assert.deepEqual(d.contract.fields.map(f=>[f.key,f.type]),t.fields.map(f=>f.slice(0,2)));
   assert.ok(validateDocument(d.exampleDocument).valid,`${t.id}/${lang}`);
   for(const a of d.alternatives)assert.ok(a.id!==t.id&&catalog.some(t=>t.id===a.id));
   assert.equal(d.question,p.question[lang]);
   if(lang==='en')assert.doesNotMatch(JSON.stringify(d),/[\u3400-\u9fff]/);
  }
 }
});
test('goal shortlists partition the live catalog without duplicate or orphan chart IDs',async()=>{
 for(const lang of ['en','zh-CN']){
  const ids=[];for(const goal of Object.keys(recommendationGoals)){
   const g=await read(`recommendations/${lang}/${goal}.json`);assert.ok(g.charts.length);
   for(const t of g.charts){assert.equal(chartUseCases[t.id].goal,goal);assert.ok(t.question);ids.push(t.id);}
  }assert.deepEqual(ids.sort(),catalog.map(t=>t.id).sort());
 }
});
test('contract examples retain meanings of interval definitions, axes and repeated measurements',async()=>{
 for(const id of ['interval','ribbon','paired','blandaltman','likert','acf','pcaloadings','xy',...catalog.filter(t=>t.edition>=11).map(t=>t.id)]){
  const d=(await read(`chart-guides/${id}.json`)).locales.en.exampleDocument;
  for(const [key,value]of Object.entries(d))if(!['data','title','subtitle'].includes(key))assert.doesNotMatch(JSON.stringify(value),/Item \d+/,`${id}.${key}`);
 }
});
test('signed comparison remains valid but an example morph candidate is rechecked against new data',async()=>{
 const d=(await read('chart-guides/bar.json')).locales.en.exampleDocument;d.data=[{label:'North',value:80},{label:'West',value:-12},{label:'East',value:0}];
 assert.ok(validateDocument(d).valid);assert.equal(validateDocument({...d,template:'donut'}).valid,false);
 assert.equal(stepEligibility({doc:d,options:{}},'donut').valid,false);
 assert.equal(stepEligibility({doc:d,options:{}},stepView({doc:d})).valid,true);
});
test('summary estimates cannot be substituted for raw distributions, and incomplete matrices stay invalid',async()=>{
 const d=(await read('chart-guides/interval.json')).locales.en.exampleDocument;
 d.data=[{label:'Group A',estimate:12,low:9,high:15},{label:'Group B',estimate:18,low:13,high:23},{label:'Group C',estimate:16,low:14,high:18}];
 assert.ok(validateDocument(d).valid);assert.equal(validateDocument({...d,template:'violin'}).valid,false);
 const matrix=(await read('chart-guides/heatmap.json')).locales.en.exampleDocument;matrix.data.pop();assert.equal(validateDocument(matrix).valid,false);
});
test('skill ZIP is self-contained and contains the canonical website guide, without project/user files',async()=>{
 const zip=unzipSync(await readFile(new URL('skills/forma-charts.zip',root)));
 assert.deepEqual(Object.keys(zip).sort(),['SKILL.md','agents/openai.yaml','references/configuration.md','references/selection.md','references/website.md','scripts/agent-api.mjs','scripts/catalog.py','scripts/configure.mjs'].map(p=>'forma-charts/'+p).sort());
 assert.equal(strFromU8(zip['forma-charts/references/website.md']),await readFile(new URL('../../src/forma/guides/agent.en.md',import.meta.url),'utf8'));
 const entry=strFromU8(zip['forma-charts/SKILL.md']);
 for(const [,relative]of entry.matchAll(/\]\((references\/[^)]+)\)/g))assert.ok(zip['forma-charts/'+relative]);
});
