import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import english from '../../src/forma/locales/en.json' with {type:'json'};

// SSR loads the real module (including its CSS import) without starting another
// browser or server port. Clipboard rendering itself is tested in library-actions.
let window, server, mountLibraryTools, getExample, clipboardWrites;
const STORE = 'forma.selection.v1';
const originalGlobals = new Map();

before(async () => {
  window = new Window({ url: 'http://localhost:4189' });
  const globals = {
    window, document: window.document, XMLSerializer: window.XMLSerializer,
    MutationObserver: window.MutationObserver, localStorage: window.localStorage,
    navigator: window.navigator, innerWidth: 1000, innerHeight: 800, __FORMA_MESSAGES__:english
  };
  for (const [name, value] of Object.entries(globals)) {
    originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  }
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  ({ mountLibraryTools } = await server.ssrLoadModule('/src/forma/library-tools.js'));
  ({ getExample } = await server.ssrLoadModule('/src/forma/catalog.js'));
});

after(async () => {
  await server?.close();
  await window?.happyDOM.close();
  for (const [name, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
});

beforeEach(() => {
  document.body.innerHTML = '<dialog id="studio"></dialog><main id="cards"></main><button id="outside">页面其他操作</button>';
  document.body.className = '';
  window.localStorage.clear();
  globalThis.localStorage = window.localStorage;
  clipboardWrites = [];
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { async writeText(text) { clipboardWrites.push(text); } }
  });
});

function mount(t, ids = ['mosaic', 'tide'], initialOptions = { palette: 'mono' }) {
  const docs = ids.map(getExample), messages = [], opened = [];
  const controller = mountLibraryTools({
    getContext: element => ({
      doc: docs.find(doc => doc.template === element.dataset.id),
      options: initialOptions, savedId: element.dataset.saved
    }),
    onOpen: item => opened.push(item),
    toast: message => messages.push(message)
  });
  document.querySelector('#cards').innerHTML = docs.map(doc => controller.buttonsHTML(doc)).join('');
  t.after(() => controller.destroy());
  return { controller, docs, messages, opened };
}

const selection = () => JSON.parse(localStorage.getItem(STORE) || '[]');
const select = id => document.querySelector(`#cards [data-action="chart-select"][data-id="${id}"]`).click();
const review = () => document.querySelector('.ft-tray [data-ft-action="review"]').click();
const press = key => document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

test('selections survive remount with independent saved identities and unchanged provenance', t => {
  const { controller, docs } = mount(t, ['mosaic']);
  docs[0].source = { name: '用户季度台账', type: 'user', url: 'https://example.org/data?q=1&b=2' };
  document.querySelector('#cards').insertAdjacentHTML('beforeend', controller.buttonsHTML(docs[0], 'my-version'));
  select('mosaic');
  document.querySelector('#cards [data-action="chart-select"][data-saved="my-version"]').click();
  assert.deepEqual(selection().map(item => item.key), ['template:mosaic', 'saved:my-version']);
  assert.deepEqual(selection().map(item => item.doc.source), [docs[0].source, docs[0].source]);
  controller.destroy();
  const restored = mount(t, ['mosaic']);
  restored.controller.sync();
  assert.equal(document.querySelector('#cards [data-action="chart-select"]').getAttribute('aria-pressed'), 'true');
  assert.equal(document.querySelector('.ft-tray [data-ft-count]').textContent, '2');
  assert.equal(selection()[1].doc.source.name, '用户季度台账');
});

test('selected documents update only after valid edits and retain their initial selection time', t => {
  const { controller, docs } = mount(t, ['mosaic']);
  select('mosaic');
  const selectedAt = selection()[0].selectedAt;
  const edited = structuredClone(docs[0]);
  edited.title = '编辑后的有效标题';
  edited.source = { name: '已复核的投入记录', type: 'user' };
  edited.data[0].value = 41.5;
  controller.refreshCurrent(edited, { palette: 'cobalt', dark: true, ratio: 'portrait', duration: 12 });
  const validSnapshot = selection()[0];
  assert.deepEqual(validSnapshot.doc, edited);
  assert.equal(validSnapshot.selectedAt, selectedAt);
  assert.deepEqual(validSnapshot.options, { palette: 'cobalt', dark: true, ratio: 'portrait', duration: 12 });
  controller.refreshCurrent({ ...edited, title: '' }, { palette: 'ink' });
  controller.refreshCurrent({ ...edited, source: null }, { palette: 'ink' });
  assert.deepEqual(selection()[0], validSnapshot);
  edited.data[0].value = 900;
  assert.equal(selection()[0].doc.data[0].value, 41.5);
});

