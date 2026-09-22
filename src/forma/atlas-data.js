import {uiText,uiMarkup,uiMessage} from './locale.js';
import {sum,median,extent} from 'd3';

const unique = values => [...new Set(values)];
const validDate = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
const validMonth = value => typeof value==='string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const monthIndex = value => Number(value.slice(0,4))*12+Number(value.slice(5,7))-1;
const pair = (a,b) => JSON.stringify([a,b]);

export function validateAtlas(doc,{fail,count,noDuplicates,positive,warnings}) {
  const rows=doc.data, id=doc.template;
  if(id==='histogram' || id==='ecdf') {
    count(rows.length,id==='histogram'?24:16,id==='histogram'?600:300,uiText('原始观测'));
    noDuplicates(rows.map(row=>row.label),uiText('观测编号'));
    if(id==='histogram' && doc.binCount!==undefined && (!Number.isInteger(doc.binCount)||doc.binCount<6||doc.binCount>24))fail(uiText('binCount 必须是 6–24 的整数。'));
  }
  if(id==='cohort') {
    const cohorts=unique(rows.map(row=>row.cohort));
    count(cohorts.length,2,8,uiText('同期群')); noDuplicates(rows.map(row=>pair(row.cohort,row.age)),uiText('同期群月份'));
    if(doc.unit!=='%')fail(uiText('留存矩阵的 unit 必须为 %，由 active ÷ size 计算。'));
    if(rows.some(row=>!validMonth(row.cohort)))fail(uiText('cohort 必须为有效的 YYYY-MM 月份。'));
    if(cohorts.some((cohort,i)=>i>0&&monthIndex(cohort)!==monthIndex(cohorts[i-1])+1))fail(uiText('同期群月份必须连续，并从早到晚排列。'));
    if(rows.some(row=>!Number.isInteger(row.age)||row.age<0||row.age>11||!Number.isInteger(row.active)||row.active<0||!Number.isInteger(row.size)||row.size<=0||row.active>row.size))fail(uiText('age 必须是 0–11 的整数；active、size 必须是有效人数，且 0 ≤ active ≤ size。'));
    const lastAge=Math.max(...rows.filter(row=>row.cohort===cohorts[0]).map(row=>row.age));
    count(lastAge+1,3,12,uiText('观察月份'));
    if(lastAge<cohorts.length-1)fail(uiText('观察期必须覆盖所有同期群的加入月份。'));
    cohorts.forEach((cohort,i)=>{
      const own=rows.filter(row=>row.cohort===cohort);
      if(own.length!==lastAge-i+1||own.some((row,j)=>row.age!==j))fail(uiMessage`「${cohort}」应从 age 0 连续记录到 ${lastAge-i}，并按月龄排序。`);
      if(own.some(row=>row.size!==own[0].size))fail(uiMessage`「${cohort}」的初始人数 size 必须保持一致。`);
      if(own[0].age!==0||own[0].active!==own[0].size)fail(uiMessage`「${cohort}」的 age 0 必须记录完整初始人数。`);
    });
    if(rows.some((row,i)=>i>0&&cohorts.indexOf(row.cohort)<cohorts.indexOf(rows[i-1].cohort)))fail(uiText('请先按同期群、再按月龄排序；同一同期群的记录需连续。'));
    warnings.push(uiText('留存率按固定初始人数计算；回流可能使后期比例上升，未来月份始终留空。'));
  }
  if(id==='bullet') {
    count(rows.length,3,8,uiText('指标')); noDuplicates(rows.map(row=>row.label),uiText('指标名称')); positive('value',true); positive('target');
    if(rows.some(row=>!(0<row.low&&row.low<row.mid&&row.mid<row.high)||row.value>row.high||row.target>row.high))fail(uiText('每项需满足 0 < low < mid < high，且 value、target 不超过 high。'));
    if(!Array.isArray(doc.bandLabels)||doc.bandLabels.length!==3||doc.bandLabels.some(value=>typeof value!=='string'||!value.trim()||value.length>12))fail(uiText('bandLabels 需要三个 1–12 字的区间名称，例如 ["待提升", "稳健", "充分"]。'));
    warnings.push(uiText('背景区间是输入的定性评估阈值，不自动产生统计结论；所有指标必须同一量纲。'));
  }
  if(id==='funnel') {
    count(rows.length,4,8,uiText('步骤')); noDuplicates(rows.map(row=>row.label),uiText('步骤名称'));
    if(rows.some((row,i)=>!Number.isInteger(row.step)||row.step!==i+1))fail(uiText('step 必须从 1 开始连续递增，并按步骤排序。'));
    if(rows.some((row,i)=>!Number.isInteger(row.value)||row.value<0||(i>0&&row.value>rows[i-1].value))||rows[0].value<=0)fail(uiText('漏斗需要逐步不增加的非负整数，且首步必须大于 0。'));
    warnings.push(uiText('请使用同一人群、同一统计窗口的步骤数量；前一步为零时，后续转化率显示为未定义。'));
  }
  if(id==='sunburst') {
    const parents=unique(rows.map(row=>row.parent));
    count(parents.length,2,5,uiText('一级分类')); count(rows.length,6,24,uiText('叶节点')); positive();
    noDuplicates(rows.map(row=>pair(row.parent,row.label)),uiText('同一分类中的子项名称'));
    parents.forEach(parent=>count(rows.filter(row=>row.parent===parent).length,2,6,uiMessage`「${parent}」子项`));
    warnings.push(uiText('父分类由叶节点求和；数量由角度编码，不能跨环比较面积。'));
  }
  if(id==='gantt') {
    count(rows.length,4,10,uiText('任务')); noDuplicates(rows.map(row=>row.label),uiText('任务名称'));
    if(rows.some(row=>!validDate(row.start)||!validDate(row.end)))fail(uiText('start、end 必须是有效的 YYYY-MM-DD 日期。'));
    else {
      if(rows.some(row=>row.start>=row.end))fail(uiText('每项任务的 end 必须晚于 start；结束日不含当日。'));
      if(rows.some((row,i)=>i>0&&row.start<rows[i-1].start))fail(uiText('任务请按开始日期从早到晚排序。'));
      const span=(Math.max(...rows.map(row=>Date.parse(row.end)))-Math.min(...rows.map(row=>Date.parse(row.start))))/86400000;
      if(span>366)fail(uiText('甘特图的总跨度不能超过 366 天。'));
    }
    if(rows.some(row=>row.progress<0||row.progress>100))fail(uiText('progress 必须在 0–100 之间。'));
    warnings.push(uiText('条宽对应实际日历时长；填充百分比表示输入的完成进度，并非时间消耗。'));
  }
  if(id==='ledger') {
    const labels=unique(rows.map(row=>row.label)), periods=unique(rows.map(row=>row.period));
    count(labels.length,3,8,uiText('指标')); count(periods.length,4,24,uiText('月份')); positive('value',true);
    noDuplicates(rows.map(row=>pair(row.label,row.period)),uiText('同一指标的同一月份'));
    if(periods.some(period=>!validMonth(period)))fail(uiText('period 必须为有效的 YYYY-MM 月份。'));
    if(periods.some((period,i)=>i>0&&monthIndex(period)!==monthIndex(periods[i-1])+1))fail(uiText('月份必须连续，并按时间从早到晚排列。'));
    if(rows.length!==labels.length*periods.length||labels.some(label=>rows.filter(row=>row.label===label).some((row,i)=>row.period!==periods[i])))fail(uiText('每个指标都需要全部月份，且每个指标的月份顺序必须一致。'));
    warnings.push(uiText('所有迷你折线共用从零开始的纵轴；期初为零时，相对变化不定义。'));
  }
}

