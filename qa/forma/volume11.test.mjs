import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample,findTemplate} from '../../src/forma/catalog.js';
import {volume11Catalog,volume11English} from '../../src/forma/volume11-catalog.js';
import {proportion11,defects11,cusum11,ewma11,xbar11,lagPairs11,spectrum11,forecastKeys11} from '../../src/forma/volume11-data.js';
import {validateDocument,toCSV,parseDataText} from '../../src/forma/data.js';
import {getDataGuide,agentBrief} from '../../src/forma/data-guides.js';
import {ChartScene} from '../../src/forma/charts.js';
import {staticSVG,standaloneHTML} from '../../src/forma/export.js';
import {makeProject,readProject} from '../../src/forma/project-file.js';
import {withRecordIds} from '../../src/forma/data-identity.js';
import {setLocale} from '../../src/forma/locale.js';
const window=new Window();globalThis.document=window.document;globalThis.XMLSerializer=window.XMLSerializer;
const near=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
const scene=(doc,options={})=>new ChartScene(document.createElement('div'),doc,{width:680,height:360,interactive:false,...options});
const invalid=(id,change)=>{const doc=getExample(id);change(doc);const report=validateDocument(doc);assert.equal(report.dataValid,false,`${id} unexpectedly valid: ${JSON.stringify(doc)}`);};

