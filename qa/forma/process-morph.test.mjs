import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getExample} from '../../src/forma/catalog.js';
import {withRecordIds,recordId} from '../../src/forma/data-identity.js';
import {imr10} from '../../src/forma/volume10-data.js';
import {processDocument,processEligibility,processCompatibility,processBounds,processViews} from '../../src/forma/process-rules.js';
import {layoutProcess,interpolateProcessMark,processMarkOpacity} from '../../src/forma/process-morph.js';
import {processRecords} from '../../src/forma/process-presets.js';
import {processAgentGuide} from '../../src/forma/process-brief.js';
import {formatNumber} from '../../src/forma/number-format.js';
const doc=()=>processDocument(withRecordIds(getExample('imr')));
const near=(a,b)=>assert.ok(Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);

test('process uses the native estimator with exact adjacent identities and no first MR',()=>{
 const d=doc();d.data=d.data.slice(0,5);[10,12,12,9,11].forEach((v,i)=>d.data[i].value=v);
 const s=imr10(d.data),l=layoutProcess(d,'process-imr');
 assert.deepEqual(l.statistics,s);assert.deepEqual(s.moving,[null,2,0,3,2]);near(s.mrMean,1.75);near(s.sigma,1.75/1.128);near(s.mrHigh,1.75*3.267);
 const observations=l.marks.filter(m=>m.role==='individual'),ranges=l.marks.filter(m=>m.role==='moving-range');
 assert.equal(observations.length,5);assert.equal(ranges.length,4);assert.equal(ranges[1].value,0);assert.ok(ranges[1].opacity>0);
 for(let i=1;i<d.data.length;i++){assert.deepEqual(ranges[i-1].recordIds,[recordId(d.data[i-1]),recordId(d.data[i])]);assert.match(ranges[i-1].identity,/process-mr/);assert.ok(!ranges[i-1].editable);}
 assert.deepEqual(l.marks.find(m=>m.role==='moving-link').recordIds,d.data.slice(0,3).map(recordId));
 assert.ok(l.scales.individual.domain()[0]<=s.low&&l.scales.individual.domain()[1]>=s.high);assert.equal(l.scales.moving.domain()[0],0);assert.ok(l.scales.moving.domain()[1]>=s.mrHigh);
});

test('every original point and moving pair keeps its key across unfold, rename and label edits',()=>{
 const d=doc(),a=layoutProcess(d,'process-individual'),b=layoutProcess(d,'process-imr');assert.deepEqual(a.marks.map(m=>m.key).sort(),b.marks.map(m=>m.key).sort());
 assert.ok(a.marks.filter(m=>m.processPanel==='mr').every(m=>m.opacity===0));assert.equal(a.marks.filter(m=>m.role==='individual').length,d.data.length);
 const renamed=structuredClone(d);renamed.data.forEach((r,i)=>r.period=`采集 ${i+1}`);renamed.title='A renamed display title';
 assert.equal(processCompatibility(d,renamed),'');assert.deepEqual(new Map(layoutProcess(renamed,'process-imr').marks.map(m=>[m.key,m.points])),new Map(b.marks.map(m=>[m.key,m.points])));
 const bounds=processBounds(d);assert.ok(bounds.individual[0]<=Math.min(...d.data.map(r=>r.value)));assert.ok(bounds.individual[1]>=Math.max(...d.data.map(r=>r.value)));
});

test('order, input baseline, source, units and observation meaning require honest normal switching',()=>{
 const d=doc(),changed=f=>{const c=structuredClone(d);f(c);return c;};
 assert.match(processCompatibility(d,changed(c=>c.data.reverse())),/顺序|相邻/);
 assert.match(processCompatibility(d,changed(c=>c.data.splice(2,1))),/顺序|相邻/);
 assert.match(processCompatibility(d,changed(c=>c.data[3].value+=.01)),/基线/);
 assert.match(processCompatibility(d,changed(c=>{c.data[2].value+=1;c.data[3].value-=1;})),/基线/);
 assert.match(processCompatibility(d,changed(c=>c.unit='kg')),/单位|来源/);
 assert.match(processCompatibility(d,changed(c=>c.source.name='another process')),/单位|来源/);
 assert.match(processCompatibility(d,changed(c=>c.axes={x:'Batch',y:'Temperature'})),/指标|坐标/);
 assert.equal(processCompatibility(d,structuredClone(d)),'');
});

