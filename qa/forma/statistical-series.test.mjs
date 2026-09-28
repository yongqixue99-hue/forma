import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample} from '../../src/forma/catalog.js';
import {withRecordIds,recordId,populationId} from '../../src/forma/data-identity.js';
import {setLocale} from '../../src/forma/locale.js';
import {qqRows,survivalSteps} from '../../src/forma/volume7-data.js';
import {pp12,lorenz12} from '../../src/forma/volume12-data.js';
import {weibull15,ttt15,meanExcess15} from '../../src/forma/volume15-data.js';
import {ecdfBand17} from '../../src/forma/volume17-data.js';
import {nelson18} from '../../src/forma/volume18-data.js';
import {statisticalViews,statisticalViewMap,statisticalFamily,statisticalDocument,statisticalEligibility,statisticalCompatibility,statisticalBounds,statisticalOrdered,statisticalGuide,statisticalAgentGuide} from '../../src/forma/statistical-series-rules.js';
import {layoutStatistical} from '../../src/forma/statistical-series-morph.js';
import {statisticalPresets,statisticalRecords} from '../../src/forma/statistical-series-presets.js';
import {ScientificMorphChart} from '../../src/forma/scientific-morph.js';
import {scientificDocument} from '../../src/forma/scientific-rules.js';
import {newWork,cleanWork,transitionPlan,stepReport} from '../../src/forma/work-model.js';
import {stepSVG} from '../../src/forma/work-export.js';
import {WorkFrameRenderer} from '../../src/forma/work-frame.js';
import {workTimeline,timelineFrame} from '../../src/forma/work-timeline.js';
const identified=template=>withRecordIds(getExample(template),{legacyNamespace:'statistical-test:'+template}),doc=template=>statisticalDocument(identified(template));
const lifetime=()=>statisticalDocument(statisticalRecords('statistical-lifetime-story')[0].doc),duration=()=>doc('survival');
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<=e*Math.max(1,Math.abs(a),Math.abs(b)),String(a)+' != '+String(b));
const finite=l=>{for(const m of l.marks){assert.equal(m.points.length,128,m.key);assert.equal(m.entrance.length,128,m.key);assert.ok(m.points.flat().every(Number.isFinite),m.key);assert.ok(m.entrance.flat().every(Number.isFinite),m.key);}};
const own=l=>l.marks.filter(m=>m.original);

test('nine native adapters preserve every original field and finite contour at compact and full sizes',()=>{
 assert.equal(statisticalViews.length,9);assert.equal(Object.keys(statisticalViewMap).length,9);
 for(const [template,view] of Object.entries(statisticalViewMap)){const raw=identified(template),before=structuredClone(raw),d=statisticalDocument(raw);assert.equal(statisticalEligibility(d,view).valid,true,view);assert.deepEqual(raw,before);assert.equal(d.unit,raw.unit);assert.deepEqual(d.source,raw.source);for(const [w,h] of [[300,240],[800,440],[1280,720]]){const l=layoutStatistical(d,view,w,h);finite(l);assert.equal(own(l).length,raw.data.length);assert.ok(own(l).every(m=>m.opacity>0));for(const m of own(l)){assert.equal(m.value,raw.data[m.row][m.editable]);assert.equal(m.identity,recordId(raw.data[m.row]));}}}
});

