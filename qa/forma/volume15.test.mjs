import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {volume15Catalog,volume15English} from '../../src/forma/volume15-catalog.js';
import {weibull15,meanExcess15,ttt15,recurrence15,regular15,spectrum15,volume15MethodNotes} from '../../src/forma/volume15-data.js';
import {getExample} from '../../src/forma/catalog.js';
import {validateDocument,parseDataText,toCSV} from '../../src/forma/data.js';
import {getDataGuide,agentBrief} from '../../src/forma/data-guides.js';
import {ChartScene} from '../../src/forma/charts.js';
import {staticSVG,standaloneHTML} from '../../src/forma/export.js';
import {makeProject,readProject} from '../../src/forma/project-file.js';
import {setLocale} from '../../src/forma/locale.js';
import {withRecordIds} from '../../src/forma/data-identity.js';
import {colorSubjects} from '../../src/forma/color-semantics.js';
const window=new Window();globalThis.document=window.document;globalThis.XMLSerializer=window.XMLSerializer;
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const rows=values=>values.map((value,i)=>({label:`L${i}`,value}));
const valid=doc=>validateDocument(doc).valid;
const scene=(doc,options={})=>new ChartScene(document.createElement('div'),doc,{width:680,height:360,interactive:false,editable:true,...options});
test('volume 15 provides eight complete bilingual contracts with editable metadata and runnable exports',()=>{
 assert.equal(volume15Catalog.length,8);for(const t of volume15Catalog){const d=getExample(t.id);assert.ok(valid(d),`${t.id}: ${validateDocument(d).errors}`);assert.deepEqual(parseDataText(toCSV(d),d,'csv').data,d.data);assert.deepEqual(readProject(JSON.stringify(makeProject(d,{}))).doc,d);const guide=getDataGuide(t.id);assert.ok(guide.rowMeaning);assert.equal(guide.fields.length,t.fields.length);assert.equal(volume15English[t.id].fields.length,t.fields.length);assert.ok(agentBrief(d).includes(t.id));assert.ok(standaloneHTML(d,{},'var FormaPlayer={mount(){}};').includes(t.id));assert.ok(volume15MethodNotes(t.id).length);assert.match(staticSVG(d),/确定性合成/);}
});
test('Lexis lifelines retain calendar age identity and reject reversed or impossible observation windows',()=>{
 const d=getExample('lexis'),r=d.data[0];r.entryPeriod=2000.25;r.entryAge=37.5;r.exitPeriod=2010.5;const before=structuredClone(d),s=scene(d),mark=s.svg.querySelector('[data-mark="lexis-lifeline"]');near(Number(mark.dataset.birthYear),1962.75);assert.equal(s.svg.querySelectorAll('[data-edit-field="entryAge"]').length,d.data.length);assert.equal(s.svg.querySelectorAll('[data-edit-field="exitPeriod"]').length,d.data.length);assert.deepEqual(d,before);s.destroy();r.exitPeriod=r.entryPeriod;assert.ok(!valid(d));r.exitPeriod=2010.5;r.entryAge=-1;assert.ok(!valid(d));
});
test('swimmer preserves null responses, zero-time responses and observed continuation endpoints',()=>{
 const d=getExample('swimmer');d.data[0].start=0;d.data[0].response=0;assert.ok(valid(d));let s=scene(d);assert.equal(s.svg.querySelectorAll('[data-mark="swimmer-response"]').length,d.data.filter(r=>r.response!==null).length);assert.equal(s.svg.querySelectorAll('[data-mark="swimmer-ongoing"]').length,d.data.filter(r=>r.ongoing).length);assert.ok(s.svg.querySelector('[data-response="0"]'));s.destroy();d.data[0].response=d.data[0].end+.1;assert.ok(!valid(d));d.data[0].response=null;d.data[0].ongoing=2;assert.ok(!valid(d));d.data[0].ongoing=1;d.data[0].response='missing';assert.ok(!valid(d));
});
test('event histories reject overlap without bridging gaps or merging original interval records',()=>{
 const d=getExample('eventhistory'),before=structuredClone(d),s=scene(d);assert.equal(s.svg.querySelectorAll('[data-mark="event-history-interval"]').length,d.data.length);assert.deepEqual(d,before);const gap=d.data.filter(r=>r.subject==='D04');assert.ok(gap[2].start>gap[1].end);s.destroy();d.data[1].start=d.data[0].end-.1;assert.ok(!valid(d));d.data[1].start=d.data[0].end;assert.ok(valid(d));d.data[1].end=d.data[1].start;assert.ok(!valid(d));
});
test('scalar recurrence uses inclusive original-unit distances and remains symmetric with its identity diagonal',()=>{
 const data=[{label:'A',time:0,value:0},{label:'B',time:1,value:1},{label:'C',time:2,value:2}],before=structuredClone(data),m=recurrence15(data,1);assert.equal(m.cells.length,9);assert.equal(m.cells.filter(c=>c.recurrent).length,7);assert.ok(m.cells.filter(c=>c.i===c.j).every(c=>c.recurrent));for(const c of m.cells)assert.equal(c.recurrent,m.cells.find(d=>d.i===c.j&&d.j===c.i).recurrent);assert.deepEqual(data,before);const d=getExample('recurrence');d.threshold=0;assert.ok(valid(d));d.data[5].time=d.data[4].time;assert.ok(!valid(d));d.data[5].time=1.01;assert.ok(!valid(d));
 assert.equal(regular15([1e15,1e15+1,1e15+1]),false);assert.equal(regular15([1e15,1e15+1,1e15+3]),false);assert.equal(regular15([0,.2,.4,.6000000000000001]),true);
 const big=getExample('recurrence');big.data.forEach((r,i)=>r.time=1e15+i);big.data[5].time=big.data[4].time;assert.equal(validateDocument(big).dataValid,false);
});
test('Weibull positions use median ranks without fitting, dropping ties or allowing censored lifetimes',()=>{
 const input=rows([1,2,2,4,8]),m=weibull15(input);near(m[0].p,.7/5.4);near(m.at(-1).p,4.7/5.4);near(m[0].x,0);near(m[1].x,Math.log(2));assert.equal(m[1].x,m[2].x);assert.notEqual(m[1].p,m[2].p);near(m[3].y,Math.log(-Math.log1p(-m[3].p)));const d=getExample('weibull');d.data[0].value=0;assert.ok(!valid(d));d.data[0].value=1;d.data[0].censored=true;assert.equal(validateDocument(d).dataValid,false);
});
test('mean excess uses strict exceedances, retains tied mass and declares sparse-tail suppression',()=>{
 const input=rows([1,2,2,5,10]),before=structuredClone(input),m=meanExcess15(input,2);assert.deepEqual(m.map(p=>[p.threshold,p.count]),[[1,4],[2,2]]);near(m[0].mean,15/4);near(m[1].mean,5.5);assert.deepEqual(input,before);const d=getExample('meanexcess'),s=scene(d);assert.equal(s.svg.querySelectorAll('[data-mark="reliability-raw"]').length,d.data.length);assert.equal(s.svg.querySelectorAll('[data-mark="mean-excess-point"][data-edit-row]').length,0);s.destroy();d.minExceedances=d.data.length;assert.ok(!valid(d));d.minExceedances=2;d.data.forEach(r=>r.value=4);assert.ok(!valid(d));
});
test('total time on test matches complete-lifetime formula and is unit-scale invariant',()=>{
 const input=rows([3,1,2]),before=structuredClone(input),m=ttt15(input);assert.deepEqual(m.map(p=>p.fraction),[0,1/3,2/3,1]);near(m[1].total,.5);near(m[2].total,5/6);near(m[3].total,1);assert.deepEqual(input,before);const tiny=ttt15(rows([3e-220,1e-220,2e-220]));m.forEach((p,i)=>near(p.total,tiny[i].total));const constant=ttt15(rows([2,2,2]));assert.deepEqual(constant.map(p=>p.total),[0,1,1,1]);const d=getExample('ttt');d.data[0].value=-1;assert.ok(!valid(d));d.data[0].value=1;d.data[0].event=0;assert.equal(validateDocument(d).dataValid,false);
});
test('spectrogram requires a complete regular power matrix and respects original power units and color bounds',()=>{
 const d=getExample('spectrogram'),m=spectrum15(d.data);assert.equal(m.times.length,30);assert.equal(m.frequencies.length,20);near(m.dt,.25);near(m.df,5);const valueColors={mode:'sequential',low:'#123456',middle:'#789abc',high:'#fedcba',center:0};d.data[0].power=0;const s=scene(d,{valueColors}),marks=[...s.svg.querySelectorAll('[data-mark="spectrogram-cell"]')];assert.equal(marks.length,d.data.length);assert.equal(marks.find(n=>Number(n.dataset.power)===0).getAttribute('fill'),'#123456');assert.equal(marks.find(n=>Number(n.dataset.power)===m.max).getAttribute('fill'),'#fedcba');assert.equal(marks.filter(n=>n.dataset.editField==='power').length,d.data.length);s.destroy();d.data.pop();assert.ok(!valid(d));const negative=getExample('spectrogram');negative.data[0].power=-.1;assert.ok(!valid(negative));const irregular=getExample('spectrogram');irregular.data.forEach(r=>{if(r.time===.5)r.time=.51;});assert.ok(!valid(irregular));
});
test('volume 15 raw tooltips preserve precision and advertised group color bindings reach original marks',()=>{
 for(const id of['lexis','swimmer','eventhistory','recurrence','weibull','meanexcess','ttt','spectrogram']){const d=getExample(id),key={lexis:'entryAge',swimmer:'end',eventhistory:'start',recurrence:'value',spectrogram:'power'}[id]||'value',value=id==='eventhistory'?.123456789:id==='swimmer'?24.123456789:43.123456789;d.data[0][key]=value;const s=scene(d);assert.ok([...s.svg.querySelectorAll('[data-tip]')].some(n=>n.dataset.tip.includes(String(value))),id);s.destroy();}
 for(const id of['lexis','swimmer']){const d=withRecordIds(getExample(id)),subject=colorSubjects(d)[0],s=scene(d,{colorBindings:[{id:subject.id,color:'#123456'}]});assert.ok([...s.svg.querySelectorAll('[fill],[stroke]')].some(n=>n.getAttribute('fill')==='#123456'||n.getAttribute('stroke')==='#123456'),id);s.destroy();}
});
test('new native entrances seek reversibly at compact, wide, dark and portrait sizes without losing records',()=>{
 for(const t of volume15Catalog)for(const options of[{width:300,height:240,compact:true},{width:680,height:360,dark:true},{width:400,height:650,colors:['#31567a','#af622e','#73935c']}]){const d=getExample(t.id),before=structuredClone(d),s=scene(d,options),final=s.serialize();s.render(0);assert.notEqual(s.serialize(),final,t.id);for(const p of[.13,.41,.87,1,.5,0,1]){s.render(p);assert.doesNotMatch(s.serialize(),/NaN|Infinity|undefined/,t.id);}assert.equal(s.serialize(),final,t.id);assert.deepEqual(d,before);assert.ok(s.svg.querySelectorAll('[data-edit-row]').length>=d.data.length,t.id);s.destroy();}
});
test('English methodological notes preserve full schema semantics without Chinese fallback',()=>{try{setLocale('en');for(const t of volume15Catalog){const guide=getDataGuide(t.id);assert.doesNotMatch([guide.introduction,guide.rowMeaning,guide.use,guide.avoid,guide.limit,...guide.fields.map(f=>f.description),...guide.notes].join(' '),/[\u3400-\u9fff]/,t.id);}}finally{setLocale('zh-CN');}});
