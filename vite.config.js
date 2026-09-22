import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const locale=fileURLToPath(new URL('./src/forma/locale.js',import.meta.url));
export default defineConfig({
 plugins:[{
  name:'forma-browser-locale',enforce:'pre',
  // Only the application entry uses the conditional bootstrap. The standalone
  // players use configFile:false and embed both languages for offline use.
  transform(source,id){if(id.split('?')[0]!==locale)return;
   return source.replace("import english from './locales/en.json' with {type:'json'};",'const english=globalThis.__FORMA_MESSAGES__||{};');
  },
 }],
 build:{target:'es2022'},
});
