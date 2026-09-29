import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample,findTemplate} from '../../src/forma/catalog.js';
import {recordId,withRecordIds} from '../../src/forma/data-identity.js';
import {qualityViews as views,qualityViewMap as nativeMap,qualityDocument as adapt,qualityEligibility as eligible,qualityCompatibility as compatible,qualityBounds as bounds,qualityGuide as guide,qualityAgentGuide as agentGuide,qualityColorSubjects as subjects} from '../../src/forma/quality-series-rules.js';
import {layoutQuality as layout} from '../../src/forma/quality-series-morph.js';
import {qualityPresets as presets,qualityRecords as records} from '../../src/forma/quality-series-presets.js';
import {proportion11,defects11,cusum11,ewma11,xbar11} from '../../src/forma/volume11-data.js';
import {funnelLimits16} from '../../src/forma/volume16-data.js';
import {ChartScene} from '../../src/forma/charts.js';
import {ScientificMorphChart} from '../../src/forma/scientific-morph.js';
import {newWork,cleanWork,stepReport,stepDomain,morphReady,transitionPlan} from '../../src/forma/work-model.js';
import {stepSVG} from '../../src/forma/work-export.js';
import {createEditorModel} from '../../src/forma/editor-model.js';
import {setLocale} from '../../src/forma/locale.js';
const raw=template=>withRecordIds(getExample(template),{legacyNamespace:'quality-qa:'+template}),doc=template=>adapt(raw(template)),own=l=>l.marks.filter(m=>m.original),near=(a,b)=>assert.ok(Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
function finite(l){assert.equal(new Set(l.marks.map(m=>m.key)).size,l.marks.length);for(const m of l.marks){assert.equal(m.points.length,128,m.key);assert.equal(m.entrance.length,128);assert.ok(m.points.flat().every(Number.isFinite),m.key);assert.ok(m.entrance.flat().every(Number.isFinite));}assert.ok(l.labels.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.y)));}

test('six quality adapters retain all raw fields, native metadata and one editable mark per observation',()=>{
 assert.equal(Object.keys(nativeMap).length,6);assert.equal(views.length,12);assert.equal(presets.length,6);assert.equal(records('missing'),null);
 for(const [template,native]of Object.entries(nativeMap)){const r=raw(template),before=structuredClone(r),d=adapt(r);assert.equal(eligible(d,native).valid,true);assert.deepEqual(r,before);for(const [field,value]of Object.entries(r).filter(([field])=>field!=='data'))assert.deepEqual(d[field],value);assert.equal(d.data.length,r.data.length);assert.deepEqual(subjects(d),[]);
  for(const v of views.filter(v=>v.family===d.family))for(const [w,h]of[[300,200],[800,440],[1280,720]]){const l=layout(d,v.id,w,h);finite(l);assert.equal(own(l).length,r.data.length);for(const m of own(l)){assert.equal(m.identity,recordId(r.data[m.row]));assert.equal(m.value,r.data[m.row][m.editable]);assert.ok(m.opacity>0);assert.equal(m.derived,undefined);}for(const m of l.marks.filter(m=>m.derived)){assert.ok(m.recordIds.length,m.key);assert.equal(m.editable,undefined,m.key);}}
 }
});

