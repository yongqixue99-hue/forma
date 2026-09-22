export const BETA_VERSION='2026.09.14-beta.10';
export const USAGE_KEY='forma.beta.usage.v1';
const events=['visit','return','example','editor','data-edit','save','export','export-error'];
const formats=['none','project','json','svg','png','html','mp4'];
const channels=['direct','x','dvs','hn','product-hunt','other'];
const fresh=()=>({version:1,enabled:true,days:{}});
const storage=()=>{try{return globalThis.localStorage;}catch{return null;}};
export function readUsage(store=storage(),now=new Date()){
  try{
    const raw=JSON.parse(store?.getItem(USAGE_KEY)||'null');if(raw?.version!==1)return fresh();
    const clean={...fresh(),enabled:raw.enabled!==false};
    const today=now.toISOString().slice(0,10),earliest=new Date(Date.parse(today)-29*86400000).toISOString().slice(0,10);
    for(const day of Object.keys(raw.days||{}).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&d>=earliest&&d<=today).sort().slice(-30)){
      const row={};for(const [key,count] of Object.entries(raw.days[day]||{})){
        const [event,format,channel]=key.split(':');
        if(key===`${event}:${format}:${channel}`&&events.includes(event)&&formats.includes(format)&&channels.includes(channel)&&Number.isInteger(count)&&count>0)row[key]=Math.min(count,100000);
      }clean.days[day]=row;
    }return clean;
  }catch{return fresh();}
}
// Retain the call signature for older modules; local event counting has been retired.
export function recordUsage(_event,_options,store=storage()){
  try{store?.removeItem(USAGE_KEY);}catch{}
  return false;
}
export function usageChannel(search=''){
  const value=new URLSearchParams(search).get('ref');return channels.includes(value)?value:value?'other':'direct';
}
export function setUsageEnabled(enabled,store=storage()){
  const state=readUsage(store);state.enabled=!!enabled;
  try{store?.setItem(USAGE_KEY,JSON.stringify(state));}catch{}
}
export function clearUsage(store=storage()){
  const state=readUsage(store);try{store?.setItem(USAGE_KEY,JSON.stringify({...fresh(),enabled:state.enabled}));}catch{}
}
export function feedbackReport({goal='',problem='',expected='',category='question',language='en',includeUsage=false}={},store=storage()){
  return {kind:'forma-feedback',version:BETA_VERSION,language:language==='en'?'en':'zh-CN',category:['question','bug','idea'].includes(category)?category:'question',goal:String(goal).slice(0,2000),problem:String(problem).slice(0,2000),expected:String(expected).slice(0,2000),...(includeUsage?{localUsage:readUsage(store)}:{})};
}
