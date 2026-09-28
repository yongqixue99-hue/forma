import {uiText,uiMarkup,uiMessage} from './locale.js';
// Persistent entities are separate from observation IDs and display names.
// Names are consulted only for a one-time legacy migration or explicit sheet
// assignment. Rename, replacement and merge are different editor operations.
const specs={model:{kind:'model',field:'model',ref:'_modelId',name:uiText('模型'),sample:'label'},variable:{kind:'variable',field:'variable',ref:'_variableId',name:uiText('变量'),sample:'sample'},series:{kind:'series',field:'series',ref:'_seriesId',name:uiText('系列'),sample:'period'},parent:{kind:'parent',field:'parent',ref:'_parentId',name:uiText('父类别'),sample:'label'}};
const seriesTemplates=new Set(['groupedbar','groupedbarh','stackedbar','stacked','stream','stackedcolumn','percentcolumn','tide','percentarea','smallmultiples','race']);
export const entitySpec=doc=>['roc','precisionrecall','calibration','cumulativegains','decisioncurve','ksplot','liftcurve','thresholdmetrics','costcurve'].includes(doc?.template)?specs.model:['correlation','splom'].includes(doc?.template)?specs.variable:seriesTemplates.has(doc?.template)?{...specs.series,sample:['groupedbar','groupedbarh','stackedbar','stacked'].includes(doc.template)?'label':'period'}:['sunburst','icicle'].includes(doc?.template)?specs.parent:null;
export const entityReferences=[...Object.values(specs).map(s=>s.ref),'_sampleId'];
export const entityNames=(doc,kind,rows=doc.data)=>{const names=new Set(rows.map(r=>r[specs[kind].field]));return doc.entities?.kind===kind?[...doc.entities.items.filter(e=>names.has(e.name)).map(e=>e.name),...[...names].filter(n=>!doc.entities.items.some(e=>e.name===n))]:[...names];};
const validName=value=>typeof value==='string'&&value.trim().length>0&&value.length<=80;
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=2048;
const newId=()=>`e:${globalThis.crypto.randomUUID()}`;
export const entityKey=(row,kind)=>row[specs[kind].ref]??`unmigrated:${JSON.stringify([kind,row[specs[kind].field]])}`;

export function entityProblems(doc){
  const spec=entitySpec(doc);if(!spec)return [];
  const sampleErrors=multivariateIdentityProblems(doc);
  const registry=doc.entities,rows=doc.data||[];
  if(registry===undefined)return [...sampleErrors,...(rows.some(r=>r[spec.ref]!==undefined)?[{message:uiMessage`${spec.name}身份缺少登记表，请使用完整作品文件。`}]:[])];
  if(registry?.version!==1||registry.kind!==spec.kind||!Array.isArray(registry.items)||registry.items.length>1500)return [{message:uiMessage`${spec.name}身份登记格式无效。`}];
  const items=registry.items;
  if(items.some(e=>!validId(e?.id)||!validName(e?.name))||new Set(items.map(e=>e.id)).size!==items.length||new Set(items.map(e=>e.name)).size!==items.length)return [{message:uiMessage`${spec.name}身份或名称重复、为空或格式无效；不会自动合并。`}];
  const byId=new Map(items.map(e=>[e.id,e.name]));
  return [...sampleErrors,...rows.flatMap((row,index)=>byId.get(row[spec.ref])===row[spec.field]?[]:[{row:index,field:spec.field,message:uiMessage`${spec.name}与登记身份不一致。请选择已有${spec.name}；整体改名或新建请使用「管理${spec.name}」。`}])];
}

export function withEntityIds(input,{legacyNamespace}={}){
  const doc=structuredClone(input),spec=entitySpec(doc);if(!spec)return doc;
  if(doc.entities!==undefined){const problems=entityProblems(doc);if(problems.length)throw new Error(problems[0].message);return withSampleIds(doc,{legacyNamespace});}
  if(doc.data.some(r=>r[spec.ref]!==undefined))throw new Error(uiMessage`${spec.name}身份缺少登记表，请使用完整作品文件。`);
  const names=[...new Set(doc.data.map(r=>r[spec.field]))];
  doc.entities={version:1,kind:spec.kind,items:names.map(name=>({id:legacyNamespace?`legacy:entity:${JSON.stringify([legacyNamespace,spec.kind,name])}`:newId(),name}))};
  const ids=new Map(doc.entities.items.map(e=>[e.name,e.id]));
  doc.data.forEach(row=>row[spec.ref]=ids.get(row[spec.field]));return withSampleIds(doc,{legacyNamespace});
}

