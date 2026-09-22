import english from './locales/en.json' with {type:'json'};
export const LOCALE_KEY='forma.locale';
let current='zh-CN';
try{const preferred=globalThis.__FORMA_LOCALE__||globalThis.localStorage?.getItem(LOCALE_KEY);if(preferred==='en'||preferred==='en-US')current='en';}catch{}
export const locale=()=>current;
export const isEnglish=()=>current==='en';
export function setLocale(value){current=value==='en'?'en':'zh-CN';try{globalThis.localStorage?.setItem(LOCALE_KEY,current);}catch{}return current;}
const normalize=s=>s.trim().replace(/\s+/g,' ');
// Only authored UI messages enter this function. Interpolated values are opaque:
// titles, original headers, source names and cell contents never enter the dictionary.
export function translateMessage(source){
 if(!isEnglish()||typeof source!=='string')return source;
 const slots=[];const key=normalize(source).replace(/\{(\d+)\}/g,(m)=>{slots.push(m);return `{${slots.length-1}}`;});
 const translated=english[key];if(translated===undefined)return source;
 const content=translated.replace(/\{(\d+)\}/g,(m,n)=>slots[n]??m);
 return source.match(/^\s*/)[0]+content+source.match(/\s*$/)[0];
}
function markup(source){
 return source.replace(/<[^>]*>|[^<]+/g,token=>token.startsWith('<')?token.replace(/((?:aria-label|title|placeholder|alt)=)(['"])(.*?)\2/g,(_,prefix,quote,value)=>prefix+quote+translateMessage(value).replaceAll(quote,quote==='"'?'&quot;':'&#39;')+quote):translateMessage(token));
}
export function uiText(source){return typeof source==='string'&&/<[a-z/][\s\S]*?>/i.test(source)?markup(source):translateMessage(source);}
function interpolate(strings,values,translate){
 const source=strings.map((s,i)=>s+(i<values.length?`{${i}}`:'')).join('');
 return translate(source).replace(/\{(\d+)\}/g,(m,n)=>n<values.length?String(values[n]):m);
}
export const uiMarkup=(strings,...values)=>interpolate(strings,values,markup);
export const uiMessage=(strings,...values)=>interpolate(strings,values,translateMessage);
export const uiDate=value=>new Date(value).toLocaleString(isEnglish()?'en-GB':'zh-CN');
