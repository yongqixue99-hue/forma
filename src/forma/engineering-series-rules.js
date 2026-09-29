import {extent} from 'd3';
import {isEnglish} from './locale.js';
import {recordId,populationId} from './data-identity.js';
import {validateDocument} from './data.js';
import {smith19,windrose19,phasor19} from './volume19-data.js';
export const engineeringText=(zh,en)=>isEnglish()?en:zh;
const t=engineeringText,view=(id,family,zh,en,note,english)=>({id,family,get name(){return t(zh,en);},en,get note(){return t(note,english);}});
export const engineeringViews=[
 view('engineering-smith','engineering-smith','史密斯反射系数','Smith reflection coefficient','原阻抗通过明确 Z₀ 映射为 Γ，原 Ω 数值仍可编辑。','Map original impedance to Γ using explicit Z₀; original ohm values remain editable.'),
 view('engineering-impedance','engineering-smith','原始阻抗轨迹','Original impedance locus','在等比例电阻/电抗坐标中按频率连接原测量。','Connect original measurements in frequency order on equal resistance/reactance scales.'),
 view('engineering-polar','engineering-polar','方位极坐标','Compass polar observations','北为 0°、顺时针，半径保持原单位。','North is 0°, clockwise; radius retains its original unit.'),
 view('engineering-bearing-radius','engineering-polar','方位与径向量','Bearing and radial quantity','展开为原方位角与半径；不把 0° 与 360° 当作远近关系。','Unfold into original bearing and radius; distance across the 0°/360° seam is not a directional distance.'),
 view('engineering-phasor','engineering-phasor','同原点复相量','Complex phasors at one origin','保留同频同单位相量，虚线表示数学向量和。','Retain same-frequency, same-unit phasors; the dashed vector is their mathematical sum.'),
 view('engineering-phasor-chain','engineering-phasor','首尾相接相量','Head-to-tail phasors','原向量仅平移至上一端点，不旋转、归一化或改写分量。','Translate each original vector to the preceding endpoint without rotating, normalizing or changing components.'),
 view('engineering-iq','engineering-symbol','I/Q 符号散布','I/Q symbol observations','I/Q 等比例显示，不吸附理想点、不估算误码率。','Show I/Q on equal scales without snapping to ideal symbols or estimating error rates.'),
 view('engineering-symbol-polar','engineering-symbol','符号幅值与相位','Symbol magnitude and phase','数学相位从实轴逆时针；零符号相位未定义，保留在独立带。','Mathematical phase starts counterclockwise from the real axis. Zero symbols have undefined phase and retain a separate strip.'),
 view('engineering-polezero','engineering-root','原始零极点','Original poles and zeros','× 为极点、○ 为零点，重根分别保留，不计算稳定性。','× denotes a pole and ○ a zero. Repeated roots remain separate; stability is not computed.'),
 view('engineering-root-polar','engineering-root','根的模与辐角','Root modulus and argument','原根连续移到模与辐角；零根相位未定义，不补成 0°。','Move each root to modulus/argument coordinates; the zero root has undefined phase, never an invented 0°.'),
 view('engineering-hodograph','engineering-height','风矢量廓线','Wind-component hodograph','u 向东、v 向北，按测量高度连接实测层。','u is eastward and v northward; connect measured layers in height order.'),
 view('engineering-height-speed','engineering-height','高度与原风速','Measured height and wind speed','由原 u/v 计算 hypot，按真实测量高度展示，不生成中间层。','Compute hypot from original u/v at actual measured heights without inventing intermediate levels.'),
 view('engineering-windrose','engineering-wind','风向频率玫瑰','Wind-frequency rose','半径线性表示全样本频率，静风仍计入分母。','Radius linearly encodes full-sample frequency, including calm observations in the denominator.'),
 view('engineering-wind-sectors','engineering-wind','方向分区频率','Directional sector frequencies','相同方向与速度段摘要展开为堆叠频率；保留全部原观测。','Unfold the same direction/speed-bin summaries into stacked frequencies while retaining every raw observation.'),
 view('engineering-campbell','engineering-rotor','转速频率与幅值','Speed, frequency and amplitude','原 mode 声明分支；气泡面积为幅值，阶次线仅参考。','Input mode declares branches; bubble area encodes amplitude, and order lines are references only.'),
 view('engineering-speed-amplitude','engineering-rotor','转速与原幅值','Speed and original amplitude','相同采样点移到原幅值坐标，保留频率，不做模态追踪或 FFT。','Move the same samples to original-amplitude coordinates while retaining frequency; no modal tracking or FFT is performed.')
];
export const engineeringViewMap={smith:'engineering-smith',polarscatter:'engineering-polar',phasor:'engineering-phasor',constellation:'engineering-iq',polezero:'engineering-polezero',hodograph:'engineering-hodograph',windrose:'engineering-windrose',campbell:'engineering-campbell'};
const info=new Map(engineeringViews.map(v=>[v.id,v])),nativeByFamily=Object.fromEntries(Object.entries(engineeringViewMap).map(([id,v])=>[info.get(v).family,id]));
export const isEngineeringView=v=>info.has(v);
export const engineeringFamily=v=>info.get(v)?.family;
export function engineeringDocument(doc,common={}){const family=engineeringFamily(engineeringViewMap[doc?.template]);return family?{...doc,...common,family,data:doc.data.map((r,row)=>({...r,row}))}:null;}
export function engineeringPhasorRows(doc){const rows=doc.data||[],ids=rows.map(recordId),given=doc.phasorOrder;const valid=Array.isArray(given)&&given.length===ids.length&&new Set(given).size===ids.length&&given.every(id=>ids.includes(id)),order=valid?given:[...ids].sort(),byId=new Map(rows.map(r=>[recordId(r),r]));return order.map(id=>byId.get(id));}
export function engineeringEligibility(doc,view){
 const family=engineeringFamily(view),bad=(zh,en)=>({valid:false,reason:t(zh,en)});
 if(!family||doc?.family!==family||!Array.isArray(doc.data)||!doc.data.length)return bad('请选择对应工程原记录，不能混合不同物理数据契约。','Select the corresponding engineering records; different physical contracts cannot be mixed.');
 if(doc.data.some(r=>typeof r._id!=='string'||!r._id)||new Set(doc.data.map(recordId)).size!==doc.data.length)return bad('每条原记录必须有稳定唯一的 _id。','Every original record requires a stable unique _id.');
 const report=validateDocument({...doc,template:nativeByFamily[family]});if(!report.valid)return{valid:false,reason:report.errors.map(e=>typeof e==='string'?e:e.message).join(' ')};
 if(doc.data.some(r=>r.weight!==undefined||r.censored===true))return bad('本工程契约不忽略权重或删失字段。','These engineering contracts cannot silently ignore weights or censoring.');
 if(family==='engineering-smith'&&doc.unit!=='Ω')return bad('原阻抗及 referenceImpedance 必须以 Ω 表示，请明确换算单位。','Original impedance and referenceImpedance must be expressed in Ω; explicitly convert units.');
 if(family==='engineering-phasor'&&doc.phasorOrder!==undefined){const ids=doc.data.map(recordId),order=doc.phasorOrder;if(!Array.isArray(order)||order.length!==ids.length||new Set(order).size!==ids.length||order.some(id=>!ids.includes(id)))return bad('phasorOrder 必须包含每条原相量 _id 且恰好一次。','phasorOrder must contain each original phasor _id exactly once.');}
 const bounds=engineeringBounds(doc);if(Object.values(bounds).some(domain=>!domain.every(Number.isFinite)||!Number.isFinite(domain[1]-domain[0])))return bad('派生工程坐标超出可表示范围，请换算原单位。','Derived engineering coordinates exceed the representable range; convert original units.');
 return{valid:true,reason:''};
}
const groupField=doc=>['smith','polarscatter','constellation'].includes(doc.template)?'group':doc.template==='polezero'?'kind':doc.template==='campbell'?'mode':null;
export function engineeringGroups(doc){const field=groupField(doc),rows=doc.data||[];return field?[...new Set(rows.map(r=>r[field]))].map(name=>({name,rows:rows.filter(r=>r[field]===name)})):[];}
const groupKey=(doc,rows)=>populationId(['smith','polarscatter','constellation'].includes(doc.template)?'sample-group':'engineering-'+doc.template,rows);
export const engineeringWindKey=(doc,index)=>populationId('engineering-wind-bin:'+JSON.stringify([doc.unit,doc.calmThreshold,doc.speedBreaks,index]),doc.data||[]);
export function engineeringColorSubjects(doc){
 if(doc.template==='hodograph')return[];
 if(doc.template==='phasor')return(doc.data||[]).map(r=>({id:recordId(r),label:r.label}));
 if(doc.template==='windrose')return(Array.isArray(doc.speedBreaks)?doc.speedBreaks:[]).map((low,i)=>({id:engineeringWindKey(doc,i),label:`${low}–${doc.speedBreaks[i+1]??'∞'} ${doc.unit}`})).concat({id:engineeringWindKey(doc,-1),label:t('静风','Calm')});
 return engineeringGroups(doc).map(g=>({id:groupKey(doc,g.rows),label:g.name}));
}
export function engineeringColorKeys(doc){if(doc.template==='hodograph')return(doc.data||[]).map(recordId);return engineeringColorSubjects(doc).map(s=>s.id);}
export function engineeringCompatibility(a,b){
 if(a?.family!==b?.family)return t('工程记录的物理契约不同。','Physical engineering-record contracts differ.');
 if(a.unit!==b.unit||['name','type','url'].some(k=>a.source?.[k]!==b.source?.[k]))return t('原单位或数据来源不同。','Original units or data sources differ.');
 for(const field of['frequencyUnit','referenceImpedance','systemDomain','heightUnit','frequency','phaseConvention','calmThreshold','windSectors','speedBreaks','orders','axes'])if(JSON.stringify(a[field])!==JSON.stringify(b[field]))return t('单位、角度约定或外部工程参数改变。','Units, conventions or external engineering parameters changed.');
 const old=new Map(a.data.map(r=>[recordId(r),r]));if(old.size!==b.data.length||b.data.some(r=>!old.has(recordId(r))))return t('完整原记录集合改变。','The complete original record population changed.');
 const groups=d=>engineeringGroups(d).map(g=>groupKey(d,g.rows)).sort();if(JSON.stringify(groups(a))!==JSON.stringify(groups(b)))return t('分组或模态成员改变。','Group or mode membership changed.');
 if(a.template==='polezero'&&b.data.some(r=>old.get(recordId(r)).kind!==r.kind))return t('极点与零点含义改变。','Pole and zero meanings changed.');
 if(a.template==='phasor'&&JSON.stringify(engineeringPhasorRows(a).map(recordId))!==JSON.stringify(engineeringPhasorRows(b).map(recordId)))return t('首尾相接的相量顺序改变。','The head-to-tail phasor order changed.');
 const fixed=a.template==='smith'?'frequency':a.template==='hodograph'?'height':a.template==='campbell'?'speed':null;if(fixed&&b.data.some(r=>old.get(recordId(r))[fixed]!==r[fixed]))return t('原采样频率、转速或测量高度改变。','Original sample frequency, speed or measured height changed.');
 return'';
}
const ex=values=>extent(values.filter(Number.isFinite)),radius=rows=>Math.max(0,...rows.map(r=>Math.hypot(r.real,r.imag)));
export function engineeringBounds(doc){
 const rows=doc.data;
 if(doc.template==='smith')return{real:ex([0,...rows.map(r=>r.real)]),imag:ex([0,...rows.map(r=>r.imag)]),gamma:[-1,1]};
 if(doc.template==='polarscatter')return{radius:[0,Math.max(...rows.map(r=>r.radius))],angle:[0,360]};
 if(doc.template==='phasor'){let x=0,y=0;const chain=engineeringPhasorRows(doc).map(r=>[x+=r.real,y+=r.imag]),sum=phasor19(rows);return{real:ex([0,sum.real,...rows.map(r=>r.real),...chain.map(p=>p[0])]),imag:ex([0,sum.imag,...rows.map(r=>r.imag),...chain.map(p=>p[1])])};}
 if(['constellation','polezero'].includes(doc.template))return{real:ex([0,...rows.map(r=>r.real)]),imag:ex([0,...rows.map(r=>r.imag)]),radius:[0,Math.max(doc.systemDomain==='discrete'?1:0,radius(rows))],angle:[-180,180]};
 if(doc.template==='hodograph')return{u:ex([0,...rows.map(r=>r.u)]),v:ex([0,...rows.map(r=>r.v)]),height:ex(rows.map(r=>r.height)),speed:[0,Math.max(...rows.map(r=>Math.hypot(r.u,r.v)))]};
 if(doc.template==='windrose')return{frequency:[0,Math.max(.01,windrose19(doc).max)],speed:[0,Math.max(...rows.map(r=>r.speed))]};
 return{speed:[0,Math.max(...rows.map(r=>r.speed))],frequency:[0,Math.max(...rows.map(r=>r.frequency))],amplitude:[0,Math.max(...rows.map(r=>r.amplitude))]};
}
export function engineeringRecipe(){return{id:'engineering-native-coordinates',get name(){return t('原始工程记录连续换坐标','Continuous engineering-record coordinates');},description:t('稳定原记录与明确的派生参考分别连续移动；同单位的数据保留尺度，单位改变时不强行对应。','Stable original records and explicitly derived references move continuously; physical scales remain distinct and changed units are never forced into correspondence.')};}
export function engineeringGuide(doc,view){return[info.get(view)?.note||'',t('保留每行 _id、全部原始字段、unit、source 和参数。原值通过表格及标记编辑；派生幅值、相位、Γ 和频率摘要绝不写回原表。','Preserve every _id, original field, unit, source and parameter. Edit originals through the table and marks; derived magnitude, phase, Γ and frequency summaries never overwrite original records.'),t('相位 atan2(imag,real) 从实轴逆时针、范围 −180°–180°；方位 angle/direction 从北顺时针，两种约定不混用。零复数相位未定义，不补为 0°。','Phase atan2(imag,real) is counterclockwise from the real axis, from −180° to 180°. Bearing angle/direction is clockwise from north. These conventions are distinct, and zero-complex phase is undefined, not 0°.'),t('工程参数变化、单位或原采样位置改变时不强行连续变形。图不计算稳定性、共振判定、误码率或模态追踪。中间帧表达转换，停稳后读数。','Changed engineering parameters, units or sampling positions are not forced into a morph. No stability, resonance classification, error-rate or modal-tracking calculation occurs. Read values after the transformation settles.')];}
export function engineeringAgentGuide(english=false){return(english?'Use original FORMA engineering views: ':'使用原版 FORMA 工程视图：')+engineeringViews.map(v=>v.id).join(', ')+'\n'+(english?'Preserve _id, real/imag, group, kind, frequency, angle/radius, direction/speed, height/u/v, mode/speed/frequency/amplitude and every native metadata field: unit, source, axes, referenceImpedance, frequencyUnit, systemDomain, heightUnit, phaseConvention, phasorOrder, calmThreshold, windSectors, speedBreaks, orders. smith19 maps original Ω impedance to Γ without replacing originals. Compass bearing is north-clockwise, mathematical phase is real-axis-counterclockwise. Zero complex phase is undefined and retained on a separate strip. windrose19 includes all rows in frequency denominators; calm direction=null is retained, not imputed. phasorOrder contains each original _id once; chain vectors translate without changing components. Campbells preserve declared modes, area proportional to amplitude, zero amplitude as a cross. Keep recordId on original editable marks and populationId/recordIds on derived summaries; never invent observed rows. Use original player with persistent contours, reversible seek and interrupted-frame resume, HTML/SVG/video export.':'保留 _id、real/imag、group、kind、frequency、angle/radius、direction/speed、height/u/v、mode/speed/frequency/amplitude，以及原 unit、source、axes、referenceImpedance、frequencyUnit、systemDomain、heightUnit、phaseConvention、phasorOrder、calmThreshold、windSectors、speedBreaks、orders。smith19 把原 Ω 阻抗映射到 Γ，不覆盖原值。方位北起顺时针，数学相位实轴起逆时针；零复数相位未定义，留独立带。windrose19 所有原行计入分母，静风 direction=null 不补值。phasorOrder 每条原 _id 恰好一次，首尾相接仅平移向量。Campbell 保留输入 mode，面积正比幅值，零幅值十字。原可编辑标记用 recordId；派生摘要用 populationId/recordIds，不冒充原观测。使用原版持久轮廓、可逆定位、中断接续及 HTML/SVG/视频导出。');}
