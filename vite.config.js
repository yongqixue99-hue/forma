import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const locale=fileURLToPath(new URL('./src/forma/locale.js',import.meta.url));
const studio=fileURLToPath(new URL('./src/forma/main.js',import.meta.url));
let base='/';
export default defineConfig({
 plugins:[{
  name:'forma-browser-locale',enforce:'pre',
  // Only the application entry uses the conditional bootstrap. The standalone
  // players use configFile:false and embed both languages for offline use.
  transform(source,id){if(id.split('?')[0]!==locale)return;
   return source.replace("import english from './locales/en.json' with {type:'json'};",'const english=globalThis.__FORMA_MESSAGES__||{};');
  },
 },{
  name:'forma-studio-preload',apply:'build',configResolved(config){base=config.base;},
  // The bootstrap imports the studio dynamically after choosing a language, so
  // the browser would otherwise discover its chunks one round trip late. Hint
  // the whole static graph from the document; evaluation order is unchanged.
  transformIndexHtml:{order:'post',handler(html,{bundle}){
   const chunks=Object.values(bundle||{}).filter(item=>item.type==='chunk'),entry=chunks.find(chunk=>chunk.facadeModuleId===studio);if(!entry)return html;
   const scripts=new Set(),styles=new Set();
   (function visit(chunk){if(!chunk||scripts.has(chunk.fileName))return;scripts.add(chunk.fileName);for(const file of chunk.viteMetadata?.importedCss||[])styles.add(file);for(const file of chunk.imports)visit(bundle[file]);})(entry);
   // The interface face is needed on every route; fetch it alongside the stylesheet that declares it.
   const face=Object.keys(bundle).find(file=>/manrope-latin-wght-normal[^/]*\.woff2$/.test(file));
   return [...(face?[{tag:'link',attrs:{rel:'preload',as:'font',type:'font/woff2',crossorigin:true,href:base+face},injectTo:'head'}]:[]),
    ...[...styles].map(file=>({tag:'link',attrs:{rel:'preload',as:'style',crossorigin:true,href:base+file},injectTo:'head'})),
    ...[...scripts].filter(file=>!html.includes(file)).map(file=>({tag:'link',attrs:{rel:'modulepreload',crossorigin:true,href:base+file},injectTo:'head'}))];
  }},
 }],
 build:{target:'es2022'},
});
