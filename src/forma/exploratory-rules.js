import {uiText} from './locale.js';
import {spatialGrid} from './spatial-grid.js';
import {recordId} from './data-identity.js';

// Each view is another encoding of the same source table. No rows, fitted
// values, dates or third coordinates are manufactured for a transition.
export const exploratoryViews=[
  {id:'matrix-clustered',name:uiText('聚类重排矩阵'),en:'Clustered matrix order',note:uiText('同一批单元按欧氏距离与平均连接重排，色阶与原值不变；树枝表示合并距离，不表示显著性或因果。')},
  {id:'matrix-heatmap',name:uiText('数值热力矩阵'),en:'Numeric heatmap',note:uiText('每个行列组合保留原值，色深表示数值；缺失格保留斜线，零值单独标注。')},
  {id:'matrix-bubbles',name:uiText('数值气泡矩阵'),en:'Bubble matrix',note:uiText('同一个格子收为圆，圆面积与非负原值成正比；缺失仍为斜线，真实零值显示 0。')},
  {id:'ordered-estimate-line',name:uiText('时序点估计'),en:'Estimates over time',note:uiText('按真实日期连接已有的点估计，缺失观测保留断点；不重新计算估计值。')},
  {id:'ordered-estimate-band',name:uiText('时序区间带'),en:'Interval ribbon',note:uiText('同一条估计线向输入的上下界展开；区间定义和日期间距保持不变。')},
  {id:'ordered-estimate-intervals',name:uiText('逐点误差区间'),en:'Intervals by date',note:uiText('每个日期保留点估计与上下界，连续色带收回为各观测自己的误差区间。')},
  {id:'trajectory-points',name:uiText('时间观测散点'),en:'Time-stamped observations',note:uiText('每个日期对应一个真实 X、Y 观测，等大点保留全部日期与记录身份。')},
  {id:'trajectory-path',name:uiText('时间轨迹连线'),en:'Connected time path',note:uiText('点位保持不动，路径按真实日期连接同一对象；连线表示时间顺序，不表示回归关系。')},
  {id:'spatial-surface',name:uiText('三维采样曲面'),en:'Sampled 3D surface',note:uiText('完整规则网格上的原始高度连接为三角曲面；可连续收为采样点，再展开回同一张曲面。')},
  {id:'spatial-bubbles',name:uiText('三维规模气泡'),en:'3D magnitude bubbles',note:uiText('保留真实 X、Y、Z，球体的正交投影面积与 size 成正比；可连续收为等大散点。')},
  {id:'spatial-3d',name:uiText('三维观测空间'),en:'Orthographic 3D scatter',note:uiText('三个实际坐标映射到标注量纲的正交投影空间，等大点代表原始对象。')},
  {id:'spatial-xy',name:uiText('XY 平面投影'),en:'XY projection',note:uiText('沿 Z 方向收拢，读取原始 X、Y；隐藏的 Z 数值保留在表格与提示中。')},
  {id:'spatial-xz',name:uiText('XZ 平面投影'),en:'XZ projection',note:uiText('沿 Y 方向收拢，读取原始 X、Z；所有对象与第三维数值继续保留。')},
  {id:'spatial-yz',name:uiText('YZ 平面投影'),en:'YZ projection',note:uiText('沿 X 方向收拢，读取原始 Y、Z；投影重叠不代表原始空间中相同的位置。')}
];
const familyByView=new Map(exploratoryViews.map(v=>[v.id,v.id.startsWith('matrix-')?'matrix':v.id.startsWith('ordered-')?'ordered-estimates':v.id.startsWith('trajectory-')?'trajectory':'spatial']));
export const exploratoryFamily=view=>familyByView.get(view);
export const isExploratoryView=view=>familyByView.has(view);
export const exploratoryViewMap={clusterheatmap:'matrix-clustered',heatmap:'matrix-heatmap',ribbon:'ordered-estimate-band',trajectory:'trajectory-path',scatter3d:'spatial-3d',bubble3d:'spatial-bubbles',surface3d:'spatial-surface'};
const finite=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e15;
const text=v=>typeof v==='string'&&!!v.trim();
const unique=a=>[...new Set(a)];
const bounds=a=>{const v=a.filter(finite);return v.length?[Math.min(...v),Math.max(...v)]:[0,1];};
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;