test('normal, lifetime, cumulative and tail coordinates reproduce the original native statistics',()=>{
 const d=lifetime(),rows=statisticalOrdered(d.data),byId=items=>new Map(items.map(p=>[recordId(p.row||p),p]));
 const expected={
 'stat-qq':byId(qqRows(rows).map(r=>({...r,row:r,x:r.theoretical,y:r.value}))),
 'stat-pp':byId(pp12(rows,d.referenceMean,d.referenceSD).map(p=>({...p,x:p.theoretical,y:p.empirical}))),
 'stat-weibull':byId(weibull15(rows)),
 'stat-ttt':byId(ttt15(rows).slice(1).map(p=>({...p,x:p.fraction,y:p.total}))),
 'stat-lorenz':byId(lorenz12(rows).points.slice(1).map(p=>({...p,x:p.population,y:p.share})))
 };
 for(const [view,points] of Object.entries(expected)){const l=layoutStatistical(d,view);for(const m of own(l)){const p=points.get(m.identity);near(l.scales.x.invert(m.point[0]),p.x);near(l.scales.y.invert(m.point[1]),p.y);}}
 const l=layoutStatistical(d,'stat-meanexcess'),means=meanExcess15(rows,d.minExceedances);assert.deepEqual(l.statistics,means);assert.equal(l.marks.filter(m=>m.role==='excess-mean').length,means.length);assert.ok(l.marks.filter(m=>m.role==='excess-mean').every(m=>m.derived&&!m.editable));for(const m of own(l)){near(l.scales.x.invert(m.anchor[0]),d.data[m.row].value);assert.ok(m.anchor[1]>l.plot.y+l.plot.h);}
 const ecdf=layoutStatistical(d,'stat-ecdfband'),model=ecdfBand17(d);assert.deepEqual(ecdf.statistics,model);for(const m of own(ecdf)){const expectedP=rows.filter(r=>r.value<=m.value).length/rows.length;near(ecdf.scales.y.invert(m.point[1]),expectedP);}assert.ok(ecdf.marks.filter(m=>m.role==='dkw-band').every(m=>m.derived&&m.low>=0&&m.high<=1&&m.recordIds.length===rows.length));
});

test('right-censored transforms retain exact tied risk sets, statuses and original durations',()=>{
 const d=duration();d.data=d.data.map((r,i)=>({...r,duration:Math.floor(i/3),status:i%3===0?'censored':'ended'}));const survival=layoutStatistical(d,'stat-survival'),hazard=layoutStatistical(d,'stat-nelsonaalen');assert.deepEqual(own(survival).map(m=>m.key).sort(),own(hazard).map(m=>m.key).sort());
 for(const g of [...new Set(d.data.map(r=>r.group))]){const rows=d.data.filter(r=>r.group===g),s=survivalSteps(rows),h=nelson18(rows)[0].points.slice(1);for(const m of own(hazard).filter(m=>m.group===g)){const i=s.findIndex(p=>p.time===m.value);assert.equal(m.atRisk,s[i].risk);assert.equal(m.events,s[i].ended);assert.equal(m.survival,s[i].survival);assert.equal(m.hazard,h[i].hazard);assert.equal(m.status,d.data[m.row].status);near(hazard.scales.y.invert(m.point[1]),h[i].hazard);}}
 assert.ok(own(hazard).some(m=>m.hazard!==-Math.log(m.survival)),'Nelson–Aalen must not be replaced with -log(KM)');
});

test('rising empirical-probability steps retain an uncrossed constant-width elbow',()=>{
 const l=layoutStatistical(lifetime(),'stat-ecdfband'),mark=l.marks.find(m=>m.role==='cumulative-link'),points=mark.points;
 const area=Math.abs(points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a[0]*b[1]-b[0]*a[1];},0))/2;
 const length=Math.abs(mark.anchor[0]-l.plot.x)+Math.abs(mark.anchor[1]-l.scales.y(0));near(area,1.3*length);
});

test('record reordering and renaming retain geometry and nodes; altered semantics reject compatibility',()=>{
 for(const d of [lifetime(),duration()]){const changed=structuredClone(d);changed.data.reverse();changed.data.forEach((r,i)=>{r.label='renamed '+i;if(r.group)r.group='renamed '+r.group;});assert.equal(statisticalCompatibility(d,changed),'');for(const v of statisticalViews.filter(v=>statisticalFamily(v.id)===d.family)){assert.deepEqual(new Map(own(layoutStatistical(d,v.id)).map(m=>[m.key,m.points])),new Map(own(layoutStatistical(changed,v.id)).map(m=>[m.key,m.points])));}
 for(const mutate of [c=>c.unit+='x',c=>c.source.url='https://example.com/other',c=>c.axes={value:'Different metric'},c=>c.data[0]._id='another-record']){const c=structuredClone(d);mutate(c);assert.notEqual(statisticalCompatibility(d,c),'');}}
 const d=duration(),c=structuredClone(d);c.data[0].status=c.data[0].status==='ended'?'censored':'ended';assert.notEqual(statisticalCompatibility(d,c),'');c.data[0].status=d.data[0].status;c.data[0].duration+=1;assert.equal(statisticalCompatibility(d,c),'');
 const values=lifetime(),updated=structuredClone(values);updated.data[0].value+=1;assert.equal(statisticalCompatibility(values,updated),'');updated.referenceSD+=1;assert.notEqual(statisticalCompatibility(values,updated),'');
});

