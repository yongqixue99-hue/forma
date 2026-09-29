import {max} from 'd3';
import {isEnglish} from './locale.js';
import {recordId,populationId} from './data-identity.js';
import {validateDocument} from './data.js';
export const advancedRelationsText=(zh,en)=>isEnglish()?en:zh;
const t=advancedRelationsText,unique=values=>[...new Set(values)],view=(id,family,zh,en,zhNote,enNote)=>({id,family,get name(){return t(zh,en);},en,get note(){return t(zhNote,enNote);}});
export const advancedRelationsViews=[
 view('relationx-adjacency','relationx-matrix','有向邻接矩阵','Directed adjacency matrix','保留全部行列单元与零值；颜色表示原联系强度。','Keep every directed cell and explicit zero. Color encodes original strength.'),
 view('relationx-adjacency-radial','relationx-matrix','邻接矩阵环形展开','Adjacency rings','行变为同心环，列变为等角扇区；仍共用原值色阶。','Rows become rings and columns equal-angle sectors, retaining the shared original-value color scale.'),
 view('relationx-bipartite','relationx-bipartite','二部网络双列联系','Bipartite links','严格保留左右两类与原始边；节点面积表示已观测联系合计。','Keep both declared partitions and every observed edge. Node area represents observed incident totals.'),
 view('relationx-bipartite-circle','relationx-bipartite','二部网络环形联系','Circular bipartite links','两类沿左右半圆展开；缺边不补零，曲线跨度不是测量。','Partitions follow opposite semicircles. Absent links are not zero-filled and spans are not measurements.'),
 view('relationx-ego','relationx-ego','自我网络与邻居','Ego and direct alters','中心节点与直接邻居保留；邻居之间的原始联系不删减。','Keep the focal node, direct alters and all observed alter-to-alter links.'),
 view('relationx-ego-arc','relationx-ego','自我网络弧线展开','Ego network arcs','同一中心及邻居展开到共同基线，线宽仍表示原强度。','The focal node and alters unfold onto one baseline; width still encodes original strength.'),
 view('relationx-bundle','relationx-bundle','层次关系圆周汇束','Hierarchical edge bundles','复用原生层次汇束曲线，保留每个节点的分组和每条联系。','Reuse native hierarchical bundle curves, preserving node groups and every original link.'),
 view('relationx-bundle-linear','relationx-bundle','层次关系平面展开','Linear hierarchical bundles','按同一分组树展开，汇束只是布局，不合并原始边。','Unfold the same group hierarchy; bundling changes layout without aggregating original edges.'),
 view('relationx-hive','relationx-hive','三轴蜂巢联系','Three-axis hive links','轴上位置使用原始显式0–1属性；线宽为联系强度。','Axis positions use supplied 0–1 attributes; width encodes link strength.'),
 view('relationx-hive-parallel','relationx-hive','蜂巢属性轴展开','Parallel hive axes','将三根属性轴平行展开，原位置与跨轴联系保持不变。','Unfold three attribute axes in parallel while retaining positions and cross-axis links.'),
 view('relationx-parallelsets','relationx-paths','三分类完整路径','Complete three-category paths','每条带保留完整a→b→c记录，不从两两汇总虚构路径。','Each ribbon retains its complete a→b→c row; no paths are inferred from pairwise summaries.'),
 view('relationx-parallelsets-radial','relationx-paths','三分类路径环绕展开','Radial category paths','三轴环绕展开，每条原始带连续贯穿三个分类，宽度与原值成比例。','Three axes wrap around while each original ribbon retains its full path and proportional width.'),
 view('relationx-upset','relationx-intersections','排他交集UpSet','Exclusive-intersection UpSet','每列是一个完整排他交集；成员圆点与计数始终对应同一原记录。','Each column is one exclusive intersection; membership dots and counts refer to the same original row.'),
 view('relationx-intersections','relationx-intersections','排他交集成员展开','Expanded intersection memberships','交集按原值横向比较，成员矩阵完整保留；零计数仍保留原行。','Compare original intersection counts horizontally with the complete membership matrix. Zero counts retain their rows.'),
 view('relationx-venn','relationx-intersections','三集合排他Venn','Three-set exclusive Venn','严格使用三个集合和七种排他交集；圆及区域面积不编码数量。','Require exactly three sets and all seven exclusive regions. Circle and region areas do not encode counts.')
];
export const advancedRelationsViewMap={adjacency:'relationx-adjacency',bipartite:'relationx-bipartite',egonetwork:'relationx-ego',edgebundle:'relationx-bundle',hiveplot:'relationx-hive',parallelsets:'relationx-parallelsets',upset:'relationx-upset',venn:'relationx-venn'};
const info=new Map(advancedRelationsViews.map(v=>[v.id,v]));
export const isAdvancedRelationsView=view=>info.has(view);
export const advancedRelationsFamily=view=>info.get(view)?.family;
export function advancedRelationsDocument(doc,common={}){return {...doc,...common,family:advancedRelationsFamily(advancedRelationsViewMap[doc.template]),data:doc.data.map((row,inputIndex)=>({...row,inputIndex}))};}
export function advancedRelationsEligibility(doc,view){
 const bad=reason=>({valid:false,reason}),family=advancedRelationsFamily(view);
 if(!family||doc?.family!==family||advancedRelationsFamily(advancedRelationsViewMap[doc?.template])!==family||!Array.isArray(doc?.data)||!doc.data.length)return bad(t('请选择相同原生关系数据契约。','Choose the same native relation-data contract.'));
 if(doc.data.some(r=>typeof recordId(r)!=='string'||!recordId(r))||new Set(doc.data.map(recordId)).size!==doc.data.length)return bad(t('每条原记录必须保留唯一_id。','Every original row must retain a unique _id.'));
 const template=view==='relationx-venn'?'venn':view==='relationx-upset'?'upset':doc.template;
 try{const report=validateDocument({...doc,template});if(!report.valid)return bad(report.errors.map(e=>typeof e==='string'?e:e.message).join(' '));}catch{return bad(t('原始字段或声明列表无效。','Raw fields or declared lists are invalid.'));}
 return {valid:true,reason:''};
}
export function advancedRelationsNodes(doc){
 const rows=Array.isArray(doc?.data)?doc.data:[],names=unique(rows.flatMap(r=>[r.source,r.target]).filter(n=>typeof n==='string'));
 return names.map(name=>{const own=rows.filter(r=>r.source===name||r.target===name),source=rows.filter(r=>r.source===name).map(recordId).sort(),target=rows.filter(r=>r.target===name).map(recordId).sort();return{name,rows:own,identity:JSON.stringify(['relationx-node',source,target]),total:own.reduce((s,r)=>s+(Number.isFinite(r.value)?r.value:0),0)};});
}
const incidence=doc=>new Map(advancedRelationsNodes(doc).map(n=>[n.name,n.identity]));
export function advancedRelationsCompatibility(a,b){
 if(a.family!==b.family)return t('关系数据契约不同。','Relation-data contracts differ.');
 if(a.unit!==b.unit||['name','type','url'].some(k=>a.source?.[k]!==b.source?.[k]))return t('原始单位或来源不同。','Original units or provenance differ.');
 const old=new Map(a.data.map(r=>[recordId(r),r]));if(old.size!==b.data.length||b.data.some(r=>!old.has(recordId(r))))return t('原始记录集合不同。','Original record populations differ.');
 if(a.family==='relationx-intersections'){
  if(!Array.isArray(a.sets)||!Array.isArray(b.sets)||a.sets.length!==b.sets.length)return t('声明的集合结构不同。','Declared set structures differ.');
  const mask=(d,r)=>r.members.split('|').map(m=>d.sets.indexOf(m)).sort().join(',');
  if(b.data.some(r=>mask(a,old.get(recordId(r)))!==mask(b,r)))return t('排他交集成员或集合顺序不同。','Exclusive memberships or set order differ.');
 }else if(a.family==='relationx-paths'){
  if(['a','b','c'].some(k=>a.axes?.[k]!==b.axes?.[k]))return t('分类轴含义不同。','Category-axis meanings differ.');
  for(const field of['a','b','c']){const id=(d,r)=>populationId('relationx-category',d.data.filter(v=>v[field]===r[field]));if(b.data.some(r=>id(a,old.get(recordId(r)))!==id(b,r)))return t('完整路径的分类归属不同。','Complete-path category memberships differ.');}
 }else{
  const an=incidence(a),bn=incidence(b);if(b.data.some(r=>{const p=old.get(recordId(r));return an.get(p.source)!==bn.get(r.source)||an.get(p.target)!==bn.get(r.target);}))return t('原边端点归属不同。','Original edge endpoint memberships differ.');
  for(const field of['nodes','leftNodes','rightNodes'])if(a[field]!==undefined||b[field]!==undefined){if(!Array.isArray(a[field])||!Array.isArray(b[field])||JSON.stringify(a[field].map(n=>an.get(n)||n))!==JSON.stringify(b[field].map(n=>bn.get(n)||n)))return t('节点顺序或分区不同。','Node order or partition differs.');}
  if(a.family==='relationx-ego'&&an.get(a.ego)!==bn.get(b.ego))return t('中心节点不同。','The focal node differs.');
  if(['relationx-bundle','relationx-hive'].includes(a.family)){
   const groups=doc=>{const own=new Map();for(const r of doc.data)for(const side of['source','target'])own.set(r[side],r[side+'Group']);return new Map([...own].map(([n,g])=>[n,JSON.stringify([...own].filter(([,group])=>group===g).map(([name])=>incidence(doc).get(name)).sort())]));},ag=groups(a),bg=groups(b);
   if(b.data.some(r=>{const p=old.get(recordId(r));return ['source','target'].some(side=>ag.get(p[side])!==bg.get(r[side]));}))return t('节点的分组归属不同。','Node group memberships differ.');
   if(a.family==='relationx-hive'){const axes=d=>d.axisOrder?.map(g=>{const n=d.data.find(r=>r.sourceGroup===g||r.targetGroup===g);return n?groups(d).get(n.sourceGroup===g?n.source:n.target):null;});if(JSON.stringify(axes(a))!==JSON.stringify(axes(b)))return t('属性轴顺序不同。','Attribute-axis order differs.');}
  }
 }
 return '';
}
export function advancedRelationsBounds(doc){const rows=Array.isArray(doc?.data)?doc.data:[],values=rows.map(r=>r.value??r.count).filter(Number.isFinite);return {value:[0,Math.max(0,max(values)||0)||1]};}
export function advancedRelationsRecipe(){return{id:'relationx-unfold',get name(){return t('原关系与交集连续展开','Continuous unfolding of original relations and intersections');},description:t('每条原记录保持实时轮廓和稳定身份；节点、集合和分类合计标为派生汇总，不制造联系或交集。','Each original record keeps its live contour and stable identity. Nodes, sets and category totals are derived summaries; no links or intersections are invented.')};}
export function advancedRelationsGuide(doc,view){return[info.get(view)?.note||'',t('保留完整原字段、稳定_id、单位与来源。原始边/交集计数可编辑；节点与集合总数由原行派生，不当作额外观测。','Keep complete raw fields, stable _id, units and source. Original edges/intersection counts stay editable; node and set totals are derived, not additional observations.'),doc.family==='relationx-matrix'?t('方阵保留方向、自环、显式零和共同色阶；行是起点、列是终点，不自动对称化。','The complete matrix retains direction, self-links, explicit zeros and a shared color scale. Rows are sources and columns targets; no symmetrization.'):doc.family==='relationx-intersections'?t('members表示恰好属于这些集合且不属于其他声明集合；每行只计一次。Venn面积不编码数量，不把零交集删除来满足其他视图。','members means exactly these sets and none of the other declared sets; count each row once. Venn area does not encode count and zero intersections are never deleted to fit another view.'):doc.family==='relationx-hive'?t('sourcePosition/targetPosition是用户提供的0–1属性；仅坐标展开，不按行或权重重新排名。','sourcePosition/targetPosition are supplied 0–1 attributes. Only coordinates unfold; no ranks are inferred from rows or weights.'):doc.family==='relationx-paths'?t('完整a/b/c路径保持原记录和比例带宽；类别合计不算新的独立样本。','Complete a/b/c paths retain original rows and proportional ribbon width; category totals are not new independent samples.'):t('未列边不是零，不补边；线宽与原强度成比例。布局距离、跨度、角度和汇束均不代表实测距离。','Unlisted edges are not zeros and no edges are imputed. Width is proportional to original strength; layout distance, span, angle and bundling are not measurements.'),t('转场期间只观察坐标变化，停稳后读取数值。','Observe coordinate changes during morphing; read values after settling.')];}
export function advancedRelationsAgentGuide(english=false){return (english?'Use original FORMA relationx views: ':'使用原版FORMA relationx视图：')+advancedRelationsViews.map(v=>v.id).join(', ')+(english?'. Keep all native fields, stable _id, unit, source and explicit orders. Never add/drop edges, zero-fill absent links, symmetrize a directed matrix, merge distinct paths or discard zero intersections. Adjacency retains every declared nodes × nodes cell. Bipartite retains leftNodes/rightNodes including isolated nodes. Ego retains ego and every observed alter link. Edge bundles reuse the native hierarchy and curveBundle beta .72. Hive retains supplied group/position and axisOrder. Parallel sets retain each full a/b/c path. UpSet uses its positive native count contract; Venn requires exactly three sets and all seven exclusive regions, permitting zero. Venn area is not count. Counts/values remain editable; nodes, sets and categories are derived recordIds summaries. Keep the same live contours across forward/reverse/seek/resume; use the original HTML/SVG/video player.': '。保留全部原生字段、稳定_id、单位、来源和显式顺序。不得增删边、将缺边补零、把有向矩阵对称化、合并完整路径或丢弃零交集。邻接保留全部nodes×nodes单元。二部网络保留leftNodes/rightNodes及孤立节点。自我网络保留ego和全部邻居联系。层次汇束复用原生层次树与curveBundle beta .72。蜂巢保留显式分组/位置/axisOrder。平行集合保留完整a/b/c路径。UpSet严格使用正计数原生契约；Venn要求三集合七种排他区域并允许零，面积不编码数量。原count/value可编辑；节点/集合/分类标记是recordIds派生摘要。正反、跳步及中断接续保持同一实时轮廓，使用原版HTML/SVG/视频播放器。');}
export const advancedRelationsColorKeys=doc=>(doc?.data||[]).map(recordId);
export function advancedRelationsColorSubjects(doc){if(['adjacency','venn'].includes(doc?.template))return[];return(doc?.data||[]).map(r=>({id:recordId(r),label:typeof r.members==='string'?r.members:typeof r.a==='string'?`${r.a} → ${r.b} → ${r.c}`:`${r.source} ${doc.template==='bipartite'?'→':'↔'} ${r.target}`}));}
