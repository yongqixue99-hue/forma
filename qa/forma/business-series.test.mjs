import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample,findTemplate} from '../../src/forma/catalog.js';
import {withRecordIds,recordId} from '../../src/forma/data-identity.js';
import {setLocale} from '../../src/forma/locale.js';
import {differenceSegments} from '../../src/forma/volume6-data.js';
import {ScientificMorphChart} from '../../src/forma/scientific-morph.js';
import {businessSeriesViews,businessSeriesViewMap,businessSeriesDocument,businessSeriesEligibility,businessSeriesCompatibility,businessSeriesBounds,businessSeriesFamily,businessSeriesColorKeys,businessSeriesGuide,businessSeriesAgentGuide} from '../../src/forma/business-series-rules.js';
import {layoutBusinessSeries} from '../../src/forma/business-series-morph.js';
import {businessSeriesPresets,businessSeriesRecords} from '../../src/forma/business-series-presets.js';
import {newWork,cleanWork,transitionPlan,stepReport,morphReady,stepDomain} from '../../src/forma/work-model.js';
import {stepSVG} from '../../src/forma/work-export.js';
import {createEditorModel} from '../../src/forma/editor-model.js';
const native=template=>withRecordIds(getExample(template),{legacyNamespace:`business-test:${template}`});
const doc=template=>businessSeriesDocument(native(template));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const geometry=layout=>{for(const mark of layout.marks){assert.equal(mark.points.length,128,mark.key);assert.ok(mark.points.flat().every(Number.isFinite),mark.key);assert.equal(mark.entrance.length,128);assert.ok(mark.entrance.flat().every(Number.isFinite));}};
const exampleLayouts=()=>Object.entries(businessSeriesViewMap).map(([template,view])=>({template,view,d:doc(template)}));

test('eight native templates retain all raw values and metadata with finite matching layouts',()=>{
 assert.equal(Object.keys(businessSeriesViewMap).length,8);assert.equal(businessSeriesViews.length,10);
 for(const {template,view,d}of exampleLayouts()){
  const input=native(template);input.extraMetadata={keep:'original'};const before=structuredClone(input),converted=businessSeriesDocument(input);assert.deepEqual(input,before);assert.deepEqual(converted.extraMetadata,input.extraMetadata);
  assert.equal(businessSeriesEligibility(d,view).valid,true,template);assert.equal(d.data.length,input.data.length);
  for(let i=0;i<input.data.length;i++)for(const [field,value]of Object.entries(input.data[i]))assert.deepEqual(converted.data[i][field],value,`${template}:${field}`);
  for(const [w,h]of[[300,240],[800,440],[1280,720]])geometry(layoutBusinessSeries(d,view,w,h));
  assert.ok(layoutBusinessSeries(d,view).marks.some(m=>m.editable));
 }
});

test('target families never fabricate thresholds, discard projects, clip overruns or mix quantity and completion',()=>{
 const d=doc('progress');assert.equal(businessSeriesEligibility(d,'target-fan').valid,false);assert.equal(businessSeriesEligibility(d,'target-bullet').valid,false);assert.equal(businessSeriesEligibility(d,'target-gauge').valid,false);
 const l=layoutBusinessSeries(d,'target-progress');assert.ok(l.scales.ratio.domain()[1]>=1.2);for(const row of d.data){const point=l.marks.find(m=>m.row===row.row&&m.role==='actual-point');close(l.scales.ratio.invert(point.point[0]),row.value/row.target);assert.equal(point.value,row.value);}
 const supplied=businessSeriesDocument(businessSeriesRecords('target-scorecard')[0].doc);for(const view of['target-progress','target-fan','target-bullet','target-pairs']){assert.equal(businessSeriesEligibility(supplied,view).valid,true);geometry(layoutBusinessSeries(supplied,view));}
 const keys=layoutBusinessSeries(supplied,'target-progress').marks.map(m=>m.key).sort();for(const view of['target-fan','target-bullet','target-pairs'])assert.deepEqual(layoutBusinessSeries(supplied,view).marks.map(m=>m.key).sort(),keys);
 const gauge=doc('gauge'),g=layoutBusinessSeries(gauge,'target-gauge');assert.equal(businessSeriesEligibility(gauge,'target-pairs').valid,true);const wrong=structuredClone(gauge);wrong.data.push({...wrong.data[0],_id:'second'});assert.equal(businessSeriesEligibility(wrong,'target-gauge').valid,false);assert.ok(g.marks.find(m=>m.role==='gauge-needle').opacity>0);
 const noRanges=structuredClone(supplied);delete noRanges.data[0].low;assert.equal(businessSeriesEligibility(noRanges,'target-bullet').valid,false);assert.equal(businessSeriesEligibility(noRanges,'target-pairs').valid,true);
});

