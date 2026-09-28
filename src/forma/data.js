import {validateVolume14,volume14Summary} from './volume14-data.js';
import {validateVolume15,volume15Summary} from './volume15-data.js';
import {validateVolume16,volume16Summary} from './volume16-data.js';
import {validateVolume10,volume10Summary} from './volume10-data.js';
import {validateVolume11,volume11Summary} from './volume11-data.js';
import {validateVolume12,volume12Summary} from './volume12-data.js';
import {validateVolume13,volume13Summary} from './volume13-data.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import {entityProblems} from './entity-identity.js';
import {fieldProblem,recordProblems} from './data-contract.js';
import { validateVolume9, volume9Summary } from './volume9-data.js';
import { validateVolume8, volume8Summary } from './volume8-data.js';
import { validateVolume7, volume7Summary } from './volume7-data.js';
import { validateVolume6, volume6Summary } from './volume6-data.js';
import { validateVolume5, volume5Summary } from './volume5-data.js';
import { validateVolume4, volume4Summary } from './volume4-data.js';
import { validateAtlas, atlasSummary } from './atlas-data.js';
import { csvParse, csvFormat, sum, mean } from 'd3';
import { catalog, findTemplate } from './catalog.js';
import { validateEditorial, editorialSummary } from './editorial-data.js';

const unique = a => [...new Set(a)];
const nonempty = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 80;
const num = v => typeof v === 'number' && Number.isFinite(v);
export const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export {formatNumber as fmt} from './number-format.js';
import {formatNumber as fmt} from './number-format.js';

