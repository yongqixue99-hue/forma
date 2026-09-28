import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {setLocale} from '../../src/forma/locale.js';
import {getExample} from '../../src/forma/catalog.js';
import {createEditorModel} from '../../src/forma/editor-model.js';
import {withRecordIds,recordId} from '../../src/forma/data-identity.js';
import {colorSubjects} from '../../src/forma/color-semantics.js';
import {response19} from '../../src/forma/volume19-data.js';
import {ScientificMorphChart} from '../../src/forma/scientific-morph.js';
import {frequencyDocument,frequencyViews,frequencyEligibility,frequencyCompatibility,frequencyBounds,frequencyGuide,frequencyViewMap,frequencyAgentGuide} from '../../src/forma/frequency-rules.js';
import {layoutFrequency} from '../../src/forma/frequency-morph.js';
import {frequencyRecords} from '../../src/forma/frequency-presets.js';
import {newWork,cleanWork,morphReady,transitionPlan,stepReport} from '../../src/forma/work-model.js';
import {scientificDocument} from '../../src/forma/scientific-rules.js';
import {stepSVG} from '../../src/forma/work-export.js';
import {previewDataSync,applyDataSync,undoDataSync} from '../../src/forma/work-data-sync.js';
import {frameMeaning} from '../../src/forma/data-semantics.js';
const raw=()=>withRecordIds(getExample('bode'),{legacyNamespace:'frequency-test'}),doc=()=>frequencyDocument(raw());
const near=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<=eps*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const finite=layout=>{for(const mark of layout.marks){assert.equal(mark.points.length,128);assert.equal(mark.entrance.length,128);assert.ok(mark.points.flat().every(Number.isFinite),mark.key);}};

test('three frequency views use the full native response and exactly derived coordinates',()=>{
 for(const template of Object.keys(frequencyViewMap)){const native=raw();native.template=template;const input=structuredClone(native),d=frequencyDocument(native);assert.equal(d.frequencyUnit,native.frequencyUnit);assert.equal(d.data.length,native.data.length);assert.deepEqual(native,input);for(const v of frequencyViews)assert.equal(frequencyEligibility(d,v.id).valid,true);}
 const d=doc(),expected=response19(d.data).flatMap(c=>c.points),byId=new Map(expected.map(p=>[recordId(p.row),p]));
 for(const v of frequencyViews){const l=layoutFrequency(d,v.id);finite(l);assert.equal(l.marks.filter(m=>m.role==='response-magnitude').length,d.data.length);assert.equal(l.marks.filter(m=>m.role==='response-phase').length,d.data.length);
  for(const mark of l.marks.filter(m=>!m.role.endsWith('-link'))){const r=d.data[mark.row],p=byId.get(recordId(r));assert.equal(mark.editable,mark.frequencyLane==='phase'?'imag':'real');assert.ok(mark.opacity>0);assert.equal(mark.value,r[mark.editable]);if(v.id==='freq-bode'){near(l.scales.logFrequency.invert(mark.point[0]),Math.log10(r.frequency));near((mark.frequencyLane==='phase'?l.scales.phase:l.scales.magnitude).invert(mark.point[1]),mark.frequencyLane==='phase'?p.phase:p.db);}else if(v.id==='freq-nyquist'){near(l.scales.real.invert(mark.point[0]),r.real);near(l.scales.imag.invert(mark.point[1]),r.imag);}else{near(l.scales.phase.invert(mark.point[0]),p.phase);near(l.scales.magnitude.invert(mark.point[1]),p.db);}}
 }
 const l=layoutFrequency(d,'freq-nyquist');near(l.scales.real(1)-l.scales.real(0),l.scales.imag(0)-l.scales.imag(1));
});

test('all point and adjacent-link identities survive views, source row reordering and group renaming',()=>{
 const d=doc(),base=layoutFrequency(d,'freq-bode'),keys=base.marks.map(m=>m.key).sort(),native=raw(),colors=colorSubjects(native).map(s=>s.id).sort();assert.deepEqual([...new Set(base.marks.map(m=>m.colorIdentity))].sort(),colors);
 for(const view of frequencyViews)assert.deepEqual(layoutFrequency(d,view.id).marks.map(m=>m.key).sort(),keys);
 const changed=structuredClone(d);changed.data.reverse();changed.data.forEach((r,i)=>{r.label=`renamed ${i}`;r.group=`Curve ${r.group}`;});assert.equal(frequencyCompatibility(d,changed),'');
 assert.deepEqual(new Map(layoutFrequency(changed,'freq-bode').marks.map(m=>[m.key,m.points])),new Map(base.marks.map(m=>[m.key,m.points])));
 assert.equal(base.marks.filter(m=>m.role.endsWith('-link')).length,2*(d.data.length-2));for(const m of base.marks.filter(m=>m.role.endsWith('-link')))assert.equal(m.recordIds.length,2);
});