test('p and u preserve ratio-of-sums baselines and each original denominator and interval',()=>{
 for(const template of['pcontrol','ucontrol']){const d=doc(template),p=template==='pcontrol',field=p?'defectives':'defects',den=p?'sampleSize':'exposure',model=(p?proportion11:defects11)(d.data),native=layout(d,nativeMap[template]),alt=layout(d,p?'quality-proportion-size':'quality-defects-exposure');near(model.center,d.data.reduce((s,r)=>s+r[field],0)/d.data.reduce((s,r)=>s+r[den],0));near(native.statistics.center,model.center);near(alt.statistics.center,model.center);
  for(const m of own(alt)){const r=d.data[m.row],other=own(native).find(n=>n.key===m.key);near(alt.scales.x.invert(m.point[0]),r[den]);near(alt.scales.y.invert(m.point[1]),r[field]/r[den]);near(native.scales.x.invert(other.point[0]),m.row);assert.equal(m.editable,field);assert.equal(m.value,r[field]);assert.equal(m.outside,other.outside);const interval=alt.marks.find(n=>n.role==='connection'&&n.low!==undefined&&n.identity===JSON.stringify([recordId(r),'local-limits']));assert.ok(interval);near(interval.low,model.points[m.row].low);near(interval.high,model.points[m.row].high);}
  assert.ok(alt.marks.filter(m=>m.role==='connection'&&!Object.hasOwn(m,'low')).every(m=>m.opacity===0));const zero=structuredClone(d);zero.data.forEach(r=>r[field]=0);for(const v of views.filter(v=>v.family===d.family)){assert.equal(eligible(zero,v.id).valid,true);finite(layout(zero,v.id));}
 }
});

test('CUSUM remains complete-history accumulation and individual excess never inherits H alarm claims',()=>{
 const d=doc('cusum');d.target=0;d.sigma=1;d.referenceK=.5;d.decisionH=2;d.data=d.data.slice(0,6).map((r,i)=>({...r,value:[2,2,-2,-2,0,2][i]}));const stats=cusum11(d),a=layout(d,'quality-cusum'),b=layout(d,'quality-cusum-contributions');assert.equal(stats[1].upper,3);assert.equal(stats[2].upper,.5,'history is not reset after crossing H');
 for(const l of[a,b])for(const m of own(l)){const r=d.data[m.row];near(l.scales.z.invert(m.point[1]),r.value);assert.equal(m.editable,'value');assert.equal(m.value,r.value);}
 for(let i=0;i<d.data.length;i++)for(const [role,sign]of[['upper',1],['lower',-1]]){const marker=l=>l.marks.find(m=>m.derived&&m.role==='statistic'&&m.transitionIndex===i&&m.identity===JSON.stringify([recordId(d.data[i]),role])),ma=marker(a),mb=marker(b);near(ma.value,sign*stats[i][role]);near(mb.value,sign*Math.max(0,sign*stats[i].z-d.referenceK));assert.deepEqual(ma.recordIds,d.data.slice(0,i+1).map(recordId));assert.deepEqual(mb.recordIds,[recordId(d.data[i])]);assert.equal(mb.outside,false);}
 assert.equal(b.marks.filter(m=>m.role==='reference'&&m.tooltip.startsWith('H:')&&m.opacity>0).length,0);
});

test('EWMA preserves startup limits, prefix provenance and exact additive departure decomposition',()=>{
 const d=doc('ewma'),model=ewma11(d),a=layout(d,'quality-ewma'),b=layout(d,'quality-ewma-decomposition');for(let i=0;i<d.data.length;i++){const r=d.data[i],original=own(b).find(m=>m.row===i),weighted=b.marks.find(m=>m.role==='statistic'&&m.transitionIndex===i),rawAt=own(a).find(m=>m.row===i);near(original.projection.y,r.value-model[i].value);near(weighted.value,model[i].value-d.target);near(original.projection.y+weighted.value,r.value-d.target);near(a.scales.y.invert(rawAt.point[1]),r.value);assert.equal(original.value,r.value);assert.equal(original.editable,'value');assert.deepEqual(weighted.recordIds,d.data.slice(0,i+1).map(recordId));}
 const hidden=b.marks.filter(m=>m.identity.includes('"low"')||m.identity.includes('"high"'));assert.ok(hidden.length);assert.ok(hidden.every(m=>m.opacity===0));d.lambda=1;assert.equal(eligible(d,'quality-ewma-decomposition').valid,true);const full=layout(d,'quality-ewma-decomposition');assert.ok(own(full).every(m=>m.projection.y===0));
});

