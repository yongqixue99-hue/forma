import {uiText,uiMarkup,uiMessage} from './locale.js';
import {sharedBandwidth} from './density.js';
import {sum,median,mean,deviation,quantileSorted,extent} from 'd3';

const unique=values=>[...new Set(values)];
const pair=(a,b)=>JSON.stringify([a,b]);
export const isVolume4Date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;

export function validateVolume4(doc,{fail,count,noDuplicates,positive,allZero,warnings}) {
  const rows=doc.data,id=doc.template;
  if(id==='lollipop'||id==='pareto'){
    count(rows.length,4,id==='lollipop'?12:10,uiText('类别'));noDuplicates(rows.map(row=>row.label),uiText('类别名称'));positive('value',true);
    if(id==='pareto'){allZero();if(rows.some(row=>!Number.isInteger(row.value)))fail(uiText('帕累托图的 value 必须是非负整数计数。'));warnings.push(uiText('类别自动按计数降序排列；80% 只是参考阈值，不意味着数据必然满足二八规律。'));}
  }
  if(id==='violin'){
    const groups=unique(rows.map(row=>row.group));count(groups.length,2,5,uiText('分组'));groups.forEach(group=>count(rows.filter(row=>row.group===group).length,12,160,uiMessage`「${group}」原始样本`));
    warnings.push(uiText('轮廓为 Gaussian KDE 估计，共用带宽和密度尺度；宽度表示概率密度，各组样本数另行标注，平滑尾部可超出观测范围。'));
  }
  if(id==='correlation'){
    const variables=unique(rows.map(row=>row.variable)),samples=unique(rows.map(row=>row.sample));count(variables.length,3,6,uiText('变量'));count(samples.length,8,120,uiText('完整样本'));noDuplicates(rows.map(row=>pair(row.sample,row.variable)),uiText('同一样本的同一变量'));
    if(rows.length!==variables.length*samples.length||samples.some(sample=>new Set(rows.filter(row=>row.sample===sample).map(row=>row.variable)).size!==variables.length))fail(uiText('每一个 sample 必须包含全部 variable；不对缺失变量补零或进行成对删除。'));
    warnings.push(uiText('计算 Pearson 线性相关系数，结果无量纲；常量变量的相关系数未定义。相关不代表因果。'));
  }
  if(id==='marimekko'){
    const groups=unique(rows.map(row=>row.group)),series=unique(rows.map(row=>row.series));count(groups.length,3,6,uiText('分组'));count(series.length,2,5,uiText('分类'));positive('value',true);noDuplicates(rows.map(row=>pair(row.group,row.series)),uiText('同一分组的同一分类'));
    if(rows.length!==groups.length*series.length||groups.some(group=>new Set(rows.filter(row=>row.group===group).map(row=>row.series)).size!==series.length))fail(uiText('每组必须包含全部分类；没有数量的分类请明确填 0。'));
    if(groups.some(group=>sum(rows.filter(row=>row.group===group),row=>row.value)<=0))fail(uiText('每个分组的总量必须大于零，组宽由实际总量决定。'));
    warnings.push(uiText('组宽 × 组内比例对应每格占整体的面积份额；零值格不占面积，完整原值保留在数据中。'));
  }
  if(id==='smallmultiples'){
    const series=unique(rows.map(row=>row.series)),periods=unique(rows.map(row=>row.period));count(series.length,2,6,uiText('序列'));count(periods.length,6,36,uiText('日期'));noDuplicates(rows.map(row=>pair(row.series,row.period)),uiText('同一序列的同一日期'));
    if(periods.some(period=>!isVolume4Date(period)))fail(uiText('period 必须是有效的 YYYY-MM-DD 日期。'));
    if(periods.some((period,i)=>i>0&&period<=periods[i-1]))fail(uiText('日期必须按时间升序排列；可以不等距。'));
    if(rows.length!==series.length*periods.length||series.some(name=>{const own=rows.filter(row=>row.series===name);return own.length!==periods.length||own.some((row,i)=>row.period!==periods[i]);}))fail(uiText('每个序列需要相同且顺序一致的日期集合；缺失观测使用 null。'));
    if(!rows.some(row=>row.value!==null))fail(uiText('至少需要一个非空观测值。'));
    warnings.push(uiText('所有分面共用真实日期坐标与从零起的同一纵轴；缺失观测保留断点，不连线、不补零。'));
  }
  if(id==='slope'){
    count(rows.length,3,8,uiText('对象'));noDuplicates(rows.map(row=>row.label),uiText('对象名称'));
    if(!Array.isArray(doc.periodLabels)||doc.periodLabels.length!==2||doc.periodLabels.some(label=>typeof label!=='string'||!label.trim()||label.length>16))fail(uiText('periodLabels 需要两个 1–16 字的时期名称。'));
    warnings.push(uiText('两侧共用零点与纵轴范围；标签可以为避免重叠上下挪动，细引线始终连接真实数据位置。'));
  }
  if(id==='range'){
    count(rows.length,8,40,uiText('日期'));noDuplicates(rows.map(row=>row.period),uiText('日期'));
    if(rows.some(row=>!isVolume4Date(row.period)))fail(uiText('period 必须是有效的 YYYY-MM-DD 日期。'));
    if(rows.some((row,i)=>i>0&&row.period<=rows[i-1].period))fail(uiText('日期必须按时间升序排列；可以不等距。'));
    if(rows.some(row=>row.low>row.high||row.open<row.low||row.open>row.high||row.close<row.low||row.close>row.high))fail(uiText('每条记录需满足 low ≤ open、close ≤ high。'));
    warnings.push(uiText('显示输入的观测高低区间，既不是置信区间也不是预测范围；零长度区间保留为刻度。'));
  }
}