test('undefined values, incompatible capacity and changed assumptions never delete or fabricate observations',()=>{
 const d=lifetime();for(const change of [c=>c.data[0].value=null,c=>c.data[0].value=Infinity,c=>c.data[0]._id=c.data[1]._id,c=>c.data[0].weight=2,c=>c.data[0].status='censored',c=>{c.data[0].group='A';c.data[1].group='B';}]){const c=structuredClone(d);change(c);const before=structuredClone(c);for(const v of statisticalViews.filter(v=>statisticalFamily(v.id)===d.family))assert.equal(statisticalEligibility(c,v.id).valid,false,v.id);assert.deepEqual(c,before);}
 const c=structuredClone(d);c.data[0].value=0;assert.equal(statisticalEligibility(c,'stat-weibull').valid,false);assert.equal(statisticalEligibility(c,'stat-ttt').valid,false);assert.equal(statisticalEligibility(c,'stat-lorenz').valid,true);delete c.referenceMean;assert.equal(statisticalEligibility(c,'stat-pp').valid,false);c.alpha=0;assert.equal(statisticalEligibility(c,'stat-ecdfband').valid,false);
 const s=duration();s.data[0].status='unknown';assert.equal(statisticalEligibility(s,'stat-survival').valid,false);s.data[0].status='ended';s.data[0].entry=1;assert.equal(statisticalEligibility(s,'stat-nelsonaalen').valid,false);
});

test('all supported capacities, ties, constant data and measurement scales retain finite geometry',()=>{
 for(const v of statisticalViews){const d=statisticalFamily(v.id)==='statistical-survival'?duration():lifetime(),size=v.id==='stat-qq'?240:v.id==='stat-ecdfband'?600:v.id==='stat-survival'?160:v.id==='stat-nelsonaalen'?480:300;
 d.data=Array.from({length:size},(_,i)=>d.family==='statistical-survival'?{_id:'s'+i,label:'S'+i,row:i,group:'G'+Math.floor(i/(size/4)),duration:Math.floor(i%120/3),status:i%3===0?'censored':'ended'}:{_id:'s'+i,label:'S'+i,row:i,value:1+Math.floor(i/3)});assert.equal(statisticalEligibility(d,v.id).valid,true,v.id);finite(layoutStatistical(d,v.id,300,240));assert.equal(own(layoutStatistical(d,v.id)).length,size);
 }
 for(const scale of [1e-12,1,1e12]){const d=lifetime();d.data.forEach(r=>r.value*=scale);d.referenceMean*=scale;d.referenceSD*=scale;for(const v of statisticalViews.filter(v=>statisticalFamily(v.id)===d.family)){assert.equal(statisticalEligibility(d,v.id).valid,true,v.id);finite(layoutStatistical(d,v.id));}}
 const constant=lifetime();constant.data.forEach(r=>r.value=7);for(const view of ['stat-lorenz','stat-pp','stat-weibull','stat-ttt','stat-ecdfband']){assert.equal(statisticalEligibility(constant,view).valid,true);finite(layoutStatistical(constant,view));}assert.equal(statisticalEligibility(constant,'stat-qq').valid,false);assert.equal(statisticalEligibility(constant,'stat-meanexcess').valid,false);
 const censored=duration();censored.data.forEach(r=>{r.status='censored';r.duration=0;});for(const view of ['stat-survival','stat-nelsonaalen']){assert.equal(statisticalEligibility(censored,view).valid,true);finite(layoutStatistical(censored,view));}
});

