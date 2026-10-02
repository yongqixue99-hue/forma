import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createServer} from 'vite';

let win,server,mountDataWorkspace,getExample;
const originals=new Map();
before(async()=>{
  win=new Window({url:'http://localhost:4233/#editor'});
  for(const [key,value]of Object.entries({window:win,document:win.document,XMLSerializer:win.XMLSerializer,ResizeObserver:win.ResizeObserver,requestAnimationFrame:win.requestAnimationFrame.bind(win),cancelAnimationFrame:win.cancelAnimationFrame.bind(win)})){
    originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  ({mountDataWorkspace}=await server.ssrLoadModule('/src/forma/data-workspace.js'));
  ({getExample}=await server.ssrLoadModule('/src/forma/catalog.js'));
});
after(async()=>{
  await server?.close();await win?.happyDOM.close();
  for(const [key,value]of originals)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];
});
const wait=()=>new Promise(r=>setTimeout(r,180));
function fixture(t){
  const host=document.createElement('main');document.body.append(host);const doc=getExample('column');doc.source={type:'user',name:'实际实验记录'};doc.data=[{_id:'lab:a',label:'真实甲',value:11},{_id:'lab:b',label:'真实乙',value:22},{_id:'lab:c',label:'真实丙',value:33}];
  const records=[{key:'lab',doc,options:{palette:'ink'}}],changes=[],messages=[],app=mountDataWorkspace(host,{records,activeKey:'lab',onChange:r=>changes.push(structuredClone(r)),onActive(){},onRemove(){},onSave(){},toast:m=>messages.push(m)});
  t.after(()=>{app.destroy();host.remove();});return {host,records,changes,messages,app};
}
function input(host,query,value){const el=host.querySelector(query);assert.ok(el,query);el.value=value;el.dispatchEvent(new win.Event('input',{bubbles:true}));}
function paste(target,text){const event=new win.Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(event,'clipboardData',{value:{getData:()=>text,files:[]}});target.dispatchEvent(event);return event;}
function mark(host,row=0){const el=host.querySelector(`#dw-chart [data-edit-row="${row}"][data-edit-field=value]`);assert.ok(el,`Missing mark for row ${row}`);return el;}
function blockedMarkClick(host,row=0){mark(host,row).dispatchEvent(new win.MouseEvent('click',{bubbles:true}));assert.equal(host.querySelector('.dw-inline-editor'),null);}

test('invalid draft explicitly labels the retained chart and disables chart-side editing',async t=>{
  const {host,records,app}=fixture(t),before=structuredClone(records[0].doc.data);input(host,'[data-dw-cell="1:1"]','unfinished');await wait();
  const banner=host.querySelector('#dw-preview-state'),chart=host.querySelector('#dw-chart');assert.equal(banner.hidden,false);assert.match(banner.textContent,/图表尚未更新.*上次有效数据.*自动更新/);assert.equal(chart.inert,true);assert.equal(chart.classList.contains('dw-stale-preview'),true);assert.equal(host.querySelectorAll('[data-mark=basic-column]').length,3);assert.deepEqual(records[0].doc.data,before);assert.equal(app.getReport().dataValid,false);assert.equal(host.querySelector('[data-workspace=export]').disabled,true);
  blockedMarkClick(host,1);assert.equal(records[0].draft.cells[1][1],'unfinished');banner.querySelector('[data-workspace=show-issues]').click();assert.equal(host.querySelector('.dw-issues').open,true);assert.equal(host.querySelector('[data-dw-cell="1:1"]').disabled,false);
});
test('stale marks cannot target shifted table rows after deletion, and undo restores normal editing',async t=>{
  const {host,records}=fixture(t);input(host,'[data-dw-cell="2:1"]','unfinished');host.querySelector('[data-workspace=delete][data-row="0"]').click();await wait();
  const draft=structuredClone(records[0].draft);assert.deepEqual(draft.cells,[['真实乙','22'],['真实丙','unfinished']]);assert.equal(records[0].doc.data[0].label,'真实甲');assert.equal(host.querySelector('#dw-chart').inert,true);blockedMarkClick(host,0);assert.deepEqual(records[0].draft,draft);
  host.querySelector('[data-workspace=undo]').click();assert.equal(host.querySelector('[data-dw-cell="0:0"]').value,'真实甲');assert.equal(host.querySelector('#dw-chart').inert,true);host.querySelector('[data-workspace=undo]').click();await wait();assert.equal(host.querySelector('#dw-preview-state').hidden,true);assert.equal(host.querySelector('#dw-chart').inert,false);assert.equal(host.querySelector('#dw-chart').classList.contains('dw-stale-preview'),false);
  mark(host,0).dispatchEvent(new win.MouseEvent('click',{bubbles:true}));assert.equal(host.querySelector('.dw-inline-editor input').value,'11');
});
test('correcting a shifted draft replaces the stale geometry and allows editing the actual retained row',async t=>{
  const {host,records}=fixture(t);input(host,'[data-dw-cell="2:1"]','unfinished');host.querySelector('[data-workspace=delete][data-row="0"]').click();await wait();blockedMarkClick(host,0);
  input(host,'[data-dw-cell="1:1"]','33');await wait();assert.equal(host.querySelector('#dw-preview-state').hidden,true);assert.equal(host.querySelector('#dw-chart').inert,false);assert.deepEqual(records[0].doc.data.map(r=>[r._id,r.label,r.value]),[['lab:b','真实乙',22],['lab:c','真实丙',33]]);assert.equal(host.querySelectorAll('[data-mark=basic-column]').length,2);
  mark(host,0).dispatchEvent(new win.MouseEvent('click',{bubbles:true}));assert.equal(host.querySelector('.dw-inline-editor input').value,'22');input(host,'.dw-inline-editor input','55');host.querySelector('.dw-inline-editor').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(records[0].doc.data[0]._id,'lab:b');assert.equal(records[0].doc.data[0].value,55);assert.equal(records[0].doc.data[1].value,33);
});
test('direct paste reports an overlay, retains untouched rows, and is one reversible edit',async t=>{
  const {host,records,messages}=fixture(t),before=structuredClone(records[0].doc.data),cell=host.querySelector('[data-dw-cell="0:0"]');cell.focus();const event=paste(cell,'新甲\t101\n新乙\t202');await wait();
  assert.equal(event.defaultPrevented,true);assert.match(messages.at(-1),/已覆盖 2 行 × 2 列.*其余行保留.*可撤销/);assert.equal(records[0].doc.data.length,3);assert.deepEqual(records[0].doc.data[2],before[2]);assert.deepEqual(records[0].doc.data.slice(0,2).map(r=>[r.label,r.value]),[['新甲',101],['新乙',202]]);assert.equal(host.querySelector('#dw-cell-ref').textContent,'A1:B2');host.querySelector('[data-workspace=undo]').click();assert.deepEqual(records[0].doc.data,before);
});