export function bindEntitySnapshot(snapshot,fields){
  if(snapshot.meta.template==='splom'&&snapshot.meta.sampleEntities){
    const column=fields.findIndex(f=>f[0]==='sample'),ids=new Map(snapshot.meta.sampleEntities.items.map(e=>[e.name,e.id]));
    snapshot.cells.forEach((row,i)=>{const id=ids.get(String(row[column]).trim());if(id)snapshot.rowMeta[i]._sampleId=id;});
  }
  const spec=entitySpec(snapshot.meta);if(!spec||!snapshot.meta.entities)return snapshot;
  const column=fields.findIndex(f=>f[0]===spec.field),ids=new Map(snapshot.meta.entities.items.map(e=>[e.name,e.id]));
  snapshot.cells.forEach((row,i)=>{const id=ids.get(String(row[column]).trim());if(id)snapshot.rowMeta[i][spec.ref]=id;});
  return snapshot;
}

export function editEntitySnapshot(snapshot,fields,action,{id,name,targetId,index}={}){
  const next=structuredClone(snapshot),spec=entitySpec(next.meta),registry=next.meta.entities;
  if(!spec||!registry)throw new Error(uiText('当前数据没有可管理的分组对象。'));
  const column=fields.findIndex(f=>f[0]===spec.field),items=registry.items,entity=items.find(e=>e.id===id),positions=next.rowMeta.flatMap((r,i)=>r[spec.ref]===id?[i]:[]);
  if(action!=='create'&&!entity)throw new Error(uiMessage`${spec.name}已不存在，请重新打开管理面板。`);
  if(['rename','create'].includes(action)){
    name=String(name??'').trim();if(!validName(name))throw new Error(uiMessage`${spec.name}名称需要 1–80 个字。`);
    if(items.some(e=>e.id!==id&&e.name===name))throw new Error(uiMessage`已有同名${spec.name}；改名不会合并记录。`);
  }
  if(action==='rename'){
    entity.name=name;positions.forEach(i=>next.cells[i][column]=name);
  }else if(action==='replace'){
    const replacement=newId();entity.id=replacement;positions.forEach(i=>next.rowMeta[i][spec.ref]=replacement);
  }else if(action==='move'){
    if(!Number.isInteger(index)||index<0||index>=items.length)throw new Error(uiText('排列位置无效。'));
    items.splice(items.indexOf(entity),1);items.splice(index,0,entity);
  }else if(action==='delete'){
    const removed=new Set(positions);next.cells=next.cells.filter((_,i)=>!removed.has(i));next.rowMeta=next.rowMeta.filter((_,i)=>!removed.has(i));registry.items=items.filter(e=>e.id!==id);
  }else if(action==='merge'){
    const target=items.find(e=>e.id===targetId);if(!target||target===entity)throw new Error(uiMessage`请选择另一个${spec.name}。`);
    const sampleColumn=fields.findIndex(f=>f[0]===spec.sample);
    const occupied=new Set(next.cells.flatMap((row,i)=>next.rowMeta[i][spec.ref]===targetId?[row[sampleColumn]]:[]));
    if(positions.some(i=>occupied.has(next.cells[i][sampleColumn])))throw new Error(uiText('两个对象包含同一样本的观测，合并会产生冲突；数据未修改，不会自动求平均或删行。'));
    positions.forEach(i=>{next.cells[i][column]=target.name;next.rowMeta[i][spec.ref]=target.id;});registry.items=items.filter(e=>e.id!==id);
  }else if(action==='create'){
    const entityId=newId(),sampleField=spec.sample,sampleColumn=fields.findIndex(f=>f[0]===sampleField),actualColumn=fields.findIndex(f=>f[0]==='actual');
    const samples=new Map();for(const row of next.cells)if(row[sampleColumn]?.trim()&&!samples.has(row[sampleColumn]))samples.set(row[sampleColumn],row);
    if(next.cells.length+samples.size>1500)throw new Error(uiText('新增后超过 1,500 行；请先减少范围，原数据保持不变。'));
    items.push({id:entityId,name});
    for(const [sample,source]of samples){const row=fields.map(()=> '');row[sampleColumn]=sample;row[column]=name;if(actualColumn>=0)row[actualColumn]=source[actualColumn];next.cells.push(row);next.rowMeta.push({_id:`r:${globalThis.crypto.randomUUID()}`,[spec.ref]:entityId});}
  }else throw new Error(uiText('未知的对象操作。'));
  return next;
}

