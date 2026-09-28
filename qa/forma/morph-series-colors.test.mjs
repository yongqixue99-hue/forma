import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {color as parseColor} from 'd3';
import {getExample} from '../../src/forma/catalog.js';
import {withRecordIds,populationId} from '../../src/forma/data-identity.js';
import {setLocale} from '../../src/forma/locale.js';
import {themeFor} from '../../src/forma/palettes.js';
import {colorSubjects,chartTheme,fixedColorBindings} from '../../src/forma/color-semantics.js';
import {businessSeriesDocument,businessSeriesViewMap,businessSeriesColorKeys} from '../../src/forma/business-series-rules.js';
import {businessSeriesRecords} from '../../src/forma/business-series-presets.js';
import {statisticalDocument,statisticalViewMap} from '../../src/forma/statistical-series-rules.js';
import {structuralDocument,structuralViewMap,structuralColorKeys} from '../../src/forma/structural-series-rules.js';
import {ScientificMorphChart} from '../../src/forma/scientific-morph.js';
import {ChartScene} from '../../src/forma/charts.js';
const raw=template=>withRecordIds(getExample(template),{legacyNamespace:`color-test:${template}`});
const colors=['#315577','#aa6750','#558455','#713399','#227755','#883322'];
const ids=doc=>colorSubjects(doc).map(s=>s.id).sort();

test('new statistical controls bind one exact population or the actual survival groups',()=>{
 for(const template of Object.keys(statisticalViewMap)){
  const doc=raw(template),before=structuredClone(doc),subjects=colorSubjects(doc);assert.ok(subjects.length);assert.deepEqual(doc,before);
  assert.ok(subjects.every(s=>typeof s.label==='string'&&s.label.length));
  if(!['survival','nelsonaalen'].includes(template)){assert.equal(subjects.length,1);assert.equal(subjects[0].id,populationId('sample-group',doc.data));}
  else for(const subject of subjects)assert.equal(subject.id,populationId('sample-group',doc.data.filter(r=>r.group===subject.label)));
  doc.data.reverse();doc.data.forEach((r,i)=>{r.label=`Sample ${i}`;if(r.group)r.group=`Renamed ${r.group}`;});assert.deepEqual(ids(doc),subjects.map(s=>s.id).sort());
  const original=ids(doc);doc.data[0]._id='replacement';assert.notDeepEqual(ids(doc),original);
 }
 try{for(const language of['zh-CN','en']){setLocale(language);const subjects=colorSubjects(raw('qqplot'));assert.equal(subjects[0].label,language==='en'?'All observations':'全部观测');}}finally{setLocale('zh-CN');}
});

test('business color controls use record IDs or original field/population IDs and retain renamed labels',()=>{
 for(const template of Object.keys(businessSeriesViewMap)){
  const doc=raw(template),before=structuredClone(doc),subjects=colorSubjects(doc);assert.deepEqual(doc,before);assert.deepEqual(subjects.map(s=>s.id),businessSeriesColorKeys(doc));assert.ok(subjects.every(s=>typeof s.label==='string'&&s.label.length));
  doc.data.reverse();doc.data.forEach((r,i)=>{if(r.label)r.label=`Renamed metric ${i}`;});if(doc.seriesLabels)doc.seriesLabels=doc.seriesLabels.map(s=>`Renamed ${s}`);assert.deepEqual(ids(doc),subjects.map(s=>s.id).sort());
  const first=subjects[0],binding={colorBindings:[{id:first.id,color:'#315577'}]};assert.equal(chartTheme(doc,binding).groupColor(colorSubjects(doc).find(s=>s.id===first.id).label,'fallback'),'#315577');
  if(['comboline','difference','learning'].includes(template))assert.equal(subjects.length,2);else assert.equal(subjects.length,doc.data.length);
 }
 try{setLocale('en');assert.deepEqual(colorSubjects(raw('learning')).map(s=>s.label),['Training loss','Validation loss']);}finally{setLocale('zh-CN');}
});

test('hierarchy controls match exact root and top-level branch membership after rename and reorder',()=>{
 for(const template of['circlehierarchy','radialtree','treetable']){
  const doc=raw(template),before=structuredClone(doc),subjects=colorSubjects(doc),keys=structuralColorKeys(structuralDocument(doc));assert.deepEqual(doc,before);assert.deepEqual(subjects.map(s=>s.id).sort(),[...new Set(keys)].sort());
  const root=doc.data.find(r=>r.parent==='ROOT'),branchNames=[root.label,...doc.data.filter(r=>r.parent===root.id).map(r=>r.label)];assert.deepEqual(subjects.map(s=>s.label).sort(),branchNames.sort());
  doc.data.forEach((r,i)=>r.label=`Node ${i}`);doc.data.reverse();assert.deepEqual(ids(doc),subjects.map(s=>s.id).sort());assert.ok(colorSubjects(doc).every(s=>s.label.startsWith('Node ')));
  doc.data.find(r=>r.parent!==root.id&&r.parent!=='ROOT')._id='new-leaf';assert.notDeepEqual(ids(doc),subjects.map(s=>s.id).sort());
  const broken=structuredClone(doc);broken.data[0].parent='missing';assert.deepEqual(colorSubjects(broken),[]);
 }
});

