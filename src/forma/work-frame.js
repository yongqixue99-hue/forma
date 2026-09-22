import {applyChartBrand} from './brand-view.js';
import {renderAnnotations,annotationBiases} from './annotation-view.js';
import {createStepScene,workColorMap} from './work-scene.js';
import {stepDomain,stepView,stepMorphDocument,viewFamily} from './work-model.js';

// Frame chrome must be in place before a responsive chart measures its host.
export function framePresentation(frame,{reducedMotion=false}={}){
  const {from,step,plan}=frame,p=reducedMotion?1:frame.progress;
  const morph=!!from&&plan.mode==='morph',outgoing=!!from&&!morph&&p<.28;
  return {p,morph,outgoing,visible:outgoing||morph&&p===0?from:step};
}

/** Owns chart geometry only. UI and MP4 supply their own frame/chrome. */
export class WorkFrameRenderer{
  constructor(host,steps,options={}){this.host=host;this.steps=steps;this.options=options;this.key=null;}
  create(step){
    this.scene?.destroy();
    this.scene=createStepScene(this.host,step,{...this.options,annotationAuto:false,progress:1,interactive:false,axisLabels:true,reducedMotion:false,domain:stepDomain(step,this.steps),colorIndices:workColorMap(step,this.steps)});
  }
  render(frame,{reducedMotion=false}={}){
    const {from,step,plan}=frame,{p,morph,outgoing,visible}=framePresentation(frame,{reducedMotion});
    const dimensions=`${this.options.width||this.host.clientWidth}:${this.options.height||this.host.clientHeight}`;
    const key=`${frame.index}:${from?.id||'intro'}:${morph?`morph:${plan.effect}:${plan.recipe}`:visible.id}:${frame.retarget?'retarget':'canonical'}:${dimensions}`;
    if(key!==this.key){
      const resume=frame.retarget&&morph&&typeof this.scene?.setDocument==='function'&&viewFamily(this.scene.view)===viewFamily(stepView(step));
      this.key=key;if(!resume)this.create(morph?from:visible);
      if(morph&&!resume)renderAnnotations(this.scene,from,{fraction:1});
      this.annotationStartPositions=new Map(this.scene.annotationPositions||[]);
      this.annotationStartBias=new Map(this.scene.annotationBias||annotationBiases(this.scene));
      this.seekMorph=morph?this.scene.setDocument(stepMorphDocument(step),stepView(step),{...step.options,manual:true,resume,effect:plan.effect,recipe:plan.recipe,domain:stepDomain(step,this.steps),colorIndices:workColorMap(step,this.steps)}):null;
    }
    let opacity=1,translate=0,scale=1;
    if(morph)this.seekMorph(p);
    else if(!from)this.scene.render(p);
    else{
      const q=outgoing?Math.min(1,p/.28):Math.max(0,(p-.28)/.72),ease=1-(1-q)**3;
      this.scene.render(outgoing?1:q);
      opacity=outgoing?1-ease:Math.min(1,q*5);
      if(plan.effect==='slide')translate=outgoing?-q*.07:(1-ease)*.09;
      if(plan.effect==='gather')scale=outgoing?1-ease*.75:.86+ease*.14;
    }
    const fraction=Number.isFinite(frame.time)&&frame.end>frame.start?Math.min(1,Math.max(0,(frame.time-frame.start)/(frame.end-frame.start))):p;
    renderAnnotations(this.scene,outgoing?from:step,{from:morph?from:null,positionsFrom:morph?this.annotationStartPositions:null,biasFrom:morph?this.annotationStartBias:null,progress:p,fraction:outgoing?1:fraction,reducedMotion});
    applyChartBrand(this.scene.svg,visible.options);
    this.state={step:visible,opacity,translate,scale,phase:frame.phase,progress:p,plan};
    return this.state;
  }
  destroy(){this.scene?.destroy();this.scene=null;this.key=null;}
}
