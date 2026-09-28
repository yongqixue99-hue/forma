import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {validateDocument} from '../../src/forma/data.js';
import {ChartScene} from '../../src/forma/charts.js';
import {Window} from 'happy-dom';

test('every catalogue entry has independent valid data and safely rejects malformed required cells',()=>{
 assert.equal(new Set(catalog.map(t=>t.id)).size,catalog.length);
 assert.equal(new Set(catalog.map(t=>Number(t.no))).size,catalog.length);
 for(const t of catalog){
  const doc=getExample(t.id),snapshot=structuredClone(doc);
  assert.ok(validateDocument(doc).valid,t.id);
  for(const [key,type] of t.fields)for(const value of [undefined,{},[],true,NaN,...(type.includes('null')?[]:[null])]){
   const candidate=structuredClone(doc);candidate.data[0][key]=value;
   assert.equal(validateDocument(candidate).valid,false,`${t.id}.${key} accepted ${String(value)}`);
  }
  for(const key of Object.keys(doc).filter(key=>!['data','version','template','title','subtitle','unit','source'].includes(key)))for(const value of [undefined,null,'',[],{},1]){
   const candidate=structuredClone(doc);if(value===undefined)delete candidate[key];else candidate[key]=value;
   assert.doesNotThrow(()=>validateDocument(candidate),`${t.id} malformed ${key}`);
  }
  assert.deepEqual(doc,snapshot,`${t.id}: validation must not repair source values`);
  doc.data[0]._auditMutation=true;assert.deepEqual(getExample(t.id),snapshot,`${t.id}: examples must be independent`);
 }
});

test('accepted zero, constant and extreme-scale chart data never generates nonfinite SVG coordinates',()=>{
 const win=new Window(),previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{value:win.document,configurable:true,writable:true});
 try{
  const modes={tiny:v=>v*1e-300,zero:()=>0,constant:()=>1,large:v=>Math.sign(v)*1e14};
  for(const t of catalog)for(const [mode,convert] of Object.entries(modes)){
   const doc=getExample(t.id);for(const row of doc.data)for(const [key,type] of t.fields)if(type.includes('number')&&typeof row[key]==='number')row[key]=convert(row[key]);
   if(!validateDocument(doc).valid)continue;
   const scene=new ChartScene(document.createElement('div'),doc,{width:680,height:420,interactive:false});
   try{for(const progress of [0,.4,1]){scene.render(progress);for(const el of scene.svg.querySelectorAll('*'))for(const attr of el.attributes)if(!attr.name.startsWith('data-'))assert.doesNotMatch(attr.value,/NaN|Infinity/,`${t.id}/${mode}/${progress}: ${attr.name}`);}}
   finally{scene.destroy();}
  }
 }finally{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;win.happyDOM.abort();}
});
