import * as d3 from 'd3';
import {isEnglish} from './locale.js';
import {volume15Catalog,volume15English} from './volume15-catalog.js';
export const t15=(zh,en)=>isEnglish()?en:zh;
const ids=new Set(volume15Catalog.map(t=>t.id));
export const ordered15=rows=>[...rows].sort((a,b)=>a.value-b.value);
export function weibull15(rows){return ordered15(rows).map((row,i)=>{const p=(i+1-.3)/(rows.length+.4);return{row,p,x:Math.log(row.value),y:Math.log(-Math.log1p(-p))};});}
export function meanExcess15(rows,minExceedances){return [...new Set(rows.map(r=>r.value))].sort(d3.ascending).map(threshold=>{const exceedances=rows.filter(r=>r.value>threshold);return{threshold,count:exceedances.length,mean:exceedances.length?d3.mean(exceedances,r=>r.value-threshold):0,rows:exceedances};}).filter(p=>p.count>=minExceedances);}
export function ttt15(rows){const ordered=ordered15(rows),max=d3.max(ordered,r=>r.value),total=d3.sum(ordered,r=>r.value/max);let sum=0;return[{fraction:0,total:0,row:null},...ordered.map((row,i)=>({fraction:(i+1)/rows.length,total:((sum+=row.value/max)+(rows.length-i-1)*(row.value/max))/total,row}))];}
export function recurrence15(rows,threshold){const ordered=[...rows].sort((a,b)=>a.time-b.time);return{rows:ordered,cells:ordered.flatMap((a,i)=>ordered.map((b,j)=>({i,j,a,b,distance:Math.abs(a.value-b.value),recurrent:Math.abs(a.value-b.value)<=threshold}))) };}
export function regular15(values){if(values.length<2)return false;const step=values[1]-values[0];return Number.isFinite(step)&&step>0&&values.every((v,i)=>Number.isFinite(v)&&(i===0||v>values[i-1])&&Math.abs(v-(values[0]+i*step))<=Math.max(step*1e-7,Math.min(step*1e-4,Math.abs(v)*Number.EPSILON*2)));}
export function spectrum15(rows){const times=[...new Set(rows.map(r=>r.time))].sort(d3.ascending),frequencies=[...new Set(rows.map(r=>r.frequency))].sort(d3.ascending);return{times,frequencies,dt:times[1]-times[0],df:frequencies[1]-frequencies[0],max:d3.max(rows,r=>r.power)};}
export function validateVolume15(doc,{fail,count,noDuplicates,warnings}){
 if(!ids.has(doc.template))return;const id=doc.template,rows=doc.data,finite=v=>typeof v==='number'&&Number.isFinite(v),bad=message=>fail(t15(...message));
 const range={lexis:[3,60],swimmer:[3,24],eventhistory:[4,160],recurrence:[12,80],weibull:[5,300],meanexcess:[5,300],ttt:[5,300],spectrogram:[9,1500]}[id];count(rows.length,...range,t15('输入记录','input records'));
 if(id!=='spectrogram')noDuplicates(rows.map(r=>r.label),t15('记录编号','Record labels'));
 const numeric=volume15Catalog.find(t=>t.id===id).fields.filter(f=>f[1]==='number').map(f=>f[0]);if(rows.some(r=>numeric.some(k=>!finite(r[k])))){bad(['数值字段必须保留有限原值；缺测不补零。','Numeric fields require finite original values; missing values are not zero-filled.']);return;}
 if(id==='lexis'&&rows.some(r=>r.entryAge<0||r.exitPeriod<=r.entryPeriod||!Number.isFinite(r.entryAge+r.exitPeriod-r.entryPeriod)))bad(['年龄必须非负，退出晚于进入，推导出的退出年龄必须有限。','Entry age must be nonnegative, exit after entry and derived exit age finite.']);
 if(id==='swimmer'&&rows.some(r=>r.end<=r.start||![0,1].includes(r.ongoing)||r.response!==null&&(!finite(r.response)||r.response<r.start||r.response>r.end)))bad(['结束必须晚于开始；ongoing 只能为 0/1；response 必须为空或位于闭合观察区间内。','End must follow start; ongoing must be 0/1; response is null or within the closed observation interval.']);
 if(id==='eventhistory'){
  const subjects=[...new Set(rows.map(r=>r.subject))],states=[...new Set(rows.map(r=>r.state))];count(subjects.length,2,20,t15('个体','individuals'));count(states.length,2,8,t15('状态','states'));
  if(rows.some(r=>r.end<=r.start))bad(['状态区间的结束必须严格晚于开始。','State intervals require end strictly after start.']);
  for(const subject of subjects){const intervals=rows.filter(r=>r.subject===subject).sort((a,b)=>a.start-b.start);if(intervals.some((r,i)=>i>0&&r.start<intervals[i-1].end))bad(['同一个体的状态区间不能重叠；空档会保留。','State intervals for one individual cannot overlap; gaps remain visible.']);}
 }
 if(id==='recurrence'){
  const times=rows.map(r=>r.time).sort(d3.ascending);noDuplicates(times,t15('采样时间','Sampling times'));if(!regular15(times))bad(['time 必须唯一且等间隔，不能把不规则采样直接排成等距矩阵。','time must be unique and equally spaced; irregular samples cannot be treated as an equally spaced matrix.']);
  if(!finite(doc.threshold)||doc.threshold<0)bad(['threshold 必须是原值单位的有限非负距离。','threshold must be a finite nonnegative distance in original measurement units.']);
  if(typeof doc.timeUnit!=='string'||!doc.timeUnit.trim())bad(['timeUnit 必须明确采样时间的单位。','timeUnit must declare the sample-time unit.']);
 }
 if(['weibull','ttt'].includes(id)&&rows.some(r=>r.value<=0))bad(['此图仅接受完整未删失的正寿命；不接收零值或负值。','Only complete uncensored positive lifetimes are supported; zero and negative values are invalid.']);
 if(['weibull','ttt'].includes(id)&&rows.some(r=>r.censored===true||r.censored===1||r.event===0))bad(['检测到删失标记；本图没有实现删失估计，请改用生存曲线。','Censoring flags were found. This chart does not implement censoring estimation; use a survival curve.']);
 if(id==='meanexcess'){
  if(!Number.isInteger(doc.minExceedances)||doc.minExceedances<2||doc.minExceedances>=rows.length)bad(['minExceedances 必须为至少 2 且小于样本量的整数。','minExceedances must be an integer of at least 2 and below sample size.']);
  else if(!meanExcess15(rows,doc.minExceedances).length)bad(['没有阈值保留足够的严格超额样本；请检查原值或最小超额样本量。','No threshold retains enough strictly exceeding samples; check observations or minExceedances.']);
 }
 if(id==='spectrogram'){
  const model=spectrum15(rows);count(model.times.length,3,48,t15('时间窗','time windows'));count(model.frequencies.length,3,32,t15('频率箱','frequency bins'));
  if(!regular15(model.times)||!regular15(model.frequencies))bad(['时间和频率的中心点分别必须唯一等距。','Time and frequency centers must each form a unique equally spaced grid.']);
  if(rows.some(r=>r.power<0||r.frequency<0))bad(['频率与功率必须非负；当前色标不接收分贝负数。','Frequency and power must be nonnegative; this linear scale does not accept negative decibels.']);
  noDuplicates(rows.map(r=>`${r.time}|${r.frequency}`),t15('时频单元','Time-frequency cells'));if(rows.length!==model.times.length*model.frequencies.length)bad(['必须提供完整时频矩阵；没有测量的单元不能补零。','Supply the complete time-frequency matrix; unmeasured cells cannot be zero-filled.']);
  if(![doc.axes?.x,doc.axes?.y].every(v=>typeof v==='string'&&v.trim()&&v.length<=80))bad(['axes.x 和 axes.y 必须分别写明时间、频率及单位。','axes.x and axes.y must declare time, frequency and their units.']);
  if(!(model.dt/2>0&&model.df/2>0)||![model.times[0]-model.dt/2,model.times.at(-1)+model.dt/2,model.frequencies.at(-1)+model.df/2].every(Number.isFinite))bad(['网格宽度必须能用有限非零坐标表达；请换算单位。','Grid widths must be representable as finite nonzero coordinates; convert units.']);
 }
 warnings.push(t15('输入记录完整保留；不补缺测、不删除离群值，所有动画均可往返定位。','All input records are retained without zero-filling missing values or trimming outliers; animation is reversibly seekable.'));
 if(['weibull','ttt'].includes(id))warnings.push(t15('仅支持完整未删失、等权寿命样本；不会自动检测未标注的删失，也不计算拟合参数或显著性。','Only complete uncensored equally weighted lifetimes are supported. Unmarked censoring cannot be inferred; no fitted parameters or significance tests are calculated.'));
 if(id==='spectrogram')warnings.push(t15('输入必须是外部分析得到的功率矩阵；本图不执行 FFT、加窗、归一化或单位换算。','Input must be an externally computed power matrix; this chart performs no FFT, windowing, normalization or unit conversion.'));
}
export function volume15Summary(doc,fmt){return ids.has(doc.template)?{value:fmt(doc.data.length),label:t15(doc.template==='spectrogram'?'时频单元':'输入记录',doc.template==='spectrogram'?'Time-frequency cells':'Input records'),unit:t15('条','rows')}:null;}
export function volume15MethodNotes(id){const notes={
 lexis:[t15('横轴为日历年，纵轴为年龄（年）。退出年龄=进入年龄+退出年−进入年；出生年=进入年−进入年龄。不同坐标轴的像素比例可能不同，斜线未必在屏幕上呈 45°。端点只表示观察边界。','X is calendar year and Y is age in years. Exit age=entry age+exit period−entry period; birth year=entry period−entry age. Axis pixel scales may differ, so lifelines need not appear at 45° on screen. Endpoints mark observation boundaries only.')+' https://www.ncbi.nlm.nih.gov/books/NBK536348/'],
 swimmer:[t15('观察区间按时长降序排列；菱形为原始 response，空值不画标记。箭头仅在原始 end 处说明仍在观察，不增加一个虚构未来时段。','Observation windows sort by descending duration. Diamonds use original response times; null has no marker. An arrow at the recorded end denotes continuation without adding a fictitious future interval.')+' https://stat.ethz.ch/CRAN/web/packages/swimplot/refman/swimplot.html'],
 eventhistory:[t15('区间使用 [start,end)；同个体可相接但不可重叠。空档不绘制颜色，不推断未知状态；状态颜色全图一致。','Intervals use [start,end); one individual’s intervals may touch but cannot overlap. Gaps have no state color and no imputed state; a state keeps one color throughout.')+' https://stat.ethz.ch/CRAN/web/packages/Epi/refman/Epi.html'],
 recurrence:[t15('R(i,j)=1 当且仅当 |value_i−value_j|≤threshold。原始标量直接参与比较，嵌入维数为 1；矩阵包含恒为 1 的主对角线，保持对称。阈值不是百分位，也不自动标准化。','R(i,j)=1 iff |value_i−value_j|≤threshold. Compare original scalar observations directly with embedding dimension 1. The symmetric matrix includes its all-one identity diagonal. The threshold is not a percentile and values are not standardized.')+' https://pyts.readthedocs.io/en/latest/generated/pyts.image.RecurrencePlot.html'],
 weibull:[t15('排序后使用 p_i=(i−0.3)/(n+0.4)，横坐标 ln(value_i)，纵坐标 ln(−ln(1−p_i))。重复原值保留各自排序位置；不添加回归拟合直线。','After sorting, p_i=(i−0.3)/(n+0.4), X=ln(value_i), Y=ln(−ln(1−p_i)). Tied original values retain separate ordered plotting positions. No fitted regression line is added.')+' https://www.itl.nist.gov/div898/handbook/eda/section3/weibplot.htm'],
 meanexcess:[t15('对每个不同原值 u，取严格满足 x>u 的观测，e(u)=Σ(x−u)/#{x>u}。只显示超额样本量不少于 minExceedances 的阈值，原始观测仍全部保留在短线带中。不计算置信区间。','For each distinct observed threshold u, e(u)=Σ(x−u)/#{x>u}, using strictly exceeding observations. Display thresholds with at least minExceedances observations; the raw rug retains the complete sample. No confidence interval is calculated.')+' https://search.r-project.org/CRAN/refmans/evir/html/meplot.html'],
 ttt:[t15('令 t_(i) 为升序寿命，TTT_i=[Σ(j≤i)t_(j)+(n−i)t_(i)]/Σ(j≤n)t_(j)，横坐标 i/n，含原点与 (1,1)。不进行平滑或删失修正，对角线为指数分布参考。','For ordered lifetimes t_(i), TTT_i=[Σ(j≤i)t_(j)+(n−i)t_(i)]/Σ(j≤n)t_(j), plotted against i/n and including (0,0) and (1,1). No smoothing or censoring correction is applied; the diagonal is an exponential-distribution reference.')+' https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/ttt_plot.htm'],
 spectrogram:[t15('每个矩形位于输入的 time、frequency 中心，两轴边缘向外延伸半个箱宽；频率下限截在 0。统一线性色标为 [0,max(power)]，单位由文档声明。图中每格对应一个原始输入单元。','Each rectangle is centered on the input time and frequency; outer bounds extend by half a bin, with frequency clipped at zero. One linear color scale spans [0,max(power)] in the document’s declared unit. Every cell maps to one original input record.')+' https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.spectrogram.html']
 };return notes[id]||[];}
