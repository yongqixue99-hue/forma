import {uiText,uiMessage} from './locale.js';
export const requiresFormulaReview=source=>Number(source?.origin?.formulaCount)>0||source?.origin?.formulaPolicy==='cached-results-only';
export function workbookNotes(origin={}){
 return [...(origin.formulaCount?[uiMessage`${origin.formulaCount} 个公式按文件中已保存的结果读取，不执行公式或刷新外部链接。`]:[]),...(origin.hiddenRowCount?[uiMessage`选区内 ${origin.hiddenRowCount} 个隐藏行也完整导入。`]:[]),uiText('百分比读取底层比例（15% 为 0.15）；日期转为 ISO 日期，数字保留原始精度。')];
}
