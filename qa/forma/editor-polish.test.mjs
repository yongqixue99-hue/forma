import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createServer} from 'vite';
let win,server,mountWorkEditor,newWork,getExample;const originals=new Map();
before(async()=>{win=new Window({url:'http://localhost:4213/#editor'});for(const[k,v]of Object.entries({window:win,document:win.document,XMLSerializer:win.XMLSerializer,ResizeObserver:win.ResizeObserver,requestAnimationFrame:win.requestAnimationFrame.bind(win),cancelAnimationFrame:win.cancelAnimationFrame.bind(win)})){originals.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});({mountWorkEditor}=await server.ssrLoadModule('/src/forma/work-editor.js'));({newWork}=await server.ssrLoadModule('/src/forma/work-model.js'));({getExample}=await server.ssrLoadModule('/src/forma/catalog.js'));});
after(async()=>{await server?.close();await win?.happyDOM.close();for(const[k,v]of originals)if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];});
const wait=()=>new Promise(r=>setTimeout(r,200));
function fixture(t,id='column'){document.body.innerHTML='<main></main>';const host=document.querySelector('main'),messages=[],items=new Map(),storage={getItem:k=>items.get(k)||null,setItem:(k,v)=>items.set(k,v)},app=mountWorkEditor(host,{initial:newWork([{doc:getExample(id)}]),storage,toast:m=>messages.push(m)});t.after(()=>app.destroy());return{host,app,messages};}
function input(host,q,value){const el=host.querySelector(q);assert.ok(el,q);el.value=value;el.dispatchEvent(new win.Event('input',{bubbles:true}));}

test('canvas zoom and focus are session preferences, never saved chart or export options',async t=>{
 const{host,app}=fixture(t),initial=app.getWork();host.querySelector('[data-workspace=zoom-in]').click();host.querySelector('[data-workspace=zoom-in]').click();assert.equal(host.querySelector('.dw-zoom-value').textContent,'150%');host.querySelector('[data-workspace=canvas-focus]').click();assert.equal(host.querySelector('.we-workspace').classList.contains('we-focus-mode'),true);
 const snapshot=app.captureSession();assert.equal(snapshot.workspace.viewport.zoom,1.5);assert.equal(snapshot.canvasFocus,true);assert.deepEqual(app.getWork().steps,initial.steps);
 host.querySelector('[data-workspace=canvas-focus]').click();host.querySelector('[data-workspace=fit]').click();await app.restoreSession(snapshot);assert.equal(host.querySelector('.dw-zoom-value').textContent,'150%');assert.equal(host.querySelector('.we-workspace').classList.contains('we-focus-mode'),true);assert.deepEqual(app.getWork().steps,initial.steps);
 document.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(host.querySelector('.we-workspace').classList.contains('we-focus-mode'),false);
});
test('chart metadata and table data reveal matching controls and keep the same undo history',async t=>{
 const{host,app,messages}=fixture(t),initial=app.getWork().steps[0].doc.title;
 host.querySelector('[data-edit-meta=title]').click();assert.equal(host.querySelector('[data-we-tool=style]').getAttribute('aria-selected'),'true');assert.equal(host.querySelector('.we-metadata-fields').open,true);assert.equal(host.querySelector('[data-meta-field=title]').classList.contains('is-inspected'),true);
 input(host,'.dw-inline-editor input','自定义标题');host.querySelector('.dw-inline-editor').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(host.querySelector('[data-dw-meta=title]').value,'自定义标题');
 input(host,'[data-dw-meta="axes.y"]','浓度 / mg');await wait();assert.equal(app.getWork().steps[0].doc.axes.y,'浓度 / mg');host.querySelector('[data-we-tool=data]').click();host.querySelector('[data-workspace=undo]').click();host.querySelector('[data-workspace=undo]').click();assert.equal(app.getWork().steps[0].doc.title,initial);assert.deepEqual(messages,[]);
});
test('invalid cell drafts use one expandable issue bar, retain original data and locate exact cells',async t=>{
 const{host,app}=fixture(t),value=app.getWork().steps[0].doc.data[0].value;
 input(host,'[data-dw-cell="0:1"]','missing decimal');input(host,'[data-dw-cell="2:1"]','bad');await wait();
 assert.equal(host.querySelectorAll('.dw-issues').length,1);assert.equal(host.querySelector('#dw-preview-state').hidden,false);assert.match(host.querySelector('#dw-preview-state').textContent,/图表尚未更新.*上次有效数据/);assert.equal(host.querySelector('#dw-chart').inert,true);assert.equal(host.querySelector('[data-we-notice]').textContent,'');assert.equal(host.querySelector('.dw-issues').open,false);assert.equal(app.getWork().steps[0].doc.data[0].value,value);assert.equal(host.querySelector('[data-we=export]').disabled,true);
 host.querySelector('.dw-issues').open=true;host.querySelector('[data-workspace=issue-cell][data-error-index="1"]').click();assert.equal(document.activeElement.dataset.dwCell,'2:1');host.querySelector('[data-workspace=undo]').click();assert.equal(host.querySelector('.dw-issues').open,true);host.querySelector('[data-workspace=undo]').click();assert.equal(host.querySelector('.dw-issues'),null);assert.equal(host.querySelector('#dw-preview-state').hidden,true);assert.equal(host.querySelector('#dw-chart').inert,false);
});
test('collapsing tools after table expansion still exposes the chart and keeps the selected cell',t=>{
 const{host}=fixture(t);const cell=host.querySelector('[data-dw-cell="3:1"]');cell.focus();host.querySelector('[data-workspace=table-focus]').click();assert.equal(host.querySelector('.dw-layout').dataset.tableFocus,'true');host.querySelector('[data-we=collapse]').click();assert.equal(host.querySelector('.dw-layout').dataset.tableFocus,'false');assert.equal(host.querySelector('[data-we=collapse]').getAttribute('aria-expanded'),'false');host.querySelector('[data-we=collapse]').click();assert.equal(host.querySelector('#dw-cell-ref').textContent,'B4');
});