test('subgroup centering preserves every sample and range, hides invalid individual limit interpretations',()=>{
 const d=doc('xbar'),model=xbar11(d.data),a=layout(d,'quality-xbar'),b=layout(d,'quality-subgroup-residuals');for(const group of model.groups){for(const r of group.rows){const m=own(b).find(m=>m.row===r.row);near(m.projection.y,r.value-group.mean);assert.equal(m.value,r.value);assert.equal(m.editable,'value');}const range=b.marks.find(m=>m.role==='subgroup-range'&&m.recordIds.includes(recordId(group.rows[0])));assert.equal(range.value,group.range);assert.deepEqual(range.recordIds,group.rows.map(recordId));}assert.ok(b.marks.filter(m=>m.role==='subgroup-mean').every(m=>m.value===0&&!m.editable));assert.ok(b.marks.filter(m=>m.tooltip?.startsWith('mean-')&&!m.tooltip.startsWith('mean-center')).every(m=>m.opacity===0));assert.equal(a.marks.filter(m=>m.role==='subgroup-range').length,model.groups.length);
});

test('funnel standardizes the actual clipped normal limits without changing outside status',()=>{
 const d=doc('funnelcontrol');d.targetRate=.05;d.limitSigma=4;d.data.forEach((r,i)=>{r.total=100+i*20;r.events=i%2?0:Math.round(r.total*.07);});assert.equal(eligible(d,'quality-funnel-standardized').valid,true);const a=layout(d,'quality-funnel'),b=layout(d,'quality-funnel-standardized');for(const m of own(b)){const r=d.data[m.row],se=Math.sqrt(d.targetRate*(1-d.targetRate)/r.total),limits=funnelLimits16(r.total,d.targetRate,d.limitSigma),old=own(a).find(p=>p.key===m.key);near(m.projection.y,(r.events/r.total-d.targetRate)/se);near(m.low,(limits.low-d.targetRate)/se);near(m.high,(limits.high-d.targetRate)/se);assert.equal(m.outside,old.outside);assert.equal(m.value,r.events);assert.equal(m.editable,'events');}assert.ok(own(b).some(m=>m.low>-4),'clipped zero boundary is transformed, not invented at −4');
});

test('quality compatibility guards process metadata, acquisition order and subgroup membership',()=>{
 for(const [template,id]of Object.entries(nativeMap)){const d=doc(template);for(const mutate of[b=>b.data.reverse(),b=>b.unit='changed',b=>b.source.name='changed',b=>b.axes={y:'new unit'},b=>b.processName='new process',b=>b.baselineName='new baseline',b=>b.exposureUnit='other exposure']){const b=structuredClone(d);mutate(b);assert.notEqual(compatible(d,b),'');}const changed=structuredClone(d);changed.data.forEach((r,i)=>{if(r.period)r.period='Period '+r.period;if(r.label)r.label='Unit '+i;});assert.equal(compatible(d,changed),'');const missing=structuredClone(d),field=template==='pcontrol'?'defectives':template==='ucontrol'?'defects':template==='funnelcontrol'?'events':'value';missing.data[0][field]=null;assert.equal(eligible(missing,id).valid,false);const duplicate=structuredClone(d);duplicate.data[0]._id=duplicate.data[1]._id;assert.equal(eligible(duplicate,id).valid,false);const weighted=structuredClone(d);weighted.data[0].weight=1;assert.equal(eligible(weighted,id).valid,false);}
 for(const [template,keys]of[['cusum',['target','sigma','referenceK','decisionH']],['ewma',['target','sigma','lambda','limitSigma']],['funnelcontrol',['targetRate','limitSigma']]])for(const field of keys){const a=doc(template),b=structuredClone(a);b[field]*=1.1;assert.notEqual(compatible(a,b),'');}
 const a=doc('xbar'),b=structuredClone(a);[b.data[0].period,b.data[5].period]=[b.data[5].period,b.data[0].period];assert.notEqual(compatible(a,b),'');
});