export function exploratoryDocument(doc,common){
  const family=exploratoryFamily(exploratoryViewMap[doc.template]);
  return {...common,family,axes:{...doc.axes},intervalLabel:doc.intervalLabel,
    data:doc.data.map((r,row)=>({...r,...(doc.template==='surface3d'?{z:r.value,group:uiText('采样'),label:`(${r.x}, ${r.y})`}:{}),rowName:family==='matrix'?r.row:undefined,label:r.label??r.period??(doc.template==='surface3d'?`(${r.x}, ${r.y})`:JSON.stringify([r.row,r.column])),row}))};
}
export function exploratoryEligibility(doc,view){
  const bad=reason=>({valid:false,reason}),rows=doc.data,family=exploratoryFamily(view);
  if(rows.some(r=>!text(recordId(r)))||unique(rows.map(recordId)).length!==rows.length)return bad(uiText('每条观测需要独立且持久的记录 ID。'));
  if(family==='matrix'){
    const rowNames=unique(rows.map(r=>r.rowName)),columns=unique(rows.map(r=>r.column));
    if(rows.some(r=>!text(r.rowName)||!text(r.column)||r.value!==null&&!finite(r.value)))return bad(uiText('矩阵需要行类别、列类别和有限数值；缺失值明确留空。'));
    if(unique(rows.map(r=>JSON.stringify([r.rowName,r.column]))).length!==rows.length||rows.length!==rowNames.length*columns.length)return bad(uiText('每个行列组合只出现一次；缺失格保留记录并填写 null。'));
    if(rowNames.length>12||columns.length>16)return bad(uiText('此变形布局最多展示 12 行 × 16 列；完整原表仍会保留。'));
    if(!rows.some(r=>finite(r.value)))return bad(uiText('至少需要一个有效数值。'));
    if(view==='matrix-clustered'&&(rowNames.length<2||columns.length<2||rows.some(r=>r.value===null)))return bad(uiText('聚类需要至少 2 行 × 2 列完整的同量纲矩阵；缺失值不会填零或删行，可保留普通热图。'));
    if(view==='matrix-bubbles'&&rows.some(r=>r.value!==null&&r.value<0))return bad(uiText('气泡面积不能表示负数，请使用热力矩阵；原始负数不会被取绝对值。'));
  }else if(family==='ordered-estimates'){
    if(!text(doc.intervalLabel))return bad(uiText('请说明输入上下界的含义与置信水平。'));
    if(rows.length>120)return bad(uiText('此时序区间布局最多展示 120 个日期；完整原表仍会保留。'));
    if(rows.some(r=>!date(r.period))||unique(rows.map(r=>r.period)).length!==rows.length)return bad(uiText('每次观测需要唯一的真实日期，格式为 YYYY-MM-DD。'));
    if(rows.some(r=>![r.estimate,r.low,r.high].every(v=>v===null)&&(![r.estimate,r.low,r.high].every(finite)||r.low>r.estimate||r.estimate>r.high)))return bad(uiText('须满足下界 ≤ 估计值 ≤ 上界；缺失时三项都留空。'));
    if(rows.filter(r=>r.estimate!==null).length<2)return bad(uiText('至少需要两个有效观测。'));
  }else{
    const dimensions=family==='spatial'?['x','y','z']:['x','y'];
    if(dimensions.some(d=>!text(doc.axes[d]))||rows.some(r=>dimensions.some(d=>!finite(r[d]))))return bad(uiText('每个对象都需要完整坐标，并注明每个坐标轴的指标与单位。'));
    if(view==='spatial-bubbles'&&(!text(doc.axes.size)||rows.some(r=>!finite(r.size)||r.size<=0)))return bad(uiText('三维气泡需要真实的正数 size，并注明大小指标与单位。'));
    if(view==='spatial-surface'&&!spatialGrid(rows))return bad(uiText('曲面需要完整且均匀的 X、Y 规则网格；缺失采样不能补零，也不能把散乱观测强行连成曲面。'));
    if(rows.length>300)return bad(uiText('此观测布局最多展示 300 个对象；完整原表仍会保留。'));
    if(family==='trajectory'&&(rows.some(r=>!date(r.period))||unique(rows.map(r=>r.period)).length!==rows.length))return bad(uiText('轨迹需要同一对象的唯一真实日期，不能按表格行号连接不同对象。'));
  }
  return {valid:true,reason:''};
}
export function exploratoryBounds(doc){
  if(doc.family==='matrix')return {value:bounds(doc.data.map(r=>r.value))};
  if(doc.family==='ordered-estimates')return {time:bounds(doc.data.map(r=>Date.parse(r.period))),value:bounds(doc.data.flatMap(r=>[r.low,r.high]))};
  return Object.fromEntries((doc.family==='spatial'?['x','y','z']:['x','y']).map(k=>[k,bounds(doc.data.map(r=>r[k]))]));
}
export function exploratoryCompatibility(a,b){
  if(a.family!==b.family)return uiText('图型数据结构不同');
  if(a.family==='ordered-estimates'&&a.intervalLabel!==b.intervalLabel)return uiText('区间定义或置信水平不同');
  if(['trajectory','spatial'].includes(a.family)&&['x','y',...(a.family==='spatial'?['z']:[])].some(k=>a.axes[k]!==b.axes[k]))return uiText('坐标指标的含义或单位不同');
  if(a.family==='spatial'&&a.axes.size&&b.axes.size&&a.axes.size!==b.axes.size)return uiText('大小指标的含义或单位不同');
  return '';
}
export function exploratoryRecipe(from,to){
  const family=exploratoryFamily(to);
  if(from===to)return {id:'exploratory-update',name:uiText('对应观测更新'),description:uiText('同一记录保留身份，按新数据连续更新位置与编码。')};
  if(family==='matrix')return [from,to].includes('matrix-clustered')?{id:'matrix-order',name:uiText('矩阵重排'),description:uiText('同一格先沿行方向、再沿列方向移动到聚类位置；使用原值欧氏距离与平均连接，不自动标准化，色阶和单元身份不变。')}:{id:'matrix-area',name:uiText('色格转面积'),description:uiText('同一格保留中心与身份，矩形连续收成按原值计算面积的圆；缺失格不参与面积转换。')};
  if(family==='ordered-estimates')return {id:'ordered-interval',name:uiText('区间展开与收束'),description:uiText('点估计始终保留；每个日期的上下界从区间带收束为误差线，日期和区间含义保持不变。')};
  if(family==='trajectory')return {id:'time-connect',name:uiText('沿时间接线'),description:uiText('原始点保留坐标，连线从较早日期逐段延伸，表示同一对象的时间路径。')};
  if([from,to].includes('spatial-surface'))return {id:'spatial-mesh',name:uiText('曲面与采样点'),description:uiText('三角网格沿真实采样点连续收束与展开；位置、记录 ID 和输入高度保留，三维顶点逐帧更新。')};
  if([from,to].includes('spatial-bubbles'))return {id:'spatial-size',name:uiText('三维规模变形'),description:uiText('同一对象在三维空间保留坐标，球体连续改变大小；投影面积使用实际 size，共用尺度。')};
  return {id:'spatial-project',name:uiText('空间投影'),description:uiText('同一对象连续移向目标坐标平面；可见轴注明实际维度，投影会重叠的对象仍保留独立记录。')};
}
export function exploratoryGuide(doc,view){
  const intro=exploratoryViews.find(v=>v.id===view)?.note||'',family=exploratoryFamily(view);
  const text=family==='matrix'?uiText('每行填写一个行类别与列类别的交叉单元，以及该单元的原始数值。各组合完整保留；没有采集的格填写 null，真实零值填写 0。气泡只使用非负原值，面积共用同一尺度。'):family==='ordered-estimates'?uiText('每行填写日期、点估计、下界和上界，并说明区间定义。日期按真实时间排序；三项一起留空表示该日缺失。图表直接使用已有分析结果，不推算未提供的上下界。'):family==='trajectory'?uiText('每行填写同一对象的一次日期、X 与 Y 观测，并在轴名称中写明单位。日期决定连接顺序，改动表格行顺序不会改变路径。多个对象不能被拼接成一条轨迹。'):uiText('每行填写唯一对象名称、分组和三个真实坐标，并注明 X、Y、Z 的指标与单位。三维气泡需额外填写正数 size 和 axes.size；曲面仅接受完整均匀的 X、Y 网格。二维投影只隐藏一维，原始数据和记录 ID 都会保留；空间使用正交投影，不把视觉距离当成真实距离。');
  return [intro,text,uiText('可反向、跳步或中途切换。不同单位或观测含义的步骤正常播放入场动画，不强制连续变形。')];
}
