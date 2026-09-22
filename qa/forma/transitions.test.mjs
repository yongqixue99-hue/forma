import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {captureSurface, animateSurface} from '../../src/forma/transitions.js';

function fixture(t) {
  const win = new Window({url: 'http://localhost/'}), doc = win.document;
  Object.defineProperty(doc, 'hidden', {value: false, writable: true, configurable: true});
  const media = {matches: false, listeners: new Set(), addEventListener(_, callback) {this.listeners.add(callback);}, removeEventListener(_, callback) {this.listeners.delete(callback);}};
  win.matchMedia = () => media;
  const animations = [];
  win.HTMLElement.prototype.animate = function(keyframes, options) {
    let resolve, reject;
    const animation = {element: this, keyframes, options, cancelled: false, finished: new Promise((yes, no) => {resolve = yes; reject = no;}), finish() {resolve();}, cancel() {this.cancelled = true; reject(new Error('Cancelled'));}};
    animations.push(animation);
    return animation;
  };
  const surface = (box, parent = doc.body) => {
    const node = doc.createElement('div');
    node.getBoundingClientRect = () => ({...box, right: box.left + box.width, bottom: box.top + box.height});
    parent.append(node);
    return node;
  };
  t.after(() => win.close());
  return {win, doc, media, animations, surface};
}

test('snapshots retain the current drawing, remap SVG references, and remove interactive behavior', t => {
  const f = fixture(t), source = f.surface({left: 10, top: 20, width: 300, height: 220});
  source.id = 'chart-preview'; source.setAttribute('role', 'button'); source.setAttribute('tabindex', '0'); source.dataset.action = 'open';
  source.innerHTML = '<svg viewBox="0 0 300 220"><defs><clipPath id="clip"><rect width="123" height="80"/></clipPath><pattern id="hatch"><path d="M0,0L8,8"/></pattern><path id="shape" d="M0,0L10,8"/></defs><g clip-path="url(#clip)"><path fill="url(\'#hatch\')" style="stroke:url(#hatch)" d="M5,6L17,42"/><use href="#shape"/><animate attributeName="opacity"/></g></svg><button onclick="bad()" autofocus>Run</button>';
  const snapshot = captureSurface(source), clone = snapshot.clone;
  assert.deepEqual(snapshot.rect, {left: 10, top: 20, width: 300, height: 220});
  assert.equal(source.id, 'chart-preview'); assert.equal(source.querySelector('rect').getAttribute('width'), '123');
  const clip = clone.querySelector('clipPath').id, pattern = clone.querySelector('pattern').id, shape = clone.querySelector('defs>path').id;
  assert.notEqual(clip, 'clip'); assert.equal(clone.querySelector('g').getAttribute('clip-path'), `url(#${clip})`);
  assert.equal(clone.querySelector('g>path').getAttribute('fill'), `url(#${pattern})`);
  assert.ok(clone.querySelector('g>path').getAttribute('style').includes(`url(#${pattern})`));
  assert.equal(clone.querySelector('use').getAttribute('href'), `#${shape}`);
  assert.equal(clone.querySelector('g>path').getAttribute('d'), 'M5,6L17,42');
  assert.equal(clone.querySelector('animate'), null); assert.equal(clone.getAttribute('role'), null); assert.equal(clone.getAttribute('tabindex'), null);
  assert.equal(clone.dataset.action, undefined); assert.equal(clone.getAttribute('aria-hidden'), 'true'); assert.equal(clone.hasAttribute('inert'), true);
  assert.equal(clone.querySelector('button').disabled, true); assert.equal(clone.querySelector('[onclick]'), null);
});

test('a body flight reaches the exact destination and cancellation restores untouched target styles', async t => {
  const f = fixture(t), source = f.surface({left: 20, top: 50, width: 250, height: 200}), target = f.surface({left: 110, top: 90, width: 750, height: 440});
  target.style.cssText = 'opacity:.7;visibility:visible;color:red';
  const originalStyle = target.getAttribute('style'), cancel = animateSurface(captureSurface(source), target), layer = f.doc.querySelector('[data-surface-transition]');
  assert.equal(layer.style.position, 'fixed'); assert.equal(layer.style.left, '20px'); assert.equal(layer.style.top, '50px'); assert.equal(layer.style.pointerEvents, 'none');
  assert.equal(f.animations[0].keyframes.at(-1).transform, 'translate(90px, 40px) scale(3, 2.2)');
  assert.equal(Number(f.animations[1].keyframes.at(-1).opacity), .7);
  assert.equal(target.getAttribute('style'), originalStyle);
  cancel(); cancel(); await Promise.resolve();
  assert.equal(f.doc.querySelector('[data-surface-transition]'), null); assert.ok(f.animations.every(animation => animation.cancelled));
  assert.equal(target.getAttribute('style'), originalStyle); assert.equal(f.media.listeners.size, 0);
});

