import {uiText,uiMarkup,uiMessage} from './locale.js';
import {brandFonts,cleanBrandLogo} from './brand-style.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// SVG-local CSS also survives serialization into PNG / video frames.
export function applyChartBrand(svg,options={}){
  if(!svg)return;const fonts=brandFonts(options);let style=svg.querySelector(':scope > style[data-brand-type]');
  if(!fonts){style?.remove();svg.removeAttribute('data-brand-type');return;}
  const key=options.brand.typography;svg.setAttribute('data-brand-type',key);
  if(!style){style=svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg','style');style.setAttribute('data-brand-type','');svg.prepend(style);}
  const css=`svg[data-brand-type="${key}"] text{font-family:${fonts.body}!important}`;if(style.textContent!==css)style.textContent=css;
}
const logoCache=new WeakMap();
function checkedLogo(value){
  const old=logoCache.get(value);if(old&&old.data===value.data&&old.width===value.width&&old.height===value.height&&old.name===value.name)return old;
  const logo=cleanBrandLogo(value);logoCache.set(value,logo);return logo;
}
export function applyFrameBrand(root,options={},titleSelector='h2'){
  const fonts=brandFonts(options),title=root.querySelector(titleSelector),header=root.querySelector('header');
  root.style.fontFamily=fonts?.body||'';if(title)title.style.fontFamily=fonts?.title||'';
  if(!header)return;let logo=header.querySelector('[data-brand-logo]'),style=root.querySelector('style[data-brand-frame]');
  if(!options.brand?.logo){logo?.remove();style?.remove();header.removeAttribute('data-brand-heading');return;}
  const image=checkedLogo(options.brand.logo);header.setAttribute('data-brand-heading','');
  if(!style){style=root.ownerDocument.createElement('style');style.setAttribute('data-brand-frame','');style.textContent='header[data-brand-heading]{display:grid;grid-template-columns:minmax(0,1fr) 96px;column-gap:12px;align-items:center}header[data-brand-heading]>:not([data-brand-logo]){grid-column:1/-1}header[data-brand-heading]>:first-child{grid-column:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}header[data-brand-heading]>[data-brand-logo]{grid-column:2;grid-row:1;width:96px;height:28px;object-fit:contain;object-position:right center}';root.append(style);}
  if(!logo){logo=root.ownerDocument.createElement('img');logo.setAttribute('data-brand-logo','');header.append(logo);}
  if(logo.getAttribute('src')!==image.data)logo.src=image.data;logo.alt=image.name||uiText('品牌 Logo');
}
export function brandLogoSVG(options,x,y,width=96,height=28){
  if(!options?.brand?.logo)return '';const logo=checkedLogo(options.brand.logo);
  return `<image data-brand-logo="" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMaxYMid meet" href="${logo.data}"><title>${esc(logo.name)}</title></image>`;
}
