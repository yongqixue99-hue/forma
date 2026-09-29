import {copyPNGImage} from './clipboard-image.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import {cleanBrandStamp} from './brand-style.js';
import {cleanAnnotations} from './annotations.js';
import { findTemplate } from './catalog.js';
import { validateDocument } from './data.js';
import { normalizePalette, normalizeColors,palettes } from './palettes.js';
import {normalizeColorBindings,normalizeValueColors} from './color-semantics.js';
import { cameraState } from './spatial-charts.js';
import { staticSVG } from './export.js';
import {agentBrief} from './data-guides.js';

export const MAX_SELECTION = 100;

function validDocument(doc) {
  const result = validateDocument(doc);
  if (!result.valid) throw new Error(uiMessage`图表数据无效：${result.errors.join('；')}`);
  return doc;
}

// Clipboard and saved collections use plain JSON. Reject values that JSON would
// silently discard or alter, so copying never changes the underlying records.
function copyJSON(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object' || ancestors.has(value)) throw new Error(uiText('图表包含无法保存为 JSON 的值，请检查数据。'));
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error(uiText('图表需要使用普通 JSON 对象。'));
  ancestors.add(value);
  const result = Array.isArray(value)
    ? value.map(item => copyJSON(item, ancestors))
    : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copyJSON(item, ancestors)]));
  ancestors.delete(value);
  return result;
}

export function normalizeChartOptions(options = {}, doc) {
  options = options && typeof options === 'object' ? options : {};
  const palette = normalizePalette(options.palette);
  const colorBindings=normalizeColorBindings(options.colorBindings),valueColors=normalizeValueColors(options.valueColors);
  // The selection/clipboard snapshot must preserve the same identity-bound
  // colors as the editor and exports. Invalid settings must not silently reset.
  if(colorBindings===null||valueColors===null)throw new Error(uiText('配色对应或色阶设置无效，请检查作品文件。'));
  return {
    ...(findTemplate(doc?.template)?.dimension==='3d'?{camera3d:cameraState(options.camera3d)}:{}),
    palette: Object.hasOwn(palettes, palette) ? palette : 'ink',
    ...(options.brand?{brand:cleanBrandStamp(options.brand)}:{}),
    ...(options.annotations?{annotations:cleanAnnotations(options.annotations)}:{}),
    ...(normalizeColors(options.colors)?{colors:normalizeColors(options.colors)}:{}),
    ...(colorBindings!==undefined?{colorBindings}:{}),
    ...(valueColors!==undefined?{valueColors}:{}),
    ...(['categorical','emphasis'].includes(options.colorMode)?{colorMode:options.colorMode}:{}),
    dark: typeof options.dark === 'boolean' ? options.dark : !!findTemplate(doc?.template)?.dark,
    ratio: ['wide', 'square', 'portrait','landscape','story'].includes(options.ratio) ? options.ratio : 'wide',
    duration: typeof options.duration === 'number' && Number.isFinite(options.duration)
      ? Math.min(60, Math.max(1, options.duration)) : 8
  };
}

export const selectionKey = (doc, savedId) => savedId ? `saved:${savedId}` : `template:${doc.template}`;

export function makeSelectionItem(doc, options = {}, savedId) {
  validDocument(doc);
  if (savedId && (typeof savedId !== 'string' || savedId.length > 200)) throw new Error(uiText('保存的图表 ID 无效。'));
  return {
    key: selectionKey(doc, savedId),
    doc: copyJSON(doc),
    options: normalizeChartOptions(options, doc),
    selectedAt: new Date().toISOString()
  };
}

