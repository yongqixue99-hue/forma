import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {CanvasSource} from 'mediabunny';
import {getExample} from '../../src/forma/catalog.js';
import {presetWork} from '../../src/forma/work-model.js';
import {encodeMP4} from '../../src/forma/video-export.js';
import {encodeWorkMP4} from '../../src/forma/work-video.js';

function globals(t,values){
  const previous=Object.fromEntries(Object.keys(values).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const [key,value]of Object.entries(values))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  t.after(()=>{for(const [key,descriptor]of Object.entries(previous)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
}

// Exercise real export layout, SVG serialization and encoder setup. Only the
// browser rasterizer and frame submission are replaced in this Node test.
function videoSurface(t){
  const win=new Window(),frames=[],canvases=[];
  t.after(()=>win.happyDOM.close());
  globals(t,{document:win.document,XMLSerializer:win.XMLSerializer,HTMLCanvasElement:win.HTMLCanvasElement,
    VideoEncoder:{isConfigSupported:async()=>({supported:true})},
    Image:class{async decode(){frames.push(await (await fetch(this.src)).text());}}
  });
  t.mock.method(win.HTMLCanvasElement.prototype,'getContext',function(){canvases.push(this);return {clearRect(){},drawImage(){}};});
  const stop=new Error('captured first frame');
  t.mock.method(CanvasSource.prototype,'add',async()=>{throw stop;});
  return {win,frames,canvases,stop};
}

test('single-chart video freezes its document and nested render settings before loading the encoder',async t=>{
  const {win,frames,canvases,stop}=videoSurface(t);
  const doc=getExample('column'),original=structuredClone(doc),options={ratio:'landscape',longEdge:720,colors:['#114477','#5588aa'],signal:new AbortController().signal,onProgress(){}};
  const pending=encodeMP4(doc,options);
  doc.title='Edited after export started';doc.data[0].value=98765;options.colors[0]='#ee2233';
  await assert.rejects(pending,error=>error===stop);
  assert.equal(frames.length,1);
  const svg=new win.DOMParser().parseFromString(frames[0],'image/svg+xml');
  assert.equal(svg.querySelector('title').textContent,original.title);
  assert.equal(JSON.parse(svg.querySelector('desc').textContent).data[0].value,original.data[0].value);
  assert.ok(frames[0].includes('#114477'));
  assert.ok(!frames[0].includes('#ee2233'));
  assert.equal(canvases.length,1);
  assert.ok(canvases.every(canvas=>canvas.width===0&&canvas.height===0),'failed export releases its canvas');
});

test('3D video ignores the interactive camera callback and snapshots the camera pose',async t=>{
  const {win,frames,stop}=videoSurface(t),doc=getExample('scatter3d');let cameraChanges=0;
  const options={ratio:'landscape',longEdge:720,camera3d:{azimuth:30,elevation:22},onCameraChange(){cameraChanges++;}};
  const callback=options.onCameraChange,pending=encodeMP4(doc,options);
  options.camera3d.azimuth=-50;options.camera3d.elevation=65;
  await assert.rejects(pending,error=>error===stop);
  assert.equal(frames.length,1);
  const svg=new win.DOMParser().parseFromString(frames[0],'image/svg+xml'),chart=svg.querySelector('[data-camera-azimuth]');
  assert.ok(svg.querySelector('[data-spatial-renderer="scatter3d"]'));
  assert.equal(chart.getAttribute('data-camera-azimuth'),'30');
  assert.equal(chart.getAttribute('data-camera-elevation'),'22');
  assert.equal(cameraChanges,0);
  assert.equal(options.onCameraChange,callback,'the caller retains its interactive callback');
});

for(const [label,encode]of [
  ['single-chart',signal=>encodeMP4(getExample('column'),{longEdge:1080,ratio:'square'},{signal})],
  ['whole-work',signal=>encodeWorkMP4(presetWork('essential'),{longEdge:1280,ratio:'square'},{signal})]
])test(`${label} cancellation during an unsupported codec probe is reported as cancellation`,async t=>{
  const controller=new AbortController();let probed=false;
  globals(t,{VideoEncoder:{async isConfigSupported(){probed=true;controller.abort();return {supported:false};}}});
  await assert.rejects(encode(controller.signal),{name:'AbortError'});
  assert.equal(probed,true);
});

test('unsupported codecs still report capability failures when export was not cancelled',async t=>{
  globals(t,{VideoEncoder:undefined});
  for(const encode of [()=>encodeMP4(getExample('column')),()=>encodeWorkMP4(presetWork('essential'))]){
    await assert.rejects(encode,error=>error.name==='Error'&&error.message.includes('MP4'));
  }
});
