import {workbookNotes} from './workbook-notes.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import {read,utils,SSF} from 'xlsx';

export function readWorkbook(bytes){
  const data=new Uint8Array(bytes);
  if(data.length>8*1024*1024)throw new Error(uiText('Excel 文件请控制在 8 MB 以内。'));
  if(data[0]!==80||data[1]!==75)throw new Error(uiText('需要有效的 .xlsx 工作簿，不支持加密文件或改后缀的 CSV。'));
  return read(data,{type:'array',cellFormula:true,cellNF:true,cellStyles:true,cellText:false,cellHTML:false,bookVBA:false});
}
export function workbookSheets(book){return book.SheetNames.map((name,i)=>({name,range:book.Sheets[name]['!ref']||'',hidden:!!book.Workbook?.Sheets?.[i]?.Hidden}));}
export function workbookRange(book,sheet,range){
  const ws=book.Sheets[sheet];if(!ws)throw new Error(uiText('工作表不存在。'));
  const text=String(range||'').trim().toUpperCase().replaceAll('$','');
  if(!/^[A-Z]{1,3}[1-9]\d{0,6}(:[A-Z]{1,3}[1-9]\d{0,6})?$/.test(text))throw new Error(uiText('请填写单元格范围，例如 A1:D30。'));
  const area=utils.decode_range(text),height=area.e.r-area.s.r+1,width=area.e.c-area.s.c+1;
  if(height<1||width<1||area.e.r>=1048576||area.e.c>=16384)throw new Error(uiText('范围无效，请按左上角到右下角填写。'));
  if(height>1501||width>32)throw new Error(uiText('一次选择最多 1,501 行（含表头）、32 列。请选择更小范围，未选区域不会被导入。'));
  const overlap=a=>a.s.r<=area.e.r&&a.e.r>=area.s.r&&a.s.c<=area.e.c&&a.e.c>=area.s.c;
  if((ws['!merges']||[]).some(overlap))throw new Error(uiText('选区包含合并单元格。请在 Excel 中取消合并，或选择不含合并标题的数据范围。'));
  const matrix=[],locations=[],issues=[];let formulas=0,hiddenRows=0;
  for(let r=area.s.r;r<=area.e.r;r++){
    const row=[],refs=[];if(ws['!rows']?.[r]?.hidden)hiddenRows++;
    for(let c=area.s.c;c<=area.e.c;c++){
      const address=utils.encode_cell({r,c}),cell=ws[address];let value='';
      if(cell?.f)formulas++;
      if(cell?.t==='e'||(cell?.f&&(cell.v===undefined||cell.v===null))){
        value=cell.t==='e'?'#EXCEL_ERROR':'#FORMULA_NO_RESULT';issues.push({row:r-area.s.r,col:c-area.s.c,address,message:cell.t==='e'?uiText('Excel 错误值，请修正后重新导入或在此填写真实结果。'):uiText('公式没有已保存的计算结果；请在 Excel 重新计算并保存，或填写真实结果。')});
      }else if(cell?.v!==undefined&&cell.v!==null){
        if(cell.t==='n'&&cell.z&&SSF.is_date(cell.z)){
          const date=SSF.parse_date_code(cell.v,{date1904:!!book.Workbook?.WBProps?.date1904});
          if(!date||date.y===1900&&date.m===2&&date.d===29){value='#INVALID_DATE';issues.push({row:r-area.s.r,col:c-area.s.c,address,message:uiText('Excel 日期无法转换为真实日历日期。')});}
          else{const pad=n=>String(n).padStart(2,'0');value=`${date.y}-${pad(date.m)}-${pad(date.d)}`;if(date.H||date.M||date.S||date.u)value+=`T${pad(date.H)}:${pad(date.M)}:${pad(date.S)}${date.u?String(Number(date.u.toFixed(6))).slice(1):''}`;}
        }else if(cell.t==='n'&&/^0{2,}$/.test(cell.z||''))value=SSF.format(cell.z,cell.v);
        else value=String(cell.v); // Full numeric value: do not round by display formatting or turn 15% into 15.
      }
      row.push(value);refs.push(`${sheet}!${address}`);
    }matrix.push(row);locations.push(refs);
  }
  const origin={sheet,range:text,...(hiddenRows?{hiddenRowCount:hiddenRows}:{}),...(formulas?{formulaCount:formulas,formulaPolicy:'cached-results-only'}:{})};
  return {matrix,locations,issues,origin,notes:workbookNotes(origin)};
}
