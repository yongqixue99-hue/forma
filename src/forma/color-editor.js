import {uiText,uiMarkup,uiMessage} from './locale.js';
import {palettes,configuredColors,normalizePalette} from './palettes.js';
import {findTemplate} from './catalog.js';
import {escapeHtml as esc} from './data.js';
import {colorSubjects,fixedColorBindings,resolveBoundColor,chartTheme,valueColorTemplates} from './color-semantics.js';
import './color-editor.css';

export function colorGroups(doc){
  const t=findTemplate(doc.template),row=doc.data[0]||{};
  if(doc.template==='edgebundle')return [...new Set(doc.data.flatMap(r=>[r.sourceGroup,r.targetGroup]))];
  if(doc.template==='parallelsets')return [...new Set(doc.data.map(r=>r.a))];
  const key=['series','group','model','parent'].find(k=>Object.hasOwn(row,k));
  if(key)return [...new Set(doc.data.map(r=>String(r[key])))];
  if(['alluvial','chord','directedchord','network','arc'].includes(doc.template))return [...new Set(doc.data.flatMap(r=>[r.source,r.target]))];
  if(['pie','donut','column','bar','mosaic','waffle','lollipop','rose','circlepack','diverging','pareto'].includes(doc.template))return doc.data.map(r=>r.label);
  if(t.family==='pie')return doc.data.map(r=>r.label);
  return [];
}
const hexColor=value=>/^#[0-9a-f]{6}$/i.test(value);
export function mountColorEditor(host,{getOptions,getDoc,onChange}){
  let alive=true,bindingsExpanded=false;
  function mappedControls(options){
    const subjects=colorSubjects(getDoc()),theme=chartTheme(getDoc(),options),scheme=options.valueColors,continuous=valueColorTemplates.has(getDoc().template);
    const bindings=subjects.length?uiMarkup`<details class="ce-bindings" ${bindingsExpanded?'open':''}><summary>类别颜色 <span>${subjects.length}</span></summary><p>按记录或实体身份固定，改名和重排后保持颜色。</p><div class="ce-binding-actions"><button data-color-action="pin">固定类别颜色</button><button data-color-action="unpin" ${options.colorBindings?.length?'':'disabled'}>恢复色板顺序</button></div><div class="ce-binding-list">${subjects.map((subject,i)=>uiMarkup`<label><span>${esc(subject.label)}</span><input type="color" value="${resolveBoundColor(options,subject.id,theme.color(i))}" data-color-subject="${esc(subject.id)}" aria-label="${esc(subject.label)}"></label>`).join('')}</div></details>`:'';
    const ramp=continuous?uiMarkup`<div class="ce-value-scale"><label>数值色阶<select data-color-scale><option value="auto" ${!scheme?'selected':''}>跟随图表</option><option value="sequential" ${scheme?.mode==='sequential'?'selected':''}>从低到高</option><option value="diverging" ${scheme?.mode==='diverging'?'selected':''}>围绕参考值</option></select></label>${scheme?uiMarkup`<div class="ce-ramp" style="background:linear-gradient(90deg,${scheme.low},${scheme.mode==='diverging'?scheme.middle+',':''}${scheme.high})"></div><div class="ce-ramp-inputs">${[['low',uiText('低值')],...(scheme.mode==='diverging'?[['middle',uiText('参考值')]]:[]),['high',uiText('高值')]].map(([key,label])=>uiMarkup`<label>${label}<input type="color" data-color-stop="${key}" value="${scheme[key]}"></label>`).join('')}${scheme.mode==='diverging'?uiMarkup`<label>中心<input type="number" step="any" data-color-center value="${scheme.center}"></label>`:''}</div><p>色阶与图中数值、图例共用范围；缺失值保留缺失标记。</p>`:''}</div>`:'';return ramp+bindings;
  }
  function render(){
    if(!alive)return;const previous=host.querySelector('.ce-bindings');if(previous)bindingsExpanded=previous.open;const options=getOptions(),colors=configuredColors(options),allGroups=colorGroups(getDoc()),palette=palettes[normalizePalette(options.palette)],emphasis=['column','bar'].includes(getDoc().template)&&(options.colorMode==='emphasis'||!options.colorMode&&!options.colors&&!palette.categorical),groups=emphasis?[]:allGroups;
    host.innerHTML=uiMarkup`<div class="ce-heading"><strong>${options.colors?uiText('自定义色板'):uiText(palette.name)}</strong><span>${colors.length} 种颜色</span><button data-color-action="reset">恢复预设</button></div><div class="ce-controls"><label>颜色数量<select data-color-count aria-label="颜色数量">${Array.from({length:12},(_,i)=>uiMarkup`<option value="${i+1}" ${colors.length===i+1?'selected':''}>${i+1} 种</option>`).join('')}</select></label>${['column','bar'].includes(getDoc().template)?uiMarkup`<label>使用方式<select data-color-mode aria-label="颜色使用方式"><option value="categorical" ${options.colorMode==='categorical'||options.colorMode!=='emphasis'&&(options.colors||palette.categorical)?'selected':''}>按类别配色</option><option value="emphasis" ${options.colorMode==='emphasis'||!options.colorMode&&!options.colors&&!palette.categorical?'selected':''}>强调重点</option></select></label>`:''}</div><div class="ce-swatches">${colors.map((color,i)=>uiMarkup`<div class="ce-color"><label class="ce-chip"><span class="sr-only">第 ${i+1} 种颜色</span><input type="color" data-color-index="${i}" value="${color}" aria-label="第 ${i+1} 种颜色"></label><input class="ce-hex" data-color-hex="${i}" value="${color.toUpperCase()}" maxlength="7" spellcheck="false" aria-label="第 ${i+1} 种颜色 HEX"><button data-color-remove="${i}" ${colors.length===1?'disabled':''} aria-label="删除第 ${i+1} 种颜色">×</button></div>`).join('')}<button class="ce-add" data-color-action="add" ${colors.length===12?'disabled':''}>＋ 添加颜色</button></div><p class="ce-note" role="status">${options.colorBindings?.length?uiText('已固定类别颜色，色板顺序不会覆盖已指定的颜色。'):groups.length?uiMessage`${groups.length} 个类别或系列，按首次出现的顺序用色。${groups.length>colors.length?uiText('超出色板数量时依序循环；也可增加颜色。'):uiText('颜色数量可以多于类别，保留作后续使用。')}`:emphasis?uiText('当前用主色强调重点，其余类别使用中性色；可切换为按类别配色。'):uiText('单序列图使用主色强调；连续数值图保留明暗层次，颜色数量不等同于数据行数。')}</p>${mappedControls(options)}${groups.length&&!options.colorBindings?.length?uiMarkup`<div class="ce-mapping" aria-label="类别用色顺序">${groups.slice(0,20).map((name,i)=>`<span><i style="background:${colors[i%colors.length]}"></i>${esc(name)}</span>`).join('')}${groups.length>20?uiMarkup`<span>另 ${groups.length-20} 类</span>`:''}</div>`:''}`;
  }
  function update(colors,refresh=true){const options={...getOptions(),colors};if(['column','bar'].includes(getDoc().template)&&!options.colorMode)options.colorMode='categorical';onChange(options);if(refresh)render();}
  function resize(count){const current=configuredColors(getOptions()),base=palettes[normalizePalette(getOptions().palette)].colors;update(Array.from({length:count},(_,i)=>current[i]||base[i%base.length]));}
  function change(e){
    if(e.target.matches('[data-color-scale]')){const options={...getOptions()};if(e.target.value==='auto')delete options.valueColors;else options.valueColors={mode:e.target.value,low:e.target.value==='sequential'?'#edf0f1':'#527b91',middle:'#eeeae2',high:e.target.value==='sequential'?'#365f7a':'#c66a51',center:0};onChange(options);render();return;}
    if(e.target.matches('[data-color-center]')){const value=e.target.value.trim()===''?NaN:Number(e.target.value);if(!Number.isFinite(value)){e.target.setAttribute('aria-invalid','true');return;}const options={...getOptions(),valueColors:{...getOptions().valueColors,center:value}};onChange(options);render();return;}
    if(e.target.matches('[data-color-count]'))resize(Number(e.target.value));
    else if(e.target.matches('[data-color-mode]')){onChange({...getOptions(),colorMode:e.target.value});render();}
    else if(e.target.matches('[data-color-index],[data-color-hex]')){const value=e.target.value;if(!/^#[\da-f]{6}$/i.test(value)){e.target.setAttribute('aria-invalid','true');host.querySelector('.ce-note').textContent=uiText('请输入完整的六位 HEX 色值，例如 #526B82。');return;}const colors=configuredColors(getOptions());colors[Number(e.target.dataset.colorIndex??e.target.dataset.colorHex)]=value.toLowerCase();update(colors);}
  }
  function input(e){
    if(e.target.matches('[data-color-subject]')){const options={...getOptions(),colorMode:'categorical'},current=options.colorBindings?.length?[...options.colorBindings]:fixedColorBindings(getDoc(),options),id=e.target.dataset.colorSubject;colorSubjects(getDoc()).some(s=>s.id===id)&&hexColor(e.target.value)&&onChange({...options,colorBindings:[...current.filter(r=>r.id!==id),{id,color:e.target.value}]});return;}
    if(e.target.matches('[data-color-stop]')){const key=e.target.dataset.colorStop;if(!['low','middle','high'].includes(key)||!hexColor(e.target.value))return;const options={...getOptions(),valueColors:{...getOptions().valueColors,[key]:e.target.value}};onChange(options);const ramp=host.querySelector('.ce-ramp');if(ramp)ramp.style.background=`linear-gradient(90deg,${options.valueColors.low},${options.valueColors.mode==='diverging'?options.valueColors.middle+',':''}${options.valueColors.high})`;return;}
    if(!e.target.matches('[data-color-index],[data-color-hex]')||!/^#[\da-f]{6}$/i.test(e.target.value))return;
    const index=Number(e.target.dataset.colorIndex??e.target.dataset.colorHex),colors=configuredColors(getOptions());colors[index]=e.target.value.toLowerCase();update(colors,false);
    e.target.removeAttribute('aria-invalid');host.querySelector('.ce-heading strong').textContent=uiText('自定义色板');
    const color=host.querySelector(`[data-color-index="${index}"]`),hex=host.querySelector(`[data-color-hex="${index}"]`);if(color!==e.target)color.value=colors[index];if(hex!==e.target)hex.value=colors[index].toUpperCase();
    host.querySelectorAll('.ce-mapping i').forEach((el,i)=>el.style.background=colors[i%colors.length]);
  }
  function click(e){const remove=e.target.closest('[data-color-remove]'),action=e.target.closest('[data-color-action]')?.dataset.colorAction;
    if(action==='pin'){onChange({...getOptions(),colorMode:'categorical',colorBindings:fixedColorBindings(getDoc(),getOptions())});render();return;}
    if(action==='unpin'){const options={...getOptions()};delete options.colorBindings;onChange(options);render();return;}
    if(remove){const colors=configuredColors(getOptions());if(colors.length>1){colors.splice(Number(remove.dataset.colorRemove),1);update(colors);}}
    else if(action==='add')resize(Math.min(12,configuredColors(getOptions()).length+1));
    else if(action==='reset'){const options={...getOptions()};delete options.colors;delete options.colorMode;delete options.colorBindings;delete options.valueColors;onChange(options);render();}
  }
  host.classList.add('color-editor');host.addEventListener('input',input);host.addEventListener('change',change);host.addEventListener('click',click);render();
  return{render,destroy(){alive=false;host.removeEventListener('input',input);host.removeEventListener('change',change);host.removeEventListener('click',click);}};
}