test('volume 11 has eight complete native contracts with Excel, project and Agent roundtrips',()=>{
 assert.equal(volume11Catalog.length,8);
 for(const template of volume11Catalog){
  const doc=getExample(template.id),original=structuredClone(doc),report=validateDocument(doc),guide=getDataGuide(template.id);
  assert.ok(report.valid,`${template.id}: ${report.errors}`);assert.equal(findTemplate(template.id).edition,11);
  assert.deepEqual(parseDataText(toCSV(doc),doc,'csv').data,doc.data);assert.deepEqual(readProject(JSON.stringify(makeProject(doc,{}))).doc,doc);
  assert.ok(guide.rowMeaning);assert.equal(guide.fields.length,template.fields.length);assert.ok(guide.notes.length>=2);assert.ok(agentBrief(doc).includes(template.id));
  assert.ok(standaloneHTML(doc,{},'var FormaPlayer={mount(){}};').includes(template.id));assert.deepEqual(doc,original);assert.match(staticSVG(doc),/确定性合成数据/);
 }
});
test('p-chart weights by inspected items and retains per-batch clipped binomial limits',()=>{
 const rows=[{defectives:2,sampleSize:10},{defectives:8,sampleSize:90}],stats=proportion11(rows);
 near(stats.center,.1);near(stats.points[0].value,.2);near(stats.points[1].value,8/90);
 near(stats.points[0].high,.1+3*Math.sqrt(.1*.9/10));assert.equal(stats.points[0].low,0);assert.ok(stats.points[1].high<stats.points[0].high);
 const allBad=proportion11([{defectives:5,sampleSize:5}]);assert.deepEqual([allBad.points[0].low,allBad.points[0].high],[1,1]);
 invalid('pcontrol',d=>d.data[0].defectives=d.data[0].sampleSize+1);invalid('pcontrol',d=>d.data[0].sampleSize=3.5);invalid('pcontrol',d=>d.unit='items');
});
test('u-chart accepts defect rates above one and weights baseline by unequal exposure',()=>{
 const stats=defects11([{defects:6,exposure:2},{defects:10,exposure:6}]);near(stats.center,2);near(stats.points[0].value,3);near(stats.points[1].value,10/6);
 near(stats.points[0].high,5);near(stats.points[1].high,2+3*Math.sqrt(2/6));assert.equal(stats.points[0].low,0);
 invalid('ucontrol',d=>d.data[0].exposure=0);invalid('ucontrol',d=>d.data[0].defects=.5);invalid('ucontrol',d=>d.data[0].exposure=Number.MIN_VALUE);
});
test('tabular CUSUM keeps both one-sided recurrences, external baseline and no automatic reset',()=>{
 const doc={target:10,sigma:2,referenceK:.5,decisionH:2,data:[10,12,14,8,6].map(value=>({value}))},result=cusum11(doc),before=structuredClone(doc);
 assert.deepEqual(result.map(p=>p.upper),[0,.5,2,.5,0]);assert.deepEqual(result.map(p=>p.lower),[0,0,0,.5,2]);assert.deepEqual(doc,before);
 const signal=cusum11({...doc,data:[16,16,16].map(value=>({value}))});assert.deepEqual(signal.map(p=>p.upper),[2.5,5,7.5]);
 invalid('cusum',d=>d.sigma=0);invalid('cusum',d=>d.referenceK=-.5);invalid('cusum',d=>d.decisionH=NaN);invalid('cusum',d=>d.sigma=Number.MIN_VALUE);
});
test('EWMA uses startup variance, is exact at lambda=1 and distinguishes weighted from raw points',()=>{
 const doc={target:50,sigma:2,lambda:.3,limitSigma:3,data:[52,47,53].map(value=>({value}))},points=ewma11(doc);
 near(points[0].value,50.6);near(points[1].value,49.52);near(points[2].value,50.564);
 near(points[0].high,51.8);near(points[1].high,50+3*2*Math.sqrt(.3/(2-.3)*(1-.7**4)));assert.ok(points[0].high<points[1].high);
 const identity=ewma11({...doc,lambda:1});assert.deepEqual(identity.map(p=>p.value),[52,47,53]);identity.forEach(p=>{near(p.high,56);near(p.low,44);});
 invalid('ewma',d=>d.lambda=0);invalid('ewma',d=>d.lambda=1.01);invalid('ewma',d=>d.target=Infinity);
 const input=withRecordIds(getExample('ewma')),s=scene(input,{editable:true}),raw=s.svg.querySelectorAll('[data-mark="ewma-observation"]'),derived=s.svg.querySelectorAll('[data-mark="ewma-point"]');
 assert.equal(raw.length,input.data.length);assert.equal(derived.length,input.data.length);assert.ok([...raw].every(m=>m.getAttribute('data-edit-field')==='value'));assert.ok([...derived].every(m=>!m.hasAttribute('data-edit-row')));assert.equal(JSON.parse(derived[2].getAttribute('data-record-ids')).length,3);s.destroy();
});
test('X-bar/R uses common subgroup factors, binds raw observations and all members of derived marks',()=>{
 const rows=[[1,3],[2,4],[3,5]].flatMap((values,i)=>values.map((value,j)=>({period:String(i),sample:String(j),value}))),stats=xbar11(rows);
 assert.equal(stats.n,2);near(stats.center,3);near(stats.range,2);near(stats.low,3-1.88*2);near(stats.high,3+1.88*2);near(stats.rangeHigh,3.267*2);assert.equal(stats.rangeLow,0);
 invalid('xbar',d=>d.data.pop());invalid('xbar',d=>d.data[1].sample=d.data[0].sample);invalid('xbar',d=>d.data.forEach(r=>r.value=1));
 const doc=withRecordIds(getExample('xbar')),s=scene(doc,{editable:true}),raw=s.svg.querySelectorAll('[data-mark="xbar-observation"]');assert.equal(raw.length,doc.data.length);assert.ok([...raw].every(m=>m.getAttribute('data-edit-field')==='value'));
 for(const m of s.svg.querySelectorAll('[data-mark="xbar-mean"], [data-mark="xbar-range"]')){assert.equal(JSON.parse(m.getAttribute('data-record-ids')).length,5);assert.ok(!m.hasAttribute('data-edit-row'));}s.destroy();
});
test('lag plot has exact ordered pairs, equal geometric scales and no fabricated leading pairs',()=>{
 const doc=getExample('lagplot');doc.data=[1,4,2,8,3,6].map((value,i)=>({period:String(i+1),value}));doc.lag=2;
 assert.deepEqual(lagPairs11(doc).map(p=>[p.x,p.y]),[[1,2],[4,8],[2,3],[8,6]]);
 const s=scene(doc),marks=[...s.svg.querySelectorAll('[data-mark="lag-pair"]')],diagonal=s.svg.querySelector('[data-mark="lag-equality"]');assert.equal(marks.length,4);near(+diagonal.getAttribute('x2')-+diagonal.getAttribute('x1'),+diagonal.getAttribute('y1')-+diagonal.getAttribute('y2'));assert.deepEqual(JSON.parse(marks[0].getAttribute('data-source-rows')),[0,2]);s.destroy();
 invalid('lagplot',d=>d.lag=d.data.length-1);invalid('lagplot',d=>d.data[0].value=null);
});
test('one-sided spectrum obeys Parseval, sample interval scaling and the undoubled Nyquist bin',()=>{
 const n=32,values=Array.from({length:n},(_,i)=>10+3*Math.sin(2*Math.PI*4*i/n)),spectrum=spectrum11(values,.25),peak=spectrum.reduce((a,b)=>b.power>a.power?b:a);
 assert.equal(peak.k,4);near(peak.frequency,.5);near(peak.power,4.5);near(spectrum.reduce((v,p)=>v+p.power,0),4.5);
 const nyquist=spectrum11(Array.from({length:8},(_,i)=>i%2?-2:2),1);near(nyquist.at(-1).power,4);near(nyquist.reduce((a,p)=>a+p.power,0),4);
 const odd=Array.from({length:9},(_,i)=>2*Math.cos(2*Math.PI*4*i/9));near(spectrum11(odd,1).at(-1).power,2);
 const tiny=spectrum11(values.map(v=>v*1e-12),.25);near(tiny[3].power/1e-24,4.5);assert.deepEqual(values,Array.from({length:n},(_,i)=>10+3*Math.sin(2*Math.PI*4*i/n)));
 invalid('periodogram',d=>d.sampleInterval=0);invalid('periodogram',d=>d.sampleInterval=Number.MIN_VALUE);invalid('periodogram',d=>d.timeUnit='');invalid('periodogram',d=>d.data.forEach(r=>r.value=1));
});
test('forecast fan enforces temporal separation, complete nesting and field-exact editable endpoints',()=>{
 invalid('forecastfan',d=>d.data[0].median=0);invalid('forecastfan',d=>d.data.at(-1).lower95=d.data.at(-1).lower50+1);invalid('forecastfan',d=>d.data.at(-1).upper80=null);invalid('forecastfan',d=>d.data.at(-1).observed=100);
 const doc=withRecordIds(getExample('forecastfan')),s=scene(doc,{editable:true}),future=doc.data.filter(d=>d.observed===null);assert.equal(s.svg.querySelectorAll('[data-mark^="forecast-band-"]').length,3);assert.equal(s.svg.querySelectorAll('[data-mark="forecast-bound"]').length,future.length*6);
 for(const mark of s.svg.querySelectorAll('[data-mark="forecast-bound"], [data-mark="forecast-estimate"]')){const row=doc.data[+mark.getAttribute('data-edit-row')],field=mark.getAttribute('data-edit-field');assert.ok(forecastKeys11.includes(field));near(+mark.getAttribute('data-value'),row[field]);}s.destroy();
});
test('native entrances seek deterministically across compact, wide, tall, dark and custom-color layouts',()=>{
 for(const t of volume11Catalog){const doc=getExample(t.id),before=structuredClone(doc);for(const options of [{width:300,height:220,compact:true},{width:720,height:380},{width:350,height:620},{width:480,height:280,dark:true},{width:600,height:320,colors:['#234567','#ab5634','#567843']}]){
  const s=scene(doc,options),final=s.serialize();for(const p of [0,.1,.25,.5,.75,1,.45,0,1]){s.render(p);assert.doesNotMatch(s.serialize(),/NaN|Infinity/,`${t.id} at ${p}`);}assert.equal(s.serialize(),final,t.id);assert.ok(s.svg.querySelectorAll('[data-mark]').length>0);if(options.colors)assert.ok(s.serialize().includes('#234567'),`${t.id} ignored custom colors`);s.destroy();
 }assert.deepEqual(doc,before,t.id);}
});
test('every guide preserves specific statistical meanings in English and Chinese',()=>{
 try{for(const locale of ['zh-CN','en']){setLocale(locale);for(const t of volume11Catalog){const g=getDataGuide(t.id);assert.ok(g.rowMeaning);if(locale==='en'){assert.equal(g.rowMeaning,volume11English[t.id].rowMeaning);assert.deepEqual(g.fields.map(f=>f.description),volume11English[t.id].fields.map(f=>f[2]));assert.doesNotMatch(g.notes.join(' '),/[\u4e00-\u9fff]/);}assert.ok(g.notes.length>=2);}}}finally{setLocale('zh-CN');}
});
test('parameter magnitudes and derived display domains reject overflow and unusable subnormal scales',()=>{
 invalid('cusum',d=>d.decisionH=1e308);
 invalid('ewma',d=>{d.target=1.7e308;d.sigma=1;d.lambda=1e-308;});
 invalid('cusum',d=>{d.target=0;d.sigma=1e-308;d.data=[1,0,-1,0].map((value,i)=>({period:String(i),value}));});
 invalid('cusum',d=>{d.target=0;d.sigma=1;d.referenceK=Number.MIN_VALUE;d.decisionH=Number.MIN_VALUE;d.data=[0,0,0,0].map((value,i)=>({period:String(i),value}));});
 invalid('periodogram',d=>d.data.forEach((row,i)=>row.value=(i+1)*Number.MIN_VALUE));
 const doc=getExample('ewma');doc.target=0;doc.sigma=1e-120;doc.lambda=1e-120;doc.data=[1,2,3,4].map((v,i)=>({period:String(i),value:v*1e-120}));assert.ok(validateDocument(doc).valid);
 const stats=ewma11(doc);assert.ok(stats[0].high>0);near(stats[0].high/(doc.limitSigma*doc.sigma*doc.lambda),1,1e-12);
 const s=scene(doc);assert.doesNotMatch(s.serialize(),/NaN|Infinity/);s.destroy();
});
test('compact period ticks reserve readable spacing for the last observation',()=>{
 for(const id of ['pcontrol','ucontrol','cusum','ewma','xbar','forecastfan']){const s=scene(getExample(id),{width:360,height:270,compact:true}),labels=[...s.svg.querySelectorAll('[data-mark="process-period-label"]')];for(let i=1;i<labels.length;i++)assert.ok(+labels[i].getAttribute('x')-+labels[i-1].getAttribute('x')>=28,`${id} overlapping period labels`);s.destroy();}
});
test('raw values and supplied forecast bounds keep all numeric precision in tooltips',()=>{
 const value=123.456789123;
 for(const [id,mark]of[['cusum','cusum-upper-point'],['ewma','ewma-observation'],['xbar','xbar-observation'],['lagplot','lag-pair']]){const doc=getExample(id);doc.data[0].value=value;const s=scene(doc);assert.ok(s.svg.querySelector(`[data-mark="${mark}"]`).getAttribute('data-tip').includes(String(value)),id);s.destroy();}
 const doc=getExample('forecastfan');doc.data[0].observed=value;const last=doc.data.at(-1);last.upper95=200.123456789;const s=scene(doc);assert.ok(s.svg.querySelector('[data-mark="forecast-observation"]').getAttribute('data-tip').includes(String(value)));assert.ok([...s.svg.querySelectorAll('[data-field="upper95"]')].at(-1).getAttribute('data-tip').includes(String(last.upper95)));s.destroy();
});
