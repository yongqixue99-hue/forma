// Shared chart surfaces: the existing drawing travels; the destination owns its layout.
let serial = 0;
const noop = () => {};
const forbidden = 'script,iframe,object,embed,audio,video,animate,animateMotion,animateTransform,set';
const typography = ['color', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant', 'font-feature-settings', 'line-height', 'letter-spacing', 'direction', 'text-align'];

function rectOf(element) {
  const box = element?.getBoundingClientRect?.();
  if (!box || ![box.left, box.top, box.width, box.height].every(Number.isFinite) || box.width <= 0 || box.height <= 0) return null;
  return {left: box.left, top: box.top, width: box.width, height: box.height};
}

function visible(element, rect, win) {
  if (!element?.isConnected || !rect || element.hidden) return false;
  const style = win.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
  return rect.left < win.innerWidth && rect.top < win.innerHeight && rect.left + rect.width > 0 && rect.top + rect.height > 0;
}

function freezeClone(element) {
  const clone = element.cloneNode(true), prefix = `forma-flight-${++serial}-`, ids = new Map();
  clone.querySelectorAll(forbidden).forEach(node => node.remove());
  const nodes = [clone, ...clone.querySelectorAll('*')];
  for (const node of nodes) {
    if (node.id) {
      const next = `${prefix}${ids.size}`;
      ids.set(node.id, next);
      node.id = next;
    }
  }
  for (const node of nodes) {
    for (const attribute of [...node.attributes]) {
      const name = attribute.name, value = attribute.value;
      if (/^on/i.test(name) || name.startsWith('aria-') || name.startsWith('data-action') || ['role', 'tabindex', 'autofocus', 'contenteditable', 'name', 'form'].includes(name)) {
        node.removeAttribute(name);
        continue;
      }
      if (name === 'href' || name === 'xlink:href') {
        if (value.startsWith('#') && ids.has(value.slice(1))) node.setAttribute(name, `#${ids.get(value.slice(1))}`);
        else node.removeAttribute(name);
        continue;
      }
      const rewritten = value.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g, (match, quote, id) => ids.has(id) ? `url(#${ids.get(id)})` : match);
      if (rewritten !== value) node.setAttribute(name, rewritten);
    }
    if (node.style) {
      node.style.setProperty('animation', 'none', 'important');
      node.style.setProperty('transition', 'none', 'important');
      node.style.setProperty('pointer-events', 'none', 'important');
    }
    if ('disabled' in node) node.disabled = true;
  }
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('inert', '');
  return clone;
}

/** Capture the currently visible SVG surface without retaining live event handlers. */
export function captureSurface(element) {
  const win = element?.ownerDocument?.defaultView, rect = rectOf(element);
  if (!win || !visible(element, rect, win) || win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
  const clone = freezeClone(element), computed = win.getComputedStyle(element);
  for (const property of typography) clone.style.setProperty(property, computed.getPropertyValue(property));
  for (let i = 0; i < computed.length; i++) {
    const property = computed.item(i);
    if (property.startsWith('--')) clone.style.setProperty(property, computed.getPropertyValue(property));
  }
  Object.assign(clone.style, {position: 'absolute', inset: '0', width: '100%', height: '100%', minWidth: '0', minHeight: '0', maxWidth: 'none', maxHeight: 'none', margin: '0', flex: 'none', transform: 'none', opacity: '1', visibility: 'visible'});
  return {clone, rect};
}

/**
 * Move a snapshot into a mounted destination. The returned cancellation function
 * is idempotent; it removes every animation and leaves destination styles intact.
 */
export function animateSurface(snapshot, target, {container, direction = 'open', duration = 600} = {}) {
  const doc = target?.ownerDocument, win = doc?.defaultView;
  container ||= doc?.body;
  const destination = rectOf(target), media = win?.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (!snapshot?.clone || !win || !container?.isConnected || container.ownerDocument !== doc || !visible(target, destination, win) || doc.hidden || media?.matches || typeof target.animate !== 'function' || !Number.isFinite(duration) || duration <= 0) return noop;
  const source = snapshot.rect;
  if (!source || ![source.left, source.top, source.width, source.height].every(Number.isFinite) || source.width <= 0 || source.height <= 0) return noop;
  const fixed = container === doc.body || container === doc.documentElement;
  const origin = fixed ? {left: 0, top: 0} : rectOf(container);
  if (!origin) return noop;
  const layer = doc.createElement('div'), clone = freezeClone(snapshot.clone);
  const x = source.left - origin.left - (fixed ? 0 : container.clientLeft) + (fixed ? 0 : container.scrollLeft);
  const y = source.top - origin.top - (fixed ? 0 : container.clientTop) + (fixed ? 0 : container.scrollTop);
  layer.dataset.surfaceTransition = direction;
  layer.setAttribute('aria-hidden', 'true');
  layer.setAttribute('inert', '');
  Object.assign(layer.style, {position: fixed ? 'fixed' : 'absolute', left: `${x}px`, top: `${y}px`, width: `${source.width}px`, height: `${source.height}px`, margin: '0', padding: '0', border: '0', pointerEvents: 'none', transformOrigin: '0 0', zIndex: '2147483646', overflow: 'visible', willChange: 'transform, opacity'});
  layer.append(clone);
  let flight, arrival, timer, observer, cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    win.clearTimeout(timer);
    flight?.cancel();
    arrival?.cancel();
    observer?.disconnect();
    layer.remove();
    doc.removeEventListener('visibilitychange', onVisibility);
    win.removeEventListener('resize', cleanup);
    win.removeEventListener('scroll', cleanup, true);
    media?.removeEventListener?.('change', onMotion);
  };
  const onVisibility = () => { if (doc.hidden) cleanup(); };
  const onMotion = event => { if (event.matches) cleanup(); };
  try {
    container.append(layer);
    const transform = `translate(${destination.left - source.left}px, ${destination.top - source.top}px) scale(${destination.width / source.width}, ${destination.height / source.height})`;
    const timing = {duration, easing: 'cubic-bezier(.22,.72,.16,1)', fill: 'both'};
    flight = layer.animate([
      {transform: 'translate(0px, 0px) scale(1, 1)', opacity: 1, offset: 0},
      {opacity: 1, offset: .68},
      {transform, opacity: 0, offset: 1},
    ], timing);
    flight.finished.catch(noop);
    // Opacity lives only in WAAPI; cancel restores even author-defined inline styles.
    arrival = target.animate([{opacity: 0, offset: 0}, {opacity: 0, offset: .62}, {opacity: win.getComputedStyle(target).opacity || '1', offset: 1}], timing);
    arrival.finished.catch(noop);
    Promise.all([flight.finished, arrival.finished]).then(cleanup, cleanup);
    doc.addEventListener('visibilitychange', onVisibility);
    win.addEventListener('resize', cleanup);
    win.addEventListener('scroll', cleanup, true);
    media?.addEventListener?.('change', onMotion);
    if (win.MutationObserver) {
      observer = new win.MutationObserver(() => { if (!target.isConnected || !container.isConnected) cleanup(); });
      observer.observe(doc.documentElement, {childList: true, subtree: true});
    }
    timer = win.setTimeout(cleanup, duration + 180);
  } catch {
    cleanup();
  }
  return cleanup;
}
