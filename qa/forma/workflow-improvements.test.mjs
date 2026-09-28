import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {getDataGuide} from '../../src/forma/data-guides.js';
import {recommendForTask,taskTable} from '../../src/forma/task-recommendations.js';
import {validate,configure} from '../../src/forma/agent-api.js';
import {layoutMorph} from '../../src/forma/morph.js';
import {layoutPaired} from '../../src/forma/paired-morph.js';
import {newWork} from '../../src/forma/work-model.js';
const request=()=>({kind:'forma-agent-request',version:1,name:'QA report',steps:[{chart:'bar',metadata:{title:'Changes',unit:'USD',source:'QA fixture'},table:{headers:['ID','Region','Amount','note'],rows:[['a','North',7.125,'keep'],['b','South',-3,'keep'],['c','West',0,'keep']],mapping:{label:1,value:2},idColumn:0}}]});
test('long category labels and period names remain complete in shared layouts',()=>{
 const names=['North America direct sales','Western Europe retail','East Asia partnerships','New market pilot'];
 const doc={title:'QA',unit:'USD',source:{name:'QA',type:'user'},data:names.map((label,i)=>({label,value:i-2}))};
 for(const [w,h]of [[1100,400],[620,850]]){const layout=layoutMorph(doc,'bars',w,h,{axisLabels:true,showLegend:true});for(const name of names){const l=layout.labels.find(l=>l.text===name);assert.ok(l);assert.equal(l.lines.join(' ').replace(/\s+/g,''),name.replace(/\s+/g,''));}assert.ok(layout.marks.every(m=>m.geometry.width>=0));}
});
test('task suggestions distinguish incompatible shares from signed values and preserve unknown mapping',()=>{
 const table=taskTable('Region,Amount\nA,-4\nB,3\nC,0');assert.equal(recommendForTask({goal:'comparison',table})[0].id,'bar');
 const shares=recommendForTask({goal:'composition',table,limit:120});assert.equal(shares.find(r=>r.id==='donut').status,'incompatible');
 const raw=taskTable('group,estimate,low,high\nA,2,1,3\nB,3,2,4');assert.notEqual(recommendForTask({goal:'distribution',table:raw,limit:120}).find(r=>r.id==='violin').status,'compatible');
});
test('API preserves zero, negatives, IDs, extra columns and input immutability',()=>{
 const r=request(),before=JSON.stringify(r),work=configure(r);assert.equal(JSON.stringify(r),before);assert.deepEqual(work.steps[0].doc.data.map(r=>r.value),[7.125,-3,0]);assert.deepEqual(work.steps[0].doc.data.map(r=>r._id),['a','b','c']);assert.equal(work.steps[0].doc.data[0]._extra[3],'keep');assert.deepEqual(configure(work),work);
});
test('API reports field paths, missing parameters, invalid numbers and incompatible morphs',()=>{
 for(const change of [r=>r.version=2,r=>r.steps[0].options={ratio:'unknown'},r=>delete r.steps[0].table.mapping.value,r=>r.steps[0].table.rows[0][2]='not a number']){const r=request();change(r);const report=validate(r);assert.equal(report.valid,false);assert.ok(report.errors[0].path);assert.equal(report.work,undefined);}
 const r=request();r.steps.push({...structuredClone(r.steps[0]),view:'donut',transition:'smooth',dataGroup:'same'});r.steps[0].dataGroup='same';assert.equal(validate(r).valid,false);
});
test('all current published chart contracts configure through both document and explicit table paths',()=>{
 for(const t of catalog){const doc=getExample(t.id),r={kind:'forma-agent-request',version:1,name:'QA '+t.id,steps:[{chart:t.id,document:doc}]};let report=validate(r);assert.ok(report.valid,t.id+': '+JSON.stringify(report.errors));
 r.steps=[{chart:t.id,metadata:{title:doc.title,subtitle:doc.subtitle,unit:doc.unit,source:doc.source.name},parameters:Object.fromEntries(getDataGuide(t.id).parameters.map(p=>[p.key,p.value])),table:{headers:t.fields.map(f=>f[0]),rows:doc.data.map(row=>t.fields.map(f=>row[f[0]])),mapping:Object.fromEntries(t.fields.map((f,i)=>[f[0],i]))}}];report=validate(r);assert.ok(report.valid,t.id+': '+JSON.stringify(report.errors));
 }
});

