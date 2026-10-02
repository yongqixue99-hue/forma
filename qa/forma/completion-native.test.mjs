import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as d3 from 'd3';
import {Window} from 'happy-dom';
import {getExample,findTemplate} from '../../src/forma/catalog.js';
import {recordId,withRecordIds} from '../../src/forma/data-identity.js';
import {completionNativeViews as views,completionNativeViewMap as map,completionNativeDocument as adapt,completionNativeEligibility as eligible,completionNativeCompatibility as compatible,completionNativeBounds as bounds} from '../../src/forma/completion-native-rules.js';
import {completionNativeAgentGuide,completionNativeGuide} from '../../src/forma/completion-native-rules.js';
import {layoutCompletionNative as layout} from '../../src/forma/completion-native-morph.js';
import {completionNativePresets as presets,completionNativeRecords as records} from '../../src/forma/completion-native-presets.js';
import {ScientificMorphChart} from '../../src/forma/scientific-morph.js';
import {ChartScene} from '../../src/forma/charts.js';
import {newWork,cleanWork,morphReady,stepView,stepReport,transitionPlan} from '../../src/forma/work-model.js';
import {scientificDocument} from '../../src/forma/scientific-rules.js';
import {colorSubjects} from '../../src/forma/color-semantics.js';
import {createEditorModel} from '../../src/forma/editor-model.js';
import {setLocale} from '../../src/forma/locale.js';
import {semanticChanges,frameMeaning} from '../../src/forma/data-semantics.js';
import {spectrum11} from '../../src/forma/volume11-data.js';
import {decision16} from '../../src/forma/volume16-data.js';
import {thresholds18} from '../../src/forma/volume18-data.js';
import {eye19} from '../../src/forma/volume19-data.js';
import {stepSVG} from '../../src/forma/work-export.js';
const raw=id=>withRecordIds(getExample(id),{legacyNamespace:'complete-native-qa:'+id}),doc=id=>adapt(raw(id));
const finite=l=>{assert.equal(new Set(l.marks.map(m=>m.key)).size,l.marks.length);for(const m of l.marks){assert.equal(m.points.length,128);assert.equal(m.entrance.length,128);assert.ok(m.points.flat().every(Number.isFinite),m.key);}};
const near=(a,b)=>assert.ok(Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const own=l=>l.marks.filter(m=>m.original);
function compact(d){const c=structuredClone(d);if(c.template==='recurrence')c.data=c.data.slice(0,12);if(c.template==='spectrogram'){const times=[...new Set(c.data.map(r=>r.time))].slice(0,3),freqs=[...new Set(c.data.map(r=>r.frequency))].slice(0,3);c.data=c.data.filter(r=>times.includes(r.time)&&freqs.includes(r.frequency));}c.data.forEach((r,i)=>r.row=i);return c;}

test('eleven native contracts retain every source field, parameter and row without mutation',()=>{
 assert.equal(Object.keys(map).length,11);assert.equal(views.length,22);assert.equal(presets.length,11);
 for(const id of Object.keys(map)){const input=raw(id),snapshot=structuredClone(input),d=adapt(input);assert.deepEqual(input,snapshot);for(const [k,v]of Object.entries(input)){if(k==='data')continue;assert.deepEqual(d[k],v,k);}assert.deepEqual(d.data.map(({row,...r})=>r),input.data);
  for(const view of views.filter(v=>v.id===map[id]||v.id.startsWith(map[id]+'-'))){assert.equal(eligible(d,view.id).valid,true,view.id);for(const [w,h]of[[300,240],[800,440],[1280,720]]){const l=layout(d,view.id,w,h);finite(l);assert.deepEqual(new Set(own(l).map(m=>m.row)),new Set(d.data.map(r=>r.row)),view.id);}}
 }
});
test('world regions preserve real disconnected outlines, code identity, missing data and country holes',()=>{
 const d=doc('choropleth');d.data.find(r=>r.code==='ZAF').value=null;const a=layout(d,map.choropleth),b=layout(d,map.choropleth+'-atlas');
 assert.equal(a.regionModel.length,176);assert.ok(a.marks.some(m=>m.code==='USA'&&m.original));assert.ok(a.marks.filter(m=>m.code==='USA').length>1);assert.ok(a.marks.some(m=>m.code==='ZAF'&&m.hole&&m.cutoutFor));assert.ok(a.marks.filter(m=>m.code==='ZAF'&&m.original).every(m=>m.missing&&m.value===null));
 assert.deepEqual(a.marks.map(m=>m.key).sort(),b.marks.map(m=>m.key).sort());assert.ok(b.marks.filter(m=>m.original).every(m=>m.opacity===1));assert.ok(b.marks.some(m=>m.reference&&m.opacity===0));assert.equal(d.data.find(r=>r.code==='ZAF').value,null);
 const changed=structuredClone(d);changed.data.reverse();changed.data.forEach(r=>r.label='renamed '+r.code);assert.equal(compatible(d,changed),'');assert.deepEqual(new Map(b.marks.map(m=>[m.key,m.points])),new Map(layout(changed,map.choropleth+'-atlas').marks.map(m=>[m.key,m.points])));
});
test('bubble area is magnitude, decimal-degree coordinates stay exact and zero remains hollow',()=>{
 const d=doc('geomap');d.data[0].value=0;const l=layout(d,map.geomap+'-coordinates'),marks=own(l);for(const m of marks){const r=d.data[m.row];near(l.scales.x.invert(m.point[0]),r.longitude);near(l.scales.y.invert(m.point[1]),r.latitude);if(r.value===0){assert.equal(m.paper,true);assert.equal(m.radius,2);}else near(m.radius**2/l.sizeLegend.radius**2,r.value/l.sizeLegend.max);}assert.equal(marks.length,d.data.length);
});
test('antimeridian flows split geographically and unfold the same directed positive-weight links',()=>{
 const d=doc('geoflow');d.data[0]={...d.data[0],source:'West',target:'East',sourceLongitude:170,sourceLatitude:15,targetLongitude:-170,targetLatitude:25};const a=layout(d,map.geoflow),b=layout(d,map.geoflow+'-routes'),flows=a.marks.filter(m=>m.role==='directed-route');assert.ok(flows.filter(m=>m.recordId===recordId(d.data[0])).length>1);assert.deepEqual(a.marks.map(m=>m.key).sort(),b.marks.map(m=>m.key).sort());for(const m of flows)near(m.flowWidth,4*d.data[m.row].value/Math.max(...d.data.map(r=>r.value)));assert.equal(a.marks.filter(m=>m.role==='route-arrow').length,d.data.length);
});
test('lag coordinate changes use actual observation pairs and retain unmatched leading records',()=>{
 const d=doc('lagplot'),l=layout(d,map.lagplot+'-differences'),pairs=l.marks.filter(m=>m.role==='lag-pair');assert.equal(pairs.length,d.data.length-d.lag);for(const m of pairs){const r=d.data[m.row],before=d.data[m.row-d.lag];near(l.scales.x.invert(m.point[0]),before.value);near(l.scales.y.invert(m.point[1]),r.value-before.value);assert.deepEqual(m.sourceRecordIds,[recordId(before),recordId(r)]);}assert.equal(l.marks.filter(m=>m.role==='raw-signal').length,d.data.length);
 const reordered=structuredClone(d);reordered.data.reverse();assert.notEqual(compatible(d,reordered),'');
});
test('periodogram accumulation sums native bin power and obeys Parseval with odd and even samples',()=>{
 for(const n of [8,9,32,33]){const d=doc('periodogram');d.data=d.data.slice(0,n);const l=layout(d,map.periodogram+'-cumulative'),bins=spectrum11(d.data.map(r=>r.value),d.sampleInterval),mean=d3.mean(d.data,r=>r.value),variance=d3.mean(d.data,r=>(r.value-mean)**2);near(l.spectrum.at(-1).cumulative,variance);let sum=0;for(const [i,p]of bins.entries()){sum+=p.power;near(l.spectrum[i].cumulative,sum);near(l.spectrum[i].power,p.power);}assert.equal(l.marks.filter(m=>m.role==='raw-signal').length,n);}
});
test('recurrence preserves full symmetric time pairs, inclusive scalar threshold and exact lag transform',()=>{
 const d=compact(doc('recurrence'));d.threshold=0;d.data[1].value=d.data[0].value;const l=layout(d,map.recurrence+'-lags'),cells=l.marks.filter(m=>m.role==='recurrence-cell');assert.equal(cells.length,d.data.length**2);assert.equal(cells.filter(m=>m.recurrent).length,14);for(const c of l.recurrence.cells){const m=cells.find(m=>m.recordIds[0]===recordId(c.a)&&m.recordIds[1]===recordId(c.b));near(l.scales.x.invert(m.anchor[0]),(c.a.time+c.b.time)/2);near(l.scales.y.invert(m.anchor[1]),c.b.time-c.a.time);assert.equal(m.opacity>0,c.recurrent);}assert.equal(l.marks.filter(m=>m.role==='raw-signal').length,d.data.length);
});
test('spectrogram uses external raw cells, half-bin extents, original power and one scale after transposition',()=>{
 const d=compact(doc('spectrogram')),a=layout(d,map.spectrogram),b=layout(d,map.spectrogram+'-transposed');assert.equal(a.marks.length,d.data.length);assert.deepEqual(a.marks.map(m=>m.key).sort(),b.marks.map(m=>m.key).sort());for(const m of b.marks){const r=d.data[m.row];near(b.scales.x.invert(m.anchor[0]),r.frequency);near(b.scales.y.invert(m.anchor[1]),r.time);assert.equal(m.value,r.power);assert.equal(m.editable,'power');}assert.deepEqual(bounds(d).time,[d.data[0].time-b.spectrogram.dt/2,b.spectrogram.times.at(-1)+b.spectrogram.dt/2]);
});
test('eye windows unfold every original amplitude at its actual time and only reuse real boundaries',()=>{
 const d=doc('eyediagram'),m=eye19(d),a=layout(d,map.eyediagram),b=layout(d,map.eyediagram+'-time');assert.equal(own(a).length,d.data.length);assert.equal(own(b).length,d.data.length);assert.deepEqual(a.marks.map(m=>m.key).sort(),b.marks.map(m=>m.key).sort());for(const mark of own(b)){const r=d.data[mark.row];near(b.scales.x.invert(mark.point[0]),r.time);near(b.scales.y.invert(mark.point[1]),r.value);}assert.equal(b.marks.filter(m=>m.role==='eye-trace').length,m.traces.reduce((n,t)=>n+t.points.length-1,0));assert.ok(m.traces.some(t=>t.points.at(-1).phase===2));
});
test('classification views keep ties, undefined precision, complete populations and exact native formulas',()=>{
 for(const id of ['decisioncurve','thresholdmetrics','costcurve']){const d=doc(id),alt=presets.find(p=>p.id==='complete-native-'+id).views[1],l=layout(d,alt),m=id==='decisioncurve'?decision16(d):{models:thresholds18(d)};assert.equal(l.marks.filter(p=>p.role==='raw-prediction').length,d.data.length);
  for(const [g,model]of m.models.entries())for(const [i,p]of model.points.entries()){const metric=id==='decisioncurve'?'net':id==='costcurve'?'cost':'precision',color=l.groupKeys[g],mark=l.marks.find(x=>x.role==='metric-point'&&x.colorIdentity===color&&x.metric===metric&&x.threshold===p.threshold);assert.ok(mark);if(id==='decisioncurve')near(mark.value,p.net-m.all[i].net);else if(id==='costcurve')near(mark.value,model.prevalence*d.falseNegativeCost-p.cost);else{assert.equal(mark.value,p.precision);assert.equal(mark.opacity>0,p.precision!==null);}}
  const changed=structuredClone(d);changed.data[0].score+=.0001;assert.notEqual(compatible(d,changed),'','score-grid changes reconstruct threshold identities');
 }
});
test('native eligibility rejects broken metadata and incomplete grids without mutating raw values',()=>{
 for(const [id,mutate]of [['choropleth',d=>d.data[0].code='???'],['geomap',d=>d.data[0].latitude=90],['geoflow',d=>d.data[0].value=0],['lagplot',d=>d.lag=0],['periodogram',d=>d.sampleInterval=0],['recurrence',d=>d.threshold=-1],['spectrogram',d=>d.data.pop()],['eyediagram',d=>d.timeOrigin=.001],['decisioncurve',d=>d.thresholdMax=1],['thresholdmetrics',d=>d.data[0].actual=2],['costcurve',d=>d.falseNegativeCost=-1]]){const d=doc(id);mutate(d);const before=structuredClone(d);assert.equal(eligible(d,map[id]).valid,false,id);assert.deepEqual(d,before);}
 for(const id of Object.keys(map)){const d=doc(id),b=structuredClone(d);b.unit+=' other';assert.notEqual(compatible(d,b),'');b.unit=d.unit;b.data[0]._id='replaced';assert.notEqual(compatible(d,b),'');}
});
test('all 22 directed native transitions retain nodes, endpoints, direct seeks and interrupted continuity',()=>{
 const win=new Window();for(const p of presets){const steps=records(p.id),d=compact(adapt(steps[0].doc));for(const reverse of [false,true]){const [from,to]=reverse?[...p.views].reverse():p.views,chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:from,width:800,height:440,editable:true}),old=chart.layout,nodes=new Map([...chart.nodes].map(([k,n])=>[k,n.shape])),seek=chart.setDocument(d,to,{manual:true,effect:'guided',recipe:d.family}),next=chart.layout;
   seek(.5);const middle=structuredClone([...chart.current]);assert.ok([...chart.current.values()].flat(2).every(Number.isFinite));assert.ok(next.marks.some(m=>m.opacity>0&&JSON.stringify(chart.current.get(m.key))!==JSON.stringify(m.points)),p.id);seek(1);seek(.5);assert.deepEqual([...chart.current],middle);seek(0);old.marks.forEach(m=>assert.deepEqual(chart.current.get(m.key),m.points));seek(1);next.marks.forEach(m=>assert.deepEqual(chart.current.get(m.key),m.points));for(const[k,node]of nodes)assert.equal(chart.nodes.get(k).shape,node);
   seek(.37);const interrupted=structuredClone([...chart.current]),jump=chart.setDocument(d,from,{manual:true,resume:true,effect:'guided',recipe:d.family});jump(0);assert.deepEqual([...chart.current],interrupted);jump(.53);assert.ok([...chart.current.values()].flat(2).every(Number.isFinite));jump(1);chart.destroy();
  }}win.happyDOM.close();
});
test('ready scenarios migrate without lost parameters, remain editable and export original roles',t=>{
 const win=new Window(),saved=new Map();for(const[k,v]of Object.entries({document:win.document,XMLSerializer:win.XMLSerializer})){saved.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}t.after(()=>{for(const[k,v]of saved){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}win.happyDOM.close();});
 for(const p of presets){const work=newWork(records(p.id)),restored=cleanWork(JSON.parse(JSON.stringify(work)));assert.deepEqual(restored,work);for(const s of work.steps){assert.equal(stepReport(s).valid,true);assert.equal(morphReady(s),true);assert.equal(scientificDocument(s).template,s.doc.template);}assert.equal(transitionPlan(...work.steps,{steps:work.steps}).mode,'morph');const native=raw(work.steps[0].doc.template),editor=createEditorModel(native),numeric=findTemplate(native.template).fields.findIndex(f=>f[1]==='number'&&!['longitude','latitude','time','frequency','actual'].includes(f[0]));if(numeric>=0){editor.setCell(0,numeric,String(native.data[0][findTemplate(native.template).fields[numeric][0]]));assert.equal(editor.report.valid,true);assert.deepEqual(editor.recordIds(),native.data.map(recordId));}const s=structuredClone(work.steps[0]);s.doc.data=compact(adapt(s.doc)).data.map(({row,...r})=>r);const svg=stepSVG(s,[s]);assert.doesNotMatch(svg.replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity/);assert.match(svg,/data-science-role=/);}
});
test('custom colors and numeric scales survive native-to-morph renderers in both themes',t=>{
 const win=new Window(),before=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:win.document,configurable:true});t.after(()=>{if(before)Object.defineProperty(globalThis,'document',before);else delete globalThis.document;});for(const id of ['geomap','geoflow','periodogram','lagplot','recurrence','eyediagram','decisioncurve','thresholdmetrics','costcurve']){const native=raw(id),d=compact(adapt(native)),bindings=colorSubjects(native).map((s,i)=>({id:s.id,color:i%2?'#27ac9e':'#b43264'}));assert.ok(bindings.length,id);for(const dark of [false,true]){const chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:map[id],width:800,height:440,dark,colorBindings:bindings});const mark=chart.layout.marks.find(m=>m.opacity>0&&bindings.some(b=>b.id===m.colorIdentity));if(id!=='recurrence')assert.ok(mark,id);if(mark)assert.equal(chart.markColor(mark),bindings.find(b=>b.id===mark.colorIdentity).color);chart.destroy();}
  const scene=new ChartScene(win.document.createElement('div'),native,{palette:'ink',colorBindings:bindings,animate:false});scene.render(1);const selector={geomap:'[data-mark="geo-bubble"]',geoflow:'[data-mark="geoflow-link"]',periodogram:'[data-mark="spectrum-bin"]',lagplot:'[data-mark="lag-pair"]',recurrence:'[data-mark="recurrence-cell"]',eyediagram:'[data-mark="eye-original-sample"]',decisioncurve:'[data-mark="decision-model"]',thresholdmetrics:'[data-mark="threshold-metric"]',costcurve:'[data-mark="cost-model"]'}[id],node=scene.svg.querySelector(selector);assert.ok(node,id);assert.ok(bindings.some(b=>b.color===(node.getAttribute('fill')==='none'||!node.getAttribute('fill')?node.getAttribute('stroke'):node.getAttribute('fill'))),id);scene.destroy();
 }win.happyDOM.close();
});
test('new names, Agent contracts, frame readout and metadata review switch languages',()=>{
 try{setLocale('en');for(const p of presets){const d=adapt(records(p.id)[0].doc);for(const view of p.views){assert.doesNotMatch(views.find(v=>v.id===view).name,/\p{Script=Han}/u);assert.doesNotMatch(completionNativeGuide(d,view).join(' '),/\p{Script=Han}/u);assert.match(frameMeaning(view,{mode:'morph',progress:.5,fromView:p.views.find(v=>v!==view)}),/settle|stop/i);}}assert.doesNotMatch(completionNativeAgentGuide(true),/\p{Script=Han}/u);for(const key of ['sampleInterval','symbolPeriod','threshold','falsePositiveCost','falseNegativeCost']){const d={...raw('costcurve'),[key]:1},b={...d,[key]:2},change=semanticChanges(d,b).find(c=>c.key===key);assert.ok(change,key);assert.doesNotMatch(change.label,/\p{Script=Han}/u);}}finally{setLocale('zh-CN');}
});

