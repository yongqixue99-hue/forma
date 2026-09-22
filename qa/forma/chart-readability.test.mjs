import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {contrastRatio,areaDataLabel,labelInk,blendedSurface} from '../../src/forma/chart-readability.js';
import {MorphChart,layoutMorph} from '../../src/forma/morph.js';
import {ScientificMorphChart} from '../../src/forma/scientific-morph.js';
import {presetWork,morphDocument,stepMorphDocument} from '../../src/forma/work-model.js';
import {palettes} from '../../src/forma/palettes.js';
const host=()=>new Window().document.createElement('div');
test('area labels identify categories directly and separate names from exact values',()=>{
 const doc=morphDocument(presetWork('public-revenue').steps[0]);
 for(const view of ['treemap','stacked','bubbles']){const l=layoutMorph(doc,view,900,460);for(const m of l.marks.filter(m=>m.label.visible!==false)){const label=m.label;assert.match(label.fullText,new RegExp(doc.data[m.index].label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));assert.ok(label.heading.length);assert.ok(label.bodyOffset>(label.heading.length-1)*label.headingLineHeight+label.headingSize);assert.equal(m.value,doc.data[m.index].value);}}
 const label=areaDataLabel('Wearables, Home and Accessories',35686,{x:0,y:0,width:260,height:120});assert.equal(label.heading.join(' '),'Wearables, Home and Accessories');assert.equal(label.text,'35,686');
});
test('sector callouts retain identities, names and correct connector endpoints after reorder',()=>{
 const doc=morphDocument(presetWork('public-revenue').steps[0]);doc.data.reverse();doc.data[0].label='Renamed services';
 for(const view of ['pie','donut']){const l=layoutMorph(doc,view,860,440);for(const m of l.marks){assert.ok(m.label.fullText.startsWith(doc.data[m.index].label+':'));const g=m.geometry,a=(g.a0+g.a1)/2,p=m.label.leader[0];assert.ok(Math.abs(p[0]-g.cx-Math.cos(a)*g.r1)<1e-6);assert.ok(Math.abs(p[1]-g.cy-Math.sin(a)*g.r1)<1e-6);assert.equal(m.value,doc.data[m.index].value);}}
});
test('categorical marks and custom fills choose readable text on light and dark surfaces',()=>{
 for(const palette of Object.values(palettes))for(const background of ['#f8f7f4','#202020'])for(const c of [...palette.colors,...palette.darkColors,'#ffffdd','#111133','#888888']){const surface=blendedSurface(c,background,.91);assert.ok(contrastRatio(labelInk(surface),surface)>=4.5);}
 const doc=morphDocument(presetWork('public-revenue').steps[0]),s=new MorphChart(host(),doc,{width:900,height:440,view:'treemap',palette:'ochre'});for(const n of s.nodes.values()){assert.equal(n.texture.getAttribute('opacity'),'0');assert.equal(n.shape.getAttribute('fill-opacity'),'0.91');}s.destroy();
});
test('matrix numeric labels paint above cells and survive repeated view changes with full text tooltips',()=>{
 const step=presetWork('matrix-encoding').steps[0],s=new ScientificMorphChart(host(),stepMorphDocument(step),{width:860,height:440,view:'matrix-heatmap'});
 for(const view of ['matrix-heatmap','matrix-bubbles','matrix-heatmap']){s.setDocument(s.doc,view);s.render(1);const expected=s.layout.labels.filter(l=>l.dataLabel);assert.ok(expected.length>0);const actual=[...s.labelLayer.querySelectorAll('text[data-guide-value]')];assert.equal(actual.length,expected.length);assert.ok(actual.every(t=>t.parentElement===s.labelLayer));assert.ok(actual.every(t=>t.querySelector('title')));}
 assert.equal(s.svg.querySelector(':scope > title'),null);assert.ok(s.svg.querySelector(':scope > desc'));assert.ok(s.markLayer.querySelector('title'));s.destroy();
});
test('missing observations keep a visible missing symbol inside the plotting frame',()=>{
 const work=presetWork('inventory');for(const step of work.steps){const s=new MorphChart(host(),morphDocument(step),{width:860,height:440,view:step.view});for(const m of s.layout.marks.filter(m=>m.value===null)){assert.equal(m.label.text,'—');assert.ok(m.label.y<=s.layout.plot.y+s.layout.plot.h);assert.ok(m.label.y>=s.layout.plot.y);assert.equal(s.nodes.get(m.key).shape.getAttribute('opacity'),'0');}s.destroy();}
});
