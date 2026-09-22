export function initialLocale({search='',stored,languages=[]}={}){
  const requested=new URLSearchParams(search).get('lang');
  const normalize=value=>/^en(?:-|$)/i.test(value||'')?'en':/^zh(?:-|$)/i.test(value||'')?'zh-CN':null;
  return normalize(requested)||normalize(stored)||'en';
}
