// Compare chart data independently of newly added, persisted record IDs.
// Dedicated identity tests verify IDs through rename, reorder, undo and export.
export function payload(value){
  if(Array.isArray(value))return value.map(payload);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!['_id','_sampleId','_modelId','_variableId','_seriesId','_parentId','entities'].includes(k)).map(([k,v])=>[k,payload(v)]));
  return value;
}