export function validateDocument(doc,{layout=true}={}) {
  const result=checkDocument(doc),layoutErrors=result.layoutErrors||[];
  return {...result,dataValid:!result.errors.length,layoutValid:!layoutErrors.length,layoutErrors,
    valid:!result.errors.length&&(!layout||!layoutErrors.length),
    errors:layout?[...result.errors,...layoutErrors]:result.errors};
}
function checkDocument(doc) {
  const errors=[], warnings=[],layoutErrors=[];
  const fail = s => { if(!errors.includes(s)) errors.push(s); };
  if(!doc || typeof doc!=='object' || Array.isArray(doc)) return {valid:false,errors:[uiText('需要一个完整的图表 JSON 对象。')],warnings};
  const t=findTemplate(doc.template);
  if(!t) return {valid:false,errors:[uiText('无法识别 template，请从图表目录选择模板。')],warnings};
  if(doc.version!==1) fail(uiText('version 必须为 1。'));
  if(!nonempty(doc.title)) fail(uiText('请填写 1–80 字的标题。'));
  if(typeof doc.subtitle!=='string' || doc.subtitle.length>160) fail(uiText('subtitle 必须为不超过 160 字的文本。'));
  if(!nonempty(doc.unit)) fail(uiText('请明确 unit（数据单位）。'));
  if(!nonempty(doc.source?.name)) fail(uiText('请注明 source.name（数据来源或采集说明）。'));
  if(!['demo','user','public'].includes(doc.source?.type)) fail(uiText('source.type 必须为 demo、user 或 public。'));
  if(doc.source?.url && !/^https?:\/\//i.test(doc.source.url)) fail(uiText('来源链接需要以 https:// 或 http:// 开头。'));
  if(!Array.isArray(doc.data)||!doc.data.length) return {valid:false,errors:[...errors,uiText('data 必须包含至少一条记录。')],warnings};
  if(doc.data.length>1500) return {valid:false,errors:[...errors,uiText('单张图最多接收 1,500 条记录。')],warnings};
  if(doc.data.some(r=>!r || typeof r!=='object' || Array.isArray(r))) return {valid:false,errors:[...errors,uiText('每一行数据都必须是对象。')],warnings};
  const rows=doc.data;
  entityProblems(doc).forEach(e=>fail(e.message));
  for(const [field,type] of t.fields) {
    if(type.startsWith('YYYY')&&rows.some(r=>fieldProblem(r[field],type,{doc,key:field})))fail(uiMessage`${field} 必须是有效的 ${type} 日期。`);
    if(type==='string' && rows.some(r=>!nonempty(r[field]))) fail(uiMessage`${field} 必须是 1–80 字的文本。`);
    if(type==='number' && rows.some(r=>!num(r[field]))) fail(uiMessage`${field} 必须是有限数值，不能是空白或字符串。`);
    if(type==='number | null' && rows.some(r=>r[field]!==null&&!num(r[field]))) fail(uiMessage`${field} 必须是有限数值或 null。`);
  }
  if(rows.some(r=>Object.values(r).some(v=>typeof v==='number'&&Math.abs(v)>1e15)))fail(uiText('数值绝对值不能超过 10¹⁵，请先换算数据单位。'));
  if(errors.length) return {valid:false,errors,warnings};
  const count = (n,min,max,label) => { if(n<min||n>max) layoutErrors.push(uiMessage`当前图型的${label}展示范围为 ${min}–${max} 项，现有 ${n} 项；数据完整保留。`); };
  const noDuplicates = (keys,label) => { if(unique(keys).length!==keys.length) fail(uiMessage`${label}不可重复。`); };
  const positive = (key='value',zero=false) => { if(rows.some(r=>r[key]!==null && (zero?r[key]<0:r[key]<=0))) fail(uiMessage`${key} 必须${zero?uiText('大于或等于'):uiText('大于')} 0。`); };
  const keyPair = (a,b) => JSON.stringify([a,b]);
  const allZero = () => { if(!rows.some(r=>num(r.value)&&r.value!==0)) fail(uiText('至少需要一个非零数值。')); };
  if(['tide','race'].includes(t.id)) {
    const periods=unique(rows.map(r=>r.period)), series=unique(rows.map(r=>r.series));
    count(periods.length,2,t.id==='tide'?60:10,uiText('时期'));
    count(series.length,t.id==='tide'?1:2,6,uiText('序列'));
    if(series.some(x=>x.length>14)) warnings.push(uiText('系列名称超过 14 字时会缩略显示，完整名称保留在表格和提示中。'));
    noDuplicates(rows.map(r=>keyPair(r.period,r.series)),uiText('同一时期的同一序列'));
    if(t.id==='race' && rows.length!==periods.length*series.length) fail(uiText('排名图要求每个时期都包含所有序列。'));
    if(t.id==='tide' && (rows.some(r=>r.value===null)||rows.length!==periods.length*series.length)) warnings.push(uiText('有缺失值：折线保留断点，不补零、不跨缺口连线。'));
    if(t.id==='tide' && !rows.some(r=>num(r.value))) fail(uiText('至少需要一个有效数值。'));
    warnings.push(uiText('时期按首次出现的顺序、等间距排列；请保证时间间隔一致。'));
  }
  if(t.id==='orbit') { count(rows.length,8,80,uiText('周期记录')); positive('value',true); allZero(); noDuplicates(rows.map(r=>r.period),uiText('周期')); warnings.push(uiText('径向柱以长度编码数值，按输入顺序等角度排列；请保证等间隔。')); }
  if(t.id==='alluvial') {
    positive();
    const nodes=unique(rows.flatMap(r=>[r.source,r.target]));
    count(nodes.length,2,16,uiText('节点')); count(rows.length,1,40,uiText('流向'));
    noDuplicates(rows.map(r=>keyPair(r.source,r.target)),uiText('相同的起点与终点'));
    const adj=Object.fromEntries(nodes.map(n=>[n,[]]));
    for(const r of rows) { if(r.source===r.target) fail(uiText('桑基图不接受自循环。')); adj[r.source].push(r.target); }
    const visited=new Set(),visiting=new Set();
    function visit(n) { if(visiting.has(n)) { fail(uiText('桑基图存在循环；请改用适合网络关系的图型。')); return; } if(visited.has(n))return; visiting.add(n); adj[n].forEach(visit); visiting.delete(n); visited.add(n); }
    nodes.forEach(visit);
    nodes.forEach(n=>{const a=sum(rows.filter(r=>r.target===n),r=>r.value),b=sum(rows.filter(r=>r.source===n),r=>r.value);if(a>0&&b>0&&Math.abs(a-b)>Math.max(1,a,b)*1e-6) fail(uiMessage`节点「${n}」不守恒：流入 ${fmt(a)}，流出 ${fmt(b)}。请补充流失或去向。`);});
  }
  if(t.id==='ridges') { const groups=unique(rows.map(r=>r.group)); count(groups.length,2,6,uiText('分组')); count(rows.length,24,1200,uiText('样本')); if(groups.some(g=>rows.filter(r=>r.group===g).length<12)) fail(uiText('每组至少需要 12 个原始样本。')); }
  if(t.id==='scatter') {count(rows.length,3,120,uiText('对象'));count(unique(rows.map(r=>r.group)).length,1,6,uiText('类别'));positive('size'); noDuplicates(rows.map(r=>r.label),uiText('对象名称'));if(!nonempty(doc.axes?.x)||!nonempty(doc.axes?.y)||!nonempty(doc.axes?.size))fail(uiText('气泡图需要 axes.x、axes.y、axes.size，分别写明维度与单位。'));}
  if(t.id==='calendar') {
    positive('value',true);noDuplicates(rows.map(r=>r.date),uiText('日期'));
    const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
    if(rows.some(r=>!validDate(r.date)))fail(uiText('date 必须是有效的 YYYY-MM-DD 日期。'));
    else {const dates=rows.map(r=>Date.parse(r.date));const days=Math.round((Math.max(...dates)-Math.min(...dates))/86400000)+1;if(days>366)fail(uiText('日历图最多展示连续 366 天。'));if(days!==rows.length||rows.some(r=>r.value===null))warnings.push(uiText('未采集的日期以斜线纹理显示，零值以浅色显示。'));}
    if(!rows.some(r=>num(r.value)))fail(uiText('至少需要一天的有效数值。'));
  }
  if(t.id==='waterfall') {
    count(rows.length,4,12,uiText('项目')); noDuplicates(rows.map(r=>r.label),uiText('项目名称'));
    if(rows[0].kind!=='total'||rows.at(-1).kind!=='total'||rows.slice(1,-1).some(r=>r.kind!=='change')) fail(uiText('瀑布图首尾必须为 total，中间项目必须为 change。'));
    const calculated=rows[0].value+sum(rows.slice(1,-1),r=>r.value);
    if(Math.abs(calculated-rows.at(-1).value)>Math.max(1,Math.abs(calculated))*1e-6)fail(uiMessage`总计不一致：累计结果应为 ${fmt(calculated)}，当前期末为 ${fmt(rows.at(-1).value)}。`);
  }
  if(['mosaic','waffle'].includes(t.id)) {count(rows.length,t.id==='mosaic'?3:2,t.id==='mosaic'?12:6,uiText('类别'));positive('value',t.id==='waffle');noDuplicates(rows.map(r=>r.label),uiText('类别名称'));if(t.id==='waffle'&&Math.abs(sum(rows,r=>r.value)-100)>1e-6)fail(uiMessage`百分比合计必须为 100，当前为 ${fmt(sum(rows,r=>r.value))}。`);if(t.id==='waffle'&&doc.unit!=='%')fail(uiText('百格图的 unit 必须为 %。'));}
  if(t.id==='chord') {positive(); count(unique(rows.flatMap(r=>[r.source,r.target])).length,3,8,uiText('节点'));count(rows.length,2,28,uiText('关系'));if(rows.some(r=>r.source===r.target))fail(uiText('弦图不接受自身连接。'));noDuplicates(rows.map(r=>JSON.stringify([r.source,r.target].sort())),uiText('同一对无向关系'));}
  if(t.id==='dumbbell') {count(rows.length,3,10,uiText('对象'));noDuplicates(rows.map(r=>r.label),uiText('对象名称'));}
  validateEditorial(doc,{fail,count,noDuplicates,positive,allZero,warnings});
  validateVolume10(doc,{fail,count,noDuplicates,positive,allZero,warnings});
  validateVolume11(doc,{fail,count,noDuplicates,positive,allZero,warnings});
  validateVolume12(doc,{fail,count,noDuplicates,positive,allZero,warnings});
  validateVolume13(doc,{fail,count,noDuplicates,positive,allZero,warnings});
  validateVolume14(doc,{fail,count,noDuplicates,positive,allZero,warnings});
  validateVolume15(doc,{fail,count,noDuplicates,positive,allZero,warnings});
  validateVolume16(doc,{fail,count,noDuplicates,positive,allZero,warnings});
  validateVolume9(doc,{fail,count,noDuplicates,positive,allZero,warnings});
  validateVolume8(doc,{fail,count,noDuplicates,positive,allZero,warnings});
  validateVolume7(doc,{fail,count,noDuplicates,positive,allZero,warnings});
  validateVolume6(doc,{fail,count,noDuplicates,positive,allZero,warnings});
  validateVolume5(doc,{fail,count,noDuplicates,positive,allZero,warnings});
  validateVolume4(doc,{fail,count,noDuplicates,positive,allZero,warnings});
  validateAtlas(doc,{fail,count,noDuplicates,positive,allZero,warnings});
  recordProblems(doc,t.fields).forEach(e=>fail(e.message));
  if(rows.some(r=>t.fields.some(([key])=>typeof r[key]==='string'&&r[key].length>24))) warnings.push(uiText('部分标签较长，画面中会适当截短；完整内容保留在悬浮提示与数据表中。'));
  return {errors,warnings,layoutErrors};
}

export function parseDataText(text,doc,format='json') {
  if(format==='json') {
    const parsed=JSON.parse(text);
    return Array.isArray(parsed)?{...structuredClone(doc),data:parsed}:parsed;
  }
  const fields=findTemplate(doc.template).fields;
  const data=csvParse(text.trim(),row=>Object.fromEntries(Object.entries(row).map(([key,value])=>{
    const f=fields.find(f=>f[0]===key);
    if(f&&f[1].includes('number')) return [key,value.trim()==='' ? (f[1].includes('null')?null:NaN) : Number(value)];
    return [key,value.trim()];
  })));
  return {...structuredClone(doc),data:Array.from(data)};
}
export const toCSV = doc => csvFormat(doc.data);

export function recommend(query) {
  const q=String(query).toLowerCase();
  return catalog.map(t=>({template:t.id,name:t.name,type:t.type,score:t.keywords.split(' ').filter(k=>q.includes(k.toLowerCase())).length + (q.includes(t.name)?3:0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
}

export function summary(doc) {
  const d=doc.data;
  const volume10=volume10Summary(doc,fmt);if(volume10)return volume10;
  const volume11=volume11Summary(doc,fmt);if(volume11)return volume11;
  const volume12=volume12Summary(doc,fmt);if(volume12)return volume12;
  const volume13=volume13Summary(doc,fmt);if(volume13)return volume13;
  const volume14=volume14Summary(doc,fmt);if(volume14)return volume14;
  const volume15=volume15Summary(doc,fmt);if(volume15)return volume15;
  const volume16=volume16Summary(doc,fmt);if(volume16)return volume16;
  const volume9=volume9Summary(doc,fmt);if(volume9)return volume9;
  const volume8=volume8Summary(doc,fmt);if(volume8)return volume8;
  const volume7=volume7Summary(doc,fmt);if(volume7)return volume7;
  const volume6=volume6Summary(doc,fmt);if(volume6)return volume6;
  const volume5=volume5Summary(doc,fmt);if(volume5)return volume5;
  const volume4=volume4Summary(doc,fmt);if(volume4)return volume4;
  const atlas=atlasSummary(doc,fmt);if(atlas)return atlas;
  const editorial=editorialSummary(doc,fmt);if(editorial)return editorial;
  if(doc.template==='tide') {const name=d[0].series,points=d.filter(r=>r.series===name&&num(r.value)),last=points.at(-1);return {value:fmt(last?.value||0),label:uiMessage`${name} · 最新一期`,unit:doc.unit};}
  if(doc.template==='orbit') return {value:fmt(sum(d,r=>r.value)),label:uiMessage`${d.length} 个周期 · 合计`,unit:doc.unit};
  if(doc.template==='alluvial') {const targets=new Set(d.map(r=>r.target));return {value:fmt(sum(d.filter(r=>!targets.has(r.source)),r=>r.value)),label:uiText('起点总流量'),unit:doc.unit};}
  if(doc.template==='ridges') return {value:fmt(d.length),label:uiMessage`${unique(d.map(r=>r.group)).length} 组原始记录`,unit:uiText('个样本')};
  if(doc.template==='race') return {value:fmt(unique(d.map(r=>r.series)).length),label:uiMessage`${unique(d.map(r=>r.period)).length} 个时期 · 排名演变`,unit:uiText('个系列')};
  if(doc.template==='scatter') return {value:fmt(d.length),label:uiText('位置 × 位置 × 面积'),unit:uiText('个对象')};
  if(doc.template==='calendar') return {value:fmt(sum(d,r=>r.value??0)),label:uiMessage`${d.filter(r=>r.value!==null).length} 天已记录 · 合计`,unit:doc.unit};
  if(doc.template==='waterfall') return {value:fmt(d.at(-1).value),label:uiMessage`净变化 ${d.at(-1).value-d[0].value>=0?'+':''}${fmt(d.at(-1).value-d[0].value)} ${doc.unit}`,unit:doc.unit};
  if(doc.template==='mosaic') return {value:fmt(sum(d,r=>r.value)),label:uiMessage`${d.length} 个类别 · 合计`,unit:doc.unit};
  if(doc.template==='chord') return {value:fmt(sum(d,r=>r.value)),label:uiText('全部无向关系 · 合计'),unit:doc.unit};
  if(doc.template==='waffle') {const max=d.reduce((a,b)=>a.value>b.value?a:b);return {value:fmt(max.value),label:uiMessage`${max.label} · 最大占比`,unit:'%'};}
  return {value:`${mean(d,r=>r.after-r.before)>=0?'+':''}${fmt(mean(d,r=>r.after-r.before))}`,label:uiText('平均变化'),unit:doc.unit};
}
