import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {volume14Catalog,volume14English} from '../../src/forma/volume14-catalog.js';
import {andrewsValue14,andrews14,taylor14,target14,youden14,contingency14,volume14MethodNotes} from '../../src/forma/volume14-data.js';
import {getExample} from '../../src/forma/catalog.js';
import {validateDocument,parseDataText,toCSV} from '../../src/forma/data.js';
import {getDataGuide,agentBrief} from '../../src/forma/data-guides.js';
import {ChartScene} from '../../src/forma/charts.js';
import {staticSVG,standaloneHTML} from '../../src/forma/export.js';
import {makeProject,readProject} from '../../src/forma/project-file.js';
import {setLocale} from '../../src/forma/locale.js';
const window=new Window();globalThis.document=window.document;globalThis.XMLSerializer=window.XMLSerializer;
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`),valid=d=>validateDocument(d).valid;
const scene=(doc,options={})=>new ChartScene(document.createElement('div'),doc,{width:680,height:360,interactive:false,editable:true,...options});
function table(counts,id='association'){const d=getExample(id),names=counts.map((_,i)=>`C${i+1}`);d.categories=names;d.data=counts.flatMap((values,i)=>values.map((count,j)=>({row:names[i],column:names[j],count})));return d;}

test('volume 14 publishes eight complete distinct contracts with native export and roundtrip metadata',()=>{
 assert.equal(volume14Catalog.length,8);assert.deepEqual(volume14Catalog.map(t=>t.no),Array.from({length:8},(_,i)=>String(145+i)));
 for(const t of volume14Catalog){const d=getExample(t.id);assert.ok(valid(d),`${t.id}: ${validateDocument(d).errors}`);assert.deepEqual(parseDataText(toCSV(d),d,'csv').data,d.data);assert.deepEqual(readProject(JSON.stringify(makeProject(d,{}))).doc,d);const guide=getDataGuide(t.id);assert.equal(guide.fields.length,t.fields.length);assert.equal(volume14English[t.id].fields.length,t.fields.length);assert.ok(guide.rowMeaning);assert.ok(agentBrief(d).includes(t.id));assert.ok(standaloneHTML(d,{},'var FormaPlayer={mount(){}};').includes(t.id));assert.match(staticSVG(d),/确定性合成/);assert.equal(volume14MethodNotes(t.id).length,1);}
});
test('Andrews basis is ordered Fourier coefficients and preserves each source observation',()=>{
 near(andrewsValue14([Math.SQRT2,2,3,4,5],0),9);near(andrewsValue14([Math.SQRT2,2,3,4,5],Math.PI/2),-2);near(andrewsValue14([Math.SQRT2,2,3,4,5],Math.PI),3);
 const d=getExample('andrews'),before=structuredClone(d),m=andrews14(d);assert.equal(m.length,18);assert.equal(m[0].points.length,161);near(m[0].points[0].value,m[0].points.at(-1).value);assert.deepEqual(d,before);const s=scene(d);assert.equal(s.svg.querySelectorAll('[data-mark="andrews-coefficient"][data-edit-field="value"]').length,d.data.length);assert.equal(s.svg.querySelectorAll('[data-mark="andrews-curve"][data-edit-row]').length,0);s.destroy();
 d.data.pop();assert.ok(!valid(d));const wrong=getExample('andrews');wrong.data[1].group='different';assert.ok(!valid(wrong));wrong.data[1].group=wrong.data[0].group;wrong.variables.reverse();assert.ok(valid(wrong));assert.notDeepEqual(andrews14(wrong)[0].points,m[0].points);
});
test('PCA biplot retains precomputed coordinates and explicit scaling without fitting',()=>{
 const d=getExample('biplot'),before=structuredClone(d),s=scene(d),scores=s.svg.querySelectorAll('[data-mark="biplot-score"]'),loads=s.svg.querySelectorAll('[data-mark="biplot-loading"]');assert.equal(scores.length,30);assert.equal(loads.length,5);assert.equal(Number(loads[0].dataset.x),d.data.find(r=>r.kind==='loading').x);assert.deepEqual(d,before);s.destroy();
 d.loadingScale=0;assert.ok(!valid(d));d.loadingScale=2;delete d.scaling;assert.ok(!valid(d));d.scaling='Scores and eigenvectors, display-only loading scale';d.variance1=80;d.variance2=40;assert.ok(!valid(d));d.variance1=48;d.variance2=27;d.data.find(r=>r.kind==='loading').x=0;d.data.find(r=>r.kind==='loading').y=0;assert.ok(!valid(d));
});
test('Taylor geometry preserves law of cosines, negative correlation and excludes bias',()=>{
 const d=getExample('taylor');d.referenceSD=2;d.data=[{label:'same',sd:2,correlation:1},{label:'orthogonal',sd:2,correlation:0},{label:'opposite',sd:2,correlation:-1},{label:'half',sd:1,correlation:1}];const [same,orthogonal,opposite,half]=taylor14(d);near(same.centeredRMSE,0);near(orthogonal.centeredRMSE,Math.SQRT2);near(opposite.centeredRMSE,2);near(opposite.x,-1);near(opposite.y,0);near(half.centeredRMSE,.5);for(const p of taylor14(d)){near(Math.hypot(p.x,p.y),p.ratio);near(Math.hypot(p.x-1,p.y),p.centeredRMSE);}assert.ok(valid(d));const s=scene(d);assert.equal(s.svg.querySelectorAll('[data-mark="taylor-model"]').length,4);s.destroy();d.data[0].correlation=1.1;assert.ok(!valid(d));d.data[0].correlation=1;d.data[0].sd=0;assert.ok(!valid(d));d.data[0].sd=2;d.referenceSD=0;assert.ok(!valid(d));
});
test('target coordinates separate normalized bias and centered error with explicit equal-SD sign',()=>{
 const d=getExample('targetdiagram');d.referenceSD=2;d.data=[{label:'under',bias:3,centeredRMSE:2,sd:1},{label:'over',bias:-3,centeredRMSE:2,sd:3},{label:'equal',bias:0,centeredRMSE:2,sd:2}];const [a,b,c]=target14(d);near(a.x,-1);near(a.y,1.5);near(a.rmse,Math.hypot(1,1.5));near(b.x,1);near(b.y,-1.5);near(c.x,1);assert.ok(valid(d));d.data[0].centeredRMSE=.9;assert.ok(!valid(d));d.data[0].centeredRMSE=3.1;assert.ok(!valid(d));d.data[0].centeredRMSE=-1;assert.ok(!valid(d));d.data[0].centeredRMSE=2;d.data[0].sd=-1;assert.ok(!valid(d));
});
test('Youden uses marginal medians and equal measurement scales, not certified targets or fitted limits',()=>{
 const d=getExample('youden');d.data=[1,2,3,4,50].map((v,i)=>({label:`L${i}`,sampleA:v,sampleB:v+10}));assert.deepEqual(youden14(d),{medianA:3,medianB:13});const s=scene(d),marks=[...s.svg.querySelectorAll('[data-mark="youden-laboratory"]')];near(Number(marks[1].getAttribute('cx'))-Number(marks[0].getAttribute('cx')),Number(marks[0].getAttribute('cy'))-Number(marks[1].getAttribute('cy')));s.destroy();d.data.forEach(r=>r.sampleA=1);assert.ok(!valid(d));
});
test('complete contingency model calculates Pearson residuals from original integer counts',()=>{
 const d=table([[30,10],[10,50]]),before=structuredClone(d),m=contingency14(d);assert.equal(m.total,100);assert.deepEqual(m.rowTotals,[40,60]);assert.deepEqual(m.columnTotals,[40,60]);near(m.cells[0].expected,16);near(m.cells[0].residual,3.5);near(m.cells[1].expected,24);near(m.cells[1].residual,-14/Math.sqrt(24));near(m.chiSquare,m.cells.reduce((n,c)=>n+c.residual**2,0));near(m.cells.reduce((n,c)=>n+c.share,0),1);assert.deepEqual(d,before);
 const independent=contingency14(table([[10,20],[20,40]]));for(const c of independent.cells)near(c.residual,0);assert.ok(valid(d));
});
test('Bangdiwala exact agreement B is a ratio of squared counts to marginal products',()=>{
 const d=table([[30,10],[10,50]],'agreement'),m=contingency14(d);near(m.agreement,(30**2+50**2)/(40**2+60**2));near(m.exactRate,.8);near(contingency14(table([[10,0],[0,20]],'agreement')).agreement,1);near(contingency14(table([[0,10],[20,0]],'agreement')).agreement,0);const s=scene(d);assert.equal(s.svg.querySelectorAll('[data-mark="agreement-count"][data-edit-field="count"]').length,4);assert.equal(s.svg.querySelectorAll('[data-mark="agreement-margin"][data-edit-row]').length,0);s.destroy();
});
test('association area uses a common scale for signed observed minus expected differences',()=>{
 const d=table([[30,10],[10,50]]),m=contingency14(d),s=scene(d),cells=[...s.svg.querySelectorAll('[data-mark="association-cell"]')];const ratios=cells.map((cell,i)=>Number(cell.getAttribute('width'))*Number(cell.getAttribute('height'))/Math.abs(m.cells[i].row.count-m.cells[i].expected));for(const v of ratios)near(v,ratios[0]);s.destroy();const independent=scene(table([[10,20],[20,40]]));for(const cell of independent.svg.querySelectorAll('[data-mark="association-cell"]'))near(Number(cell.getAttribute('height')),0);assert.equal(independent.svg.querySelectorAll('[data-mark="association-input"][data-edit-row]').length,4);independent.destroy();
});
test('mosaic area equals observed joint frequency and true zero cells stay zero area but editable',()=>{
 const d=table([[30,0],[10,50]],'mosaicplot'),s=scene(d),cells=[...s.svg.querySelectorAll('[data-mark="mosaic-cell"]')],area=c=>Number(c.getAttribute('width'))*Number(c.getAttribute('height')),total=cells.reduce((n,c)=>n+area(c),0);for(const c of cells)near(area(c)/total,Number(c.dataset.count)/90);assert.equal(area(cells.find(c=>c.dataset.count==='0')),0);assert.equal(s.svg.querySelectorAll('[data-mark="mosaic-zero"][data-edit-row]').length,1);s.destroy();
});
test('count contracts reject missing pairs, duplicates, negative/fractional counts and zero margins',()=>{
 for(const id of['agreement','association','mosaicplot']){let d=table([[30,10],[10,50]],id);d.data.pop();assert.ok(!valid(d),id);d=table([[30,10],[10,50]],id);d.data[0].count=.5;assert.ok(!valid(d),id);d=table([[30,10],[10,50]],id);d.data[0].count=-1;assert.ok(!valid(d),id);d=table([[0,0],[10,50]],id);assert.ok(!valid(d),id);d=table([[30,10],[10,50]],id);d.data[1]={...d.data[0]};assert.ok(!valid(d),id);}
 const d=table([[1e15,1e15],[1e15,1e15]]);assert.ok(valid(d));d.data=Array.from({length:36},(_,i)=>({row:`r${Math.floor(i/6)}`,column:`c${i%6}`,count:1e15}));assert.ok(!valid(d));
});
test('new native animations reverse exactly across compact, dark and portrait rendering without mutating inputs',()=>{
 for(const t of volume14Catalog)for(const options of[{width:300,height:240,compact:true},{width:680,height:360,dark:true},{width:400,height:650,colors:['#31567a','#af622e','#73935c'],colorMode:'categorical'}]){const d=getExample(t.id),before=structuredClone(d),s=scene(d,options),final=s.serialize();s.render(0);assert.notEqual(s.serialize(),final,t.id);for(const p of[.13,.42,.8,1,.37,0,1]){s.render(p);assert.doesNotMatch(s.serialize(),/NaN|Infinity|undefined/,t.id);}assert.equal(s.serialize(),final,t.id);assert.deepEqual(d,before);assert.ok(s.svg.querySelectorAll('[data-edit-row]').length>=d.data.length,t.id);s.destroy();}
});
test('bilingual method notes preserve semantics and raw observation tooltips preserve precision',()=>{
 try{setLocale('en');for(const t of volume14Catalog){const guide=getDataGuide(t.id);assert.doesNotMatch([guide.introduction,guide.rowMeaning,...guide.fields.map(f=>f.description),...guide.notes].join(' '),/[\u3400-\u9fff]/,t.id);}}finally{setLocale('zh-CN');}
 for(const[id,key,value]of[['andrews','value',.123456789],['biplot','x',.123456789],['taylor','sd',12.123456789],['targetdiagram','bias',.123456789],['youden','sampleA',50.123456789]]){const doc=getExample(id);doc.data[0][key]=value;const s=scene(doc);assert.ok([...s.svg.querySelectorAll('[data-tip]')].some(n=>n.dataset.tip.includes(String(value))),id);s.destroy();}
});
test('missing parameters and unrepresentable normalized magnitudes never silently use example defaults',()=>{
 for(const[id,key]of[['andrews','variables'],['biplot','loadingScale'],['taylor','referenceSD'],['targetdiagram','referenceSD'],['agreement','categories']]){const d=getExample(id);delete d[key];assert.ok(!valid(d),id);}
 const d=getExample('taylor');d.referenceSD=1e-300;assert.ok(!valid(d));const target=getExample('targetdiagram');target.data[0].bias=1e15;assert.ok(!valid(target));const rows=getExample('andrews');rows.data[0].value=null;assert.ok(!valid(rows));
});
test('subnormal display ranges and underflowed normalizations are rejected before SVG rendering',()=>{
 for(const id of ['andrews','biplot','taylor','targetdiagram','youden']){const d=getExample(id);if(id==='andrews')d.data.forEach((r,i)=>r.value=(i%3)*5e-324);if(id==='biplot')d.data.forEach((r,i)=>{r.x=(i%3+1)*5e-324;r.y=(i%4+1)*5e-324;});if(id==='taylor')d.data.forEach(r=>r.sd=5e-324);if(id==='targetdiagram')d.data.forEach(r=>{r.sd=d.referenceSD;r.bias=5e-324;r.centeredRMSE=5e-324;});if(id==='youden')d.data.forEach((r,i)=>{r.sampleA=(i%3)*5e-324;r.sampleB=(i%4)*5e-324;});assert.equal(validateDocument(d).dataValid,false,id);}
 const d=getExample('biplot');d.loadingScale=5e-324;assert.equal(validateDocument(d).dataValid,false);
});