export function guide15(t,guide){if(!ids.has(t.id))return guide;const en=volume15English[t.id],warnings=[];validateVolume15(guide.example,{fail:()=>{},count:()=>{},noDuplicates:()=>{},warnings});const rowMeaning={lexis:'一行是一个个体的完整观察生命线，退出年龄由时间差推导。',swimmer:'一行是一个个体的观察窗口，可带首次响应与继续观察标记。',eventhistory:'一行是一个个体的一个互斥状态区间，label 标识该区间。',recurrence:'一行是等间隔时间上的一条完整原始标量观测。',weibull:'一行是一条完整、未删失的原始正寿命，重复原值保留。',meanexcess:'一行是一条原始完整观测；超额均值由全部输入推导。',ttt:'一行是一条完整未删失正寿命；所有记录共同构成总试验时间。',spectrogram:'一行是一个时频单元，输入窗中心、频率箱中心与预计算功率。'};return{...guide,introduction:isEnglish()?en.description:t.description,rowMeaning:isEnglish()?en.rowMeaning:rowMeaning[t.id],use:isEnglish()?en.use:t.use,avoid:isEnglish()?en.avoid:t.avoid,limit:isEnglish()?en.limit:t.limit,notes:[...warnings,...volume15MethodNotes(t.id)],fields:guide.fields.map((f,i)=>({...f,description:isEnglish()?en.fields[i][2]:t.fields[i][2]}))};}
