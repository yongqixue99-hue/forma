import {uiText} from './locale.js';
import {catalog} from './catalog.js';
import {chartUseCases} from './chart-use-cases.js';
import {getDataGuide} from './data-guides.js';
import {suggestMapping,importedTableDocument,splitTable,parseTable,readCell,cellsToDocument} from './table-data.js';
import {validateDocument} from './data.js';
// Scores only order explanations. Actual field and layout validators decide
// usability, and no fitted statistic or analysis setting comes from a demo.
const preferred=['bar','column','singleline','tide','smallmultiples','donut','stackedbar','swarm','boxplot','raincloud','xy','splom','interval','ribbon','paired','dumbbell','alluvial','choropleth','geomap','imr','progress','gantt','eventline','acf','residual'];
export function tableProfile(table){
 const columns=table.headers.map((name,col)=>{const values=table.rows.map(row=>String(row[col]??'')),present=values.filter(v=>v.trim()),numbers=present.length>0&&present.every(v=>Number.isFinite(readCell(v,'number'))),dates=!numbers&&present.length>0&&present.every(v=>/^\d{4}-\d{2}(-\d{2})?$/.test(v)&&Number.isFinite(Date.parse(v.length===7?v+'-01':v))&&new Date(v.length===7?v+'-01':v).toISOString().slice(0,v.length)===v);return{name,col,kind:numbers?'number':dates?'date':'text',missing:values.length-present.length,distinct:new Set(present).size};});
 return {rows:table.rows.length,columns,numbers:columns.filter(c=>c.kind==='number').length,dates:columns.filter(c=>c.kind==='date').length,texts:columns.filter(c=>c.kind==='text').length,missing:columns.reduce((n,c)=>n+c.missing,0)};
}
export function taskChartDocument(id,table,mapping,{metadata={}}={}){
 const fields=catalog.find(t=>t.id===id).fields,parameters=getDataGuide(id).parameters,base={version:1,template:id,title:metadata.title||uiText('我的数据'),subtitle:metadata.subtitle||'',unit:metadata.unit||uiText('数值'),source:{type:'user',name:metadata.source||uiText('粘贴的数据')},data:[]};
 // Axis labels can come from real column names, never example measurements.
 if(parameters.some(p=>p.key==='axes')&&fields.some(f=>f[0]==='x')&&fields.some(f=>f[0]==='y'))base.axes=Object.fromEntries(fields.flatMap((f,i)=>['x','y','z','size'].includes(f[0])?[[f[0],table.headers[mapping[i]]]]:[]));
 const missingParameters=parameters.filter(p=>p.key!=='axes'||!base.axes).map(({key,label})=>({key,label}));
 const {doc,cells}=importedTableDocument(base,table,mapping);return{doc,missingParameters,fieldErrors:cellsToDocument(doc,cells,doc.data).errors};
}
export function recommendForTask({goal='all',table,limit=4,metadata}={}){
 const entries=catalog.filter(t=>goal==='all'||chartUseCases[t.id].goal===goal).map(t=>{
  const use=chartUseCases[t.id],order=preferred.indexOf(t.id);let mapping,doc,errors=[],missingParameters=[],status='example';
  if(table){
   mapping=suggestMapping(table.headers,table.rows,t.fields);
   if(mapping.includes(-1)){status='mapping';}
   else{try{const built=taskChartDocument(t.id,table,mapping,{metadata});doc=built.doc;missingParameters=built.missingParameters;const report=validateDocument(doc);errors=built.fieldErrors.length?built.fieldErrors.map(e=>e.message):report.errors;status=built.fieldErrors.length?'incompatible':missingParameters.length?'parameters':report.valid?'compatible':'incompatible';}catch(e){errors=[e.message];status='incompatible';}}
  }
  return {id:t.id,fields:t.fields,use,mapping,doc,status,errors,missingParameters,order:order<0?100:order};
 });
 const rank={compatible:0,example:1,parameters:2,mapping:3,incompatible:4};
 return entries.sort((a,b)=>rank[a.status]-rank[b.status]||a.order-b.order).slice(0,limit);
}
export function taskTable(text,{header=true,delimiter}={}){return splitTable(parseTable(text,{delimiter}),header);}
