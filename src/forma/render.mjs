import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { getExample, findTemplate } from './catalog.js';
import { validateDocument } from './data.js';
import { standaloneHTML, staticSVG } from './export.js';
import { spatialViews } from './spatial-charts.js';
import { palettes, normalizePalette } from './palettes.js';

const args=process.argv.slice(2),get=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
if(args.includes('--help')||!args.length){console.log('FORMA renderer\n  node src/forma/render.mjs --input document.json --out output --palette ink --dark\n  node src/forma/render.mjs --template tide --out output\n  Options: --ratio wide|square|portrait --duration 8 --view iso|front|top (3D)');process.exit(0);}
const doc=get('--input')?JSON.parse(await fs.readFile(get('--input'),'utf8')):getExample(get('--template'));
const validation=validateDocument(doc);if(!validation.valid){console.error(validation.errors.join('\n'));process.exit(1);}
const requestedPalette=get('--palette','ink');if(!palettes[requestedPalette]&&!['mineral','clay','porcelain','graphite'].includes(requestedPalette))throw new Error(`Unknown palette: ${requestedPalette}`);const palette=normalizePalette(requestedPalette);
const ratio=get('--ratio','wide');if(!['wide','square','portrait'].includes(ratio))throw new Error('ratio must be wide, square, or portrait');
const duration=Number(get('--duration','8'));if(!Number.isFinite(duration)||duration<1||duration>60)throw new Error('duration must be 1–60 seconds');
const view=get('--view');if(view&&!Object.hasOwn(spatialViews,view))throw new Error('view must be iso, front, or top');if(view&&findTemplate(doc.template).dimension!=='3d')throw new Error('view is only available for 3D templates');
const options={...(view?{camera3d:spatialViews[view]}:{}),palette,dark:args.includes('--dark')||(!args.includes('--light')&&!!findTemplate(doc.template).dark),ratio,duration};
const out=path.resolve(get('--out','output/forma'));await fs.mkdir(out,{recursive:true});
const player=await fs.readFile(fileURLToPath(new URL('../../public/forma/player.js',import.meta.url)),'utf8');
const window=new Window();globalThis.document=window.document;globalThis.XMLSerializer=window.XMLSerializer;
await fs.writeFile(path.join(out,doc.template+'.html'),standaloneHTML(doc,options,player));
await fs.writeFile(path.join(out,doc.template+'.svg'),staticSVG(doc,options));
await fs.writeFile(path.join(out,doc.template+'.json'),JSON.stringify(doc,null,2));
console.log(`${doc.template}: HTML + SVG + JSON → ${out}`);
window.happyDOM.abort();
