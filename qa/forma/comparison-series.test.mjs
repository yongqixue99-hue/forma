import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample,findTemplate} from '../../src/forma/catalog.js';
import {withRecordIds,recordId,populationId} from '../../src/forma/data-identity.js';
import {setLocale} from '../../src/forma/locale.js';
import {comparisonViews,comparisonViewMap,comparisonFamily,comparisonDocument,comparisonEligibility,comparisonCompatibility,comparisonBounds,comparisonColorKeys,comparisonGroups,comparisonGuide,comparisonAgentGuide} from '../../src/forma/comparison-series-rules.js';
import {layoutComparison} from '../../src/forma/comparison-series-morph.js';
import {comparisonPresets,comparisonRecords} from '../../src/forma/comparison-series-presets.js';
import {ScientificMorphChart} from '../../src/forma/scientific-morph.js';
import {newWork,cleanWork,transitionPlan,stepReport,stepDomain,morphReady} from '../../src/forma/work-model.js';
import {stepSVG} from '../../src/forma/work-export.js';
import {createEditorModel} from '../../src/forma/editor-model.js';
import {ChartScene} from '../../src/forma/charts.js';
import {workColorMap} from '../../src/forma/work-scene.js';
const identified=template=>withRecordIds(getExample(template),{legacyNamespace:'comparison-test:'+template}),doc=template=>comparisonDocument(identified(template));
const originals=l=>l.marks.filter(m=>m.original),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
function finite(l){for(const m of l.marks){assert.equal(m.points.length,128,m.key);assert.equal(m.entrance.length,128,m.key);assert.ok(m.points.flat().every(Number.isFinite),m.key);assert.ok(m.entrance.flat().every(Number.isFinite),m.key);}assert.equal(new Set(l.marks.map(m=>m.key)).size,l.marks.length);}

test('six comparison native adapters retain original fields, editing, source and finite geometry',()=>{
 assert.equal(comparisonViews.length,9);assert.equal(Object.keys(comparisonViewMap).length,6);
 for(const [template,view]of Object.entries(comparisonViewMap)){
  const native=identified(template),before=structuredClone(native),d=comparisonDocument(native);assert.deepEqual(native,before);assert.equal(comparisonEligibility(d,view).valid,true,view);assert.equal(d.unit,native.unit);assert.deepEqual(d.source,native.source);
  for(const [w,h]of[[300,240],[800,440],[1280,720]]){const layout=layoutComparison(d,view,w,h);finite(layout);assert.equal(originals(layout).length,native.data.length*(template==='rootogram'?2:1));for(const m of originals(layout)){assert.equal(m.identity,recordId(native.data[m.row]));assert.equal(m.value,native.data[m.row][m.editable]);assert.ok(m.opacity>0);}assert.ok(layout.marks.filter(m=>m.derived).every(m=>!m.editable&&Array.isArray(m.recordIds)));}
 }
});

test('QQ and quantile differences preserve Type 7 probabilities and unequal unpaired populations',()=>{
 const d=doc('qqcompare'),a=[0,1,2,3,4,5,6,7],b=[0,2,4,6,8,10,12,14,16,18];d.groupOrder=['A','B'];d.data=[...a.map((value,i)=>({_id:'a'+i,label:'A'+i,group:'A',value})),...b.map((value,i)=>({_id:'b'+i,label:'B'+i,group:'B',value}))].map((r,row)=>({...r,row}));
 const qq=layoutComparison(d,'compare-qq'),delta=layoutComparison(d,'compare-delta');
 for(const m of qq.marks.filter(m=>m.role==='quantile')){near(m.a,7*m.probability);near(m.b,18*m.probability);near(m.difference,11*m.probability);near(qq.scales.x.invert(m.point[0]),m.a);near(qq.scales.y.invert(m.point[1]),m.b);assert.equal(m.editable,undefined);}
 const visible=delta.marks.filter(m=>m.role==='quantile'&&m.opacity>0);assert.equal(visible.length,19);visible.forEach((m,i)=>{near(m.probability,(i+1)/20);near(delta.scales.y.invert(m.point[1]),11*m.probability);});assert.equal(originals(qq).length,18);assert.equal(originals(delta).length,18);assert.deepEqual(qq.marks.map(m=>m.key).sort(),delta.marks.map(m=>m.key).sort());
});