test('response updates preserve correspondence while unit/source/grid/membership changes safely reject',()=>{
 const d=doc(),changed=f=>{const c=structuredClone(d);f(c);return c;};assert.equal(frequencyCompatibility(d,changed(c=>{c.data[0].real+=.03;c.data[1].imag-=.01;})),'');
 for(const f of[c=>c.unit='V',c=>c.frequencyUnit='rad/s',c=>c.source.name='another source',c=>c.axes={x:'Another frequency'},c=>c.data[0].frequency*=.9,c=>c.data[0].group='B',c=>c.data[0]._id='different sample'])assert.notEqual(frequencyCompatibility(d,changed(f)),'');
});

test('invalid and undefined inputs retain their values and never become fake frequency samples',()=>{
 const d=doc();for(const mutate of[c=>c.data[0].real=null,c=>{c.data[0].real=0;c.data[0].imag=0;},c=>c.data[0].frequency=0,c=>c.data[0].frequency=c.data[1].frequency,c=>c.data[0]._id=c.data[1]._id,c=>c.data[0].group='',c=>c.frequencyUnit='',c=>c.data=c.data.slice(0,3)]){const bad=structuredClone(d);mutate(bad);const input=structuredClone(bad);for(const v of frequencyViews)assert.equal(frequencyEligibility(bad,v.id).valid,false);assert.deepEqual(bad,input);}
 const g=frequencyGuide(d,'freq-bode').join(' ');for(const word of ['real','imag','log10','360°'])assert.ok(g.includes(word));assert.match(g,/不补负频率|不拟合/);
});

test('small and large response scales, constant components and maximum samples stay finite at three sizes',()=>{
 for(const scale of [1e-12,1,1e12])for(const constant of [false,true]){const d=doc();d.data.forEach(r=>{r.real=constant?0:r.real*scale;r.imag=constant?scale:r.imag*scale;});for(const v of frequencyViews)for(const [w,h]of[[300,240],[800,440],[1280,720]])finite(layoutFrequency(d,v.id,w,h));const l=layoutFrequency(d,'freq-nyquist',800,440);assert.ok(l.scales.imag.domain()[1]-l.scales.imag.domain()[0]<scale*200);}
 const d=doc();d.data=Array.from({length:480},(_,i)=>({_id:`r:${i}`,label:`P${i}`,group:`G${Math.floor(i/120)}`,row:i,frequency:10**(-6+(i%120)*12/119),real:Math.cos(i/13)*(1+i%3),imag:Math.sin(i/13)*(1+i%3)}));assert.equal(frequencyEligibility(d,'freq-bode').valid,true);for(const v of frequencyViews){const l=layoutFrequency(d,v.id,300,240);finite(l);assert.equal(l.marks.filter(m=>m.role==='response-magnitude').length,480);}
});

test('all six transitions retain actual nodes and have repeatable reverse and jump frames',()=>{
 const win=new Window(),d=doc();let directions=0;
 for(const from of frequencyViews)for(const to of frequencyViews){if(from===to)continue;directions++;const chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:from.id,width:800,height:440}),identities=new Map([...chart.nodes].map(([k,n])=>[k,n.shape]));
  const a=chart.layout,seek=chart.setDocument(d,to.id,{manual:true,effect:'guided',recipe:'frequency-response'}),b=chart.layout;
  seek(.5);assert.equal(chart.guideLayer.getAttribute('opacity'),'0');const middle=structuredClone([...chart.current]);assert.ok(b.marks.some(m=>JSON.stringify(chart.current.get(m.key))!==JSON.stringify(a.marks.find(old=>old.key===m.key).points)&&JSON.stringify(chart.current.get(m.key))!==JSON.stringify(m.points)));assert.ok([...chart.current.values()].flat(2).every(Number.isFinite));
  seek(1);seek(.5);assert.deepEqual([...chart.current],middle);seek(0);a.marks.forEach(m=>assert.deepEqual(chart.current.get(m.key),m.points));seek(1);b.marks.forEach(m=>assert.deepEqual(chart.current.get(m.key),m.points));for(const [k,node]of identities)assert.equal(chart.nodes.get(k).shape,node);chart.destroy();
 }
 assert.equal(directions,6);win.happyDOM.close();
});

