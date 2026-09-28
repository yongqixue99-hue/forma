import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {ChartScene} from '../../src/forma/charts.js';
import {getExample} from '../../src/forma/catalog.js';
import {createLibraryPreviews} from '../../src/forma/library-previews.js';

test('large galleries draw only visible charts, release offscreen SVGs and ignore queued callbacks after closing',()=>{
 const window=new Window(),previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{value:window.document,writable:true,configurable:true});
 const observers=[],scenes=[],frames=[];let progress=.4;
 class Observer {constructor(callback){this.callback=callback;this.targets=[];observers.push(this);}observe(host){this.targets.push(host);}disconnect(){this.targets=[];}}
 const gallery=createLibraryPreviews({Observer,currentProgress:()=>progress,createScene(host,doc,options){const scene=new ChartScene(host,doc,{width:640,height:360,interactive:false,...options}),render=scene.render.bind(scene);scene.render=p=>{frames.push([doc.template,p]);render(p);};scenes.push(scene);return scene;}});
 try{
  const hosts=Array.from({length:204},()=>document.createElement('div'));
  hosts.forEach((host,i)=>gallery.add(host,getExample(['clusterheatmap','radviz','taylor'][i%3]),{}));
  assert.equal(observers.length,1);assert.equal(scenes.length,0,'hidden charts must not allocate SVGs');
  const observer=observers[0],visible=hosts.slice(0,3).map(target=>({target,isIntersecting:true}));
  observer.callback(visible);assert.equal(scenes.length,3);assert.ok(hosts.slice(0,3).every(h=>h.querySelector('svg')));
  gallery.render(1);const settled=hosts[0].innerHTML,count=frames.length;gallery.render(1);assert.equal(frames.length,count,'hold frames must not redraw');
  observer.callback([{target:hosts[0],isIntersecting:false}]);assert.equal(hosts[0].children.length,0);progress=1;
  observer.callback([{target:hosts[0],isIntersecting:true}]);assert.equal(scenes.length,4);assert.equal(hosts[0].innerHTML,settled,'re-entering at rest restores exact data geometry');
  gallery.destroy();assert.ok(hosts.every(h=>h.children.length===0));assert.equal(observer.targets.length,0);
  observer.callback(visible);gallery.render(.2);gallery.add(hosts[4],getExample('radviz'),{});gallery.destroy();assert.equal(scenes.length,4,'stale visibility callbacks must not resurrect disposed scenes');
 }finally{gallery.destroy();if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;window.happyDOM.abort();}
});
