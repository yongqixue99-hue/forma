import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {presetWork} from '../../src/forma/work-model.js';
import {stepSVG} from '../../src/forma/work-export.js';
import {createWorkExportRenderer,workVideoPlan} from '../../src/forma/work-video.js';
const w=new Window();let oldD,oldS;
before(()=>{oldD=globalThis.document;oldS=globalThis.XMLSerializer;globalThis.document=w.document;globalThis.XMLSerializer=w.XMLSerializer;});
after(async()=>{globalThis.document=oldD;globalThis.XMLSerializer=oldS;await w.happyDOM.close();});
function root(svg){return new w.DOMParser().parseFromString(svg,'image/svg+xml').documentElement;}
test('standalone SVG carries embedded font license notices as well-formed XML text',()=>{const work=presetWork('essential'),svg=root(stepSVG(work.steps[0]));assert.equal(svg.localName,'svg');assert.equal(svg.querySelector('parsererror'),null);assert.match(svg.querySelector('style').textContent,/SIL OPEN FONT LICENSE/);assert.match(svg.querySelector('style').textContent,/PERMISSION & CONDITIONS/);});
test('step SVG respects output size and transparent background for morph charts',()=>{const work=presetWork('classic'),s=work.steps[0];const svg=root(stepSVG(s,work.steps,{ratio:'story',longEdge:1920,transparent:true}));assert.equal(svg.getAttribute('width'),'1080');assert.equal(svg.getAttribute('height'),'1920');assert.equal([...svg.children].find(e=>e.localName==='rect')??null,null);});
test('step SVG chart-only omits title and source decoration while retaining accessible metadata',()=>{const work=presetWork('classic'),s=work.steps[0];const svg=root(stepSVG(s,work.steps,{chartOnly:true}));assert.equal([...svg.children].filter(e=>e.localName==='g').flatMap(g=>[...g.children]).filter(e=>e.localName==='text').length,0);assert.equal(svg.querySelector('title').textContent,s.doc.title);});
test('whole-work frame keeps the complete source rather than silently truncating it',()=>{const work=presetWork('classic');work.steps[0].doc.source.name='来源'.repeat(40);const r=createWorkExportRenderer(work);try{const svg=root(r.frame(3000));assert.ok([...svg.children].filter(e=>e.localName==='g').flatMap(g=>[...g.children]).filter(e=>e.localName==='g').flatMap(g=>[...g.children]).filter(e=>e.localName==='text').map(t=>t.textContent).join('').includes(work.steps[0].doc.source.name));}finally{r.destroy();}});

test('tiny morph values use scientific notation in visible axis, marks and legend, not only in metadata',()=>{
  const work=presetWork('essential');for(const s of work.steps){s.doc.data.forEach((r,i)=>r.value=(i+1)*1.23e-8);}
  for(const view of ['columns','line','dot']){const step={...work.steps[0],view};const svg=root(stepSVG(step,work.steps));const visible=[...svg.querySelectorAll('text')].map(t=>t.textContent).join('|');assert.match(visible,/2\.46e-8/);assert.doesNotMatch(visible,/0\.0000000/);assert.ok(svg.querySelectorAll('path').length>0);}
});
test('portrait exports reflow text for a readable narrow canvas rather than shrinking a desktop layout',()=>{
  const work=presetWork('essential'),s=work.steps[0];s.doc.title='这是用于验收竖版视频的长中文标题，完整内容应该换行显示';
  const svg=root(stepSVG(s,work.steps,{ratio:'story',longEdge:1920}));
  const viewWidth=Number(svg.getAttribute('viewBox').split(' ')[2]);assert.ok(viewWidth<=720);
  const r=createWorkExportRenderer(work,{ratio:'story'});try{const frame=root(r.frame(1000));const texts=[...frame.querySelectorAll('text')];assert.ok(texts.filter(t=>t.getAttribute('font-size')==='30').length>=2);assert.ok(texts.every(t=>t.getAttribute('x')===null||Number(t.getAttribute('x'))<r.width));assert.ok(texts.map(t=>t.textContent).join('').includes(s.doc.title));}finally{r.destroy();}
});
