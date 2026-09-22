import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {mountMotion} from '../../src/forma/motion-studio.js';
import {morphExample} from '../../src/forma/morph.js';

function fixture(t,options={}){
  const win=new Window({url:'http://localhost/'}),host=win.document.createElement('main');
  win.document.body.append(host);
  Object.defineProperty(win.document,'hidden',{value:false,writable:true,configurable:true});
  const timers=new Map(),frames=new Map(),observers={intersection:[],resize:[],mutation:[]},mediaListeners=new Set();let nextId=0;
  const media={matches:false,addEventListener(type,callback){mediaListeners.add(callback);},removeEventListener(type,callback){mediaListeners.delete(callback);}};
  const Observer=kind=>class{
    constructor(callback){this.callback=callback;this.targets=[];this.disconnected=false;observers[kind].push(this);}
    observe(target){this.targets.push(target);}
    disconnect(){this.disconnected=true;this.targets=[];}
    emit(entries=[]){this.callback(entries);}
  };
  win.requestAnimationFrame=callback=>{frames.set(++nextId,callback);return nextId;};win.cancelAnimationFrame=id=>frames.delete(id);win.matchMedia=()=>media;
  const globals={window:win,document:win.document,matchMedia:()=>media,localStorage:win.localStorage,IntersectionObserver:Observer('intersection'),ResizeObserver:Observer('resize'),MutationObserver:Observer('mutation'),setTimeout:(callback,delay)=>{timers.set(++nextId,{callback,delay});return nextId;},clearTimeout:id=>timers.delete(id)};
  const previous=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const[key,value]of Object.entries(globals))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
  let controller;
  t.after(()=>{
    controller?.destroy();
    for(const[key,descriptor]of previous)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
    win.close();
  });
  controller=mountMotion(host,{standalone:true,persist:false,...options});
  return {win,host,controller,timers,frames,observers,mediaListeners,$:selector=>host.querySelector(selector),
    visible(){observers.intersection[0].emit([{isIntersecting:true}]);},
    advance(time){const callbacks=[...frames.values()];frames.clear();for(const callback of callbacks)callback(time);},
    setDraft(data,source='我的内容台账'){host.querySelector('#morph-data-editor').value=JSON.stringify(data);host.querySelector('[data-morph-field=source]').value=source;},
    apply(){host.querySelector('[data-morph-apply]').click();}
  };
}

function assertSwatchesMatchShapes(f){
  for(const swatch of f.host.querySelectorAll('[data-record-swatch]')){
    const path=[...f.host.querySelectorAll('path[data-key]')].find(node=>node.dataset.key===swatch.dataset.recordSwatch);
    assert.ok(path);
    const expected=f.win.document.createElement('i');expected.style.background=path.getAttribute('stroke');assert.equal(swatch.style.background,expected.style.background);
  }
}

test('changing palette preserves an unapplied JSON, source, title and unit draft',t=>{
  const f=fixture(t),json='[ { "label": "未应用草稿", "value": 12 } ]';
  f.$('#morph-data-editor').value=json;f.$('[data-morph-field=source]').value='尚未提交的来源';f.$('[data-morph-field=title]').value='尚未提交的标题';f.$('[data-morph-field=unit]').value='万元';
  const shape=f.$('path[data-key="设计"]'),oldColor=shape.getAttribute('stroke');f.controller.setPalette('cobalt',true);
  assert.equal(f.$('#morph-data-editor').value,json);assert.equal(f.$('[data-morph-field=source]').value,'尚未提交的来源');assert.equal(f.$('[data-morph-field=title]').value,'尚未提交的标题');assert.equal(f.$('[data-morph-field=unit]').value,'万元');
  assert.equal(f.$('[data-motion-title]').textContent,morphExample.title);assert.equal(f.$('path[data-key="设计"]'),shape);assert.notEqual(shape.getAttribute('stroke'),oldColor);assertSwatchesMatchShapes(f);
});