test('right-continuous empirical differences retain ties and all raw records',()=>{
 const d=doc('ecdfdiff');d.groupOrder=['A','B'];d.data=[...Array.from({length:5},(_,i)=>({_id:'a'+i,label:'A'+i,group:'A',value:[1,1,2,3,3][i]})),...Array.from({length:5},(_,i)=>({_id:'b'+i,label:'B'+i,group:'B',value:[1,2,2,4,4][i]}))].map((r,row)=>({...r,row}));
 const l=layoutComparison(d,'compare-ecdf'),expected=new Map([[1,-.2],[2,0],[3,-.4],[4,0]]);for(const m of originals(l)){near(m.derivedProbability,expected.get(m.value));near(l.scales.x.invert(m.point[0]),m.value);near(l.scales.y.invert(m.point[1]),expected.get(m.value));}near(l.statistics.cdf.maxDifference,.4);assert.equal(originals(l).length,10);assert.equal(l.marks.filter(m=>m.role==='cdf-horizontal').length,10);
});

test('rootogram keeps zero observed values as zero-height markers and separate expected originals',()=>{
 const d=doc('rootogram');d.data[0].observed=0;d.data[1].observed=9;d.data[1].expected=4;
 const hanging=layoutComparison(d,'compare-rootogram'),counts=layoutComparison(d,'compare-counts'),zero=originals(hanging).find(m=>m.row===0&&m.role==='observed'),bar=originals(hanging).find(m=>m.row===1&&m.role==='observed');
 assert.equal(zero.value,0);assert.equal(zero.zeroObserved,true);assert.equal(new Set(zero.points.map(p=>p[1])).size,1);assert.ok(zero.stroke>0);assert.equal(bar.observedRoot,3);assert.equal(bar.difference,-1);const ys=bar.points.map(p=>p[1]);near(hanging.scales.y.invert(Math.min(...ys)),2);near(hanging.scales.y.invert(Math.max(...ys)),-1);
 for(const m of originals(counts)){near(counts.scales.y.invert(m.point[1]),d.data[m.row][m.editable]);if(m.role==='expected'){assert.equal(m.paper,true);assert.ok(m.stroke>0);}}
 assert.deepEqual(hanging.marks.map(m=>m.key).sort(),counts.marks.map(m=>m.key).sort());
});

test('residual detrending changes coordinates without fitting the reference or replacing originals',()=>{
 const d=doc('worm'),qq=layoutComparison(d,'compare-residual-qq'),worm=layoutComparison(d,'compare-worm');
 for(const m of originals(worm)){const q=originals(qq).find(p=>p.key===m.key),scale=worm.scales.groups.find(g=>g.group===m.group),qqscale=qq.scales.groups.find(g=>g.group===m.group);near(m.deviation,m.value-m.theoretical);near(scale.x.invert(m.point[0]),m.theoretical);near(scale.y.invert(m.point[1]),m.deviation);near(qqscale.y.invert(q.point[1]),m.value);near(qqscale.x.invert(q.point[0]),m.theoretical);assert.equal(m.editable,'stdResidual');}
 const reordered=structuredClone(d);reordered.data.reverse();reordered.data.forEach((r,i)=>r.label='Renamed'+i);assert.equal(comparisonCompatibility(d,reordered),'');assert.deepEqual(new Map(layoutComparison(reordered,'compare-worm').marks.map(m=>[m.key,m.points])),new Map(worm.marks.map(m=>[m.key,m.points])));
});

