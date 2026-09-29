import {extent} from 'd3';
import {isEnglish} from './locale.js';
import {recordId,populationId} from './data-identity.js';
import {validateDocument} from './data.js';
import {andrews14} from './volume14-data.js';
export const multivariateExtendedText=(zh,en)=>isEnglish()?en:zh;
const t=multivariateExtendedText,unique=a=>[...new Set(a)],view=(id,family,zh,en,note,english)=>({id,family,get name(){return t(zh,en);},en,get note(){return t(note,english);}});
export const multivariateExtendedViews=[
 view('mvx-parallel','mvx-profile','同尺度平行坐标','Shared-scale parallel coordinates','每个原值沿固定维度顺序连接，所有维度共用同一单位和刻度。','Connect original values in a fixed dimension order, using one shared unit and scale.'),
 view('mvx-profile-matrix','mvx-profile','对象原值矩阵','Original-value profile matrix','同一测量点展开成矩阵单元；单元内数值保留正负与原单位。','The same measurements unfold into matrix cells with signed values and original units.'),
 view('mvx-radar','mvx-radar','统一量程雷达','Common-range radar','各维度共用 0–max；闭合轮廓只是逐轴比较，不代表总分。','Every axis shares 0–max. The closed profile compares axes; its area is not a total score.'),
 view('mvx-radar-unfold','mvx-radar','雷达轮廓展开','Unfolded radar profiles','将雷达按固定轴序展开；最后重复首轴只展示闭合关系，不新增记录。','Unfold radar axes in their fixed order; the repeated first axis only displays closure, never a new record.'),
 view('mvx-ternary','mvx-composition','三元组成位置','Ternary composition positions','原始 a、b、c 非负且合计 100%，位置由三个顶点的重心计算。','Original a, b and c are nonnegative and sum to 100%; barycentric weights determine position.'),
 view('mvx-composition','mvx-composition','三成分剖面','Three-component profiles','同一样本的三成分分别展开到共同百分比轴，分母和闭合条件保持不变。','Unfold each sample into three readings on one percentage scale, retaining its denominator and closure.'),
 view('mvx-pca','mvx-scores','PCA 等尺度得分','Equal-unit PCA scores','只显示输入得分和解释率；两轴单位长度相同，不重新拟合或标准化。','Display supplied scores and explained variance with equal physical axis units; no refitting or standardization.'),
 view('mvx-pca-components','mvx-scores','PCA 得分分量','PCA score components','同一样本的 PC1 和 PC2 分别展开；两个值始终属于同一原记录。','Unfold PC1 and PC2 for the same sample; both values always belong to one original record.'),
 view('mvx-loadings','mvx-loadings','相关载荷方向','Correlation-loading directions','相关载荷箭头位于单位圆内，零向量保留；这里不展示样本得分。','Correlation-loading arrows remain inside the unit circle, retaining zero vectors; these are not sample scores.'),
 view('mvx-loading-components','mvx-loadings','相关载荷分量','Correlation-loading components','逐变量展开 PC1、PC2 相关系数，共同刻度固定为 −1 至 1。','Unfold each variable’s PC1 and PC2 correlations on the same fixed −1 to 1 scale.'),
 view('mvx-scree','mvx-variance','单项解释方差','Individual explained variance','全部特征值按原降序保留；每项除以完整特征值总和。','Retain every eigenvalue in its supplied descending order, dividing by the complete eigenvalue sum.'),
 view('mvx-cumulative','mvx-variance','累计解释方差','Cumulative explained variance','同一特征值序列逐项累计到 100%；累计量是派生值，不写回原表。','Accumulate the same eigenvalue sequence to 100%; derived cumulative shares never overwrite originals.'),
 view('mvx-andrews','mvx-fourier','安德鲁斯曲线','Andrews curves','固定维度次序映射傅里叶系数；横轴为构造参数 t，不是时间。','A fixed dimension order supplies Fourier coefficients; horizontal t is a construction parameter, not time.'),
 view('mvx-coefficients','mvx-fourier','有序原始系数','Ordered original coefficients','曲线连续展开为输入系数轮廓；保持用户预处理尺度，不自动标准化。','Curves unfold into input-coefficient profiles, retaining the supplied preprocessing scale without standardization.'),
 view('mvx-radviz','mvx-radial','多变量径向平衡','Multivariate radial equilibrium','复用每变量 min–max 权重和圆周锚点；投影距离不是原空间距离。','Reuse per-variable min–max weights and circular anchors; projected distance is not original-space distance.'),
 view('mvx-normalized-profiles','mvx-radial','归一化变量轮廓','Normalized variable profiles','同一原表按相同 min–max 范围展开到各变量轴；提示和编辑仍使用原值。','Unfold the same table onto variable axes with identical min–max ranges; tooltips and edits retain original values.')
];
export const multivariateExtendedViewMap={parallel:'mvx-parallel',radar:'mvx-radar',ternary:'mvx-ternary',pca:'mvx-pca',pcaloadings:'mvx-loadings',scree:'mvx-scree',andrews:'mvx-andrews',radviz:'mvx-radviz'};
const info=new Map(multivariateExtendedViews.map(v=>[v.id,v]));
export const isMultivariateExtendedView=v=>info.has(v);
export const multivariateExtendedFamily=v=>info.get(v)?.family;
export function multivariateExtendedOrderFields(doc){return ({parallel:{dimensionOrder:'dimension',objectOrder:'label'},radar:{axisOrder:'axis',seriesOrder:'series'},ternary:{sampleOrder:'label'},pca:{sampleOrder:'label'},pcaloadings:{variableOrder:'variable'},scree:{componentOrder:'component'},andrews:{variables:'variable',objectOrder:'label'},radviz:{variableOrder:'variable',sampleOrder:'sample'}})[doc?.template]||{};}
export function multivariateExtendedOrder(doc,property,field){const names=unique((doc?.data||[]).map(r=>r[field])),given=doc?.[property];return Array.isArray(given)&&given.length===names.length&&new Set(given).size===names.length&&given.every(v=>names.includes(v))?given:names;}
export function multivariateExtendedDocument(doc,common={}){
 const family=multivariateExtendedFamily(multivariateExtendedViewMap[doc?.template]);if(!family)return null;
 const orders=Object.fromEntries(Object.entries(multivariateExtendedOrderFields(doc)).map(([property,field])=>[property,doc[property]===undefined&&!(doc.template==='andrews'&&property==='variables')?unique(doc.data.map(r=>r[field])):doc[property]]));
 return {...doc,...common,...orders,family,data:doc.data.map((r,row)=>({...r,row}))};
}
export function multivariateExtendedEligibility(doc,view){
 const fail=(zh,en)=>({valid:false,reason:t(zh,en)}),family=multivariateExtendedFamily(view);
 if(!family||family!==doc?.family||!Array.isArray(doc?.data)||!doc.data.length)return fail('请选择对应多变量契约的完整原表。','Choose the complete original table for the matching multivariate contract.');
 if(doc.data.some(r=>typeof recordId(r)!=='string'||!recordId(r))||new Set(doc.data.map(recordId)).size!==doc.data.length)return fail('每条原始测量需要唯一且持久的 _id。','Each original measurement requires a unique persistent _id.');
 for(const [property,field]of Object.entries(multivariateExtendedOrderFields(doc))){const names=unique(doc.data.map(r=>r[field])),given=doc[property];if(!Array.isArray(given)||given.length!==names.length||new Set(given).size!==names.length||given.some(v=>!names.includes(v)))return fail('维度、对象或主成分顺序必须完整且不重复。','Dimension, object and component orders must be complete and unique.');}
 const report=validateDocument(doc);if(!report.valid)return {valid:false,reason:report.errors.map(e=>typeof e==='string'?e:e.message).join(' ')};
 if(doc.template==='scree'&&JSON.stringify(doc.componentOrder)!==JSON.stringify(doc.data.map(r=>r.component)))return fail('主成分顺序必须与完整降序特征值原表一致。','Component order must match the complete descending eigenvalue table.');
 return {valid:true,reason:''};
}
const groupField=doc=>doc.template==='parallel'?'label':doc.template==='radar'?'series':'group';
export function multivariateExtendedGroups(doc){
 const field=groupField(doc),rows=doc?.data||[],properties=doc.template==='parallel'?['objectOrder','label']:doc.template==='radar'?['seriesOrder','series']:doc.template==='andrews'?['objectOrder','label']:doc.template==='radviz'?['sampleOrder','sample']:['sampleOrder','label'];
 const order=multivariateExtendedOrder(doc,...properties),sorted=rows.toSorted((a,b)=>order.indexOf(a[properties[1]])-order.indexOf(b[properties[1]])),names=unique(sorted.map(r=>r[field]));
 return names.map(name=>({name,rows:rows.filter(r=>r[field]===name)}));
}
export const multivariateExtendedGroupKey=rows=>populationId('sample-group',rows);
export function multivariateExtendedColorSubjects(doc){return ['pcaloadings','scree'].includes(doc?.template)?[]:multivariateExtendedGroups(doc).map(g=>({id:multivariateExtendedGroupKey(g.rows),label:g.name}));}
export function multivariateExtendedColorKeys(doc){const field=groupField(doc),map=new Map(multivariateExtendedGroups(doc).map(g=>[g.name,multivariateExtendedGroupKey(g.rows)]));return (doc?.data||[]).map(r=>['pcaloadings','scree'].includes(doc.template)?recordId(r):map.get(r[field]));}
const orderIdentities=(doc,property,field)=>multivariateExtendedOrder(doc,property,field).map(name=>populationId('mvx-order',doc.data.filter(r=>r[field]===name)));
export function multivariateExtendedCompatibility(a,b){
 if(a?.family!==b?.family||a?.template!==b?.template)return t('原始多变量结构不同。','Original multivariate structures differ.');
 if(a.unit!==b.unit||['name','type','url'].some(k=>a.source?.[k]!==b.source?.[k]))return t('原始单位或来源不同。','Original units or provenance differ.');
 if(JSON.stringify(a.axes||{})!==JSON.stringify(b.axes||{})||['max','pc1Variance','pc2Variance','modelName'].some(k=>a[k]!==b[k]))return t('维度含义、量程、解释方差或模型元数据不同。','Dimension meanings, ranges, explained variance or model metadata differ.');
 if(JSON.stringify(a.data.map(recordId).sort())!==JSON.stringify(b.data.map(recordId).sort()))return t('原始测量集合不同。','Original measurement populations differ.');
 for(const[property,field]of Object.entries(multivariateExtendedOrderFields(a)))if(JSON.stringify(orderIdentities(a,property,field))!==JSON.stringify(orderIdentities(b,property,field)))return t('固定维度/对象次序或归属发生改变。','Fixed dimension/object order or membership changed.');
 if(JSON.stringify(multivariateExtendedGroups(a).map(g=>multivariateExtendedGroupKey(g.rows)))!==JSON.stringify(multivariateExtendedGroups(b).map(g=>multivariateExtendedGroupKey(g.rows))))return t('原始样本分组发生改变。','Original sample-group membership changed.');
 return '';
}
const finiteExtent=values=>{const good=values.filter(Number.isFinite);return good.length?extent(good):[0,1];};
export function multivariateExtendedBounds(doc){
 const rows=Array.isArray(doc?.data)?doc.data:[];
 if(doc?.template==='pca')return {pc1:finiteExtent(rows.map(r=>r.pc1)),pc2:finiteExtent(rows.map(r=>r.pc2)),scores:finiteExtent(rows.flatMap(r=>[r.pc1,r.pc2]))};
 if(doc?.template==='pcaloadings')return {correlation:[-1,1]};
 if(doc?.template==='scree')return {variance:[0,1]};
 if(doc?.template==='ternary')return {composition:[0,100]};
 if(doc?.template==='radar')return {value:[0,Number.isFinite(doc.max)&&doc.max>0?doc.max:1]};
 if(doc?.template==='radviz')return {normalized:[0,1]};
 if(doc?.template==='andrews'){let values=[];try{values=andrews14(doc).flatMap(c=>c.points.map(p=>p.value));}catch{}return {value:finiteExtent(rows.map(r=>r.value)),fourier:finiteExtent(values)};}
 return {value:finiteExtent(rows.map(r=>r.value))};
}
export function multivariateExtendedRecipe(){return {id:'mvx-unfold',get name(){return t('多变量原值连续展开','Continuous multivariate unfolding');},description:t('保留原观测身份，将同一向量的坐标、轮廓与分量连续展开；派生摘要单独标识。','Retain original observation identity while unfolding coordinates, contours and components of the same vector; derived summaries have separate identities.')};}
export function multivariateExtendedGuide(doc,view){return [info.get(view)?.note||'',t('保留全部原字段、_id、单位、分组、来源及声明顺序。缺测不删除或补零，不把投影距离当原始距离；中间帧仅表达变换，停稳后读数。','Preserve every original field, _id, unit, group, source and declared order. Never delete or zero-fill missing data or interpret projected distance as original distance. Intermediate frames show a transformation; read values after settling.'),doc.family==='mvx-fourier'?t('Andrews = x₁/√2 + x₂sin(t) + x₃cos(t) + …；复用用户提供的可比系数，不自动标准化。原始系数作为可编辑测量，整条曲线使用独立派生身份。','Andrews = x₁/√2 + x₂sin(t) + x₃cos(t) + …; reuse supplied comparable coefficients without automatic standardization. Coefficients remain editable originals and the whole curve has a separate derived identity.'):doc.family==='mvx-radial'?t('RadViz 权重=(原值−变量最小值)/(变量最大值−最小值)，位置=Σ权重×锚点/Σ权重。常量变量和零总权重拒绝；原表不被归一化覆盖。','RadViz weight=(value−variable minimum)/(variable maximum−minimum); position=Σweight×anchor/Σweight. Reject constant variables and zero total weights; normalization never overwrites the original table.'):doc.family==='mvx-variance'?t('必须提供全部非负降序特征值。单项=eigenvalue/Σeigenvalue，累计=前缀和/总和；不估计显著性或替用户决定保留维数。','Supply all nonnegative descending eigenvalues. Individual=eigenvalue/Σeigenvalue; cumulative=prefix sum/total. Do not estimate significance or automatically choose retained dimensions.'):doc.family==='mvx-scores'?t('PC1/PC2 为同一次外部 PCA 的得分，解释率保持输入值，两轴使用等长物理单位。分量展开不代表变量载荷或新的观测。','PC1/PC2 are scores from one external PCA. Preserve supplied variance percentages and equal physical axis units. Unfolded components are not variable loadings or new observations.'):doc.family==='mvx-loadings'?t('loading1/loading2 是同一次 PCA 的相关载荷，平方和≤1；单位圆不代表置信区间。零载荷仍是原记录，不删掉、不随机旋转。','loading1/loading2 are correlation loadings from the same PCA, with squared sum≤1. The unit circle is not a confidence interval. Zero loadings remain records; never drop or randomly rotate them.'):doc.family==='mvx-composition'?t('a+b+c=100 且均非负；三个字段的标签与分母不变，不做隐式闭合或重新归一化。','a+b+c=100 with nonnegative components. Component labels and denominators remain fixed; never silently close or renormalize inputs.'):t('全部维度必须单位和尺度可比。雷达保持显式 max；平行坐标保持共同原值尺度，矩阵单元显示精确原值，颜色不代替数值。','All dimensions must have comparable units and scales. Radar retains explicit max; parallel axes share original-value scales and matrix cells display exact originals, with color never replacing values.')];}
export function multivariateExtendedAgentGuide(english=false){return (english?'Use the original FORMA player: ':'使用原版 FORMA 播放器：')+multivariateExtendedViews.map(v=>v.id).join(', ')+'\n'+(english?'Preserve all original fields, persistent _id, units, source, group membership and declared axis, variable, sample and component orders. Do not impute, refit PCA, standardize Andrews coefficients, rotate PCA signs or alter ternary closure. PCA axes use equal physical units and supplied variance percentages. Loading arrows use supplied correlations and a unit circle, not a confidence region. Scree uses every descending eigenvalue and prefix sums, retaining zero eigenvalues. RadViz reuses complete-table per-variable min–max weights and rejects constant variables or zero weight sums; keep raw values editable. Fourier curves, projection points, connectors and cumulative quantities are derived with separate identities and recordIds. Keep each original measurement editable through its native field. Use populationId("sample-group", rows) for groups and stable 128-point contours for exact endpoints, reverse seeks and interrupted-frame continuity. Native accent/foreground roles remain semantic colors; use original HTML/SVG/video export.':'保留全部原字段、持久 _id、单位、来源、组归属和声明的轴/变量/样本/主成分顺序。不填缺测、不重拟合PCA、不自动标准化Andrews系数、不旋转PCA正负号、不改三元闭合条件。PCA两轴物理单位等长且解释率使用输入值。载荷为输入相关系数及单位圆，不冒充置信区间。碎石图使用全部降序特征值与前缀和，保留零特征值。RadViz复用全表逐变量min–max，拒绝常量变量与零权重和，原值仍可编辑。傅里叶曲线、投影点、连接轮廓和累计量为派生，具有独立身份与recordIds。每个原测量通过原字段编辑。组色使用populationId("sample-group",rows)，轮廓128点、精确端点、倒放/跳步及中断连续接续。保留原生强调/前景语义配色，使用原版HTML/SVG/视频导出。');}