test('opening from the collection returns the selected data and style snapshot rather than a fresh example', t => {
  const { controller, docs, opened } = mount(t, ['mosaic']);
  select('mosaic');
  const edited = structuredClone(docs[0]);
  edited.title = '需要再次打开的自定义版本';
  edited.data[0].value = 37.75;
  edited.source = { name: '自定义原始数据', type: 'user' };
  controller.refreshCurrent(edited, { palette: 'cobalt', dark: true });
  docs[0].title = '底层示例已经改变';
  review();
  document.querySelector('.ft-selection-dialog [data-ft-action="open-item"]').click();
  assert.equal(document.querySelector('.ft-selection-dialog').open, false);
  assert.equal(opened.length, 1);
  assert.deepEqual(opened[0].doc, edited);
  assert.equal(opened[0].options.palette, 'cobalt');
  assert.equal(opened[0].options.dark, true);
  opened[0].doc.title = '调用方修改返回对象';
  assert.equal(selection()[0].doc.title, edited.title);
});

test('copy menu keyboard navigation closes predictably and restores its trigger focus', t => {
  mount(t, ['mosaic']);
  const trigger = document.querySelector('[data-action="chart-copy-options"]');
  trigger.click();
  assert.equal(document.querySelectorAll('.ft-copy-menu [role="menuitem"]').length, 4);
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(document.activeElement.dataset.format, 'recipe');
  press('End'); assert.equal(document.activeElement.dataset.format, 'svg');
  press('ArrowDown'); assert.equal(document.activeElement.dataset.format, 'recipe');
  press('ArrowUp'); assert.equal(document.activeElement.dataset.format, 'svg');
  press('Home'); assert.equal(document.activeElement.dataset.format, 'recipe');
  press('Escape');
  assert.equal(document.querySelector('.ft-copy-menu'), null);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(document.activeElement, trigger);
  trigger.click(); press('Tab');
  assert.equal(document.querySelector('.ft-copy-menu'), null);
  trigger.click(); document.querySelector('#outside').click();
  assert.equal(document.querySelector('.ft-copy-menu'), null);
});

test('collection stays modeless inside the studio without hiding or disabling the chart', t => {
  const { controller, docs } = mount(t, ['mosaic']);
  select('mosaic');
  const studio = document.querySelector('#studio');
  studio.innerHTML = controller.buttonsHTML(docs[0], undefined, 'studio');
  studio.showModal(); controller.sync();
  studio.querySelector('[data-action="chart-copy-options"]').click();
  assert.equal(document.querySelector('.ft-copy-menu').parentElement, studio);
  press('Escape');
  document.querySelector('.ft-studio-review').click();
  assert.equal(studio.open, true);
  assert.equal(document.querySelector('.ft-selection-dialog').open, true);
  assert.equal(document.querySelector('.ft-selection-dialog').parentElement,studio);
  assert.equal(document.querySelectorAll('dialog[open]').length, 2);
  const changed = { ...structuredClone(docs[0]), title: '工作台中保持的修改' };
  controller.refreshCurrent(changed, { palette: 'vermilion', ratio: 'square' });
  document.querySelector('.ft-selection-dialog [data-ft-action="close-selection"]').click();
  assert.equal(studio.open, true);
  assert.equal(document.querySelector('.ft-selection-dialog').open, false);
  assert.equal(selection()[0].doc.title, changed.title);
  assert.equal(selection()[0].options.ratio, 'square');
  assert.equal(document.querySelectorAll('dialog[open]').length, 1);
});

test('compact selection shows real thumbnails, omits reordering and copies the selected chart manual', async t => {
  const { docs } = mount(t);
  select('mosaic'); select('tide'); review();
  assert.equal(document.querySelector('[data-ft-action="move-down"]'),null);
  assert.equal(document.querySelector('[data-ft-action="move-up"]'),null);
  assert.equal(document.querySelectorAll('[data-ft-thumbnail] svg').length,2);
  assert.equal(document.querySelector('.ft-item-meta,.ft-item-source'),null);
  document.querySelector('[data-ft-action="copy-item"][data-key="template:tide"]').click();
  await Promise.resolve();
  assert.ok(clipboardWrites[0].includes('模板 ID：tide'));
  clipboardWrites.length=0;
  assert.deepEqual(selection().map(item => item.key), ['template:mosaic', 'template:tide']);
  document.querySelector('.ft-selection-dialog [data-ft-action="copy-all"]').click();
  await Promise.resolve();
  assert.equal(clipboardWrites.length, 1);
  assert.ok(clipboardWrites[0].indexOf('模板 ID：mosaic') < clipboardWrites[0].indexOf('模板 ID：tide'));
  assert.ok(clipboardWrites[0].includes('【1 / 2】'));
  assert.ok(clipboardWrites[0].includes('【2 / 2】'));
  assert.deepEqual(selection().map(item => item.doc), [docs[0], docs[1]]);
});

