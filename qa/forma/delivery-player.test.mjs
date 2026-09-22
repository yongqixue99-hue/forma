import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {mount} from '../../src/forma/player.js';
import {getExample} from '../../src/forma/catalog.js';
const win=new Window(),original=new Map(),listeners=new Set();
const media={matches:false,addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f)};
before(()=>{win.matchMedia=()=>media;for(const [k,v] of Object.entries({document:win.document,window:win,ResizeObserver:win.ResizeObserver,requestAnimationFrame:win.requestAnimationFrame.bind(win),cancelAnimationFrame:win.cancelAnimationFrame.bind(win)})){original.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}});
after(async()=>{await win.happyDOM.close();for(const [k,v] of original){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}});
test('standalone player honors reduced motion at mount, after preference changes and for seek; cleans listeners',()=>{
  const host=document.createElement('main');document.body.append(host);media.matches=true;
  const p=mount(host,{doc:getExample('column'),options:{ratio:'story',duration:8}});
  try{assert.equal(host.querySelector('output').textContent,'8.0 / 8s');assert.equal(host.querySelector('.fp-play').disabled,true);p.seek(.25);assert.equal(host.querySelector('input').value,'1000');
    media.matches=false;for(const f of listeners)f();p.seek(.25);assert.equal(host.querySelector('output').textContent,'2.0 / 8s');assert.equal(host.querySelector('.fp-play').textContent,'播放');
    media.matches=true;for(const f of listeners)f();assert.equal(host.querySelector('output').textContent,'8.0 / 8s');assert.equal(host.querySelector('.fp-reset').disabled,true);
  }finally{p.destroy();host.remove();}assert.equal(listeners.size,0);
});
