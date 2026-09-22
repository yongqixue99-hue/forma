import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {catalog,getExample,findTemplate} from '../../src/forma/catalog.js';
import {validateDocument} from '../../src/forma/data.js';
import {readCell,parseTable,splitTable,suggestMapping,mapTable,documentCells,cellsToDocument,pasteCells,tableHistory} from '../../src/forma/table-data.js';
import {makeProject,readProject} from '../../src/forma/project-file.js';
import {videoPlan,videoSupport,encodeMP4} from '../../src/forma/video-export.js';
import {staticSVG,createExportScene,outputDimensions} from '../../src/forma/export.js';
import {openTableEditor} from '../../src/forma/table-editor.js';
const window=new Window();globalThis.document=window.document;globalThis.XMLSerializer=window.XMLSerializer;

test('clipboard TSV and CSV retain quoted delimiters, escaped quotes, newlines and missing cells',()=>{
  assert.deepEqual(parseTable('\uFEFF月份\t销售额\r\n1月\t128\r\n2月\t\r\n'),[['月份','销售额'],['1月','128'],['2月','']]);
  assert.deepEqual(parseTable('name,value\n"A, B","1,200"\n"A""B\nC",0'),[['name','value'],['A, B','1,200'],['A"B\nC','0']]);
  assert.deepEqual(parseTable('x,y\nA\nB,2'),[['x','y'],['A',''],['B','2']]);
  assert.throws(()=>parseTable('x,y\n"A,3'),/引号/);assert.throws(()=>parseTable('x,y\n"A"oops,3'),/引号/);
  assert.throws(()=>parseTable(' '.repeat(2000001)),/2 MB/);
  assert.throws(()=>parseTable(Array.from({length:1502},()=>['x','1'].join(',')).join('\n')),/1,500/);
});
test('numbers stay strict: missing is not zero, percentage/formulas/units need explicit correction',()=>{
  assert.ok(Number.isNaN(readCell('','number')));assert.equal(readCell('','number | null'),null);assert.equal(readCell('0','number'),0);
  assert.equal(readCell('1,234.5','number'),1234.5);assert.equal(readCell('-2.7e-4','number'),-.00027);assert.equal(readCell('0012','string'),'0012');
  for(const x of ['=1+2','35%','128万元','Infinity','0xFF','1,2','1 200'])assert.ok(Number.isNaN(readCell(x,'number')),x);
});
test('header switch and column mapping are explicit and cannot duplicate or omit roles',()=>{
  const matrix=parseTable('月份,销售额,备注\n1月,128,一\n2月,156,二');const t=splitTable(matrix),f=findTemplate('column').fields,m=suggestMapping(t.headers,t.rows,f);
  assert.deepEqual(m,[0,1]);assert.deepEqual(mapTable(t,m,f),[['1月','128'],['2月','156']]);
  assert.equal(splitTable(matrix,false).rows.length,3);assert.throws(()=>splitTable([['x','y']]),/只有列名/);
  assert.throws(()=>mapTable(t,[0,0],f),/同一列/);assert.throws(()=>mapTable(t,[0,-1],f),/每个图表字段/);
  const ambiguous=splitTable(parseTable('A,B,C\nfoo,1,2\nbar,2,3'));assert.deepEqual(suggestMapping(ambiguous.headers,ambiguous.rows,f),[0,-1]);
});
test('all 112 existing documents survive a grid roundtrip, including statistics and metadata',()=>{
  for(const t of catalog){const doc=getExample(t.id),result=cellsToDocument(doc,documentCells(doc));assert.deepEqual(result.doc,doc,t.id);assert.equal(result.errors.length,0,t.id);assert.equal(validateDocument(result.doc).valid,true,t.id);}
});
test('invalid cells keep locations and missing trend observations remain null',()=>{
  const doc=getExample('singleline'),cells=documentCells(doc);cells[1][1]='';cells[2][1]='n/a';const result=cellsToDocument(doc,cells);
  assert.equal(result.doc.data[1].value,null);assert.deepEqual(result.errors.map(e=>[e.row,e.col]),[[2,1]]);assert.equal(validateDocument(result.doc).valid,false);
});
test('rectangular cell paste extends rows but never silently discards columns',()=>{
  const cells=[['a','1'],['b','2']];assert.deepEqual(pasteCells(cells,[['5'],['8']],1,1,2),[['a','1'],['b','5'],['','8']]);
  assert.deepEqual(cells,[['a','1'],['b','2']]);assert.throws(()=>pasteCells(cells,[['a','2']],0,1,2),/列数/);assert.throws(()=>pasteCells(cells,[['1']],1500,1,2),/1,500/);
});
test('undo redo restore exact cell content and a new edit clears redo',()=>{
  const h=tableHistory([['a','1']]);h.set([['b','2']]);h.set([['c','3']]);assert.deepEqual(h.undo(),[['b','2']]);assert.deepEqual(h.redo(),[['c','3']]);h.undo();h.set([['d','4']]);assert.equal(h.canRedo,false);const external=h.value;external[0][0]='mutated';assert.equal(h.value[0][0],'d');
});
test('project file preserves data, styling, 3D camera and export preferences',()=>{
  const doc=getExample('scatter3d'),options={palette:'cobalt',dark:true,ratio:'square',duration:12,camera3d:{azimuth:40,elevation:20},exportSettings:{format:'mp4',ratio:'landscape',longEdge:1920,duration:8,hold:1,fps:60,transparent:false,chartOnly:true,frame:'end'}};
  const result=readProject(JSON.stringify(makeProject(doc,options)));assert.deepEqual(result,{doc,options});
  assert.deepEqual(readProject(JSON.stringify(doc)).doc,doc);assert.throws(()=>readProject('{bad'),/JSON/);assert.throws(()=>readProject(JSON.stringify({format:'forma-project',version:2,doc})),/版本/);
  const d=structuredClone(doc);d.data[0].x='wrong';assert.throws(()=>makeProject(d,{}),/数值/);
});
test('project file does not restore malformed or executable settings',()=>{
  const result=readProject(JSON.stringify({format:'forma-project',version:1,doc:getExample('column'),options:{palette:'nope',duration:-1,ratio:'invalid',camera3d:{azimuth:'bad'},exportSettings:{format:'unknown',duration:Infinity,fps:200000}}}));
  assert.equal(result.options.duration,8);assert.equal(result.options.ratio,'wide');assert.equal(result.options.camera3d,undefined);assert.equal(result.options.exportSettings.fps,30);
});
test('video frames cover start, exact end and requested hold independent of fps',()=>{
  for(const fps of [24,30,60]){const p=videoPlan({duration:8,hold:1,fps,ratio:'landscape',longEdge:1920});assert.equal(p.frames,8*fps);assert.equal(p.animatedFrames,7*fps);assert.equal(p.progress(0),0);assert.equal(p.progress(p.animatedFrames-1),1);assert.equal(p.progress(p.frames-1),1);assert.deepEqual([p.width,p.height],[1920,1080]);}
  assert.equal(videoPlan({duration:2,hold:0}).progress(59),1);
  for(const settings of [{fps:0},{duration:0},{duration:21},{duration:2,hold:2},{hold:-1},{longEdge:2400}])assert.throws(()=>videoPlan(settings));
});
test('unsupported encoders and cancellation stop before rendering a video',async()=>{
  assert.equal(await videoSupport({}),false);const controller=new AbortController();controller.abort();await assert.rejects(()=>encodeMP4(getExample('column'),{},{signal:controller.signal}),{name:'AbortError'});
});
test('output sizes stay even and honor landscape, portrait and square aspect',()=>{
  assert.deepEqual(outputDimensions('story',1920),{width:1080,height:1920});assert.deepEqual(outputDimensions('square',1080),{width:1080,height:1080});assert.deepEqual(outputDimensions('wide',2400),{width:2400,height:1500});assert.throws(()=>outputDimensions('wide',0));
});
test('reusable export renderer has deterministic seeks and explicit background / framing',()=>{
  const doc=getExample('column'),scene=createExportScene(doc,{ratio:'landscape'});const end=scene.frame(1),first=scene.frame(0);assert.notEqual(first,end);assert.doesNotMatch(scene.frame(.6).replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity/);assert.equal(scene.frame(1),end);scene.destroy();
  const svg=staticSVG(doc,{ratio:'story',transparent:true,chartOnly:true});const host=document.createElement('div');host.innerHTML=svg;
  assert.equal(host.querySelector('svg').getAttribute('height'),'2134');assert.equal([...host.querySelector('svg').children].some(e=>['rect','g'].includes(e.tagName)),false);assert.ok(host.querySelector('desc').textContent.includes(doc.source.name));
});
test('data editor applies input events without requiring a synthetic change event',()=>{
  let applied;const doc=getExample('column');const editor=openTableEditor(doc,{onApply:d=>applied=d});const dialog=document.querySelector('.table-workflow');
  const fill=(selector,value)=>{const el=dialog.querySelector(selector);el.value=value;el.dispatchEvent(new window.Event('input',{bubbles:true}));};
  fill('[data-meta=source]','表格输入测试');fill('[data-row="0"][data-col="1"]','999');dialog.querySelector('[data-table=apply]').click();
  assert.equal(applied.data[0].value,999);assert.equal(applied.source.type,'user');assert.equal(document.querySelector('.table-workflow'),null);
});
test('import unit edits update matching axis suffixes and undo together',()=>{
  let applied;const doc=getExample('column');doc.axes={x:'批次',y:'信号 / 万元'};
  const editor=openTableEditor(doc,{onApply:d=>applied=d}),dialog=document.querySelector('.table-workflow');
  const input=dialog.querySelector('[data-meta=unit]');input.value='AU';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  dialog.querySelector('[data-table=undo]').click();assert.equal(dialog.querySelector('[data-meta=unit]').value,'万元');
  dialog.querySelector('[data-table=redo]').click();dialog.querySelector('[data-table=apply]').click();
  assert.equal(applied.unit,'AU');assert.deepEqual(applied.axes,{x:'批次',y:'信号 / AU'});assert.equal(doc.axes.y,'信号 / 万元');
});
test('data editor rejects invalid cells, supports undo and can discard isolated changes',()=>{
  let applied;openTableEditor(getExample('column'),{onApply:d=>applied=d});const dialog=document.querySelector('.table-workflow');
  const input=dialog.querySelector('[data-row="0"][data-col="1"]');input.value='oops';input.dispatchEvent(new window.Event('input',{bubbles:true}));dialog.querySelector('[data-table=apply]').click();assert.equal(applied,undefined);assert.ok(dialog.querySelector('[aria-invalid=true]'));
  dialog.querySelector('[data-table=undo]').click();assert.equal(dialog.querySelector('[data-row="0"][data-col="1"]').value,'42');dialog.querySelector('[data-table=close]').click();dialog.querySelector('[data-table=discard]').click();assert.equal(document.querySelector('.table-workflow'),null);
});
test('applying a table closes its dialog before the application presents success feedback',()=>{
  const toast=document.createElement('div');toast.id='toast';document.body.append(toast);
  openTableEditor(getExample('column'),{onApply(){const top=[...document.querySelectorAll('dialog[open]')].at(-1);(top||document.body).append(toast);toast.textContent='已应用';}});
  document.querySelector('[data-table=apply]').click();assert.equal(document.querySelector('#toast')?.textContent,'已应用');toast.remove();
});
test('import reveals and focuses required source information instead of hiding a blocking error',()=>{
  let applied;openTableEditor(getExample('column'),{onApply:doc=>applied=doc});const dialog=document.querySelector('.table-workflow');
  const input=dialog.querySelector('[data-row="0"][data-col="1"]');input.value='99';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  dialog.querySelector('[data-table=apply]').click();assert.equal(applied,undefined);
  assert.equal(dialog.querySelector('.table-import-meta').open,true);assert.equal(document.activeElement.dataset.meta,'source');
  assert.match(dialog.querySelector('#table-message').textContent,/来源/);
  const source=dialog.querySelector('[data-meta="source"]');source.value='导入功能测试 · 合成数据';source.dispatchEvent(new window.Event('input',{bubbles:true}));
  dialog.querySelector('[data-table=apply]').click();assert.equal(applied.data[0].value,99);assert.equal(applied.source.name,'导入功能测试 · 合成数据');
});

test('clipboard TSV preserves quoted newlines, empty trailing cells and comma-formatted numbers',()=>{
  const raw='"项目\n甲"\t1,200\t\n乙\t3\t\n\t\t';
  assert.deepEqual(parseTable(raw,{delimiter:'\t',preserveEmpty:true}),[['项目\n甲','1,200',''],['乙','3',''],['','','']]);
  assert.deepEqual(parseTable('\t\t',{delimiter:'\t',preserveEmpty:true}),[['','','']]);
});
