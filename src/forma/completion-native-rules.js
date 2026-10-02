import {isEnglish} from './locale.js';
import {validateDocument} from './data.js';
import {recordId,populationId} from './data-identity.js';
import {spectrum11} from './volume11-data.js';
import {spectrum15} from './volume15-data.js';
import {decision16} from './volume16-data.js';
import {thresholds18} from './volume18-data.js';

export const completionNativeText=(zh,en)=>isEnglish()?en:zh;
const t=completionNativeText;
// Independent native contracts. Two coordinates of a given table are related;
// geography, signal samples and classification predictions are never coerced
// into one another merely because all three happen to contain numbers.
const specs=[
 ['choropleth','地区填色地图','Country choropleth','choropleth-atlas','地区轮廓图册','Country outline atlas','真实地区轮廓从地图展开成等尺寸图册；颜色仍为原始比率，未测地区不补零。','Real country outlines unfold into equally sized atlas tiles. Color retains the original rate; unmeasured regions are never zero-filled.'],
 ['geomap','地区气泡地图','Geographic bubble map','geomap-coordinates','经纬度气泡坐标','Longitude–latitude bubbles','同一地点从 Natural Earth 投影移到经纬度坐标；气泡面积始终表示原始数量。','The same sites move from the Natural Earth projection to longitude–latitude coordinates. Bubble area always represents the supplied magnitude.'],
 ['geoflow','地理流向图','Geographic flows','geoflow-routes','有向流量路径展开','Directed route lanes','同一大圆关系线展开成有向路径条；线宽始终按流量线性缩放，不代表实测航线。','The same great-circle relationship unfolds into a directed route lane. Width remains linear in flow; these are not observed travel paths.'],
 ['lagplot','滞后散点图','Lagged observations','lagplot-differences','滞后变化坐标','Lagged differences','同一观测对从 (前值,当前值) 转入 (前值,当前值−前值)；前 lag 条原始记录保留。','The same observed pairs move from (previous,current) to (previous,current−previous). The first lag raw records are retained.'],
 ['periodogram','周期功率谱','Periodogram','periodogram-cumulative','累计频点功率','Cumulative bin power','同一矩形窗、去均值的单边频点功率展开为累计功率；总功率等于原序列总体方差。','The same detrended rectangular-window one-sided bin powers unfold into cumulative power. Total power equals the population variance of the raw sequence.'],
 ['recurrence','标量递归图','Scalar recurrence matrix','recurrence-lags','递归时间差坐标','Recurrence lag coordinates','完整对称时间对从双时间轴移到平均时间与时间差；阈值与原始幅度保持不变。','All symmetric time pairs move to mean time and time difference. The threshold and raw amplitudes remain unchanged.'],
 ['spectrogram','时频功率谱图','Spectrogram','spectrogram-transposed','频时功率矩阵','Frequency–time power matrix','原始时频单元连续转置；仍用外部输入功率与相同色标，不执行 FFT 或平滑。','Original time-frequency cells continuously transpose. Supplied external power and its color scale remain unchanged; no FFT or smoothing is performed.'],
 ['eyediagram','双符号眼图','Two-symbol eye diagram','eyediagram-time','原始时域波形','Original time-domain waveform','双符号观察窗展开回原始采样时刻；只复用真实边界采样，不补点或恢复时钟。','Two-symbol windows unfold back to the original sample times. Only actual boundary observations are reused; no samples or clock recovery are synthesized.'],
 ['decisioncurve','决策净获益曲线','Decision net benefit','decisioncurve-incremental','相对全部处理的净获益','Benefit relative to acting on all','完整测试集、同分整体筛选；净获益转为减去同阈值全部处理基线后的增量。','Use the complete test population and enter score ties together. Net benefit becomes the increment over the act-on-all baseline at the same threshold.'],
 ['thresholdmetrics','阈值指标曲线','Threshold metrics','thresholdmetrics-panels','指标分面曲线','Separate metric panels','同一阈值上的精确率、召回率和 F1 展开成独立面板；未选中样本的精确率仍未定义。','Precision, recall and F1 at the same thresholds separate into panels. Precision remains undefined when no samples are selected.'],
 ['costcurve','期望代价曲线','Expected classification cost','costcurve-savings','相对全部判负的节省','Savings over predicting none','相同固定误报与漏报成本；每记录代价转为相对全部判负基线的节省，不自动选最佳阈值。','Keep the same fixed false-positive and false-negative costs. Per-record cost becomes savings over predicting all negative; no optimal threshold is selected.']
];
export const completionNativeSpecs=specs;
export const completionNativeViews=specs.flatMap(([id,zh,en,alt,az,ae,note,noteEn])=>[
 {id:`complete-native-${id}`,en,get name(){return t(zh,en);},get note(){return t(note,noteEn);}},
 {id:`complete-native-${alt}`,en:ae,get name(){return t(az,ae);},get note(){return t(note,noteEn);}}
]);
const viewTemplates=new Map(specs.flatMap(([id,,,alt])=>[[`complete-native-${id}`,id],[`complete-native-${alt}`,id]]));
export const completionNativeViewMap=Object.fromEntries(specs.map(([id])=>[id,`complete-native-${id}`]));
export const isCompletionNativeView=id=>viewTemplates.has(id);
export const completionNativeTemplate=view=>viewTemplates.get(view);
export const completionNativeFamily=view=>isCompletionNativeView(view)?`complete-native-${viewTemplates.get(view)}`:undefined;
export function completionNativeDocument(doc,common={}){if(!completionNativeViewMap[doc?.template])return null;return {...structuredClone(doc),...common,family:`complete-native-${doc.template}`,data:doc.data.map((row,i)=>({...row,row:i}))};}
export function completionNativeEligibility(doc,view){
 const fail=(zh,en)=>({valid:false,reason:t(zh,en)});
 if(!isCompletionNativeView(view)||doc?.family!==completionNativeFamily(view)||doc?.template!==completionNativeTemplate(view))return fail('请选择此图型的完整原始表。','Select the complete native table for this chart.');
 if(!Array.isArray(doc.data)||doc.data.some(r=>typeof r?._id!=='string'||!r._id)||new Set(doc.data.map(recordId)).size!==doc.data.length)return fail('每条原始记录需要独立且持久的记录 ID。','Every original record requires its own persistent record ID.');
 const report=validateDocument(doc,{layout:false});if(!report.valid)return {valid:false,reason:report.errors[0]};
 if(doc.template==='periodogram'){const bins=spectrum11(doc.data.map(r=>r.value),doc.sampleInterval);if(bins.some(p=>!Number.isFinite(p.power)||!Number.isFinite(p.frequency))||!Number.isFinite(bins.reduce((s,p)=>s+p.power,0)))return fail('频点功率在当前单位下不可表示，请先换算单位。','Spectral bin power is unrepresentable in the current units; rescale the measurements.');}
 return {valid:true,reason:''};
}
const metadata=['unit','source','axes','lag','sampleInterval','timeUnit','threshold','symbolPeriod','timeOrigin','positiveLabel','thresholdMin','thresholdMax','falsePositiveCost','falseNegativeCost'];
const gridFields={choropleth:['code'],geomap:[],geoflow:['source','target','sourceLongitude','sourceLatitude','targetLongitude','targetLatitude'],recurrence:['time'],spectrogram:['time','frequency'],eyediagram:['time'],decisioncurve:['label','model','actual','score'],thresholdmetrics:['label','model','actual','score'],costcurve:['label','model','actual','score']};
export function completionNativeCompatibility(a,b){
 if(a?.family!==b?.family||a?.template!==b?.template)return t('图型的原始数据结构不同。','Native data contracts differ.');
 if(metadata.some(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])))return t('单位、来源、阈值或采样参数不同，需保留各自图表。','Units, source, thresholds or sampling parameters differ; keep their separate charts.');
 const signature=doc=>doc.data.map(r=>[recordId(r),...(gridFields[doc.template]||[]).map(k=>r[k])]);
 const aa=signature(a),bb=signature(b);if(!['lagplot','periodogram'].includes(a.template)){aa.sort((x,y)=>x[0].localeCompare(y[0]));bb.sort((x,y)=>x[0].localeCompare(y[0]));}
 if(JSON.stringify(aa)!==JSON.stringify(bb))return t('原始记录、采样网格、观察对或模型测试集改变，需重新计算关系。','Original records, sampling grid, observed pairs or model test population changed; reconstruct the relationships.');
 return '';
}
const extent=values=>{const v=values.filter(Number.isFinite);return v.length?[Math.min(...v),Math.max(...v)]:[0,1];};
export function completionNativeBounds(doc){
 const id=doc.template,rows=doc.data;
 if(id==='choropleth'||id==='geomap'||id==='geoflow')return {value:extent(rows.map(r=>r.value))};
 if(id==='lagplot')return {value:extent(rows.map(r=>r.value)),difference:extent(rows.slice(doc.lag).map((r,i)=>r.value-rows[i].value))};
 if(id==='periodogram'){const bins=spectrum11(rows.map(r=>r.value),doc.sampleInterval);return {value:extent(rows.map(r=>r.value)),power:[0,Math.max(...bins.map(p=>p.power))],cumulative:[0,bins.reduce((s,p)=>s+p.power,0)],frequency:[0,.5/doc.sampleInterval]};}
 if(id==='recurrence')return {value:extent(rows.map(r=>r.value)),time:extent(rows.map(r=>r.time))};
 if(id==='spectrogram'){const s=spectrum15(rows);return {power:[0,s.max],time:[s.times[0]-s.dt/2,s.times.at(-1)+s.dt/2],frequency:[Math.max(0,s.frequencies[0]-s.df/2),s.frequencies.at(-1)+s.df/2]};}
 if(id==='eyediagram')return {value:extent(rows.map(r=>r.value)),time:extent(rows.map(r=>r.time))};
 if(id==='thresholdmetrics')return {threshold:[0,1],value:[0,1]};
 if(id==='decisioncurve'){const m=decision16(doc);return {threshold:[doc.thresholdMin,doc.thresholdMax],value:extent([0,...m.all.map(p=>p.net),...m.models.flatMap(c=>c.points.map(p=>p.net))]),increment:extent([0,...m.all.map(p=>-p.net),...m.models.flatMap(c=>c.points.map((p,i)=>p.net-m.all[i].net))])};}
 const m=thresholds18(doc),prevalence=m[0].prevalence,none=prevalence*doc.falseNegativeCost,all=(1-prevalence)*doc.falsePositiveCost;
 return {threshold:[0,1],value:extent([0,all,none,...m.flatMap(c=>c.points.map(p=>p.cost))]),savings:extent([0,none,none-all,...m.flatMap(c=>c.points.map(p=>none-p.cost))])};
}
export function completionNativeRecipe(from,to){return {id:completionNativeFamily(to),name:t('原始图表连续换坐标','Continuous native coordinates'),description:completionNativeViews.find(v=>v.id===to)?.note||''};}
export function completionNativeGuide(doc,view){return [completionNativeViews.find(v=>v.id===view)?.note||'',t('保留全部原始字段、记录 ID、单位、来源和采样／模型参数。派生点保留来源记录身份；点击原始点编辑原值。不同结构不强行对应，不删行、不补零，不生成未观察的样本。','Keep every original field, record ID, unit, source and sampling/model parameter. Derived points retain their contributing records; edit originals through raw points. Never force different contracts to match, drop rows, zero-fill missing values or synthesize observations.'),t('同一批轮廓在坐标间连续移动；变形中停稳后读数。地图保留真实底图及经纬度，分析沿用原生算法，不新增拟合或自动阈值建议。','The same contours move continuously between coordinates; read values once the animation settles. Geography retains the real basemap and coordinates. Analysis uses native methods without new fits or automatic threshold advice.')];}
export function completionNativeColorKeys(doc){
 if(['decisioncurve','thresholdmetrics','costcurve'].includes(doc.template))return doc.data.map(r=>populationId('sample-group',doc.data.filter(p=>p.model===r.model)));
 if(['periodogram','lagplot','recurrence','eyediagram'].includes(doc.template))return doc.data.map(()=>populationId('complete-native-signal',doc.data));
 return doc.data.map(recordId);
}
export function completionNativeColorSubjects(doc){const keys=completionNativeColorKeys(doc),seen=new Set();return doc.data.flatMap((row,i)=>{const id=keys[i];if(seen.has(id))return [];seen.add(id);const rows=doc.data.filter((r,j)=>keys[j]===id);return [{id,label:['periodogram','lagplot','recurrence','eyediagram'].includes(doc.template)?doc.title:(row.model||row.label||row.code||(row.source&&row.target?`${row.source} → ${row.target}`:doc.title)),kind:rows.length>1?'group':'record',recordIds:rows.map(recordId),row:i}];});}
export function completionNativeAgentGuide(english=false){return english?`Use the existing FORMA continuous morph player and the complete-native- views. Keep native template, all raw rows and persistent _id values, units, source, axes, lag, sampleInterval, timeUnit, threshold, symbolPeriod, timeOrigin, positiveLabel, thresholdMin/Max and falsePositiveCost/falseNegativeCost where present. Do not recreate the renderer or replace keyed geometry with crossfades. Each native template has its own independent data contract and one alternate view. Use real embedded Natural Earth boundaries, explicit decimal-degree coordinates and geodesic relationship lines, never invented maps or observed-route claims. Preserve geoNaturalEarth1().fitExtent(plotExtent, {type:"Sphere"}) and the projection stream for antimeridian clipping. Work JSON contains observations, not boundary geometry. An Agent delivering outside FORMA must include the embedded boundary dependency or use https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson (public domain terms: https://www.naturalearthdata.com/about/terms-of-use/); disclose the missing dependency instead of inventing polygons. Match region code to boundary code; never infer longitude/latitude from names or code strings. Country atlas tiles preserve region contours but normalize their layout size; only color encodes the supplied rate. Bubble area encodes magnitude and a zero is a hollow location marker. Flow width is linear in value and arrow direction is source to target. Lag differences reuse actual paired measurements and keep all raw rows. Periodograms use the original native mean subtraction, rectangular window and one-sided DFT power; cumulative power sums those bins, is not PSD and equals population variance. Recurrence keeps every symmetric scalar time pair, original threshold and all raw observations. Spectrograms only transpose externally supplied cells and retain half-bin extents and the same linear power scale. Eye diagrams fold the original equally spaced samples into two-symbol windows and unfold them back to actual time, reusing only real boundary samples. Classification views use the same complete held-out population, enter ties together with score>=threshold, keep precision null when no rows are selected and never select an optimal threshold. Incremental net benefit subtracts the act-on-all baseline at the same threshold; cost savings subtract native per-record cost from the act-on-none cost. Stable original/derived role keys must survive direct seeking, reverse, interruption, editing, themes and HTML/video/SVG/PPT exports. Do not delete data, invent intervals, refit a model or silently convert units.`:`使用现有 FORMA 连续变形播放器与 complete-native- 视图。保留原生 template、完整原表、持久 _id、单位、来源、axes，以及适用的 lag、sampleInterval、timeUnit、threshold、symbolPeriod、timeOrigin、positiveLabel、thresholdMin/Max、falsePositiveCost/falseNegativeCost；无需重写渲染器，不用整图淡入淡出代替稳定轮廓变形。每个原生模板保持独立数据契约，对应一套原图与另一种有意义的坐标表示。地图使用内嵌真实 Natural Earth 边界、十进制度经纬度及大圆关系线，不虚构地图、不宣称实测航线。保留 geoNaturalEarth1().fitExtent(plotExtent, {type:"Sphere"}) 与处理日期变更线的投影流。作品 JSON 只有观测，不含边界几何；Agent 在 FORMA 外交付时要携带内嵌底图依赖，或使用 https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson （公有领域条款：https://www.naturalearthdata.com/about/terms-of-use/）；无法取得时说明缺少依赖，不能虚构多边形。地区 code 必须匹配底图代码，不能从地区名称或代码字符串猜测经纬度。地区图册保留轮廓但统一布局大小，只有颜色编码原始比率；地点面积编码数量，零为原始空心定位点；流向线宽按数量线性缩放，方向由 source 指向 target。滞后差值沿用真实配对并保留所有原始行。周期谱使用原生去均值、矩形窗和单边 DFT 每频点功率，累计视图仅累加这些频点，单位不是 PSD，总和等于原始序列总体方差。递归图保留完整对称时间对、标量阈值及原始观测。时频谱只转置外部功率单元，保留半箱边缘及统一线性色标。眼图把严格等间隔采样按双符号窗折叠，再展开回原始时刻，只复用真实边界采样。分类视图使用同一完整测试人群，score>=threshold 同分整体处理，未选中记录时 precision 为 null，不自动选择阈值；净获益增量减去同阈值全部处理基线，节省为全部判负代价减去原始每记录代价。原始与派生 role 身份需支持直接定位、倒放、中断接续、编辑、主题与 HTML/视频/SVG/PPT 导出。不删数据、不制造区间、不重拟合模型、不静默换算单位。`;}
