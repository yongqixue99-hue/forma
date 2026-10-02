import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createServer} from 'vite';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {getDataGuide} from '../../src/forma/data-guides.js';
import {validateDocument} from '../../src/forma/data.js';
import {taskTable,taskChartDocument,recommendForTask,tableProfile} from '../../src/forma/task-recommendations.js';

const entry=(table,id,metadata)=>recommendForTask({table,metadata,limit:300}).find(result=>result.id===id);

test('fitting uses the entire raw table and retains signed values, genuine zero, precision and unused cells',()=>{
  const table=taskTable('label,value,note\n甲,-2.125,保留甲\n乙,0,真实零\n丙,1.23e-8,不舍入');const before=structuredClone(table),result=entry(table,'bar');
  assert.equal(result.status,'compatible');assert.deepEqual(table,before);assert.deepEqual(result.doc.data.map(row=>row.value),[-2.125,0,1.23e-8]);assert.deepEqual(result.doc.data.map(row=>row._extra[2]),['保留甲','真实零','不舍入']);assert.ok(validateDocument(result.doc).valid);
  assert.equal(entry(table,'donut').status,'incompatible');
});

test('missing line observations stay null and do not become zero during chart fitting',()=>{
  const result=entry(taskTable('period,value\n一月,12\n二月,\n三月,0'),'singleline');assert.equal(result.status,'compatible');assert.deepEqual(result.doc.data.map(row=>row.value),[12,null,0]);
});

test('ambiguous measures stay unmapped and invalid intervals never become ready through missing parameters',()=>{
  const unknown=entry(taskTable('label,a,b\n甲,1,2\n乙,3,4\n丙,5,6'),'bar');assert.equal(unknown.status,'mapping');assert.equal(unknown.mapping[1],-1);assert.equal(unknown.doc,undefined);
  const valid=entry(taskTable('label,estimate,low,high\n甲,2,1,3\n乙,3,2,4\n丙,4,3,5'),'interval');assert.equal(valid.status,'parameters');assert.ok(valid.missingParameters.some(p=>p.key==='intervalLabel'));assert.equal(valid.doc.intervalLabel,undefined);
  const invalid=entry(taskTable('label,estimate,low,high\n甲,2,3,1\n乙,3,2,4\n丙,4,3,5'),'interval');assert.equal(invalid.status,'incompatible');
});

test('analytical settings come from explicit input rather than sample documents',()=>{
  for(const id of ['pca','roc','acf','bullet']){
    const template=catalog.find(t=>t.id===id),example=getExample(id),table={headers:template.fields.map(f=>f[0]),rows:example.data.map(row=>template.fields.map(([key])=>row[key]===null?'':String(row[key])))};
    const built=taskChartDocument(id,table,template.fields.map((_,i)=>i));
    for(const parameter of getDataGuide(id).parameters.filter(p=>p.key!=='axes')){assert.equal(built.doc[parameter.key],undefined,`${id}.${parameter.key}`);assert.ok(built.missingParameters.some(p=>p.key===parameter.key),`${id}.${parameter.key}`);}
    assert.notEqual(entry(table,id).status,'compatible',id);
  }
});

test('bubble charts derive every axis label from the supplied numeric fields',()=>{
  const result=entry(taskTable('label,x,y,size,group\n甲,1,2,3,实验组\n乙,2,3,4,实验组\n丙,3,4,5,实验组'),'scatter');
  assert.equal(result.status,'compatible');assert.deepEqual(result.doc.axes,{x:'x',y:'y',size:'size'});assert.ok(validateDocument(result.doc).valid);
});

test('headerless tables keep their first observation and date profiles reject rolled-over dates',()=>{
  const table=taskTable('甲\t1\n乙\t2\n丙\t3',{header:false,delimiter:'\t'});assert.equal(table.rows.length,3);assert.equal(table.rows[0][0],'甲');assert.equal(entry(table,'bar').doc.data.length,3);
  assert.equal(tableProfile(taskTable('date,value\n2026-02-30,1\n2026-03-01,2')).columns[0].kind,'text');
});

let window,server,openTaskPicker;
const globals=new Map();
before(async()=>{
  window=new Window({url:'http://localhost:4240'});
  for(const [key,value] of Object.entries({window,document:window.document,navigator:window.navigator,XMLSerializer:window.XMLSerializer,ResizeObserver:window.ResizeObserver,requestAnimationFrame:window.requestAnimationFrame.bind(window),cancelAnimationFrame:window.cancelAnimationFrame.bind(window)})){
    globals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});({openTaskPicker}=await server.ssrLoadModule('/src/forma/task-picker.js'));
});
after(async()=>{await server?.close();await window?.happyDOM.close();for(const [key,value] of globals){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}});
beforeEach(()=>{document.body.innerHTML='';});

