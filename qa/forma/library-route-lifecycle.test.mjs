import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {IDBFactory} from 'fake-indexeddb';
import {createServer} from 'vite';

test('a queued gallery frame cannot recreate previews while the saved route awaits its lazy module',async t=>{
  const win=new Window({url:'http://localhost:4205/#library'}),originals=new Map(),frames=new Map(),observers=[];
  win.document.body.innerHTML='<div id="app"></div>';
  let frameId=0,collectionLoading=false,releaseCollection;
  const collectionReady=new Promise(resolve=>{releaseCollection=resolve;});
  class Observer{
    constructor(){this.targets=new Set();this.disconnected=false;observers.push(this);}
    observe(target){this.targets.add(target);}
    disconnect(){this.disconnected=true;this.targets.clear();}
  }
  const requestFrame=callback=>{const id=++frameId;frames.set(id,callback);return id;};
  const cancelFrame=id=>frames.delete(id);
  const globals={window:win,document:win.document,location:win.location,history:win.history,localStorage:win.localStorage,navigator:win.navigator,indexedDB:new IDBFactory(),BroadcastChannel:undefined,XMLSerializer:win.XMLSerializer,ResizeObserver:win.ResizeObserver,MutationObserver:win.MutationObserver,IntersectionObserver:Observer,matchMedia:win.matchMedia.bind(win),getComputedStyle:win.getComputedStyle.bind(win),requestAnimationFrame:requestFrame,cancelAnimationFrame:cancelFrame,
    __formaRouteCollectionGate:async()=>{collectionLoading=true;await collectionReady;}};
  for(const [key,value] of Object.entries(globals)){originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});}
  win.IntersectionObserver=Observer;win.requestAnimationFrame=requestFrame;win.cancelAnimationFrame=cancelFrame;
  // Delay only the real lazy module's evaluation; the application, routing,
  // repository, gallery controller and DOM handlers all run unmodified.
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'hold-saved-route-for-lifecycle-test',enforce:'pre',transform(source,id){if(id.split('?')[0].endsWith('/src/forma/work-collection.js'))return `await globalThis.__formaRouteCollectionGate();\n${source}`;}}]});
  t.after(async()=>{releaseCollection();frames.clear();await server.close();await win.happyDOM.close();for(const [key,value] of originals){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}});
  const until=async(condition,message)=>{for(let i=0;i<200;i++){if(condition())return;await new Promise(resolve=>setTimeout(resolve,10));}assert.fail(message);};
  const navigate=hash=>{win.history.replaceState(null,'',hash);win.dispatchEvent(new win.HashChangeEvent('hashchange'));};
  const takeFrames=()=>{const pending=[...frames.values()];frames.clear();return pending;};
  const runFrames=pending=>pending.forEach(callback=>callback(performance.now()));

  await server.ssrLoadModule('/src/forma/main.js');
  await until(()=>win.document.querySelector('#chart-grid [data-preview]'),'The real gallery did not mount.');
  const oldGrid=win.document.querySelector('#chart-grid'),oldFrames=takeFrames();
  assert.ok(oldFrames.length>0,'The gallery must have a pending animation frame.');
  assert.equal(observers.length,0,'Previews should still be waiting for that frame.');
  navigate('#saved');
  await until(()=>collectionLoading,'The real saved route did not begin its lazy import.');
  assert.equal(oldGrid.isConnected,true,'The race requires the old gallery to remain connected during loading.');
  assert.equal(win.document.querySelector('.collection-page'),null);
  runFrames(oldFrames);
  assert.equal(observers.length,0,'A stale gallery frame must not allocate another preview controller or observer.');

  releaseCollection();
  await until(()=>win.document.querySelector('.collection-page'),'The saved collection did not mount after loading.');
  assert.equal(oldGrid.isConnected,false);
  assert.equal(observers.length,0,'The empty collection must not retain an observer for detached gallery cards.');

  // Invalidating stale work must still permit fresh previews on a later visit.
  navigate('#library');
  await until(()=>win.document.querySelector('#chart-grid [data-preview]'),'Returning to the gallery did not mount it.');
  runFrames(takeFrames());
  assert.equal(observers.length,1);
  assert.equal(observers[0].targets.size,win.document.querySelectorAll('#chart-grid [data-preview]').length);
  assert.ok(observers[0].targets.size>0);
  navigate('#saved');
  await until(()=>win.document.querySelector('.collection-page'),'The cached saved route did not mount.');
  assert.equal(observers[0].disconnected,true);
  assert.equal(observers[0].targets.size,0);
});
