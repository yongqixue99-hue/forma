import * as d3 from 'd3';
import {isEnglish} from './locale.js';
import regions from './datasets/world-regions.json' with {type:'json'};
import geographySource from './datasets/world-110m-provenance.json' with {type:'json'};
import {volume10Catalog,volume10English} from './volume10-catalog.js';
export const t10=(zh,en)=>isEnglish()?en:zh;
// Validation and guides need the region index only. Keep geographic geometry in the renderer.
export const worldRegions10=regions,worldCodes10=new Set(regions.map(r=>r.code));
const rowMeanings={choropleth:'一行代表一个地图地区，code 对应底图代码，label 是可修改的显示名称，value 是比率或密度。',geomap:'一行代表一个地点，填写十进制度经纬度和该地点的原始数量。',splom:'一行代表同一样本在一个变量上的测量；同一样本的其他变量继续填写为多行，分组保持一致。',clusterheatmap:'一行代表行对象 × 列指标的一个矩阵单元；每种组合都需要显式提供一个原值。',pcaloadings:'一行代表一个原变量，填写同一次 PCA 中该变量与 PC1、PC2 的相关系数；这里不填样本得分。',acf:'一行代表一个等间隔时期的原始测量，按采集顺序填写，不填写已经计算的相关系数。',pacf:'一行代表一个等间隔时期的原始测量，按采集顺序填写，不填写已经计算的相关系数。',imr:'一行代表一次原始过程测量，按采集顺序填写；第一项移动极差不存在，不填零。'};
const ids=new Set(volume10Catalog.map(t=>t.id)),unique=a=>[...new Set(a)],pair=(a,b)=>JSON.stringify([a,b]);
export function autocorrelation10(values,maxLag){
 const scale=d3.max(values,v=>Math.abs(v))||1,normalized=values.map(v=>v/scale),mean=d3.mean(normalized),centered=normalized.map(v=>v-mean),denom=d3.sum(centered,v=>v*v);
 if(!(denom>0))throw new Error(t10('恒定序列的相关系数未定义。','Correlation is undefined for a constant sequence.'));
 return Array.from({length:maxLag+1},(_,lag)=>lag===0?1:d3.sum(centered.slice(lag),(v,i)=>v*centered[i])/denom);
}
export function pacf10(values,maxLag){
 const acf=autocorrelation10(values,maxLag),result=[1];let coefficients=[],variance=1;
 for(let k=1;k<=maxLag;k++){
  if(variance<=Number.EPSILON*16)throw new Error(t10('当前序列无法稳定估计所选滞后的 PACF，请减少最大滞后。','The requested PACF lag is numerically singular; reduce maxLag.'));
  const alpha=(acf[k]-d3.sum(coefficients,(v,j)=>v*acf[k-j-1]))/variance;
  coefficients=[...coefficients.map((v,j)=>v-alpha*coefficients[k-j-2]),alpha];variance*=1-alpha*alpha;result.push(alpha);
 }
 return result;
}
export function imr10(rows){const values=rows.map(d=>d.value),mean=d3.mean(values),moving=values.map((v,i)=>i?Math.abs(v-values[i-1]):null),mrMean=d3.mean(moving.filter(v=>v!==null)),sigma=mrMean/1.128;return{mean,moving,mrMean,sigma,low:mean-3*sigma,high:mean+3*sigma,mrHigh:3.267*mrMean};}
// UPGMA: average of all cross-cluster Euclidean point distances. Ties use the
// original row/column input order, purely for layout, never for object identity.
export function cluster10(vectors){
 const distances=vectors.map(a=>vectors.map(b=>Math.hypot(...a.map((v,j)=>v-b[j]))));
 let clusters=vectors.map((_,i)=>({indices:[i],distance:0,children:null}));
 while(clusters.length>1){let best=[0,1],distance=Infinity;for(let i=0;i<clusters.length;i++)for(let j=i+1;j<clusters.length;j++){const d=d3.mean(clusters[i].indices.flatMap(a=>clusters[j].indices.map(b=>distances[a][b])));if(d<distance){distance=d;best=[i,j];}}
  const [i,j]=best,node={indices:[...clusters[i].indices,...clusters[j].indices],distance,children:[clusters[i],clusters[j]]};clusters=clusters.filter((_,k)=>k!==i&&k!==j);clusters.push(node);
 }
 return clusters[0];
}
export function matrix10(rows,rowKey='row',columnKey='column'){
 const rowNames=unique(rows.map(d=>d[rowKey])),columnNames=unique(rows.map(d=>d[columnKey])),lookup=new Map(rows.map(d=>[pair(d[rowKey],d[columnKey]),d]));
 return{rowNames,columnNames,lookup,values:rowNames.map(r=>columnNames.map(c=>lookup.get(pair(r,c))?.value))};
}
export function validateVolume10(doc,{fail,count,noDuplicates,warnings}){
 if(!ids.has(doc.template))return;const rows=doc.data,id=doc.template;
 if(id==='choropleth'){
  count(rows.length,2,176,t10('地区','regions'));noDuplicates(rows.map(d=>d.code),t10('地区代码','Region codes'));
  if(rows.some(d=>!worldCodes10.has(d.code)))fail(t10('code 不在当前世界底图覆盖范围；请查看帮助中的地区代码。','A code is outside the embedded map coverage. See the region codes in chart help.'));
  if(rows.every(d=>d.value===null))fail(t10('至少需要一个有效地区观测。','At least one measured region is required.'));
  warnings.push(t10('地图为 Natural Earth 1:110m 概览，176 个地区，不含南极；灰色表示缺测，未提供的地区不补零。','Natural Earth 1:110m overview: 176 regions, excluding Antarctica. Gray means unmeasured; absent regions are not zero.'));
 }
 if(id==='geomap'){count(rows.length,1,120,t10('地点','locations'));if(rows.some(d=>d.longitude< -180||d.longitude>180||d.latitude< -85||d.latitude>85||d.value<0))fail(t10('经度须在 −180–180、纬度须在 −85–85，规模值不能为负。','Longitude must be −180–180°, latitude −85–85°, and magnitude nonnegative.'));warnings.push(t10('气泡面积对应原始规模；零值用空心定位点表示，完整值保留在提示中。','Bubble area represents magnitude; zero uses an unfilled locator and retains its exact value in the tooltip.'));}
 if(['splom','clusterheatmap'].includes(id)){
  const splom=id==='splom',m=matrix10(rows,splom?'sample':'row',splom?'variable':'column');count(m.rowNames.length,splom?3:2,splom?80:24,t10('对象','objects'));count(m.columnNames.length,2,splom?5:12,t10('变量','variables'));
  noDuplicates(rows.map(d=>pair(d[splom?'sample':'row'],d[splom?'variable':'column'])),t10('对象与变量组合','Object-variable pairs'));
  if(rows.length!==m.rowNames.length*m.columnNames.length)fail(t10('每个对象必须提供全部变量；不删除缺测对象，也不将缺测补零。','Every object needs every variable. Incomplete objects are not deleted and missing values are not zero-filled.'));
  if(splom&&m.rowNames.some(sample=>unique(rows.filter(d=>d.sample===sample).map(d=>d.group)).length!==1))fail(t10('同一样本的分组必须一致。','A sample must have the same group across all variables.'));
  if(splom)count(unique(rows.map(d=>d.group)).length,1,6,t10('分组','groups'));
  if(!splom)warnings.push(t10('行列分别按欧氏距离、平均连接聚类；直接使用原始值，不标准化。不同量纲请先在外部按明确方法变换。','Rows and columns use Euclidean distance and average linkage on raw values. No standardization is applied; transform incompatible units explicitly before import.'));
 }
 if(id==='pcaloadings'){count(rows.length,2,24,t10('变量','variables'));noDuplicates(rows.map(d=>d.variable),t10('变量名称','Variables'));if(rows.some(d=>d.loading1**2+d.loading2**2>1+1e-8))fail(t10('相关载荷必须位于单位圆内；请勿填入样本得分或其他载荷定义。','Correlation loadings must lie within the unit circle. Do not enter sample scores or another loading definition.'));warnings.push(t10('此图只接收原变量与 PC1/PC2 的相关系数，不重新计算 PCA；坐标固定为 −1 至 1。','This chart accepts correlations between original variables and PC1/PC2; it does not refit PCA. Both axes are fixed to −1…1.'));}
 if(['acf','pacf','imr'].includes(id)){
  count(rows.length,id==='imr'?4:8,id==='imr'?300:500,t10('观测','observations'));noDuplicates(rows.map(d=>d.period),t10('观测顺序','Observation positions'));
  if(new Set(rows.map(d=>d.value)).size<2)fail(t10('恒定序列无法估计相关性或非零过程波动。','A constant sequence cannot estimate correlation or nonzero process variation.'));
  if(id!=='imr'){
   if(!Number.isInteger(doc.maxLag)||doc.maxLag<1||doc.maxLag>60||doc.maxLag>=rows.length)fail(t10('maxLag 必须为 1–60 的整数，且小于样本数。','maxLag must be an integer from 1 to 60 and less than the sample size.'));
   else if(new Set(rows.map(d=>d.value)).size>1&&id==='pacf')try{pacf10(rows.map(d=>d.value),doc.maxLag);}catch(e){fail(e.message);}
   warnings.push(t10('输入顺序必须等时间间隔；不自动去趋势或差分。参考带 ±1.96/√n 仅为白噪声假设下的近似逐点阈值，非多重检验或模型置信区间。','Observations must be equally spaced. No detrending or differencing is applied. ±1.96/√n is an approximate pointwise white-noise reference, not a simultaneous or model confidence interval.'));
  }else warnings.push(t10('以全部输入估计基线：I 限为均值 ±3×MR均值/1.128；MR 上限为 3.267×MR均值、下限为零。首项 MR 不存在。仅标记越限，不执行其他运行规则。','All inputs estimate the baseline: I limits = mean ±3×mean(MR)/1.128; MR upper limit = 3.267×mean(MR), lower limit = 0. The first MR is undefined. Only points outside limits are flagged; other run rules are not evaluated.'));
 }
}
export function volume10Summary(doc,fmt){if(!ids.has(doc.template))return null;return{value:fmt(doc.data.length),label:t10('输入记录','Input records'),unit:t10('条','rows')};}
// Shared by on-screen help and both chart/work Agent briefs. These are native
// renderer contracts, not additional computations or changes to source data.
export function volume10MethodNotes(id){
 const map=['choropleth','geomap'].includes(id)?[
  t10(`底图使用 Natural Earth 1:110m 的真实国家级边界（公共领域）：${geographySource.url}。许可：${geographySource.terms}。保留 ADM0_A3/NAME_EN，排除 ATA（南极），共 176 个覆盖地区；底图经过概化，不覆盖每个小岛或属地。独立生成 HTML 时应取得并内嵌真实边界，保留来源；没有边界文件时说明缺少依赖，不能虚构多边形。`,`Use real Natural Earth 1:110m country boundaries (public domain): ${geographySource.url}. Terms: ${geographySource.terms}. Retain ADM0_A3/NAME_EN, exclude ATA (Antarctica): 176 supported regions. This generalized map does not separately cover every island or dependency. For standalone HTML, obtain and embed the real boundaries with attribution; if unavailable, disclose the missing dependency instead of inventing polygons.`),
  t10('投影为 D3 geoNaturalEarth1，使用 fitExtent(plotExtent, {type:"Sphere"})，通过 geoPath(projection) 绘制真实几何并裁剪到绘图区。经纬度使用十进制度；不能从地区名称或代码字符串猜测经纬度。图面注明 Natural Earth · 1:110m。','Use D3 geoNaturalEarth1 with fitExtent(plotExtent, {type:"Sphere"}), render the real geometry with geoPath(projection), and clip to the plot extent. Coordinates are decimal degrees; never infer longitude/latitude from names or code strings. Display Natural Earth · 1:110m attribution.')
 ]:[];
 const notes={
  choropleth:[t10('code 精确关联 Natural Earth ADM0_A3，不是通用 ISO 代码转换，也不按 label 关联。value 为比率或密度，色标使用全部已观测值的范围；未提供地区与 null 均保持独立缺测色，不能补零。','Join code exactly to Natural Earth ADM0_A3, not to display label or an assumed universal ISO conversion. value is a rate or density; derive the color domain from all observed values. Absent regions and null retain an independent unmeasured color, never zero.')],
  geomap:[t10('直接投影每条原始 longitude/latitude。所有地点共用 rMax，半径 r = rMax × sqrt(value/max(value))；面积对应原始规模。value=0 只显示空心定位符，不赋予正的数量面积。名称仅作显示，不能把站点按国家名称聚合或移动到国家中心。','Project each original longitude/latitude directly. Use one rMax and radius r = rMax × sqrt(value/max(value)); area encodes magnitude. value=0 uses only an unfilled locator, not positive quantity area. Names are display labels: do not aggregate sites by country name or move them to country centroids.')],
  splom:[t10('每个非对角分面都绘制同一批完整样本；横轴取该列变量，纵轴取该行变量。同一个变量在所有分面共用带留白的原值范围，各变量保留自己的单位，不归一化。对角展示变量名称与范围。样本跨变量的记录 ID 全部保留，不能把变量行直接当作不同样本，也不逐对删除缺测。','Draw the same complete sample population in every off-diagonal panel: the column variable is X and the row variable is Y. Each variable shares one padded raw-value domain across panels and keeps its own unit; do not normalize. Diagonals show variable names and ranges. Preserve all sample-by-variable record IDs; variable rows are not separate samples and no pairwise deletion is allowed.')],
  clusterheatmap:[t10('行、列分别以其完整原值向量计算欧氏距离。平均连接 UPGMA 的簇距离等于两个簇所有跨簇对象距离的算术平均；不是质心距离，也不是 Ward 法。每次合并最小距离的簇，并列按原始行列顺序确定，树枝位置按合并距离绘制。仅重排显示，不更改值或原表顺序；不自动标准化。','Compute Euclidean distances from complete raw vectors separately for rows and columns. Average linkage (UPGMA) is the arithmetic mean of all cross-cluster object distances, not centroid distance or Ward linkage. Merge the minimum-distance pair; resolve ties by original input order and position dendrogram branches by merge distance. Reorder only the display, preserving values and source table order; no automatic standardization.')],
  pcaloadings:[t10('loading1/loading2 定义为原变量与 PC1/PC2 的相关系数。两轴使用相同单位长度且固定为 [-1,1]，原点发出箭头，保留单位圆；每个变量的 loading1²+loading2²≤1。这里不拟合 PCA，不把特征向量、样本得分或解释方差当作这些相关载荷。','loading1/loading2 are correlations of original variables with PC1/PC2. Use equal-unit axes fixed to [-1,1], arrows from the origin and a unit circle; loading1²+loading2²≤1 for every variable. Do not fit PCA or substitute eigenvectors, sample scores or explained variance for these correlation loadings.')],
  acf:[t10('按输入采集顺序设 c[t]=value[t]−mean(value)，ACF(k)=Σ(t=k…n−1)c[t]c[t−k] / Σ(t=0…n−1)c[t]²。所有滞后使用同一分母，不除以 n−k；恒定序列未定义。显示 k=1…maxLag，系数轴固定 [-1,1]；原测量单位属于输入，系数无量纲。','In acquisition order let c[t]=value[t]−mean(value). ACF(k)=Σ(t=k…n−1)c[t]c[t−k] / Σ(t=0…n−1)c[t]². Every lag uses the same denominator; do not adjust by n−k. A constant sequence is undefined. Display k=1…maxLag on a fixed [-1,1] coefficient axis; the original measurement unit belongs to the input and coefficients are dimensionless.')],
  pacf:[t10('先按 ACF 的未调整中心化乘积定义计算 r[k]。Yule–Walker/Levinson–Durbin 从 V=1 开始：α[k]=(r[k]−Σ(j=1…k−1)φ[k−1,j]r[k−j])/V；φ[k,j]=φ[k−1,j]−α[k]φ[k−1,k−j]；φ[k,k]=α[k]，V←V(1−α[k]²)。PACF(k)=α[k]；数值奇异时要求降低 maxLag，不补零或改用其他估计器。系数轴固定 [-1,1]，系数无量纲。','Compute r[k] from the unadjusted centered-product ACF. Yule–Walker/Levinson–Durbin starts with V=1: α[k]=(r[k]−Σ(j=1…k−1)φ[k−1,j]r[k−j])/V; φ[k,j]=φ[k−1,j]−α[k]φ[k−1,k−j]; φ[k,k]=α[k], then V←V(1−α[k]²). PACF(k)=α[k]. On numerical singularity require a lower maxLag rather than zero filling or changing estimator. Use a fixed [-1,1] dimensionless coefficient axis.')],
  imr:[t10('MR[t]=|value[t]−value[t−1]|，首项 MR 为未定义。用全部输入计算 x̄ 与其余 MR 的均值 MR̄，σ=MR̄/1.128；I 中心线 x̄、界限 x̄±3σ，MR 中心线 MR̄、下限 0、上限 3.267×MR̄。I 轴包含原值与控制限并留白，MR 轴从零开始。派生 MR 绑定相邻两条记录，不冒充单条原始观测；仅标记越限，控制限不是规格限。','MR[t]=|value[t]−value[t−1]|; the first MR is undefined. All inputs estimate x̄ and the mean of defined MR values, MR̄; σ=MR̄/1.128. I center=x̄, limits=x̄±3σ; MR center=MR̄, lower=0, upper=3.267×MR̄. The I axis includes observations and limits with padding; the MR axis starts at zero. Derived MR belongs to the adjacent record pair, not a single raw observation. Flag only outside-limit points; control limits are not specification limits.')]
 };
 return [...map,...(id==='pacf'?notes.acf:[]),...(notes[id]||[])];
}
export function guide10(t,guide){if(!ids.has(t.id))return guide;const en=volume10English[t.id],sampleReport={warnings:[]};
 validateVolume10(guide.example,{fail:()=>{},count:()=>{},noDuplicates:()=>{},warnings:sampleReport.warnings});
 const extra=t.id==='choropleth'?[t10('支持的地区代码（Natural Earth ADM0_A3）：','Supported Natural Earth ADM0_A3 codes: ')+worldRegions10.map(r=>`${r.code} ${r.name}`).join(' · ')]:[];
 return{...guide,introduction:isEnglish()?en.description:t.description,rowMeaning:isEnglish()?en.rowMeaning:rowMeanings[t.id],use:isEnglish()?en.use:t.use,avoid:isEnglish()?en.avoid:t.avoid,limit:isEnglish()?en.limit:t.limit,notes:[...sampleReport.warnings,...volume10MethodNotes(t.id),...extra],fields:guide.fields.map((f,i)=>({...f,description:isEnglish()?f.description:t.fields[i][2]}))};}
