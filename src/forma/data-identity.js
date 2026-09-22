import {withEntityIds} from './entity-identity.js';
// IDs travel with records. Names and spreadsheet addresses are presentation only.
export const recordId=row=>row._id??row.label;
export const newRecordId=()=>`r:${globalThis.crypto.randomUUID()}`;

export function withRecordIds(input,{legacyNamespace}={}){
  const doc=structuredClone(input),seen=new Set(),occurrences=new Map();
  doc.data=doc.data.map(row=>{
    let id=row._id;
    if(id!==undefined&&(typeof id!=='string'||!id||seen.has(id)))throw new Error('记录 ID 无效或重复；请核对导入的 ID 列，不会自动替换身份。');
    if(id===undefined){
      if(legacyNamespace){
        // One-time migration of an explicitly related legacy data group.
        // Subsequent edits preserve this stored ID, including name/value changes.
        const natural=row.label??row.period??row.date??row.sample??JSON.stringify([row.group,row.value]);
        const token=JSON.stringify([row.parent??'',row.series??row.model??row.variable??row.actual??'',row.predicted??'',natural]),n=occurrences.get(token)||0;
        occurrences.set(token,n+1);id=`legacy:${JSON.stringify([legacyNamespace,token,n])}`;
      }else id=newRecordId();
    }
    seen.add(id);return {...row,_id:id};
  });
  return withEntityIds(doc,{legacyNamespace});
}

// Derived marks represent a population, not a display name. Exact sorted IDs
// avoid collisions and make renamed/reordered populations correspond. A changed
// population gets a different identity; this is not a persistent group registry.
export const populationId=(kind,rows)=>JSON.stringify([kind,rows.map(recordId).sort()]);
