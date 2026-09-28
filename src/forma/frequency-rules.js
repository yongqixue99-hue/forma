import {isEnglish} from './locale.js';
import {recordId,populationId} from './data-identity.js';
import {response19} from './volume19-data.js';

export const frequencyText=(zh,en)=>isEnglish()?en:zh;
const view=(id,zh,en,note,noteEn)=>({id,get name(){return frequencyText(zh,en);},en,get note(){return frequencyText(note,noteEn);}});
export const frequencyViews=[
 view('freq-bode','频响幅值与相位','Bode magnitude and phase','同一组正频率复响应展开为对数频率下的幅值与相位两个面板。','The same positive-frequency complex responses unfold into magnitude and phase panels on a logarithmic frequency axis.'),
 view('freq-nyquist','复响应轨迹','Nyquist response locus','幅值与相位的同一采样点合流到复平面；只连接实际正频率输入，不补造镜像。','Two representations of each sample meet on the complex plane. Only supplied positive-frequency samples are connected; no mirror points are invented.'),
 view('freq-nichols','增益相位联合轨迹','Nichols gain–phase locus','同一采样点移动到展开相位与分贝幅值坐标，保留采样顺序和曲线身份。','The same samples move to unwrapped-phase and decibel coordinates while preserving sampling order and curve identity.')
];
export const isFrequencyView=id=>frequencyViews.some(v=>v.id===id);
export const frequencyFamily=id=>isFrequencyView(id)?'frequency-response':undefined;
export const frequencyViewMap={bode:'freq-bode',nyquist:'freq-nyquist',nichols:'freq-nichols'};
const text=x=>typeof x==='string'&&x.trim().length>0;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e15;
const groups=rows=>[...new Set(rows.map(r=>r.group))].map(group=>rows.filter(r=>r.group===group));
export function frequencyDocument(doc,common={}){
 if(!frequencyViewMap[doc?.template])return null;
 return {...common,template:doc.template,title:doc.title,subtitle:doc.subtitle||'',unit:doc.unit,source:structuredClone(doc.source),frequencyUnit:doc.frequencyUnit,...(doc.axes?{axes:structuredClone(doc.axes)}:{}),family:'frequency-response',data:doc.data.map((row,i)=>({...row,row:i}))};
}
export function frequencyEligibility(doc,view){
 const bad=(zh,en)=>({valid:false,reason:frequencyText(zh,en)}),rows=doc?.data;
 if(!isFrequencyView(view)||doc?.family!=='frequency-response')return bad('请选择原始复频率响应数据。','Select original complex frequency-response data.');
 if(!Array.isArray(rows)||rows.length<4||rows.length>480)return bad('支持 4–480 个原始采样点，不会删行或补点适配图型。','Use 4–480 original samples; rows are never removed or invented to fit a view.');
 if(rows.some(r=>!text(r?._id)||!text(r.label)||!text(r.group)||![r.frequency,r.real,r.imag].every(finite)||r.frequency<=0)||new Set(rows.map(recordId)).size!==rows.length||new Set(rows.map(r=>r.label)).size!==rows.length)return bad('每个采样需唯一记录 ID、编号、曲线名称、正频率和有限复响应。','Each sample needs a unique record ID, label, curve name, positive frequency and finite complex response.');
 const curves=groups(rows);
 if(curves.length>4||curves.some(part=>part.length<4||part.length>160||new Set(part.map(r=>r.frequency)).size!==part.length))return bad('支持 1–4 条曲线，每条 4–160 个频率互不重复的采样。','Use 1–4 curves with 4–160 distinct positive-frequency samples each.');
 if(rows.some(r=>!(Math.hypot(r.real,r.imag)>0)))return bad('零复响应的分贝和相位未定义，请保留原值并使用原生复平面图。','Decibels and phase are undefined for zero response. Retain the original values and use the native complex-plane chart.');
 if(!text(doc.unit)||!text(doc.frequencyUnit)||!text(doc.source?.name))return bad('请声明响应单位、频率单位和数据来源。','Declare response units, frequency units and data source.');
 if(response19(rows).some(c=>c.points.some(p=>![p.magnitude,p.db,p.phase].every(Number.isFinite))))return bad('当前复响应超过可表示的数值范围，请核对单位。','The response exceeds the representable numeric range; review the units.');
 return {valid:true,reason:''};
}
export function frequencyCompatibility(a,b){
 if(a?.family!=='frequency-response'||b?.family!=='frequency-response'||a.unit!==b.unit||a.frequencyUnit!==b.frequencyUnit)return frequencyText('频率或复响应单位不同，保留各自图表正常切换。','Frequency or response units differ; switch between the independent charts.');
 if(JSON.stringify(a.axes||null)!==JSON.stringify(b.axes||null)||['name','type','url'].some(k=>a.source?.[k]!==b.source?.[k]))return frequencyText('响应来源或坐标定义不同，保留各自数据含义。','Response sources or axis definitions differ; preserve their separate meanings.');
 if(!Array.isArray(a.data)||!Array.isArray(b.data))return frequencyText('缺少完整原始采样。','Complete original samples are required.');
 const signature=rows=>groups(rows).map(part=>part.map(r=>[recordId(r),r.frequency]).sort((x,y)=>x[0].localeCompare(y[0]))).sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));
 if(JSON.stringify(signature(a.data))!==JSON.stringify(signature(b.data)))return frequencyText('曲线采样身份或频率网格改变，需重新建立相位展开与相邻连线。','Curve sample identities or the frequency grid changed; phase unwrapping and adjacent links must be reconstructed.');
 return '';
}
export function frequencyBounds(doc){
 const points=response19(doc.data).flatMap(c=>c.points),extent=values=>[Math.min(...values),Math.max(...values)];
 return {logFrequency:extent(doc.data.map(r=>Math.log10(r.frequency))),magnitude:extent(points.map(p=>p.db)),phase:extent(points.map(p=>p.phase)),real:extent(doc.data.map(r=>r.real)),imag:extent(doc.data.map(r=>r.imag))};
}
export function frequencyRecipe(from,to){return {id:'frequency-response',name:frequencyText('频响采样连续换坐标','Continuous frequency-response coordinates'),description:frequencyText('同一采样的幅值点与相位点分开或合流，连接相同相邻采样的线段随点移动；变换中隐藏不同量纲的坐标轴。','Magnitude and phase representations separate or meet for each original sample. Links move with the same adjacent samples; axes with different units are hidden during the transition.')};}
export function frequencyGuide(doc,view){return [frequencyViews.find(v=>v.id===view)?.note||'',frequencyText('每行保留 label、group、frequency、real、imag 和记录 ID。real/imag 输入线性复响应，不把 dB 当原始实部；声明 unit 与 frequencyUnit。','Keep label, group, frequency, real, imag and the stored record ID in each row. Supply the linear complex response, never decibels as its real part; declare unit and frequencyUnit.'),frequencyText('幅值由 hypot(real,imag) 计算，dB=20·log10(幅值)。相位按频率排序，逐点选择最近的 360° 分支；不能恢复采样间隐藏的相位圈数。','Magnitude is hypot(real,imag), with dB=20·log10(magnitude). Sort by frequency and unwrap to the nearest successive 360° branch; unobserved phase turns between samples cannot be recovered.'),frequencyText('实心点与外环表示同一采样的两种投影，不是两份观测。点击可分别编辑原始实部与虚部；不补负频率、不拟合，不据此推断稳定性或稳定裕度。','Solid points and outer rings are two projections of the same sample, not two observations. Edit the original real and imaginary parts separately. No negative frequencies, fitting, stability conclusions or stability margins are manufactured.')];}
export const frequencyGroupKey=rows=>populationId('sample-group',rows);

