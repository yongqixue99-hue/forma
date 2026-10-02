import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createServer} from 'vite';

let window,server,openDataImporter,getExample;
const globals=new Map();
before(async()=>{
  window=new Window({url:'http://localhost:4197'});
  for(const [key,value] of Object.entries({window,document:window.document,navigator:window.navigator,XMLSerializer:window.XMLSerializer,ResizeObserver:window.ResizeObserver,requestAnimationFrame:window.requestAnimationFrame.bind(window),cancelAnimationFrame:window.cancelAnimationFrame.bind(window)})){
    globals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
  ({openDataImporter}=await server.ssrLoadModule('/src/forma/data-importer.js'));
  ({getExample}=await server.ssrLoadModule('/src/forma/catalog.js'));
});
after(async()=>{await server?.close();await window?.happyDOM.close();for(const [key,value] of globals){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}});
beforeEach(()=>{document.body.innerHTML='';});
const $=selector=>document.querySelector(selector);
const click=selector=>{assert.ok($(selector),selector);$(selector).click();};
const input=(selector,value)=>{const cell=$(selector);assert.ok(cell,selector);cell.value=value;cell.dispatchEvent(new window.Event('input',{bubbles:true}));};
const change=(selector,value)=>{const cell=$(selector);assert.ok(cell,selector);if(typeof value==='boolean')cell.checked=value;else cell.value=value;cell.dispatchEvent(new window.Event('change',{bubbles:true}));};
function pasteCells(selector,text){const event=new window.Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(event,'clipboardData',{value:{getData:()=>text,files:[]}});$(selector).dispatchEvent(event);assert.equal(event.defaultPrevented,true);}
function source(matrix,origin={kind:'paste'}){return {matrix,locations:matrix.map((row,r)=>row.map((_,c)=>`实验!${String.fromCharCode(66+c)}${r+3}`)),issues:[],notes:[],origin};}
function textFile(name,text){const file={name,size:text.length};Object.defineProperty(file,'text',{value:async()=>text});return file;}

test('a chart handoff isolates raw input and retains header choice, metadata and workbook coordinates',t=>{
  const raw=source([['甲','1'],['乙','2'],['丙','3']],{kind:'xlsx',file:'测量.xlsx',sheet:'实验',range:'B3:C5'});raw.mapping=[1,0];
  let applied;const importer=openDataImporter(getExample('column'),{initialSource:raw,initialHeader:false,initialMetadata:{title:'三次测量',subtitle:'未经汇总',unit:'AU',source:'原始实验记录'},onApply:doc=>applied=doc});t.after(()=>importer.close());
  assert.equal($('#di-header').checked,false);assert.deepEqual(importer.captureSession().mapping,[]);
  input('[data-source-cell="0:1"]','9');assert.equal(raw.matrix[0][1],'1');
  click('[data-di="reset"]');assert.deepEqual(importer.captureSession().mapping,[]);
  click('footer [data-di="mapping"]');assert.deepEqual(importer.captureSession().mapping,[0,1]);
  click('[data-di="prepare"]');click('[data-di="apply"]');
  assert.equal(applied.data.length,3);assert.equal(applied.data[0].value,1);assert.equal(applied.title,'三次测量');assert.equal(applied.subtitle,'未经汇总');assert.equal(applied.unit,'AU');assert.equal(applied.source.name,'原始实验记录');
  assert.deepEqual(applied.tableInput.headerRefs,[]);assert.deepEqual(applied.tableInput.rowRefs[applied.data[0]._id],['实验!B3','实验!C3']);assert.equal(applied.tableInput.origin.file,'测量.xlsx');
});

test('users can declare a headerless paste before reading and all observations survive',t=>{
  let applied;const importer=openDataImporter(getExample('column'),{onApply:doc=>applied=doc});t.after(()=>importer.close());
  change('#di-header',false);input('#di-paste','一月\t100\n二月\t200\n三月\t300');click('[data-di="read-paste"]');
  assert.equal($('#di-header').checked,false);assert.equal($('[data-source-cell="0:0"]').value,'一月');
  click('footer [data-di="mapping"]');input('[data-di-meta="source"]','月度记录');click('[data-di="prepare"]');click('[data-di="apply"]');
  assert.deepEqual(applied.data.map(row=>[row.label,row.value]),[['一月',100],['二月',200],['三月',300]]);
});

test('clipboard thousand separators remain one column in both paste entry points',t=>{
  let importer=openDataImporter(getExample('column'),{initialHeader:false});t.after(()=>importer.close());
  input('#di-paste','1,200\n2,300');click('[data-di="read-paste"]');assert.deepEqual(importer.captureSession().source.matrix,[['1,200'],['2,300']]);importer.close();
  let applied;importer=openDataImporter(getExample('column'),{initialSource:source([['类别','数值','备注'],['甲','1','保留甲'],['乙','2','保留乙']]),initialMetadata:{source:'人工测量'},onApply:doc=>applied=doc});
  pasteCells('[data-source-cell="1:1"]','1,200\n2,300');
  assert.deepEqual(importer.captureSession().source.matrix,[['类别','数值','备注'],['甲','1,200','保留甲'],['乙','2,300','保留乙']]);
  click('footer [data-di="mapping"]');click('[data-di="prepare"]');click('[data-di="apply"]');
  assert.deepEqual(applied.data.map(row=>row.value),[1200,2300]);assert.deepEqual(applied.data.map(row=>row._extra[2]),['保留甲','保留乙']);
});

test('CSV files retain quoting rules and discarded file attribution clears without removing manual sources',async t=>{
  let importer=openDataImporter(getExample('column'));t.after(()=>importer.close());
  await importer.loadFile(textFile('旧销量.csv','name,value\n"A, B","1,200"\nBeta,0'));
  assert.deepEqual(importer.captureSession().source.matrix,[['name','value'],['A, B','1,200'],['Beta','0']]);
  const saved=importer.captureSession();importer.close();importer=openDataImporter(getExample('column'),{resume:saved});await importer.ready;
  click('[data-di="paste"]');assert.equal(importer.captureSession().metadata.source,'');
  input('#di-paste','类别\t数值\n甲\t1\n乙\t2');click('[data-di="read-paste"]');click('footer [data-di="mapping"]');input('[data-di-meta="source"]','用户提供的完整来源');click('[data-di="source"]');click('[data-di="paste"]');
  assert.equal(importer.captureSession().metadata.source,'用户提供的完整来源');
});

test('reading a new file preserves an explicitly selected headerless interpretation',async t=>{
  const importer=openDataImporter(getExample('column'),{initialHeader:false});t.after(()=>importer.close());
  await importer.loadFile(textFile('无表头.tsv','甲\t1\n乙\t2'));
  assert.equal($('#di-header').checked,false);assert.equal($('[data-source-cell="0:0"]').value,'甲');
  click('footer [data-di="mapping"]');assert.match($('.di-target').textContent,/→ 2 行/);
});

test('a workbook error in the header can be located, corrected and imported at its original address',t=>{
  const raw=source([['类别','','备注'],['甲','1','记录甲'],['乙','2','记录乙']],{kind:'xlsx',file:'表头公式.xlsx',sheet:'实验',range:'B3:D5'});raw.issues=[{row:0,col:1,message:'公式没有缓存结果'}];
  let applied;const importer=openDataImporter(getExample('column'),{initialSource:raw,onApply:doc=>applied=doc});t.after(()=>importer.close());
  click('[data-di="locate"]');assert.equal(document.activeElement.dataset.sourceCell,'0:1');assert.equal(document.activeElement.getAttribute('aria-invalid'),'true');
  input('[data-source-cell="0:1"]','数值');assert.equal(importer.captureSession().source.issues.length,0);assert.equal(raw.issues.length,1);assert.equal(raw.matrix[0][1],'');
  click('footer [data-di="mapping"]');click('[data-di="prepare"]');click('[data-di="apply"]');
  assert.deepEqual(applied.tableInput.headers,['类别','数值','备注']);assert.deepEqual(applied.tableInput.headerRefs,['实验!B3','实验!C3','实验!D3']);
});