export function paretoRows(rows){const sorted=rows.map((row,index)=>({...row,index})).sort((a,b)=>b.value-a.value||a.index-b.index),total=sum(rows,row=>row.value);let cumulative=0;return sorted.map(row=>({...row,cumulative:(cumulative+=row.value)/total,total}));}

export function violinDensity(groups,resolution=100){
  const all=groups.flatMap(group=>group.values),[low,high]=extent(all);
  const bandwidth=sharedBandwidth(groups,150),domain=[low-4*bandwidth,high+4*bandwidth];
  const xs=Array.from({length:resolution+1},(_,i)=>domain[0]+i/resolution*(domain[1]-domain[0])),factor=1/(Math.sqrt(2*Math.PI)*bandwidth);
  return {bandwidth,domain,series:groups.map(group=>({...group,points:xs.map(x=>({x,density:mean(group.values,value=>Math.exp(-.5*((x-value)/bandwidth)**2))*factor}))}))};
}

export function pearsonMatrix(rows){
  const variables=unique(rows.map(row=>row.variable)),samples=unique(rows.map(row=>row.sample)),lookup=new Map(rows.map(row=>[pair(row.sample,row.variable),row.value]));
  const vectors=variables.map(variable=>samples.map(sample=>lookup.get(pair(sample,variable))));
  const centered=vectors.map(values=>{const scale=Math.max(...values.map(Math.abs))||1,scaled=values.map(value=>value/scale),average=mean(scaled);return scaled.map(value=>value-average);});
  const sumSquares=centered.map(values=>sum(values,value=>value*value));
  const matrix=variables.map((row,i)=>variables.map((column,j)=>{let coefficient=null;if(sumSquares[i]>0&&sumSquares[j]>0){coefficient=i===j?1:Math.max(-1,Math.min(1,sum(centered[i],(value,k)=>value*centered[j][k])/Math.sqrt(sumSquares[i]*sumSquares[j])));}return {row,column,coefficient,n:samples.length};}));
  return {variables,samples,matrix};
}

export function marimekkoLayout(rows){
  const groups=unique(rows.map(row=>row.group)),series=unique(rows.map(row=>row.series)),total=sum(rows,row=>row.value);let left=0;
  return {total,series,groups:groups.map(group=>{const own=rows.filter(row=>row.group===group),groupTotal=sum(own,row=>row.value),width=groupTotal/total;let bottom=0;const result={group,total:groupTotal,left,width,cells:series.map(name=>{const row=own.find(row=>row.series===name),height=row.value/groupTotal,cell={...row,bottom,height,share:row.value/total};bottom+=height;return cell;})};left+=width;return result;})};
}

// Label displacement never changes a mark's quantitative position.
export function spreadLabels(positions,top,bottom,gap){
  const sorted=positions.map((y,index)=>({y,index})).sort((a,b)=>a.y-b.y||a.index-b.index),actualGap=Math.min(gap,(bottom-top)/Math.max(1,positions.length-1));
  for(let i=0;i<sorted.length;i++)sorted[i].placed=Math.max(sorted[i].y,i?sorted[i-1].placed+actualGap:top);
  if(sorted.length&&sorted.at(-1).placed>bottom){sorted.at(-1).placed=bottom;for(let i=sorted.length-2;i>=0;i--)sorted[i].placed=Math.min(sorted[i].placed,sorted[i+1].placed-actualGap);}
  const result=[];sorted.forEach(item=>result[item.index]=item.placed);return result;
}

export function volume4Summary(doc,fmt){
  const rows=doc.data,id=doc.template;
  if(id==='lollipop'||id==='pareto')return {value:fmt(sum(rows,row=>row.value)),unit:doc.unit,label:uiMessage`${rows.length} 个类别 · 数量合计`};
  if(id==='violin')return {value:fmt(median(rows,row=>row.value)),unit:doc.unit,label:uiMessage`${rows.length} 个原始观测 · 整体中位数`};
  if(id==='correlation')return {value:String(unique(rows.map(row=>row.sample)).length),unit:uiText('个'),label:uiMessage`完整样本 · ${unique(rows.map(row=>row.variable)).length} 个变量`};
  if(id==='marimekko')return {value:fmt(sum(rows,row=>row.value)),unit:doc.unit,label:uiMessage`${unique(rows.map(row=>row.group)).length} 个分组 · 总量`};
  if(id==='smallmultiples')return {value:String(rows.filter(row=>row.value!==null).length),unit:uiText('条'),label:uiMessage`有效观测 · ${rows.filter(row=>row.value===null).length} 处缺失`};
  if(id==='slope')return {value:String(rows.filter(row=>row.after>row.before).length),unit:uiMessage`/ ${rows.length} 项`,label:uiText('期末数值高于期初的对象')};
  if(id==='range')return {value:fmt(mean(rows,row=>row.high-row.low)),unit:doc.unit,label:uiMessage`${rows.length} 日 · 平均日内高低幅度`};
}
