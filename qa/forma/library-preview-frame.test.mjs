import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {ChartScene} from '../../src/forma/charts.js';
import {getExample} from '../../src/forma/catalog.js';
import {renderPreviewFrame} from '../../src/forma/library-preview-frame.js';

test('gallery keeps every moving frame but renders its three-second hold only once',()=>{
  const win=new Window(),previous=new Map();
  for(const [key,value]of Object.entries({document:win.document,XMLSerializer:win.XMLSerializer})){
    previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  const scenes=[];
  try{
    for(const id of ['clusterheatmap','splom','sunburst']){
      const scene=new ChartScene(document.createElement('div'),getExample(id),{width:760,height:440,interactive:false});scenes.push(scene);
      const render=scene.render.bind(scene),seen=[];scene.render=p=>{seen.push(p);render(p);};
      for(let frame=0;frame<11*60;frame++)renderPreviewFrame(scene,Math.min(1,(frame/60%11)/8));
      assert.equal(seen.length,481,id);assert.equal(seen.filter(p=>p===1).length,1,id);
      const final=scene.serialize();render(1);assert.equal(scene.serialize(),final,id);
      renderPreviewFrame(scene,0);assert.equal(seen.at(-1),0,'the next cycle must restart');
      renderPreviewFrame(scene,1);assert.equal(seen.at(-1),1,'pause must still show the completed chart');
    }
    const replacement=new ChartScene(document.createElement('div'),getExample('sunburst'),{interactive:false});scenes.push(replacement);
    let rendered=0;const render=replacement.render.bind(replacement);replacement.render=p=>{rendered++;render(p);};
    renderPreviewFrame(replacement,1);assert.equal(rendered,1,'newly visible/recreated previews must draw even at the same progress');
    assert.doesNotThrow(()=>renderPreviewFrame(null,1));
  }finally{
    scenes.forEach(scene=>scene.destroy());win.happyDOM.abort();
    for(const [key,value]of previous)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];
  }
});
