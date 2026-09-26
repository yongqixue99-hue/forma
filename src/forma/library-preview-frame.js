// Gallery previews hold their completed frame before the next animation cycle.
const renderedProgress=new WeakMap();
export function renderPreviewFrame(scene,progress){
  if(!scene||renderedProgress.get(scene)===progress)return;
  scene.render(progress);
  renderedProgress.set(scene,progress);
}