test('default palettes and established identities remain unchanged without explicit bindings',()=>{
 for(const template of['column','groupedbar','boxplot','heatmap','progress','fan','bullet','gauge','kpi','comboline','difference','learning','qqplot','survival','circlehierarchy'])for(const palette of['ink','coral'])for(const dark of[false,true]){
  const doc=raw(template),actual=chartTheme(doc,{palette,dark}),expected=themeFor(palette,dark);for(const key of['fg','bg','accent','secondary','line','colors'])assert.deepEqual(actual[key],expected[key],`${template}:${key}`);
 }
 const column=raw('column');assert.deepEqual(ids(column),column.data.map(r=>r._id).sort());const grouped=raw('groupedbar');assert.deepEqual(ids(grouped),grouped.entities.items.map(r=>r.id).sort());assert.deepEqual(colorSubjects(raw('heatmap')),[]);
});

test('scientific renderer applies new panel bindings and keeps them through morph seeking',()=>{
 const win=new Window();
 const specs=[...Object.entries(businessSeriesViewMap).map(([template,view])=>[template,view,businessSeriesDocument]),...Object.entries(statisticalViewMap).map(([template,view])=>[template,view,statisticalDocument]),...['circlehierarchy','radialtree','treetable'].map(template=>[template,structuralViewMap[template],structuralDocument])];
 for(const [template,view,convert]of specs){const doc=raw(template),bindings=fixedColorBindings(doc,{palette:'coral'}).map((b,i)=>({...b,color:colors[i%colors.length]})),byId=new Map(bindings.map(b=>[b.id,b.color])),chart=new ScientificMorphChart(win.document.createElement('div'),convert(doc),{view,width:800,height:440,colorBindings:bindings});
  let checked=0;for(const mark of chart.layout.marks){if(mark.neutral||mark.accent||Object.hasOwn(mark,'tone'))continue;assert.ok(byId.has(mark.colorIdentity),`${template}:${mark.role}`);assert.equal(chart.nodes.get(mark.key).shape.getAttribute('stroke'),byId.get(mark.colorIdentity));checked++;}assert.ok(checked,template);chart.destroy();
 }
 for(const id of['target-scorecard','metric-before-after','paired-operating-trend']){
  const steps=businessSeriesRecords(id),doc=steps[0].doc,converted=businessSeriesDocument(doc),bindings=colorSubjects(doc).map((s,i)=>({id:s.id,color:colors[i%colors.length]})),chart=new ScientificMorphChart(win.document.createElement('div'),converted,{view:steps[0].view,width:800,height:440,colorBindings:bindings}),before=new Map([...chart.nodes].map(([key,n])=>[key,n.shape.getAttribute('stroke')])),seek=chart.setDocument(converted,steps.at(-1).view,{manual:true,colorBindings:bindings});
  seek(.37);seek(1);for(const [key,color]of before)assert.equal(parseColor(chart.nodes.get(key).shape.getAttribute('stroke')).formatHex(),parseColor(color).formatHex());seek(0);for(const [key,color]of before)assert.equal(parseColor(chart.nodes.get(key).shape.getAttribute('stroke')).formatHex(),parseColor(color).formatHex());chart.destroy();
 }
 win.happyDOM.close();
});

test('new native bindings follow the same record or hierarchy branch after renaming and reordering',t=>{
 const win=new Window(),previous=new Map();for(const [key,value]of Object.entries({document:win.document,window:win})){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}t.after(()=>{for(const [key,value]of previous){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}win.happyDOM.close();});
 for(const template of['fan','bullet','progress','gauge','kpi','circlehierarchy','radialtree','treetable']){
  const doc=raw(template),bindings=colorSubjects(doc).map((s,i)=>({id:s.id,color:colors[i%colors.length]})),byId=new Map(bindings.map(b=>[b.id,b.color]));doc.data.forEach((r,i)=>r.label=`Renamed ${i}`);doc.data.reverse();
  const chart=new ChartScene(win.document.createElement('div'),doc,{width:900,height:550,palette:'ink',colorBindings:bindings,interactive:false});chart.render(1);
  if(['circlehierarchy','radialtree','treetable'].includes(template)){
   const keys=structuralColorKeys(structuralDocument(doc));for(const [i,row]of doc.data.entries()){const mark=chart.svg.querySelector(`[data-node-id="${row.id}"], [data-mark="treetable-bar"][data-node="${row.id}"]`);assert.ok(mark,`${template}:${row.id}`);assert.equal(template==='treetable'?mark.getAttribute('fill'):mark.getAttribute('stroke'),byId.get(keys[i]));}
  }else for(const row of doc.data){
   const direct=[...chart.svg.querySelectorAll('[data-record-id]')].find(node=>node.getAttribute('data-record-id')===row._id),container=direct||[...chart.svg.querySelectorAll('[data-tip]')].find(node=>node.getAttribute('data-tip').startsWith(row.label+'\n'));assert.ok(container,`${template}:${row.label}`);
   const marks=container.matches('path,rect,circle,line')?[container]:[...container.querySelectorAll('path,rect,circle,line')];assert.ok(marks.some(m=>[m.getAttribute('fill'),m.getAttribute('stroke')].includes(byId.get(row._id))),`${template}:${row.label} retains its identity color`);
  }
  chart.destroy();
 }
});
