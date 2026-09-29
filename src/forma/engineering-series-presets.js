import {getExample} from './catalog.js';
import {withRecordIds} from './data-identity.js';
import {engineeringText as t} from './engineering-series-rules.js';
const preset=(id,template,zh,en,description,english,views)=>({id,template,category:'research',get name(){return t(zh,en);},get description(){return t(description,english);},get dataNote(){return t('使用 FORMA 现有图库确定性合成原表，保留每条观测及原始单位；仅转换显示坐标。','Use the existing FORMA catalog’s deterministic synthetic originals, retaining every observation and its original unit; only display coordinates change.');},get relation(){return t('同一批工程原记录 · 参数明确','Same original engineering records · explicit parameters');},views});
export const engineeringPresets=[
 preset('engineering-impedance-story','smith','阻抗与反射系数','Impedance and reflection coefficient','原始电阻/电抗轨迹连续收进史密斯网格，参考阻抗 50 Ω 保持明确。','The original resistance/reactance locus moves continuously into the Smith grid with explicit 50 Ω reference impedance.',['engineering-impedance','engineering-smith']),
 preset('engineering-bearing-story','polarscatter','方向观测连续展开','Directional observations unfold','极坐标样本连续展开为原始方位角与径向量，北起顺时针约定保持一致。','Polar samples unfold into original bearing and radial quantity while preserving the north-clockwise convention.',['engineering-polar','engineering-bearing-radius']),
 preset('engineering-phasor-story','phasor','同频相量首尾相接','Same-frequency phasors join head to tail','同原点相量仅平移为首尾相接向量链，合成向量始终不变。','Translate common-origin phasors into a head-to-tail vector chain while keeping the resultant unchanged.',['engineering-phasor','engineering-phasor-chain']),
 preset('engineering-symbol-story','constellation','符号散布与幅相','Symbol scatter and magnitude–phase','I/Q 原观测连续移动到幅相坐标，不吸附理想点、不做误差率估算。','Original I/Q observations move continuously to magnitude–phase coordinates without snapping or error-rate estimates.',['engineering-iq','engineering-symbol-polar']),
 preset('engineering-root-story','polezero','零极点换坐标','Poles and zeros change coordinates','完整外部根表从复平面移动到模与辐角，极零含义、重复根和原值保持不变。','The complete external root table moves from the complex plane to modulus–argument coordinates, retaining kinds, repeated roots and originals.',['engineering-polezero','engineering-root-polar']),
 preset('engineering-height-story','hodograph','风矢量与高度风速','Wind vectors and speed by height','实测风矢量轨迹连续拉开为高度风速廓线，颜色继续对应原始测量高度。','Measured wind vectors unfold into a height–speed profile; colors continue to represent original measured height.',['engineering-hodograph','engineering-height-speed']),
 preset('engineering-wind-story','windrose','风频玫瑰展开','Wind-frequency rose unfolds','方向与速度段的同一频率摘要连续展开，全部静风与非静风原记录均保留。','The same direction/speed-bin frequency summaries unfold continuously while retaining all calm and noncalm observations.',['engineering-windrose','engineering-wind-sectors']),
 preset('engineering-rotor-story','campbell','转速、模态与幅值','Speed, modes and amplitude','同一外部模态采样从频率与幅值面积移动到原幅值曲线，阶次参考线有明确含义。','The same supplied mode samples move from frequency with amplitude area to original-amplitude curves, with explicit order references.',['engineering-campbell','engineering-speed-amplitude'])
];
export function engineeringRecords(id,palette='ink'){
 const preset=engineeringPresets.find(p=>p.id===id);if(!preset)return null;
 const source=getExample(preset.template);source.title=preset.name;source.subtitle=preset.relation;source.source={name:t('FORMA 工程场景 · 合成数据','FORMA engineering scenarios · synthetic data'),type:'demo'};const doc=withRecordIds(source,{legacyNamespace:'scenario:'+id});if(doc.template==='phasor')doc.phasorOrder=doc.data.map(r=>r._id);
 return preset.views.map(view=>({doc:structuredClone(doc),view,dataGroup:'scenario:'+id,relation:'auto',scale:'shared',options:{palette}}));
}
