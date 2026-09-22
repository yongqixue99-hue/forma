import {uiText,uiMarkup,uiMessage} from './locale.js';
import {sum} from 'd3';
const unique=a=>[...new Set(a)],key=(a,b)=>JSON.stringify([a,b]);
const dateOK=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const labelsOK=a=>Array.isArray(a)&&a.length===2&&a.every(v=>typeof v==='string'&&v.trim()&&v.length<=40)&&a[0]!==a[1];
export function validateVolume5(doc,{fail,count,noDuplicates,positive,allZero,warnings}){
  const rows=doc.data,id=doc.template;
  const complete=(a,b)=>{noDuplicates(rows.map(r=>key(r[a],r[b])),uiMessage`${a} / ${b} 组合`);if(rows.length!==unique(rows.map(r=>r[a])).length*unique(rows.map(r=>r[b])).length)fail(uiText('每个类别必须包含完整的系列组合，缺失不可省略。'));};
  if(id==='groupedbar'){count(unique(rows.map(r=>r.label)).length,3,8,uiText('类别'));count(unique(rows.map(r=>r.series)).length,2,4,uiText('系列'));complete('label','series');}
  if(id==='ribbon'||id==='trajectory'){
    count(rows.length,6,id==='ribbon'?48:30,uiText('日期'));noDuplicates(rows.map(r=>r.period),uiText('日期'));
    if(rows.some(r=>!dateOK(r.period)))fail(uiText('period 必须是有效的 YYYY-MM-DD 日期。'));
    warnings.push(uiText('日期按实际时间排序，间距按真实时间计算。'));
  }
  if(id==='ribbon'){
    if(typeof doc.intervalLabel!=='string'||!doc.intervalLabel.trim()||doc.intervalLabel.length>80)fail(uiText('需要 intervalLabel 注明上下界的含义。'));
    if(rows.some(r=>[r.estimate,r.low,r.high].some(v=>v===null)&&![r.estimate,r.low,r.high].every(v=>v===null)))fail(uiText('缺失观测的 estimate、low、high 必须同时为 null。'));
    if(rows.some(r=>r.estimate!==null&&(r.low>r.estimate||r.estimate>r.high)))fail(uiText('区间必须满足 low ≤ estimate ≤ high。'));
    if(rows.filter(r=>r.estimate!==null).length<2)fail(uiText('至少需要两个有效观测。'));
  }
  if(id==='heatmap'){count(unique(rows.map(r=>r.row)).length,3,8,uiText('行'));count(unique(rows.map(r=>r.column)).length,3,10,uiText('列'));complete('row','column');if(rows.every(r=>r.value===null))fail(uiText('至少需要一个有效数值。'));}
  if(id==='pyramid'){count(rows.length,4,10,uiText('类别'));noDuplicates(rows.map(r=>r.label),uiText('类别'));if(rows.some(r=>r.left<0||r.right<0))fail(uiText('left 和 right 必须为非负数。'));if(!labelsOK(doc.sideLabels))fail(uiText('sideLabels 必须是两个不同的组名。'));}
  if(id==='rose'){count(rows.length,4,12,uiText('类别'));positive('value',true);allZero();noDuplicates(rows.map(r=>r.label),uiText('类别'));}
  if(id==='icicle'){const groups=unique(rows.map(r=>r.parent));count(groups.length,2,6,uiText('父分类'));count(rows.length,6,24,uiText('子项'));groups.forEach(g=>count(rows.filter(r=>r.parent===g).length,2,6,uiMessage`「${g}」子项`));positive();noDuplicates(rows.map(r=>key(r.parent,r.label)),uiText('同一父分类内的子项'));}
  if(id==='radar'){count(unique(rows.map(r=>r.series)).length,2,4,uiText('系列'));count(unique(rows.map(r=>r.axis)).length,4,8,uiText('维度'));complete('series','axis');if(typeof doc.max!=='number'||!Number.isFinite(doc.max)||doc.max<=0||doc.max>1e15)fail(uiText('max 必须是大于零、不超过 10¹⁵ 的统一量程上限。'));else if(rows.some(r=>r.value<0||r.value>doc.max))fail(uiText('value 必须在 0 和 max 之间。'));}
  if(id==='trajectory'&&(!doc.axes||['x','y'].some(a=>typeof doc.axes[a]!=='string'||!doc.axes[a].trim()||doc.axes[a].length>60)))fail(uiText('需要 axes.x 和 axes.y 注明两个指标及其单位。'));
}
export function icicleLayout(rows){const total=sum(rows,r=>r.value);let x=0;return {total,groups:unique(rows.map(r=>r.parent)).map(parent=>{const children=rows.filter(r=>r.parent===parent),value=sum(children,r=>r.value),group={parent,value,x,width:value/total,children:[]};let cx=x;group.children=children.map(row=>{const item={...row,x:cx,width:row.value/total};cx+=item.width;return item;});x+=group.width;return group;})};}
export function polarAreaRadius(value,max,radius){return radius*Math.sqrt(Math.max(0,value)/max);}
export function volume5Summary(doc,fmt){const d=doc.data;
  if(doc.template==='groupedbar')return {value:fmt(unique(d.map(r=>r.series)).length),unit:uiText('个系列'),label:uiText('共用零基线')};
  if(doc.template==='ribbon'){const end=[...d].filter(r=>r.estimate!==null).sort((a,b)=>a.period.localeCompare(b.period)).at(-1);return {value:fmt(end.estimate),unit:doc.unit,label:uiText('最新估计值')};}
  if(doc.template==='heatmap')return {value:fmt(d.filter(r=>r.value!==null).length),unit:uiText('格'),label:uiText('有效观测')};
  if(doc.template==='pyramid')return {value:fmt(sum(d,r=>r.left+r.right)),unit:doc.unit,label:uiText('两组总量')};
  if(doc.template==='rose'||doc.template==='icicle')return {value:fmt(sum(d,r=>r.value)),unit:doc.unit,label:uiText('总量')};
  if(doc.template==='radar')return {value:fmt(unique(d.map(r=>r.axis)).length),unit:uiText('个维度'),label:uiText('统一量程')};
  if(doc.template==='trajectory')return {value:fmt(d.length),unit:uiText('个观测'),label:uiText('按日期连接')};
  return null;
}
