// The page and chart grounds stay neutral. Colour belongs to the data.
const ground = {paper:'#f8f7f4',tint:'#eae8e2',ink:'#262626',dark:'#202020',muted:'#716e68',grid:'#dedbd4'};
export const palettes = {
  ink:{...ground,name:'墨与朱',en:'Ink & vermilion',description:'纸白、炭黑，一笔朱红。用强调色指出值得留意的数据。',
    colors:['#282828','#d94e36','#72716b','#a09c95','#51514e','#bcb8af'],
    darkColors:['#efede7','#ff795c','#b3afa6','#87837c','#d2cdc3','#686662'],accent:'#d94e36',darkAccent:'#ff795c'},
  cobalt:{...ground,name:'群青',en:'Ultramarine',description:'一支群青与中性灰。色相克制，线条、密度和明度负责层次。',
    colors:['#3659ba','#272b32','#7083ab','#a0aec8','#5c626d','#bbc0ca'],
    darkColors:['#9cb6ff','#ececf0','#8299c8','#b9c5dd','#727c92','#d2d8e4'],accent:'#3659ba',darkAccent:'#9cb6ff'},
  vermilion:{...ground,name:'朱砂',en:'Vermilion',description:'朱砂作为主线，黑与灰补充关系。背景保持纸白或炭黑。',
    colors:['#cf4930','#30302e','#8d8a82','#b6b0a6','#64625d','#cbc5ba'],
    darkColors:['#ff795c','#eeeae2','#aaa59b','#cfbeb0','#807c75','#d3cec5'],accent:'#cf4930',darkAccent:'#ff795c'},
  mono:{...ground,name:'银版',en:'Silver print',description:'纯粹的黑白灰。靠实心、空心、细线和纹理辨认结构。',
    colors:['#292929','#62615d','#96928a','#b7b2a8','#79766f','#ccc6ba'],
    darkColors:['#f1ede4','#c9c3b7','#9b958b','#76716a','#b2ab9e','#ddd7cb'],accent:'#292929',darkAccent:'#f1ede4'},
  ochre:{...ground,name:'陶墨',en:'Ochre & slate',description:'陶土、石蓝与淡金，适合多类别比较。纸白背景保持清晰与留白。',categorical:true,
    colors:['#526b82','#b7775f','#a58b4b','#8c7188','#858776','#53555e'],
    darkColors:['#9ab5cb','#e2a08a','#ceba78','#bfa4bb','#adb69b','#b4b8c8'],accent:'#b7775f',darkAccent:'#e2a08a'},
  mauve:{...ground,name:'雾紫',en:'Mauve & mineral',description:'灰紫、雾蓝与柔和的暖色，用不同色相区分类别，保持一致的明度。',categorical:true,
    colors:['#80688f','#527b91','#ad865b','#738576','#b8767c','#92908b'],
    darkColors:['#b8a0c9','#95bccf','#d2b28e','#a4b6a6','#dda3a8','#c0bdb6'],accent:'#80688f',darkAccent:'#b8a0c9'}
};
const aliases={mineral:'ink',clay:'vermilion',porcelain:'cobalt',graphite:'mono'};
export const normalizePalette=name=>Object.hasOwn(palettes,name)?name:Object.hasOwn(aliases,name)?aliases[name]:'ink';
export function normalizeColors(value){
  return Array.isArray(value)&&value.length>=1&&value.length<=12&&value.every(c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c))?value.map(c=>c.toLowerCase()):undefined;
}
export const configuredColors=(options={})=>normalizeColors(options.colors)||[...(options.dark?palettes[normalizePalette(options.palette)].darkColors:palettes[normalizePalette(options.palette)].colors)];
export function themeFor(name='ink',dark=false,customColors){
  name=normalizePalette(name);const p=palettes[name];
  const custom=normalizeColors(customColors),colors=custom||(dark?p.darkColors:p.colors),color=i=>colors[((Math.trunc(i)||0)%colors.length+colors.length)%colors.length];
  return {...p,name,isDark:dark,custom:!!custom,colors,color,bg:dark?p.dark:p.paper,
    fg:dark?'#efede7':p.ink,secondary:dark?'#aaa69e':p.muted,line:dark?'#ffffff22':p.grid,
    accent:custom?colors[0]:dark?p.darkAccent:p.accent,soft:dark?'#343434':p.tint};
}
