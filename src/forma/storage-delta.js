// Lossless JSON deltas. Records and steps are addressed by IDs, never by labels
// or positions; only unkeyed cell arrays use positions within their own snapshot.
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const clone=v=>structuredClone(v);
const keyed=(a,key)=>a.every(v=>v&&typeof v==='object'&&typeof v[key]==='string')&&new Set(a.map(v=>v[key])).size===a.length;
export function makeDelta(from,to){
  if(JSON.stringify(from)===JSON.stringify(to))return null;
  if(Array.isArray(from)&&Array.isArray(to)){
    const key=['_id','id'].find(k=>from.length+to.length>0&&keyed(from,k)&&keyed(to,k));
    if(key){const old=new Map(from.map(v=>[v[key],v]));return {t:'keys',key,order:to.map(v=>v[key]),changes:to.flatMap(v=>{const d=old.has(v[key])?makeDelta(old.get(v[key]),v):{t:'value',value:clone(v)};return d?[[v[key],d]]:[];})};}
    return {t:'array',length:to.length,changes:to.flatMap((v,i)=>{const d=i<from.length?makeDelta(from[i],v):{t:'value',value:clone(v)};return d?[[i,d]]:[];})};
  }
  if(from&&to&&typeof from==='object'&&typeof to==='object'&&!Array.isArray(from)&&!Array.isArray(to)){
    return {t:'object',keys:Object.keys(to),changes:Object.entries(to).flatMap(([k,v])=>{const d=own(from,k)?makeDelta(from[k],v):{t:'value',value:clone(v)};return d?[[k,d]]:[];})};
  }
  return {t:'value',value:clone(to)};
}
export function applyDelta(from,delta){
  if(delta===null)return clone(from);
  if(!delta||typeof delta!=='object')throw new Error('历史版本格式无效。');
  if(delta.t==='value')return clone(delta.value);
  if(!Array.isArray(delta.changes)||delta.changes.length>50000||delta.changes.some(p=>!Array.isArray(p)||p.length!==2))throw new Error('历史版本差量格式无效。');
  if(delta.t==='array'&&(!Array.isArray(from)||!Number.isInteger(delta.length)||delta.length<0||delta.length>50000))throw new Error('历史版本数组尺寸无效。');
  if(delta.t==='keys'&&(!Array.isArray(from)||!Array.isArray(delta.order)||delta.order.length>50000||new Set(delta.order).size!==delta.order.length))throw new Error('历史版本对象顺序无效。');
  if(delta.t==='object'&&(!Array.isArray(delta.keys)||delta.keys.length>50000||new Set(delta.keys).size!==delta.keys.length))throw new Error('历史版本字段无效。');
  const changes=new Map(delta.changes);
  if(changes.size!==delta.changes.length)throw new Error('历史版本包含重复修改。');
  if(delta.t==='array'&&[...changes.keys()].some(i=>!Number.isInteger(i)||i<0||i>=delta.length))throw new Error('历史版本数组位置无效。');
  const allowedKeys=new Set(delta.t==='keys'?delta.order:delta.keys);
  if(delta.t==='keys'&&(!['_id','id'].includes(delta.key)||delta.order.some(k=>typeof k!=='string')||[...changes.keys()].some(k=>!allowedKeys.has(k))))throw new Error('历史版本对象编号无效。');
  if(delta.t==='object'&&(delta.keys.some(k=>typeof k!=='string')||[...changes.keys()].some(k=>!allowedKeys.has(k))))throw new Error('历史版本字段修改无效。');
  if(delta.t==='keys'){
    const old=new Map(from.map(v=>[v[delta.key],v]));
    return delta.order.map(id=>changes.has(id)?applyDelta(old.get(id),changes.get(id)):clone(old.get(id)));
  }
  if(delta.t==='array')return Array.from({length:delta.length},(_,i)=>changes.has(i)?applyDelta(from[i],changes.get(i)):clone(from[i]));
  if(delta.t==='object')return Object.fromEntries(delta.keys.map(k=>[k,changes.has(k)?applyDelta(from?.[k],changes.get(k)):clone(from[k])]));
  throw new Error('无法读取这个历史版本，请先下载备份。');
}
const stepContent=step=>step?[step.doc,step.draft||null]:null;
export function packSyncHistory(work,history){
  return history.map(transaction=>({...transaction,entries:transaction.entries.map(entry=>{
    const base=stepContent(work.steps.find(s=>s.id===entry.id)),after=JSON.parse(entry.after);
    return {id:entry.id,after:makeDelta(base,after),before:makeDelta(after,[entry.before.doc,entry.before.draft||null])};
  })}));
}
export function unpackSyncHistory(work,history=[]){
  return history.map(transaction=>({...transaction,entries:transaction.entries.map(entry=>{
    const base=stepContent(work.steps.find(s=>s.id===entry.id)),after=applyDelta(base,entry.after),before=applyDelta(after,entry.before);
    return {id:entry.id,after:JSON.stringify(after),before:{doc:before[0],...(before[1]?{draft:before[1]}:{})}};
  })}));
}
