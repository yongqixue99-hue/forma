import {locale,uiText,uiMarkup,uiMessage} from './locale.js';
// Parse off the main thread; selecting a range never sends the whole workbook to the UI.
export async function openWorkbook(file){
  if(!/\.xlsx$/i.test(file.name)||file.size>8*1024*1024)throw new Error(uiText('请选择 8 MB 以内的 .xlsx 文件。'));
  const worker=new Worker(new URL('./xlsx-worker.js',import.meta.url),{type:'module'});let serial=0,closed=false;const requests=new Map();
  const close=()=>{if(closed)return;closed=true;worker.terminate();for(const q of requests.values()){clearTimeout(q.timer);q.reject(new Error(uiText('Excel 读取已取消。')));}requests.clear();};
  worker.onmessage=({data})=>{const q=requests.get(data.id);if(!q)return;clearTimeout(q.timer);requests.delete(data.id);data.error?q.reject(new Error(data.error)):q.resolve(data.value);};
  worker.onerror=()=>close();
  const request=(action,values={})=>new Promise((resolve,reject)=>{if(closed)return reject(new Error(uiText('工作簿已关闭，请重新选择文件。')));const id=++serial,timer=setTimeout(()=>{reject(new Error(uiText('读取超过 15 秒，请缩小工作簿后重试。')));close();},15000);requests.set(id,{resolve,reject,timer});worker.postMessage({id,action,locale:locale(),...values},values.bytes?[values.bytes]:[]);});
  try{const sheets=await request('read',{bytes:await file.arrayBuffer()});return {sheets,select:(sheet,range)=>request('range',{sheet,range}),close};}catch(error){close();throw error;}
}
