import {catalog,getExample} from './catalog.js';
import {chartUseCases} from './chart-use-cases.js';
import {suggestMapping,importedTableDocument,splitTable,parseTable} from './table-data.js';
import {validateDocument} from './data.js';
// Editorial order favours readable default encodings. Validators, not scores,
// decide whether a table is structurally usable. Meaning remains user supplied.
const preferred=['bar','column','singleline','tide','smallmultiples','donut','stackedbar','swarm','boxplot','raincloud','xy','splom','interval','ribbon','paired','dumbbell','alluvial','choropleth','geomap','imr','progress','gantt','eventline','acf','residual'];
export function recommendForTask({goal='all',table,limit=4}={}){
 const entries=catalog.filter(t=>goal==='all'||chartUseCases[t.id].goal===goal).map(t=>{
  const use=chartUseCases[t.id],order=preferred.indexOf(t.id);let mapping,errors=[],status='example';
  if(table){
   mapping=suggestMapping(table.headers,table.rows,t.fields);
   if(mapping.includes(-1)){status='mapping';}
   else{try{const {doc}=importedTableDocument(getExample(t.id),table,mapping);doc.source={type:'user',name:'Imported table'};const report=validateDocument(doc);errors=report.errors;status=report.valid?'compatible':'incompatible';}catch(e){errors=[e.message];status='incompatible';}}
  }
  return {id:t.id,fields:t.fields,use,mapping,status,errors,order:order<0?100:order};
 });
 const rank={compatible:0,example:1,mapping:2,incompatible:3};
 return entries.sort((a,b)=>rank[a.status]-rank[b.status]||a.order-b.order).slice(0,limit);
}
export function taskTable(text){return splitTable(parseTable(text),true);}
