import {uiText,uiMarkup,uiMessage} from './locale.js';
import {validateDocument} from './data.js';
import {measurementDomain,pairedZeroBased} from './axis-policy.js';

export const pairedViews=[
  {id:'paired-slope',name:uiText('斜率图'),en:'Paired slopes',note:uiText('同一对象的两次观测沿共同纵轴连接。连接只表示前后关系，不表示连续过程或因果。')},
  {id:'paired-dumbbell',name:uiText('哑铃图'),en:'Paired dumbbells',note:uiText('每行一个对象，空心点表示前值，实心点表示后值。两点的距离对应变化量。')},
  {id:'paired-bars',name:uiText('成对柱图'),en:'Paired columns',note:uiText('每个对象的前后值并排成柱，柱高从共同零点量起，原始配对关系保持不变。')},
  {id:'paired-points',name:uiText('配对散点图'),en:'Paired observations',note:uiText('每个样本保留前后两个点和连接线。横向轻微错开仅用于分辨样本，纵向位置始终是实测值。')},
  {id:'paired-change',name:uiText('配对变化图'),en:'Within-pair change',note:uiText('以零变化为基线，展示每个对象的后值减前值。保留两次原始观测，不生成检验结果或 p 值。')}
];
export const hierarchyViews=[
  {id:'hierarchy-sunburst',name:uiText('旭日图'),en:'Sunburst hierarchy',note:uiText('父类别在内环，子项在外环；角度表示总量中的份额，不能跨环比较面积。')},
  {id:'hierarchy-icicle',name:uiText('冰柱图'),en:'Icicle hierarchy',note:uiText('父类别在上层，子项在下层。每层按同一总量划分宽度，不重复累加父级与子项。')},
  {id:'hierarchy-treemap',name:uiText('层级矩形树图'),en:'Nested treemap',note:uiText('每个子项以矩形面积表示数值，同一父类别的子项相邻排列；边界保留层级归属。')}
];
export const relationalViews=[...pairedViews,...hierarchyViews];
export const isPairedView=id=>pairedViews.some(v=>v.id===id);
export const isHierarchyView=id=>hierarchyViews.some(v=>v.id===id);
export const isRelationalView=id=>isPairedView(id)||isHierarchyView(id);
export const relationalViewMap={slope:'paired-slope',dumbbell:'paired-dumbbell',paired:'paired-points',sunburst:'hierarchy-sunburst',icicle:'hierarchy-icicle'};
export const relationKey=(...parts)=>JSON.stringify(parts);
export function relationalDocument(step){
  const doc=step.doc;
  if(!relationalViewMap[doc.template]||!validateDocument(doc,{layout:false}).valid)return null;
  const paired=['slope','dumbbell','paired'].includes(doc.template);
  return {entities:doc.entities,title:doc.title,subtitle:doc.subtitle||'',unit:doc.unit,source:structuredClone(doc.source),family:paired?'paired':'hierarchy',
    ...(paired?{periodLabels:[...(doc.periodLabels||doc.pairLabels||[uiText('前值'),uiText('后值')])]}:{}),
    data:doc.data.map((r,row)=>paired?{...r,label:r.label,before:r.before,after:r.after,row}:{...r,label:relationKey(r.parent,r.label),parent:r.parent,child:r.label,value:r.value,row})};
}
export function relationalEligibility(doc,view){
  const bad=reason=>({valid:false,reason}),text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=160;
  if(!isRelationalView(view))return bad(uiText('未知的关联图型。'));
  if(!doc?.data?.length||!text(doc.title)||!text(doc.unit)||!text(doc.source?.name))return bad(uiText('请填写完整的数据、标题、单位与来源。'));
  const rows=doc.data;
  if(new Set(rows.map(r=>r.label)).size!==rows.length)return bad(uiText('每个对象需要唯一名称；层级子项由父类别与名称共同标识。'));
  if(isPairedView(view)){
    if(doc.family!=='paired'||rows.some(r=>!text(r.label)||![r.before,r.after].every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e15)))return bad(uiText('前后比较需要对象、前值、后值三列，不能用缺失值代替配对观测。'));
    const max=({'paired-slope':10,'paired-dumbbell':16,'paired-bars':12})[view]||50;
    if(rows.length<3||rows.length>max)return bad(uiMessage`此布局支持 3–${max} 个配对对象；较多样本可选配对散点图或配对变化图。`);
    if(!Array.isArray(doc.periodLabels)||doc.periodLabels.length!==2||doc.periodLabels.some(x=>!text(x)))return bad(uiText('请提供两次观测的名称。'));
  }else{
    if(doc.family!=='hierarchy'||rows.some(r=>!text(r.parent)||!text(r.child)||r.label!==relationKey(r.parent,r.child)||!Number.isFinite(r.value)||r.value<=0||r.value>1e15))return bad(uiText('层级数据需要父类别、子项和正数值；父级由子项求和。'));
    const parents=[...new Set(rows.map(r=>r.parent))];
    if(parents.length<2||parents.length>6||rows.length<6||rows.length>24||parents.some(p=>{const n=rows.filter(r=>r.parent===p).length;return n<2||n>6;}))return bad(uiText('支持 2–6 个父类别，每类 2–6 个子项，合计 6–24 个子项。'));
  }
  return {valid:true,reason:''};
}
export function pairedDomain(doc,view){
  const values=view==='paired-change'?doc.data.map(r=>r.after-r.before):doc.data.flatMap(r=>[r.before,r.after]);
  return measurementDomain(values,{zero:pairedZeroBased(view)});
}
export function relationalRecipe(from,to){
  if(from===to)return {id:'relational-update',name:uiText('对应数值更新'),description:uiText('同一对象或同一父类别下的子项保持身份，数值连续更新。')};
  if(isPairedView(to)){
    if([from,to].includes('paired-change'))return {id:'paired-baseline',name:uiText('对齐前值基线'),description:uiText('将每个对象的前值对齐到零，后值的位置对应后值减前值；原始两次观测保留在表格中。')};
    if([from,to].includes('paired-bars'))return {id:'paired-endpoints',name:uiText('成对端点展开'),description:uiText('同一个对象的两个端点展开为前后两根柱，保持对象、前后身份和数值。')};
    return {id:'paired-reorient',name:uiText('配对连线转向'),description:uiText('前后两个端点共同迁移，连接线始终跟随这两个点。')};
  }
  return [from,to].includes('hierarchy-sunburst')?{id:'hierarchy-unroll',name:uiText('层级展开'),description:uiText('同一父类别与子项从扇区展开为矩形，角度或面积由同一份原始值计算。')}:{id:'hierarchy-pack',name:uiText('层级归位'),description:uiText('子项从分层宽度排列为面积分区，父类别边界与子项身份保持对应。')};
}
