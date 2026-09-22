import {uiText,uiMarkup,uiMessage} from './locale.js';
import * as d3 from 'd3';
import {isVolume4Date} from './volume4-data.js';
export const unique7=a=>[...new Set(a)];
const key=(...a)=>JSON.stringify(a),text=v=>typeof v==='string'&&v.trim()&&v.length<=80;
export function validateVolume7(doc,{fail,count,noDuplicates,positive,allZero,warnings}){
  const r=doc.data,id=doc.template,u=k=>unique7(r.map(d=>d[k]));
  const axes=keys=>{if(keys.some(k=>!text(doc.axes?.[k])))fail(uiMessage`axes.${keys.join('、axes.')} 需要注明维度及单位。`);};
  const dates=k=>{if(r.some(d=>!isVolume4Date(d[k])))fail(uiMessage`${k} 必须是有效的 YYYY-MM-DD 日期。`);};
  const complete=(a,b,amin,amax,bmin,bmax)=>{count(u(a).length,amin,amax,a);count(u(b).length,bmin,bmax,b);noDuplicates(r.map(d=>key(d[a],d[b])),uiMessage`${a} 与 ${b} 的组合`);if(r.length!==u(a).length*u(b).length)fail(uiText('每个分类需要完整的观测组合；缺失请明确填 null（仅支持缺失的图型）或实际零值。'));};
  if(['pie','polarline'].includes(id)){count(r.length,id==='pie'?3:8,id==='pie'?10:24,uiText('记录'));noDuplicates(r.map(d=>d[id==='pie'?'label':'period']),uiText('类别'));positive('value',true);allZero();}
  if(['stackedcolumn','streamgraph','horizon','lines3d'].includes(id)){
    complete('period','series',id==='horizon'?8:id==='streamgraph'?6:4,id==='horizon'?60:id==='streamgraph'?36:id==='lines3d'?16:12,2,id==='lines3d'?4:5);
    if(['streamgraph','horizon'].includes(id))dates('period');
    if(['stackedcolumn','streamgraph'].includes(id))positive('value',true);
    if(id!=='lines3d')allZero();
    if(id==='horizon'&&u('series').some(g=>r.filter(d=>d.series===g&&d.value!==null).length<2))fail(uiText('每个序列至少需要两个有效观测。'));
    warnings.push(id==='horizon'?uiText('所有分面共用三个正负分带阈值；null 保留断点。'):id==='streamgraph'?uiText('流带厚度表示数量；居中边界不表示绝对数值。日期按实际间距排列。'):uiText('时期按首次出现的顺序等间距排列；各序列使用同一尺度。'));
  }
  if(id==='cycleplot'){complete('cycle','season',3,8,4,12);if(u('season').some(g=>r.filter(d=>d.season===g&&d.value!==null).length<2))fail(uiText('每个季节至少需要两个有效观测。'));warnings.push(uiText('周期和季节按首次出现的顺序排列；均线只使用有效观测。'));}
  if(id==='eventline'){count(r.length,6,18,uiText('事件'));count(u('group').length,2,3,uiText('分组'));u('group').forEach(g=>count(r.filter(d=>d.group===g).length,1,6,uiText('每组事件')));dates('date');noDuplicates(r.map(d=>key(d.group,d.date,d.label)),uiText('同组同日同名事件'));}
  if(['network','directedchord','edgebundle'].includes(id)){
    const nodes=unique7(r.flatMap(d=>[d.source,d.target]));count(nodes.length,id==='network'?6:id==='edgebundle'?8:3,id==='network'?24:id==='edgebundle'?32:8,uiText('节点'));count(r.length,id==='edgebundle'?10:id==='network'?5:1,id==='directedchord'?40:50,uiText('关系'));positive();
    if(r.some(d=>d.source===d.target))fail(uiText('不接受自环。'));noDuplicates(r.map(d=>key(...(id==='directedchord'?[d.source,d.target]:[d.source,d.target].sort()))),uiText('关系'));
    if(id==='edgebundle'){const pairs=r.flatMap(d=>[[d.source,d.sourceGroup],[d.target,d.targetGroup]]);count(unique7(pairs.map(d=>d[1])).length,2,5,uiText('分组'));const own=new Map();for(const [node,g]of pairs){if(own.has(node)&&own.get(node)!==g)fail(uiText('每个节点只能归属一个分组。'));own.set(node,g);}}
    warnings.push(id==='directedchord'?uiText('每条有向边单独计量；节点圆弧汇总流入与流出，整体流量仅将每条边计数一次。'):uiText('节点位置和曲线长度来自布局，不表示实测距离；线宽与关系权重成正比。'));
  }
  if(id==='parallelsets'){['a','b','c'].forEach(k=>count(u(k).length,2,6,uiMessage`${k} 分类`));count(r.length,4,36,uiText('组合'));positive();noDuplicates(r.map(d=>key(d.a,d.b,d.c)),uiText('三分类组合'));axes(['a','b','c']);warnings.push(uiText('三轴保留同一条组合记录及其带宽，不从两两汇总推断完整路径。'));}
  if(id==='raincloud'){count(u('group').length,2,4,uiText('分组'));u('group').forEach(g=>count(r.filter(d=>d.group===g).length,12,80,uiText('每组原始样本')));warnings.push(uiText('密度估计共用带宽和尺度；散点只在非数量方向抖动，箱体为四分位区间。'));}
  if(id==='qqplot'){count(r.length,12,240,uiText('样本'));noDuplicates(r.map(d=>d.label),uiText('样本名称'));if(!(d3.deviation(r,d=>d.value)>0))fail(uiText('样本方差需要大于零。'));warnings.push(uiText('正态分位数使用样本均值与样本标准差拟合；位置 (i−0.5)/n。图形不替代显著性检验。'));}
  if(id==='survival'){count(u('group').length,2,4,uiText('分组'));u('group').forEach(g=>count(r.filter(d=>d.group===g).length,6,40,uiText('每组会话')));noDuplicates(r.map(d=>d.label),uiText('会话名称'));positive('duration',true);if(r.some(d=>!['ended','censored'].includes(d.status)))fail(uiText('status 必须为 ended 或 censored。'));warnings.push(uiText('Kaplan–Meier 乘积极限估计；同一时刻先处理结束事件，再移除删失观测。加号表示右删失。'));}
  if(['vectorfield','voronoi'].includes(id)){count(r.length,id==='vectorfield'?16:8,id==='vectorfield'?100:50,uiText('坐标点'));noDuplicates(r.map(d=>key(d.x,d.y)),uiText('坐标'));axes(['x','y']);if(id==='voronoi'){noDuplicates(r.map(d=>d.label),uiText('站点名称'));count(u('group').length,1,4,uiText('分组'));}warnings.push(uiText('两个空间坐标必须使用相同单位，图中始终保持等比例坐标。')+(id==='voronoi'?uiText('区域为绘图区内的最近邻分区，面积不编码数量。'):uiText('箭头使用共同长度比例，零矢量显示为圆点。')));}
  if(id==='gauge'){count(r.length,1,1,uiText('指标'));if(r.some(d=>d.min>=d.max||d.value<d.min||d.value>d.max||d.target<d.min||d.target>d.max))fail(uiText('需要 min < max，value 和 target 均在量程内。'));}
  if(id==='likert'){count(u('question').length,2,7,uiText('调查项目'));const rs=doc.responses;if(!Array.isArray(rs)||rs.length!==5||rs.some(d=>!text(d))||unique7(rs).length!==5)fail(uiText('responses 需要五个不同选项，按负向到正向排序，中间项为中立。'));else{if(r.some(d=>!rs.includes(d.response)))fail(uiText('response 必须来自 responses。'));if(u('question').some(g=>{const own=r.filter(d=>d.question===g);return own.length!==5||Math.abs(d3.sum(own,d=>d.value)-100)>1e-6;}))fail(uiText('每个项目需要五个选项，百分比合计 100。'));}noDuplicates(r.map(d=>key(d.question,d.response)),uiText('项目与选项'));positive('value',true);if(doc.unit!=='%')fail(uiText('李克特图的 unit 必须为 %。'));}
  if(id==='bubble3d'){count(r.length,6,60,uiText('对象'));count(u('group').length,1,4,uiText('分组'));noDuplicates(r.map(d=>d.label),uiText('对象名称'));positive('size');axes(['x','y','z','size']);warnings.push(uiText('正交投影使同样大小的球体不随深度缩放；球体投影面积与 size 成正比，体积不编码数值。'));}
}

