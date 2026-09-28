import {renderPreviewFrame} from './library-preview-frame.js';

// One observer owns the gallery. Off-screen charts release their SVG and a
// queued visibility callback cannot recreate charts after a route/filter change.
export function createLibraryPreviews({createScene,currentProgress,Observer=globalThis.IntersectionObserver}) {
  const entries=new Map();
  let destroyed=false;
  const observer=new Observer(changes=>{
    if(destroyed)return;
    for(const {target,isIntersecting} of changes){
      const entry=entries.get(target);
      if(!entry)continue;
      if(isIntersecting&&!entry.scene){
        entry.scene=createScene(target,entry.doc,entry.options);
        renderPreviewFrame(entry.scene,currentProgress());
      }else if(!isIntersecting&&entry.scene){
        entry.scene.destroy();entry.scene=null;
      }
    }
  },{rootMargin:'180px'});
  return {
    add(host,doc,options){
      if(destroyed)return;
      const previous=entries.get(host);
      previous?.scene?.destroy();
      entries.set(host,{doc,options,scene:null});
      observer.observe(host);
    },
    render(progress){for(const {scene} of entries.values())renderPreviewFrame(scene,progress);},
    destroy(){
      if(destroyed)return;
      destroyed=true;observer.disconnect();
      for(const {scene} of entries.values())scene?.destroy();
      entries.clear();
    }
  };
}
