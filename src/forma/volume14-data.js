import * as d3 from 'd3';
import {isEnglish} from './locale.js';
import {volume14Catalog,volume14English} from './volume14-catalog.js';
export const t14=(zh,en)=>isEnglish()?en:zh;
const tickable=(lo,hi)=>{try{const ticks=d3.ticks(lo,hi,5);return ticks.length>0&&ticks.every(Number.isFinite);}catch{return false;}};
const ids=new Set(volume14Catalog.map(t=>t.id)),uniq=a=>[...new Set(a)],text=v=>typeof v==='string'&&v.trim().length>0&&v.length<=120,finite=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e15;
export function andrewsValue14(values,t){return values.reduce((sum,v,i)=>sum+v*(i===0?1/Math.SQRT2:i%2?Math.sin((i+1)/2*t):Math.cos(i/2*t)),0);}
export function andrews14(doc){return uniq(doc.data.map(r=>r.label)).map(label=>{const rows=doc.variables.map(variable=>doc.data.find(r=>r.label===label&&r.variable===variable)),values=rows.map(r=>r.value);return{label,group:rows[0].group,rows,values,points:Array.from({length:161},(_,i)=>{const t=-Math.PI+i/160*Math.PI*2;return{t,value:andrewsValue14(values,t)};})};});}
export function taylor14(doc){return doc.data.map(row=>{const ratio=row.sd/doc.referenceSD,angle=Math.acos(row.correlation),centeredRMSE=Math.hypot(ratio-1,Math.sqrt(2*ratio*(1-row.correlation)));return{row,ratio,angle,x:ratio*row.correlation,y:ratio*Math.sqrt(Math.max(0,1-row.correlation**2)),centeredRMSE};});}
export function target14(doc){return doc.data.map(row=>{const direction=row.sd<doc.referenceSD?-1:1,x=direction*row.centeredRMSE/doc.referenceSD,y=row.bias/doc.referenceSD;return{row,x,y,rmse:Math.hypot(x,y)};});}
export function youden14(doc){return{medianA:d3.median(doc.data,d=>d.sampleA),medianB:d3.median(doc.data,d=>d.sampleB)};}
export function contingency14(doc){
 const rows=doc.template==='agreement'?doc.categories:uniq(doc.data.map(r=>r.row)),columns=doc.template==='agreement'?doc.categories:uniq(doc.data.map(r=>r.column)),total=d3.sum(doc.data,r=>r.count),rowTotals=rows.map(name=>d3.sum(doc.data,r=>r.row===name?r.count:0)),columnTotals=columns.map(name=>d3.sum(doc.data,r=>r.column===name?r.count:0));
 const cells=rows.flatMap((name,i)=>columns.map((column,j)=>{const row=doc.data.find(r=>r.row===name&&r.column===column),expected=rowTotals[i]/total*columnTotals[j],residual=(row.count-expected)/Math.sqrt(expected);return{row,i,j,expected,residual,share:row.count/total};}));
 const diagonal=cells.filter(c=>c.i===c.j),agreement=doc.template==='agreement'?d3.sum(diagonal,c=>(c.row.count/total)**2)/d3.sum(rows,(_,i)=>(rowTotals[i]/total)*(columnTotals[i]/total)):null;
 return{rows,columns,total,rowTotals,columnTotals,cells,chiSquare:d3.sum(cells,c=>c.residual**2),agreement,exactRate:d3.sum(diagonal,c=>c.row.count)/total};
}
const notePairs={
 andrews:['曲线为 x₁/√2 + x₂ sin(t) + x₃ cos(t) + …，横轴 t 为构造参数而非时间；变量顺序和预处理直接影响形状。图表不自动标准化。','Curves use x₁/√2 + x₂ sin(t) + x₃ cos(t) + … . The horizontal t is a construction parameter, not time. Dimension order and preprocessing affect shape; the chart does not standardize inputs.'],
 biplot:['只绘制外部计算的得分和载荷，loadingScale 只放大箭头，不改变原值。scaling 必须说明分析约定；本图不拟合 PCA，不保证箭头夹角可解释为变量相关。','Only supplied scores and loadings are plotted. loadingScale enlarges displayed arrows without changing input values. scaling must declare the analysis convention. No PCA is fitted; arrow angles are not universally correlations.'],
 taylor:['总体标准差使用分母 N（有权重时使用同一归一化权重）。中心 RMSE² = σ模型² + σ参考² − 2ρσ模型σ参考；本图除以 referenceSD，均值偏差不在图内。','Population SD uses denominator N (or the same normalized weights). Centered RMSE² = model SD² + reference SD² − 2ρ·model SD·reference SD. Coordinates divide by referenceSD; mean bias is excluded.'],
 targetdiagram:['横坐标 = 中心 RMSE/referenceSD，模型 SD 小于参考 SD 时取负，相等时约定取正；纵坐标 = 偏差/referenceSD。参考圆表示总归一化 RMSE，不能解释为置信界线。','Horizontal coordinate is centered RMSE/referenceSD, negative when model SD is lower than reference SD and positive on equality. Vertical coordinate is bias/referenceSD. Circles indicate total normalized RMSE, not confidence limits.'],
 youden:['两个轴使用相同测量单位和相同像素比例，中位十字线与经过其中的 45° 线仅作等量加性偏移参考；若两个样本的响应尺度不同，不能据此判断一致性。不自动计算置信圆、合格阈值或实验室排名。','Axes share measurement units and pixels per unit. Median crosshairs and the 45° line reference equal additive shifts; do not judge consistency against that line if the two samples have different response scales. No confidence circle, acceptance threshold or laboratory ranking is computed.'],
 agreement:['完全一致 B = Σ nᵢᵢ² / Σ(nᵢ+ n+ᵢ)，是实心方块面积与边际矩形面积总和之比；不作偶然一致校正、不提供部分一致权重。全部非对角计数保留在旁表并可编辑。','Exact-agreement B = Σ nᵢᵢ² / Σ(row-totalᵢ × column-totalᵢ), the ratio of filled square area to marginal rectangle area. No chance correction or partial-agreement weights are applied. Every off-diagonal count remains editable in the side table.'],
 association:['期望频数 Eᵢⱼ = 行合计 × 列合计 / N；Pearson 残差 r=(O−E)/√E。宽度与 √E、带符号高度与 r 共用比例，故矩形面积与 |O−E| 成正比。未计算 p 值。','Expected count E = row total × column total / N; Pearson residual r = (O−E)/√E. Shared width and height scales make rectangle area proportional to |O−E|. No p-value is computed.'],
 mosaicplot:['行宽为行合计/N，列块高度为该行的条件占比；面积就是联合频数/N。颜色为独立性模型 Pearson 残差，零频数以边界空心标记保留，面积仍为零。','Row width is its marginal share; cell height is its within-row conditional share, so area equals joint frequency/N. Shading uses independence-model Pearson residuals. Explicit zero counts retain an outlined boundary marker and zero area.']
};
export function validateVolume14(doc,{fail,count,noDuplicates,warnings}){
 if(!ids.has(doc.template))return;const id=doc.template,rows=doc.data,t=volume14Catalog.find(t=>t.id===id);
 if(!Array.isArray(rows)||rows.some(r=>!r||t.fields.some(([key,type])=>type==='number'?!finite(r[key]):!text(r[key])))){fail(t14('必须提供完整有限原值和非空标签，不能删除缺测或补零。','Supply complete finite values and nonempty labels; missing data are neither removed nor zero-filled.'));return;}
 const namedList=(list,min,max)=>Array.isArray(list)&&list.length>=min&&list.length<=max&&list.every(text)&&new Set(list).size===list.length;
 if(['youden','agreement','association','mosaicplot'].includes(id)&&![doc.axes?.x,doc.axes?.y].every(text))fail(t14('axes.x 与 axes.y 需要明确变量或评审者名称。','axes.x and axes.y must explicitly name the variables or raters.'));
 if(!['andrews','agreement','association','mosaicplot'].includes(id))noDuplicates(rows.map(r=>r.label),t14('记录名称','Record labels'));
 if(id==='andrews'){
  if(!namedList(doc.variables,3,8)){fail(t14('variables 必须声明 3–8 个唯一维度及固定顺序。','variables must declare 3–8 unique dimensions in a fixed order.'));return;}
  const labels=uniq(rows.map(r=>r.label)),groups=uniq(rows.map(r=>r.group));count(labels.length,3,60,t14('对象','objects'));count(groups.length,1,6,t14('分组','groups'));noDuplicates(rows.map(r=>JSON.stringify([r.label,r.variable])),t14('对象×维度','Object-dimension pairs'));
  if(rows.some(r=>!doc.variables.includes(r.variable))||rows.length!==labels.length*doc.variables.length)fail(t14('每个对象必须完整提供 variables 中的所有维度，不能补值。','Each object must supply every declared dimension exactly once; no values are imputed.'));
  const amplitude=d3.max(rows,r=>Math.abs(r.value))*doc.variables.length;if(amplitude>0&&!tickable(-amplitude,amplitude))fail(t14('当前量级无法形成有限刻度，请先换算到可表示的单位。','This magnitude cannot form finite axis ticks; convert to representable units.'));
  if(labels.some(label=>uniq(rows.filter(r=>r.label===label).map(r=>r.group)).length!==1))fail(t14('同一对象的分组必须一致。','An object must keep the same group across dimensions.'));
 }
 if(id==='biplot'){
  count(rows.filter(r=>r.kind==='score').length,3,120,t14('样本得分','sample scores'));count(rows.filter(r=>r.kind==='loading').length,2,12,t14('载荷','loading vectors'));count(uniq(rows.filter(r=>r.kind==='score').map(r=>r.group)).length,1,6,t14('样本分组','sample groups'));
  if(rows.some(r=>!['score','loading'].includes(r.kind)||r.kind==='loading'&&r.x===0&&r.y===0))fail(t14('kind 只能为 score 或 loading，载荷向量不能为零。','kind must be score or loading, and loading vectors must be nonzero.'));
  if(!finite(doc.loadingScale)||doc.loadingScale<=0||doc.loadingScale>1e6||!text(doc.scaling))fail(t14('必须明确 scaling 约定，且 loadingScale 为 0–10⁶ 内的正数。','Declare scaling and a positive loadingScale no greater than 10⁶.'));
  if(![doc.variance1,doc.variance2].every(v=>finite(v)&&v>0&&v<=100)||doc.variance1+doc.variance2>100+1e-9)fail(t14('解释方差均须大于 0、合计不超过 100%。','Explained variances must be positive and sum to at most 100%.'));
  if(rows.some(r=>r.kind==='loading'&&(!Number.isFinite(r.x*doc.loadingScale)||!Number.isFinite(r.y*doc.loadingScale)||(r.x!==0&&r.x*doc.loadingScale===0)||(r.y!==0&&r.y*doc.loadingScale===0))))fail(t14('显示倍率导致载荷超出有限范围。','Loading display coordinates must remain finite.'));
 }
 if(id==='biplot'&&finite(doc.loadingScale)&&doc.loadingScale>0){const extent=d3.max(rows,r=>Math.max(Math.abs(r.x),Math.abs(r.y))*(r.kind==='loading'?doc.loadingScale:1))*1.23;if(extent>0&&!tickable(-extent,extent))fail(t14('载荷和得分量级无法形成有限刻度，请统一换算显示单位。','Score and loading magnitudes cannot form finite ticks; rescale the display units consistently.'));}
 if(['taylor','targetdiagram'].includes(id)){
  count(rows.length,2,24,t14('模型','models'));if(!finite(doc.referenceSD)||doc.referenceSD<=0){fail(t14('referenceSD 必须为正的有限总体标准差。','referenceSD must be a positive finite population standard deviation.'));return;}
  if(rows.some(r=>r.sd<0||id==='taylor'&&r.sd===0))fail(t14('标准差不能为负；泰勒图不接受零标准差的未定义相关。','Standard deviations cannot be negative; Taylor correlation is undefined for zero SD.'));
  if(id==='taylor'&&rows.some(r=>r.correlation< -1||r.correlation>1))fail(t14('相关系数必须位于 −1 至 1。','Correlations must be between −1 and 1.'));
  if(id==='targetdiagram'&&rows.some(r=>r.centeredRMSE<0||r.centeredRMSE+1e-10*Math.max(r.sd,doc.referenceSD)<Math.abs(r.sd-doc.referenceSD)||r.centeredRMSE>r.sd+doc.referenceSD+1e-10*Math.max(r.sd,doc.referenceSD)))fail(t14('中心 RMSE 必须非负，且位于 |sd−referenceSD| 与 sd+referenceSD 之间。','Centered RMSE must be nonnegative and lie between |sd−referenceSD| and sd+referenceSD.'));
  const keys=id==='taylor'?['sd']:['sd','bias','centeredRMSE'];if(rows.some(r=>keys.some(key=>!Number.isFinite(r[key]/doc.referenceSD)||(r[key]!==0&&r[key]/doc.referenceSD===0)||Math.abs(r[key]/doc.referenceSD)>1e6)))fail(t14('归一化指标须有限且绝对值不超过 10⁶，请核对单位或分组比较。','Normalized metrics must be finite with absolute value at most 10⁶; check units or compare compatible groups.'));
 }
 if(id==='youden'){
  const med=youden14(doc),span=Math.max(d3.max(rows,r=>Math.abs(r.sampleA-med.medianA)),d3.max(rows,r=>Math.abs(r.sampleB-med.medianB)))*1.22;if(span>0&&(!tickable(med.medianA-span,med.medianA+span)||!tickable(med.medianB-span,med.medianB+span)))fail(t14('当前测量跨度无法形成有限等尺度坐标，请换算单位。','The measurement span cannot form finite equal-unit axes; convert units.'));
  count(rows.length,5,80,t14('实验室','laboratories'));if(['sampleA','sampleB'].some(key=>!(d3.max(rows,r=>r[key])-d3.min(rows,r=>r[key])>0)))fail(t14('每个样本至少需要两个不同的测量值。','Each sample needs at least two distinct measured values.'));
 }
 if(['agreement','association','mosaicplot'].includes(id)){
  if(rows.some(r=>!Number.isSafeInteger(r.count)||r.count<0)){fail(t14('频数必须是非负安全整数，不接受百分比或缺测。','Counts must be nonnegative safe integers, not percentages or missing values.'));return;}
  let rowNames=uniq(rows.map(r=>r.row)),columns=uniq(rows.map(r=>r.column));
  if(id==='agreement'){
   if(!namedList(doc.categories,2,6)){fail(t14('categories 必须声明 2–6 个共同唯一类别及顺序。','categories must declare 2–6 unique common categories in order.'));return;}
   rowNames=columns=doc.categories;
   if(rows.some(r=>!doc.categories.includes(r.row)||!doc.categories.includes(r.column)))fail(t14('两位评审者都必须使用 categories 中的类别。','Both raters must use the declared categories.'));
  }
  count(rowNames.length,2,6,t14('行类别','row categories'));count(columns.length,2,6,t14('列类别','column categories'));noDuplicates(rows.map(r=>JSON.stringify([r.row,r.column])),t14('列联表单元','Contingency cells'));
  const pairs=new Set(rows.map(r=>JSON.stringify([r.row,r.column])));if(rows.length!==rowNames.length*columns.length||rowNames.some(row=>columns.some(column=>!pairs.has(JSON.stringify([row,column])))))fail(t14('必须提供完整列联表，真实零频数也要显式填写。','A complete contingency table is required, including explicit genuine zero counts.'));
  if(rowNames.some(name=>!rows.some(r=>r.row===name&&r.count>0))||columns.some(name=>!rows.some(r=>r.column===name&&r.count>0)))fail(t14('各行、各列边际合计必须为正，空类别需先明确处理。','Every row and column margin must be positive; resolve empty categories explicitly.'));
  if(!Number.isSafeInteger(d3.sum(rows,r=>r.count)))fail(t14('频数总和超出精确整数范围，请分组比较。','Total count exceeds the safe integer range; compare smaller groups.'));
  if(id!=='agreement'&&rows.length===rowNames.length*columns.length&&rowNames.every(row=>columns.every(column=>pairs.has(JSON.stringify([row,column]))))&&rowNames.every(name=>rows.some(r=>r.row===name&&r.count>0))&&columns.every(name=>rows.some(r=>r.column===name&&r.count>0))){const model=contingency14(doc);if(model.cells.some(c=>c.expected<5))warnings.push(t14('部分独立性期望频数小于 5；残差为描述性结果，不输出近似检验结论。','Some independence expected counts are below 5; residuals are descriptive and no asymptotic test conclusion is reported.'));}
 }
 warnings.push(t14(...notePairs[id]));
}
export function volume14Summary(doc,fmt){if(!ids.has(doc.template))return null;if(['agreement','association','mosaicplot'].includes(doc.template))return{value:fmt(d3.sum(doc.data,r=>r.count)),label:t14('频数合计','Total count'),unit:doc.unit};return{value:fmt(doc.template==='andrews'?uniq(doc.data.map(r=>r.label)).length:doc.data.length),label:t14('输入对象','Input items'),unit:t14('项','items')};}
export function volume14MethodNotes(id){const refs={andrews:'https://pandas.pydata.org/docs/reference/api/pandas.plotting.andrews_curves.html',biplot:'https://stat.ethz.ch/R-manual/R-devel/library/stats/html/biplot.princomp.html',taylor:'https://pcmdi.llnl.gov/staff/taylor/CV/Taylor_diagram_primer.pdf',targetdiagram:'https://www.vims.edu/people/friedrichs_ma/pubs/Lee_etal_JGR_2015.pdf',youden:'https://www.itl.nist.gov/div898/handbook/eda/section3/eda33v.htm',agreement:'https://search.r-project.org/CRAN/refmans/vcd/html/agreementplot.html',association:'https://stat.ethz.ch/R-manual/R-devel/library/graphics/html/assocplot.html',mosaicplot:'https://www.jmp.com/support/help/en/19.2/jmp/contingency-analysis.shtml'};return refs[id]?[t14('方法参考：','Method reference: ')+refs[id]]:[];}
const meanings={andrews:'一行是一个对象在 variables 所列某个维度上的原值；对象的分组保持一致。各维度应由用户提前处理到可比尺度。',biplot:'一行是外部分析得到的样本得分（score）或载荷向量（loading），分别填写 PC1、PC2 坐标；图内不重新拟合或自动归一化。',taylor:'一行是一个模型的总体标准差（分母 N）及其与共同参考的相关系数；所有结果必须来自同一批配对观测及同一权重定义。',targetdiagram:'一行是同一模型外部计算好的均值偏差、中心 RMSE 和总体标准差；三个量都与 referenceSD 使用相同单位及样本定义。',youden:'一行是一个实验室对两个相似样本 A、B 的原始成对测量，使用同一单位；不删除或平均实验室结果。',agreement:'一行是评审者 A 的 row 类别和评审者 B 的 column 类别组合的非负整数计数，所有共同类别组合都要填写。',association:'一行是一个行类别×列类别组合的原始整数频数，包括真实的零频数；不填百分比。',mosaicplot:'一行是完整列联表中的观测频数；行宽与条件高度由完整表计算，缺失组合不能自动视为零。'};
export function guide14(t,guide){if(!ids.has(t.id))return guide;const en=volume14English[t.id],warnings=[];validateVolume14(guide.example,{fail:()=>{},count:()=>{},noDuplicates:()=>{},warnings});return{...guide,introduction:isEnglish()?en.description:t.description,rowMeaning:isEnglish()?en.rowMeaning:meanings[t.id],use:isEnglish()?en.use:t.use,avoid:isEnglish()?en.avoid:t.avoid,limit:isEnglish()?en.limit:t.limit,notes:[...warnings,...volume14MethodNotes(t.id)],fields:guide.fields.map((f,i)=>({...f,description:isEnglish()?en.fields[i][2]:t.fields[i][2]}))};}
