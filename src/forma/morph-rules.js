import {uiText,uiMarkup,uiMessage} from './locale.js';
export const MORPH_ROW_LIMIT=80;
export const signedViews=new Set(['bars','columns','line','area','dot','lollipop','diverging','step']);
export const gapViews=new Set(['bars','columns','line','area','step','diverging']);
export const shareViews=new Set(['pie','donut','semidonut','stacked','treemap','waffle']);

export function validateMorphDocument(doc,{layout=true}={}){
  if(!doc||!Array.isArray(doc.data)||!doc.data.length||doc.data.length>1500)throw new Error(uiText('数据需要 1–1,500 条记录。'));
  if(layout&&(doc.data.length<2||doc.data.length>MORPH_ROW_LIMIT))throw new Error(uiMessage`连续变形布局支持 2–${MORPH_ROW_LIMIT} 个类别；数据完整保留。`);
  if(typeof doc.title!=='string'||!doc.title.trim()||doc.title.length>80)throw new Error(uiText('请填写 1–80 字的标题。'));
  if(typeof doc.unit!=='string'||!doc.unit.trim()||doc.unit.length>24)throw new Error(uiText('请填写有效单位。'));
  if(!doc.source||typeof doc.source.name!=='string'||!doc.source.name.trim()||doc.source.name.length>160||!['demo','user','public'].includes(doc.source.type))throw new Error(uiText('请注明数据来源和来源类型。'));
  const labels=new Set();let observed=0;
  for(const row of doc.data){
    if(typeof row.label!=='string'||!row.label.trim()||row.label.length>80||labels.has(row.label))throw new Error(uiText('类别名称须为不重复的 1–80 字文本。'));
    if(row.value!==null){if(typeof row.value!=='number'||!Number.isFinite(row.value)||Math.abs(row.value)>1e15)throw new Error(uiText('数值须为有限数字；缺失观测填写 null。'));observed++;}
    labels.add(row.label);
  }
  if(observed<(layout?2:1))throw new Error(uiText('当前图型需要有效观测，缺失不能补零。'));
  return true;
}

export function morphEligibility(doc,view){
  try{validateMorphDocument(doc);}catch(e){return {valid:false,reason:e.message};}
  const limit={unit:12,step:48,radialbars:80,polarline:80}[view]||24;
  if(doc.data.length>limit)return {valid:false,reason:uiMessage`该图型最多连续变形 ${limit} 个类别；不会截掉多余数据。`};
  if(view==='unit'&&doc.data.some(r=>!Number.isInteger(r.value)||r.value<0||r.value>50))return {valid:false,reason:uiText('单位堆叠需要 0–50 的整数，每点代表一个单位。')};
  if(view==='funnel-bars'&&(doc.data[0].value<=0||doc.data.some((r,i)=>!Number.isInteger(r.value)||r.value<0||i>0&&r.value>doc.data[i-1].value)))return {valid:false,reason:uiText('转化漏斗需要同一批对象逐步减少，阶段数量为非负整数。')};
  if(view==='radar'&&doc.data.length<3)return {valid:false,reason:uiText('雷达图至少需要三个维度。')};
  if(!gapViews.has(view)&&doc.data.some(r=>r.value===null))return {valid:false,reason:uiText('该图型不接受缺失值，可选柱、条、折线或面积图保留缺口。')};
  if(!signedViews.has(view)&&doc.data.some(r=>r.value<0))return {valid:false,reason:uiText('该图型不接受负数，可选柱、条、折线、面积、点图或棒棒糖图。')};
  if(view!=='unit'&&!signedViews.has(view)&&doc.data.every(r=>!r.value))return {valid:false,reason:uiText('全部为零时无法计算面积或占比，可选柱、条或折线图。')};
  return {valid:true,reason:''};
}

export function numericDomain(data){
  const values=data.map(r=>r.value).filter(Number.isFinite),min=Math.min(0,...values),max=Math.max(0,...values);
  return min===max?[0,1]:[min,max];
}

export function pairRecipe(from,to){
  if(from===to)return {id:'update',name:uiText('数值更新'),description:uiText('同一类别保留颜色，位置和大小随真实数值更新。')};
  if([from,to].includes('unit'))return {id:'units',name:uiText('逐点拆分'),description:uiText('整根柱体分解成等量单元，每一点表示一个单位；返回时单元合拢成柱。')};
  if([from,to].includes('step'))return {id:'steps',name:uiText('阶梯接续'),description:uiText('对应的观测点保持身份，线段展开为变更后持续生效的阶梯。')};
  if([from,to].includes('polarline'))return {id:'cycle',name:uiText('周期环绕'),description:uiText('按周期顺序移动观测点，首尾闭合；半径从零读取真实数值。')};
  if([from,to].includes('diverging')||[from,to].every(v=>['bars','columns','dot','lollipop','funnel-bars'].includes(v)))return {id:'reorient',name:uiText('沿轴归位'),description:uiText('对应类别沿坐标轴移动，零基线与正负方向保持可追踪。')};
  if([from,to].every(v=>['bubbles','treemap','squares'].includes(v)))return {id:'pack',name:uiText('等比重组'),description:uiText('同一类别的面积按原值计算，圆与矩形连续重排，类别颜色保持一致。')};
  if((from==='columns'&&to==='line')||(from==='line'&&to==='columns'))return {id:'endpoints',name:uiText('柱顶接线'),description:uiText('柱体收成顶端的数据点，再连接成线；返回时从数据点展开柱体。')};
  if((from==='line'&&to==='area')||(from==='area'&&to==='line'))return {id:'fill',name:uiText('沿线展开'),description:uiText('保持数据点的位置，从折线向零基线展开填充。')};
  if(['pie','donut','semidonut'].includes(from)&&['pie','donut','semidonut'].includes(to))return {id:'radial',name:uiText('扇区展开'),description:uiText('保留类别顺序，让扇区沿半径与角度连续变化。')};
  return {id:'contour',name:uiText('轮廓变形'),description:uiText('对应类别保留身份和颜色，轮廓逐步变为目标图型。')};
}
