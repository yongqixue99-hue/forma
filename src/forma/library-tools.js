import {uiText,uiMarkup,uiMessage} from './locale.js';
import './library-tools.css';
import { createElement, Copy, Check, Square, Image, FileJson, Code2, ClipboardList, ArrowUpRight, Download, Trash2, X, Undo2, ListOrdered, ChevronDown } from 'lucide';
import { findTemplate } from './catalog.js';
import { escapeHtml as esc, validateDocument } from './data.js';
import { themeFor } from './palettes.js';
import { ChartScene } from './charts.js';
import { download } from './export.js';
import { MAX_SELECTION, selectionKey, makeSelectionItem, normalizeSelection, createSelectionBundle, formatSelectionRecipes, copyChartContent } from './library-actions.js';

const STORE = 'forma.selection.v1';
const icon = (node, size = 16) => createElement(node, { width: size, height: size, 'stroke-width': 1.5, 'aria-hidden': 'true' }).outerHTML;
const copyFormats = [
  ['recipe', ClipboardList, uiText('复制提示词'), uiText('附原版动效模板，和 Excel 一起发给 Agent')],
  ['png', Image, uiText('复制图片'), uiText('粘贴到 PPT / Word · 2400 px')],
  ['json', FileJson, uiText('复制 JSON'), uiText('原始数值、单位与来源')],
  ['svg', Code2, uiText('复制 SVG'), uiText('可编辑的矢量图代码')]
];

