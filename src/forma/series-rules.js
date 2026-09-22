import {uiText,uiMarkup,uiMessage} from './locale.js';
import {measurementDomain} from './axis-policy.js';
// Every observation keeps its persistent ID; dimensions determine arrangement.
export const seriesViews=[
  {id:'series-rank',name:uiText('动态排名折线'),en:'Ranked series',note:uiText('同一观测由原值位置移向当期名次，原值与系列身份保留；相同原值并列同名次，不把名次差当作数值差。')},
  {id:'grouped-columns',name:uiText('分组柱图'),en:'Grouped columns',note:uiText('同一期的系列并排，共用零基线与数值刻度。')},
  {id:'grouped-bars',name:uiText('分组条形图'),en:'Grouped bars',note:uiText('同类别的系列上下并排，横向长度读取原值，适合较长类别名称。')},
  {id:'stacked-columns',name:uiText('堆叠柱图'),en:'Stacked columns',note:uiText('同一期的分项逐层相加，柱高对应当期总量。')},
  {id:'stacked-bars',name:uiText('堆叠条形图'),en:'Stacked bars',note:uiText('分项沿横轴逐段相加，同一类别的总长度对应合计。')},
  {id:'percent-columns',name:uiText('百分比堆叠柱图'),en:'100% columns',note:uiText('每期按原始总量归一为 100%，原始数值保持不变。')},
  {id:'percent-bars',name:uiText('百分比堆叠条形图'),en:'100% bars',note:uiText('横向分项长度表示各类别内的占比，每条合计 100%。')},
  {id:'multi-line',name:uiText('多折线图'),en:'Multiple lines',note:uiText('按时期顺序连接各系列，同一系列保持颜色与身份。')},
  {id:'small-multiples',name:uiText('共尺分面折线'),en:'Shared-scale small multiples',note:uiText('每个系列展开到独立分面，所有分面继续使用同一时间范围与数值尺度，缺失处保留断点。')},
  {id:'stacked-area',name:uiText('堆叠面积图'),en:'Stacked area',note:uiText('分项厚度对应数量，上边界表示同一期的合计。')},
  {id:'percent-area',name:uiText('百分比面积图'),en:'100% area',note:uiText('各色带的厚度表示当期占比，所有色带合计 100%。')}
];
export const isSeriesView=id=>seriesViews.some(v=>v.id===id);
export const seriesViewMap={race:'series-rank',smallmultiples:'small-multiples',groupedbar:'grouped-columns',groupedbarh:'grouped-bars',stackedbar:'stacked-bars',stacked:'percent-bars',stream:'stacked-area',stackedcolumn:'stacked-columns',percentcolumn:'percent-columns',tide:'multi-line',percentarea:'percent-area'};
export const seriesKey=(period,series)=>JSON.stringify([period,series]);
export const seriesShapeIds=new Set(Object.keys(seriesViewMap));
const unique=a=>[...new Set(a)];
export const isSeriesDatePeriod=p=>typeof p==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p)&&Number.isFinite(Date.parse(p))&&new Date(p).toISOString().slice(0,10)===p;
export function seriesPeriods(doc){
  const periods=unique(doc.data.map(r=>r.period));
  const dates=periods.every(isSeriesDatePeriod);
  return dates?periods.sort((a,b)=>Date.parse(a)-Date.parse(b)):periods;
}
export function seriesDocument(step){
  const doc=step.doc;
  if(!seriesShapeIds.has(doc.template))return null;
  const data=doc.data.map((r,row)=>({...r,label:seriesKey(r.period??r.label,r.series),period:r.period??r.label,series:r.series,value:r.value,row}));
  const mapped={entities:doc.entities,title:doc.title,subtitle:doc.subtitle||'',unit:doc.unit,source:structuredClone(doc.source),data};
  return mapped;
}
export function seriesEligibility(doc,view){
  const bad=reason=>({valid:false,reason});
  if(!isSeriesView(view))return bad(uiText('未知的多系列图型。'));
  if(!doc?.data?.length)return bad(uiText('请填写时期、系列和数值三列数据。'));
  const rows=doc.data,text=v=>typeof v==='string'&&v.trim()&&v.length<=80;
  if(!text(doc.title)||!text(doc.unit)||!text(doc.source?.name))return bad(uiText('请填写标题、单位与来源。'));
  if(rows.some(r=>!text(r.period)||!text(r.series)||r.label!==seriesKey(r.period,r.series)))return bad(uiText('时期与系列名称不能为空；每个组合需要唯一身份。'));
  const periods=unique(rows.map(r=>r.period)),series=unique(rows.map(r=>r.series));
  if(periods.length<2||periods.length>36||series.length<2||series.length>6)return bad(uiText('此多系列布局支持 2–36 个时期、2–6 个系列；完整原表仍会保留。'));
  if(unique(rows.map(r=>r.label)).length!==rows.length)return bad(uiText('同一时期与系列不能重复。'));
  if(rows.length!==periods.length*series.length)return bad(uiText('每个时期须包含全部系列；未采集的数据显式留空，不能省略或补零。'));
  if(rows.some(r=>r.value!==null&&(typeof r.value!=='number'||!Number.isFinite(r.value)||Math.abs(r.value)>1e15)))return bad(uiText('数值须为有限数字，缺失观测填写 null。'));
  if(series.some(s=>rows.filter(r=>r.series===s&&r.value!==null).length<2))return bad(uiText('每个系列至少需要两个有效观测。'));
  if(view==='series-rank'&&rows.some(r=>r.value===null))return bad(uiText('排名需要各时期完整的同一组系列；缺失观测保留在原表，可使用多折线或分面图。'));
  if(!['grouped-columns','grouped-bars','multi-line','small-multiples','series-rank'].includes(view)){
    if(rows.some(r=>r.value===null||r.value<0))return bad(uiText('堆叠图需要完整、可相加的非负数据；缺失或负数可用分组柱与多折线。'));
    if(view.startsWith('percent')&&periods.some(p=>rows.filter(r=>r.period===p).reduce((s,r)=>s+r.value,0)<=0))return bad(uiText('百分比图每期总量必须大于零；零总量不能计算占比。'));
  }
  return {valid:true,reason:''};
}
export function seriesDomain(doc,view){
  if(view==='series-rank')return [1,unique(doc.data.map(r=>r.series)).length];
  if(view.startsWith('percent'))return [0,100];
  const values=doc.data.map(r=>r.value).filter(Number.isFinite);
  if(view.startsWith('stacked'))for(const p of unique(doc.data.map(r=>r.period)))values.push(doc.data.filter(r=>r.period===p).reduce((s,r)=>s+(r.value??0),0));
  return measurementDomain(values,{zero:view!=='multi-line'});
}
export function seriesRecipe(from,to){
  if(from===to)return {id:'update',name:uiText('系列数值更新'),description:uiText('相同时期与系列保留图形和颜色，数值连续更新。')};
  if([from,to].includes('series-rank'))return {id:'series-ranking',name:uiText('原值转名次'),description:uiText('每个观测移动到当期原值降序名次，系列和时期保持对应；同值采用竞赛排名 1、1、3，原始数值不改写。')};
  if([from,to].includes('small-multiples'))return {id:'series-facet',name:uiText('系列分面展开'),description:uiText('每个系列与观测点连续移动到自己的分面，所有分面共用时间范围与数值轴；缺失点不连接。')};
  if([from,to].some(v=>v.endsWith('-bars'))){
    if([from,to].every(v=>v.endsWith('-bars')))return {id:'series-stack-horizontal',name:from.startsWith('percent')||to.startsWith('percent')?uiText('横向归一'):uiText('横向叠合'),description:uiText('各分项沿横轴归位叠合，长度由原值或原值占比计算。')};
    return {id:'series-reorient',name:uiText('横纵转向'),description:uiText('各分项先收为自己的端点，转向后展开为横条或纵向图形；数值轴随方向更新。')};
  }
  if([from,to].every(v=>v.includes('columns')))return {id:'series-stack',name:from.startsWith('percent')||to.startsWith('percent')?uiText('占比归一'):uiText('并排叠合'),description:uiText('每个分项保留身份，横向归位并逐层叠合；占比由当期原值计算。')};
  if([from,to].includes('multi-line')&&[from,to].some(v=>v.includes('columns')))return {id:'series-endpoints',name:uiText('分系列接线'),description:uiText('每根柱收成对应的数据点，按同一系列连接成线。')};
  if([from,to].some(v=>v.includes('area')))return {id:'series-band',name:uiText('色带展开'),description:uiText('保留每个时期与系列的对应，让柱体或折线连续铺展成色带。')};
  return {id:'series-contour',name:uiText('系列形变'),description:uiText('按时期与系列保持对应，轮廓连续转换。')};
}
