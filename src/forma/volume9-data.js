import {uiText,uiMarkup,uiMessage} from './locale.js';
import * as d3 from 'd3';
import {volume9Catalog} from './volume9-catalog.js';
const ids=new Set(volume9Catalog.map(t=>t.id)),unique=a=>[...new Set(a)],text=s=>typeof s==='string'&&s.trim().length>0&&s.length<=80;

export function table9(rows,column='label'){
  const columns=unique(rows.map(d=>d[column])),series=unique(rows.map(d=>d.series));
  const lookup=new Map(rows.map(d=>[JSON.stringify([d[column],d.series]),d.value]));
  return {columns,series,rows:columns.map(label=>{const values=series.map(s=>lookup.get(JSON.stringify([label,s])));return{label,values,total:d3.sum(values)};})};
}
export function normalized9(doc){
  const table=table9(doc.data,'period');
  return {...table,rows:table.rows.map(r=>({...r,shares:r.values.map(v=>v/r.total)}))};
}
export function change9(d){return{delta:d.value-d.previous,relative:d.previous>0?(d.value-d.previous)/d.previous:null};}

export function validateVolume9(doc,{fail,count,noDuplicates,positive,warnings}){
  const id=doc.template;if(!ids.has(id))return;
  const rows=doc.data,groupIds=['groupedbarh','stackedbar','percentcolumn','percentarea'];
  if(groupIds.includes(id)){
    const time=id.startsWith('percent'),table=table9(rows,time?'period':'label');
    count(table.columns.length,id==='percentarea'?3:2,{groupedbarh:8,stackedbar:10,percentcolumn:16,percentarea:60}[id],uiText('类别 / 时期'));
    count(table.series.length,2,id==='groupedbarh'?3:5,uiText('序列'));
    noDuplicates(rows.map(d=>JSON.stringify([d[time?'period':'label'],d.series])),uiText('同一类别的同一序列'));
    if(rows.length!==table.columns.length*table.series.length)fail(uiText('每个类别 / 时期必须包含全部序列；真实零值需要显式填写，缺失不能自动补零。'));
    positive('value',true);
    if(time&&table.rows.some(r=>r.total<=0))fail(uiText('百分比图每期总量必须大于零；零总量无法计算构成占比。'));
    if(time)warnings.push(uiText('占比按当期原始总量计算；unit 保留输入数据的单位，纵轴显示 %。提示中同时保留原值与总量。'));
  }else noDuplicates(rows.map(d=>d.period??d.label),uiText('时期 / 对象名称'));
  if(['column','bar'].includes(id))count(rows.length,2,24,uiText('类别'));
  if(['singleline','area'].includes(id)){
    count(rows.length,2,90,uiText('时期'));count(rows.filter(d=>d.value!==null).length,2,1500,uiText('有效观测'));
    if(id==='area')positive('value',true);
    if(rows.some(d=>d.value===null))warnings.push(uiText('缺失观测保留断点，不跨缺口连线，不补零。'));
  }
  if(['singleline','area','percentarea','comboline'].includes(id))warnings.push(uiText('横轴按输入顺序、等间距排列，请提供等时间间隔的数据。'));
  if(id==='xy'){count(rows.length,3,300,uiText('观测'));if(!text(doc.axes?.x)||!text(doc.axes?.y))fail(uiText('axes.x 和 axes.y 需要写明指标名称与单位。'));}
  if(id==='comboline'){
    count(rows.length,3,24,uiText('时期'));positive('bar',true);positive('line',true);
    if(rows.filter(d=>d.line!==null).length<2)fail(uiText('折线至少需要两个有效观测。'));
    if(!Array.isArray(doc.seriesLabels)||doc.seriesLabels.length!==2||doc.seriesLabels.some(s=>!text(s))||doc.seriesLabels[0]===doc.seriesLabels[1])fail(uiText('seriesLabels 需要两个不同名称，依次代表柱状和折线序列。'));
    warnings.push(uiText('柱和线必须具有相同单位，使用同一零基线纵轴；不支持双轴缩放。'));
  }
  if(id==='progress'){
    count(rows.length,1,10,uiText('目标'));positive('value',true);positive('target');
    if(rows.some(d=>!Number.isFinite(d.value/d.target)||d.value/d.target>1e6))fail(uiText('完成比例过大，请核对目标值与单位（最高支持 1,000,000 倍）。'));
    warnings.push(uiText('长度按完成值 / 目标值计算；所有行共用百分比尺度，超过 100% 的部分完整展示。'));
  }
  if(id==='kpi'){
    count(rows.length,1,4,uiText('指标'));if(rows.some(d=>d.metricUnit.length>12))fail(uiText('metricUnit 请控制在 12 字以内。'));
    if(rows.some(d=>d.previous>0&&(!Number.isFinite(change9(d).relative)||Math.abs(change9(d).relative)>1e8)))fail(uiText('变化率过大，请核对前期数值与单位。'));
    warnings.push(uiText('仅在前期 > 0 时计算相对变化率；前期为零或负数时显示绝对差值。增减不自动表示好坏。'));
  }
}
export function volume9Summary(doc,fmt){
  if(!ids.has(doc.template))return null;
  if(['singleline','area'].includes(doc.template)){const last=doc.data.filter(d=>d.value!==null).at(-1);return{value:fmt(last.value),label:uiMessage`${last.period} · 最近观测`,unit:doc.unit};}
  if(doc.template==='progress')return{value:fmt(doc.data.filter(d=>d.value>=d.target).length),label:uiText('已达成的目标'),unit:uiText('项')};
  if(doc.template==='xy'||doc.template==='kpi')return{value:fmt(doc.data.length),label:doc.template==='xy'?uiText('原始观测'):uiText('独立指标'),unit:uiText('项')};
  return{value:fmt(doc.data.length),label:uiText('输入数据记录'),unit:uiText('条')};
}
