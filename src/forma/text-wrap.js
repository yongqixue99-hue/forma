// Keep Latin words whole while allowing CJK text to wrap character by character.
// Very long identifiers still wrap within the available width; data stays in metadata.
export function wrapChartText(text,max,{latin=.57,wide=.85}={}){
 const lines=[];let line='',size=0;
 const weight=c=>/[\u2e80-\uffff]/u.test(c)?1:/[MW@]/u.test(c)?wide:latin;
 const measure=t=>[...t].reduce((n,c)=>n+weight(c),0);
 const flush=()=>{lines.push(line.trimEnd());line='';size=0;};
 for(const token of String(text).match(/[^\s\u2e80-\uffff]+|[\u2e80-\uffff]|\r\n|[\r\n]|[^\S\r\n]+/gu)||[]){
  if(/^[\r\n]/.test(token)){flush();continue;}
  if(/^\s+$/.test(token)){if(line){line+=' ';size+=latin;}continue;}
  const n=measure(token);if(line&&size+n>max)flush();
  if(n<=max){line+=token;size+=n;continue;}
  for(const c of token){const n=weight(c);if(line&&size+n>max)flush();line+=c;size+=n;}
 }
 if(line||!lines.length)lines.push(line.trimEnd());return lines;
}

// Shared by chart renderers, SVG and video. Layout uses logical pixels, not
// viewport CSS, so the same text breaks survive export and playback.
export function fitChartLabel(text,width,height=28,fontSize=10){
  const value=String(text??'');let size=fontSize,lines=wrapChartText(value,Math.max(1,width/size));
  while(size>8&&lines.length*size*1.2>height){size-=.5;lines=wrapChartText(value,Math.max(1,width/size));}
  return {text:value,lines,fontSize:size,lineHeight:size*1.2};
}
export function chartTextWidth(text,fontSize=10){
  return [...String(text??'')].reduce((sum,c)=>sum+(/[\u2e80-\uffff]/u.test(c)?1:/[MW@]/.test(c)?.85:.57)*fontSize,0);
}
