import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {setLocale,uiText,uiMessage,uiMarkup} from '../../src/forma/locale.js';
setLocale('en');
const {catalog,getExample}=await import('../../src/forma/catalog.js');
const {validateDocument}=await import('../../src/forma/data.js');
const {getDataGuide,agentBrief}=await import('../../src/forma/data-guides.js');
const {presetWork,workReport,cleanWork}=await import('../../src/forma/work-model.js');
const {scenarioPresets}=await import('../../src/forma/scenario-presets.js');
const {workAgentBrief,workHTML}=await import('../../src/forma/work-export.js');
const {standaloneHTML,agentTemplateHTML}=await import('../../src/forma/export.js');
const {importedTableDocument,cellsToDocument,documentCells}=await import('../../src/forma/table-data.js');
const {fieldLabel}=await import('../../src/forma/data-contract.js');
const han=/[\u3400-\u9fff]/;
test('translations preserve all placeholders and have no untranslated authored Chinese values',()=>{
 const d=JSON.parse(readFileSync(new URL('../../src/forma/locales/en.json',import.meta.url)));
 for(const[k,v]of Object.entries(d)){
  const slots=s=>[...s.matchAll(/\{(\d+)\}/g)].map(m=>m[1]).sort();assert.deepEqual(slots(v),slots(k),k);
  // Language names are deliberately bilingual; user content is never here.
  if(han.test(v))assert.match(v,/中文|语言/);
 }
});
test('only authored text translates; matching user titles, original headers, HTML and placeholders stay opaque',()=>{
 assert.equal(uiText('播放'),'Play');assert.equal(uiText('暂停'),'Pause');
 const user='播放 <b title="暂停">来源 {3}</b> $&';
 assert.equal(uiMessage`编辑 ${user}`,`Edit ${user}`);
 assert.equal(uiMarkup`<button title="播放">${user}</button>`,`<button title="Play">${user}</button>`);
 assert.equal(uiMessage`查看 ${'对象'}的 ${7} 条原始记录`,'View 7 original records for 对象');
 setLocale('zh-CN');assert.equal(uiText('播放'),'播放');setLocale('en');
});
test('all English demo schemas preserve original fields, types, record counts and every numeric value',()=>{
 const baseline=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',`const {catalog,getExample}=await import('./src/forma/catalog.js');console.log(JSON.stringify(catalog.map(t=>({id:t.id,fields:t.fields.map(f=>f.slice(0,2)),doc:getExample(t.id)}))));`],{cwd:process.cwd(),encoding:'utf8'}));
 const numbers=v=>typeof v==='number'?v:Array.isArray(v)?v.map(numbers):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,numbers(x)])):null;
 for(const t of catalog){const en=getExample(t.id),zh=baseline.find(b=>b.id===t.id);assert.equal(validateDocument(en).valid,true,t.id+': '+validateDocument(en).errors.join('; '));assert.deepEqual(t.fields.map(f=>f.slice(0,2)),zh.fields,t.id);assert.deepEqual(numbers(en),numbers(zh.doc),t.id);assert.equal(han.test(t.name+t.limit),false,t.id);assert.equal(han.test(getDataGuide(t.id,en).rowMeaning),false,t.id);for(const f of t.fields)assert.equal(han.test(fieldLabel(t.id,f[0])),false,t.id+':'+f[0]);}
});
test('all fresh English scene presets retain valid entity IDs and work eligibility',()=>{
 for(const p of [...scenarioPresets,{id:'classic'},{id:'independent'}]){const work=presetWork(p.id),r=workReport(work);assert.equal(r.valid,true,p.id+': '+r.message);assert.equal(han.test(work.name),false,p.id);assert.deepEqual(cleanWork(JSON.parse(JSON.stringify(work))),cleanWork(work));}
});
test('English scene titles preserve the measurement and independent periods',()=>{
 const monthly=presetWork('monthly');assert.ok(monthly.steps.every(s=>s.doc.title==='Monthly sales'&&s.doc.unit==='CNY 10k'));assert.match(monthly.steps[0].doc.subtitle,/May/);
 const independent=presetWork('independent');assert.notEqual(independent.steps[0].doc.title,independent.steps[1].doc.title);assert.match(independent.steps[2].doc.title,/deliver/i);
 assert.match(presetWork('classic').steps[0].doc.title,/six topics/i);
});
test('English import retains Chinese headers, supplied text, precision and missing observations',()=>{
 const base=getExample('singleline');base.title='播放';base.source={type:'user',name:'用户自己的数据'};
 const table={headers:['月份','销售额','原始备注'],rows:[['甲','0.000000031','不要翻译'],['乙','0','零'],['丙','','缺失']]};
 const result=importedTableDocument(base,table,[0,1]).doc;
 assert.deepEqual(result.tableInput.headers,table.headers);assert.equal(result.title,'播放');assert.equal(result.source.name,'用户自己的数据');assert.deepEqual(result.data.map(r=>r.value),[3.1e-8,0,null]);assert.deepEqual(result.data.map(r=>r.period),['甲','乙','丙']);
 const brief=agentBrief(result,{});assert.match(brief,/Agent|production/);assert.match(brief,/不要翻译/);assert.match(brief,/销售额/);assert.match(brief,/3.1e-8/);
});
test('English Agent brief and offline HTML preserve full work and explicitly set locale before engine evaluation',()=>{
 const w=presetWork('monthly');w.name='我的研究';w.steps[0].doc.title='暂停';const before=JSON.stringify(w),brief=workAgentBrief(w);assert.match(brief,/Agent production brief/);assert.match(brief,/Persistent _id/);assert.match(brief,/我的研究/);assert.equal(JSON.stringify(w),before);
 const match=brief.match(/```json\n([\s\S]*?)\n```/);assert.deepEqual(JSON.parse(match[1]),cleanWork(w));
 for(const html of [workHTML(w,'window.engine=true;'),standaloneHTML(w.steps[0].doc,{},'window.engine=true;'),agentTemplateHTML(w.steps[0].doc,{},'window.engine=true;')]){
  assert.match(html,/<html lang="en">/);assert.ok(html.indexOf('__FORMA_LOCALE__="en"')<html.indexOf('window.engine=true'));assert.match(html,/暂停/);
 }
});

test('English cell errors use concise field labels or the unchanged imported header',()=>{
 const base=getExample('column'),cells=documentCells(base);cells[0][1]='invalid';
 assert.match(cellsToDocument(base,cells).errors[0].message,/Row 1.*Value/);
 assert.ok(cellsToDocument(base,cells).errors[0].message.length<180);
 const imported=importedTableDocument(base,{headers:['项目','实测浓度'],rows:[['A','1']]},[0,1]).doc;
 const issue=cellsToDocument(imported,[['A','invalid']]).errors[0];assert.match(issue.message,/实测浓度/);assert.equal(issue.row,0);assert.equal(issue.col,1);
});


test('new morph demos preserve the named measurements and interval meaning in English',()=>{
 const spatial=getExample('scatter3d');assert.equal(spatial.axes.x,'Production time / h');assert.equal(spatial.axes.y,'Readings / thousand views');assert.equal(spatial.axes.z,'Read-through rate / %');assert.deepEqual([...new Set(spatial.data.map(r=>r.group))],['Long-form','Video','Courses']);assert.equal(spatial.data[0].label,'Project 1');
 assert.equal(getExample('ribbon').intervalLabel,'Synthetic bounds; not confidence intervals');assert.equal(getExample('trajectory').axes.x,'Average reading time / min');assert.equal(getExample('heatmap').data[0].row,'Monday');
});