function identityFixture({declared=false,sameExplicitIds=false}={}){
  const original=getExample('column');original.title='真实测量';original.unit='mg';original.source={type:'user',name:'实验记录'};original.axes={x:'样本',y:'实测重量 / mg'};
  original.data=['甲','乙','丙'].map((label,i)=>({_id:`prior:${i+1}`,label,value:i+1,_extra:{0:sameExplicitIds||declared?`prior:${i+1}`:`chosen:${i+1}`}}));
  original.tableInput={headers:['ID','类别','数值'],fieldColumns:{label:1,value:2},idColumn:declared?0:-1};
  const matrix=[original.tableInput.headers,...original.data.map(row=>[row._extra[0],row.label,String(row.value)])],source={matrix,locations:matrix.map((row,r)=>row.map((_,c)=>`原表!${String.fromCharCode(65+c)}${r+1}`)),issues:[],notes:[],origin:{kind:'xlsx',file:'测量.xlsx',sheet:'原表',range:'A1:C4'}};
  return {original,source};
}
function openFixture(t,fixture){let applied;const picker=openTaskPicker({initialSource:fixture.source,initialHeader:true,initialMetadata:{title:fixture.original.title,unit:fixture.original.unit,source:fixture.original.source.name},original:fixture.original,onUse:(doc,metadata)=>applied={doc,...metadata}});t.after(()=>picker.close());picker.dialog.querySelector('[data-task-use="bar"]').click();const importer=document.querySelector('.data-importer');assert.ok(importer);t.after(()=>{if(importer.isConnected)importer.close();});importer.querySelector('footer [data-di="mapping"]').click();return {importer,result:()=>applied};}
function change(importer,selector,value){const cell=importer.querySelector(selector);assert.ok(cell);cell.value=value;cell.dispatchEvent(new window.Event('change',{bubbles:true}));}
function apply(importer){importer.querySelector('footer [data-di="prepare"]').click();assert.ok(importer.querySelector('.di-result'),importer.textContent);importer.querySelector('footer [data-di="apply"]').click();}

test('a newly selected ID column is honored and does not inherit another dataset identity',t=>{
  const fixture=identityFixture(),{importer,result}=openFixture(t,fixture);change(importer,'#di-id','0');apply(importer);
  assert.equal(result().sameData,false);assert.equal(result().doc.tableInput.idColumn,0);assert.deepEqual(result().doc.data.map(row=>row._id),['chosen:1','chosen:2','chosen:3']);assert.deepEqual(fixture.original.data.map(row=>row._id),['prior:1','prior:2','prior:3']);
});

test('selecting an ID column identical to prior IDs retains both the declaration and physical identity',t=>{
  const {importer,result}=openFixture(t,identityFixture({sameExplicitIds:true}));change(importer,'#di-id','0');apply(importer);assert.equal(result().sameData,true);assert.equal(result().doc.tableInput.idColumn,0);assert.deepEqual(result().doc.data.map(row=>row._id),['prior:1','prior:2','prior:3']);
});

test('default ID generation while reviewing the same declared table restores its original ID declaration',t=>{
  const {importer,result}=openFixture(t,identityFixture({declared:true}));apply(importer);assert.equal(result().sameData,true);assert.equal(result().doc.tableInput.idColumn,0);assert.deepEqual(result().doc.data.map(row=>row._id),['prior:1','prior:2','prior:3']);
});

test('an explicit unit change cannot retain the original data relation or restore stale axis units',t=>{
  const {importer,result}=openFixture(t,identityFixture());const unit=importer.querySelector('[data-di-meta="unit"]');unit.value='kg';unit.dispatchEvent(new window.Event('input',{bubbles:true}));apply(importer);
  assert.equal(result().sameData,false);assert.equal(result().doc.unit,'kg');assert.doesNotMatch(JSON.stringify(result().doc.axes||{}),/mg/);
});

for(const format of ['csv','tsv'])test(`a ${format.toUpperCase()} file remains correctly parsed after a textarea edit and reanalysis`,async t=>{
  const picker=openTaskPicker();t.after(()=>picker.close());const dialog=picker.dialog;
  if(format==='tsv'){const select=dialog.querySelector('[data-task-format]');select.value='csv';select.dispatchEvent(new window.Event('change',{bubbles:true}));}
  const delimiter=format==='csv'?',':'\t',text=[['类别','数值'],['甲','1'],['乙','2'],['丙','3']].map(row=>row.join(delimiter)).join('\n');
  const file=dialog.querySelector('[data-task-file]');Object.defineProperty(file,'files',{value:[{name:`用户数据.${format}`,size:text.length,text:async()=>text}],configurable:true});file.dispatchEvent(new window.Event('change',{bubbles:true}));
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.match(dialog.querySelector('[data-task-profile]').textContent,/3 行.*2 列/);assert.equal(dialog.querySelector('[data-task-format]').value,format);
  const textarea=dialog.querySelector('[data-task-table]');textarea.value=text.replace(`${delimiter}2`,`${delimiter}8`);textarea.dispatchEvent(new window.Event('input',{bubbles:true}));dialog.querySelector('[data-task-analyze]').click();
  assert.match(dialog.querySelector('[data-task-profile]').textContent,/3 行.*2 列/);assert.ok(dialog.querySelector('[data-task-use="bar"]'));assert.match(dialog.querySelector('[data-task-preview="bar"]').textContent,/8/);
});
