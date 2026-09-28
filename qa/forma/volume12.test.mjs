import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {volume12Catalog,volume12English} from '../../src/forma/volume12-catalog.js';
import {lorenz12,normalCDF12,pp12,quantile12,delta12,ecdfDifference12,quantileDots12,bins12,gaussianDensity12,bivariateDensity12,densityGrid12,halfeye12,volume12MethodNotes} from '../../src/forma/volume12-data.js';
import {getExample} from '../../src/forma/catalog.js';
import {validateDocument,parseDataText,toCSV} from '../../src/forma/data.js';
import {getDataGuide,agentBrief} from '../../src/forma/data-guides.js';
import {ChartScene} from '../../src/forma/charts.js';
import {staticSVG,standaloneHTML} from '../../src/forma/export.js';
import {makeProject,readProject} from '../../src/forma/project-file.js';
import {setLocale} from '../../src/forma/locale.js';
const window=new Window();globalThis.document=window.document;globalThis.XMLSerializer=window.XMLSerializer;
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const valid=d=>validateDocument(d).valid;
const rows=values=>values.map((value,i)=>({label:`S${i}`,value}));
const scene=(doc,options={})=>new ChartScene(document.createElement('div'),doc,{width:680,height:360,interactive:false,editable:true,...options});
test('volume 12 has eight original-data contracts, metadata roundtrips and bilingual runnable briefs',()=>{
 assert.equal(volume12Catalog.length,8);
 for(const t of volume12Catalog){const d=getExample(t.id);assert.ok(valid(d),`${t.id}: ${validateDocument(d).errors}`);assert.deepEqual(parseDataText(toCSV(d),d,'csv').data,d.data);assert.deepEqual(readProject(JSON.stringify(makeProject(d,{}))).doc,d);const guide=getDataGuide(t.id);assert.ok(guide.rowMeaning);assert.equal(guide.fields.length,t.fields.length);assert.equal(volume12English[t.id].fields.length,t.fields.length);assert.ok(agentBrief(d).includes(t.id));assert.ok(standaloneHTML(d,{},'var FormaPlayer={mount(){}};').includes(t.id));assert.ok(volume12MethodNotes(t.id).length);assert.match(staticSVG(d),/确定性合成数据/);}
});
test('Lorenz shares and uncorrected Gini follow trapezoidal area without mutating observations',()=>{
 const input=rows([3,0,1]),before=structuredClone(input),m=lorenz12(input);assert.deepEqual(input,before);assert.deepEqual(m.points.map(p=>p.share),[0,0,.25,1]);near(m.gini,.5);near(lorenz12(rows([7,7,7])).gini,0);near(lorenz12(rows([0,0,9])).gini,2/3);near(lorenz12(rows([3e-20,0,1e-20])).gini,.5);
 const d=getExample('lorenz');d.data[0].value=-1;assert.ok(!valid(d));d.data.forEach(r=>r.value=0);assert.ok(!valid(d));
});
test('P–P uses known normal parameters, empirical right endpoints and complete tied observations',()=>{
 near(normalCDF12(0),.5);near(normalCDF12(1),.841344746,8e-8);near(normalCDF12(-2),.022750132,8e-8);near(normalCDF12(8),1,1e-14);
 const m=pp12(rows([0,0,1,2,2]),0,1);assert.equal(m.length,5);assert.deepEqual(m.map(p=>p.empirical),[.4,.4,.6,1,1]);near(m[0].theoretical,.5);const d=getExample('ppplot');d.referenceSD=0;assert.ok(!valid(d));d.referenceSD=12;d.referenceMean=NaN;assert.ok(!valid(d));
});
test('quantile differences use Type 7 in original units and preserve group direction',()=>{
 near(quantile12(rows([0,10,20,30]),.25),7.5);const input=[...rows([0,1,2,3,4]).map(r=>({...r,group:'A'})),...rows([3,4,5,6,7]).map(r=>({...r,label:'B'+r.label,group:'B'}))];const before=structuredClone(input),d=delta12(input);assert.deepEqual(d.groups,['A','B']);assert.equal(d.points.length,19);for(const p of d.points)near(p.difference,3);assert.deepEqual(input,before);const reverse=delta12([...input.slice(5),...input.slice(0,5)]);for(const p of reverse.points)near(p.difference,-3);
});
test('ECDF differences use all duplicate mass and right-continuous pooled support',()=>{
 const input=[...rows([0,0,2,2,2]).map(r=>({...r,group:'A'})),...rows([0,1,1,2,3]).map(r=>({...r,label:'B'+r.label,group:'B'}))],m=ecdfDifference12(input);assert.deepEqual(m.points.map(p=>p.value),[0,1,2,3]);m.points.map(p=>p.difference).forEach((v,i)=>near(v,[-.2,.2,-.2,0][i]));near(m.maxDifference,.2);const d=getExample('ecdfdiff');d.data[0].group='C';assert.ok(!valid(d));
});
test('quantile dots represent equal probability masses and never pretend to be sample observations',()=>{
 const m=quantileDots12(rows([0,10]),20);assert.equal(m.length,20);near(m[0].value,.25);near(m.at(-1).value,9.75);near(m.reduce((n,p)=>n+p.mass,0),1);
 const d=getExample('quantiledot'),s=scene(d);assert.equal(s.svg.querySelectorAll('[data-mark="quantile-dot"]').length,d.dotCount);assert.equal(s.svg.querySelectorAll('[data-mark="quantile-dot"][data-edit-row]').length,0);assert.equal(s.svg.querySelectorAll('[data-mark="distribution-raw"][data-edit-field="value"]').length,d.data.length);s.destroy();d.dotCount=12.5;assert.ok(!valid(d));
});
test('2D histogram counts each boundary pair exactly once and empty cells remain genuine zero counts',()=>{
 const input=[{label:'a',x:0,y:0},{label:'b',x:3,y:3},{label:'c',x:1,y:1},{label:'d',x:2,y:2},{label:'e',x:0,y:3}],before=structuredClone(input),m=bins12(input,3,3);assert.equal(m.cells.reduce((n,c)=>n+c.count,0),5);assert.equal(m.cells.find(c=>c.ix===2&&c.iy===2).count,2);assert.equal(m.cells.find(c=>c.ix===0&&c.iy===2).count,1);assert.deepEqual(input,before);
 const d=getExample('histogram2d');d.data=input;const s=scene(d);assert.equal([...s.svg.querySelectorAll('[data-mark="histogram2d-bin"]')].reduce((n,c)=>n+Number(c.dataset.count),0),5);assert.equal(s.svg.querySelectorAll('[data-edit-field="x"]').length,5);assert.equal(s.svg.querySelectorAll('[data-edit-field="y"]').length,5);s.destroy();d.binsX=1;assert.ok(!valid(d));
});
test('Gaussian density estimates are normalized in data units and levels are not counts or confidence regions',()=>{
 near(gaussianDensity12([0],0,2),1/(2*Math.sqrt(2*Math.PI)));near(bivariateDensity12([{x:0,y:0}],0,0,2,3),1/(12*Math.PI));near(bivariateDensity12([{x:0,y:0},{x:0,y:0}],0,0,2,3),1/(12*Math.PI));
 const input=[{x:0,y:0},{x:1,y:1}],grid=densityGrid12(input,.5,.5,100,100),dx=(grid.xd[1]-grid.xd[0])/grid.nx,dy=(grid.yd[1]-grid.yd[0])/grid.ny,mass=grid.values.reduce((a,b)=>a+b,0)*dx*dy;assert.ok(mass>.996&&mass<1);const d=getExample('density2d'),s=scene(d);assert.equal(s.svg.querySelectorAll('[data-mark="density2d-contour"]').length,5);assert.equal(s.svg.querySelectorAll('[data-mark="distribution-xy"]').length,d.data.length);s.destroy();d.bandwidthX=1e-20;assert.ok(!valid(d));d.bandwidthX=4;d.data.forEach(r=>r.y=3);assert.ok(!valid(d));
});
test('half-eyes share one density scale and distinguish median, central intervals and raw rows',()=>{
 const input=[...rows([0,1,2,3,4,5,6,7]).map(r=>({...r,group:'A'})),...rows([10,11,12,13,14,15,16,17]).map(r=>({...r,label:'B'+r.label,group:'B'}))],m=halfeye12(input,1);near(m.curves[0].median,3.5);assert.deepEqual(m.curves[0].inner,[1.75,5.25]);near(m.curves[0].outer[0],.35);near(m.curves[0].outer[1],6.65);near(m.curves[1].median-m.curves[0].median,10);
 const d=getExample('halfeye'),s=scene(d);assert.equal(s.svg.querySelectorAll('[data-mark="halfeye-interval"]').length,6);assert.equal(s.svg.querySelectorAll('[data-mark="distribution-raw"][data-edit-field="value"]').length,d.data.length);assert.equal(s.svg.querySelectorAll('[data-mark="halfeye-median"][data-edit-row]').length,0);s.destroy();d.bandwidth=0;assert.ok(!valid(d));d.data.forEach(r=>r.value=0);d.bandwidth=1;assert.ok(valid(d));d.bandwidth=1e308;assert.ok(!valid(d));d.data.forEach(r=>r.value=1e15);d.bandwidth=1e-10;assert.ok(!valid(d));
});
test('missing numeric values and duplicate observation identities are rejected, capacity never deletes rows',()=>{
 for(const t of volume12Catalog){const d=getExample(t.id),key=['histogram2d','density2d'].includes(t.id)?'y':'value';d.data[0][key]=null;assert.ok(!valid(d),t.id);const duplicate=getExample(t.id);duplicate.data[1].label=duplicate.data[0].label;assert.ok(!valid(duplicate),t.id);}
 const d=getExample('lorenz');d.data=rows(Array.from({length:301},(_,i)=>i+1));const before=structuredClone(d),report=validateDocument(d);assert.equal(report.dataValid,true);assert.equal(report.layoutValid,false);assert.deepEqual(d,before);
});
test('native progress is reversible at compact, wide and portrait sizes with dark and custom colors',()=>{
 for(const t of volume12Catalog)for(const options of[{width:300,height:240,compact:true},{width:680,height:360,dark:true},{width:400,height:650,colors:['#31567a','#af622e','#73935c'],colorMode:'categorical'}]){const d=getExample(t.id),before=structuredClone(d),s=scene(d,options),final=s.serialize();s.render(0);assert.notEqual(s.serialize(),final,t.id);for(const p of[.17,.43,.8,1,.5,0,1]){s.render(p);assert.doesNotMatch(s.serialize(),/NaN|Infinity|undefined/,t.id);}assert.equal(s.serialize(),final,t.id);assert.deepEqual(d,before);assert.ok(s.svg.querySelectorAll('[data-edit-row]').length>=d.data.length,t.id);s.destroy();}
});