test('recommended view picker creates a related step from original data and explains the new encoding',t=>{
 const{host,app}=fixture(t,'heatmap'),before=app.getWork().steps[0];host.querySelector('[data-we=add]').click();const target=host.querySelector('[data-we-recommended-view="matrix-bubbles"]');assert.ok(target);assert.ok(host.querySelector('.we-recommendation-note').textContent.length>20);assert.equal(host.querySelectorAll('[data-we-recommended-view="matrix-heatmap"]').length,0);target.click();const steps=app.getWork().steps;assert.equal(steps.length,2);assert.equal(steps[1].view,'matrix-bubbles');assert.deepEqual(steps[1].doc.data,before.doc.data);assert.equal(steps[1].dataGroup,before.dataGroup);
});
test('large invalid pastes keep every error but page the visible diagnostics and locate later rows',t=>{
 const{host}=fixture(t);host.querySelector('[data-workspace=add]').click();host.querySelector('[data-workspace=add]').click();for(let i=0;i<8;i++)input(host,`[data-dw-cell="${i}:1"]`,'bad');const count=host.querySelectorAll('[aria-invalid=true][data-dw-cell]').length;assert.ok(count>8);host.querySelector('.dw-issues').open=true;assert.equal(host.querySelectorAll('[data-workspace=issue-cell]').length,8);host.querySelector('[data-workspace=next-issues]').click();assert.match(host.querySelector('.dw-issue-pages').textContent,/9–/);host.querySelector('[data-workspace=issue-cell]').click();assert.equal(document.activeElement.dataset.dwCell,'8:0');assert.equal(host.querySelectorAll('[aria-invalid=true][data-dw-cell]').length,count);
});
