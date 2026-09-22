import {uiText,uiMarkup,uiMessage} from './locale.js';
import {sum} from 'd3';
import {hexbin} from 'd3-hexbin';
const unique=a=>[...new Set(a)],key=(a,b)=>JSON.stringify([a,b]);
export const orderedDates=rows=>[...rows].sort((a,b)=>a.period.localeCompare(b.period));
const dateOK=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export function regularGrid(rows){const xs=unique(rows.map(r=>r.x)).sort((a,b)=>a-b),ys=unique(rows.map(r=>r.y)).sort((a,b)=>a-b),map=new Map(rows.map(r=>[key(r.x,r.y),r]));return {xs,ys,rows:ys.flatMap(y=>xs.map(x=>map.get(key(x,y))))};}
export function validateVolume6(doc,{fail,count,noDuplicates,positive,allZero,warnings}){
  const d=doc.data,id=doc.template;
  if(['donut','circlepack'].includes(id)){count(d.length,id==='donut'?3:4,id==='donut'?10:16,uiText('类别'));noDuplicates(d.map(r=>r.label),uiText('类别'));positive('value',id==='donut');allZero();}
  if(id==='dendrogram'){const parents=unique(d.map(r=>r.parent));count(parents.length,2,5,uiText('父分类'));count(d.length,6,18,uiText('子项'));parents.forEach(p=>count(d.filter(r=>r.parent===p).length,2,5,uiMessage`${p}的子项`));noDuplicates(d.map(r=>key(r.parent,r.label)),uiText('父分类 / 子项'));positive();}
  if(id==='ternary'){count(d.length,6,80,uiText('对象'));count(unique(d.map(r=>r.group)).length,1,4,uiText('分组'));noDuplicates(d.map(r=>r.label),uiText('对象'));if(d.some(r=>[r.a,r.b,r.c].some(v=>v<0)||Math.abs(r.a+r.b+r.c-100)>1e-6))fail(uiText('每条记录 a、b、c 必须非负且合计为 100。'));if(doc.unit!=='%')fail(uiText('三元图单位必须为 %。'));}
  if(['contour','surface3d'].includes(id)){const {xs,ys,rows}=regularGrid(d),min=id==='contour'?6:4,max=id==='contour'?20:16;count(xs.length,min,max,uiText('横向采样'));count(ys.length,min,max,uiText('纵向采样'));noDuplicates(d.map(r=>key(r.x,r.y)),uiText('采样坐标'));if(rows.some(r=>!r)||d.length!==xs.length*ys.length)fail(uiText('需要完整网格，缺失采样不可省略或补零。'));for(const axis of [xs,ys])if(axis.length>2&&axis.slice(2).some((v,i)=>Math.abs((v-axis[i+1])-(axis[1]-axis[0]))>Math.max(1,Math.abs(axis[1]-axis[0]))*1e-6))fail(uiText('两个方向的采样间隔分别需要均匀。'));warnings.push(uiText('采样点之间的等值区域或三角曲面为线性插值，不是额外观测。'));}
  if(id==='hexbin'){count(d.length,20,600,uiText('原始样本'));noDuplicates(d.map(r=>r.label),uiText('样本编号'));if(typeof doc.binRadius!=='number'||!Number.isFinite(doc.binRadius)||doc.binRadius<8||doc.binRadius>24)fail(uiText('binRadius 需在 8–24 之间，决定固定归一化网格的分箱大小。'));}
  if(['step','difference','trajectory3d'].includes(id)){count(d.length,6,id==='trajectory3d'?60:48,uiText('日期'));noDuplicates(d.map(r=>r.period),uiText('日期'));if(d.some(r=>!dateOK(r.period)))fail(uiText('period 必须为真实有效的 YYYY-MM-DD 日期。'));}
  if(id==='step'&&d.filter(r=>r.value!==null).length<2)fail(uiText('至少需要两个有效观测。'));
  if(id==='difference'&&(!Array.isArray(doc.seriesLabels)||doc.seriesLabels.length!==2||doc.seriesLabels.some(v=>typeof v!=='string'||!v.trim()||v.length>20)||doc.seriesLabels[0]===doc.seriesLabels[1]))fail(uiText('seriesLabels 需为两个不同的 1–20 字序列名。'));
  if(id==='scatter3d'){count(d.length,6,80,uiText('对象'));count(unique(d.map(r=>r.group)).length,1,4,uiText('分组'));noDuplicates(d.map(r=>r.label),uiText('对象'));}
  if(id==='bars3d'){const rows=unique(d.map(r=>r.row)),cols=unique(d.map(r=>r.column));count(rows.length,3,6,uiText('行分类'));count(cols.length,3,6,uiText('列分类'));noDuplicates(d.map(r=>key(r.row,r.column)),uiText('行 / 列'));if(d.length!==rows.length*cols.length)fail(uiText('每个行分类必须包含全部列分类，零值也要显式记录。'));positive('value',true);allZero();}
  const axes=id==='ternary'?['a','b','c']:['scatter3d','surface3d','trajectory3d'].includes(id)?['x','y','z']:['contour','hexbin'].includes(id)?['x','y']:[];
  if(axes.some(k=>typeof doc.axes?.[k]!=='string'||!doc.axes[k].trim()||doc.axes[k].length>40))fail(uiMessage`需要 axes.${axes.join(' / ')} 注明各指标及单位，每个名称不超过 40 字。`);
}
export function ternaryPosition(row,vertices){return vertices.reduce((p,v,i)=>[p[0]+v[0]*row[['a','b','c'][i]]/100,p[1]+v[1]*row[['a','b','c'][i]]/100],[0,0]);}
export function hexbinLayout(doc){
  const domain=k=>{const vals=doc.data.map(r=>r[k]),a=Math.min(...vals),b=Math.max(...vals),pad=(b-a)*.08||1;return[a-pad,b+pad];},xd=domain('x'),yd=domain('y');
  const bins=hexbin().radius(doc.binRadius).x(r=>(r.x-xd[0])/(xd[1]-xd[0])*320).y(r=>200-(r.y-yd[0])/(yd[1]-yd[0])*200)(doc.data);
  return {bins,xd,yd,width:320,height:200};
}
export function differenceSegments(rows){const out=[];for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i],d0=a.a-a.b,d1=b.a-b.b,first={x:Date.parse(a.period),a:a.a,b:a.b},last={x:Date.parse(b.period),a:b.a,b:b.b};if(d0*d1<0){const f=d0/(d0-d1),v=a.a+(b.a-a.a)*f,cross={x:first.x+(last.x-first.x)*f,a:v,b:v};out.push({positive:d0>0,points:[first,cross]},{positive:d1>0,points:[cross,last]});}else out.push({positive:d0===0?d1>=0:d0>=0,points:[first,last]});}return out;}
export function volume6Summary(doc,fmt){const d=doc.data;
  if(['donut','circlepack','dendrogram','bars3d'].includes(doc.template))return{value:fmt(sum(d,r=>r.value)),unit:doc.unit,label:uiText('合计')};
  if(['ternary','scatter3d','hexbin'].includes(doc.template))return{value:fmt(d.length),unit:uiText('个观测'),label:uiText('原始样本')};
  if(['contour','surface3d'].includes(doc.template))return{value:fmt(d.length),unit:uiText('个采样点'),label:uiText('完整规则网格')};
  if(doc.template==='trajectory3d')return{value:fmt(d.length),unit:uiText('个观测'),label:uiText('按日期连接')};
  if(doc.template==='step')return{value:fmt(orderedDates(d).filter(r=>r.value!==null).at(-1).value),unit:doc.unit,label:uiText('最新值')};
  if(doc.template==='difference'){const r=orderedDates(d).at(-1);return{value:fmt(r.a-r.b),unit:doc.unit,label:uiText('最新差值')};}
  return null;
}
