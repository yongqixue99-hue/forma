import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample,findTemplate} from '../../src/forma/catalog.js';
import {recordId,populationId,withRecordIds} from '../../src/forma/data-identity.js';
import {setLocale} from '../../src/forma/locale.js';
import {regressionDiagnosticViews as views,regressionDiagnosticViewMap as nativeMap,regressionDiagnosticDocument as adapt,regressionDiagnosticEligibility as eligible,regressionDiagnosticCompatibility as compatible,regressionDiagnosticBounds as bounds,regressionDiagnosticColorKeys as colorKeys,regressionDiagnosticGuide as guide,regressionDiagnosticAgentGuide as agentGuide} from '../../src/forma/regression-diagnostic-rules.js';
import {layoutRegressionDiagnostic as layout} from '../../src/forma/regression-diagnostic-morph.js';
import {regressionDiagnosticPresets as presets,regressionDiagnosticRecords as records} from '../../src/forma/regression-diagnostic-presets.js';
import {ScientificMorphChart} from '../../src/forma/scientific-morph.js';
import {ChartScene} from '../../src/forma/charts.js';
import {newWork,cleanWork,stepReport,stepDomain,morphReady,transitionPlan} from '../../src/forma/work-model.js';
import {workColorMap,createStepScene} from '../../src/forma/work-scene.js';
import {stepSVG} from '../../src/forma/work-export.js';
import {createEditorModel} from '../../src/forma/editor-model.js';
const raw=template=>withRecordIds(getExample(template),{legacyNamespace:'regression-qa:'+template}),doc=template=>adapt(raw(template)),own=l=>l.marks.filter(m=>m.original),near=(a,b)=>assert.ok(Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${a} ≠ ${b}`);
const finite=l=>{assert.equal(new Set(l.marks.map(m=>m.key)).size,l.marks.length);for(const m of l.marks){assert.equal(m.points.length,128);assert.equal(m.entrance.length,128);assert.ok(m.points.flat().every(Number.isFinite),m.key);assert.ok(m.entrance.flat().every(Number.isFinite),m.key);}};

test('six native diagnostic adapters preserve full documents and every editable original observation',()=>{
 assert.equal(Object.keys(nativeMap).length,6);assert.equal(views.length,10);
 for(const [template,view]of Object.entries(nativeMap)){const original=raw(template),before=structuredClone(original),d=adapt(original);assert.deepEqual(original,before);assert.equal(eligible(d,view).valid,true,template);assert.equal(d.data.length,original.data.length);assert.equal(d.unit,original.unit);assert.deepEqual(d.source,original.source);assert.deepEqual(d.axes,original.axes);
  for(const [w,h]of[[300,200],[800,440],[1280,720]]){const l=layout(d,view,w,h);finite(l);assert.equal(own(l).length,original.data.length);for(const m of own(l)){assert.equal(m.identity,recordId(original.data[m.row]));assert.equal(m.value,original.data[m.row][m.editable]);assert.ok(m.opacity>0);assert.equal(m.recordIds,undefined);}for(const m of l.marks.filter(m=>m.derived)){assert.ok(m.recordIds.length);assert.equal(m.editable,undefined);}}
 }
});

test('scale–location changes only the displayed residual coordinate and retains signed originals',()=>{
 const d=doc('scalelocation');d.data.forEach((r,i)=>r.stdResidual=[-9,-1,0,1,4,16][i%6]);const ordinary=layout(d,'regression-fitted-residual'),scale=layout(d,'regression-scale-location');
 for(const m of own(scale)){const r=d.data[m.row],o=own(ordinary).find(a=>a.key===m.key);near(scale.scales.x.invert(m.point[0]),r.fitted);near(scale.scales.y.invert(m.point[1]),Math.sqrt(Math.abs(r.stdResidual)));near(ordinary.scales.y.invert(o.point[1]),r.stdResidual);assert.equal(m.value,r.stdResidual);assert.equal(m.editable,'stdResidual');}
});

test('Cook coordinates reproduce the full-fit formula, retain h=0 and reject h=1 or wrong trace',()=>{
 const d=doc('residualleverage');d.parameterCount=1;d.data=Array.from({length:8},(_,i)=>({_id:'r'+i,label:'R'+i,row:i,leverage:i===0?0:i===1?.5:.5/6,stdResidual:i-3}));
 assert.equal(eligible(d,'regression-cook').valid,true);const l=layout(d,'regression-cook'),leverage=layout(d,'regression-leverage');for(const m of own(l)){const r=d.data[m.row],D=r.stdResidual*r.stdResidual*r.leverage/(1-r.leverage);near(m.projection.D,D);near(l.scales.y.invert(m.point[1]),D);near(l.scales.x.invert(m.point[0]),m.row+1);assert.equal(m.value,r.stdResidual);}assert.equal(own(l)[0].projection.D,0);assert.ok(leverage.marks.filter(m=>m.role==='cook-contour'&&m.opacity>0).length);assert.equal(l.marks.find(m=>m.role==='cook-reference').reference,.5);
 const bad=structuredClone(d);bad.data[1].leverage=1;assert.equal(eligible(bad,'regression-cook').valid,false);bad.data[1].leverage=.4;assert.equal(eligible(bad,'regression-leverage').valid,false);const changed=structuredClone(d);changed.parameterCount=2;assert.notEqual(compatible(d,changed),'');
});

test('added-variable deviation uses residual-plane OLS while preserving original residual pairs',()=>{
 const d=doc('addedvariable'),noise=[1,-1,-1,1,1,-1,-1,1];d.data=Array.from({length:8},(_,i)=>({_id:'r'+i,label:'R'+i,row:i,xResidual:i-3.5,yResidual:2*(i-3.5)+noise[i]}));const l=layout(d,'regression-adjusted-deviation'),base=layout(d,'regression-added');near(l.statistics.fit.slope,2);near(l.statistics.fit.intercept,0);
 for(const m of own(l)){near(l.scales.y.invert(m.point[1]),noise[m.row]);assert.equal(m.value,d.data[m.row].yResidual);near(l.scales.x.invert(m.point[0]),d.data[m.row].xResidual);const b=own(base).find(p=>p.key===m.key);near(base.scales.y.invert(b.point[1]),m.value);}assert.equal(l.marks.find(m=>m.role==='model-reference').slope,2);const constant=structuredClone(d);constant.data.forEach(r=>r.xResidual=0);assert.equal(eligible(constant,'regression-added').valid,false);
});

test('component residuals use the supplied signed coefficient without refitting or writing derived values',()=>{
 const d=doc('componentresidual');d.coefficient=-3;const before=structuredClone(d),partial=layout(d,'regression-component'),ordinary=layout(d,'regression-ordinary');for(const m of own(partial)){const r=d.data[m.row];near(partial.scales.y.invert(m.point[1]),r.residual-3*r.x);const o=own(ordinary).find(p=>p.key===m.key);near(ordinary.scales.y.invert(o.point[1]),r.residual);assert.equal(m.value,r.residual);}assert.deepEqual(d,before);d.coefficient=0;for(const view of['regression-component','regression-ordinary'])finite(layout(d,view));
});

test('study funnel transforms to reciprocal precision and centered standardized deviations with truthful bands',()=>{
 const d=doc('metafunnel'),funnel=layout(d,'regression-funnel'),z=layout(d,'regression-study-standardized');assert.ok(funnel.scales.y(0)<funnel.scales.y(funnel.scales.y.domain()[1]));for(const m of own(z)){const r=d.data[m.row];near(z.scales.x.invert(m.point[0]),1/r.se);near(z.scales.y.invert(m.point[1]),(r.effect-d.referenceEffect)/r.se);assert.equal(m.value,r.effect);assert.equal(m.editable,'effect');}const limits=z.marks.filter(m=>m.role==='study-limit');assert.deepEqual(limits.map(m=>m.reference),[-1.96,1.96]);assert.ok(limits.every(m=>m.derived&&!m.editable));
 const tiny=structuredClone(d);tiny.data[0].se=1e-320;assert.equal(eligible(tiny,'regression-funnel').valid,true);assert.equal(eligible(tiny,'regression-study-standardized').valid,false);finite(layout(tiny,'regression-funnel'));const absent=structuredClone(d);delete absent.referenceEffect;assert.equal(eligible(absent,'regression-funnel').valid,false);
});

test('extreme study precision never poisons native or shared work coordinates',async()=>{
 const original=raw('metafunnel');original.referenceEffect=0;original.data.forEach((r,i)=>{r.se=1e-308;r.effect=i%2?1:-1;});const converted=adapt(original);assert.equal(eligible(converted,'regression-funnel').valid,true);assert.equal(eligible(converted,'regression-study-standardized').valid,false);
 const win=new Window();try{
  const positive=structuredClone(original),negative=structuredClone(original);positive.data.forEach(r=>r.effect=1);negative.data.forEach(r=>r.effect=-1);const work=newWork([{doc:positive,view:'regression-funnel',dataGroup:'extreme-study',scale:'shared'},{doc:negative,view:'regression-funnel',dataGroup:'extreme-study',scale:'shared'}]);
  for(const step of work.steps){assert.equal(morphReady(step),true);const shared=stepDomain(step,work.steps);for(const domain of Object.values(shared)){assert.ok(domain.every(Number.isFinite));assert.ok(Number.isFinite(domain[1]-domain[0]));}const scene=createStepScene(win.document.createElement('div'),step,{width:800,height:440,domain:shared,editable:true});try{for(const p of[0,.5,1]){scene.render(p);assert.doesNotMatch(scene.svg.outerHTML,/NaN|Infinity|undefined/);}assert.equal(own(scene.layout).length,original.data.length);}finally{scene.destroy();}}
  const unsafe={...work.steps[0],view:'regression-study-standardized'};assert.equal(morphReady(unsafe),false);assert.deepEqual(unsafe.doc.data,positive.data);
 }finally{await win.happyDOM.close();}
 const edge=adapt(raw('metafunnel'));edge.referenceEffect=0;edge.data.forEach((r,i)=>{r.se=1e-15;r.effect=i%2?.5:-.5;});assert.equal(eligible(edge,'regression-study-standardized').valid,true);finite(layout(edge,'regression-study-standardized'));
});

test('eligibility and compatibility preserve missing values, model definitions, populations and physical units',()=>{
 for(const [template,view]of Object.entries(nativeMap)){const d=doc(template),bad=structuredClone(d),field=template==='metafunnel'?'effect':template==='addedvariable'?'yResidual':template==='componentresidual'?'residual':'stdResidual';bad.data[0][field]=null;assert.equal(eligible(bad,view).valid,false);for(const change of[x=>x.unit='other units',x=>x.axes={x:'other variable'},x=>x.source.name='other source',x=>x.data[0]._id='other observation']){const b=structuredClone(d);change(b);assert.notEqual(compatible(d,b),'');}}
 for(const [template,field]of[['metafunnel','referenceEffect'],['componentresidual','coefficient'],['residualleverage','parameterCount'],['addedvariable','modelName']]){const a=doc(template),b=structuredClone(a);b[field]=typeof a[field]==='number'?a[field]+1:'another model';assert.notEqual(compatible(a,b),'');}
 const cooked=doc('cooksdistance'),lever=doc('residualleverage');cooked.data=structuredClone(lever.data);assert.notEqual(compatible(cooked,lever),'','native Cook D and diagnostic-value units are not silently merged');
});

test('renaming and reordering retain population colors, observations and finite work consumers',()=>{
 for(const [template,view]of Object.entries(nativeMap)){const d=doc(template),changed=structuredClone(d);changed.data.reverse();changed.data.forEach((r,i)=>{r.label='Renamed '+i;r.group=i%2?'Renamed B':'Renamed A';});assert.deepEqual(colorKeys(d),colorKeys(changed));assert.equal(compatible(d,changed),'');assert.equal(eligible(changed,view).valid,true);finite(layout(changed,view));const work=newWork([{doc:raw(template)}]),step=work.steps[0];step.doc.data.forEach((r,i)=>r.label='Record '+i);if(step.doc.modelName)step.doc.modelName='Renamed external model';assert.equal(morphReady(step),true);assert.doesNotThrow(()=>workColorMap(step,work.steps));assert.doesNotThrow(()=>stepDomain(step,work.steps));}
});

test('five scenarios persist original fields, use actual morph plans and export native SVG samples',t=>{
 const win=new Window(),prior=new Map();for(const [key,value]of Object.entries({document:win.document,XMLSerializer:win.XMLSerializer})){prior.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}t.after(()=>{for(const [key,p]of prior){if(p)Object.defineProperty(globalThis,key,p);else delete globalThis[key];}win.happyDOM.close();});
 assert.equal(presets.length,5);assert.equal(records('missing'),null);for(const preset of presets){const work=newWork(records(preset.id,'vermilion'));assert.deepEqual(cleanWork(JSON.parse(JSON.stringify(work))),work);for(const step of work.steps){assert.equal(stepReport(step).valid,true,step.view);assert.deepEqual(step.doc.data,work.steps[0].doc.data);assert.equal(step.options.palette,'vermilion');assert.match(stepSVG(step,work.steps),/data-science-role="sample"/);}for(const a of work.steps)for(const b of work.steps)if(a.id!==b.id)assert.equal(transitionPlan(a,b,{steps:work.steps}).mode,'morph',a.view+' → '+b.view);}
 const work=newWork(records('regression-component-story'));work.steps[1].doc.data[0].residual=1e5;const a=stepDomain(work.steps[0],work.steps),b=stepDomain(work.steps[1],work.steps);assert.deepEqual(a,b);assert.equal(a.ordinary[1],1e5);assert.ok(a.predictor[1]<1e5,'response-unit values must not expand predictor units');
});

test('native editors retain every source field and metadata and never persist derived coordinates',()=>{
 for(const template of Object.keys(nativeMap)){const original=raw(template),editor=createEditorModel(original),field=template==='metafunnel'?'effect':template==='addedvariable'?'yResidual':template==='componentresidual'?'residual':'stdResidual',column=findTemplate(template).fields.findIndex(f=>f[0]===field),next=original.data[0][field]+.125,ids=editor.recordIds();editor.setCell(0,column,String(next));assert.equal(editor.report.valid,true,template);assert.equal(editor.doc.data[0][field],next);assert.deepEqual(editor.recordIds(),ids);for(const key of['modelName','parameterCount','coefficient','referenceEffect','axes','unit'])assert.deepEqual(editor.doc[key],original[key]);for(const [field]of findTemplate(template).fields)assert.ok(Object.hasOwn(editor.doc.data[0],field));assert.equal(editor.doc.data[0].D,undefined);assert.equal(editor.doc.data[0].projection,undefined);const d=adapt(editor.doc);assert.ok(own(layout(d,nativeMap[template])).some(m=>m.row===0&&m.editable===field&&m.value===next));}
});

test('all ten directions keep real DOM nodes, exact endpoints and interrupted-frame geometry',async()=>{
 let count=0;for(const preset of presets){const d=adapt(records(preset.id)[0].doc);for(const from of preset.views)for(const to of preset.views){if(from===to)continue;count++;const win=new Window();try{
  const binding=[{id:colorKeys(d)[0],color:'#347855'}],chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:from,width:800,height:440,editable:true,colorBindings:binding}),nodes=new Map([...chart.nodes].map(([k,v])=>[k,v.shape])),a=chart.layout,seek=chart.setDocument(d,to,{manual:true,effect:'guided',colorBindings:binding}),b=chart.layout;assert.deepEqual(a.marks.map(m=>m.key).sort(),b.marks.map(m=>m.key).sort());seek(.5);const middle=structuredClone([...chart.current]);assert.ok([...chart.current.values()].flat(2).every(Number.isFinite));assert.ok(own(b).some(m=>JSON.stringify(chart.current.get(m.key))!==JSON.stringify(a.marks.find(p=>p.key===m.key).points)&&JSON.stringify(chart.current.get(m.key))!==JSON.stringify(m.points)));seek(1);seek(.5);assert.deepEqual([...chart.current],middle);seek(0);for(const m of a.marks)assert.deepEqual(chart.current.get(m.key),m.points);seek(1);for(const m of b.marks)assert.deepEqual(chart.current.get(m.key),m.points);for(const [key,node]of nodes)assert.equal(chart.nodes.get(key).shape,node);
  seek(.37);const current=structuredClone([...chart.current]),resume=chart.setDocument(d,from,{manual:true,resume:true,effect:'guided',colorBindings:binding});resume(0);assert.deepEqual([...chart.current],current);resume(.64);resume(1);for(const m of own(chart.layout)){const node=chart.nodes.get(m.key);assert.equal(node.group.dataset.editField,m.editable);assert.equal(Number(node.group.dataset.editRow),m.row);assert.equal(chart.markColor(m),'#347855');}assert.doesNotMatch(chart.svg.outerHTML,/NaN|Infinity|undefined/);chart.destroy();
 }finally{await win.happyDOM.close();}}}assert.equal(count,10);
});

test('maximum capacities, zero residuals and large finite diagnostics keep contours on finite coordinates',()=>{
 for(const template of Object.keys(nativeMap)){const d=doc(template),n=template==='metafunnel'?100:300,sample=d.data;d.data=Array.from({length:n},(_,i)=>({...sample[i%sample.length],_id:'max'+i,label:'Max '+i,row:i}));if(d.family==='regression-influence')d.data.forEach(r=>{r.leverage=d.parameterCount/n;r.stdResidual=1e15;});else if(d.family==='regression-scale')d.data.forEach((r,i)=>{r.fitted=1e12+i;r.stdResidual=i%3?0:-1e15;});else if(d.family==='regression-component')d.coefficient=-1e15;
  for(const v of views.filter(v=>v.family===d.family)){assert.equal(eligible(d,v.id).valid,true,v.id);const l=layout(d,v.id,300,200);finite(l);for(const m of l.marks)for(const [x,y]of m.points){assert.ok(Math.abs(x)<300*20,m.key);assert.ok(Math.abs(y)<200*20,m.key);}}
  for(const range of Object.values(bounds(d)))assert.ok(range.every(Number.isFinite));
 }
});

test('advertised native population bindings reach real marks and survive label and model rename',async()=>{
 const win=new Window(),prior={document:globalThis.document,window:globalThis.window};globalThis.document=win.document;globalThis.window=win;
 try{for(const template of Object.keys(nativeMap)){const native=raw(template),id=populationId('sample-group',native.data);native.data.reverse();native.data.forEach((r,i)=>r.label='Renamed '+i);if(native.modelName)native.modelName='Renamed model';const scene=new ChartScene(win.document.createElement('div'),native,{width:800,height:440,interactive:false,colorBindings:[{id,color:'#347855'}]});try{scene.render(1);assert.ok([...scene.svg.querySelectorAll('path,circle,line,rect')].filter(el=>!el.closest('defs')).some(el=>[el.getAttribute('fill'),el.getAttribute('stroke')].includes('#347855')),template);}finally{scene.destroy();}}}finally{globalThis.document=prior.document;globalThis.window=prior.window;await win.happyDOM.close();}
});

test('diagnostic view metadata, model guidance and Agent instructions support both languages',()=>{
 try{setLocale('en');for(const v of views){assert.equal(v.name,v.en);assert.doesNotMatch(v.note,/\p{Script=Han}/u);}for(const p of presets){assert.doesNotMatch(p.name+p.description+p.dataNote+p.relation,/\p{Script=Han}/u);const d=adapt(records(p.id)[0].doc);for(const view of p.views){assert.doesNotMatch(guide(d,view).join(' '),/\p{Script=Han}/u);const l=layout(d,view);assert.doesNotMatch(l.heading+l.details,/\p{Script=Han}/u);}}assert.doesNotMatch(agentGuide(true),/\p{Script=Han}/u);}finally{setLocale('zh-CN');}
 for(const en of[false,true])for(const token of['_id','modelName','parameterCount','coefficient','referenceEffect','recordId','populationId','HTML/SVG'])assert.ok(agentGuide(en).includes(token),token);
});
