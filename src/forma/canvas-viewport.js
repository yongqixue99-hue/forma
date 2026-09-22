/** Zoom is a viewport transform: chart dimensions and export options stay intact. */
export function mountCanvasViewport(viewport,{initial,onChange=()=>{}}={}){
  const artboard=viewport.querySelector('.dw-artboard'),doc=viewport.ownerDocument,win=doc.defaultView;
  const space=doc.createElement('div');space.className='dw-artboard-space';artboard.before(space);space.append(artboard);
  let zoom=1,width=0,height=0,dead=false;
  const clamp=value=>Math.max(.5,Math.min(2,Number(value)||1));
  function layout(){
    if(dead)return;const style=win.getComputedStyle(viewport),x=(parseFloat(style.paddingLeft)||0)+(parseFloat(style.paddingRight)||0),y=(parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0);
    const w=viewport.clientWidth-x,h=viewport.clientHeight-y;if(w<=0||h<=0)return;
    width=Math.min(1300,w);height=h;artboard.style.width=`${width}px`;artboard.style.height=`${height}px`;
    space.style.width=`${width*zoom}px`;space.style.height=`${height*zoom}px`;artboard.style.transform=`scale(${zoom})`;viewport.dataset.zoom=String(zoom);
  }
  function setZoom(value){
    const old=zoom,centerX=(viewport.scrollLeft+viewport.clientWidth/2)/old,centerY=(viewport.scrollTop+viewport.clientHeight/2)/old;
    zoom=clamp(value);layout();viewport.scrollLeft=Math.max(0,centerX*zoom-viewport.clientWidth/2);viewport.scrollTop=Math.max(0,centerY*zoom-viewport.clientHeight/2);onChange(zoom);
  }
  const observer=new win.ResizeObserver(layout);observer.observe(viewport);
  zoom=clamp(initial?.zoom);layout();onChange(zoom);
  if(initial){viewport.scrollLeft=initial.left||0;viewport.scrollTop=initial.top||0;}
  return{setZoom,fit(){setZoom(1);viewport.scrollLeft=0;viewport.scrollTop=0;},step(direction){setZoom(Math.round((zoom+direction*.25)*100)/100);},get zoom(){return zoom;},capture(){return{zoom,left:viewport.scrollLeft,top:viewport.scrollTop};},restore(s){setZoom(s?.zoom);viewport.scrollLeft=s?.left||0;viewport.scrollTop=s?.top||0;},refresh:layout,destroy(){dead=true;observer.disconnect();artboard.style.removeProperty('width');artboard.style.removeProperty('height');artboard.style.removeProperty('transform');space.replaceWith(artboard);delete viewport.dataset.zoom;}};
}
