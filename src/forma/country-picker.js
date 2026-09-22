import {countryName,searchCountries,resolveCountry} from './country-input.js';
import {isEnglish} from './locale.js';

let serial=0;
export function mountCountryPicker(host,{cell,onChoose}){
  const doc=host.ownerDocument,win=doc.defaultView,events=new win.AbortController(),signal=events.signal,id=`forma-countries-${++serial}`;
  let panel=null,input=null,context=null,matches=[],index=-1;
  const t=(zh,en)=>isEnglish()?en:zh;
  function close(){panel?.remove();panel=null;if(input){input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');input.removeAttribute('aria-controls');}input=null;context=null;}
  function choose(country){const target=context;close();onChoose(target,country);}
  function render(target){
    const next=cell(target);if(!next){close();return;}input=target;context=next;
    panel?.remove();panel=doc.createElement('div');panel.className='dw-country-picker';panel.id=id;
    const list=doc.createElement('div');list.setAttribute('role','listbox');list.setAttribute('aria-label',t('选择地图地区','Choose a map region'));list.id=`${id}-list`;
    matches=searchCountries(input.value);index=-1;
    for(const [i,country] of matches.entries()){
      const button=doc.createElement('button');button.type='button';button.id=`${id}-${i}`;button.dataset.countryCode=country.code;button.setAttribute('role','option');button.setAttribute('aria-selected','false');
      button.textContent=`${countryName(country)} · ${country.code}`;button.addEventListener('click',()=>choose(country));list.append(button);
    }
    if(!matches.length){const empty=doc.createElement('p');empty.textContent=t('没有匹配的底图地区。可搜索中英文名称或两位、三位代码；小岛或微型国家可改用经纬度地图。','No matching map region. Search a country name or two-/three-letter code. For small islands or microstates, use the coordinate map.');list.append(empty);}
    const hint=doc.createElement('p');hint.textContent=t('底图覆盖 176 个地区 · 首字母筛选后请选择国家','176 mapped regions · Type to filter, then choose a country');panel.append(list,hint);host.append(panel);
    const rect=input.getBoundingClientRect(),width=Math.min(390,win.innerWidth-24),below=win.innerHeight-rect.bottom;
    Object.assign(panel.style,{width:`${width}px`,left:`${Math.max(12,Math.min(rect.left,win.innerWidth-width-12))}px`,...(below>=220?{top:`${rect.bottom+3}px`}:{bottom:`${win.innerHeight-rect.top+3}px`})});
    input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','true');
  }
  host.addEventListener('focusin',e=>{if(!panel?.contains(e.target))render(e.target);},{signal});
  host.addEventListener('input',e=>{if(!e.isComposing&&cell(e.target))render(e.target);},{signal});
  host.addEventListener('compositionend',e=>{if(cell(e.target))render(e.target);},{signal});
  host.addEventListener('keydown',e=>{
    if(e.target!==input||!panel)return;
    if(['ArrowDown','ArrowUp','Escape'].includes(e.key)||e.key==='Enter'&&(index>=0||resolveCountry(input.value))){
      e.preventDefault();e.stopImmediatePropagation();
      if(e.key==='Escape'){close();return;}
      if(e.key==='Enter'){choose(index>=0?matches[index]:resolveCountry(input.value));return;}
      if(!matches.length)return;index=index<0?(e.key==='ArrowDown'?0:matches.length-1):(index+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length;
      const options=panel.querySelectorAll('[role=option]');options.forEach((el,i)=>el.setAttribute('aria-selected',String(i===index)));input.setAttribute('aria-activedescendant',options[index].id);options[index].scrollIntoView({block:'nearest'});
    }
  },{signal,capture:true});
  doc.addEventListener('pointerdown',e=>{if(e.target!==input&&!panel?.contains(e.target))close();},{signal});
  win.addEventListener('resize',close,{signal});
  doc.addEventListener('scroll',e=>{if(panel&&!panel.contains(e.target))close();},{signal,capture:true});
  return{close,destroy(){close();events.abort();}};
}