test('six scenarios keep native schemas, real morph plans and exportable provenance',async()=>{
 const win=new Window(),previous=new Map(['XMLSerializer','document'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));for(const k of previous.keys())Object.defineProperty(globalThis,k,{value:win[k],configurable:true});try{for(const p of presets){const work=newWork(records(p.id));assert.deepEqual(cleanWork(JSON.parse(JSON.stringify(work))),work);for(const s of work.steps){assert.equal(morphReady(s),true,s.view);assert.equal(stepReport(s).valid,true,s.view);assert.deepEqual(s.doc.data,work.steps[0].doc.data);assert.match(stepSVG(s,work.steps),/data-science-role="quality-observation"/);}assert.equal(transitionPlan(work.steps[0],work.steps[1],{steps:work.steps}).mode,'morph');assert.equal(transitionPlan(work.steps[1],work.steps[0],{steps:work.steps}).mode,'morph');}
  const work=newWork(records('quality-ewma-story'));work.steps[1].doc.data[0].value+=100;const a=stepDomain(work.steps[0],work.steps),b=stepDomain(work.steps[1],work.steps);assert.deepEqual(a,b);assert.ok(a.measurement[1]>100);assert.deepEqual(a.order,[0,35]);
 }finally{for(const [k,value]of previous){if(value)Object.defineProperty(globalThis,k,value);else delete globalThis[k];}await win.happyDOM.close();}
});

test('all original quality fields remain editable without overwriting derived values',()=>{
 for(const template of Object.keys(nativeMap)){const source=raw(template),editor=createEditorModel(source),field=template==='pcontrol'?'defectives':template==='ucontrol'?'defects':template==='funnelcontrol'?'events':'value',column=findTemplate(template).fields.findIndex(f=>f[0]===field),ids=editor.recordIds(),next=source.data[0][field]+1;editor.setCell(0,column,String(next));assert.equal(editor.report.valid,true,template);assert.equal(editor.doc.data[0][field],next);assert.deepEqual(editor.recordIds(),ids);for(const name of['target','sigma','referenceK','decisionH','lambda','limitSigma','targetRate','axes','unit'])assert.deepEqual(editor.doc[name],source[name]);for(const [name]of findTemplate(template).fields)assert.ok(Object.hasOwn(editor.doc.data[0],name));const d=adapt(editor.doc);assert.equal(eligible(d,nativeMap[template]).valid,true);assert.equal(own(layout(d,nativeMap[template])).find(m=>m.row===0).value,next);assert.equal(editor.doc.data[0].projection,undefined);assert.equal(editor.doc.data[0].EWMA,undefined);}
});

test('twelve quality directions preserve DOM identities, exact endpoints and interrupted resumption',async()=>{
 for(const preset of presets){const d=adapt(records(preset.id)[0].doc);for(const [from,to]of[preset.views,preset.views.toReversed()]){const win=new Window();try{const chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:from,width:800,height:440,editable:true}),a=chart.layout,nodes=new Map([...chart.nodes].map(([k,v])=>[k,v.shape])),seek=chart.setDocument(d,to,{manual:true,effect:'guided'}),b=chart.layout;assert.deepEqual(a.marks.map(m=>m.key).sort(),b.marks.map(m=>m.key).sort());seek(.5);const middle=structuredClone([...chart.current]);assert.ok([...chart.current.values()].flat(2).every(Number.isFinite));assert.ok(b.marks.some(m=>JSON.stringify(chart.current.get(m.key))!==JSON.stringify(a.marks.find(n=>n.key===m.key).points)&&JSON.stringify(chart.current.get(m.key))!==JSON.stringify(m.points)));seek(1);seek(.5);assert.deepEqual([...chart.current],middle);seek(0);for(const m of a.marks)assert.deepEqual(chart.current.get(m.key),m.points);seek(1);for(const m of b.marks)assert.deepEqual(chart.current.get(m.key),m.points);for(const [key,node]of nodes)assert.equal(chart.nodes.get(key).shape,node);
   seek(.37);const stopped=structuredClone([...chart.current]),resume=chart.setDocument(d,from,{manual:true,resume:true,effect:'guided'});resume(0);assert.deepEqual([...chart.current],stopped);resume(.64);resume(1);for(const m of own(chart.layout)){const node=chart.nodes.get(m.key);assert.equal(node.group.dataset.editField,m.editable);assert.equal(Number(node.group.dataset.editRow),m.row);}assert.doesNotMatch(chart.svg.outerHTML,/NaN|Infinity|undefined/);chart.destroy();
  }finally{await win.happyDOM.close();}}}
});

