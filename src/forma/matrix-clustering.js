import {cluster10} from './volume10-data.js';
import {populationId} from './data-identity.js';

// Sort by persisted member IDs before resolving equal distances. Neither a
// display-name change nor a spreadsheet row reorder changes a tied tree.
export function clusterNumericMatrix(rows){
  const grouped=(field,kind)=>[...new Set(rows.map(r=>r[field]))].map(name=>({name,id:populationId(kind,rows.filter(r=>r[field]===name))})).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  const rowItems=grouped('rowName','matrix-row'),columnItems=grouped('column','matrix-column'),lookup=new Map(rows.map(r=>[JSON.stringify([r.rowName,r.column]),r]));
  if(rowItems.length<2||columnItems.length<2||rows.length!==rowItems.length*columnItems.length||rows.some(r=>!Number.isFinite(r.value)))return null;
  const values=rowItems.map(a=>columnItems.map(b=>lookup.get(JSON.stringify([a.name,b.name]))?.value));
  if(values.some(v=>v.some(x=>!Number.isFinite(x))))return null;
  const rowTree=cluster10(values),columnTree=cluster10(columnItems.map((_,j)=>values.map(r=>r[j])));
  return {rowItems,columnItems,rowTree,columnTree,rowNames:rowTree.indices.map(i=>rowItems[i].name),columns:columnTree.indices.map(i=>columnItems[i].name)};
}
