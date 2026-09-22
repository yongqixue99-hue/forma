import regions from './datasets/world-regions.json' with {type:'json'};
import aliases from './datasets/world-country-aliases.json' with {type:'json'};
import {isEnglish} from './locale.js';

const key=value=>String(value??'').trim().normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[’']/g,'');
const common={USA:['US','United States','America','美国'],GBR:['UK','Britain','英国'],KOR:['South Korea','韩国'],PRK:['North Korea','朝鲜'],ARE:['UAE','阿联酋'],CZE:['Czech Republic','捷克'],SWZ:['Eswatini'],TUR:['Türkiye'],SAH:['Western Sahara']};
export const countries=regions.map(region=>{
  const extra=aliases.find(r=>r.code===region.code);
  return {...region,zh:extra.zh,terms:[region.code,region.name,extra.zh,extra.iso2,extra.iso3,...extra.aliases,...(common[region.code]||[])].filter(v=>v&&v!=='-99').map(key)};
});
const codes=new Map(countries.map(r=>[key(r.code),r]));
export const countryName=country=>isEnglish()?country.name:country.zh||country.name;
/** Exact names and explicit codes only. A prefix must never select a country. */
export function resolveCountry(value){
  const query=key(value);if(!query)return null;
  if(codes.has(query))return codes.get(query);
  const matches=countries.filter(r=>r.terms.includes(query));return matches.length===1?matches[0]:null;
}
export function searchCountries(value){
  const query=key(value),exact=resolveCountry(value);
  return countries.filter(r=>!query||r.terms.some(t=>t.includes(query))).sort((a,b)=>a===exact?-1:b===exact?1:Number(b.terms.some(t=>t.startsWith(query)))-Number(a.terms.some(t=>t.startsWith(query)))||a.name.localeCompare(b.name));
}
