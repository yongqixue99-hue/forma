import {resolveCountry} from './country-input.js';
import {isEnglish} from './locale.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import {entityReferences} from './entity-identity.js';
import {fieldLabel,fieldProblem,recordProblems} from './data-contract.js';
import {entityProblems,withEntityIds} from './entity-identity.js';
import {newRecordId} from './data-identity.js';
import { findTemplate } from './catalog.js';

export const TABLE_LIMIT = 1500;
const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
export function readCell(value, type) {
  const text = String(value ?? '').trim();
  if (!type.includes('number')) return text;
  if (!text) return type.includes('null') ? null : NaN;
  const normalized = /^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(text) ? text.replaceAll(',', '') : text;
  return numeric.test(normalized) ? Number(normalized) : NaN;
}

// Excel clipboard TSV and quoted CSV share the same escaping rules.
export function parseTable(text, {delimiter:explicitDelimiter,preserveEmpty=true} = {}) {
  if (typeof text !== 'string' || text.length > 2000000) throw new Error(uiText('表格请控制在 2 MB 以内。'));
  text = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!text.trim()&&!preserveEmpty) throw new Error(uiText('请先粘贴表格内容。'));
  let quoted = false, tabs = 0, commas = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') { if (quoted && text[i+1] === '"') i++; else quoted = !quoted; }
    else if (!quoted) { if (text[i] === '\n') break; if (text[i] === '\t') tabs++; if (text[i] === ',') commas++; }
  }
  const delimiter = explicitDelimiter ?? (tabs ? '\t' : ',');
  if(!['\t',','].includes(delimiter))throw new Error(uiText('不支持这个分隔符。'));
  const rows = []; let row = [], cell = '', inQuote = false, closed = false;
  const pushCell = () => { row.push(cell); cell = ''; closed = false; if (row.length > 32) throw new Error(uiText('一次最多导入 32 列。')); };
  const pushRow = () => { pushCell(); rows.push(row); row = []; if (rows.length > TABLE_LIMIT + 1) throw new Error(uiText('单张图最多接收 1,500 条记录。')); };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) { if (c === '"') { if (text[i+1] === '"') { cell += '"'; i++; } else { inQuote = false; closed = true; } } else cell += c; }
    else if (c === delimiter) pushCell();
    else if (c === '\n') pushRow();
    else if (c === '"' && !cell && !closed) inQuote = true;
    else { if (closed || c === '"') throw new Error(uiText('引号格式有误，请重新复制完整单元格区域。')); cell += c; }
  }
  if (inQuote) throw new Error(uiText('引号没有闭合，请重新复制完整表格。'));
  if (cell || row.length || closed || (!rows.length&&preserveEmpty)) pushRow();
  while (!preserveEmpty&&rows.length && rows.at(-1).every(v => !v.trim())) rows.pop();
  if (!rows.length) throw new Error(uiText('表格中没有数据。'));
  const width = Math.max(...rows.map(r => r.length));
  return rows.map(r => Array.from({ length: width }, (_, i) => r[i] ?? ''));
}

