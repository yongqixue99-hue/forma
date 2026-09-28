import {extent,sum} from 'd3';
import {isEnglish} from './locale.js';
import {recordId,populationId} from './data-identity.js';
import {hierarchy13} from './volume13-data.js';
export const structuralText=(zh,en)=>isEnglish()?en:zh;
const t=structuralText,uniq=a=>[...new Set(a)],finite=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e15,text=v=>typeof v==='string'&&!!v.trim();
const view=(id,family,zh,en,noteZh,noteEn)=>({id,family,get name(){return t(zh,en);},en,get note(){return t(noteZh,noteEn);}});
export const structuralViews=[
 view('structural-bubbles','matrix-cell','矩阵气泡','Matrix bubbles','圆面积表示非负原值；零和缺测使用不同的空心标记。','Circle area represents a nonnegative value; zero and missing cells use distinct outlined markers.'),
 view('structural-radial','matrix-cell','径向热力矩阵','Radial heat matrix','等角扇区、等厚圆环；只有颜色表示原值，单元面积不表示数量。','Equal-angle sectors and equal-thickness rings; color encodes the original value, not cell area.'),
 view('structural-agreement','contingency','一致性与完整计数','Agreement and complete counts','对角方块边长表示一致频数；边际包络和完整旁表共同保留全部计数。','Diagonal square sides represent agreement counts. Marginal enclosures and a complete side table preserve every count.'),
 view('structural-association','contingency','独立性关联残差','Independence association residuals','宽度为 √E，高度为带符号 Pearson 残差；矩形面积对应 |O−E|。','Width encodes √E and signed height encodes Pearson residual; rectangle area represents |O−E|.'),
 view('structural-mosaic','contingency','频数马赛克','Count mosaic','行边际决定宽度、行内条件频数决定高度，面积表示联合频数。','Row margins set width and conditional counts set height; area encodes joint frequency.'),
 view('structural-pack','hierarchy-tree','嵌套层级圆','Nested hierarchy circles','只有叶圆面积表示原叶值；内部圆是包络，不是另一份可相加数量。','Only leaf-circle area represents original leaf values. Internal circles are enclosures, not additional additive quantities.'),
 view('structural-tree','hierarchy-tree','径向层级树','Radial hierarchy tree','连线表示父子关系，叶点面积表示原值；角度与枝长只是布局。','Links represent parenthood and leaf-point areas represent original values. Angles and edge lengths are layout only.'),
 view('structural-table','hierarchy-tree','层级汇总条形表','Hierarchy subtotal table','条形共用根总量尺度；内部节点原值保持 0，父子汇总不可再次相加。','Bars share the root-total scale. Internal original values stay zero; parent and child subtotals cannot be added again.')
];
export const structuralViewMap={matrix:'structural-bubbles',radialheatmap:'structural-radial',agreement:'structural-agreement',association:'structural-association',mosaicplot:'structural-mosaic',circlehierarchy:'structural-pack',radialtree:'structural-tree',treetable:'structural-table'};
const info=new Map(structuralViews.map(v=>[v.id,v]));
export const isStructuralView=v=>info.has(v);
export const structuralFamily=v=>info.get(v)?.family;
export function structuralDocument(doc,common={}){
 const family=structuralFamily(structuralViewMap[doc.template]);
 const data=doc.data.map((r,inputIndex)=>({...r,inputIndex,...(family==='matrix-cell'?{matrixRow:r.ring??r.row,matrixColumn:r.sector??r.column}:{})}));
 return {...doc,...common,family,data};
}
export function structuralMatrixNames(doc){return {rows:doc.rings||uniq(doc.data.map(r=>r.matrixRow)),columns:doc.sectors||uniq(doc.data.map(r=>r.matrixColumn))};}
export function structuralEligibility(doc,view){
 const bad=reason=>({valid:false,reason}),rows=doc?.data,family=structuralFamily(view);
 if(!family||doc?.family!==family||!Array.isArray(rows)||!rows.length)return bad(t('请选择此系列的完整原表。','Choose a complete native table for this series.'));
 if(rows.some(r=>!text(recordId(r)))||new Set(rows.map(recordId)).size!==rows.length)return bad(t('每条原始记录须保留唯一 _id。','Every original record must retain a unique _id.'));
 if(family==='matrix-cell'){
  const {rows:names,columns}=structuralMatrixNames(doc),keys=rows.map(r=>JSON.stringify([r.matrixRow,r.matrixColumn]));
  if(names.length<(view==='structural-radial'?2:3)||names.length>8||columns.length<(view==='structural-radial'?4:3)||columns.length>16||new Set(names).size!==names.length||new Set(columns).size!==columns.length||[...names,...columns].some(v=>!text(v))||rows.length!==names.length*columns.length||new Set(keys).size!==rows.length||rows.some(r=>!names.includes(r.matrixRow)||!columns.includes(r.matrixColumn)||r.value!==null&&!finite(r.value))||!rows.some(r=>r.value!==null))return bad(t('矩阵须完整；气泡支持 3–8 行 × 3–16 列，径向支持 2–8 行 × 4–16 列。缺测明确填 null，不省略、不补零。','Supply a complete grid: bubbles allow 3–8 rows and 3–16 columns; radial allows 2–8 rows and 4–16 columns. Missing cells are explicit null, never omitted or zero-filled.'));
  if(view==='structural-bubbles'&&rows.some(r=>r.value!==null&&r.value<0))return bad(t('圆面积仅适用于非负数量；负值仍可使用径向热图。','Circle area requires nonnegative quantities; signed values remain available in the radial heatmap.'));
 }else if(family==='contingency'){
  const rn=uniq(rows.map(r=>r.row)),cn=uniq(rows.map(r=>r.column));
  if(!text(doc.axes?.x)||!text(doc.axes?.y)||rn.length<2||rn.length>6||cn.length<2||cn.length>6||[...rn,...cn].some(v=>!text(v))||rows.some(r=>!Number.isSafeInteger(r.count)||r.count<0)||!Number.isSafeInteger(sum(rows,r=>r.count))||new Set(rows.map(r=>JSON.stringify([r.row,r.column]))).size!==rows.length||rows.length!==rn.length*cn.length||rn.some(n=>!rows.some(r=>r.row===n&&r.count>0))||cn.some(n=>!rows.some(r=>r.column===n&&r.count>0)))return bad(t('列联系列须提供 2–6 × 2–6 完整非负整数表、正边际合计及两个变量名称。','Contingency views require a complete 2–6 by 2–6 table of nonnegative integer counts, positive margins and both variable names.'));
  if(view==='structural-agreement'&&(!Array.isArray(doc.categories)||doc.categories.length!==rn.length||new Set(doc.categories).size!==rn.length||rn.length!==cn.length||[...rn,...cn].some(n=>!doc.categories.includes(n))))return bad(t('一致性图仅适用于明确声明共同 categories 的两位评审者，不自动把不同类别当成一致。','Agreement requires two raters with explicitly declared shared categories; different category systems are never treated as matching.'));
 }else{
  if(rows.some(r=>!text(r.id)||!text(r.parent)||!text(r.label)||!finite(r.value))||rows.length<3||rows.length>(view==='structural-table'?24:80))return bad(t('层级需 3–80 个完整节点；汇总表最多 24 个，内部原值为 0、叶值为正。','Hierarchy requires 3–80 complete nodes; the subtotal table allows at most 24. Internal values are zero and leaf values positive.'));
  try{const m=hierarchy13(rows);if(m.depth<1||m.depth>6||!Number.isFinite(m.total))return bad(t('层级深度须为 1–6，叶值合计须为有限数值。','Hierarchy depth must be 1–6 with a finite leaf total.'));}catch(e){return bad(e.message);}
 }
 return {valid:true,reason:''};
}
const partition=(doc,field)=>uniq(doc.data.map(r=>r[field])).map(name=>populationId('partition',doc.data.filter(r=>r[field]===name))).sort();
export function structuralCompatibility(a,b){
 if(a.family!==b.family)return t('图表数据结构不同。','Chart data structures differ.');
 if(a.unit!==b.unit||['name','type','url'].some(k=>a.source?.[k]!==b.source?.[k])||uniq([...Object.keys(a.axes||{}),...Object.keys(b.axes||{})]).some(k=>a.axes?.[k]!==b.axes?.[k]))return t('原值单位、来源或变量含义不同。','Original units, sources or variable meanings differ.');
 const byId=new Map(a.data.map(r=>[recordId(r),r]));if(byId.size!==b.data.length||b.data.some(r=>!byId.has(recordId(r))))return t('原始记录集合不同。','Original record populations differ.');
 if(a.family==='hierarchy-tree'){
  const parentIdentity=doc=>new Map(doc.data.map(r=>[r.id,recordId(r)])),ai=parentIdentity(a),bi=parentIdentity(b);
  if(b.data.some(r=>{const p=byId.get(recordId(r));return (p.parent==='ROOT'?'ROOT':ai.get(p.parent))!==(r.parent==='ROOT'?'ROOT':bi.get(r.parent));}))return t('父子归属发生变化，请明确展示结构变化。','Parenthood changed; present this structural change explicitly.');
 }else{
  const fields=a.family==='matrix-cell'?['matrixRow','matrixColumn']:['row','column'];
  if(fields.some(f=>JSON.stringify(partition(a,f))!==JSON.stringify(partition(b,f))))return t('行列记录归属发生变化。','Row or column membership changed.');
  if(a.family==='contingency'&&a.categories&&b.categories){const diagonal=doc=>doc.data.filter(r=>r.row===r.column).map(recordId).sort();if(JSON.stringify(diagonal(a))!==JSON.stringify(diagonal(b)))return t('一致类别的对应关系发生变化。','Agreement category correspondence changed.');}
 }
 return '';
}
export function structuralBounds(doc){
 if(doc.family==='matrix-cell'){const bounds=extent(doc.data.filter(r=>r.value!==null),r=>r.value);return {value:bounds};}
 return {value:[0,doc.family==='contingency'?sum(doc.data,r=>r.count):hierarchy13(doc.data).total]};
}
export function structuralRecipe(from,to){return {id:from===to?'structural-update':'structural-unfold',get name(){return t('同一原表连续展开','Continuous unfolding of one source table');},description:t('稳定记录节点在视图间连续移动和变形；原值、缺测和父子关系完整保留，派生汇总单独标明。','Stable record nodes move and morph continuously. Original values, missing cells and parenthood remain intact, with derived summaries explicitly separated.')};}
export function structuralGuide(doc,view){return [t('每行保留稳定 _id、原始字段、单位 unit 与来源 source；缺失单元不删行、不补零。','Retain stable _id, original fields, unit and source for every row. Missing cells are never dropped or zero-filled.'),info.get(view)?.note||'',doc.family==='contingency'?t('E=行合计×列合计/N，Pearson r=(O−E)/√E。只描述偏差，不输出 p 值。B=Σ对角频数²/Σ同行边际×同列边际，不作偶然一致校正。','E=row margin×column margin/N; Pearson r=(O−E)/√E. Deviations are descriptive, with no p-values. B=Σdiagonal counts²/Σpaired row×column margins, without chance correction.'):doc.family==='hierarchy-tree'?t('id/parent 定义真实树，根 parent=ROOT。内部 value=0，叶值>0；父子汇总重叠，不重复相加。','id/parent define the actual tree, with root parent=ROOT. Internal value=0 and leaf values>0; parent and child subtotals overlap.'):t('matrix 的 row/column 对应 radialheatmap 的 ring/sector；数值与类别归属不变。null 是缺测，0 是真实零，负值不能用圆面积。','Matrix row/column correspond to radialheatmap ring/sector without changing values or membership. Null means missing, zero is observed zero, and negative values cannot use circle area.')];}
export function structuralAgentGuide(english=false){return english?'Use the original FORMA structural-bubbles/radial, structural-agreement/association/mosaic and structural-pack/tree/table views. Preserve every _id, raw table, unit, source and axes. Matrix row/column correspond to ring/sector without copying values into missing cells. Null is missing; bubble area is nonnegative value, radial color is value and cell area is not quantity. Counts must be a complete nonnegative integer contingency table with positive margins. E=row margin*column margin/N and residual=(O-E)/sqrt(E); residuals are descriptive, not p-values. Agreement requires explicitly shared categories; B=sum(diagonal^2)/sum(row margin*column margin), not chance-corrected. Every contingency record remains editable, including off-diagonal and zero cells. Hierarchies preserve id/parent, root ROOT, internal value=0 and positive leaf values. Only packed leaf circles encode quantity by area; parent circles enclose descendants. Tree leaf points encode area; table bars encode leaf subtotals on one root-total scale. Parent and child totals overlap and must not be added. Keep every record node through reverse, direct jumps and interruptions. Use the original HTML/SVG player; do not recreate the renderer.':'使用原版 FORMA 的 structural-bubbles/radial、structural-agreement/association/mosaic、structural-pack/tree/table 视图。保留每个 _id、原表、unit、source、axes。矩阵 row/column 对应 ring/sector，不补缺测。null 为缺测；气泡面积为非负原值，径向热图只有颜色表示原值。列联表完整保留非负整数和正边际，E=行边际×列边际/N、残差=(O−E)/√E，不输出 p 值。一致性须明确共同 categories，B=Σ对角频数²/Σ同行列边际乘积，不作偶然校正；非对角和零频数仍可编辑。层级保留 id/parent，根 ROOT、内部 value=0、正叶值。仅叶圆面积代表原值，父圆是包络；树叶点面积表示原值，表条使用共同根总量尺度，父子汇总不可重复相加。保持同节点、倒放、跳步和中断连续，使用原版 HTML/SVG 播放器，不重写渲染器。';}

export function structuralColorKeys(doc){
 if(doc.family!=='hierarchy-tree')return doc.data.map(recordId);
 const model=hierarchy13(doc.data),byId=new Map(model.nodes.map(n=>[n.row.id,n]));
 const descendants=n=>[n.row,...n.children.flatMap(descendants)];
 return doc.data.map(r=>{let branch=byId.get(r.id);while(branch.row.parent!=='ROOT'&&byId.get(branch.row.parent).row.parent!=='ROOT')branch=byId.get(branch.row.parent);return populationId('hierarchy-branch',descendants(branch).filter(q=>branch.row.parent!=='ROOT'||q.id===branch.row.id));});
}