test('metric views retain independent units and scales with no invalid growth percentage',()=>{
 const d=doc('kpi');for(const view of['metric-cards','metric-pairs']){const l=layoutBusinessSeries(d,view);assert.equal(l.metricScales.length,4);for(const r of d.data){const m=l.metricScales.find(s=>s.recordId===recordId(r));assert.equal(m.unit,r.metricUnit);if(view==='metric-pairs'){const mark=l.marks.find(m=>m.row===r.row&&m.role==='metric-current');close(m.scale.invert(mark.anchor[0]),r.value);}}}
 for(const previous of[0,-1]){const changed=structuredClone(d);changed.data[0].previous=previous;const l=layoutBusinessSeries(changed,'metric-cards');assert.ok(l.labels.some(label=>label.text.includes('Δ')));assert.ok(!l.labels.find(label=>label.text.startsWith('Δ')).text.includes('%'));}
 const changed=structuredClone(d);changed.data[0].metricUnit='USD';assert.notEqual(businessSeriesCompatibility(d,changed),'');
});

test('paired layouts retain actual positions, raw editing fields, exact crossings and missing intervals',()=>{
 const d=doc('difference'),l=layoutBusinessSeries(d,'paired-difference');
 for(const mark of l.marks.filter(m=>m.role.endsWith('-value'))){const r=d.data[mark.row];close(l.scales.x.invert(mark.point[0]),Date.parse(r.period));close(l.scales.y.invert(mark.point[1]),r[mark.editable]);}
 const expected=differenceSegments(d.data);assert.equal(l.marks.filter(m=>m.role.startsWith('difference-')&&m.opacity>0).length,expected.length);
 const learning=doc('learning'),gap=learning.data.find(r=>r.validation===null),lines=layoutBusinessSeries(learning,'paired-lines'),areas=layoutBusinessSeries(learning,'paired-difference');
 assert.ok(gap);for(const lay of[lines,areas]){const missing=lay.marks.find(m=>m.row===gap.row&&m.role==='series-validation-value');assert.equal(missing.opacity,0);assert.equal(missing.editable,undefined);for(const m of lay.marks.filter(m=>m.role==='series-validation-link'&&m.recordIds.includes(recordId(gap))))assert.equal(m.opacity,0);for(const m of lay.marks.filter(m=>m.role.startsWith('difference-')&&m.recordIds.includes(recordId(gap))))assert.equal(m.opacity,0);}
 assert.equal(businessSeriesEligibility(learning,'paired-combo').valid,false,'the 40-epoch table must not be shortened to fit columns');
 const combo=doc('comboline');for(const view of['paired-combo','paired-lines','paired-difference']){const lay=layoutBusinessSeries(combo,view);geometry(lay);assert.equal(lay.marks.filter(m=>m.role.endsWith('-value')).length,combo.data.length*2);for(const m of lay.marks.filter(m=>m.editable))assert.ok(['bar','line'].includes(m.editable));}
 const keys=layoutBusinessSeries(combo,'paired-combo').marks.map(m=>m.key).sort();assert.deepEqual(layoutBusinessSeries(combo,'paired-difference').marks.map(m=>m.key).sort(),keys);
});