test('the ready-to-click preset shares native records, units, identities and palette across all three steps',()=>{
 assert.equal(frequencyRecords('missing'),null);const steps=frequencyRecords('frequency-response','coral');assert.equal(steps.length,3);assert.deepEqual(steps.map(s=>s.view),frequencyViews.map(v=>v.id));for(const s of steps){assert.deepEqual(s.doc.data,steps[0].doc.data);assert.equal(s.doc.frequencyUnit,'Hz');assert.equal(s.doc.unit,'gain ratio');assert.equal(s.options.palette,'coral');assert.equal(s.doc.source.type,'demo');assert.equal(s.dataGroup,steps[0].dataGroup);assert.ok(s.doc.data.every(r=>r._id));}steps[0].doc.data[0].real=900;assert.notEqual(steps[1].doc.data[0].real,900);
 const bounds=frequencyBounds(doc());for(const range of Object.values(bounds))assert.ok(range.every(Number.isFinite));
});


test('editor bindings, reversible interruption and SVG output preserve raw fields in both themes',()=>{
 const win=new Window(),native=raw(),d=frequencyDocument(native),colors=colorSubjects(native).map((s,i)=>({...s,color:i?'#00aacc':'#ac2266'}));
 for(const dark of [false,true]){const chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:'freq-bode',width:800,height:440,editable:true,dark,colorBindings:colors});
  for(const mark of chart.layout.marks.filter(m=>!m.role.endsWith('-link'))){const n=chart.nodes.get(mark.key),binding=colors.find(c=>c.id===mark.colorIdentity);assert.equal(n.shape.getAttribute('stroke'),binding.color);assert.equal(n.group.dataset.editField,mark.frequencyLane==='phase'?'imag':'real');assert.equal(Number(n.group.dataset.editRow),mark.row);}
  const seek=chart.setDocument(d,'freq-nyquist',{manual:true,effect:'guided',recipe:'frequency-response'});seek(.37);const interrupted=structuredClone([...chart.current]);const jump=chart.setDocument(d,'freq-nichols',{manual:true,resume:true,effect:'guided',recipe:'frequency-response'});jump(0);assert.deepEqual([...chart.current],interrupted);jump(.57);assert.ok([...chart.current.values()].flat(2).every(Number.isFinite));jump(1);chart.layout.marks.forEach(m=>assert.deepEqual(chart.current.get(m.key),m.points));assert.doesNotMatch(chart.svg.outerHTML,/NaN|Infinity/);chart.destroy();
 }win.happyDOM.close();
});

test('native work migration keeps frequency units, raw metadata, matching identities and SVG export',t=>{
 const work=newWork(frequencyRecords('frequency-response')),stored=cleanWork(JSON.parse(JSON.stringify(work)));assert.deepEqual(stored,work);
 for(const s of stored.steps){assert.equal(s.doc.frequencyUnit,'Hz');assert.equal(s.doc.unit,'gain ratio');assert.equal(stepReport(s).valid,true);assert.equal(scientificDocument(s).frequencyUnit,s.doc.frequencyUnit);}
 for(const a of stored.steps)for(const b of stored.steps){if(a.id!==b.id)assert.equal(transitionPlan(a,b,{steps:stored.steps}).mode,'morph');}
 const win=new Window(),previous=new Map();for(const [k,value]of Object.entries({document:win.document,XMLSerializer:win.XMLSerializer})){previous.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value,configurable:true,writable:true});}t.after(()=>{for(const [k,d]of previous){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}});for(const s of stored.steps){const svg=stepSVG(s,stored.steps);assert.doesNotMatch(svg.replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity/);assert.match(svg,/data-science-role="response-magnitude"/);}win.happyDOM.close();
 const independent=newWork([{doc:getExample('nyquist')}]);const zero=structuredClone(independent.steps[0]);zero.doc.data[0].real=0;zero.doc.data[0].imag=0;assert.equal(morphReady(zero),false);assert.equal(stepReport(zero).valid,true);
});

