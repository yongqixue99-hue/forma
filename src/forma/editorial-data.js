import {uiText,uiMarkup,uiMessage} from './locale.js';
import {sum,mean,quantileSorted,ascending} from 'd3';
const unique=a=>[...new Set(a)];
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;

export function validateEditorial(doc,{fail,count,noDuplicates,positive,allZero,warnings}){
  const rows=doc.data,id=doc.template,pair=(a,b)=>JSON.stringify([a,b]);
  const groups=()=>unique(rows.map(r=>r.group));
  if(id==='barcode'){
    count(rows.length,14,180,uiText('日期记录'));positive('value',true);noDuplicates(rows.map(r=>r.date),uiText('日期'));
    if(rows.some(r=>!validDate(r.date)))fail(uiText('date 必须是有效的 YYYY-MM-DD 日期。'));
    else {const dates=rows.map(r=>Date.parse(r.date)),days=(Math.max(...dates)-Math.min(...dates))/86400000+1;if(days>180)fail(uiText('时间刻线图的跨度不能超过 180 天。'));if(days!==rows.length||rows.some(r=>r.value===null))warnings.push(uiText('日期按真实间隔定位；缺失日用底部叉号标记，不补零。'));}
    if(!rows.some(r=>typeof r.value==='number'))fail(uiText('至少需要一天的有效数值。'));
  }
  if(id==='fan'){count(rows.length,6,16,uiText('项目'));positive('value',true);positive('target');noDuplicates(rows.map(r=>r.label),uiText('项目名称'));if(rows.some(r=>r.value>r.target))fail(uiText('已完成数量不能大于目标；请先更新 target。'));}
  if(id==='unit'){count(rows.length,4,12,uiText('类别'));noDuplicates(rows.map(r=>r.label),uiText('类别名称'));if(rows.some(r=>!Number.isInteger(r.value)||r.value<0||r.value>50))fail(uiText('单位堆叠图需要 0–50 的整数；每个点严格代表一个单位。'));}
  if(id==='matrix'){
    const a=unique(rows.map(r=>r.row)),b=unique(rows.map(r=>r.column));count(a.length,3,8,uiText('行'));count(b.length,3,10,uiText('列'));positive('value',true);noDuplicates(rows.map(r=>pair(r.row,r.column)),uiText('矩阵单元格'));
    if(rows.length!==a.length*b.length)fail(uiText('矩阵需要每一行、每一列的全部交叉值；零值请显式填写 0。'));allZero();
  }
  if(id==='swarm'){count(groups().length,2,4,uiText('分组'));noDuplicates(rows.map(r=>r.label),uiText('样本名称'));groups().forEach(g=>count(rows.filter(r=>r.group===g).length,8,40,uiMessage`「${g}」样本`));warnings.push(uiText('蜂群的纵向位移只用于避免点重叠，不编码第二个变量。'));}
  if(id==='interval'){
    count(rows.length,3,10,uiText('对象'));noDuplicates(rows.map(r=>r.label),uiText('对象名称'));
    if(rows.some(r=>r.low>r.estimate||r.estimate>r.high))fail(uiText('每项都必须满足 low ≤ estimate ≤ high。'));
    if(typeof doc.intervalLabel!=='string'||!doc.intervalLabel.trim()||doc.intervalLabel.length>80)fail(uiText('请用 intervalLabel 明确区间含义，例如「95% 置信区间」。'));
    warnings.push(uiText('图表展示你提供的区间，不自动计算置信水平；请保持估计方法和口径一致。'));
  }
  if(id==='diverging'){count(rows.length,4,10,uiText('项目'));noDuplicates(rows.map(r=>r.label),uiText('项目名称'));}
  if(['stacked','stream'].includes(id)){
    const key=id==='stacked'?'label':'period',a=unique(rows.map(r=>r[key])),b=unique(rows.map(r=>r.series));
    count(a.length,id==='stacked'?3:6,id==='stacked'?8:36,id==='stacked'?uiText('对象'):uiText('时期'));count(b.length,2,5,uiText('组成类别'));positive('value',true);noDuplicates(rows.map(r=>pair(r[key],r.series)),uiText('同一对象的同一类别'));
    if(rows.length!==a.length*b.length)fail(uiText('每个对象或时期都需要包含所有组成类别。'));
    if(id==='stacked'){if(doc.unit!=='%')fail(uiText('百分比堆叠图的 unit 必须为 %。'));a.forEach(label=>{const total=sum(rows.filter(r=>r.label===label),r=>r.value);if(Math.abs(total-100)>1e-6)fail(uiMessage`「${label}」的百分比合计必须为 100。`);});}
    else {allZero();warnings.push(uiText('时期按首次出现的顺序、等间距排列；请保证时间间隔一致。'));}
  }
  if(id==='boxplot'){count(groups().length,2,6,uiText('分组'));groups().forEach(g=>count(rows.filter(r=>r.group===g).length,8,160,uiMessage`「${g}」样本`));}
  if(id==='arc'){positive();count(unique(rows.flatMap(r=>[r.source,r.target])).length,4,12,uiText('节点'));count(rows.length,3,40,uiText('关系'));if(rows.some(r=>r.source===r.target))fail(uiText('弧线关系图不接受自身连接。'));noDuplicates(rows.map(r=>JSON.stringify([r.source,r.target].sort())),uiText('同一对无向关系'));}
  if(id==='parallel'){
    const a=unique(rows.map(r=>r.label)),b=unique(rows.map(r=>r.dimension));count(a.length,3,6,uiText('对象'));count(b.length,3,6,uiText('维度'));noDuplicates(rows.map(r=>pair(r.label,r.dimension)),uiText('同一对象的同一维度'));
    if(rows.length!==a.length*b.length)fail(uiText('平行坐标图要求每个对象都具有全部维度。'));
    warnings.push(uiText('所有维度使用共同的线性刻度；请保证单位与指标口径可比。'));
  }
}