test('identity and meaning checks reject changed units, sources, thresholds, grids and missing masks',()=>{
 for(const template of['bullet','kpi','difference']){
  const d=doc(template),changed=structuredClone(d);changed.data.forEach((r,i)=>{if(r.label)r.label=`Renamed ${i}`;});changed.data.reverse();assert.equal(businessSeriesCompatibility(d,changed),'');
  for(const f of[c=>c.unit='new unit',c=>c.source.url='https://example.org/different',c=>c.axes={x:'new axis'},c=>c.data[0]._id='new identity']){const changed=structuredClone(d);f(changed);assert.notEqual(businessSeriesCompatibility(d,changed),'');}
 }
 const target=doc('bullet'),changed=structuredClone(target);changed.data[0].low++;assert.notEqual(businessSeriesCompatibility(target,changed),'');
 const paired=doc('learning');for(const f of[c=>c.data[0].position++,c=>c.data[0].train=null,c=>c.seriesLabels.reverse()]){const changed=structuredClone(paired);f(changed);assert.notEqual(businessSeriesCompatibility(paired,changed),'');}
 const pairRename=structuredClone(paired);pairRename.data.reverse();assert.equal(businessSeriesCompatibility(paired,pairRename),'');assert.deepEqual(new Map(layoutBusinessSeries(pairRename,'paired-lines').marks.map(m=>[m.key,m.points])),new Map(layoutBusinessSeries(paired,'paired-lines').marks.map(m=>[m.key,m.points])));
});

test('bounds, maximum supported inputs, signed and zero data never produce nonfinite geometry',()=>{
 const targets=doc('fan');targets.data=Array.from({length:16},(_,i)=>({_id:`target:${i}`,row:i,label:`T${i}`,value:i,target:20}));geometry(layoutBusinessSeries(targets,'target-fan',300,240));
 const metric=doc('kpi');metric.data.forEach((r,i)=>{r.value=i%2?-1e12:0;r.previous=0;});for(const view of['metric-cards','metric-pairs'])geometry(layoutBusinessSeries(metric,view,300,240));
 const pair=doc('learning');pair.data=Array.from({length:120},(_,i)=>({_id:`epoch:${i}`,row:i,epoch:i+1,position:i+1,train:Math.sin(i)*1e12,validation:i===60?null:Math.cos(i)*1e12}));for(const view of['paired-lines','paired-difference'])geometry(layoutBusinessSeries(pair,view,300,240));assert.equal(businessSeriesEligibility(pair,'paired-combo').valid,false);
 const constant=doc('comboline');constant.data.forEach(r=>{r.bar=0;r.line=0;});for(const view of['paired-combo','paired-lines','paired-difference'])geometry(layoutBusinessSeries(constant,view));
 for(const {d}of exampleLayouts())for(const range of Object.values(businessSeriesBounds(d)))assert.ok(range.every(Number.isFinite));
});

test('five presets retain full native documents, matching IDs and independent copies',()=>{
 assert.equal(businessSeriesPresets.length,5);assert.equal(businessSeriesRecords('missing'),null);
 for(const preset of businessSeriesPresets){const steps=businessSeriesRecords(preset.id,'coral');assert.deepEqual(steps.map(s=>s.view),preset.views);for(const s of steps){assert.deepEqual(s.doc,steps[0].doc);assert.equal(s.options.palette,'coral');assert.equal(s.doc.source.type,'demo');const d=businessSeriesDocument(s.doc);assert.equal(businessSeriesEligibility(d,s.view).valid,true,`${preset.id}:${s.view}`);}steps[0].doc.data[0].label='Changed';assert.notEqual(steps[1].doc.data[0].label,'Changed');}
});

test('business series language getters and Agent guidance preserve raw semantics',()=>{
 try{setLocale('en');for(const v of businessSeriesViews){assert.equal(v.name,v.en);assert.doesNotMatch(v.note,/\p{Script=Han}/u);}for(const p of businessSeriesPresets)assert.doesNotMatch(p.name+p.description+p.dataNote+p.relation,/\p{Script=Han}/u);for(const {d,view}of exampleLayouts()){assert.doesNotMatch(businessSeriesGuide(d,view).join(' '),/\p{Script=Han}/u);const l=layoutBusinessSeries(d,view);assert.doesNotMatch(l.heading+l.details,/\p{Script=Han}/u);}assert.doesNotMatch(businessSeriesAgentGuide(true),/\p{Script=Han}/u);}finally{setLocale('zh-CN');}
 for(const english of[false,true])for(const word of['_id','source','unit','axes','min/max','low/mid/high','bandLabels','metricUnit','train/validation','null','HTML/SVG'])assert.ok(businessSeriesAgentGuide(english).includes(word),word);
});

