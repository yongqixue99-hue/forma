import {uiText,uiMarkup,uiMessage} from './locale.js';
import { validateDocument } from './data.js';
import { normalizePalette,normalizeColors } from './palettes.js';
import {cleanBrandStamp} from './brand-style.js';
import {normalizeColorBindings,normalizeValueColors} from './color-semantics.js';
import {cleanAnnotations} from './annotations.js';

export function cleanOptions(options = {}) {
  const result = { palette:normalizePalette(options.palette), dark:options.dark === true,
    ratio:['wide','square','portrait','landscape','story'].includes(options.ratio) ? options.ratio : 'wide',
    duration:[5,8,12].includes(options.duration) ? options.duration : 8 };
  const colors=normalizeColors(options.colors);if(colors)result.colors=colors;
  for(const [key,normalize] of [['colorBindings',normalizeColorBindings],['valueColors',normalizeValueColors]]){const value=normalize(options[key]);if(value===null)throw new Error(uiText('配色对应或色阶设置无效，请检查作品文件。'));if(value!==undefined)result[key]=value;}
  if(options.brand!==undefined)result.brand=cleanBrandStamp(options.brand);
  if(options.annotations!==undefined){const annotations=cleanAnnotations(options.annotations);if(annotations.length)result.annotations=annotations;}
  if(['categorical','emphasis'].includes(options.colorMode))result.colorMode=options.colorMode;
  if (options.camera3d && Number.isFinite(options.camera3d.azimuth) && Number.isFinite(options.camera3d.elevation)) result.camera3d = {azimuth:options.camera3d.azimuth,elevation:options.camera3d.elevation};
  const e=options.exportSettings;
  if(e && typeof e==='object') result.exportSettings={
    format:['png','svg','pptx','mp4','html','project'].includes(e.format)?e.format:'png',
    ratio:['wide','square','portrait','landscape','story'].includes(e.ratio)?e.ratio:result.ratio,
    longEdge:[1080,1280,1920,2400].includes(e.longEdge)?e.longEdge:1920,
    fps:[24,30,60].includes(e.fps)?e.fps:30,
    duration:Number.isFinite(e.duration)&&e.duration>=2&&e.duration<=20?e.duration:8,
    hold:Number.isFinite(e.hold)&&e.hold>=0&&e.hold<=5&&e.hold<(e.duration||8)?e.hold:1,
    ...(e.pptxMode!==undefined?{pptxMode:e.pptxMode==='motion'?'motion':'static'}:{}),
    transparent:e.transparent===true,chartOnly:e.chartOnly===true,frame:['current','end'].includes(e.frame)?e.frame:'end',
  };
  return result;
}
export function makeProject(doc, options) {
  const report = validateDocument(doc); if (!report.valid) throw new Error(report.errors[0]);
  return { format:'forma-project', version:1, doc:structuredClone(doc), options:cleanOptions(options) };
}
export function readProject(text,{maxBytes=2000000}={}) {
  if (new TextEncoder().encode(text).length > maxBytes) throw new Error(maxBytes===2000000?uiText('作品文件请控制在 2 MB 以内。'):uiText('作品文件超过本次恢复容量限制。'));
  let parsed; try { parsed = JSON.parse(text); } catch { throw new Error(uiText('作品文件不是有效的 JSON。')); }
  if (parsed?.format === 'forma-project' && parsed.version !== 1) throw new Error(uiText('这个作品文件版本暂不支持。'));
  const doc = parsed?.format === 'forma-project' ? parsed.doc : parsed;
  const report = validateDocument(doc); if (!report.valid) throw new Error(report.errors[0]);
  return {doc:structuredClone(doc), options:cleanOptions(parsed?.format === 'forma-project' ? parsed.options : {})};
}
