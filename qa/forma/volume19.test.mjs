import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {volume19Catalog,volume19English} from '../../src/forma/volume19-catalog.js';
import {response19,smith19,windrose19,polar19,phasor19,regular19,eye19,volume19MethodNotes} from '../../src/forma/volume19-data.js';
import {getExample} from '../../src/forma/catalog.js';
import {validateDocument,parseDataText,toCSV} from '../../src/forma/data.js';
import {getDataGuide,agentBrief} from '../../src/forma/data-guides.js';
import {ChartScene} from '../../src/forma/charts.js';
import {staticSVG,standaloneHTML} from '../../src/forma/export.js';
import {makeProject,readProject} from '../../src/forma/project-file.js';
import {withRecordIds} from '../../src/forma/data-identity.js';
import {colorSubjects} from '../../src/forma/color-semantics.js';
import {setLocale} from '../../src/forma/locale.js';
const window=new Window();globalThis.document=window.document;globalThis.XMLSerializer=window.XMLSerializer;
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`),valid=d=>validateDocument(d).valid;
const scene=(doc,options={})=>new ChartScene(document.createElement('div'),doc,{width:680,height:360,interactive:false,editable:true,...options});
function finiteScene(s,id){const svg=s.serialize();assert.doesNotMatch(svg,/NaN|Infinity|undefined/,id);for(const element of s.svg.querySelectorAll('*'))for(const key of ['x','y','cx','cy','r','x1','x2','y1','y2','width','height'])if(element.hasAttribute(key)){const raw=element.getAttribute(key);if(!raw.includes('%'))assert.ok(Number.isFinite(Number(raw)),`${id} ${key}=${raw}`);}}
test('volume 19 has twelve bilingual engineering contracts with faithful tabular, project and export roundtrips',()=>{
 assert.equal(volume19Catalog.length,12);for(const t of volume19Catalog){const d=getExample(t.id);assert.ok(valid(d),`${t.id}: ${validateDocument(d).errors}`);assert.ok([...t.name].length<=10,t.id);assert.ok([...d.title].length<=22,t.id);assert.deepEqual(parseDataText(toCSV(d),d,'csv').data,d.data);assert.deepEqual(readProject(JSON.stringify(makeProject(d,{}))).doc,d);const guide=getDataGuide(t.id);assert.ok(guide.rowMeaning);assert.equal(guide.fields.length,t.fields.length);assert.equal(volume19English[t.id].fields.length,t.fields.length);assert.ok(agentBrief(d).includes(t.id));assert.ok(standaloneHTML(d,{},'var FormaPlayer={mount(){}};').includes(t.id));assert.ok(volume19MethodNotes(t.id).length);assert.match(staticSVG(d),/确定性合成/);}
});
test('complex response transforms use amplitude dB and local phase unwrapping without altering observations',()=>{
 const input=[170,-175,-150,-100].map((degrees,i)=>({label:`R${i}`,group:'A',frequency:i+1,real:2*Math.cos(degrees*Math.PI/180),imag:2*Math.sin(degrees*Math.PI/180)})),before=structuredClone(input),points=response19(input)[0].points;points.forEach(p=>near(p.db,20*Math.log10(2)));[170,185,210,260].forEach((v,i)=>near(points[i].phase,v));assert.deepEqual(input,before);
 for(const id of['bode','nichols']){const d=getExample(id);d.data[0].real=0;d.data[0].imag=0;assert.equal(validateDocument(d).dataValid,false,id);}const d=getExample('nyquist');d.data[0].real=0;d.data[0].imag=0;assert.ok(valid(d));
});
test('response curves reject duplicate or nonpositive frequency and keep exactly the supplied Nyquist locus',()=>{
 for(const id of['bode','nyquist','nichols','smith']){const d=getExample(id);d.data[1].frequency=d.data[0].frequency;assert.ok(!valid(d),id);d.data[1].frequency=-1;assert.ok(!valid(d));}
 const d=getExample('nyquist'),s=scene(d);assert.equal(s.svg.querySelectorAll('[data-mark="nyquist-sample"]').length,d.data.length);assert.equal(s.svg.querySelectorAll('[data-mark="nyquist-locus"]').length,2);for(const path of s.svg.querySelectorAll('[data-mark="nyquist-locus"]'))assert.doesNotMatch(path.getAttribute('d'),/Z$/i);s.destroy();
});
test('Smith transform preserves matched, shorted and reactive impedances and avoids square overflow',()=>{
 assert.deepEqual(smith19(50,0,50),{real:0,imag:0});assert.deepEqual(smith19(0,0,50),{real:-1,imag:0});near(smith19(0,50,50).real,0);near(smith19(0,50,50).imag,1);near(smith19(50,50,50).real,.2);near(smith19(50,50,50).imag,.4);const a=smith19(1e300,-1e300,1e300),b=smith19(1,-1,1);near(a.real,b.real);near(a.imag,b.imag);for(const resistance of[0,1,50,1e15])for(const reactance of[-1e15,0,50,1e15]){const p=smith19(resistance,reactance,50);assert.ok(Math.hypot(p.real,p.imag)<=1+1e-12);}
 const d=getExample('smith');d.referenceImpedance=0;assert.ok(!valid(d));d.referenceImpedance=50;d.data[0].real=-1;assert.ok(!valid(d));
});
test('pole-zero roots preserve multiplicity and explicitly distinguish continuous and discrete reference domains',()=>{
 const d=getExample('polezero');d.data[1].real=d.data[0].real;d.data[1].imag=d.data[0].imag;assert.ok(valid(d));let s=scene(d);assert.equal(s.svg.querySelectorAll('[data-mark="polezero-root"]').length,d.data.length);assert.ok(s.svg.textContent.includes('×2'));assert.equal(s.svg.querySelectorAll('[data-mark="polezero-unit-circle"]').length,0);s.destroy();d.systemDomain='discrete';s=scene(d);assert.equal(s.svg.querySelectorAll('[data-mark="polezero-unit-circle"]').length,1);s.destroy();d.systemDomain='guess';assert.ok(!valid(d));
});
test('wind-frequency bins use full sample denominator, half-open boundaries and retain calm observations',()=>{
 const d={windSectors:8,calmThreshold:.5,speedBreaks:[.5,2,5],data:[{label:'a',direction:null,speed:0},{label:'b',direction:0,speed:1},{label:'c',direction:22.5,speed:2},{label:'d',direction:337.5,speed:5},{label:'e',direction:359.99,speed:2}]},before=structuredClone(d),m=windrose19(d);near(m.calmFrequency,.2);near(m.cells.reduce((a,c)=>a+c.frequency,0),.8);assert.equal(m.cells.find(c=>c.sector===1&&c.bin===1).count,1);assert.equal(m.cells.find(c=>c.sector===0&&c.bin===2).count,1);assert.equal(m.cells.reduce((a,c)=>a+c.count,0)+m.calm.length,5);assert.deepEqual(d,before);
 const example=getExample('windrose');example.data[0].speed=2;assert.ok(!valid(example));example.data[0].direction=360;assert.ok(!valid(example));example.data[0].direction=0;assert.ok(valid(example));example.speedBreaks=[.5,2,2];assert.ok(!valid(example));
 const calm=getExample('windrose');calm.data.forEach(r=>{r.speed=0;r.direction=null;});const s=scene(calm,{width:300,height:240,compact:true});assert.equal(s.svg.querySelectorAll('[data-mark="wind-raw-observation"]').length,calm.data.length);assert.equal(s.svg.querySelectorAll('[data-mark="wind-frequency-bin"]').length,0);finiteScene(s,'all-calm windrose');for(const mark of s.svg.querySelectorAll('[data-mark="wind-raw-observation"]'))assert.ok(Number(mark.getAttribute('y2'))<=240);s.destroy();
});
test('compass polar coordinates preserve north-clockwise convention and keep zero-radius observations',()=>{
 near(polar19(0,2).x,0);near(polar19(0,2).y,2);near(polar19(90,2).x,2);near(polar19(90,2).y,0);near(polar19(180,2).y,-2);near(polar19(270,2).x,-2);const d=getExample('polarscatter');d.data[0].radius=0;assert.ok(valid(d));const s=scene(d);assert.equal(s.svg.querySelectorAll('[data-mark="polar-observation"]').length,d.data.length);s.destroy();d.data[0].radius=-1;assert.ok(!valid(d));d.data[0].radius=1;d.data[0].angle=360;assert.ok(!valid(d));
});
test('hodograph connects measured heights only, keeps signed components and uses a real height color domain',()=>{
 const d=getExample('hodograph');d.data[0].u=-3;d.data[0].v=0;const colors={mode:'sequential',low:'#123456',middle:'#abcdef',high:'#fedcba',center:0},s=scene(d,{valueColors:colors}),marks=[...s.svg.querySelectorAll('[data-mark="hodograph-level"]')];assert.equal(marks.length,d.data.length);assert.equal(s.svg.querySelectorAll('[data-mark="hodograph-segment"]').length,d.data.length-1);assert.equal(marks[0].getAttribute('fill'),colors.low);assert.equal(marks.at(-1).getAttribute('fill'),colors.high);s.destroy();d.data[1].height=d.data[0].height;assert.ok(!valid(d));
});
test('phasor resultant is a complex sum and explicit amplitude and frequency conventions are required',()=>{
 assert.deepEqual(phasor19([{real:3,imag:4},{real:-1,imag:-4}]),{real:2,imag:0});const d=getExample('phasor');d.data.forEach(r=>{r.real=0;r.imag=0;});assert.ok(valid(d));const s=scene(d);finiteScene(s,'zero phasors');assert.equal(s.svg.querySelectorAll('[data-mark="phasor-endpoint"]').length,d.data.length);s.destroy();d.phaseConvention='unknown';assert.ok(!valid(d));d.phaseConvention='rms';d.frequency=0;assert.ok(!valid(d));
});
test('eye diagram folds only observed samples, shares actual boundary observations and retains partial windows',()=>{
 const d=getExample('eyediagram'),before=structuredClone(d),m=eye19(d);assert.equal(m.samplesPerSymbol,16);assert.equal(m.points.length,d.data.length);assert.equal(new Set(m.points.map(p=>p.row.label)).size,d.data.length);for(const p of m.points){assert.equal(p.row.value,d.data.find(r=>r.label===p.row.label).value);assert.ok(p.phase>=0&&p.phase<2);}for(const trace of m.traces)for(const p of trace.points)assert.ok(d.data.includes(p.row));assert.equal(m.traces[0].points.at(-1).row,m.traces[1].points[0].row);assert.equal(m.traces[0].points.at(-1).phase,2);assert.deepEqual(d,before);
 const missing=structuredClone(d);missing.data.splice(50,1);assert.ok(!valid(missing));const misaligned=structuredClone(d);misaligned.timeOrigin=.01;assert.ok(!valid(misaligned));const fractional=structuredClone(d);fractional.symbolPeriod=.99;assert.ok(!valid(fractional));assert.equal(regular19([1e15,1e15+1,1e15+1]),false);
});
test('IQ constellation keeps signed and zero coordinates without imposing an ideal symbol grid',()=>{
 const d=getExample('constellation');d.data[0].real=0;d.data[0].imag=0;d.data[1].real=-3.123456789;const before=structuredClone(d),s=scene(d);assert.equal(s.svg.querySelectorAll('[data-mark="constellation-symbol"]').length,d.data.length);assert.ok([...s.svg.querySelectorAll('[data-tip]')].some(n=>n.dataset.tip.includes('-3.123456789')));assert.deepEqual(d,before);s.destroy();
});
test('Campbell marker areas track amplitude and preserve zeros while order references use rpm-to-Hz units',()=>{
 const d=getExample('campbell');d.data[0].amplitude=0;d.data[1].amplitude=1;d.data[2].amplitude=4;const s=scene(d),marks=[...s.svg.querySelectorAll('[data-mark="campbell-amplitude"]')];assert.equal(marks.length,d.data.length-1);assert.equal(s.svg.querySelectorAll('[data-mark="campbell-zero"]').length,1);near(Number(marks[1].getAttribute('r'))/Number(marks[0].getAttribute('r')),2);assert.deepEqual([...s.svg.querySelectorAll('[data-mark="campbell-order"]')].map(n=>Number(n.dataset.order)),[1,2,3]);assert.equal(s.svg.querySelectorAll('[data-mark="campbell-frequency"]').length,d.data.length);s.destroy();d.data[0].amplitude=-1;assert.ok(!valid(d));d.data[0].amplitude=0;d.orders=[1,1];assert.ok(!valid(d));
});
test('engineering raw tooltips retain original precision and persistent group colors reach plotted marks',()=>{
 const fields={bode:'real',nyquist:'real',nichols:'imag',polezero:'real',smith:'real',windrose:'speed',polarscatter:'radius',hodograph:'u',phasor:'real',eyediagram:'value',constellation:'imag',campbell:'amplitude'};for(const [id,key]of Object.entries(fields)){const d=getExample(id),row=d.data[id==='windrose'?1:0];row[key]=43.123456789;const s=scene(d);assert.ok([...s.svg.querySelectorAll('[data-tip]')].some(n=>n.dataset.tip.includes('43.123456789')),id);s.destroy();}
 for(const id of['bode','nyquist','nichols','smith','polarscatter','constellation']){const d=withRecordIds(getExample(id)),subject=colorSubjects(d)[0];assert.ok(subject,id);const s=scene(d,{colorBindings:[{id:subject.id,color:'#123456'}]});assert.ok([...s.svg.querySelectorAll('path,rect,circle,line')].some(n=>n.getAttribute('fill')==='#123456'||n.getAttribute('stroke')==='#123456'),id);s.destroy();}
});
test('twelve native layouts retain every input and seek reversibly across compact, dark and portrait sizes',()=>{
 for(const t of volume19Catalog)for(const options of[{width:300,height:240,compact:true},{width:680,height:360,dark:true},{width:400,height:650,colors:['#31567a','#af622e','#73935c']}]){const d=getExample(t.id),before=structuredClone(d),s=scene(d,options),final=s.serialize();s.render(0);assert.notEqual(s.serialize(),final,t.id);for(const p of[.13,.4,.83,1,.5,0,1]){s.render(p);finiteScene(s,t.id);}assert.equal(s.serialize(),final,t.id);assert.deepEqual(d,before);assert.ok(s.svg.querySelectorAll('[data-edit-row]').length>=d.data.length,t.id);s.destroy();}
});
test('accepted engineering datasets at extreme, constant and signed scales always render finite geometry',()=>{
 const cases=[['tiny',v=>v*1e-300],['zero',()=>0],['one',()=>1],['large',v=>Math.sign(v)*1e14],['negative',()=>-1e14]];let accepted=0;for(const t of volume19Catalog)for(const [name,transform]of cases){const d=getExample(t.id);for(const row of d.data)for(const [key,type]of t.fields)if(type==='number'||type==='number | null')if(typeof row[key]==='number')row[key]=transform(row[key]);const report=validateDocument(d);if(!report.valid)continue;accepted++;const s=scene(d);for(const p of[0,.4,1]){s.render(p);finiteScene(s,`${t.id}/${name}`);}s.destroy();}assert.ok(accepted>=10,`Only ${accepted} edge cases accepted`);
});
test('English engineering guides preserve method distinctions and missing metadata is never inferred',()=>{
 try{setLocale('en');for(const t of volume19Catalog){const guide=getDataGuide(t.id);assert.doesNotMatch([guide.introduction,guide.rowMeaning,guide.use,guide.avoid,guide.limit,...guide.fields.map(f=>f.description),...guide.notes].join(' '),/[\u3400-\u9fff]/,t.id);}}finally{setLocale('zh-CN');}
 const required={bode:['frequencyUnit'],nyquist:['frequencyUnit'],nichols:['frequencyUnit'],polezero:['systemDomain'],smith:['referenceImpedance','frequencyUnit'],windrose:['calmThreshold','speedBreaks','windSectors'],hodograph:['heightUnit'],phasor:['phaseConvention','frequency','frequencyUnit'],eyediagram:['symbolPeriod','timeOrigin','timeUnit'],campbell:['orders']};for(const [id,keys]of Object.entries(required))for(const key of keys){const d=getExample(id);delete d[key];assert.equal(validateDocument(d).dataValid,false,`${id}.${key}`);}
});
