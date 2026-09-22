// Resolve the UI language before evaluating catalogues with translated metadata.
// Chinese sessions do not download the English UI dictionary. Offline player
// builds retain their embedded dictionary and remain network independent.
import {initialLocale} from './initial-locale.js';
async function start(){
 let stored;try{stored=localStorage.getItem('forma.locale');}catch{}
 const language=initialLocale({search:location.search,stored,languages:navigator.languages||[navigator.language]});
 globalThis.__FORMA_LOCALE__=language;
 if(language==='en'||language==='en-US')globalThis.__FORMA_MESSAGES__=(await import('./locales/en.json')).default;
 await import('./main.js');
}
start().catch(error=>{
 console.error(error);
 const root=document.querySelector('#app');root.replaceChildren();
 const text=document.createElement('p');text.textContent='页面未能加载，请刷新重试。 / Unable to load the studio. Please reload.';
 const button=document.createElement('button');button.textContent='重新加载 / Reload';button.onclick=()=>location.reload();
 root.append(text,button);
});