export function atlasSummary(doc,fmt) {
  const rows=doc.data, id=doc.template;
  if(id==='histogram'||id==='ecdf')return {value:fmt(median(rows,row=>row.value)),unit:doc.unit,label:uiMessage`${rows.length} 个原始观测 · 中位数`};
  if(id==='cohort')return {value:fmt(sum(rows.filter(row=>row.age===0),row=>row.size)),unit:uiText('人'),label:uiMessage`${unique(rows.map(row=>row.cohort)).length} 个同期群 · 初始人数合计`};
  if(id==='bullet')return {value:String(rows.filter(row=>row.value>=row.target).length),unit:uiMessage`/ ${rows.length} 项`,label:uiText('达到各自目标的指标')};
  if(id==='funnel')return {value:fmt(rows.at(-1).value/rows[0].value*100),unit:'%',label:uiText('首步 → 最后一步 · 总转化率')};
  if(id==='sunburst')return {value:fmt(sum(rows,row=>row.value)),unit:doc.unit,label:uiMessage`${unique(rows.map(row=>row.parent)).length} 个一级分类 · 叶节点合计`};
  if(id==='gantt')return {value:fmt((Math.max(...rows.map(row=>Date.parse(row.end)))-Math.min(...rows.map(row=>Date.parse(row.start))))/86400000),unit:uiText('天'),label:uiMessage`${rows.length} 项任务 · 整体日历跨度`};
  if(id==='ledger'){const latest=rows.at(-1).period;return {value:fmt(sum(rows.filter(row=>row.period===latest),row=>row.value)),unit:doc.unit,label:uiMessage`${latest} · 全部指标当期合计`};}
}

// Fixed equal-width bins include the maximum in the final interval.
export function histogramBins(values,count=12) {
  let [low,high]=extent(values);
  if(low===high){const pad=Math.abs(low)*.05||.5;low-=pad;high+=pad;}
  const width=(high-low)/count;
  const bins=Array.from({length:count},(_,index)=>({low:low+width*index,high:low+width*(index+1),count:0,values:[]}));
  for(const value of values){const index=Math.max(0,Math.min(count-1,Math.floor((value-low)/width)));bins[index].count++;bins[index].values.push(value);}
  return {domain:[low,high],width,bins};
}

export function empiricalDistribution(values) {
  const sorted=[...values].sort((a,b)=>a-b), points=[];
  sorted.forEach((value,index)=>{
    if(index<sorted.length-1&&value===sorted[index+1])return;
    points.push({value,count:index+1,probability:(index+1)/sorted.length});
  });
  return points;
}
