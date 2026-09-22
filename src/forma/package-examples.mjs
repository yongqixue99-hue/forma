import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import { Window } from 'happy-dom';
import { morphViews, morphExample, morphEffects } from './morph.js';
import { catalog, families, categories, getExample } from './catalog.js';
import { standaloneHTML, staticSVG } from './export.js';
import { presetWork } from './work-model.js';
import { scenarioPresets } from './scenario-presets.js';
import { workHTML } from './work-export.js';
const window=new Window();globalThis.document=window.document;globalThis.XMLSerializer=window.XMLSerializer;
const player=await fs.readFile('public/forma/player.js','utf8');
await fs.mkdir('public/forma/showcase',{recursive:true});await fs.mkdir('public/forma/examples',{recursive:true});
await fs.writeFile('public/forma/catalog.json',JSON.stringify({version:1,designVersion:'10.0',name:'FORMA 数相',motion:{views:morphViews,effects:morphEffects,example:'morph.example.json',player:'morph-player.js'},families,categories,templates:catalog},null,2));
for(const t of catalog){const doc=getExample(t.id),options={palette:'ink',dark:!!t.dark,ratio:'wide',duration:8};await fs.writeFile(`public/forma/showcase/${t.id}.html`,standaloneHTML(doc,options,player));await fs.writeFile(`public/forma/showcase/${t.id}.svg`,staticSVG(doc,options));await fs.writeFile(`public/forma/examples/${t.id}.json`,JSON.stringify(doc,null,2));}
await fs.writeFile('public/forma/morph.example.json',JSON.stringify(morphExample,null,2));
const work=presetWork('independent'),workEngine=await fs.readFile('public/forma/work-player.js','utf8');
await fs.writeFile('public/forma/work.example.json',JSON.stringify(work,null,2));
await fs.writeFile('public/forma/showcase/work-independent.html',workHTML(work,workEngine));
await fs.mkdir('public/forma/scenarios',{recursive:true});
for(const p of scenarioPresets){const example=presetWork(p.id);await fs.writeFile(`public/forma/scenarios/${p.id}.json`,JSON.stringify(example,null,2));await fs.writeFile(`public/forma/showcase/scenario-${p.id}.html`,workHTML(example,workEngine));}
// Keep the public tutorial and installable skill generated from maintained sources.
await import('./build-guide.mjs');
// Downloadable capabilities must describe this build, not a historical audit.
const inventoryDirectory='output/forma-generated-capabilities';
execFileSync(process.execPath,['qa/forma/audit-capabilities.mjs',inventoryDirectory],{stdio:'pipe'});
await fs.copyFile(`${inventoryDirectory}/CAPABILITIES.md`,'public/forma/morph-coverage.md');
await fs.copyFile(`${inventoryDirectory}/capabilities.json`,'public/forma/capabilities.json');
await fs.copyFile(`${inventoryDirectory}/CAPABILITIES.md`,'docs/forma/MORPH-COVERAGE.md');
await fs.copyFile(`${inventoryDirectory}/capabilities.json`,'docs/forma/CURRENT-CAPABILITIES.json');
console.log(`${catalog.length} standalone HTML, SVG and JSON examples generated.`);
window.happyDOM.abort();
