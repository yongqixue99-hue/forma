const cache=new Map();

// Display formatting must never turn a measured nonzero value into zero.
// Input cells and exported source data retain the original numeric value.
export function formatNumber(value,{significantDigits=6}={}){
  if(value===null||value===undefined||typeof value!=='number'||!Number.isFinite(value))return '—';
  if(value===0)return '0';
  const digits=Math.max(1,Math.min(15,significantDigits)),magnitude=Math.abs(value);
  if(magnitude<1e-4||magnitude>=1e9)return value.toExponential(digits-1).replace(/(\.\d*?[1-9])0+(?=e)|\.0+(?=e)/g,'$1').replace('e+','e');
  if(!cache.has(digits))cache.set(digits,new Intl.NumberFormat('zh-CN',{maximumSignificantDigits:digits}));
  return cache.get(digits).format(value);
}

export function formatDecimal(value,places=2){
  if(typeof value!=='number'||!Number.isFinite(value))return '—';
  if(value===0)return (0).toFixed(places);
  const fixed=value.toFixed(places);
  return Number(fixed)===0?formatNumber(value,{significantDigits:3}):fixed;
}