test('English guides keep statistical field semantics and custom numeric color scales include genuine zero bins',()=>{
 try{setLocale('en');for(const t of volume12Catalog){const guide=getDataGuide(t.id);assert.doesNotMatch([guide.introduction,guide.rowMeaning,...guide.fields.map(f=>f.description),...guide.notes].join(' '),/[\u3400-\u9fff]/,t.id);assert.ok(guide.fields.find(f=>f.key==='label')?.description.includes('original')||guide.fields.some(f=>f.description.includes('original')),t.id);}}finally{setLocale('zh-CN');}
 const doc=getExample('histogram2d'),valueColors={mode:'sequential',low:'#123456',middle:'#789abc',high:'#fedcba',center:0},s=scene(doc,{valueColors}),cells=[...s.svg.querySelectorAll('[data-mark="histogram2d-bin"]')],max=Math.max(...cells.map(c=>Number(c.dataset.count)));assert.equal(cells.find(c=>Number(c.dataset.count)===0).getAttribute('fill'),valueColors.low);assert.equal(cells.find(c=>Number(c.dataset.count)===max).getAttribute('fill'),valueColors.high);s.destroy();
 const tiny=getExample('density2d');tiny.data.forEach((r,i)=>{r.x=i*1e-200;r.y=(i%13)*1e-200;});tiny.bandwidthX=6e-200;tiny.bandwidthY=1e-200;assert.equal(validateDocument(tiny).dataValid,false);
});

test('histogram rejects unrepresentable subnormal bins and raw tooltips retain original precision',()=>{
 const d=getExample('histogram2d');d.data.forEach((r,i)=>{r.x=(i%2)*5e-324;r.y=(i%3?0:5e-324);});assert.equal(validateDocument(d).dataValid,false);
 for(const id of ['lorenz','ppplot','deltaplot','ecdfdiff','quantiledot','histogram2d','density2d','halfeye']){const doc=getExample(id),key=['histogram2d','density2d'].includes(id)?'x':'value';doc.data[0][key]=43.123456789;const s=scene(doc);assert.ok([...s.svg.querySelectorAll('[data-tip]')].some(n=>n.dataset.tip.includes('43.123456789')),id);s.destroy();}
});