test('invalid JSON or invalid values leave the rendered data and provenance intact',t=>{
  const f=fixture(t),shape=f.$('path[data-key="设计"]'),geometry=shape.getAttribute('d'),source=f.$('[data-motion-source]').textContent;
  f.$('#morph-data-editor').value='{';f.apply();assert.equal(f.$('[data-morph-feedback]').dataset.invalid,'true');assert.match(f.$('[data-morph-feedback]').textContent,/JSON/);
  const data=structuredClone(morphExample.data);data[0].value=-10;f.setDraft(data);f.apply();assert.equal(f.$('[data-morph-feedback]').dataset.invalid,'true');
  assert.equal(f.$('path[data-key="设计"]'),shape);assert.equal(shape.getAttribute('d'),geometry);assert.equal(f.$('[data-motion-source]').textContent,source);assert.equal(f.$('[data-motion-total]').textContent,'100');assert.equal(f.frames.size,0);
});

test('replacing demonstration data requires provenance and then updates the chart and saved document together',t=>{
  const f=fixture(t,{persist:true}),data=structuredClone(morphExample.data);data[0].value=35;
  f.setDraft(data,morphExample.source.name);f.apply();assert.equal(f.$('[data-morph-feedback]').dataset.invalid,'true');assert.match(f.$('[data-morph-feedback]').textContent,/来源/);assert.equal(f.$('[data-motion-total]').textContent,'100');
  f.$('[data-morph-field=source]').value='九月内容台账';f.$('[data-morph-field=title]').value='九月的内容分布';f.apply();
  assert.equal(f.$('[data-morph-feedback]').dataset.invalid,'false');assert.equal(f.$('[data-motion-total]').textContent,'107');assert.equal(f.$('[data-motion-title]').textContent,'九月的内容分布');assert.equal(f.$('[data-motion-source]').textContent,'数据来源 · 九月内容台账');
  const saved=JSON.parse(f.win.localStorage.getItem('forma.morph.v1'));assert.equal(saved.source.type,'user');assert.equal(saved.source.name,'九月内容台账');assert.deepEqual(saved.data,data);
  f.advance(0);f.advance(1500);assert.equal(f.$('[data-motion-status]').textContent,'完整数据');assert.match(f.$('path[data-key="设计"]').parentElement.querySelector('title').textContent,/35/);assertSwatchesMatchShapes(f);
});

test('reordering records keeps category colors synchronized with the external legend',t=>{
  const f=fixture(t),shape=f.$('path[data-key="设计"]'),color=shape.getAttribute('stroke'),data=structuredClone(morphExample.data).reverse();
  f.setDraft(data);f.apply();assert.equal(f.$('path[data-key="设计"]'),shape);assert.equal(shape.getAttribute('stroke'),color);assertSwatchesMatchShapes(f);
  f.controller.setPalette('vermilion');assertSwatchesMatchShapes(f);f.advance(0);f.advance(1500);assertSwatchesMatchShapes(f);
});

test('updating data cancels a pending automatic advance until the new geometry settles',t=>{
  const f=fixture(t);f.visible();assert.equal(f.timers.size,1);assert.equal([...f.timers.values()][0].delay,3900);
  const data=structuredClone(morphExample.data);data[0].value=35;f.setDraft(data);f.apply();assert.equal(f.timers.size,0);assert.equal(f.$('[data-motion-status]').textContent,'形态转换中');
  f.advance(0);f.advance(1499);assert.equal(f.timers.size,0);f.advance(1500);assert.equal(f.timers.size,1);assert.equal(f.$('[data-motion-status]').textContent,'完整数据');
});

test('destroy disconnects observers and motion listeners and cancels animation and timer callbacks',t=>{
  const f=fixture(t);f.visible();const staleTimer=[...f.timers.values()][0].callback;
  f.$('[data-morph-view=bars]').click();f.advance(0);const staleFrame=[...f.frames.values()][0];
  f.controller.destroy();assert.equal(f.host.childElementCount,0);assert.equal(f.timers.size,0);assert.equal(f.frames.size,0);assert.equal(f.mediaListeners.size,0);
  for(const list of Object.values(f.observers))for(const observer of list)assert.equal(observer.disconnected,true);
  assert.doesNotThrow(()=>{staleTimer();staleFrame(1500);f.observers.intersection[0].emit([{isIntersecting:true}]);f.observers.resize[0].emit();f.observers.mutation[0].emit();f.win.document.dispatchEvent(new f.win.Event('visibilitychange'));});
  assert.equal(f.timers.size,0);assert.equal(f.frames.size,0);assert.equal(f.host.childElementCount,0);
});