import {prepareReportUpdate,createNextReport,reportMatchOptions} from '../../src/forma/work-repeat.js';
import {newAnnotation,annotationStatus} from '../../src/forma/annotations.js';
function repeatFixture(){
 const r=request();r.steps[0].dataGroup='report-data';r.steps.push({...structuredClone(r.steps[0]),view:'lollipop',duration:900,hold:4100});r.steps.push({...structuredClone(r.steps[0]),relation:'separate',view:'columns'});
 const work=configure(r);work.steps[0].options.annotations=[newAnnotation(work.steps[0].doc,{text:'Watch this region'})];
 const incoming=structuredClone(r);incoming.steps=[incoming.steps[0]];incoming.steps[0].table.rows=[['b','South',-5,'new period'],['a','North renamed',10,'new period'],['d','East',0,'new period']];
 return {work,doc:configure(incoming).steps[0].doc};
}
test('next report retains IDs, annotations, style and timing while saving a separate immutable work',()=>{
 const {work,doc}=repeatFixture(),before=JSON.stringify(work);assert.ok(reportMatchOptions(work.steps[0].doc,doc).some(k=>k[0]==='_id'));
 const preview=prepareReportUpdate(work,{document:doc,matchBy:['_id']});assert.equal(preview.summary.matched,2);assert.equal(preview.summary.added,1);assert.equal(preview.summary.removed,1);assert.equal(preview.sync.targets[1].eligible,false);
 const next=createNextReport(work,preview,{name:'Next quarter',stepIds:[work.steps[1].id]});assert.notEqual(next.id,work.id);assert.equal(JSON.stringify(work),before);assert.deepEqual(next.steps[0].doc.data.map(r=>r._id),['b','a','d']);assert.deepEqual(next.steps[1].doc.data, next.steps[0].doc.data);assert.deepEqual(next.steps[2],work.steps[2]);
 assert.deepEqual(next.steps[1].options,work.steps[1].options);assert.equal(next.steps[1].view,'lollipop');assert.equal(next.steps[1].hold,4100);assert.equal(next.steps[1].duration,900);assert.equal(annotationStatus(next.steps[0].doc,next.steps[0].options.annotations[0]).valid,true);assert.equal(next.steps[0].doc.data[0]._extra[3],'new period');
});
test('repeat report identity is explicit; missing targets and changed units produce annotation review',()=>{
 const {work,doc}=repeatFixture(),allNew=prepareReportUpdate(work,{document:doc});assert.equal(allNew.summary.matched,0);assert.equal(allNew.summary.annotationWarnings.length,1);
 const noTarget=structuredClone(doc);noTarget.data=noTarget.data.filter(r=>r._id!=='a');assert.equal(prepareReportUpdate(work,{document:noTarget,matchBy:['_id']}).summary.annotationWarnings.length,1);
 const otherUnit=structuredClone(doc);otherUnit.unit='EUR';const preview=prepareReportUpdate(work,{document:otherUnit,matchBy:['_id']});assert.equal(preview.summary.annotationWarnings.length,1);assert.ok(preview.summary.semanticChanges.some(c=>c.key==='unit'));
 const labelDoc=structuredClone(doc);labelDoc.data.find(r=>r._id==='a').label='North';const p=prepareReportUpdate(work,{document:labelDoc,matchBy:['label']});assert.equal(p.summary.matched,2);assert.equal(p.candidate.steps[0].doc.tableInput.idColumn,-1);
});
test('repeat report refuses stale, invalid, ambiguous or unapproved updates atomically',()=>{
 const {work,doc}=repeatFixture(),preview=prepareReportUpdate(work,{document:doc,matchBy:['_id']}),before=JSON.stringify(work);
 for(const opts of [{name:''},{name:'Next',stepIds:['missing']},{name:'Next',stepIds:[work.steps[2].id]},{name:'Next',stepIds:[work.steps[1].id,work.steps[1].id]}])assert.throws(()=>createNextReport(work,preview,opts));
 assert.equal(JSON.stringify(work),before);work.steps[0].hold+=100;assert.throws(()=>createNextReport(work,preview,{name:'Next'}));
 assert.throws(()=>prepareReportUpdate(work,{document:{...doc,template:'donut'},matchBy:['_id']}));assert.throws(()=>prepareReportUpdate(work,{document:doc,matchBy:['value']}));
});
test('Agent request rejects invalid settings instead of silently replacing them',()=>{
 for(const options of [{colorMode:'wrong'},{colors:['red']},{camera3d:{azimuth:0,elevation:'bad'}},{exportSettings:{fps:29}},{exportSettings:{format:'invalid'}},{exportSettings:{transparent:'false'}}]){
 const r=request();r.steps[0].options=options;const result=validate(r);assert.equal(result.valid,false);assert.match(result.errors[0].path,/options/);
 }
});

test('single-chart PPTX preferences survive Agent validation and saved-work roundtrip',()=>{
 const r=request();r.steps[0].options={exportSettings:{format:'pptx',pptxMode:'motion',duration:12,hold:2,ratio:'landscape'}};
 const report=validate(r);assert.ok(report.valid,JSON.stringify(report.errors));const work=configure(r);assert.deepEqual(configure(work),work);assert.equal(work.steps[0].options.exportSettings.pptxMode,'motion');
 const bad=request();bad.steps[0].options={exportSettings:{format:'pptx',pptxMode:'unknown'}};assert.equal(validate(bad).valid,false);
});
