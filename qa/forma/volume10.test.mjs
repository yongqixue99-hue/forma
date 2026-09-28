import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {volume10Catalog} from '../../src/forma/volume10-catalog.js';
import {validateDocument,parseDataText,toCSV} from '../../src/forma/data.js';
import {autocorrelation10,pacf10,imr10,cluster10,worldRegions10,worldCodes10} from '../../src/forma/volume10-data.js';
import world10 from '../../src/forma/datasets/world-110m.json' with {type:'json'};
import {getDataGuide,agentBrief} from '../../src/forma/data-guides.js';
import {ChartScene} from '../../src/forma/charts.js';
import {staticSVG,standaloneHTML} from '../../src/forma/export.js';
import {makeProject,readProject} from '../../src/forma/project-file.js';
const window=new Window();globalThis.document=window.document;globalThis.XMLSerializer=window.XMLSerializer;
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`),valid=d=>validateDocument(d).valid;
const scene=(doc,opts={})=>new ChartScene(document.createElement('div'),doc,{width:680,height:360,interactive:false,...opts});
test('eight new templates have complete shared contracts, user data roundtrips and runnable export payloads',()=>{
 assert.equal(catalog.length,168);assert.equal(volume10Catalog.length,8);
 for(const t of volume10Catalog){const d=getExample(t.id);assert.ok(valid(d),`${t.id}: ${validateDocument(d).errors}`);assert.deepEqual(parseDataText(toCSV(d),d,'csv').data,d.data);assert.deepEqual(readProject(JSON.stringify(makeProject(d,{}))).doc,d);const guide=getDataGuide(t.id);assert.ok(guide.rowMeaning);assert.equal(guide.fields.length,t.fields.length);assert.ok(agentBrief(d).includes(t.id));assert.ok(standaloneHTML(d,{},'var FormaPlayer={mount(){}};').includes(t.id));}
});
test('map code coverage is explicit, display names are independent, null stays unmeasured and unknown codes fail',()=>{
 assert.deepEqual(worldRegions10,world10.features.map(f=>f.properties));assert.equal(world10.features.length,176);assert.equal(worldCodes10.size,176);assert.ok(worldCodes10.has('USA'));const d=getExample('choropleth');d.data[0].label='My renamed region';d.data[0].value=null;assert.ok(valid(d));const s=scene(d);assert.equal(s.svg.querySelector('[data-code="USA"]').getAttribute('data-missing'),'true');assert.ok(s.svg.querySelector('[data-code="BRA"]').getAttribute('data-tip').includes('42'));assert.ok(s.svg.querySelector('[data-code="USA"]').getAttribute('d').length>50);s.destroy();d.data[0].code='NOT-A-CODE';assert.ok(!valid(d));
});
test('geographic bubbles use projected coordinates and true area ratios without hiding zeros',()=>{
 const d=getExample('geomap');d.data=[{label:'A',longitude:0,latitude:0,value:4},{label:'B',longitude:40,latitude:0,value:1},{label:'C',longitude:90,latitude:0,value:0}];const s=scene(d),a=[...s.svg.querySelectorAll('[data-mark="geo-bubble"]')];near(+a[0].getAttribute('r')/+a[1].getAttribute('r'),2);assert.equal(a.length,3);assert.ok(+a[0].getAttribute('cx')<+a[1].getAttribute('cx'));assert.equal(a[2].getAttribute('data-value'),'0');s.destroy();d.data[0].latitude=-85;d.data[1].latitude=85;assert.ok(valid(d));const polar=scene(d);for(const point of polar.svg.querySelectorAll('[data-mark=geo-bubble]')){assert.ok(+point.getAttribute('cy')>=12);assert.ok(+point.getAttribute('cy')<=polar.h-44);}polar.destroy();d.data[0].latitude=89;assert.ok(!valid(d));
});
test('SPLOM preserves every sample in every off-diagonal cell, requires complete consistent samples',()=>{
 const d=getExample('splom'),s=scene(d),marks=s.svg.querySelectorAll('[data-mark="splom-point"]');assert.equal(marks.length,26*3*2);assert.equal([...marks].filter(m=>m.dataset.sample==='S01').length,6);s.destroy();d.data.pop();assert.ok(!valid(d));const other=getExample('splom');other.data[1].group='Different';assert.ok(!valid(other));
});
test('average-linkage clustering matches cross-cluster mean Euclidean distance and does not mutate inputs',()=>{
 const vectors=[[0],[2],[10]],before=structuredClone(vectors),tree=cluster10(vectors);assert.equal(tree.distance,9);assert.equal(tree.children.find(n=>n.indices.length===2).distance,2);assert.deepEqual(vectors,before);assert.equal(cluster10([[1,1],[1,1],[1,1]]).distance,0);
 const d=getExample('clusterheatmap'),s=scene(d);assert.equal(s.svg.querySelectorAll('[data-mark="cluster-cell"]').length,d.data.length);assert.equal(s.svg.querySelectorAll('[data-mark="cluster-branch"]').length,10-1+6-1);s.destroy();d.data.pop();assert.ok(!valid(d));
});
test('PCA loadings enforce their declared correlation definition and fixed equal-unit geometry',()=>{
 const d=getExample('pcaloadings');d.data=[{variable:'A',loading1:1,loading2:0},{variable:'B',loading1:0,loading2:1}];assert.ok(valid(d));const s=scene(d),[a,b]=s.svg.querySelectorAll('[data-mark="pca-loading"]');near(+a.getAttribute('x2')-+a.getAttribute('x1'),+b.getAttribute('y1')-+b.getAttribute('y2'));s.destroy();d.data[0].loading2=.5;assert.ok(!valid(d));
});
test('ACF agrees with explicit centered products, scales down to scientific decimals, and PACF solves Yule–Walker',()=>{
 const values=[1,2,3,4],a=autocorrelation10(values,3);assert.deepEqual(a,[1,.25,-.3,-.45]);const p=pacf10(values,2);near(p[1],.25);near(p[2],(-.3-.25*.25)/(1-.25*.25));const small=autocorrelation10(values.map(v=>v*1e-20),3);small.forEach((v,i)=>near(v,a[i]));assert.throws(()=>autocorrelation10([1,1,1],2));
 for(const id of ['acf','pacf']){const d=getExample(id);d.maxLag=d.data.length;assert.ok(!valid(d));d.maxLag=2;d.data[0].value=null;assert.ok(!valid(d));}
});
test('I-MR follows NIST successive-difference formula and first MR stays undefined',()=>{
 const values=[49.6,47.6,49.9,51.3,47.8,51.2,52.6,52.4,53.6,52.1],stats=imr10(values.map(value=>({value})));near(stats.mean,50.81);near(stats.mrMean,16.9/9);assert.equal(stats.moving[0],null);near(stats.low,stats.mean-3*stats.mrMean/1.128);near(stats.mrHigh,3.267*stats.mrMean);
 const d=getExample('imr'),s=scene(d);assert.equal(s.svg.querySelectorAll('[data-mark="imr-I-point"]').length,d.data.length);assert.equal(s.svg.querySelectorAll('[data-mark="imr-MR-point"]').length,d.data.length-1);s.destroy();
});
test('layout capacity remains separate from data validity and does not truncate observations',()=>{
 const d=getExample('splom');d.data=Array.from({length:81},(_,i)=>['A','B'].map(variable=>({sample:`S${i}`,variable,value:i,group:'G'}))).flat();const before=structuredClone(d);assert.equal(validateDocument(d).dataValid,true);assert.equal(validateDocument(d).layoutValid,false);assert.deepEqual(d,before);
});
test('new native entrances retain every mark and return exact endpoints after reversed seeking at all layouts',()=>{
 for(const t of volume10Catalog)for(const [width,height,compact]of[[300,240,true],[680,360,false],[400,650,false]]){const d=getExample(t.id),s=scene(d,{width,height,compact}),final=s.serialize();for(const p of[0,.25,.5,.75,1,.5,.25,0,1]){s.render(p);assert.doesNotMatch(s.serialize(),/NaN|Infinity/,t.id);}assert.equal(s.serialize(),final,t.id);s.destroy();}for(const t of volume10Catalog)assert.ok(staticSVG(getExample(t.id)).includes('确定性合成数据'));
});