test('group spread uses independent Type 7 IQR summaries and keeps every original value visible',()=>{
 const d=doc('spreadlevel');d.groupOrder=['A','B','C'];d.data=d.groupOrder.flatMap((group,g)=>Array.from({length:8},(_,i)=>({_id:group+i,label:group+i,group,value:(g+1)*(i+1)}))).map((r,row)=>({...r,row}));const level=layoutComparison(d,'compare-spreadlevel'),intervals=layoutComparison(d,'compare-group-intervals');
 for(const [i,m]of level.marks.filter(m=>m.role==='group-summary').entries()){near(m.median,4.5*(i+1));near(m.iqr,3.5*(i+1));near(level.scales.x.invert(m.point[0]),Math.log10(m.median));near(level.scales.y.invert(m.point[1]),Math.log10(m.iqr));assert.equal(m.editable,undefined);assert.equal(m.recordIds.length,8);}
 near(level.statistics.fit.slope,1);for(const m of originals(level)){near(level.scales.rawX.invert(m.point[0]),m.value);assert.ok(m.point[1]>level.plot.y+level.plot.h);}assert.equal(originals(intervals).length,24);assert.deepEqual(level.marks.map(m=>m.key).sort(),intervals.marks.map(m=>m.key).sort());
});

test('eligibility rejects missing values, invalid expectations, unsuitable grouping and changed meanings',()=>{
 for(const template of Object.keys(comparisonViewMap)){const d=doc(template),field=template==='rootogram'?'observed':template==='worm'?'stdResidual':'value',bad=structuredClone(d);bad.data[0][field]=null;assert.equal(comparisonEligibility(bad,comparisonViewMap[template]).valid,false);for(const change of[x=>x.unit='changed',x=>x.source.name='changed',x=>x.axes={x:'changed'},x=>x.data[0]._id='changed']){const b=structuredClone(d);change(b);assert.notEqual(comparisonCompatibility(d,b),'');}}
 const count=doc('rootogram');count.data[0].expected=-1;assert.equal(comparisonEligibility(count,'compare-counts').valid,false);const spread=doc('spreadlevel');spread.data[0].value=0;assert.equal(comparisonEligibility(spread,'compare-spreadlevel').valid,false);const sample=doc('qqcompare'),changed=structuredClone(sample);changed.groupOrder.reverse();assert.notEqual(comparisonCompatibility(sample,changed),'');
 const residual=doc('worm');delete residual.modelName;assert.equal(comparisonEligibility(residual,'compare-worm').valid,false);
});

test('invalid group-order metadata never drops originals or crashes color and bounds consumers',()=>{
 for(const template of['qqcompare','deltaplot','ecdfdiff','worm','spreadlevel'])for(const badOrder of[[],['Missing'],['A','A'],null,'A,B']){
  const original=doc(template),d=structuredClone(original);d.groupOrder=badOrder;assert.equal(comparisonEligibility(d,comparisonViewMap[template]).valid,false);assert.notEqual(comparisonCompatibility(original,d),'');assert.deepEqual(comparisonGroups(d).flat().map(recordId).sort(),d.data.map(recordId).sort());assert.equal(comparisonColorKeys(d).length,d.data.length);assert.ok(comparisonColorKeys(d).every(id=>typeof id==='string'&&id));for(const bounds of Object.values(comparisonBounds(d)))assert.ok(bounds.every(Number.isFinite));
 }
 const d=doc('deltaplot');d.data[0].group='Partly renamed';assert.equal(comparisonEligibility(d,'compare-delta').valid,false);assert.equal(comparisonGroups(d).length,3);assert.equal(comparisonGroups(d).flat().length,d.data.length);assert.deepEqual(comparisonBounds(d).cdf,[-1,1]);assert.equal(comparisonColorKeys(d).length,d.data.length);
 const work=newWork([{doc:identified('deltaplot')}]),step=work.steps[0],name=step.doc.data[0].group;step.doc.data.filter(r=>r.group===name).forEach(r=>r.group='Renamed group');assert.doesNotThrow(()=>workColorMap(step,work.steps));assert.doesNotThrow(()=>stepDomain(step,work.steps));
});

