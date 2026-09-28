import {getExample} from './catalog.js';
import {withRecordIds} from './data-identity.js';
import {networkText as t} from './network-series-rules.js';
const preset=(id,template,views,zh,en,zhDescription,enDescription,zhNote,enNote)=>({id,template,views,category:'regular',get name(){return t(zh,en);},get description(){return t(zhDescription,enDescription);},get dataNote(){return t(zhNote,enNote);},get relation(){return t('同一关系表 · 同一原始边','One edge table · same original links');}});
export const networkPresets=[
 preset('network-collaboration-story','network',['network-chord','network-arc','network-force'],'合作关系从弦带展开为网络','Collaboration ribbons unfold into a network','同一组团队协作联系从圆周弦带展开到弧线，再连续落位为确定性力导网络。','The same team relationships unfold from circular chord ribbons into arcs, then settle into a deterministic force network.','每条无向联系计一次；线宽表示原权重，布局距离不表示测量。','Each undirected edge is counted once. Width represents original weight; layout distance is not a measurement.'),
 preset('network-conserved-flow-story','alluvial',['flow-sankey','flow-chord','flow-cycle'],'流量守恒与方向展开','Conserved flow and direction unfolding','完整入口与去向的守恒流量从桑基带卷成有向弦，再展开到统一方向的流动布局。','Complete conserved source-to-destination flows roll from Sankey ribbons into directed chords, then unfold into a directional flow layout.','保留每条流向、真实流量及中间节点守恒；中间流转不能当独立人数。','Every edge, original flow and balanced intermediate node remains; intermediate transfers are not unique people.'),
 preset('network-circular-flow-story','sankeycycle',['flow-cycle','flow-chord'],'回流循环与双向联系','Return loops and directed relationships','材料回收链保留回流，连续卷成有向弦带，分别读出各节点的入流、出流与净额。','A material-recovery network preserves return links as it rolls into directed chords, retaining incoming, outgoing and net totals.','回流不是新增流量；节点净额不补平，往返联系不合并。','Return flow is not new flow. Node imbalance is not filled and opposite directions are never merged.')
];
export function networkRecords(id,palette='ink'){
 const preset=networkPresets.find(p=>p.id===id);if(!preset)return null;
 let doc=getExample(preset.template);
 if(id==='network-collaboration-story'){
  const names=t(['策略','产品','设计','工程','研究','运营'],['Strategy','Product','Design','Engineering','Research','Operations']);
  doc={...doc,title:preset.name,subtitle:preset.description,data:[[0,1,32],[0,4,24],[1,2,38],[1,3,44],[1,5,21],[2,3,35],[2,4,17],[3,4,26],[3,5,22],[4,5,19]].map(([a,b,value])=>({source:names[a],target:names[b],value}))};
 }
 if(id==='network-conserved-flow-story'){
  const n=t(['搜索','推荐','产品页','案例页','试用','咨询'],['Search','Referral','Product','Cases','Trial','Contact']);
  doc={...doc,title:preset.name,subtitle:preset.description,data:[[0,2,48],[0,3,22],[1,2,32],[1,3,18],[2,4,58],[2,5,22],[3,4,25],[3,5,15]].map(([a,b,value])=>({source:n[a],target:n[b],value}))};
 }
 doc=withRecordIds(doc,{legacyNamespace:`scenario:${id}`});return preset.views.map(view=>({doc:structuredClone(doc),view,dataGroup:`scenario:${id}`,relation:'auto',scale:'shared',options:{palette}}));
}