test('long country rings use the complete closed boundary and moving holes follow actual displayed contours',()=>{
 const d=doc('choropleth'),win=new Window(),chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:map.choropleth,width:800,height:440}),a=chart.layout;
 for(const code of ['USA','CAN','CHN','AUS','BRA']){const region=a.regionModel.find(r=>r.code===code),long=region.parts.findIndex(p=>p.length>128);assert.ok(long>=0,code);const input=region.parts[long],mark=a.marks.filter(m=>m.code===code)[long],xs=mark.points.map(p=>p[0]),ys=mark.points.map(p=>p[1]);assert.ok(d3.max(xs)-d3.min(xs)>=(d3.max(input,p=>p[0])-d3.min(input,p=>p[0]))*.94,code);assert.ok(d3.max(ys)-d3.min(ys)>=(d3.max(input,p=>p[1])-d3.min(input,p=>p[1]))*.94,code);}
 const hole=a.marks.find(m=>m.code==='ZAF'&&m.hole),before=hole.points,seek=chart.setDocument(d,map.choropleth+'-atlas',{manual:true,effect:'guided',recipe:d.family}),next=chart.layout.marks.find(m=>m.key===hole.key);seek(.5);const shown=chart.current.get(hole.key);assert.notDeepEqual(shown,before);assert.notDeepEqual(shown,next.points);const node=chart.nodes.get(hole.key);assert.equal(node.cutoutPath.getAttribute('d'),node.shape.getAttribute('d'));assert.ok(chart.nodes.get(chart.layout.marks.find(m=>m.cutoutGroup===hole.cutoutFor).key).shape.getAttribute('mask'));
 seek(0);assert.deepEqual(chart.current.get(hole.key),before);seek(1);assert.deepEqual(chart.current.get(hole.key),next.points);chart.setDocument(d,map.choropleth,{animate:false});chart.render(.25);const current=chart.current.get(hole.key);assert.notDeepEqual(current,hole.points);assert.equal(node.cutoutPath.getAttribute('d'),chart.nodes.get(hole.key).shape.getAttribute('d'));chart.destroy();win.happyDOM.close();
});
test('time-frequency cells retain positive intermediate area and recurrence waveform aligns with matrix time',()=>{
 const d=compact(doc('spectrogram')),win=new Window(),chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:map.spectrogram,width:800,height:440}),seek=chart.setDocument(d,map.spectrogram+'-transposed',{manual:true,effect:'guided',recipe:d.family});
 const times=d3.extent(d.data,r=>r.time),frequencies=d3.extent(d.data,r=>r.frequency),corners=[[times[0],frequencies[0]],[times[1],frequencies[0]],[times[1],frequencies[1]],[times[0],frequencies[1]]].map(([time,frequency])=>chart.layout.marks.find(m=>m.time===time&&m.frequency===frequency).key);
 for(const q of [0,.125,.25,.5,.75,.875,1]){seek(q);for(const m of chart.layout.marks)assert.ok(Math.abs(d3.polygonArea(chart.current.get(m.key)))>1,m.key);const centers=corners.map(k=>[d3.mean(chart.current.get(k),p=>p[0]),d3.mean(chart.current.get(k),p=>p[1])]);assert.ok(Math.abs(d3.polygonArea(centers))>chart.layout.plot.w*chart.layout.plot.h*.07,'the fitted grid must remain two-dimensional during axis rotation');for(const m of chart.layout.marks){const points=chart.current.get(m.key),u=[points[32][0]-points[0][0],points[32][1]-points[0][1]],v=[points[64][0]-points[32][0],points[64][1]-points[32][1]];near(u[0]*v[0]+u[1]*v[1],0);for(const [x,y]of points){assert.ok(x>=chart.layout.plot.x-1e-7&&x<=chart.layout.plot.x+chart.layout.plot.w+1e-7);assert.ok(y>=chart.layout.plot.y-1e-7&&y<=chart.layout.plot.y+chart.layout.plot.h+1e-7);}}}
 chart.destroy();win.happyDOM.close();const r=compact(doc('recurrence')),l=layout(r,map.recurrence);near(l.plot.w,l.plot.h);for(const m of l.marks.filter(m=>m.role==='raw-signal'))near(m.point[0],l.scales.x(r.data[m.row].time));const sharedBounds=bounds(d);sharedBounds.power[1]*=10;const shared=layout(d,map.spectrogram,800,440,{domain:sharedBounds});assert.deepEqual(shared.valueDomain,sharedBounds.power);assert.ok(shared.marks.every(m=>m.valueDomain[1]===sharedBounds.power[1]));
});
test('geographic masks survive code edits and contract holes with their enclosing country',()=>{
 const win=new Window(),d=doc('choropleth'),chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:map.choropleth,width:800,height:440});
 const changed=structuredClone(d),south=changed.data.find(r=>r.code==='ZAF'),usa=changed.data.find(r=>r.code==='USA');[south.code,usa.code]=[usa.code,south.code];
 for(const next of [changed,d]){chart.setDocument(next,map.choropleth,{animate:false});for(const mark of chart.layout.marks.filter(m=>m.cutoutFor)){const node=chart.nodes.get(mark.key),mask=chart.cutoutMasks.get(mark.cutoutFor);assert.equal(node.cutoutPath.parentNode,mask.node);assert.equal(node.cutoutPath.getAttribute('d'),node.shape.getAttribute('d'));assert.equal(node.shape.hasAttribute('mask'),false);}for(const mark of chart.layout.marks.filter(m=>m.cutoutGroup))assert.equal(chart.nodes.get(mark.key).cutoutPath,undefined);}
 chart.destroy();
 for(const id of ['geomap','geoflow']){const input=doc(id),view=map[id],c=new ScientificMorphChart(win.document.createElement('div'),input,{view,width:800,height:440}),hole=c.layout.marks.find(m=>m.hole&&m.cutoutFor),outer=c.layout.marks.find(m=>m.cutoutGroup===hole.cutoutFor&&!m.hole),a=Math.abs(d3.polygonArea(hole.points)),b=Math.abs(d3.polygonArea(outer.points)),seek=c.setDocument(input,presets.find(p=>p.id===view).views[1],{manual:true,effect:'guided',recipe:input.family});seek(.5);near(Math.abs(d3.polygonArea(c.current.get(hole.key)))/a,Math.abs(d3.polygonArea(c.current.get(outer.key)))/b);assert.ok(c.nodes.get(hole.key).cutoutPath.parentNode);c.destroy();}
 win.happyDOM.close();
});
