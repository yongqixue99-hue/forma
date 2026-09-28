import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {volume17Catalog,volume17Contents,volume17English} from '../../src/forma/volume17-catalog.js';
import {boxen17,sina17,rootogram17,ecdfBand17,qqCompare17,worm17,fitLine17,spreadLevel17,scaleLocation17,cook17,addedVariable17,componentResidual17,validateVolume17,volume17MethodNotes} from '../../src/forma/volume17-data.js';
import {getExample,findTemplate} from '../../src/forma/catalog.js';
import {validateDocument,parseDataText,toCSV} from '../../src/forma/data.js';
import {getDataGuide,agentBrief} from '../../src/forma/data-guides.js';
import {ChartScene} from '../../src/forma/charts.js';
import {staticSVG,standaloneHTML} from '../../src/forma/export.js';
import {makeProject,readProject} from '../../src/forma/project-file.js';
import {setLocale} from '../../src/forma/locale.js';
const window=new Window();globalThis.document=window.document;globalThis.XMLSerializer=window.XMLSerializer;
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`),example=id=>findTemplate(id)?getExample(id):{template:id,...structuredClone(volume17Contents[id])};
function localReport(doc){const errors=[],layoutErrors=[],warnings=[];validateVolume17(doc,{fail:e=>errors.push(e),count:(n,min,max,name)=>{if(n<min||n>max)layoutErrors.push(name);},noDuplicates:(a,name)=>{if(new Set(a).size!==a.length)errors.push(name);},warnings});return{valid:!errors.length&&!layoutErrors.length,dataValid:!errors.length,errors,layoutErrors,warnings};}
const valid=d=>localReport(d).valid,scene=(d,o={})=>new ChartScene(document.createElement('div'),d,{width:680,height:360,editable:true,interactive:false,...o}),rawRows=(values,group='A')=>values.map((value,i)=>({label:`${group}${i+1}`,group,value}));

test('volume 17 has twelve compactly named coherent examples and exact bilingual field schemas',()=>{
 assert.equal(volume17Catalog.length,12);assert.deepEqual(volume17Catalog.map(t=>t.no),Array.from({length:12},(_,i)=>String(169+i)));
 for(const t of volume17Catalog){const d=example(t.id);assert.ok(valid(d),`${t.id}: ${localReport(d).errors}`);assert.ok(t.name.length<=10);assert.ok(d.title.length<=22);assert.equal(volume17English[t.id].fields.length,t.fields.length);assert.equal(volume17MethodNotes(t.id).length,2);assert.equal(new Set(d.data.map(r=>r.label)).size,d.data.length);}
});
test('boxen levels are Type 7 quantile intervals with explicit tail depth, not confidence limits',()=>{
 const rows=rawRows(Array.from({length:128},(_,i)=>i)),before=structuredClone(rows),[g]=boxen17(rows);assert.equal(g.intervals.length,4);assert.deepEqual(g.intervals.map(d=>d.p),[.25,.125,.0625,.03125]);near(g.intervals[0].low,31.75);near(g.intervals[0].high,95.25);near(g.median,63.5);assert.deepEqual(g.intervals.map(d=>d.width),[1,.5,.25,.125]);assert.deepEqual(rows,before);
 const d=example('boxen');d.data=rawRows(Array(16).fill(5));assert.ok(valid(d));const flat=boxen17(d.data)[0];near(flat.intervals[0].low,5);near(flat.intervals[0].high,5);d.data=rawRows(Array(15).fill(5));assert.equal(localReport(d).dataValid,true);assert.equal(valid(d),false);
});
test('sina KDE uses one bandwidth, retains exact values and deterministic identity-based jitter',()=>{
 const d=example('sina');d.data=rawRows(Array(8).fill(4));d.bandwidth=2;const before=structuredClone(d),m=sina17(d);near(m.max,1/(2*Math.sqrt(2*Math.PI)));for(const p of m.curves[0].points){near(p.density,m.max);assert.ok(p.jitter>-1&&p.jitter<1);assert.equal(p.row.value,4);}assert.deepEqual(d,before);const reorder=sina17({...d,data:[...d.data].reverse()});const positions=new Map(m.curves[0].points.map(p=>[p.row.label,p.jitter]));for(const p of reorder.curves[0].points)assert.equal(p.jitter,positions.get(p.row.label));assert.ok(valid(d));d.bandwidth=0;assert.ok(!valid(d));d.bandwidth=5e-324;assert.ok(!valid(d));
});
test('hanging rootogram separates square-root expectations, observed heights and signed bottoms',()=>{
 const d=example('rootogram');d.data=[{label:'a',observed:9,expected:16},{label:'b',observed:25,expected:16},{label:'c',observed:0,expected:4},{label:'d',observed:4,expected:0}];const m=rootogram17(d);assert.deepEqual(m.map(r=>r.expectedRoot),[4,4,2,0]);assert.deepEqual(m.map(r=>r.observedRoot),[3,5,0,2]);assert.deepEqual(m.map(r=>r.difference),[1,-1,2,-2]);assert.ok(valid(d));d.data[0].observed=.5;assert.ok(!valid(d));d.data[0].observed=9;d.data[0].expected=-1;assert.ok(!valid(d));d.data.forEach(r=>{r.observed=0;r.expected=0;});assert.ok(!valid(d));
});
test('DKW band has simultaneous coverage width and counts tied ECDF mass without dropping records',()=>{
 const d=example('ecdfband');d.alpha=.05;d.data=rawRows([0,0,1,2,2,2,3,4]).map(({label,value})=>({label,value}));const before=structuredClone(d),m=ecdfBand17(d);near(m.epsilon,Math.sqrt(Math.log(40)/16));assert.deepEqual(m.points.map(p=>p.p),[.25,.375,.75,.875,1]);for(const p of m.points){near(p.low,Math.max(0,p.p-m.epsilon));near(p.high,Math.min(1,p.p+m.epsilon));}assert.deepEqual(d,before);const doubled=ecdfBand17({...d,data:[...d.data,...d.data]});near(doubled.epsilon,m.epsilon/Math.SQRT2);d.alpha=0;assert.ok(!valid(d));d.alpha=.9;assert.ok(!valid(d));
});
test('two-sample QQ uses common Type 7 quantiles and explicit orientation with unequal sample counts',()=>{
 const d=example('qqcompare');d.groupOrder=['A','B'];d.data=[...rawRows(Array.from({length:9},(_,i)=>i),'A'),...rawRows(Array.from({length:17},(_,i)=>10+i),'B')];const m=qqCompare17(d);assert.equal(m.points.length,39);for(const p of m.points){near(p.x,p.p*8);near(p.y,10+p.p*16);}assert.ok(valid(d));d.groupOrder.reverse();const reverse=qqCompare17(d);near(reverse.points[19].x,m.points[19].y);near(reverse.points[19].y,m.points[19].x);d.groupOrder=['A','A'];assert.ok(!valid(d));
});
test('worm subtracts fixed standard-normal plotting positions and preserves external residuals',()=>{
 const d=example('worm');d.data=Array.from({length:8},(_,i)=>({label:`S${i}`,group:'A',stdResidual:i-3.5}));const before=structuredClone(d),[g]=worm17(d);assert.equal(g.points.length,8);for(const p of g.points)near(p.deviation,p.row.stdResidual-p.theoretical);near(g.points[0].p,.0625);near(g.points.at(-1).p,.9375);near(g.points[0].theoretical,-g.points.at(-1).theoretical,1e-7);assert.deepEqual(d,before);const shifted=worm17({...d,data:d.data.map(r=>({...r,stdResidual:r.stdResidual+2}))})[0];for(let i=0;i<8;i++)near(shifted.points[i].deviation-g.points[i].deviation,2);
});
test('spread-level uses group median and Type 7 IQR on log10 scales with a descriptive OLS fit',()=>{
 const d=example('spreadlevel');d.data=[1,2,4].flatMap((scale,j)=>rawRows([1,2,3,4,5,6,7,8].map(v=>v*scale),String(j)));const m=spreadLevel17(d);assert.deepEqual(m.points.map(p=>p.median),[4.5,9,18]);assert.deepEqual(m.points.map(p=>p.iqr),[3.5,7,14]);near(m.fit.slope,1);assert.ok(valid(d));d.data[0].value=0;assert.ok(!valid(d));d.data=rawRows(Array(8).fill(5));assert.ok(!valid(d));
});
test('OLS line calculation normalizes covariance to survive tiny and huge coherent coordinates',()=>{
 for(const scale of[1,1e-300,1e14]){const points=[-2,-1,0,1,2].map(x=>({x:x*scale,y:(2*x+3)*scale})),m=fitLine17(points);near(m.slope,2);near(m.predict(scale)/scale,5);assert.ok(Number.isFinite(m.intercept));}
});
test('scale-location transforms only the display coordinate and keeps zero residuals',()=>{
 const d=example('scalelocation');d.data=[-9,-4,0,1,16,25,36,49].map((stdResidual,i)=>({label:`S${i}`,fitted:i,stdResidual}));const m=scaleLocation17(d);assert.deepEqual(m.map(p=>p.y),[3,2,0,1,4,5,6,7]);assert.ok(valid(d));assert.equal(m[0].row.stdResidual,-9);
});
test('Cook distance uses internal residuals and hat leverage; invalid h and incomplete hat trace are rejected',()=>{
 near(cook17({stdResidual:2,leverage:.2},3),1/3);near(cook17({stdResidual:0,leverage:.9},3),0);near(cook17({stdResidual:-2,leverage:0},3),0);
 for(const id of['residualleverage','cooksdistance']){const d=example(id),trace=d.data.reduce((n,r)=>n+r.leverage,0);near(trace,d.parameterCount);assert.ok(valid(d));d.data[0].leverage=1;assert.ok(!valid(d));d.data[0].leverage=-1;assert.ok(!valid(d));const missing=example(id);missing.data.pop();assert.ok(!valid(missing));const p=example(id);p.parameterCount=0;assert.ok(!valid(p));p.parameterCount=p.data.length;assert.ok(!valid(p));}
});
test('synthetic diagnostic examples share a coherent complete OLS fit rather than unrelated numbers',()=>{
 const residuals=example('residualleverage'),n=residuals.data.length,p=residuals.parameterCount;near(residuals.data.reduce((sum,r)=>sum+r.stdResidual**2*(1-r.leverage),0),n-p,1e-8);
 const av=addedVariable17(example('addedvariable'));near(av.fit.slope,5,1e-8);near(av.fit.intercept,0,1e-8);const component=componentResidual17(example('componentresidual'));for(const row of component)near(row.y,row.row.residual+5*row.row.x);near(component.reduce((sum,row)=>sum+row.row.residual,0),0,1e-8);
});
test('partial plots retain supplied residual definitions and reject unidentified or absent coefficients',()=>{
 const d=example('addedvariable');d.data.forEach(r=>r.xResidual=1);assert.ok(!valid(d));const c=example('componentresidual');delete c.coefficient;assert.ok(!valid(c));c.coefficient=0;assert.ok(valid(c));for(const p of componentResidual17(c)){near(p.component,0);near(p.y,p.row.residual);}delete c.axes;assert.ok(!valid(c));
});
test('all required model names, complete numeric values and observation identities are enforced',()=>{
 for(const t of volume17Catalog){const d=example(t.id),key=t.fields.find(([,type])=>type==='number')[0];d.data[0][key]=null;assert.equal(valid(d),false,t.id);const repeated=example(t.id);repeated.data[1].label=repeated.data[0].label;assert.equal(valid(repeated),false,t.id);}
 for(const id of['rootogram','worm','scalelocation','residualleverage','cooksdistance','addedvariable','componentresidual']){const d=example(id);delete d.modelName;assert.ok(!valid(d),id);}
});
test('integrated volume 17 examples roundtrip data and metadata through CSV, projects, briefs and standalone exports',()=>{
 for(const t of volume17Catalog){const d=getExample(t.id),report=validateDocument(d);assert.ok(report.valid,`${t.id}: ${report.errors}`);assert.deepEqual(parseDataText(toCSV(d),d,'csv').data,d.data);assert.deepEqual(readProject(JSON.stringify(makeProject(d,{}))).doc,d);assert.equal(getDataGuide(t.id).fields.length,t.fields.length);assert.ok(agentBrief(d).includes(t.id));assert.ok(standaloneHTML(d,{},'var FormaPlayer={mount(){}};').includes(t.id));assert.match(staticSVG(d),/确定性合成/);}
});
test('native frames reverse exactly at compact, portrait and dark sizes without removing editable observations',()=>{
 for(const t of volume17Catalog)for(const options of[{width:300,height:240,compact:true},{width:680,height:360,dark:true},{width:400,height:650,colors:['#345678','#a94532','#708b42'],colorMode:'categorical'}]){const d=getExample(t.id),before=structuredClone(d),s=scene(d,options),end=s.serialize();s.render(0);assert.notEqual(s.serialize(),end,t.id);for(const p of[.12,.4,.75,1,.22,0,1]){s.render(p);assert.doesNotMatch(s.serialize(),/NaN|Infinity|undefined/,t.id);}assert.equal(s.serialize(),end,t.id);assert.deepEqual(d,before);assert.ok(s.svg.querySelectorAll('[data-edit-row]').length>=d.data.length,t.id);s.destroy();}
});
test('aggregated quantiles and group statistics are never attached to an arbitrary original row',()=>{
 for(const[id,selector]of[['boxen','[data-mark="boxen-interval"]'],['qqcompare','[data-mark="two-sample-qq-point"]'],['spreadlevel','[data-mark="spread-level-group"]'],['ecdfband','[data-mark="dkw-step"]']]){const d=getExample(id),s=scene(d);assert.ok(s.svg.querySelectorAll(selector).length);assert.equal(s.svg.querySelectorAll(`${selector}[data-edit-row]`).length,0,id);s.destroy();}
});
test('raw tooltips preserve source precision for measurements, expectations and external diagnostic inputs',()=>{
 for(const[id,key,value]of[['boxen','value',.123456789],['sina','value',31.123456789],['rootogram','expected',.123456789],['ecdfband','value',.123456789],['qqcompare','value',.123456789],['worm','stdResidual',.123456789],['spreadlevel','value',.123456789],['scalelocation','stdResidual',.123456789],['residualleverage','stdResidual',.123456789],['cooksdistance','stdResidual',.123456789],['addedvariable','yResidual',.123456789],['componentresidual','residual',.123456789]]){const d=getExample(id);d.data[0][key]=value;const s=scene(d);assert.ok([...s.svg.querySelectorAll('[data-tip]')].some(n=>n.dataset.tip.includes(String(value))),id);s.destroy();}
});
test('English guides and methods contain complete semantic field labels with no untranslated Chinese',()=>{
 try{setLocale('en');for(const t of volume17Catalog){const guide=getDataGuide(t.id);assert.doesNotMatch([guide.introduction,guide.rowMeaning,...guide.fields.map(f=>f.description),...guide.notes].join(' '),/[\u3400-\u9fff]/,t.id);}}finally{setLocale('zh-CN');}
});
test('accepted tiny, constant and large inputs render finite initial, intermediate and final SVG frames',()=>{
 const variants=[['tiny',v=>v*1e-300],['zero',()=>0],['one',()=>1],['large',(v,i)=>((i%2)?-1:1)*1e14]];
 for(const t of volume17Catalog)for(const[name,transform]of variants){const d=getExample(t.id),keys=t.fields.filter(([,type])=>type==='number').map(([key])=>key);d.data.forEach((r,i)=>keys.forEach(key=>r[key]=transform(r[key],i)));const report=validateDocument(d);if(!report.valid)continue;const s=scene(d);for(const p of[0,.4,1]){s.render(p);assert.doesNotMatch(s.serialize(),/NaN|Infinity|undefined/,`${t.id}:${name}`);}s.destroy();}
});