// SPLOM observations have two independent entities. A sample registry is
// deliberately separate from variables so neither display name nor table order
// can define point correspondence when opening an old work or changing a pair.
export function multivariateIdentityProblems(doc){
  if(doc?.template!=='splom')return [];
  const rows=doc.data||[],errors=[],registry=doc.sampleEntities;
  if(registry===undefined){if(rows.some(r=>r._sampleId!==undefined))errors.push({message:uiText('样本身份缺少登记表，请使用完整作品文件。')});}
  else if(registry?.version!==1||registry.kind!=='sample'||!Array.isArray(registry.items)||registry.items.length>1500)errors.push({message:uiText('样本身份登记格式无效。')});
  else {
    const items=registry.items;
    if(items.some(e=>!validId(e?.id)||!validName(e?.name))||new Set(items.map(e=>e.id)).size!==items.length||new Set(items.map(e=>e.name)).size!==items.length)errors.push({message:uiText('样本身份或名称重复、为空或格式无效；不会自动合并。')});
    else {const byId=new Map(items.map(e=>[e.id,e.name]));rows.forEach((r,row)=>{if(byId.get(r._sampleId)!==r.sample)errors.push({row,field:'sample',message:uiText('样本名称与持久身份不一致；请整体修改同一样本的名称。')});});}
  }
  const variables=doc.entities?.kind==='variable'&&Array.isArray(doc.entities.items)?new Set(doc.entities.items.map(e=>e.id)):new Set();
  if(doc.selectedPair!==undefined&&(!Array.isArray(doc.selectedPair)||doc.selectedPair.length!==2||doc.selectedPair[0]===doc.selectedPair[1]||doc.selectedPair.some(id=>!variables.has(id))))errors.push({message:uiText('聚焦变量对需要两个不同的现有变量身份；请重新选择 X 和 Y，数据不会按名称自动配对。')});
  if(doc.variableUnits!==undefined&&(!doc.variableUnits||Array.isArray(doc.variableUnits)||typeof doc.variableUnits!=='object'||Object.entries(doc.variableUnits).some(([id,unit])=>!variables.has(id)||typeof unit!=='string'||unit.length>80)))errors.push({message:uiText('变量单位需要使用现有变量身份，并填写不超过 80 字的单位。')});
  return errors;
}
function withSampleIds(doc,{legacyNamespace}={}){
  if(doc.template!=='splom')return doc;
  if(doc.selectedPair===undefined&&doc.entities.items.length>=2)doc.selectedPair=doc.entities.items.slice(0,2).map(e=>e.id);
  if(doc.variableUnits===undefined)doc.variableUnits={};
  if(doc.sampleEntities!==undefined)return doc;
  if(doc.data.some(r=>r._sampleId!==undefined))throw new Error(uiText('样本身份缺少登记表，请使用完整作品文件。'));
  const names=[...new Set(doc.data.map(r=>r.sample))];
  doc.sampleEntities={version:1,kind:'sample',items:names.map(name=>({id:legacyNamespace?`legacy:entity:${JSON.stringify([legacyNamespace,'sample',name])}`:newId(),name}))};
  const ids=new Map(doc.sampleEntities.items.map(e=>[e.name,e.id]));doc.data.forEach(r=>r._sampleId=ids.get(r.sample));return doc;
}
export function renameMultivariateSample(input,id,name){
  const doc=structuredClone(input),items=doc.sampleEntities?.items;
  if(doc.template!=='splom'||!items?.some(e=>e.id===id)||!validName(name)||items.some(e=>e.id!==id&&e.name===name))throw new Error(uiText('请选择现有样本，并填写不重复的样本名称。'));
  items.find(e=>e.id===id).name=name;doc.data.forEach(r=>{if(r._sampleId===id)r.sample=name;});return doc;
}

export function multivariateGroupKey(doc,group){
  return JSON.stringify(['multivariate-group',...[...new Set(doc.data.filter(r=>r.group===group).map(r=>r._sampleId??r._id))].sort()]);
}
