import {arc,pie,hierarchy,treemap} from 'd3';
import {uiText as t} from './locale.js';
import {escapeHtml as esc} from './data.js';
import {palettes} from './palettes.js';
import {labelInk} from './chart-readability.js';

// Apple FY2025: preserve the same values and color identity across all three views.
export function homeArt(){
  const values=[209586,33708,28023,35686,109158],total=values.reduce((a,b)=>a+b,0);
  const colors=palettes.ink.colors;
  const rings=pie().sort(null)(values),ring=arc().innerRadius(72).outerRadius(111).cornerRadius(2);
  const root=hierarchy({children:values.map((value,i)=>({value,i}))}).sum(d=>d.value||0);
  treemap().size([232,218]).paddingInner(4)(root);
  const label=(x,index,name)=>`<text x="${x}" y="295" class="home-art-label"><tspan class="home-art-index">0${index}</tspan><tspan dx="12">${esc(t(name))}</tspan></text>`;
  return `<svg viewBox="0 0 1000 310" role="img" aria-label="${esc(t('Apple 2025 财年收入，分别以条形、环形和矩形树展示。'))}">
    <g fill="none" stroke="${palettes.ink.grid}" stroke-width=".8"><path d="M30 260H286M372 260H628M714 260H970"/><path d="M30 26V244"/>${[94,158,222,286].map(x=>`<path d="M${x} 26V244" stroke-dasharray="1 7"/>`).join('')}<circle cx="500" cy="135" r="121" stroke-dasharray="1 6"/></g>
    <g class="home-art-bars">${values.map((v,i)=>`<g class="home-art-bar" style="--art-delay:${i*75}ms"><rect x="31" y="${31+i*44}" width="${v/values[0]*254}" height="27" rx="2" fill="${colors[i]}"/><path d="M34 ${34+i*44}H${28+v/values[0]*254}" stroke="#fff" stroke-opacity=".16" stroke-width=".7"/></g>`).join('')}</g>
    <g transform="translate(500 135)"><g class="home-art-ring">${rings.map((d,i)=>`<path d="${ring(d)}" fill="${colors[i]}" stroke="var(--bg)" stroke-width="3"/>`).join('')}</g><text text-anchor="middle" y="4" class="home-art-total">100<tspan font-size="12" dx="2">%</tspan></text><path d="M-13 18H13" stroke="${palettes.ink.grid}" stroke-width=".8"/></g>
    <g transform="translate(726 26)" class="home-art-tiles">${root.leaves().map(d=>`<g><rect x="${d.x0}" y="${d.y0}" width="${d.x1-d.x0}" height="${d.y1-d.y0}" rx="2" fill="${colors[d.data.i]}"/><path d="M${d.x0+3} ${d.y0+3}H${d.x1-3}" stroke="#fff" stroke-opacity=".2" stroke-width=".7"/>${d.data.value/total>.2?`<text x="${d.x0+12}" y="${d.y0+24}" fill="${labelInk(colors[d.data.i])}" font-family="var(--mono)" font-size="11">${(d.data.value/total*100).toFixed(1)}%</text>`:''}</g>`).join('')}</g>
    ${label(30,1,'比较')}${label(372,2,'构成')}${label(714,3,'比例')}
  </svg>`;
}
