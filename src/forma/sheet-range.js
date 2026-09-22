import {uiText,uiMarkup,uiMessage} from './locale.js';
// Range operations are independent of pagination and commit as one history entry.
export function cellRange(anchor, end = anchor) {
  return {top:Math.min(anchor.row,end.row),bottom:Math.max(anchor.row,end.row),left:Math.min(anchor.col,end.col),right:Math.max(anchor.col,end.col)};
}
export function rangeMatrix(cells, range) {
  return cells.slice(range.top,range.bottom+1).map(row=>row.slice(range.left,range.right+1));
}
export function toClipboardTSV(matrix) {
  return matrix.map(row=>row.map(value=>{
    const text=String(value??'');
    return /[\t\r\n"]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
  }).join('\t')).join('\n');
}
export function checkedRange(range,cells) {
  const {top,bottom,left,right}=range;
  if(![top,bottom,left,right].every(Number.isInteger)||top<0||bottom<top||left<0||right<left||bottom>=cells.length||right>=cells[0]?.length)throw new Error(uiText('请先选择表格中的单元格。'));
  return range;
}
