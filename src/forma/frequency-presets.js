import {getExample} from './catalog.js';
import {withRecordIds} from './data-identity.js';
import {frequencyText as t} from './frequency-rules.js';
export const frequencyPresets=[{id:'frequency-response',get name(){return t('频率响应三视图','Three views of frequency response');},category:'research',get description(){return t('幅相双面板合流为复平面，再转入增益相位轨迹；相同采样点及连线连续移动。','Magnitude and phase panels meet on the complex plane, then move to gain–phase coordinates. The same samples and links move continuously.');},get dataNote(){return t('同一组原始正频率复响应，保留全部采样和单位；不拟合、不补负频率、不推断稳定性。','One set of original positive-frequency complex responses, preserving all samples and units. No fitting, negative-frequency synthesis or stability inference.');},get relation(){return t('同一复响应 · 三种坐标表示','One complex response · Three coordinate views');},views:['freq-bode','freq-nyquist','freq-nichols']}];
export function frequencyRecords(id,palette='ink'){
 const preset=frequencyPresets.find(p=>p.id===id);if(!preset)return null;
 const doc=withRecordIds(getExample('bode'),{legacyNamespace:`scenario:${id}`});doc.title=t('同一频响的连续流转','One frequency response in motion');doc.subtitle=t('幅相 · 复平面 · 增益相位','Magnitude/phase · Complex plane · Gain/phase');doc.source={name:t('FORMA 场景演示 · 合成数据','FORMA scenario demonstration · Synthetic data'),type:'demo'};
 return preset.views.map(view=>({doc:structuredClone(doc),view,dataGroup:`scenario:${id}`,relation:'auto',scale:'shared',options:{palette}}));
}
