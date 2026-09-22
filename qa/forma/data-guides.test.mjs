import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {getDataGuide,agentBrief,parseAgentResult} from '../../src/forma/data-guides.js';

test('every template has a row explanation, typed fields and a complete round-trippable Agent example',()=>{
  for(const t of catalog){const guide=getDataGuide(t.id),original=getExample(t.id);assert.ok(guide.rowMeaning?.length>12,t.id);assert.deepEqual(guide.fields.map(f=>f.key),t.fields.map(f=>f[0]),t.id);assert.equal(guide.sampleSize,original.data.length);assert.ok(guide.sampleRows.length>0);assert.ok(guide.limit);for(const f of guide.fields)assert.ok(f.description&&f.format&&Object.hasOwn(f,'sample'),t.id);assert.deepEqual(parseAgentResult(JSON.stringify(guide.example),t.id),original);assert.ok(agentBrief(original).includes(JSON.stringify(original,null,2)),t.id);assert.deepEqual(getExample(t.id),original);}
});
test('novel chart tutorials preserve counting, measurement and statistical meanings',()=>{
  assert.match(getDataGuide('upset').rowMeaning,/排他交集/);assert.match(getDataGuide('upset').notes.join(' '),/\|/);assert.match(getDataGuide('volcano').notes.join(' '),/不能填 −log/);assert.match(getDataGuide('pca').notes.join(' '),/已经完成/);assert.match(getDataGuide('cohort').notes.join(' '),/active ÷ size/);assert.match(getDataGuide('gantt').notes.join(' '),/60 表示 60%/);assert.match(getDataGuide('singleline').fields[1].format,/表格留空/);
});
test('Agent import accepts complete JSON or one fence, retains all document parameters and never guesses a chart',()=>{
  const doc=getExample('upset');doc.title='三组集合交集';const text=JSON.stringify(doc);assert.deepEqual(parseAgentResult(text,'upset'),doc);assert.deepEqual(parseAgentResult('```json\n'+text+'\n```','upset'),doc);assert.deepEqual(parseAgentResult(JSON.stringify({format:'forma-project',version:1,doc,options:{palette:'mono'}}),'upset'),doc);
  assert.throws(()=>parseAgentResult(text,'column'),/template 必须是 column/);assert.throws(()=>parseAgentResult(JSON.stringify(doc.data),'upset'),/完整文档/);assert.throws(()=>parseAgentResult('说明：'+text,'upset'),/格式有误/);assert.throws(()=>parseAgentResult('','upset'),/先粘贴/);assert.throws(()=>parseAgentResult(' '.repeat(2000001),'upset'),/2 MB/);
  const wrong=structuredClone(doc);wrong.data[0].count='92';assert.throws(()=>parseAgentResult(JSON.stringify(wrong),'upset'),/有限数值/);wrong.data[0].count=0;assert.throws(()=>parseAgentResult(JSON.stringify(wrong),'upset'),/正整数/);assert.deepEqual(doc.data,getExample('upset').data);
});