export function frequencyAgentGuide(english=false){return english?`Use the existing FORMA player and its freq-bode, freq-nyquist and freq-nichols views for one original frequency-response table. Do not recreate the renderer or replace the animation with chart crossfades. Retain every editable native label/group/frequency/real/imag row and its stored _id, unit, frequencyUnit and source. real and imag are the linear real and imaginary parts of the same supplied complex response, never decibels or already-computed phase. Frequency must be positive. Use 1–4 curves, each with 4–160 unique frequencies and at most 480 samples total. Do not delete rows, fill missing values, create DC samples or synthesize negative-frequency mirrors.
Compute magnitude=hypot(real,imag), dB=20*log10(magnitude) and phase=atan2(imag,real) in degrees. Within each group sort actual samples by frequency and select the nearest successive 360-degree phase branch. This does not recover unobserved phase turns between samples. A zero complex response has undefined decibels and phase: retain the original zero and use the native Nyquist entrance instead of replacing it with an arbitrary epsilon. Preserve frequency and response units exactly; never silently convert Hz into rad/s or mix response units.
Bode uses a log-frequency horizontal axis with separate magnitude and unwrapped-phase panels. Nyquist uses the supplied real and imaginary components with equal pixels per unit on both axes. Nichols uses unwrapped phase horizontally and decibel magnitude vertically. Two representations of each original sample separate in Bode and meet as a solid point plus outer ring in the other views. These are two projections of one observation, not two independent samples. Both remain visible, keep distinct stable role keys and provide raw real/imag edit targets. Point identity is ['frequency-sample',recordId] plus its magnitude/phase role; link identity is ['frequency-link',previousRecordId,currentRecordId] plus its role, always joining the same adjacent frequency samples. Use populationId('sample-group',rows) for group color identity, not display names or table positions.
Continuous morphing requires the same source, response unit, frequencyUnit, axis meaning, curve membership and recordId-to-frequency grid. Whole-curve renaming and source-row reordering preserve identity; real/imag updates on the same sampling grid are allowed. Changed frequency grids, missing/replaced samples or changed units must use an explained native entrance. Move existing point and line contours continuously, hiding unlike coordinate axes during intermediate frames. Preserve 0/25/50/75/100% seeking, reverse, direct jumps, interruption continuity, themes and original editing targets. HTML, video and SVG use the existing shared player. Do not fit a transfer function, infer unsampled response, compute stability margins or claim system stability from these supplied positive-frequency samples.`:`使用现有 FORMA 播放器的 freq-bode、freq-nyquist、freq-nichols 三种视图，共用同一份原始频率响应表；无需重写播放器，不用整图淡入淡出代替变形。完整保留可编辑的原生 label/group/frequency/real/imag 原表及持久 _id、unit、frequencyUnit、source。real/imag 是同一外部复响应的线性实部和虚部，不能填已算好的 dB 或相位。frequency 必须为正；支持 1–4 条曲线，每条 4–160 个唯一频率，合计不超过 480 个采样。不删行、不填缺失、不补直流，不生成负频率镜像。
幅值 magnitude=hypot(real,imag)，dB=20*log10(magnitude)，相位从 atan2(imag,real) 转为角度。每组按实际频率排序，再逐点选择距上一点最近的 360° 分支；不能恢复采样间隐藏的相位圈数。零复响应的分贝和相位未定义，保留原始零值并使用原生 Nyquist 入场，不能替换成任意极小数。响应单位与 frequencyUnit 必须保留且一致，不能把 Hz 静默换为 rad/s 或混用响应量纲。
Bode 用对数频率横轴和幅值/展开相位两个面板；Nyquist 用原始实部、虚部及双轴等比例；Nichols 横轴为展开相位、纵轴为分贝幅值。同一个采样的两种投影在 Bode 分开，其他视图合流为实心点加外环，并非两份独立观测；两种投影均保持可见，以不同稳定 role 区分，并分别编辑原始 real/imag。点身份为 ['frequency-sample',recordId] 加 magnitude/phase role；相邻连线身份为 ['frequency-link',previousRecordId,currentRecordId] 加 role，始终连接相同的相邻频率采样。组色身份使用 populationId('sample-group',rows)，不能用显示名或表格行号替代。
连续变形要求相同来源、响应单位、frequencyUnit、坐标含义、曲线成员及 recordId 对 frequency 的采样网格。整组改名与源表重排保持身份，同一网格上的 real/imag 数值更新可变形；频率网格、采样身份、曲线归属或单位改变时应说明原因并播放原生入场。同一批点及线段轮廓连续移动，中间帧隐藏量纲不同的坐标轴。支持确定性的 0/25/50/75/100% 帧、倒放、直接跳步、中断当前帧接续、主题和原始编辑入口，HTML、视频、SVG 复用现有播放器。不拟合传递函数、不推断未采样频响，不从这些正频率采样自动计算稳定裕度或判断系统稳定性。`;}