test('all business directions retain actual DOM nodes, seek deterministically and resume interruption',()=>{
 const win=new Window();let directions=0;
 for(const preset of businessSeriesPresets){const steps=businessSeriesRecords(preset.id),d=businessSeriesDocument(steps[0].doc);for(const from of preset.views)for(const to of preset.views){if(from===to)continue;directions++;
  const colors=businessSeriesColorKeys(d).map((id,i)=>({id,color:i%2?'#1177aa':'#ac3355'})),chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:from,width:800,height:440,editable:true,colorBindings:colors}),nodes=new Map([...chart.nodes].map(([k,v])=>[k,v.shape])),a=chart.layout;
  const seek=chart.setDocument(d,to,{manual:true,effect:'guided',recipe:businessSeriesFamily(to)}),b=chart.layout;seek(.5);const middle=structuredClone([...chart.current]);assert.ok([...chart.current.values()].flat(2).every(Number.isFinite));assert.ok(b.marks.some(m=>JSON.stringify(chart.current.get(m.key))!==JSON.stringify(a.marks.find(old=>old.key===m.key).points)&&JSON.stringify(chart.current.get(m.key))!==JSON.stringify(m.points)));seek(1);seek(.5);assert.deepEqual([...chart.current],middle);
  seek(0);a.marks.forEach(m=>assert.deepEqual(chart.current.get(m.key),m.points));seek(1);b.marks.forEach(m=>assert.deepEqual(chart.current.get(m.key),m.points));for(const [k,node]of nodes)assert.equal(chart.nodes.get(k).shape,node);
  seek(.37);const interrupted=structuredClone([...chart.current]),jump=chart.setDocument(d,from,{manual:true,resume:true,effect:'guided',recipe:businessSeriesFamily(from)});jump(0);assert.deepEqual([...chart.current],interrupted);jump(.7);assert.ok([...chart.current.values()].flat(2).every(Number.isFinite));jump(1);
  for(const mark of chart.layout.marks.filter(m=>m.editable)){const n=chart.nodes.get(mark.key);assert.equal(n.group.dataset.editField,mark.editable);assert.equal(Number(n.group.dataset.editRow),mark.row);}chart.destroy();
 }}assert.equal(directions,28);win.happyDOM.close();
});

test('native migration, editor fields, reversible work transitions and SVG export share the same renderer',t=>{
 const win=new Window(),previous=new Map();for(const [k,value]of Object.entries({document:win.document,XMLSerializer:win.XMLSerializer})){previous.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value,configurable:true,writable:true});}t.after(()=>{for(const [k,d]of previous){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}win.happyDOM.close();});
 for(const preset of businessSeriesPresets){const work=newWork(businessSeriesRecords(preset.id)),stored=cleanWork(JSON.parse(JSON.stringify(work)));assert.deepEqual(stored,work);for(const step of stored.steps){assert.equal(stepReport(step).valid,true,step.view);assert.equal(morphReady(step),true,step.view);const svg=stepSVG(step,stored.steps);assert.doesNotMatch(svg.replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity/);assert.match(svg,/data-science-role=/);}for(const a of work.steps)for(const b of work.steps)if(a.id!==b.id)assert.equal(transitionPlan(a,b,{steps:work.steps}).mode,'morph',`${a.view}→${b.view}`);}
 for(const template of Object.keys(businessSeriesViewMap)){const source=native(template),editor=createEditorModel(source);assert.equal(editor.report.valid,true,template);assert.deepEqual(editor.recordIds(),source.data.map(recordId));}
});

