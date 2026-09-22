import {findTemplate} from './catalog.js';
import {chartUseCases,recommendationGoals} from './chart-use-cases.js';
import {locale,isEnglish} from './locale.js';
import {escapeHtml as esc} from './data.js';
import './chart-recommendations.css';

export function chartRecommendation(id){
 const t=findTemplate(id),p=chartUseCases[id];if(!t||!p)return null;
 const lang=locale();
 return {id,goal:p.goal,goalLabel:recommendationGoals[p.goal][lang],dataKind:p.dataKind,
  question:p.question[lang],choice:p.choice[lang],use:t.use,avoid:t.avoid,limit:t.limit,
  alternatives:p.alternatives.map(id=>({id,name:findTemplate(id).type,url:`#chart/${id}`}))};
}
export function recommendedUseHTML(id){
 const r=chartRecommendation(id);if(!r)return '';
 const text=(zh,en)=>isEnglish()?en:zh;
 return `<section class="chart-recommendation" data-chart-recommendation="${esc(id)}" aria-label="${text('推荐使用场景','Recommended use cases')}"><span class="recommendation-label">${text('推荐使用场景','Recommended use cases')}</span><h3>${esc(r.question)}</h3><p>${esc(r.use)}</p><details><summary>${text('如何选这张图','When to choose this chart')}</summary><p>${esc(r.choice)}</p><p><strong>${text('不适合：','Avoid: ')}</strong>${esc(r.avoid)}</p><div class="recommendation-alternatives"><span>${text('也可以看看','Consider also')}</span>${r.alternatives.map(a=>`<a href="${a.url}">${esc(a.name)} ↗</a>`).join('')}</div></details></section>`;
}
