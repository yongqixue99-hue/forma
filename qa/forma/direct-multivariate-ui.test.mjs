import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createServer} from 'vite';
let win,server,mountWorkEditor,newWork,getExample,presetWork;const originals=new Map();
before(async()=>{win=new Window({url:'http://localhost:4213/#editor'});for(const[k,v]of Object.entries({window:win,document:win.document,XMLSerializer:win.XMLSerializer,ResizeObserver:win.ResizeObserver,requestAnimationFrame:win.requestAnimationFrame.bind(win),cancelAnimationFrame:win.cancelAnimationFrame.bind(win)})){originals.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});({mountWorkEditor}=await server.ssrLoadModule('/src/forma/work-editor.js'));({newWork,presetWork}=await server.ssrLoadModule('/src/forma/work-model.js'));({getExample}=await server.ssrLoadModule('/src/forma/catalog.js'));});
after(async()=>{await server?.close();await win?.happyDOM.close();for(const[k,v]of originals)if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];});
const wait=()=>new Promise(r=>setTimeout(r,200));
function fixture(t,id='splom'){document.body.innerHTML='<main></main>';const host=document.querySelector('main'),messages=[],items=new Map(),storage={getItem:k=>items.get(k)||null,setItem:(k,v)=>items.set(k,v)},app=mountWorkEditor(host,{initial:presetWork('matrix-to-focus'),storage,toast:m=>messages.push(m)});t.after(()=>app.destroy());return{host,app,messages};}
function input(host,q,value){const el=host.querySelector(q);assert.ok(el,q);el.value=value;el.dispatchEvent(new win.Event('input',{bubbles:true}));}


const current=app=>app.getWork().steps.find(s=>s.id===app.getWork().activeStep);
const pairOf=n=>[n.dataset.variableX,n.dataset.variableY];
const click=n=>n.dispatchEvent(new win.MouseEvent('click',{bubbles:true,cancelable:true}));
const press=(n,key)=>n.dispatchEvent(new win.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
const visiblePoints=host=>[...host.querySelectorAll('[data-sample-id][data-record-ids]')].filter(n=>n.getAttribute('aria-hidden')!=='true');

test('clicking any matrix facet chooses persistent X/Y IDs and focuses with no data edits',t=>{
 const {host,app}=fixture(t),before=current(app),facet=host.querySelectorAll('[data-multivariate-facet]')[1],pair=pairOf(facet);
 assert.equal(host.querySelector('.dw-variable-details').open,false);click(facet);
 assert.equal(current(app).view,'multivariate-focus');assert.deepEqual(current(app).doc.selectedPair,pair);assert.deepEqual(current(app).doc.data,before.doc.data);
 assert.equal(host.querySelectorAll('.dw-inline-editor').length,0);assert.equal(document.activeElement.dataset.variableView,'');
 press(document.activeElement,'Escape');assert.equal(current(app).view,'multivariate-matrix');assert.deepEqual(pairOf(document.activeElement),pair);
});
test('facet arrow navigation and Enter work without dropdowns; return restores the same facet',t=>{
 const {host,app}=fixture(t),facet=host.querySelector('[data-multivariate-facet][tabindex="0"]');facet.focus();press(facet,'ArrowRight');const target=document.activeElement,pair=pairOf(target);assert.notEqual(target,facet);
 press(target,'Enter');assert.deepEqual(current(app).doc.selectedPair,pair);host.querySelector('[data-variable-view]').click();assert.deepEqual(pairOf(document.activeElement),pair);
});
test('sample selection names both measurements, remains stable under hover, and locates nonadjacent rows',async t=>{
 const {host,app}=fixture(t);click(host.querySelectorAll('[data-multivariate-facet]')[1]);const before=current(app),points=visiblePoints(host),point=points.at(-1),ids=JSON.parse(point.dataset.recordIds);click(point);
 assert.equal(host.querySelectorAll('.dw-inline-editor').length,0);assert.equal(host.querySelector('[data-we-tool=data]').getAttribute('aria-selected'),'true');
 const buttons=[...host.querySelectorAll('[data-record-locate]')];assert.deepEqual(buttons.map(b=>b.dataset.recordLocate),ids);assert.match(buttons[0].textContent,/X/);assert.match(buttons[1].textContent,/Y/);assert.match(host.querySelector('[data-record-title]').textContent,/S26.*2 条原始记录/);
 click(buttons[1]);const row=before.doc.data.findIndex(r=>r._id===ids[1]);assert.equal(document.activeElement.dataset.dwCell,`${row}:2`);
 const selected=()=>visiblePoints(host).filter(n=>n.classList.contains('dw-related-mark')).map(n=>n.dataset.sampleId);const pinned=selected();points[1].dispatchEvent(new win.MouseEvent('pointerover',{bubbles:true}));assert.deepEqual(selected(),pinned);
 input(host,`[data-dw-cell="${row}:2"]`,'0.00000123');await wait();assert.ok(host.querySelector('[data-record-measurements]').textContent.includes('0.00000123'));assert.deepEqual(current(app).doc.data.map(r=>r._id),before.doc.data.map(r=>r._id));
 host.querySelector('[data-workspace=undo]').click();await wait();assert.deepEqual(current(app).doc.data,before.doc.data);
 host.querySelector('[data-variable-view]').click();assert.match(host.querySelector('[data-record-title]').textContent,/S26/);assert.equal(host.querySelectorAll('[data-record-locate]').length,2);
});
test('axis swaps keep the selected sample, update measurement order, and undo keeps focus',async t=>{
 const {host,app}=fixture(t);click(host.querySelector('[data-multivariate-facet]'));click(visiblePoints(host)[3]);const before=current(app).doc.selectedPair,ids=[...host.querySelectorAll('[data-record-locate]')].map(b=>b.dataset.recordLocate);
 host.querySelector('.dw-variable-details').open=true;host.querySelector('[data-variable-swap]').click();await wait();assert.deepEqual(current(app).doc.selectedPair,[...before].reverse());assert.deepEqual([...host.querySelectorAll('[data-record-locate]')].map(b=>b.dataset.recordLocate),[...ids].reverse());
 assert.equal(document.activeElement.dataset.variableSwap,'');host.querySelector('[data-workspace=undo]').click();await wait();assert.deepEqual(current(app).doc.selectedPair,before);
});
test('invalid drafts reject graph navigation and preserve the full draft',async t=>{
 const {host,app,messages}=fixture(t),before=current(app).doc.selectedPair;input(host,'[data-dw-cell="0:2"]','invalid');await wait();click(host.querySelector('[data-multivariate-facet]'));
 assert.equal(current(app).view,'multivariate-matrix');assert.deepEqual(current(app).doc.selectedPair,before);assert.equal(current(app).draft.cells[0][2],'invalid');assert.ok(messages.some(m=>m.includes('修正')));
});

test('sample keyboard navigation retains one tab stop and the same focus after a repaint',async t=>{
 const {host,app}=fixture(t);click(host.querySelector('[data-multivariate-facet]'));const point=visiblePoints(host)[3];click(point);press(point,'ArrowRight');const id=document.activeElement.dataset.sampleId;
 assert.equal(visiblePoints(host).filter(n=>n.getAttribute('tabindex')==='0').length,1);
 input(host,'[data-dw-cell="0:2"]','23.5');await wait();assert.equal(document.activeElement.dataset.sampleId,id);assert.equal(visiblePoints(host).filter(n=>n.getAttribute('tabindex')==='0').length,1);
});
