import fs from 'node:fs/promises';
import {Window} from 'happy-dom';
import {setLocale} from './locale.js';
import {presetWork} from './work-model.js';
import {workHTML,stepSVG} from './work-export.js';
import {publicCases} from './public-cases.js';
import revenue from './datasets/apple-revenue.json' with {type:'json'};
import flowrate from './datasets/nist-flowrate.json' with {type:'json'};
const window=new Window();globalThis.document=window.document;globalThis.XMLSerializer=window.XMLSerializer;
const engine=await fs.readFile('public/forma/work-player.js','utf8');
const ids=['public-revenue','public-growth','public-penguins','public-process'];
for(const language of ['zh-CN','en']){
  setLocale(language);const directory=`public/forma/beta/${language}`;await fs.mkdir(directory,{recursive:true});
  for(const id of ids){
    const work=presetWork(id,'ink');work.name=work.steps[0].doc.title;
    await fs.writeFile(`${directory}/${id}.json`,JSON.stringify(work,null,2));
    await fs.writeFile(`${directory}/${id}.html`,workHTML(work,engine));
    await fs.writeFile(`${directory}/${id}.svg`,stepSVG(work.steps[0],work.steps,{longEdge:1280}));
  }
}
await fs.writeFile('public/data/apple-revenue-2025.csv','category,revenue_usd_million,fiscal_year\n'+revenue.map(r=>`"${r.category}",${r.revenue_usd_million},${r.fiscal_year}`).join('\n')+'\n');
await fs.writeFile('public/data/nist-flowrate.csv','batch,flowrate\n'+flowrate.map((v,i)=>`${i+1},${v}`).join('\n')+'\n');
await fs.writeFile('public/forma/beta/sources.json',JSON.stringify(publicCases.filter(p=>ids.includes(p.id)).map(({id,sourceUrl,dataUrl,rawUrl})=>({id,sourceUrl,dataUrl,...(rawUrl?{rawUrl}:{})})),null,2));
console.log('Four public-data tasks packaged in Chinese and English.');window.happyDOM.abort();
