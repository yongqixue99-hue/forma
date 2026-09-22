import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {palettes,themeFor,normalizeColors} from '../../src/forma/palettes.js';
import {ChartScene} from '../../src/forma/charts.js';
import {makeProject,readProject} from '../../src/forma/project-file.js';
import {makeSelectionItem,normalizeSelection} from '../../src/forma/library-actions.js';
import {normalizeEditorRecords} from '../../src/forma/editor-model.js';
import {agentTemplateHTML,staticSVG} from '../../src/forma/export.js';
import {agentBrief} from '../../src/forma/data-guides.js';

const window=new Window(),previous=new Map();
before(()=>{for(const [key,value] of Object.entries({window,document:window.document,XMLSerializer:window.XMLSerializer})){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}});
after(async()=>{await window.happyDOM.close();for(const[key,value]of previous){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}});

test('six official palettes keep neutral grounds and custom colors are validated and copied',()=>{
  assert.equal(Object.keys(palettes).length,6);for(const p of Object.values(palettes)){assert.equal(p.paper,'#f8f7f4');assert.equal(p.dark,'#202020');assert.equal(p.colors.length,6);}
  const supplied=['#123456','#ABCDEF'];const colors=normalizeColors(supplied);assert.deepEqual(colors,['#123456','#abcdef']);assert.notEqual(colors,supplied);
  for(const invalid of [[],['red'],['#abc'],['url(javascript:bad)'],Array(13).fill('#123456')])assert.equal(normalizeColors(invalid),undefined);
  const theme=themeFor('ink',false,['#123456']);assert.equal(theme.color(18),'#123456');assert.equal(theme.accent,'#123456');assert.equal(theme.fg,'#262626');
});
test('custom colors survive editor storage, selection bundles and project files with the selected frame',()=>{
  const doc=getExample('column'),options={palette:'mauve',dark:false,colors:['#123456','#aabbcc','#cc7733'],colorMode:'categorical',ratio:'landscape',duration:8};
  assert.deepEqual(readProject(JSON.stringify(makeProject(doc,options))).options,options);
  assert.deepEqual(normalizeEditorRecords([{key:'column',doc,options}])[0].options,options);
  assert.deepEqual(normalizeSelection([makeSelectionItem(doc,options)])[0].options,options);
});
test('all chart types render with one, three and seven custom colors without missing paint or changing data',()=>{
  for(const t of catalog){const doc=getExample(t.id),before=structuredClone(doc);for(const count of [1,3,7]){
    const colors=Array.from({length:count},(_,i)=>['#355c7d','#b87662','#998551','#82668f','#697f72','#aa7182','#4d5667'][i]);
    const scene=new ChartScene(document.createElement('div'),doc,{width:680,height:430,interactive:false,palette:'ink',colors,colorMode:'categorical'});
    for(const p of [0,.45,1]){scene.render(p);const svg=scene.serialize();assert.ok(!/NaN|Infinity|(?:fill|stroke)="undefined"/.test(svg),`${t.id}, ${count} colors, ${p}`);}
    scene.destroy();}assert.deepEqual(doc,before,t.id);}
});
test('Agent HTML contains an editable, script-safe payload and original colors in static output',()=>{
  const doc=getExample('column');doc.title='图表 </script> 验收';const options={palette:'ochre',colors:['#123456','#aa6633'],colorMode:'categorical'};
  const html=agentTemplateHTML(doc,options,'var FormaPlayer={mount(){return {seek(){},play(){}}}};');
  const match=html.match(/<script id="forma-document" type="application\/json">([\s\S]*?)<\/script>/);assert.ok(match);assert.deepEqual(JSON.parse(match[1]),{doc,options});assert.ok(!match[1].includes('</script>'));assert.ok(!html.includes('http://127.0.0.1'));
  for(const script of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){if(!script[1].includes('application/json'))new Function(script[2]);}
  const svg=staticSVG(doc,options);assert.match(svg,/fill="#123456"/);assert.match(svg,/fill="#aa6633"/);
  const brief=agentBrief(getExample('column'),{palette:'ink'}),settings=JSON.parse([...brief.matchAll(/```json\n([\s\S]*?)\n```/g)].at(-1)[1]);
  assert.equal(Object.hasOwn(settings,'colors'),false);assert.equal(themeFor(settings.palette,settings.dark,settings.colors).accent,themeFor('ink').accent);
});
test('a single custom color reaches every relation and statistical series instead of dropping its paint',()=>{
  for(const [id,mark,attribute] of [['parallelsets','parallel-set-band','fill'],['edgebundle','bundled-node','stroke'],['raincloud','raincloud-density','fill'],['survival','survival-line','stroke']]){
    const host=document.createElement('div'),scene=new ChartScene(host,getExample(id),{width:680,height:430,colors:['#355c7d'],interactive:false});scene.render(1);
    const marks=[...host.querySelectorAll(`[data-mark="${mark}"]`)];assert.ok(marks.length>1,id);for(const node of marks)assert.equal(node.getAttribute(attribute),'#355c7d',`${id}: ${mark}`);scene.destroy();
  }
});