test('native field edits and per-metric shared domains retain identity without mixing units',()=>{
 for(const template of Object.keys(businessSeriesViewMap)){
  const source=native(template),editor=createEditorModel(source),keys=findTemplate(template).fields.map(f=>f[0]),field=template==='learning'?'train':template==='comboline'?'bar':template==='difference'?'a':'value',column=keys.indexOf(field),ids=editor.recordIds(),old=source.data[0][field],next=old*.95;
  editor.setCell(0,column,String(next));assert.equal(editor.report.valid,true,template);assert.equal(editor.doc.data[0][field],next);assert.deepEqual(editor.recordIds(),ids);assert.equal(editor.doc.unit,source.unit);
  for(const key of['bandLabels','seriesLabels'])if(source[key])assert.deepEqual(editor.doc[key],source[key]);
  const rebuilt=createEditorModel(editor.doc,JSON.parse(JSON.stringify(editor.snapshot)));assert.deepEqual(rebuilt.doc,editor.doc);assert.deepEqual(rebuilt.recordIds(),ids);
  const converted=businessSeriesDocument(editor.doc),layout=layoutBusinessSeries(converted,businessSeriesViewMap[template]);assert.ok(layout.marks.some(m=>m.row===0&&m.editable===field&&m.value===next));
 }
 const work=newWork(businessSeriesRecords('metric-before-after'));work.steps[1].doc.data[0].value=260;
 const a=stepDomain(work.steps[0],work.steps),b=stepDomain(work.steps[1],work.steps);assert.deepEqual(a,b);assert.equal(a[`metric:${recordId(work.steps[0].doc.data[0])}`][1],260);assert.equal(a[`metric:${recordId(work.steps[0].doc.data[3])}`][1],2.6);
 const la=layoutBusinessSeries(businessSeriesDocument(work.steps[0].doc),'metric-pairs',800,440,{domain:a}),lb=layoutBusinessSeries(businessSeriesDocument(work.steps[1].doc),'metric-pairs',800,440,{domain:b});for(let i=0;i<la.metricScales.length;i++)assert.deepEqual(la.metricScales[i].scale.domain(),lb.metricScales[i].scale.domain());
 const original=doc('progress'),extreme=structuredClone(original);extreme.data[0].target=1e-320;assert.equal(businessSeriesEligibility(extreme,'target-progress').valid,false);assert.equal(businessSeriesEligibility(extreme,'target-pairs').valid,true);const result=layoutBusinessSeries(extreme,'target-pairs');geometry(result);assert.doesNotMatch(result.marks.map(m=>m.tooltip).join(' '),/Infinity|NaN/);
 const tiny=doc('kpi');tiny.data[0].previous=1e-320;assert.equal(businessSeriesEligibility(tiny,'metric-cards').valid,false);
});

test('metric-card and target numbers are painted above filled geometry in both themes',()=>{
 const win=new Window();
 for(const [template,view]of[['kpi','metric-cards'],['bullet','target-bullet'],['progress','target-progress']])for(const dark of[false,true])for(const width of[300,800]){
  const d=doc(template),chart=new ScientificMorphChart(win.document.createElement('div'),d,{view,width,height:440,dark}),labels=chart.layout.labels.filter(l=>l.dataLabel);assert.equal(labels.length,d.data.length*(template==='kpi'?2:1));
  const assertLabels=()=>{const children=[...chart.svg.children];assert.ok(children.indexOf(chart.labelLayer)>children.indexOf(chart.markLayer));for(const label of labels){const find=layer=>[...layer.querySelectorAll('text')].find(n=>n.getAttribute('x')===String(label.x)&&n.getAttribute('y')===String(label.y)&&n.textContent===String(label.text));assert.ok(find(chart.labelLayer),`${view}: ${label.text}`);assert.equal(find(chart.guideLayer),undefined);}};
  assertLabels();const other=template==='kpi'?'metric-pairs':'target-pairs',seek=chart.setDocument(d,other,{manual:true});seek(.5);seek(0);assertLabels();chart.destroy();
 }
 win.happyDOM.close();
});