export function editorialSummary(doc,fmt){
  const d=doc.data,id=doc.template;
  if(id==='barcode'){const max=d.filter(r=>r.value!==null).reduce((a,b)=>a.value>b.value?a:b);return{value:fmt(max.value),unit:doc.unit,label:uiMessage`${max.date.slice(5).replace('-',' / ')} · 单日峰值`};}
  if(id==='fan')return{value:fmt(mean(d,r=>r.value/r.target*100)),unit:'%',label:uiMessage`${d.length} 个目标 · 完成率算术平均`};
  if(id==='unit')return{value:fmt(sum(d,r=>r.value)),unit:doc.unit,label:uiMessage`${d.length} 类 · 逐点计数`};
  if(id==='matrix')return{value:fmt(sum(d,r=>r.value)),unit:doc.unit,label:uiText('全部矩阵单元 · 合计')};
  if(['swarm','boxplot'].includes(id))return{value:fmt(d.length),unit:uiText('个样本'),label:uiMessage`${unique(d.map(r=>r.group)).length} 组原始观测`};
  if(id==='interval')return{value:String(d.length),unit:uiText('个区间'),label:doc.intervalLabel};
  if(id==='diverging'){const total=sum(d,r=>r.value);return{value:`${total>=0?'+':''}${fmt(total)}`,unit:doc.unit,label:uiText('全部项目 · 净变化')};}
  if(id==='stacked')return{value:String(unique(d.map(r=>r.label)).length),unit:uiText('个群体'),label:uiText('每个群体合计 100%')};
  if(id==='stream')return{value:fmt(sum(d.filter(r=>r.period===d.at(-1).period),r=>r.value)),unit:doc.unit,label:uiMessage`${d.at(-1).period} · 当期合计`};
  if(id==='arc')return{value:fmt(sum(d,r=>r.value)),unit:doc.unit,label:uiText('无向关系权重 · 合计')};
  if(id==='parallel')return{value:String(unique(d.map(r=>r.label)).length),unit:uiText('个对象'),label:uiMessage`${unique(d.map(r=>r.dimension)).length} 个同量纲维度`};
}

export function boxStatistics(values){
  const sorted=[...values].sort(ascending),q1=quantileSorted(sorted,.25),median=quantileSorted(sorted,.5),q3=quantileSorted(sorted,.75),iqr=q3-q1;
  const inside=sorted.filter(v=>v>=q1-1.5*iqr&&v<=q3+1.5*iqr);
  return{q1,median,q3,low:inside[0],high:inside.at(-1),outliers:sorted.filter(v=>v<q1-1.5*iqr||v>q3+1.5*iqr),count:sorted.length};
}

// Only the vertical position is packed. The quantitative x coordinate never moves.
export function packSwarm(rows,x,halfHeight,maxRadius=4){
  const sorted=[...rows].sort((a,b)=>a.value-b.value||(a.label<b.label?-1:1));
  function place(radius){
    const gap=radius*.35,distance=radius*2+gap,nodes=[];
    for(const row of sorted){
      const px=x(row.value),near=nodes.filter(n=>Math.abs(n.x-px)<distance),candidates=[0];
      for(const n of near){const dy=Math.sqrt(Math.max(0,distance*distance-(px-n.x)**2));candidates.push(n.y-dy,n.y+dy);}
      candidates.sort((a,b)=>Math.abs(a)-Math.abs(b)||a-b);
      const py=candidates.find(cy=>near.every(n=>(px-n.x)**2+(cy-n.y)**2>=distance*distance-1e-7))??0;
      nodes.push({...row,x:px,y:py});
    }
    return nodes;
  }
  let radius=maxRadius,nodes=place(radius);
  for(let i=0;i<32&&nodes.some(n=>Math.abs(n.y)+radius>halfHeight);i++){radius*=.85;nodes=place(radius);}
  return{nodes,radius};
}