export function table7(rows,a='period',b='series',sort=false){const columns=unique7(rows.map(d=>d[a]));if(sort)columns.sort();const groups=unique7(rows.map(d=>d[b])),lookup=new Map(rows.map(d=>[key(d[a],d[b]),d]));return{columns,groups,rows:columns.map(c=>({key:c,values:Object.fromEntries(groups.map(g=>[g,lookup.get(key(c,g)).value]))})),lookup};}

export function parallelSetsLayout(rows,height=300,gap=12){
  const keys=['a','b','c'],total=d3.sum(rows,d=>d.value),cats=keys.map(k=>unique7(rows.map(d=>d[k]))),scale=(height-(d3.max(cats,c=>c.length)-1)*gap)/total;
  const bands=rows.map(d=>({...d,positions:[],thickness:d.value*scale})),axes=cats.map((names,j)=>{let y=(height-(total*scale+(names.length-1)*gap))/2;return names.map(name=>{const start=y;rows.forEach((d,i)=>{if(d[keys[j]]===name){bands[i].positions[j]=y;y+=bands[i].thickness;}});const result={name,y:start,height:y-start,value:(y-start)/scale};y+=gap;return result;});});return{total,scale,bands,axes};
}

// Abramowitz–Stegun normal CDF approximation, inverted by bounded bisection.
export function normalQuantile(p){if(p<=0)return-Infinity;if(p>=1)return Infinity;if(p===.5)return 0;const cdf=x=>{const a=Math.abs(x),t=1/(1+.2316419*a),tail=Math.exp(-a*a/2)/Math.sqrt(2*Math.PI)*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));return x<0?tail:1-tail;};let lo=-9,hi=9;for(let i=0;i<64;i++){const mid=(lo+hi)/2;if(cdf(mid)<p)lo=mid;else hi=mid;}return(lo+hi)/2;}
export function qqRows(rows){const mean=d3.mean(rows,d=>d.value),sd=d3.deviation(rows,d=>d.value);return[...rows].sort((a,b)=>a.value-b.value).map((r,i)=>({...r,theoretical:mean+sd*normalQuantile((i+.5)/rows.length)}));}
// Insert exact threshold crossings before folding, so opposite signs never overlap.
export function horizonSamples(rows,series,band){const points=rows.map(r=>({time:Date.parse(r.key),value:r.values[series]})),result=[];points.forEach((p,i)=>{const a=points[i-1];if(a&&a.value!==null&&p.value!==null&&a.value!==p.value){const crossed=[-3,-2,-1,0,1,2,3].map(n=>n*band).filter(v=>v>Math.min(a.value,p.value)&&v<Math.max(a.value,p.value)).map(value=>({time:a.time+(p.time-a.time)*(value-a.value)/(p.value-a.value),value})).sort((x,y)=>x.time-y.time);result.push(...crossed);}result.push(p);});return result;}
export function survivalSteps(rows){let risk=rows.length,survival=1;return unique7(rows.map(d=>d.duration)).sort((a,b)=>a-b).map(time=>{const own=rows.filter(d=>d.duration===time),ended=own.filter(d=>d.status==='ended').length,censored=own.length-ended;survival*=1-ended/risk;const point={time,survival,risk,ended,censored};risk-=own.length;return point;});}
export function networkLayout(rows){const nodes=unique7(rows.flatMap(d=>[d.source,d.target])).map(id=>({id})),links=rows.map(r=>({...r}));const simulation=d3.forceSimulation(nodes).randomSource(d3.randomLcg(42)).force('link',d3.forceLink(links).id(d=>d.id).distance(70)).force('charge',d3.forceManyBody().strength(-170)).force('center',d3.forceCenter(0,0)).force('collide',d3.forceCollide(22)).stop();simulation.tick(220);return{nodes,links};}
export function likertLayout(doc){return unique7(doc.data.map(d=>d.question)).map(question=>{const rows=doc.responses.map(response=>doc.data.find(d=>d.question===question&&d.response===response));let x=-rows[0].value-rows[1].value-rows[2].value/2;return{question,segments:rows.map(r=>{const d={...r,start:x,end:x+r.value};x+=r.value;return d;})};});}
export function volume7Summary(doc,fmt){const r=doc.data,id=doc.template;if(['pie','stackedcolumn','streamgraph','network','directedchord','parallelsets','edgebundle'].includes(id))return{value:fmt(d3.sum(r,d=>d.value)),unit:doc.unit,label:uiText('数量合计')};if(id==='gauge')return{value:fmt(r[0].value),unit:doc.unit,label:uiMessage`目标 ${fmt(r[0].target)}`};if(id==='raincloud'||id==='qqplot')return{value:fmt(d3.median(r,d=>d.value)),unit:doc.unit,label:uiMessage`${r.length} 个原始样本 · 中位数`};if(['polarline','horizon','cycleplot','eventline','survival','vectorfield','voronoi','likert','bubble3d','lines3d'].includes(id))return{value:String(r.filter(d=>d.value!==null).length),unit:uiText('条'),label:uiText('有效观测记录')};}