export function normalizeSelection(raw) {
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(raw)) return [];
  const result = [], seen = new Set();
  for (const item of raw) {
    if (result.length >= MAX_SELECTION) break;
    try {
      if (!item || typeof item.key !== 'string') continue;
      const savedId = item.key.startsWith('saved:') ? item.key.slice(6) : undefined;
      if (item.key.startsWith('saved:') && !savedId) continue;
      if (!savedId && item.key !== selectionKey(item.doc)) continue;
      const normalized = makeSelectionItem(item.doc, item.options, savedId);
      if (seen.has(normalized.key)) continue;
      if (typeof item.selectedAt === 'string' && Number.isFinite(Date.parse(item.selectedAt))) normalized.selectedAt = new Date(item.selectedAt).toISOString();
      seen.add(normalized.key);
      result.push(normalized);
    } catch { /* A damaged entry does not invalidate the rest of a collection. */ }
  }
  return result;
}

export function createSelectionBundle(items) {
  if (!Array.isArray(items) || items.length > MAX_SELECTION) throw new Error(uiMessage`每份图表清单最多包含 ${MAX_SELECTION} 张图表。`);
  return {
    version: 1,
    kind: 'forma-selection',
    charts: items.map(item => {
      validDocument(item?.doc);
      return { doc: copyJSON(item.doc), options: normalizeChartOptions(item.options, item.doc) };
    })
  };
}

export function formatRecipe(doc,options={}) {
  validDocument(doc);return agentBrief(copyJSON(doc),normalizeChartOptions(options,doc));
}

export function formatSelectionRecipes(items) {
  const bundle = createSelectionBundle(items);
  return bundle.charts.map(({ doc, options }, index) => `【${index + 1} / ${bundle.charts.length}】\n${formatRecipe(doc, options)}`).join('\n\n---\n\n');
}

export async function pngBlob(doc, options = {}) {
  validDocument(doc);
  const svg = staticSVG(doc, normalizeChartOptions(options, doc));
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!(image.naturalWidth > 0 && image.naturalHeight > 0)) throw new Error(uiText('图表图片尺寸无效，请重试。'));
    const canvas = document.createElement('canvas');
    canvas.width = 2400;
    canvas.height = Math.round(image.naturalHeight * canvas.width / image.naturalWidth);
    const context = canvas.getContext('2d');
    if (!context) throw new Error(uiText('当前浏览器无法创建图表图片。'));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error(uiText('PNG 编码失败，请重试。'))), 'image/png'
    ));
  } finally { URL.revokeObjectURL(url); }
}

function clipboardError(error) {
  if (error?.name === 'NotAllowedError') return new Error(uiText('复制被浏览器拦截，请允许剪贴板权限后再次点击复制。'));
  if (error?.name === 'SecurityError') return new Error(uiText('当前页面没有剪贴板访问权限，请在 localhost 或 HTTPS 页面重试。'));
  if (error instanceof Error && /[\u3400-\u9fff]/.test(error.message)) return error;
  return new Error(uiText('复制未完成，请重新点击复制；图片也可通过「导出」保存。'), { cause: error });
}

export async function copyChartContent(format, doc, options = {}) {
  validDocument(doc);
  if (!['recipe', 'json', 'svg', 'png'].includes(format)) throw new Error(uiText('不支持的复制格式。'));
  const snapshot = copyJSON(doc);
  const normalized = normalizeChartOptions(options, doc);
  const clipboard = globalThis.navigator?.clipboard;
  if (!clipboard) throw new Error(uiText('当前环境无法访问剪贴板，请在 localhost 或 HTTPS 页面中使用复制。'));
  try {
    if (format === 'png') {
      await copyPNGImage(() => pngBlob(snapshot, normalized));
    } else {
      if (typeof clipboard.writeText !== 'function') throw new Error(uiText('当前浏览器不支持复制文字，请换用支持剪贴板的浏览器。'));
      const content = format === 'recipe' ? formatRecipe(snapshot, normalized)
        : format === 'json' ? JSON.stringify(snapshot, null, 2)
          : staticSVG(snapshot, normalized);
      await clipboard.writeText(content);
    }
  } catch (error) { throw clipboardError(error); }
}
