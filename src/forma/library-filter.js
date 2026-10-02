import {chartUseCases} from './chart-use-cases.js';
export function filterCatalog(catalog,{goal='all',category='all',family='all',edition='all',motion='all',query='',onlyFavorites=false,favorites=new Set()}={}){
  const terms=String(query).toLocaleLowerCase().trim().split(/\s+/).filter(Boolean),favoriteIds=favorites instanceof Set?favorites:new Set(favorites);
  return catalog.filter(t=>(goal==='all'||chartUseCases[t.id]?.goal===goal)&&(category==='all'||(category==='basic'?t.basic:t.category===category))&&(family==='all'||t.family===family)&&(edition==='all'||String(t.edition)===String(edition))&&(motion==='all'||t.motion===motion)&&(!onlyFavorites||favoriteIds.has(t.id))&&terms.every(term=>`${t.id} ${t.no} ${t.name} ${t.en} ${t.type} ${t.keywords} ${t.use}`.toLocaleLowerCase().includes(term)));
}
export function facetCounts(catalog,filters,field){const matched=filterCatalog(catalog,{...filters,[field]:'all'}),counts={all:matched.length,...field==='motion'?{morph:0,entrance:0}:{}};for(const t of matched){const key=String(t[field]);counts[key]=(counts[key]||0)+1;if(field==='category'&&t.basic)counts.basic=(counts.basic||0)+1;}return counts;}