test('clearing supports one-click undo, including during a storage failure', t => {
  mount(t);
  select('mosaic'); select('tide');
  const original = selection();
  review();document.querySelector('.ft-selection-dialog [data-ft-action="clear"]').click();
  assert.deepEqual(selection(), []);
  assert.equal(document.querySelector('.ft-tray').hidden, true);
  document.querySelector('.ft-feedback [data-ft-action="undo-clear"]').click();
  assert.deepEqual(selection(), original);
  assert.equal(document.querySelector('.ft-tray').hidden, false);
  globalThis.localStorage = { getItem: key => window.localStorage.getItem(key), setItem() { throw new Error('Quota exceeded'); } };
  select('mosaic');
  assert.ok(document.querySelector('.ft-feedback').textContent.includes('当前浏览器无法保存清单'));
  assert.equal(document.querySelector('.ft-tray [data-ft-count]').textContent, '1');
  assert.equal(document.querySelectorAll('.ft-selection-item').length, 1);
  assert.equal(document.querySelector('.ft-selection-item h3').textContent.includes('折线图'), true);
});

test('destroy removes portals and event handlers without erasing a saved selection', async t => {
  const { controller } = mount(t, ['mosaic']);
  select('mosaic');
  const saved = selection();
  const copyButton = document.querySelector('[data-action="chart-copy-options"]');
  copyButton.click();
  controller.destroy();
  assert.equal(document.querySelector('.ft-copy-menu'), null);
  assert.equal(document.querySelector('.ft-selection-dialog'), null);
  assert.equal(document.querySelector('.ft-tray'), null);
  assert.equal(document.querySelector('.ft-feedback'), null);
  copyButton.click(); select('mosaic');
  document.querySelector('#studio').showModal();
  await Promise.resolve();
  assert.equal(document.querySelector('.ft-copy-menu'), null);
  assert.equal(document.querySelector('.ft-studio-review'), null);
  assert.deepEqual(selection(), saved);
});


test('Agent manual and JSON remain available in the image copy menu', async t => {
  const { docs } = mount(t, ['mosaic']);
  docs[0].title='我的当前数据';
  document.querySelector('[data-action="chart-copy-options"]').click();
  document.querySelector('[data-format="recipe"]').click();
  await Promise.resolve();
  assert.equal(clipboardWrites.length,1);
  assert.match(clipboardWrites[0],/Agent|制作说明书/);
  assert.match(clipboardWrites[0],/我的当前数据/);
  assert.equal(document.querySelector('.ft-copy-menu'),null);
  document.querySelector('[data-action="chart-copy-options"]').click();
  assert.equal(clipboardWrites.length,1);
  document.querySelector('[data-format="json"]').click();
  await Promise.resolve();
  assert.equal(clipboardWrites.length,2);
  assert.equal(JSON.parse(clipboardWrites[1]).title,'我的当前数据');
});

test('primary copy in both cards and details copies the current Agent brief',async t=>{
 const {controller,docs}=mount(t,['bar']);docs[0].title='Current edited chart';docs[0].data[0].value=731.25;
 document.querySelector('[data-action="chart-copy"]').click();await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(clipboardWrites.length,1);assert.match(clipboardWrites[0],/Current edited chart/);assert.match(clipboardWrites[0],/731\.25/);
 const studio=document.querySelector('#studio');studio.innerHTML=controller.buttonsHTML(docs[0],undefined,'studio');studio.setAttribute('open','');studio.querySelector('[data-action="chart-copy"]').click();await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(clipboardWrites.length,2);assert.equal(clipboardWrites[1],clipboardWrites[0]);
 studio.querySelector('[data-action="chart-copy-options"]').click();assert.equal(document.querySelector('[role="menuitem"]').dataset.format,'recipe');assert.ok(document.querySelector('[data-format="png"]'));
});

test('English card actions keep complete accessible phrases before and after selection',async t=>{
 const {setLocale}=await server.ssrLoadModule('/src/forma/locale.js');
 const {findTemplate}=await server.ssrLoadModule('/src/forma/catalog.js');
 setLocale('en');t.after(()=>setLocale('zh-CN'));
 const {docs}=mount(t,['mosaic']),name=findTemplate(docs[0].template).name;
 assert.equal(document.querySelector('[data-action="chart-copy"]').getAttribute('aria-label'),`Copy prompt for ${name}`);
 const button=document.querySelector('[data-action="chart-select"]');
 assert.equal(button.getAttribute('aria-label'),`Select ${name}`);
 button.click();assert.equal(button.getAttribute('aria-label'),`Deselect ${name}`);
 button.click();assert.equal(button.getAttribute('aria-label'),`Select ${name}`);
});