test('all 44 same-family directions keep actual sample nodes and deterministic reverse and jump frames',()=>{
 const win=new Window();let directions=0;
 for(const d of [lifetime(),duration()]){const views=statisticalViews.filter(v=>statisticalFamily(v.id)===d.family);
 for(const from of views)for(const to of views){if(from===to)continue;directions++;const chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:from.id,width:800,height:440}),sampleKeys=own(chart.layout).map(m=>m.key),identities=new Map(sampleKeys.map(k=>[k,chart.nodes.get(k).shape])),initial=new Map(own(chart.layout).map(m=>[m.key,m.points]));const seek=chart.setDocument(d,to.id,{manual:true,effect:'guided',recipe:'statistical-coordinates'}),end=new Map(own(chart.layout).map(m=>[m.key,m.points]));
 seek(.5);const middle=new Map(sampleKeys.map(k=>[k,structuredClone(chart.current.get(k))]));assert.equal(chart.guideLayer.getAttribute('opacity'),'0');assert.ok(sampleKeys.some(k=>JSON.stringify(middle.get(k))!==JSON.stringify(initial.get(k))&&JSON.stringify(middle.get(k))!==JSON.stringify(end.get(k))),from.id+' to '+to.id);assert.ok([...chart.current.values()].flat(2).every(Number.isFinite));seek(1);seek(.5);for(const k of sampleKeys)assert.deepEqual(chart.current.get(k),middle.get(k));seek(0);for(const k of sampleKeys)assert.deepEqual(chart.current.get(k),initial.get(k));seek(1);for(const k of sampleKeys){assert.deepEqual(chart.current.get(k),end.get(k));assert.equal(chart.nodes.get(k).shape,identities.get(k));}chart.destroy();
 }}assert.equal(directions,44);win.happyDOM.close();
});

test('interrupted morphs start from the displayed sample contours and retain editable originals',()=>{
 const win=new Window(),d=lifetime();for(const dark of [false,true]){const chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:'stat-weibull',width:800,height:440,dark,editable:true}),seek=chart.setDocument(d,'stat-meanexcess',{manual:true,effect:'guided'});seek(.37);const sampleKeys=own(chart.layout).map(m=>m.key),interrupted=new Map(sampleKeys.map(k=>[k,structuredClone(chart.current.get(k))]));const jump=chart.setDocument(d,'stat-ecdfband',{manual:true,resume:true,effect:'guided'});jump(0);for(const [k,v] of interrupted)assert.deepEqual(chart.current.get(k),v);jump(.57);assert.ok([...chart.current.values()].flat(2).every(Number.isFinite));jump(1);for(const m of own(chart.layout)){const node=chart.nodes.get(m.key);assert.equal(node.group.dataset.editField,'value');assert.equal(Number(node.group.dataset.editRow),m.row);assert.deepEqual(chart.current.get(m.key),m.points);}assert.doesNotMatch(chart.svg.outerHTML,/NaN|Infinity/);chart.destroy();}win.happyDOM.close();
});

test('three ready-made scenarios migrate losslessly, plan morphs and export actual SVG samples',t=>{
 const win=new Window(),previous=new Map();for(const [k,value] of Object.entries({document:win.document,XMLSerializer:win.XMLSerializer})){previous.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value,configurable:true,writable:true});}t.after(()=>{for(const [k,p] of previous){if(p)Object.defineProperty(globalThis,k,p);else delete globalThis[k];}win.happyDOM.close();});
 assert.equal(statisticalRecords('missing'),null);assert.equal(statisticalPresets.length,3);
 for(const p of statisticalPresets){const records=statisticalRecords(p.id,'vermilion'),work=newWork(records),restored=cleanWork(JSON.parse(JSON.stringify(work)));assert.deepEqual(restored,work);for(const step of work.steps){assert.equal(stepReport(step).valid,true,p.id+':'+step.view);assert.deepEqual(step.doc.data,work.steps[0].doc.data);assert.equal(step.options.palette,'vermilion');const d=scientificDocument(step);assert.equal(d.data.length,step.doc.data.length);const svg=stepSVG(step,work.steps);assert.doesNotMatch(svg.replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity/);assert.match(svg,/data-science-role="sample"/);}
 for(const a of work.steps)for(const b of work.steps){if(a.id!==b.id)assert.equal(transitionPlan(a,b,{steps:work.steps}).mode,'morph',a.view+' → '+b.view);}
 }
});