test('the native adapter never infers a direction over an explicit invalid group-order declaration',()=>{
 for(const order of[null,'',false]){const raw=identified('deltaplot');raw.groupOrder=order;const work=newWork([{doc:raw}]),step=work.steps[0],adapted=comparisonDocument(step.doc);assert.equal(step.doc.groupOrder,order);assert.equal(adapted.groupOrder,order);assert.equal(comparisonEligibility(adapted,'compare-delta').valid,false);assert.equal(morphReady(step),false);assert.doesNotThrow(()=>workColorMap(step,work.steps));assert.doesNotThrow(()=>stepDomain(step,work.steps));}
 const raw=identified('deltaplot');delete raw.groupOrder;const expected=[...new Set(raw.data.map(r=>r.group))],step=newWork([{doc:raw}]).steps[0];assert.deepEqual(comparisonDocument(raw).groupOrder,expected);assert.deepEqual(step.doc.groupOrder,expected);assert.equal(morphReady(step),true);
});

test('four native scenarios persist group direction, native fields and shared bounds through cleanWork',t=>{
 const win=new Window(),previous=new Map();for(const [k,value]of Object.entries({document:win.document,XMLSerializer:win.XMLSerializer})){previous.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value,configurable:true,writable:true});}t.after(()=>{for(const [k,p]of previous){if(p)Object.defineProperty(globalThis,k,p);else delete globalThis[k];}win.happyDOM.close();});
 assert.equal(comparisonPresets.length,4);assert.equal(comparisonRecords('missing'),null);
 for(const p of comparisonPresets){const records=comparisonRecords(p.id,'vermilion'),work=newWork(records);assert.deepEqual(cleanWork(JSON.parse(JSON.stringify(work))),work);for(const step of work.steps){assert.equal(stepReport(step).valid,true,step.view);const svg=stepSVG(step,work.steps);assert.doesNotMatch(svg.replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity/);assert.match(svg,/data-science-role=/);assert.deepEqual(step.doc.data,work.steps[0].doc.data);}for(const a of work.steps)for(const b of work.steps)if(a.id!==b.id)assert.equal(transitionPlan(a,b,{steps:work.steps}).mode,'morph',a.view+' → '+b.view);}
 const native=identified('deltaplot'),originalOrder=[...new Set(native.data.map(r=>r.group))],work=newWork([{doc:native}]);assert.equal(native.groupOrder,undefined);assert.deepEqual(work.steps[0].doc.groupOrder,originalOrder);work.steps[0].doc.data.reverse();const restored=cleanWork(JSON.parse(JSON.stringify(work)));assert.deepEqual(restored.steps[0].doc.groupOrder,originalOrder);const d=comparisonDocument(restored.steps[0].doc);assert.equal(comparisonCompatibility(comparisonDocument({...native,groupOrder:originalOrder}),d),'');
 const shared=newWork(comparisonRecords('comparison-count-model'));shared.steps[1].doc.data[0].observed=400;assert.deepEqual(stepDomain(shared.steps[0],shared.steps),stepDomain(shared.steps[1],shared.steps));assert.equal(stepDomain(shared.steps[0],shared.steps).count[1],400);
});

test('raw native field edits preserve IDs, units and model metadata',()=>{
 for(const template of Object.keys(comparisonViewMap)){
  const source=identified(template),model=createEditorModel(source),field=template==='rootogram'?'expected':template==='worm'?'stdResidual':'value',column=findTemplate(template).fields.findIndex(f=>f[0]===field),ids=model.recordIds(),next=source.data[0][field]+.03;model.setCell(0,column,String(next));assert.equal(model.report.valid,true,template);assert.deepEqual(model.recordIds(),ids);assert.equal(model.doc.data[0][field],next);assert.equal(model.doc.unit,source.unit);assert.equal(model.doc.modelName,source.modelName);const l=layoutComparison(comparisonDocument(model.doc),comparisonViewMap[template]);assert.ok(originals(l).some(m=>m.row===0&&m.editable===field&&m.value===next));
 }
});