export function mountLibraryTools({ getContext, onOpen, onEdit, toast }) {
  let items = [], menu = null, menuTrigger = null, copyContext = null;
  let thumbnails = [];
  let returnFocus = null, undoItems = null, feedbackTimer = null, destroyed = false;
  try { items = normalizeSelection(localStorage.getItem(STORE)); } catch { /* Session use remains available. */ }

  const tray = document.createElement('aside');
  tray.className = 'ft-tray';
  tray.setAttribute('aria-label', uiText('已选图表操作'));
  tray.innerHTML = uiMarkup`<button class="ft-tray-summary" data-ft-action="review" aria-expanded="false" aria-controls="ft-selection-panel">${icon(ListOrdered,17)}<span>图表清单 <strong data-ft-count>0</strong></span><span class="ft-tray-chevron">⌃</span></button>`;

  const dialog = document.createElement('dialog');
  dialog.className = 'ft-selection-dialog';
  dialog.id='ft-selection-panel';
  dialog.setAttribute('aria-labelledby', 'ft-selection-title');
  dialog.setAttribute('aria-modal', 'false');
  const mini = document.createElement('button');
  mini.className = 'ft-studio-review';
  mini.dataset.ftAction = 'review';
  const feedback = document.createElement('div');
  feedback.className = 'ft-feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  document.body.append(tray, dialog);

  function notify(message, { undo = false } = {}) {
    clearTimeout(feedbackTimer);
    const active = document.querySelector('dialog[open]');
    if (!active && !undo && typeof toast === 'function') {
      feedback.classList.remove('is-visible');
      toast(message);
      return;
    }
    (active || document.body).append(feedback);
    feedback.innerHTML = `<span>${esc(message)}</span>${undo ? uiMarkup`<button data-ft-action="undo-clear">${icon(Undo2, 13)}撤销</button>` : ''}`;
    feedback.classList.add('is-visible');
    feedbackTimer = setTimeout(() => feedback.classList.remove('is-visible'), undo ? 10000 : 4500);
  }

  function persist() {
    try { localStorage.setItem(STORE, JSON.stringify(items)); return true; }
    catch { return false; }
  }

  function changed(message, options) {
    const stored = persist();
    sync();
    if (message) notify(stored ? message : uiMessage`${message} 当前浏览器无法保存清单，本次会话仍可使用，请进入编辑区导出作品文件留存。`, options);
  }

  function buttonsHTML(doc, savedId, scope = 'card') {
    const name = findTemplate(doc.template)?.name || doc.title;
    const selected = items.some(item => item.key === selectionKey(doc, savedId));
    const attributes = `data-id="${esc(doc.template)}" ${savedId ? `data-saved="${esc(savedId)}"` : ''} data-scope="${scope === 'studio' ? 'studio' : 'card'}"`;
    return uiMarkup`<span class="ft-chart-tools" data-ft-scope="${scope === 'studio' ? 'studio' : 'card'}"><span class="ft-copy-split"><button type="button" class="ft-chart-button" data-action="chart-copy" ${attributes} aria-label="复制${esc(name)}的提示词" title="复制提示词">${icon(Copy)}<span class="ft-tool-label">复制提示词</span></button><button type="button" class="ft-chart-button ft-copy-more" data-action="chart-copy-options" ${attributes} aria-haspopup="menu" aria-expanded="false" aria-label="${esc(name)}的其他复制选项" title="其他复制选项">${icon(ChevronDown,11)}</button></span><button type="button" class="ft-chart-button ft-select-button ${selected ? 'is-selected' : ''}" data-action="chart-select" ${attributes} aria-pressed="${selected}" aria-label="${esc(selected ? uiMessage`取消选择${name}` : uiMessage`选择${name}`)}" title="${selected ? uiText('从清单移除') : uiText('加入已选清单：')}${esc(name)}">${icon(selected ? Check : Square)}<span class="ft-tool-label">${selected ? uiText('已选') : uiText('选择')}</span></button></span>`;
  }

  function updateMini() {
    const studio = document.querySelector('#studio[open]');
    if (!studio || !items.length) { mini.remove(); return; }
    if (mini.parentElement !== studio) studio.append(mini);
    const text = uiMessage`已选 ${items.length} 张 · 查看清单`;
    if (mini.textContent !== text) mini.innerHTML = `${icon(ListOrdered, 12)}<span>${esc(text)}</span>${icon(ArrowUpRight, 12)}`;
    mini.setAttribute('aria-label', text);
  }

  function sync() {
    if (destroyed) return;
    const keys = new Set(items.map(item => item.key));
    for (const button of document.querySelectorAll('[data-action="chart-select"]')) {
      const key = selectionKey({ template: button.dataset.id }, button.dataset.saved);
      const selected = keys.has(key), name = findTemplate(button.dataset.id)?.name || uiText('当前');
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', selected ? uiMessage`取消选择${name}` : uiMessage`选择${name}`);
      button.title = `${selected ? uiText('从清单移除') : uiText('加入已选清单：')}${name}${button.dataset.scope === 'studio' && items.length ? uiMessage` · 清单已有 ${items.length} 张` : ''}`;
      const label = button.querySelector('.ft-tool-label');
      if (label) label.textContent = selected ? uiText('已选') : uiText('选择');
      if (button.dataset.ftSelected !== String(selected)) {
        button.querySelector('svg')?.remove();
        button.insertAdjacentHTML('afterbegin', icon(selected ? Check : Square));
        button.dataset.ftSelected = String(selected);
      }
    }
    tray.hidden = !items.length;
    for (const count of tray.querySelectorAll('[data-ft-count]')) count.textContent = String(items.length);
    updateMini();
    if (dialog.open) renderSelection();
  }

  function toggleSelection(button) {
    const context = getContext(button);
    if (!context?.doc) { notify(uiText('没有找到这张图表，请刷新后重试。')); return; }
    const key = selectionKey(context.doc, context.savedId);
    const index = items.findIndex(item => item.key === key);
    if (index >= 0) {
      items.splice(index, 1);
      changed(uiText('已从清单移除。'));
      return;
    }
    if (items.length >= MAX_SELECTION) { notify(uiMessage`每份清单最多选择 ${MAX_SELECTION} 张图表，请先移除部分内容。`); return; }
    try {
      items.push(makeSelectionItem(context.doc, context.options, context.savedId));
      changed(uiMessage`已加入清单 · 共 ${items.length} 张。`);
    } catch (error) { notify(error.message); }
  }

  function refreshCurrent(doc, options = {}, savedId) {
    const index = items.findIndex(item => item.key === selectionKey(doc, savedId));
    if (index < 0 || !validateDocument(doc).valid) return;
    try {
      const next = makeSelectionItem(doc, options, savedId);
      next.selectedAt = items[index].selectedAt;
      if (JSON.stringify(next) === JSON.stringify(items[index])) return;
      items[index] = next;
      if (!persist()) notify(uiText('清单已在本次会话更新，浏览器暂时无法保存；请进入编辑区导出作品文件留存。'));
      if (dialog.open) renderSelection();
    } catch { /* Keep the last valid selected document while a field is edited. */ }
  }

  function positionMenu() {
    if (!menu || !menuTrigger?.isConnected) { closeMenus(); return; }
    const anchor = menuTrigger.getBoundingClientRect();
    menu.style.left = '0px'; menu.style.top = '0px';
    const bounds = menu.getBoundingClientRect();
    const width = bounds.width || 236, height = bounds.height || 264;
    const viewportWidth = document.documentElement.clientWidth || innerWidth;
    const viewportHeight = window.visualViewport?.height || innerHeight;
    const left = Math.max(8, Math.min(anchor.right - width, viewportWidth - width - 8));
    const below = anchor.bottom + 8;
    const top = Math.max(8, Math.min(below + height <= viewportHeight - 8 ? below : anchor.top - height - 8, viewportHeight - height - 8));
    // Fixed descendants of dialog / transformed hosts can use a local origin.
    // Measure that origin rather than assuming the viewport starts at (0, 0).
    menu.style.left = `${left - bounds.left}px`;
    menu.style.top = `${top - bounds.top}px`;
  }

  function closeMenus({ restoreFocus = false } = {}) {
    const trigger = menuTrigger;
    if (menu) {
      try { if (menu.matches(':popover-open')) menu.hidePopover(); } catch {}
      menu.remove();
    }
    trigger?.setAttribute('aria-expanded', 'false');
    trigger?.removeAttribute('aria-controls');
    menu = null; menuTrigger = null; copyContext = null;
    if (restoreFocus && trigger?.isConnected) trigger.focus({ preventScroll: true });
  }

  function openCopyMenu(button) {
    if (menuTrigger === button) { closeMenus({ restoreFocus: true }); return; }
    closeMenus();
    try {
      const context = getContext(button);
      if (!context?.doc) throw new Error(uiText('没有找到这张图表，请刷新后重试。'));
      copyContext = makeSelectionItem(context.doc, context.options, context.savedId);
    } catch (error) { notify(error.message); return; }
    menuTrigger = button;
    button.setAttribute('aria-expanded', 'true');
    menu = document.createElement('div');
    menu.id = 'ft-chart-copy-menu';
    button.setAttribute('aria-controls', menu.id);
    menu.className = 'ft-copy-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', uiText('复制图表'));
    menu.innerHTML = uiMarkup`<p class="ft-menu-heading">带走这张图表</p>${copyFormats.map(([format, node, title, description]) => `<button role="menuitem" tabindex="-1" data-ft-action="copy-format" data-format="${format}">${icon(node, 17)}<span>${title}<small>${description}</small></span></button>`).join('')}`;
    (button.closest('dialog[open]') || document.body).append(menu);
    if (typeof menu.showPopover === 'function') {
      menu.setAttribute('popover', 'manual');
      try { menu.showPopover(); } catch { menu.removeAttribute('popover'); }
    }
    positionMenu();
    menu.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
  }

  async function copyFormat(format) {
    if (!copyContext) return;
    const context = copyContext;
    // Invoke within the trusted click before closing the menu or awaiting work.
    const promise = copyChartContent(format, context.doc, context.options);
    closeMenus({ restoreFocus: true });
    try { await promise; notify(uiMessage`${copyFormats.find(row => row[0] === format)?.[2]?.replace(uiText('复制'), '') || uiText('内容')}已复制。`); }
    catch (error) { notify(error.message); }
  }

  async function copyAgent(button) {
    closeMenus();
    try {
      const context = getContext(button);
      if (!context?.doc) throw new Error(uiText('没有找到这张图表，请刷新后重试。'));
      await copyChartContent('recipe', context.doc, context.options);
      if (!destroyed) notify(uiText('提示词已复制，已附原版动效模板；再把你的 Excel 发给 Agent。'));
    } catch (error) { if (!destroyed) notify(error.message); }
  }

  async function copyAll() {
    if (!items.length) { notify(uiText('先选择一张图表，再复制说明书。')); return; }
    try {
      const content = formatSelectionRecipes(items), count = items.length;
      if (!navigator.clipboard?.writeText) throw new Error(uiText('当前浏览器不支持自动复制文字，请在图表指南中查看并复制制作说明书。'));
      await navigator.clipboard.writeText(content);
      notify(uiMessage`已复制 ${count} 张图表的 Agent 制作说明书。`);
    } catch (error) { notify(error?.name === 'NotAllowedError' ? uiText('复制被浏览器拦截，请允许剪贴板权限后再次点击。') : /[\u3400-\u9fff]/.test(error.message) ? error.message : uiText('清单复制未完成，请再次点击复制。')); }
  }

  function exportAll() {
    if (!items.length) return;
    try {
      const bundle = createSelectionBundle(items);
      download(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json;charset=utf-8' }), uiMessage`FORMA-图表清单-${items.length}张.json`);
      notify(uiMessage`已导出 ${items.length} 张图表的完整数据与样式。`);
    } catch (error) { notify(error.message); }
  }

  function renderSelection() {
    const active = document.activeElement;
    const focusKey = dialog.contains(active) ? { action: active.dataset.ftAction, key: active.dataset.key, index: [...dialog.querySelectorAll('.ft-selection-item')].indexOf(active.closest('.ft-selection-item')) } : null;
    thumbnails.forEach(scene=>scene.destroy());thumbnails=[];
    dialog.innerHTML = uiMarkup`<header class="ft-selection-header"><h2 id="ft-selection-title">已选图表 <span>${items.length}</span></h2><button class="ft-dialog-icon" data-ft-action="close-selection" aria-label="收起图表清单" title="收起清单">${icon(X, 18)}</button></header><div class="ft-selection-list">${items.length ? items.map(item => {
      const template = findTemplate(item.doc.template), theme=themeFor(item.options.palette,item.options.dark,item.options.colors);
      return uiMarkup`<article class="ft-selection-item"><header><h3>${esc(template.name)}</h3><div><button class="ft-dialog-icon" data-ft-action="copy-item" data-key="${esc(item.key)}" aria-label="复制${esc(template.name)}说明书" title="复制提示词">${icon(Copy,15)}</button><button class="ft-dialog-icon" data-ft-action="remove-item" data-key="${esc(item.key)}" aria-label="移除${esc(template.name)}" title="移除">${icon(X,15)}</button></div></header><div class="ft-item-preview"><button class="ft-thumbnail" data-ft-action="open-item" data-key="${esc(item.key)}" aria-label="预览${esc(template.name)}" style="background:${theme.bg}"><span data-ft-thumbnail="${esc(item.key)}" aria-hidden="true"></span></button><div class="ft-item-summary"><p>${esc(item.doc.title)}</p><button data-ft-action="edit-item" data-key="${esc(item.key)}">编辑数据 ${icon(ArrowUpRight,12)}</button></div></div></article>`;
    }).join('') : uiMarkup`<div class="ft-selection-empty">${icon(ClipboardList,28)}<h3>还没有选择图表</h3><p>点击图表上的选择图标，加入清单。</p></div>`}</div><footer class="ft-selection-footer"><div><button class="ft-footer-clear" data-ft-action="clear" ${!items.length?'disabled':''}>清空</button><button class="ft-footer-copy" data-ft-action="copy-all" ${!items.length?'disabled':''}>${icon(Copy,14)}复制全部说明书</button></div>${onEdit?uiMarkup`<button class="ft-footer-edit" data-ft-action="edit-selected" ${!items.length?'disabled':''}>加入作品编辑器 ${icon(ArrowUpRight,14)}</button>`:''}</footer>`;
    for(const host of dialog.querySelectorAll('[data-ft-thumbnail]')){
      const item=items.find(item=>item.key===host.dataset.ftThumbnail);
      try{thumbnails.push(new ChartScene(host,item.doc,{...item.options,width:300,height:190,progress:1,compact:true,interactive:false,orbit:false}));}catch{host.textContent=findTemplate(item.doc.template).name;}
    }
    if (feedback.classList.contains('is-visible') && feedback.parentElement === dialog) dialog.append(feedback);
    if (focusKey?.action) {
      const target = [...dialog.querySelectorAll('[data-ft-action]')].find(button => button.dataset.ftAction === focusKey.action && button.dataset.key === focusKey.key && !button.disabled)
        || [...dialog.querySelectorAll('[data-ft-action="open-item"]')].find(button => button.dataset.key === focusKey.key)
        || dialog.querySelectorAll('[data-ft-action="open-item"]')[Math.max(0, Math.min(focusKey.index, items.length - 1))]
        || dialog.querySelector('[data-ft-action="close-selection"]');
      target?.focus({ preventScroll: true });
    }
  }

  function openSelection(trigger) {
    closeMenus();if(dialog.open){closeSelection();return;}
    returnFocus=trigger||document.activeElement;
    const studio=document.querySelector('#studio[open]');(studio||document.body).append(dialog);
    renderSelection();dialog.show();document.body.classList.add('ft-selection-open');
    tray.querySelector('[data-ft-action="review"]').setAttribute('aria-expanded','true');
  }
  function closeSelection({restoreStudio=true}={}){
    thumbnails.forEach(scene=>scene.destroy());thumbnails=[];if(dialog.open)dialog.close();document.body.classList.remove('ft-selection-open');document.body.append(dialog);
    tray.hidden=!items.length;tray.querySelector('[data-ft-action="review"]').setAttribute('aria-expanded','false');updateMini();
    if(restoreStudio&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;
  }

  function clearSelection() {
    if (!items.length) return;
    closeMenus();
    undoItems = structuredClone(items);
    const count = items.length;
    items = [];
    changed(uiMessage`已清空 ${count} 张图表。`, { undo: true });
  }

  function undoClear() {
    if (!undoItems) return;
    items = normalizeSelection([...undoItems, ...items]);
    undoItems = null;
    changed(uiMessage`已恢复清单 · 共 ${items.length} 张。`);
  }

  function onClick(event) {
    const button = event.target.closest?.('[data-action="chart-copy"], [data-action="chart-copy-options"], [data-action="chart-select"], [data-ft-action]');
    if (button) {
      event.preventDefault(); event.stopPropagation();
      if (button.disabled) return;
      const action = button.dataset.ftAction || button.dataset.action;
      if (action === 'chart-copy') void copyAgent(button);
      else if (action === 'chart-copy-options') openCopyMenu(button);
      else if (action === 'chart-select') { closeMenus(); toggleSelection(button); }
      else if (action === 'copy-format') void copyFormat(button.dataset.format);
      else if (action === 'review') openSelection(button);
      else if (action === 'edit-selected') { const selection=structuredClone(items);closeSelection({restoreStudio:false});onEdit?.(selection); }
      else if (action === 'close-selection') closeSelection();
      else if (action === 'copy-all') void copyAll();
      else if (action === 'copy-item') {const item=items.find(item=>item.key===button.dataset.key);if(item)void copyChartContent('recipe',item.doc,item.options).then(()=>notify(uiText('Agent 说明书已复制。'))).catch(error=>notify(error.message));}
      else if (action === 'edit-item') {const item=items.find(item=>item.key===button.dataset.key);if(item){closeSelection({restoreStudio:false});onEdit?.([structuredClone(item)]);}}
      else if (action === 'export-all') exportAll();
      else if (action === 'clear') clearSelection();
      else if (action === 'undo-clear') undoClear();
      else if (action === 'open-item') {
        const item = items.find(item => item.key === button.dataset.key);
        if (item) { const snapshot = structuredClone(item); closeSelection({ restoreStudio: false }); onOpen(snapshot); }
      } else if (action === 'remove-item') {
        items = items.filter(item => item.key !== button.dataset.key);
        changed(uiText('已从清单移除。'));
      }
      return;
    }
    if (menu && !menu.contains(event.target)) closeMenus();
    if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeSelection();
    }
  }

  function onKeydown(event) {
    if (!menu && event.key === 'ArrowDown' && event.target.closest?.('.ft-copy-split')) {
      event.preventDefault(); event.stopImmediatePropagation();
      openCopyMenu(event.target.closest('.ft-copy-split').querySelector('[data-action="chart-copy-options"]')); return;
    }
    if(event.key==='Escape'&&dialog.open&&!menu){event.preventDefault();event.stopImmediatePropagation();closeSelection();return;}
    if (menu) {
      const choices = [...menu.querySelectorAll('[role="menuitem"]')];
      const index = choices.indexOf(document.activeElement);
      if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (event.key === 'Escape') closeMenus({ restoreFocus: true });
        else choices[event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length]?.focus();
        return;
      }
      if (event.key === 'Tab') closeMenus({ restoreFocus: true });
    }
    if (event.target.closest?.('.ft-chart-tools, .ft-copy-menu, .ft-selection-dialog, .ft-tray, .ft-studio-review, .ft-feedback') && [' ', 'Enter'].includes(event.key)) event.stopPropagation();
  }

  function onCancel(event) { event.preventDefault(); event.stopPropagation(); closeSelection(); }
  function onStorage(event) { if (event.key === STORE) { items = normalizeSelection(event.newValue); sync(); } }
  function onViewport() { if (menu) positionMenu(); }
  function onRoute() { closeMenus(); if (dialog.open) closeSelection({ restoreStudio: false }); }
  const studio = document.querySelector('#studio');
  const observer = studio ? new MutationObserver(() => {
    if (menu && (!menuTrigger?.isConnected || (menuTrigger.closest('dialog') && !menuTrigger.closest('dialog').open))) closeMenus();
    updateMini();
  }) : null;
  if (studio) observer.observe(studio, { attributes: true, attributeFilter: ['open'], childList: true });
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeydown, true);
  document.addEventListener('scroll', onViewport, true);
  window.addEventListener('resize', onViewport);
  window.addEventListener('storage', onStorage);
  window.addEventListener('hashchange', onRoute);
  dialog.addEventListener('cancel', onCancel);
  sync();

  return {
    buttonsHTML, sync, refreshCurrent, closeMenus, getSelection(){return structuredClone(items);},
    destroy() {
      destroyed = true;
      closeMenus(); closeSelection(); observer?.disconnect(); clearTimeout(feedbackTimer);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeydown, true);
      document.removeEventListener('scroll', onViewport, true);
      window.removeEventListener('resize', onViewport);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('hashchange', onRoute);
      dialog.removeEventListener('cancel', onCancel);
      tray.remove(); dialog.remove(); mini.remove(); feedback.remove();
    }
  };
}
