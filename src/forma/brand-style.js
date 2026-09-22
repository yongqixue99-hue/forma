import {uiText,uiMarkup,uiMessage} from './locale.js';
import {normalizePalette,normalizeColors} from './palettes.js';

export const brandTypefaces={
  sans:{name:uiText('清晰'),sample:uiText('Aa 数相'),title:'Manrope,"PingFang SC","Microsoft YaHei",sans-serif',body:'Manrope,"PingFang SC","Microsoft YaHei",sans-serif'},
  editorial:{name:uiText('书刊'),sample:uiText('Aa 数相'),title:'"Instrument Serif","Songti SC",SimSun,serif',body:'Manrope,"PingFang SC","Microsoft YaHei",sans-serif'},
  mono:{name:uiText('理性'),sample:'Aa 0123',title:'"DM Mono","PingFang SC","Microsoft YaHei",monospace',body:'"DM Mono","PingFang SC","Microsoft YaHei",monospace'},
};
export const brandRatios=[['wide',uiText('横版 16:10')],['landscape',uiText('横版 16:9')],['square',uiText('方形 1:1')],['portrait',uiText('竖版 3:4')],['story',uiText('竖版 9:16')]];
export const LOGO_BYTES=256*1024;
const clone=v=>structuredClone(v),keys=['palette','colors','colorMode','dark','ratio','brand'];
const fail=message=>{throw new Error(message);};

export function cleanBrandLogo(value){
  if(!value||typeof value!=='object'||typeof value.data!=='string'||value.data.length>Math.ceil(LOGO_BYTES/3)*4+50)fail(uiText('Logo 需要是 256 KiB 以内的 PNG、JPEG 或 WebP。'));
  const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value.data);
  if(!match||match[2].length%4)fail(uiText('Logo 需要嵌入图片数据，不能引用外部网址或 SVG。'));
  let raw;try{raw=atob(match[2]);}catch{fail(uiText('Logo 编码无效。'));}
  const signature=match[1]==='png'?raw.startsWith('\x89PNG\r\n\x1a\n'):match[1]==='jpeg'?raw.startsWith('\xff\xd8\xff'):raw.startsWith('RIFF')&&raw.slice(8,12)==='WEBP';
  if(!signature||raw.length>LOGO_BYTES)fail(uiText('Logo 文件类型或容量不正确。'));
  if(!Number.isInteger(value.width)||!Number.isInteger(value.height)||value.width<1||value.height<1||value.width>8192||value.height>8192||value.width*value.height>16000000)fail(uiText('Logo 尺寸需要在 8192 px、1600 万像素以内。'));
  if(typeof value.name!=='string'||value.name.length>100)fail(uiText('Logo 名称无效。'));
  return {name:value.name,data:value.data,width:value.width,height:value.height};
}
export function cleanBrandStamp(value){
  if(!value||typeof value!=='object'||typeof value.name!=='string'||!value.name.trim()||value.name.length>60||!Object.hasOwn(brandTypefaces,value.typography))fail(uiText('品牌名称或字体设置无效。'));
  return {name:value.name.trim(),typography:value.typography,...(value.logo?{logo:cleanBrandLogo(value.logo)}:{})};
}
export function cleanBrandProfile(value){
  if(value?.kind!=='forma-brand'||value.version!==1||typeof value.id!=='string'||!/^[a-zA-Z0-9:_-]{1,100}$/.test(value.id))fail(uiText('这不是有效的品牌样式方案。'));
  const stamp=cleanBrandStamp(value),colors=value.colors===undefined?undefined:normalizeColors(value.colors);
  if(value.colors!==undefined&&!colors)fail(uiText('品牌色板需要 1–12 个六位 HEX 色值。'));
  if(!brandRatios.some(([id])=>id===value.ratio)||value.dark!==undefined&&typeof value.dark!=='boolean'||value.colorMode!==undefined&&!['categorical','emphasis'].includes(value.colorMode))fail(uiText('品牌画幅、背景或用色方式无效。'));
  return {kind:'forma-brand',version:1,id:value.id,...stamp,palette:normalizePalette(value.palette),dark:value.dark===true,ratio:value.ratio,...(colors?{colors}:{}),...(value.colorMode?{colorMode:value.colorMode}:{})};
}
export function brandFromOptions(options={},name=options.brand?.name||uiText('我的品牌')){
  return cleanBrandProfile({kind:'forma-brand',version:1,id:`brand:${crypto.randomUUID()}`,name,typography:options.brand?.typography||'sans',logo:options.brand?.logo,palette:options.palette,dark:options.dark,colors:options.colors,colorMode:options.colorMode,ratio:options.ratio||'wide'});
}
function selectedStyle(options){
  return {...Object.fromEntries(keys.filter(k=>Object.hasOwn(options,k)).map(k=>[k,clone(options[k])])),...(options.exportSettings?{exportRatio:options.exportSettings.ratio}: {})};
}
function restoreStyle(options,style){
  const result=clone(options);for(const k of keys){delete result[k];if(Object.hasOwn(style,k))result[k]=clone(style[k]);}
  if(result.exportSettings){if(Object.hasOwn(style,'exportRatio'))result.exportSettings.ratio=style.exportRatio;else delete result.exportSettings.ratio;}
  return result;
}
export function applyBrandStyle(work,value,stepIds){
  const profile=cleanBrandProfile(value),ids=new Set(stepIds),known=new Set(work.steps.map(s=>s.id));
  if(!ids.size||[...ids].some(id=>!known.has(id)))fail(uiText('应用范围已经变化，请重新选择步骤。'));
  const result=clone(work),entries=[];
  for(const s of result.steps){if(!ids.has(s.id))continue;const before=selectedStyle(s.options),next={...before,palette:profile.palette,dark:profile.dark,ratio:profile.ratio,brand:cleanBrandStamp(profile)};
    for(const k of ['colors','colorMode']){delete next[k];if(profile[k]!==undefined)next[k]=clone(profile[k]);}
    if(s.options.exportSettings)next.exportRatio=profile.ratio;
    s.options=restoreStyle(s.options,next);entries.push({id:s.id,before,after:selectedStyle(s.options)});
  }
  result.updated=Date.now();return {work:result,transaction:{workId:work.id,name:profile.name,entries}};
}
export function undoBrandStyle(work,transaction){
  if(!transaction||transaction.workId!==work.id)fail(uiText('这次品牌应用不属于当前作品。'));
  for(const e of transaction.entries){const step=work.steps.find(s=>s.id===e.id);if(!step||JSON.stringify(selectedStyle(step.options))!==JSON.stringify(e.after))fail(uiText('应用后的样式或步骤已有变化，未覆盖后续编辑。可在「版本与备份」恢复先前版本。'));}
  const result=clone(work);for(const e of transaction.entries){const s=result.steps.find(s=>s.id===e.id);s.options=restoreStyle(s.options,e.before);}result.updated=Date.now();return result;
}
export function brandFonts(options={}){return options.brand?brandTypefaces[options.brand.typography]||null:null;}