test('maximum native capacities remain finite without dropping input rows or clipping derived values',()=>{
 for(const template of Object.keys(nativeMap)){const d=doc(template),source=d.data,n=template==='xbar'?600:template==='funnelcontrol'?100:['cusum','ewma'].includes(template)?300:150;d.data=Array.from({length:n},(_,i)=>({...source[i%source.length],_id:'max'+i,row:i,...(template==='xbar'?{period:String(Math.floor(i/10)),sample:'S'+i%10}:{period:String(i),label:'Unit '+i})}));for(const view of views.filter(v=>v.family===d.family)){assert.equal(eligible(d,view.id).valid,true,view.id);const l=layout(d,view.id,300,200);finite(l);assert.equal(own(l).length,n);for(const m of l.marks)for(const [x,y]of m.points){assert.ok(Math.abs(x)<6000,m.key);assert.ok(Math.abs(y)<4000,m.key);}}for(const values of Object.values(bounds(d)))assert.ok(values.every(Number.isFinite));}
});

test('quality names, method notes and Agent contracts support both languages',()=>{
 try{setLocale('en');for(const view of views){assert.equal(view.name,view.en);assert.doesNotMatch(view.note,/\p{Script=Han}/u);}for(const p of presets){assert.doesNotMatch(p.name+p.description+p.dataNote+p.relation,/\p{Script=Han}/u);const d=adapt(records(p.id)[0].doc);for(const view of p.views){assert.doesNotMatch(guide(d,view).join(' '),/\p{Script=Han}/u);const l=layout(d,view);assert.doesNotMatch(l.heading+l.details,/\p{Script=Han}/u);}}assert.doesNotMatch(agentGuide(true),/\p{Script=Han}/u);}finally{setLocale('zh-CN');}
 for(const english of[false,true])for(const token of['_id','source','unit','target','sigma','referenceK','decisionH','lambda','limitSigma','targetRate','recordId','populationId','HTML/SVG'])assert.ok(agentGuide(english).includes(token),token);
});


test('CUSUM and EWMA keep native emphasis, categorical and custom palette semantics including signal colors',async()=>{
 const win=new Window(),previous=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:win.document,configurable:true});
 try{for(const template of['cusum','ewma'])for(const options of[{palette:'ink'},{palette:'ochre'},{palette:'ochre',colorMode:'emphasis'},{palette:'ink',colorMode:'categorical'},{palette:'ink',colors:['#356b8a','#b66834','#657e46']},{palette:'ink',colors:['#356b8a','#b66834','#657e46'],colorMode:'emphasis'}]){
  const source=raw(template),d=adapt(source),native=new ChartScene(win.document.createElement('div'),source,{...options,width:800,height:440,interactive:false}),chart=new ScientificMorphChart(win.document.createElement('div'),d,{...options,view:nativeMap[template],width:800,height:440});try{
   if(template==='cusum')for(const role of['upper','lower']){const originals=[...native.svg.querySelectorAll(`[data-mark="cusum-${role}-point"]`)];for(let i=0;i<originals.length;i++){const m=chart.layout.marks.find(m=>m.role==='statistic'&&m.transitionIndex===i&&m.identity===JSON.stringify([recordId(d.data[i]),role]));assert.equal(chart.markColor(m),originals[i].getAttribute('stroke'));assert.equal(m.paper,originals[i].getAttribute('fill')===native.theme.bg);}}
   else{const originals=[...native.svg.querySelectorAll('[data-mark="ewma-point"]')];for(let i=0;i<originals.length;i++){const m=chart.layout.marks.find(m=>m.role==='statistic'&&m.transitionIndex===i);assert.equal(chart.markColor(m),originals[i].getAttribute('stroke'));assert.equal(m.paper,originals[i].getAttribute('fill')===native.theme.bg);}}
  }finally{native.destroy();chart.destroy();}
 }}finally{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;await win.happyDOM.close();}
});
