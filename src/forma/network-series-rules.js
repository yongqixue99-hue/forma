import {sum,max} from 'd3';
import {isEnglish} from './locale.js';
import {recordId} from './data-identity.js';
import {validateDocument} from './data.js';
export const networkText=(zh,en)=>isEnglish()?en:zh;
const t=networkText,unique=a=>[...new Set(a)];
const view=(id,family,zh,en,zhNote,enNote)=>({id,family,get name(){return t(zh,en);},en,get note(){return t(zhNote,enNote);}});
export const networkViews=[
 view('network-chord','network-undirected','无向关系弦带','Undirected chord ribbons','每条关系只计一次；弦带端宽表示原权重，节点弧汇总相邻联系。','Each undirected edge is counted once. Ribbon-end widths encode original weights; node arcs sum incident edges.'),
 view('network-arc','network-undirected','弧线关系展开','Arc relationship unfolding','原始边连续展开到共同基线；线宽表示权重，跨度不是测量值。','Original edges unfold onto a shared baseline. Width represents weight; span is not a measurement.'),
 view('network-force','network-undirected','力导关系网络','Force-directed relationships','保留每条原始无向边；线宽表示权重，布局距离不代表实测距离。','Every original undirected edge remains. Width represents weight; layout distance is not an observed distance.'),
 view('flow-sankey','network-directed','守恒桑基流带','Conserved Sankey ribbons','保留方向与原流量；仅适用于无环且中间节点流入等于流出的流量。','Preserve direction and original flow. Requires acyclic flows with balanced intermediate nodes.'),
 view('flow-chord','network-directed','有向弦带','Directed chord ribbons','往返联系是不同记录；箭头指向终点，端宽表示各自原流量。','Opposite directions remain separate records. Arrows point to targets; end widths encode original flow.'),
 view('flow-cycle','network-directed','循环与回流桑基','Cyclic and returning Sankey','回流与自环保留独立流带；节点流入、流出、净额分别展示，不自动配平。','Return links and loops remain distinct ribbons. Incoming, outgoing and net totals stay separate; no balancing is invented.')
];
export const networkViewMap={chord:'network-chord',arc:'network-arc',network:'network-force',alluvial:'flow-sankey',directedchord:'flow-chord',sankeycycle:'flow-cycle'};
const info=new Map(networkViews.map(v=>[v.id,v])),templates=Object.fromEntries(Object.entries(networkViewMap).map(([k,v])=>[v,k]));
export const isNetworkView=v=>info.has(v);
export const networkFamily=v=>info.get(v)?.family;
export function networkDocument(doc,common={}){return {...doc,...common,family:networkFamily(networkViewMap[doc.template]),data:doc.data.map((r,inputIndex)=>({...r,inputIndex}))};}
export function networkEligibility(doc,view){
 const bad=reason=>({valid:false,reason}),family=networkFamily(view),rows=doc?.data;
 if(!family||doc?.family!==family||!Array.isArray(rows)||!rows.length)return bad(t('请选择同一方向契约的完整关系表。','Choose a complete edge table with the same direction contract.'));
 if(rows.some(r=>typeof recordId(r)!=='string'||!recordId(r))||new Set(rows.map(recordId)).size!==rows.length)return bad(t('每条边必须保留唯一 _id。','Each edge must retain a unique _id.'));
 const validation=validateDocument({...doc,template:templates[view]});
 if(!validation.valid)return bad(validation.errors.map(e=>typeof e==='string'?e:e.message).join(' '));
 return {valid:true,reason:''};
}
// Incidence retains node identity under complete endpoint renames and row sorts.
// Source/target roles are included so two degree-one endpoints cannot collide.
export function networkNodes(doc){
 return unique(doc.data.flatMap(r=>[r.source,r.target])).map(name=>{const incoming=doc.data.filter(r=>r.target===name),outgoing=doc.data.filter(r=>r.source===name),rows=doc.data.filter(r=>r.source===name||r.target===name);return {name,identity:JSON.stringify(['network-node',outgoing.map(recordId).sort(),incoming.map(recordId).sort()]),rows,incoming:sum(incoming,r=>r.value),outgoing:sum(outgoing,r=>r.value),incident:sum(rows,r=>r.value)};}).sort((a,b)=>a.identity.localeCompare(b.identity));
}
export function networkCompatibility(a,b){
 if(a.family!==b.family)return t('有向流与无向关系不能互相冒充。','Directed flows and undirected relationships cannot be interchanged.');
 if(a.unit!==b.unit||['name','type','url'].some(k=>a.source?.[k]!==b.source?.[k]))return t('原始单位或来源不同。','Original units or provenance differ.');
 const aa=new Map(a.data.map(r=>[recordId(r),r]));if(aa.size!==b.data.length||b.data.some(r=>!aa.has(recordId(r))))return t('原始边集合不同。','The original edge populations differ.');
 const nodes=doc=>new Map(networkNodes(doc).map(n=>[n.name,n.identity])),an=nodes(a),bn=nodes(b);
 if(b.data.some(r=>{const p=aa.get(recordId(r));return an.get(p.source)!==bn.get(r.source)||an.get(p.target)!==bn.get(r.target);}))return t('边的端点归属发生变化，请明确展示关系变化。','Edge endpoint membership changed; present the relationship change explicitly.');
 return '';
}
export const networkBounds=doc=>({value:[0,max(doc.data,r=>r.value)||1]});
export function networkRecipe(from,to){return {id:from===to?'network-update':'network-unfold',get name(){return t('同一联系网络连续展开','Continuous unfolding of the same network');},description:t('每条边保留稳定记录身份；连接带、弧线与节点轮廓连续移动，不删除联系、不把反向边合并。','Each edge retains its record identity. Ribbons, arcs and node contours move continuously without dropping links or merging opposite directions.')};}
export function networkGuide(doc,view){return [t('保留 source、target、value、稳定 _id、单位与来源；未列边不是已观测的零，不补边、不补零。','Keep source, target, value, stable _id, unit and source metadata. Unlisted edges are not observed zeros; never add edges or zero-fill.'),info.get(view)?.note||'',t('弧线与力导线宽可使用跨步骤共同尺度；弦带与桑基按当前布局归一化，跨图型请在停稳后读取原值。','Arc and force widths support a shared scale across steps. Chord and Sankey widths are normalized to each layout; read original values after settling when comparing encodings.'),doc.family==='network-directed'?t('箭头表示原始方向；流量合计逐边计一次。中间流转可能重复通过，不能当作独立人数或净新增。','Arrows preserve direction. Edge totals count each supplied edge once; recirculation and intermediate transfers are not unique people or net new flow.'):t('一对无向节点只填一次；节点相邻联系合计之和为逐边合计的两倍，不重复算成新联系。','Supply each undirected pair once. Summed node incident totals are twice the edge total, not additional relationships.')];}
export function networkAgentGuide(english=false){return english?'Use the original FORMA network-chord/arc/force or flow-sankey/chord/cycle player. Preserve every source/target/value row, stable _id, unit and source. Never invent absent edges or impute zero; positive native edge weights only. Undirected and directed families are separate. Keep opposite directions separate. Sankey requires a DAG and balanced intermediate nodes; directed chord requires 3–8 nodes and no loops; cyclic Sankey preserves return edges, loops and incoming/outgoing imbalance. Reuse original d3 chord, seeded force layout, Sankey and cyclic-flow algorithms. Every original edge keeps one live contour across views; arrows keep the direction. Node marks are derived incident summaries, not observations. Layout distances and angles are not measurements. Node totals overlap; recirculation is not unique people. Use the original HTML/SVG player, retain editable raw edges, reverse, direct seeking and interrupted transitions.':'使用原版 FORMA network-chord/arc/force 或 flow-sankey/chord/cycle 播放器。保留每条 source/target/value、稳定 _id、unit 和 source 来源。缺边不补边、不补零；原生边权重必须为正。有向与无向是不同家族，反向边不可合并。守恒桑基仅用于 DAG 且中间节点守恒；有向弦仅3–8节点且无自环；循环桑基保留回流、自环与入出不平衡。复用原生 d3 弦图、固定随机种子力导、桑基和循环流算法。每条原边保持同一实时轮廓连续变形，箭头保留方向；节点只是相邻边派生汇总，不是额外观测。布局距离角度不作测量；节点合计重复覆盖边，回流不是独立人数。使用原版 HTML/SVG 播放器，保留原边可编辑、倒放、跳步和中断连续。';}
export const networkColorKeys=doc=>doc.data.map(recordId);
export const networkColorSubjects=doc=>doc.data.map(r=>({id:recordId(r),label:`${r.source} ${networkFamily(networkViewMap[doc.template])==='network-directed'?'→':'↔'} ${r.target}`}));