test('series metadata and methodology change language while raw observations stay unchanged',()=>{
 try{setLocale('en');for(const v of statisticalViews){assert.equal(v.name,v.en);assert.doesNotMatch(v.note,/\p{Script=Han}/u);const d=statisticalFamily(v.id)==='statistical-survival'?duration():lifetime();assert.doesNotMatch(statisticalGuide(d,v.id).join(' '),/\p{Script=Han}/u);const l=layoutStatistical(d,v.id);assert.doesNotMatch(l.heading+' '+l.details,/\p{Script=Han}/u);}for(const p of statisticalPresets)assert.doesNotMatch(p.name+p.description+p.dataNote+p.relation,/\p{Script=Han}/u);assert.doesNotMatch(statisticalAgentGuide(true),/\p{Script=Han}/u);for(const en of [false,true])for(const token of ['stat-qq','stat-nelsonaalen','_id','referenceMean/referenceSD','minExceedances','alpha','recordId','populationId','HTML/SVG'])assert.ok(statisticalAgentGuide(en).includes(token),token);
 }finally{setLocale('zh-CN');}
});

test('maximum-capacity live renderers retain group bindings, nodes and finite updated frames',()=>{
 const win=new Window();
 for(const [view,size] of [['stat-ecdfband',600],['stat-nelsonaalen',480]]){
  const d=view==='stat-ecdfband'?lifetime():duration();d.data=Array.from({length:size},(_,i)=>d.family==='statistical-survival'?{_id:'s'+i,label:'S'+i,row:i,group:'G'+Math.floor(i/120),duration:i%120,status:i%3===0?'censored':'ended'}:{_id:'s'+i,label:'S'+i,row:i,value:1+Math.floor(i/3)});
  const parts=d.family==='statistical-survival'?[...new Set(d.data.map(r=>r.group))].map(g=>d.data.filter(r=>r.group===g)):[d.data],bindings=parts.map((rows,i)=>({id:populationId('sample-group',rows),color:['#224466','#aa3344','#337755','#885533'][i]}));
  const start=performance.now(),chart=new ScientificMorphChart(win.document.createElement('div'),d,{view,width:800,height:440,editable:true,colorBindings:bindings}),nodes=new Map(own(chart.layout).map(m=>[m.key,chart.nodes.get(m.key).shape]));
  for(const m of own(chart.layout))assert.equal(chart.nodes.get(m.key).shape.getAttribute('fill'),bindings.find(b=>b.id===m.colorIdentity).color);
  const changed=structuredClone(d);if(view==='stat-ecdfband')changed.data[0].value+=.5;else changed.data[0].duration+=.5;
  const seek=chart.setDocument(changed,view,{manual:true,effect:'guided'});for(const p of [0,.25,.5,.75,1]){seek(p);assert.ok([...chart.current.values()].flat(2).every(Number.isFinite));for(const [key,node]of nodes)assert.equal(chart.nodes.get(key).shape,node);}
  assert.doesNotMatch(chart.svg.outerHTML,/NaN|Infinity|undefined/);assert.ok(performance.now()-start<15000,'maximum-capacity renderer should not stall');chart.destroy();
 }
 win.happyDOM.close();
});

test('native duration WorkFrameRenderer renders finite entrance and settled legends',()=>{
 const win=new Window();
 for(const template of ['survival','nelsonaalen']){const timeline=workTimeline(newWork([{doc:identified(template)}])),renderer=new WorkFrameRenderer(win.document.createElement('div'),timeline.work.steps,{width:600,height:350});for(const p of [0,.5,1]){renderer.render(timelineFrame(timeline,timeline.segments[0].duration*p));assert.doesNotMatch(renderer.scene.svg.outerHTML,/NaN|Infinity|undefined/);assert.equal(own(renderer.scene.layout).length,timeline.work.steps[0].doc.data.length);}renderer.destroy();}
 win.happyDOM.close();
});