test('dialog flights account for its border and scroll rather than using viewport coordinates as local positions', t => {
  const f = fixture(t), source = f.surface({left: 30, top: 70, width: 200, height: 100}), dialog = f.doc.createElement('dialog');
  f.doc.body.append(dialog); dialog.style.display = 'block';
  dialog.getBoundingClientRect = () => ({left: 10, top: 20, width: 900, height: 700});
  Object.defineProperties(dialog, {clientLeft: {value: 2}, clientTop: {value: 3}, scrollLeft: {value: 4}, scrollTop: {value: 5}});
  const target = f.surface({left: 130, top: 170, width: 400, height: 300}, dialog);
  const cancel = animateSurface(captureSurface(source), target, {container: dialog, direction: 'open'}), layer = dialog.querySelector('[data-surface-transition]');
  assert.equal(layer.style.position, 'absolute'); assert.equal(layer.style.left, '22px'); assert.equal(layer.style.top, '52px');
  assert.equal(f.animations[0].keyframes.at(-1).transform, 'translate(100px, 100px) scale(2, 3)');
  cancel();
});

test('reusing a snapshot cannot introduce duplicate SVG definition IDs', t => {
  const f = fixture(t), source = f.surface({left: 10, top: 20, width: 200, height: 100}), target = f.surface({left: 20, top: 40, width: 300, height: 200});
  source.innerHTML = '<svg><defs><clipPath id="clip"><rect width="20" height="10"/></clipPath></defs><g clip-path="url(#clip)"/></svg>';
  const snapshot = captureSurface(source), a = animateSurface(snapshot, target), b = animateSurface(snapshot, target);
  const ids = [...f.doc.querySelectorAll('[id]')].map(node => node.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const layer of f.doc.querySelectorAll('[data-surface-transition]')) assert.equal(layer.querySelector('g').getAttribute('clip-path'), `url(#${layer.querySelector('clipPath').id})`);
  a(); b();
});

test('reduced motion, missing geometry and unsupported animation never hide the destination', t => {
  const f = fixture(t), source = f.surface({left: 10, top: 20, width: 200, height: 100}), target = f.surface({left: 20, top: 40, width: 300, height: 200}), snapshot = captureSurface(source);
  f.media.matches = true;
  assert.equal(captureSurface(source), null); animateSurface(snapshot, target)();
  f.media.matches = false; source.getBoundingClientRect = () => ({left: 0, top: 0, width: 0, height: 0});
  assert.equal(captureSurface(source), null); target.animate = undefined; animateSurface(snapshot, target)();
  assert.equal(f.animations.length, 0); assert.equal(target.style.visibility, ''); assert.equal(target.style.opacity, '');
});

test('finishing or a reduced-motion change clears overlays and animations', async t => {
  const f = fixture(t), source = f.surface({left: 10, top: 20, width: 200, height: 100}), target = f.surface({left: 20, top: 40, width: 300, height: 200});
  animateSurface(captureSurface(source), target); f.animations.forEach(animation => animation.finish());
  await Promise.resolve(); await Promise.resolve();
  assert.equal(f.doc.querySelector('[data-surface-transition]'), null);
  animateSurface(captureSurface(source), target);
  for (const callback of [...f.media.listeners]) callback({matches: true});
  assert.equal(f.doc.querySelector('[data-surface-transition]'), null); assert.equal(f.media.listeners.size, 0);
});

test('a failure after creating the flight cannot strand a target or leave a rejected animation promise', async t => {
  const f = fixture(t), source = f.surface({left: 10, top: 20, width: 200, height: 100}), target = f.surface({left: 20, top: 40, width: 300, height: 200});
  target.animate = () => {throw new Error('Animation unavailable');};
  assert.doesNotThrow(() => animateSurface(captureSurface(source), target)());
  await Promise.resolve();
  assert.equal(f.doc.querySelector('[data-surface-transition]'), null); assert.equal(target.style.visibility, '');
});
