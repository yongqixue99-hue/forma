// Only positions change. Targets remain persistent source-record identities.
export function mountAnnotationInteraction(host,{enabled,getAnnotation,onMove,onError}){
 const win=host.ownerDocument.defaultView,events=new win.AbortController();let drag=null,suppress=false;
 const clamp=n=>Math.max(0,Math.min(1,n));
 function position(g,x,y){const [a,b,w,h]=g.dataset.positionBounds.split(',').map(Number);return {x:clamp(w?(x-a)/w:0),y:clamp(h?(y-b)/h:0)};}
 function local(svg,e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());}
 host.addEventListener('pointerdown',e=>{
  const g=e.target.closest('[data-annotation-id][role=button]');if(!enabled()||!g||e.button!==0||!e.target.closest('rect,text'))return;
  const svg=g.ownerSVGElement,p=local(svg,e),rect=g.querySelector('rect');if(!rect)return;
  drag={g,svg,id:g.dataset.annotationId,p,xy:[+rect.getAttribute('x'),+rect.getAttribute('y')],pointer:e.pointerId,moved:false};g.setPointerCapture(e.pointerId);
 },{signal:events.signal});
 host.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.pointer)return;const p=local(drag.svg,e),dx=p.x-drag.p.x,dy=p.y-drag.p.y;if(Math.hypot(dx,dy)>4)drag.moved=true;if(drag.moved){drag.g.setAttribute('transform',`translate(${dx},${dy})`);e.preventDefault();}},{signal:events.signal});
 host.addEventListener('pointerup',async e=>{if(!drag||e.pointerId!==drag.pointer)return;const d=drag;drag=null;d.g.removeAttribute('transform');if(!d.moved)return;suppress=true;win.setTimeout(()=>{suppress=false;},80);const p=local(d.svg,e),a=getAnnotation(d.id);if(a)try{await onMove({...structuredClone(a),position:position(d.g,d.xy[0]+p.x-d.p.x,d.xy[1]+p.y-d.p.y)});}catch(error){onError(error.message);}},{signal:events.signal});
 host.addEventListener('pointercancel',()=>{drag?.g.removeAttribute('transform');drag=null;},{signal:events.signal});
 host.addEventListener('click',e=>{if(suppress){suppress=false;e.preventDefault();e.stopImmediatePropagation();}},{capture:true,signal:events.signal});
 host.addEventListener('keydown',async e=>{const g=e.target.closest('[data-annotation-id][role=button]');if(!enabled()||!g||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopImmediatePropagation();const a=getAnnotation(g.dataset.annotationId),rect=g.querySelector('rect');if(!a||!rect)return;const delta=e.shiftKey?20:5;try{await onMove({...structuredClone(a),position:position(g,+rect.getAttribute('x')+(e.key==='ArrowRight'?delta:e.key==='ArrowLeft'?-delta:0),+rect.getAttribute('y')+(e.key==='ArrowDown'?delta:e.key==='ArrowUp'?-delta:0))});host.querySelector(`[data-annotation-id="${a.id}"][role=button]`)?.focus();}catch(error){onError(error.message);}},{capture:true,signal:events.signal});
 return {destroy(){events.abort();}};
}