export function splitTable(matrix, header = true) {
  const headers = header ? matrix[0].map(String) : matrix[0].map((_,i) => uiMessage`第 ${i+1} 列`);
  const rows = matrix.slice(header ? 1 : 0);
  if (!rows.length) throw new Error(uiText('只有列名，没有数据行。可取消「首行是列名」。'));
  if (rows.length > TABLE_LIMIT) throw new Error(uiText('单张图最多接收 1,500 条记录。'));
  return { headers, rows };
}
const aliases = {
  label:['名称','类别','项目','渠道','月份','地区','样本'], period:['时间','时期','月份','日期','季度','年份'], value:['数值','值','销量','销售额','数量','金额'],
  series:['系列','序列'], group:['组别','分组','组'], target:['目标'], previous:['上期'], metricUnit:['单位'],
  before:['之前','前值'], after:['之后','后值'], x:['x','横轴'], y:['y','纵轴'], z:['z'], date:['日期'],
};
export function suggestMapping(headers, rows, fields) {
  const norm = s => s.toLowerCase().replace(/\s+/g, '');
  const used = new Set();
  const mapping = fields.map(([name,,desc]) => {
    const words = [name, desc, ...(aliases[name] || [])].filter(Boolean).map(norm);
    const index = headers.findIndex((h,i) => !used.has(i) && words.includes(norm(h)));
    if (index >= 0) used.add(index); return index;
  });
  fields.forEach(([,type], f) => {
    if (mapping[f] >= 0) return;
    const remaining = headers.map((_,i) => i).filter(i => !used.has(i));
    const compatible = remaining.filter(i => {
      const values = rows.slice(0,40).map(r => r[i]).filter(v => v.trim());
      const isNumber = values.length && values.every(v => Number.isFinite(readCell(v, 'number')));
      return type.includes('number') ? isNumber : !isNumber;
    });
    if (compatible.length === 1) { mapping[f] = compatible[0]; used.add(compatible[0]); }
  });
  return mapping;
}
export function mapTable(table, mapping, fields) {
  if (mapping.length !== fields.length || mapping.some(i => !Number.isInteger(i) || i < 0 || i >= table.headers.length)) throw new Error(uiText('请为每个图表字段选择对应列。'));
  if (new Set(mapping).size !== mapping.length) throw new Error(uiText('同一列不能同时映射到两个字段，请检查对应关系。'));
  return table.rows.map(row => fields.map((_,i) => row[mapping[i]] ?? ''));
}
export function importedTableDocument(original,table,mapping,{idColumn=-1}={}){
  const fields=findTemplate(original.template).fields,cells=mapTable(table,mapping,fields);
  if(idColumn!==-1&&(!Number.isInteger(idColumn)||idColumn<0||idColumn>=table.headers.length))throw new Error(uiText('记录 ID 对应列无效。'));
  const ids=table.rows.map(r=>idColumn<0?newRecordId():r[idColumn]);
  if(ids.some(id=>!id?.trim())||new Set(ids).size!==ids.length)throw new Error(uiText('记录 ID 必须填写且不能重复，请检查对应列。'));
  const rows=table.rows.map((r,i)=>({_id:ids[i],_extra:Object.fromEntries(r.flatMap((value,c)=>mapping.includes(c)?[]:[[c,value]]))}));
  const meta={...structuredClone(original),provenance:{origin:'import'},tableInput:{headers:[...table.headers],fieldColumns:Object.fromEntries(fields.map(([key],i)=>[key,mapping[i]])),idColumn},source:{type:'user',name:original.source.type==='demo'?'':original.source.name},data:rows};
  if(table.headerRefs)meta.tableInput.headerRefs=[...table.headerRefs];
  if(table.origin)meta.tableInput.origin=structuredClone(table.origin);
  if(table.locations)meta.tableInput.rowRefs=Object.fromEntries(rows.map((row,i)=>[row._id,[...table.locations[i]]]));
  delete meta.entities;
  if(meta.template==='splom'){delete meta.sampleEntities;delete meta.selectedPair;delete meta.variableUnits;}
  return {doc:withEntityIds(cellsToDocument(meta,cells,rows).doc),cells};
}
export const documentCells = doc => doc.data.map(row => findTemplate(doc.template).fields.map(([key]) => row[key] == null ? '' : String(row[key])));
export function cellsToDocument(doc, cells, rowMeta=doc.data) {
  const fields = findTemplate(doc.template).fields;
  const result = structuredClone(doc), errors = [];
  if (cells.length > TABLE_LIMIT) throw new Error(uiText('单张图最多接收 1,500 条记录。'));
  result.data = cells.map((row,r) => ({...(rowMeta?.[r]?Object.fromEntries(Object.entries(rowMeta[r]).filter(([key])=>['_id','_extra',...entityReferences].includes(key))):{}),...Object.fromEntries(fields.map(([key,type,desc],c) => {
    const value = readCell(row[c], type);
    const problem=doc.template==='choropleth'&&key==='code'&&!resolveCountry(value)
      ?(isEnglish()?' must be a supported map region. Type a country name or code and choose a match.':'需要填写底图支持的地区。输入国家名称或代码并选择匹配项。')
      :fieldProblem(value,type,{doc,key});
    if(problem){const sourceColumn=doc.tableInput?.fieldColumns?.[key],header=Number.isInteger(sourceColumn)?doc.tableInput.headers?.[sourceColumn]:undefined;errors.push({row:r,col:c,message:uiMessage`第 ${r+1} 行「${header??fieldLabel([key,type,desc],doc.template)}」${problem}`});}
    return [key, value];
  }))}));
  if(doc.template==='choropleth'){
    const seen=new Map();for(const [row,record] of result.data.entries()){
      if(seen.has(record.code))errors.push({row,col:0,message:isEnglish()?`Region ${record.code} is already used in row ${seen.get(record.code)+1}. Each region needs one value.`:`地区 ${record.code} 已在第 ${seen.get(record.code)+1} 行使用；每个地区只能填写一个值。`});
      else seen.set(record.code,row);
    }
  }
  errors.push(...recordProblems(result,fields).map(e=>({...e,message:uiMessage`第 ${e.row+1} 行：${e.message}`})));
  errors.push(...entityProblems(result).filter(e=>e.row!==undefined).map(e=>({row:e.row,col:fields.findIndex(f=>f[0]===e.field),message:uiMessage`第 ${e.row+1} 行：${e.message}`})));
  return { doc:result, errors };
}
export function pasteCells(cells, matrix, row, col, width) {
  if(!Number.isInteger(row)||row<0||!Number.isInteger(col)||col<0||!Array.isArray(matrix)||!matrix.length||!Array.isArray(matrix[0])||!matrix[0].length||matrix.some(line=>!Array.isArray(line)||line.length!==matrix[0].length))throw new Error(uiText('请粘贴完整的矩形单元格区域。'));
  if (row + matrix.length > TABLE_LIMIT) throw new Error(uiText('粘贴后超出 1,500 条记录。'));
  if (col + matrix[0].length > width) throw new Error(uiMessage`当前图表有 ${width} 个数据字段，粘贴区域超出列数。请选择合适的起始格，或用「导入表格」匹配所需列。`);
  const next = structuredClone(cells);
  matrix.forEach((line,r) => { while (next.length <= row+r) next.push(Array(width).fill('')); line.forEach((v,c) => next[row+r][col+c] = v); });
  return next;
}
export function tableHistory(initial, session) {
  let past = structuredClone(session?.past||[]), future = structuredClone(session?.future||[]), current = structuredClone(initial);
  return {
    snapshot(){return structuredClone({current,past,future});},
    get value() { return structuredClone(current); }, get canUndo() { return !!past.length; }, get canRedo() { return !!future.length; },
    set(next) { if (JSON.stringify(next) === JSON.stringify(current)) return; past.push(current); while(past.length > 20 || (past.length > 1 && JSON.stringify(past).length > 2000000)) past.shift(); current = structuredClone(next); future = []; },
    undo() { if (past.length) { future.push(current); current = past.pop(); } return this.value; },
    redo() { if (future.length) { past.push(current); current = future.pop(); } return this.value; },
  };
}
