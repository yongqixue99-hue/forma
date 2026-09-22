import {uiText,uiMarkup,uiMessage} from './locale.js';
import {findTemplate} from './catalog.js';
import {documentCells,cellsToDocument,pasteCells,TABLE_LIMIT} from './table-data.js';
import {bindEntitySnapshot} from './entity-identity.js';
export const columnLetter=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
export function checkedSource(source){
  const matrix=source.matrix;if(!Array.isArray(matrix)||!matrix.length||!matrix[0]?.length||matrix.length>TABLE_LIMIT+1||matrix[0].length>32||matrix.some(r=>!Array.isArray(r)||r.length!==matrix[0].length||r.some(v=>typeof v!=='string')))throw new Error(uiText('请选择完整矩形区域，最多 1,501 行（含表头）、32 列。'));return source;
}
export function textSource(matrix,origin={kind:'paste'}){checkedSource({matrix});return {matrix,locations:matrix.map((r,i)=>r.map((_,j)=>`${columnLetter(j)}${i+1}`)),issues:[],notes:[],origin};}
export function transformSource(source,kind,columns=[]){
  checkedSource(source);const m=source.matrix,l=source.locations;let matrix,locations;
  if(kind==='transpose'){matrix=m[0].map((_,c)=>m.map(row=>row[c]));locations=m[0].map((_,c)=>l.map(row=>row[c]));}
  else if(kind==='long'){
    if(!columns.length||columns.some(c=>!Number.isInteger(c)||c<0||c>=m[0].length)||new Set(columns).size!==columns.length)throw new Error(uiText('请选择需要展开成多行的数值列。'));
    const keep=m[0].map((_,i)=>i).filter(i=>!columns.includes(i));if(!keep.length)throw new Error(uiText('至少保留一列作为对象或时期。'));
    if((m.length-1)*columns.length>TABLE_LIMIT)throw new Error(uiText('展开后超过 1,500 行，请先缩小选区；没有删除任何行。'));
    matrix=[[...keep.map(c=>m[0][c]),'series','value']];locations=[[...keep.map(c=>l[0][c]),'', '']];
    for(let r=1;r<m.length;r++)for(const c of columns){matrix.push([...keep.map(k=>m[r][k]),m[0][c],m[r][c]]);locations.push([...keep.map(k=>l[r][k]),l[0][c],l[r][c]]);}
  }else if(kind==='matrix'){
    if(m.length<3||m[0].length<3)throw new Error(uiText('矩阵需要首行列类别、首列行类别以及至少 2 × 2 个数值。'));
    if((m.length-1)*(m[0].length-1)>TABLE_LIMIT)throw new Error(uiText('矩阵展开后超过 1,500 行，请缩小选区。'));
    matrix=[['actual','predicted','count']];locations=[['','','']];for(let r=1;r<m.length;r++)for(let c=1;c<m[0].length;c++){matrix.push([m[r][0],m[0][c],m[r][c]]);locations.push([l[r][0],l[0][c],l[r][c]]);}
  }else throw new Error(uiText('未知的数据转换。'));
  const issues=[];for(let r=0;r<locations.length;r++)for(let c=0;c<locations[r].length;c++){const issue=source.issues?.find(i=>source.locations[i.row]?.[i.col]===locations[r][c]);if(issue)issues.push({...issue,row:r,col:c});}
  return checkedSource({...source,matrix,locations,issues,origin:{...source.origin,transforms:[...(source.origin.transforms||[]),{kind,columns}]}});
}
export function sourceFromDocument(doc,snapshot){
  const fields=findTemplate(doc.template).fields,meta=snapshot?.meta||doc,cells=snapshot?.cells||documentCells(doc),rows=snapshot?.rowMeta||doc.data;
  const headers=meta.tableInput?.headers||fields.map(f=>f[2]||f[0]),mapping=meta.tableInput?.fieldColumns||Object.fromEntries(fields.map((f,i)=>[f[0],i]));
  const matrix=[headers.map(String),...cells.map((values,r)=>headers.map((_,c)=>{const field=fields.findIndex(f=>mapping[f[0]]===c);return field<0?String(rows[r]?._extra?.[c]??''):values[field];}))];
  const locations=[meta.tableInput?.headerRefs||headers.map((_,i)=>columnLetter(i)+'1'),...rows.map((row,r)=>headers.map((_,c)=>meta.tableInput?.rowRefs?.[row._id]?.[c]||`${columnLetter(c)}${r+2}`))];
  return {matrix,locations,issues:[],notes:[],origin:meta.tableInput?.origin||{kind:'current'},mapping:fields.map(f=>mapping[f[0]])};
}
export function replaceSourceCells(doc,source,mapping,snapshot){
  const fields=findTemplate(doc.template).fields,rows=source.matrix.slice(1);
  if(rows.length!==(snapshot?.cells||doc.data).length)throw new Error(uiText('编辑现有原表时保留行数；增删记录请使用数据表。'));
  const next=snapshot?structuredClone(snapshot):{meta:{...structuredClone(doc),data:[]},rowMeta:structuredClone(doc.data),cells:documentCells(doc)};
  next.cells=rows.map(row=>fields.map((_,i)=>row[mapping[i]]));
  const previous=sourceFromDocument(doc,snapshot).matrix;
  next.rowMeta.forEach((row,r)=>{const idColumn=doc.tableInput?.idColumn??-1;if(idColumn>=0&&rows[r][idColumn]!==previous[r+1][idColumn])throw new Error(uiText('记录 ID 是稳定身份，不能在原表中直接改写；新对象请重新导入。'));row._extra=Object.fromEntries(rows[r].flatMap((v,c)=>mapping.includes(c)?[]:[[c,v]]));});
  next.meta.tableInput={...next.meta.tableInput,headers:[...source.matrix[0]],fieldColumns:Object.fromEntries(fields.map(([key],i)=>[key,mapping[i]]))};
  bindEntitySnapshot(next,fields);return cellsToDocument(next.meta,next.cells,next.rowMeta);
}
export function overwriteSource(doc,source,header,anchor,snapshot){
  const fields=findTemplate(doc.template).fields,cells=pasteCells(snapshot?.cells||documentCells(doc),source.matrix.slice(header?1:0),anchor.row,anchor.col,fields.length);
  const next={meta:structuredClone(snapshot?.meta||doc),rowMeta:structuredClone(snapshot?.rowMeta||doc.data),cells};
  next.rowMeta=cells.map((_,i)=>next.rowMeta[i]||{});bindEntitySnapshot(next,fields);return cellsToDocument(next.meta,cells,next.rowMeta);
}

export function pasteSource(source,matrix,row,col,{fixedRows=false}={}){
  checkedSource(source);checkedSource({matrix});
  if(row<0||col<0||!Number.isInteger(row)||!Number.isInteger(col)||col+matrix[0].length>source.matrix[0].length||row+matrix.length>(fixedRows?source.matrix.length:TABLE_LIMIT+1))throw new Error(uiText('粘贴范围超出原表边界，请缩小区域或重新选择数据范围；本次未修改。'));
  const next=structuredClone(source);
  while(next.matrix.length<row+matrix.length){next.matrix.push(Array(source.matrix[0].length).fill(''));next.locations.push(source.matrix[0].map((_,c)=>uiMessage`新增 ${columnLetter(c)}${next.matrix.length}`));}
  matrix.forEach((values,r)=>values.forEach((value,c)=>{next.matrix[row+r][col+c]=value;}));
  next.issues=next.issues.filter(i=>i.row<row||i.row>=row+matrix.length||i.col<col||i.col>=col+matrix[0].length);
  return next;
}