test('eligibility keeps missingness and source rows, including 300 measurements and scientific decimals',()=>{
 const d=doc(),bad=structuredClone(d);bad.data[2].value=null;const original=structuredClone(bad);assert.equal(processEligibility(bad,'process-imr').valid,false);assert.deepEqual(bad,original);
 const constant=structuredClone(d);constant.data.forEach(r=>r.value=3);assert.equal(processEligibility(constant,'process-individual').valid,false);
 const full=structuredClone(d);full.data=Array.from({length:300},(_,i)=>({_id:`record:${i}`,period:`${i+1}`,value:(2+Math.sin(i))*.00000001,row:i}));assert.equal(processEligibility(full,'process-imr').valid,true);
 const l=layoutProcess(full,'process-imr',370,260);assert.equal(l.marks.filter(m=>m.role==='individual').length,300);assert.equal(l.marks.filter(m=>m.role==='moving-range').length,299);
 assert.ok(l.marks.flatMap(m=>m.points.flat()).every(Number.isFinite));assert.ok(l.marks.every(m=>m.points.length===m.entrance.length));assert.ok(l.labels.filter(m=>m.small).some(m=>m.text!=='0'));
 assert.notEqual(formatNumber(l.statistics.mrMean),'0');assert.ok(l.marks.find(m=>m.role==='moving-range').tooltip.includes(formatNumber(l.statistics.moving[1])));
 full.data.push({_id:'record:300',period:'301',value:2,row:300});assert.equal(processEligibility(full,'process-imr').valid,false);assert.equal(full.data.length,301);
});

test('quarter geometry stages the upper panel and lower differences with exact reverse/repeated locations',()=>{
 const d=doc();for(const [from,to]of [['process-individual','process-imr'],['process-imr','process-individual']]){
  const a=layoutProcess(d,from),b=layoutProcess(d,to),am=new Map(a.marks.map(m=>[m.key,m]));
  const frames=[0,.25,.5,.75,1].map(q=>b.marks.map(m=>[m.key,interpolateProcessMark(am.get(m.key).points,am.get(m.key),m,q),processMarkOpacity(am.get(m.key),m,q)]));
  assert.notDeepEqual(frames[1],frames[3]);
  for(const m of b.marks){assert.deepEqual(interpolateProcessMark(am.get(m.key).points,am.get(m.key),m,0),am.get(m.key).points);assert.deepEqual(interpolateProcessMark(am.get(m.key).points,am.get(m.key),m,1),m.points);assert.deepEqual(interpolateProcessMark(am.get(m.key).points,am.get(m.key),m,.5),frames[2].find(f=>f[0]===m.key)[1]);}
  if(to==='process-imr'){const range=b.marks.find(m=>m.role==='moving-range'),old=am.get(range.key);assert.equal(processMarkOpacity(old,range,.25),0);assert.ok(processMarkOpacity(old,range,.75)>0);}
 }
});

test('presets and bilingual Agent instructions retain the shared native contract',()=>{
 const records=processRecords('process-variation');assert.deepEqual(records.map(s=>s.view),processViews.map(v=>v.id));assert.deepEqual(records[0].doc.data,records[1].doc.data);assert.equal(records[0].doc.template,'imr');assert.equal(records[0].dataGroup,records[1].dataGroup);assert.equal(records[0].doc.source.type,'demo');
 for(const en of [false,true]){const brief=processAgentGuide(en);for(const token of ['process-individual','process-imr','imr10','_id','1.128','3.267','MR[0]','period/value'])assert.ok(brief.includes(token));assert.match(brief,en?/undefined|zero-filled/:/未定义|不补零/);}
});