test('native delta and CDF previews honor saved group direction after row reversal',async()=>{
 const win=new Window(),prior={document:globalThis.document,window:globalThis.window};globalThis.document=win.document;globalThis.window=win;
 try{for(const template of ['deltaplot','ecdfdiff']){const native=newWork([{doc:identified(template)}]).steps[0].doc;native.data.reverse();const converted=comparisonDocument(native),layout=layoutComparison(converted,comparisonViewMap[template]),scene=new ChartScene(win.document.createElement('div'),native,{width:800,height:440,interactive:false});try{scene.render(1);if(template==='deltaplot'){const marks=[...scene.svg.querySelectorAll('[data-mark="delta-point"]')];assert.equal(marks.length,19);marks.forEach((m,i)=>near(Number(m.getAttribute('data-value')),layout.statistics.delta.points[i].difference));}else{const marks=[...scene.svg.querySelectorAll('[data-mark="ecdf-difference-point"]')];assert.equal(marks.length,layout.statistics.cdf.points.length);marks.forEach((m,i)=>near(Number(m.getAttribute('data-difference')),layout.statistics.cdf.points[i].difference));}}finally{scene.destroy();}}}finally{globalThis.document=prior.document;globalThis.window=prior.window;await win.happyDOM.close();}
});

test('all twelve directed comparisons keep live DOM nodes, exact endpoints and interrupted frames',async()=>{
 let directions=0;
 for(const preset of comparisonPresets){const d=comparisonDocument(comparisonRecords(preset.id)[0].doc);for(const from of preset.views)for(const to of preset.views){if(from===to)continue;directions++;const win=new Window();try{
  const colors=[...new Set(comparisonColorKeys(d))].map((id,i)=>({id,color:i%2?'#228877':'#ad3355'})),chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:from,width:800,height:440,editable:true,colorBindings:colors}),nodes=new Map([...chart.nodes].map(([k,v])=>[k,v.shape])),a=chart.layout,seek=chart.setDocument(d,to,{manual:true,effect:'guided',colorBindings:colors}),b=chart.layout;
  assert.deepEqual(a.marks.map(m=>m.key).sort(),b.marks.map(m=>m.key).sort());seek(.5);const middle=structuredClone([...chart.current]);assert.ok([...chart.current.values()].flat(2).every(Number.isFinite));assert.ok(originals(b).some(m=>JSON.stringify(chart.current.get(m.key))!==JSON.stringify(a.marks.find(q=>q.key===m.key).points)&&JSON.stringify(chart.current.get(m.key))!==JSON.stringify(m.points)));seek(1);seek(.5);assert.deepEqual([...chart.current],middle);seek(0);for(const m of a.marks)assert.deepEqual(chart.current.get(m.key),m.points);seek(1);for(const m of b.marks)assert.deepEqual(chart.current.get(m.key),m.points);for(const [k,node]of nodes)assert.equal(chart.nodes.get(k).shape,node);
  seek(.37);const interrupted=structuredClone([...chart.current]),jump=chart.setDocument(d,from,{manual:true,resume:true,effect:'guided',colorBindings:colors});jump(0);assert.deepEqual([...chart.current],interrupted);jump(.7);jump(1);for(const m of originals(chart.layout)){const n=chart.nodes.get(m.key);assert.equal(n.group.dataset.editField,m.editable);assert.equal(Number(n.group.dataset.editRow),m.row);assert.equal(chart.markColor(m),colors.find(c=>c.id===m.colorIdentity).color);}assert.doesNotMatch(chart.svg.outerHTML,/NaN|Infinity|undefined/);chart.destroy();
 }finally{await win.happyDOM.close();}}}assert.equal(directions,12);
});

test('maximum capacities and extreme finite values retain finite full contours',()=>{
 for(const [template,count,groupCount]of[['qqcompare',300,2],['worm',180,4],['spreadlevel',100,10]]){
  const d=doc(template);d.groupOrder=Array.from({length:groupCount},(_,i)=>'G'+i);d.data=d.groupOrder.flatMap((group,g)=>Array.from({length:count},(_,i)=>({_id:group+':'+i,label:group+':'+i,group,...(template==='worm'?{stdResidual:(i/count-.5)*1e12}:{value:(g+1)*1e10+(i+1)*1e7})}))).map((r,row)=>({...r,row}));
  for(const view of comparisonViews.filter(v=>v.family===d.family)){assert.equal(comparisonEligibility(d,view.id).valid,true,view.id);finite(layoutComparison(d,view.id,300,240));}for(const bounds of Object.values(comparisonBounds(d)))assert.ok(bounds.every(Number.isFinite));
 }
});

