import test from 'node:test';
import assert from 'node:assert/strict';
import {setLocale} from '../../src/forma/locale.js';
import {getExample} from '../../src/forma/catalog.js';
import {getDataGuide,agentBrief,workDataInstructions} from '../../src/forma/data-guides.js';
import {newWork,makeStep,cleanWork,morphReady} from '../../src/forma/work-model.js';
import {workAgentBrief} from '../../src/forma/work-export.js';
import {importedTableDocument} from '../../src/forma/table-data.js';
import {refinementAgentGuide} from '../../src/forma/refinement-brief.js';

const ids=['choropleth','geomap','splom','clusterheatmap','pcaloadings','acf','pacf','imr'];
const contracts={choropleth:['ADM0_A3','geoNaturalEarth1','geoPath(projection)','ne_110m_admin_0_countries.geojson'],geomap:['sqrt(value/max(value))','geoNaturalEarth1','Natural Earth'],splom:['sample','variable','group'],clusterheatmap:['UPGMA','Ward'],pcaloadings:['loading1²+loading2²≤1','[-1,1]'],acf:['ACF(k)=Σ','n−k','[-1,1]'],pacf:['Levinson–Durbin','V←V(1−α[k]²)','ACF(k)=Σ'],imr:['MR[t]=|value[t]−value[t−1]|','1.128','3.267']};

test('Chinese and English work briefs use the same native field and method guide as individual chart briefs',()=>{
 try{for(const lang of ['zh-CN','en']){
  setLocale(lang);
  for(const id of ids){
   const doc=getExample(id),step=makeStep({doc}),guide=getDataGuide(id),single=agentBrief(doc),work=newWork([{doc}]),brief=workAgentBrief(work);
   // Test the shared native rules even if a later compatible morph encoding is
   // registered for this template. Native-only work steps must include them.
   const section=workDataInstructions([step],{nativeTemplates:[id]});
   for(const note of guide.notes){assert.ok(single.includes(note),`${lang} ${id}: chart guide note`);assert.ok(section.includes(note),`${lang} ${id}: work guide note`);if(!morphReady(step))assert.ok(brief.includes(note),`${lang} ${id}: native work integration`);}
   for(const f of guide.fields)assert.ok(section.includes(`${f.key}: ${f.description} (${f.format})`),`${lang} ${id}: ${f.key}`);
   for(const token of contracts[id])assert.ok(section.includes(token),`${lang} ${id}: ${token}`);
   if(lang==='en')assert.doesNotMatch(section,/[\u3400-\u9fff]/,`${id}: authored method/field instructions must be English`);
  }
 }}finally{setLocale('zh-CN');}
});

test('map briefs include an external real boundary source without promising that JSON contains geometry',()=>{
 for(const lang of ['zh-CN','en']){setLocale(lang);for(const id of ['choropleth','geomap']){
  const brief=workAgentBrief(newWork([{doc:getExample(id)}]));
  assert.match(brief,/https:\/\/raw\.githubusercontent\.com\/nvkelso\/natural-earth-vector\/master\/geojson\/ne_110m_admin_0_countries\.geojson/);
  assert.match(brief,/https:\/\/www\.naturalearthdata\.com\/about\/terms-of-use\//);
  assert.match(brief,/fitExtent\(plotExtent, \{type:"Sphere"\}\)/);
  assert.match(brief,lang==='en'?/never infer longitude\/latitude from names or code strings/:/不能从地区名称或代码字符串猜测经纬度/);
  assert.match(brief,lang==='en'?/disclose the missing dependency instead of inventing polygons/:/说明缺少依赖，不能虚构多边形/);
 }}setLocale('zh-CN');
});

test('user data, original headers, unassigned columns, IDs and tiny values remain unchanged in both language briefs',()=>{
 setLocale('zh-CN');const base=getExample('choropleth');base.title='暂停，不要翻译';base.source={type:'user',name:'研究组的原始记录'};
 const headers=['地区代码','地区名称','实际比率','原始备注'];
 const table={headers,rows:[['USA','美国','0.000000031','保留'],['CAN','加拿大','','未采集'],['BRA','巴西','0','真实零值']]};
 const doc=importedTableDocument(base,table,[0,1,2]).doc,work=newWork([{doc}],'我的研究');
 const before=structuredClone(work);
 try{for(const lang of ['zh-CN','en']){
  setLocale(lang);const brief=workAgentBrief(work),payload=JSON.parse(brief.match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.deepEqual(payload,cleanWork(work));assert.deepEqual(payload.steps[0].doc.tableInput.headers,headers);
  assert.deepEqual(payload.steps[0].doc.data.map(r=>r.value),[3.1e-8,null,0]);
  assert.deepEqual(payload.steps[0].doc.data,work.steps[0].doc.data);assert.equal(payload.steps[0].doc.title,base.title);assert.equal(payload.steps[0].doc.source.name,doc.source.name);
  assert.deepEqual(work,before);
 }}finally{setLocale('zh-CN');}
});

test('work schema instructions deduplicate repeated templates and avoid native algorithms for overriding morph views',()=>{
 const imr=getExample('imr'),work=newWork([{doc:imr},{doc:imr},{doc:getExample('volcano')}]);
 const brief=workAgentBrief(work);assert.equal((brief.match(/### imr ·/g)||[]).length,1);assert.match(brief,/第 1, 2 步的原始数据表/);
 for(const note of getDataGuide('volcano').notes)assert.ok(brief.includes(note),'existing native statistical rules are shared too');
 const step=makeStep({doc:getExample('errorbar'),view:'sample-violin'}),section=workDataInstructions([step]);
 assert.match(section,/view/);assert.match(section,/group:/);assert.ok(!section.includes(getDataGuide('errorbar').notes[0]));
});

test('legacy works without record IDs retain values and provenance through brief generation',()=>{
 const work=newWork([{doc:getExample('imr')}]);work.steps[0].doc.data.forEach(r=>delete r._id);work.steps[0].doc.title='旧作品';
 const before=structuredClone(work),payload=JSON.parse(workAgentBrief(work).match(/```json\n([\s\S]*?)\n```/)[1]);
 assert.deepEqual(work,before);assert.deepEqual(payload.steps[0].doc.data.map(({_id,...r})=>r),before.steps[0].doc.data);
 assert.ok(payload.steps[0].doc.data.every(r=>typeof r._id==='string'));assert.deepEqual(payload.steps[0].doc.source,before.steps[0].doc.source);
});

test('work briefs select rank, ridge and cluster rules only for applicable encodings',()=>{
 try{for(const lang of ['zh-CN','en']){
  setLocale(lang);const plain=workAgentBrief(newWork([{doc:getExample('column')}]));
  for(const view of ['series-rank','sample-ridge','matrix-clustered'])assert.ok(!plain.includes(view));
  for(const [template,view]of [['race','series-rank'],['ridges','sample-ridge'],['clusterheatmap','matrix-clustered']]){
   const brief=workAgentBrief(newWork([{doc:getExample(template),view}]));assert.ok(brief.includes(view));
   assert.match(brief,view==='series-rank'?/1、1、3|rank\s*=\s*1|competition rank/:view==='sample-ridge'?/Gaussian|高斯/:/UPGMA/);
  }
 }}finally{setLocale('zh-CN');}
});
