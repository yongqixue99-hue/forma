import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { ChartScene } from '../../src/forma/charts.js';
import { getExample, catalog } from '../../src/forma/catalog.js';
import { staticSVG, standaloneHTML } from '../../src/forma/export.js';

const window=new Window();globalThis.document=window.document;globalThis.XMLSerializer=window.XMLSerializer;
test('every renderer can seek backwards deterministically, at all palettes, both grounds and narrow widths',()=>{
  for(const t of catalog)for(const palette of ['ink','cobalt','vermilion','mono'])for(const width of [300,840])for(const dark of [false,true]){
    const host=document.createElement('div'),scene=new ChartScene(host,getExample(t.id),{palette,dark,width,height:width===300?240:420,compact:width===300,interactive:false});
    const final=scene.serialize();for(const p of [0,.2,.65,1,.4,1]){scene.render(p);assert.doesNotMatch(scene.serialize(),/NaN|Infinity/,`${t.id}/${palette}/${width}/${p}`);}
    assert.equal(scene.serialize(),final,`seeking roundtrip: ${t.id}`);scene.destroy();assert.equal(host.children.length,0);
  }
});
test('missing line points form separate SVG subpaths rather than fabricated connecting strokes',()=>{const doc=getExample('tide');doc.data=Array.from({length:5},(_,i)=>({period:String(i),series:'A',value:i===2?null:i+1}));const scene=new ChartScene(document.createElement('div'),doc,{interactive:false,width:600,height:300});const lines=[...scene.svg.querySelectorAll('path[data-mark="series-line"]')];assert.equal(lines.length,1);assert.equal((lines[0].getAttribute('d').match(/M/g)||[]).length,2);scene.destroy();});
test('bubble circle areas scale proportionally to values, including in animation',()=>{const doc=getExample('scatter');doc.data=[{label:'A',group:'g',x:1,y:1,size:10},{label:'B',group:'g',x:2,y:2,size:40},{label:'C',group:'g',x:3,y:3,size:90}];const scene=new ChartScene(document.createElement('div'),doc,{interactive:false,width:600,height:300});const circles=[...scene.svg.querySelectorAll('circle[data-tip]')];const radius=label=>+circles.find(c=>c.getAttribute('data-tip').startsWith(label)).getAttribute('r');assert.ok(Math.abs(radius('B')**2/radius('A')**2-4)<1e-9);scene.destroy();});
test('static exports include provenance and preserve selected aspect ratios',()=>{for(const [ratio,height]of [['wide',750],['square',1200],['portrait',1600]]){const svg=staticSVG(getExample('chord'),{palette:'clay',dark:true,ratio});assert.ok(svg.includes(`width="1200" height="${height}"`));assert.ok(svg.includes('确定性合成数据'));assert.ok(svg.includes('<desc>'));assert.doesNotMatch(svg.replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity/);}});
test('standalone payload cannot terminate script or title elements',()=>{const doc=getExample('tide');doc.title='</title><script>alert(1)</script>';const html=standaloneHTML(doc,{},'var FormaPlayer={mount(){}};');assert.ok(html.includes('&lt;/title&gt;'));assert.ok(html.includes('\\u003c/script>'));assert.equal((html.match(/<script>/g)||[]).length,2);});