test('hidden CDF auxiliaries stay near the visible plot and compact ten-group spread stays positive',()=>{
 const d=doc('qqcompare');d.data.forEach((r,i)=>r.value=1e12+i%20);const qq=layoutComparison(d,'compare-qq',300,240);finite(qq);for(const mark of qq.marks)for(const [x,y]of mark.points){assert.ok(Math.abs(x)<6000,mark.key);assert.ok(Math.abs(y)<4800,mark.key);}
 const spread=doc('spreadlevel');spread.groupOrder=Array.from({length:10},(_,i)=>'G'+i);spread.data=spread.groupOrder.flatMap((group,g)=>Array.from({length:8},(_,i)=>({_id:group+i,label:group+i,group,value:(g+1)*(i+1)}))).map((r,row)=>({...r,row}));const l=layoutComparison(spread,'compare-spreadlevel',300,200);finite(l);assert.ok(l.plot.h>=42);assert.ok(l.plot.y+l.plot.h<200);for(const m of originals(l)){assert.ok(m.point[1]>l.plot.y+l.plot.h);assert.ok(m.point[1]<180);}
});

test('comparison legends have separate vertical space from measurement-axis titles',()=>{
 for(const [template,view]of Object.entries(comparisonViewMap)){if(template==='worm')continue;const l=layoutComparison(doc(template),view,300,240),titles=l.labels.filter(label=>label.y===l.plot.y-12);assert.ok(titles.length,view);for(const title of titles)assert.ok(title.y-35>=16,view);if(template==='rootogram')assert.equal(l.groups.length,0,'count bins already have axis labels');}
});

test('multiple horizontal axes keep coordinate titles and raw units beside their own scales',()=>{
 for(const [template,view,title]of[['spreadlevel','compare-spreadlevel','log₁₀ 中位数'],['deltaplot','compare-delta','分位概率 p']])for(const [w,h]of[[300,240],[390,280],[800,440]]){
  const d=doc(template),l=layoutComparison(d,view,w,h),bottom=l.plot.y+l.plot.h,main=l.labels.find(label=>label.text===title),raw=l.labels.find(label=>label.text==='全部原样本 · 独立原值横轴'),unit=l.labels.find(label=>label.text===d.unit&&label.anchor==='end'&&label.y===h-6);
  assert.ok(main&&raw&&unit,`${view}: both coordinate systems must be named`);assert.equal(main.y,bottom+30);assert.ok(main.y>bottom+17);assert.ok(raw.y-main.y>=15);assert.ok(originals(l).every(m=>m.point[1]>raw.y+10));assert.ok(unit.y>h-22);assert.ok(raw.y<unit.y);assert.equal(l.labels.filter(label=>label.text===title&&label.y===h-6).length,0,'a transformed main-axis title must never label the raw-value rug');
 }
});

test('comparison metadata, guidelines and agent copies preserve multilingual methodology',()=>{
 try{setLocale('en');for(const v of comparisonViews){assert.equal(v.name,v.en);assert.doesNotMatch(v.note,/\p{Script=Han}/u);}for(const p of comparisonPresets){assert.doesNotMatch(p.name+p.description+p.dataNote+p.relation,/\p{Script=Han}/u);const d=comparisonDocument(comparisonRecords(p.id)[0].doc);for(const view of p.views){assert.doesNotMatch(comparisonGuide(d,view).join(' '),/\p{Script=Han}/u);const l=layoutComparison(d,view);assert.doesNotMatch(l.heading+l.details,/\p{Script=Han}/u);}}assert.doesNotMatch(comparisonAgentGuide(true),/\p{Script=Han}/u);}finally{setLocale('zh-CN');}
 for(const english of[false,true])for(const token of['_id','groupOrder','modelName','populationId','recordId','Type 7','HTML/SVG'])assert.ok(comparisonAgentGuide(english).includes(token),token);
});