test('frequency metadata and guides switch language without translating user data',()=>{
 try{setLocale('en');const d=doc();for(const v of frequencyViews){assert.equal(v.name,v.en);assert.doesNotMatch(v.note,/\p{Script=Han}/u);assert.doesNotMatch(frequencyGuide(d,v.id).join(' '),/\p{Script=Han}/u);const l=layoutFrequency(d,v.id);assert.doesNotMatch(l.heading+' '+l.details,/\p{Script=Han}/u);}const p=frequencyRecords('frequency-response');assert.match(p[0].doc.source.name,/Synthetic data/);assert.equal(p[0].doc.data[0].group,'A');}finally{setLocale('zh-CN');}
});


test('table edits and draft restoration keep frequency metadata and the original complex response',()=>{
 const original=raw(),editor=createEditorModel(original);assert.equal(editor.report.valid,true);const ids=editor.recordIds();editor.setCell(0,3,'0.25');assert.equal(editor.report.valid,true);assert.equal(editor.doc.data[0].real,.25);assert.equal(editor.doc.frequencyUnit,'Hz');assert.equal(editor.doc.unit,'gain ratio');assert.deepEqual(editor.recordIds(),ids);
 const restored=createEditorModel(editor.doc,JSON.parse(JSON.stringify(editor.snapshot)));assert.equal(restored.doc.frequencyUnit,'Hz');assert.equal(restored.doc.unit,'gain ratio');assert.equal(restored.doc.data[0].real,.25);assert.deepEqual(restored.recordIds(),ids);
 restored.setMeta('frequencyUnit','rad/s');assert.equal(restored.doc.frequencyUnit,'rad/s');assert.deepEqual(restored.doc.data,editor.doc.data);restored.setMeta('unit','V/V');assert.equal(restored.doc.unit,'V/V');assert.equal(restored.doc.frequencyUnit,'rad/s');assert.deepEqual(restored.doc.data,editor.doc.data);
});


test('bilingual Agent guidance preserves the response contract and uses the original player',()=>{
 for(const english of [false,true]){const brief=frequencyAgentGuide(english);for(const token of ['freq-bode','freq-nyquist','freq-nichols','label/group/frequency/real/imag','_id','unit','frequencyUnit','source','hypot','log10','atan2','frequency-sample','frequency-link','recordId','populationId','real/imag','HTML','SVG'])assert.ok(brief.includes(token),token);assert.match(brief,english?/zero complex response.*undefined/:/零复响应.*未定义/);assert.match(brief,english?/Do not recreate the renderer/:/无需重写播放器/);assert.match(brief,english?/stability margins/:/稳定裕度/);if(english)assert.doesNotMatch(brief,/\p{Script=Han}/u);}
});


test('linked-step sync explicitly previews frequency-unit changes while preserving every raw response',()=>{
 const work=newWork(frequencyRecords('frequency-response')),source=work.steps[0],rawData=structuredClone(source.doc.data);source.doc.frequencyUnit='rad/s';const before=structuredClone(work),preview=previewDataSync(work,source.id);
 assert.equal(preview.targets.length,2);for(const target of preview.targets){assert.equal(target.eligible,true,target.reason);assert.equal(target.changed,0);const change=target.semanticChanges.find(c=>c.key==='frequencyUnit');assert.deepEqual(change,{key:'frequencyUnit',label:'频率单位',before:'Hz',after:'rad/s'});assert.equal(target.next.doc.frequencyUnit,'rad/s');assert.equal(target.next.doc.unit,'gain ratio');assert.deepEqual(target.next.doc.data,rawData);}
 assert.deepEqual(work,before,'preview must not change the original work');const applied=applyDataSync(work,preview,preview.targets.map(t=>t.id));for(const step of applied.work.steps){assert.equal(step.doc.frequencyUnit,'rad/s');assert.deepEqual(step.doc.data,rawData);}assert.deepEqual(undoDataSync(applied.work,applied.transaction),before);
});

test('frequency intermediate frames display settling guidance and same-sample meaning in both languages',()=>{
 try{for(const language of ['zh-CN','en']){setLocale(language);for(const {id}of frequencyViews){const middle=frameMeaning(id,{mode:'morph',progress:.5,fromView:id==='freq-bode'?'freq-nichols':'freq-bode'}),settled=frameMeaning(id,{mode:'morph',progress:1});assert.ok(middle.length>settled.length);assert.match(middle,language==='en'?/settle|settled|settles|stopped|stop/i:/停稳后读数/);assert.match(settled,language==='en'?/same sample|same observation/i:/同一采样/);if(language==='en')assert.doesNotMatch(middle,/\p{Script=Han}/u);}}}finally{setLocale('zh-CN');}
});