test('the embedded player has functioning view controls and no link to a missing app route',t=>{
  const f=fixture(t,{standalone:false,player:true});assert.equal(f.$('a[href="#motion"]'),null);assert.equal(f.$('[data-morph-export]'),null);assert.equal(f.$('#morph-data-editor'),null);assert.equal(f.host.querySelectorAll('[data-morph-view]').length,8);
  f.$('[data-morph-view=bubbles]').click();f.advance(0);f.advance(1500);assert.equal(f.$('[data-morph-view=bubbles]').getAttribute('aria-pressed'),'true');assert.equal(f.$('svg[data-morph-chart]').getAttribute('data-view'),'bubbles');assert.equal(f.$('[data-motion-status]').textContent,'完整数据');
});

test('motion mode selection affects transitions while retaining the same records and controls',t=>{
  const f=fixture(t,{effect:'cascade'});assert.equal(f.$('[data-morph-effect=cascade]').getAttribute('aria-pressed'),'true');
  f.$('[data-morph-effect=arc]').click();assert.equal(f.$('[data-morph-effect=arc]').getAttribute('aria-pressed'),'true');assert.equal(f.$('[data-morph-effect=cascade]').getAttribute('aria-pressed'),'false');
  f.$('[data-morph-view=rose]').click();f.advance(0);f.advance(600);assert.equal(f.$('[data-motion-status]').textContent,'形态转换中');f.advance(1500);assert.equal(f.$('svg[data-morph-chart]').dataset.view,'rose');assert.equal(f.$('[data-motion-total]').textContent,'100');assertSwatchesMatchShapes(f);
});

test('exported-player timing options select and respect the saved transition speed',t=>{
  const f=fixture(t,{transitionDuration:2400,effect:'arc'});assert.equal(f.$('.motion-speed select').value,'2400');f.$('[data-morph-view=columns]').click();f.advance(0);f.advance(1600);assert.equal(f.$('[data-motion-status]').textContent,'形态转换中');f.advance(2400);assert.equal(f.$('[data-motion-status]').textContent,'完整数据');
});


test('motion spreadsheet shares the JSON draft and validates before changing the chart',t=>{
  const f=fixture(t),input=f.$('[data-morph-cell="0:value"]');input.value='35';input.dispatchEvent(new f.win.Event('input',{bubbles:true}));
  assert.equal(JSON.parse(f.$('#morph-data-editor').value)[0].value,35);assert.equal(f.$('[data-motion-total]').textContent,'100');
  f.$('[data-morph-field=source]').value='测试台账';f.apply();assert.equal(f.$('[data-motion-total]').textContent,'107');
  f.$('[data-morph-add]').click();const rows=JSON.parse(f.$('#morph-data-editor').value);assert.equal(rows.at(-1).label,'');f.apply();assert.equal(f.$('[data-morph-feedback]').dataset.invalid,'true');assert.equal(f.$('[data-motion-total]').textContent,'107');
  f.$(`[data-morph-remove="${rows.length-1}"]`).click();f.apply();assert.equal(f.$('[data-morph-feedback]').dataset.invalid,'false');assert.equal(f.$('[data-motion-total]').textContent,'107');
});

test('incomplete advanced JSON cannot be silently overwritten by stale table controls',t=>{
  const f=fixture(t),json=f.$('#morph-data-editor');
  json.value='[{"label":';json.dispatchEvent(new f.win.Event('input',{bubbles:true}));
  assert.equal(f.$('[data-morph-add]').disabled,true);assert.equal(f.$('[data-morph-cell="0:label"]').disabled,true);
  f.$('[data-morph-add]').click();assert.equal(json.value,'[{"label":');
  json.value=JSON.stringify(morphExample.data);json.dispatchEvent(new f.win.Event('input',{bubbles:true}));
  assert.equal(f.$('[data-morph-add]').disabled,false);assert.equal(f.$('[data-morph-cell="0:label"]').disabled,false);
});
