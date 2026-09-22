import {ChartScene} from './charts.js';
import {MorphChart} from './morph.js';
import {themeFor} from './palettes.js';
import {escapeHtml as esc} from './data.js';
import {findTemplate} from './catalog.js';
import {canvasSize,canvasFrame,clamp,ease} from './canvas-model.js';

export const canvasVisualCSS=`
.fc-surface{position:relative;width:100%;height:100%;overflow:hidden;background:#f9f8f5;color:#262626;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;isolation:isolate;box-sizing:border-box}
.fc-surface *{box-sizing:border-box}.fc-surface-title{position:absolute;left:3.5%;top:3%;margin:0;font-size:25px;font-weight:500;line-height:1.4;max-width:87%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.fc-surface-index{position:absolute;right:3.5%;top:4%;font-size:11px;color:#8a857d}.fc-surface-footer{position:absolute;left:3.5%;right:3.5%;bottom:1.8%;display:flex;justify-content:space-between;font-size:9px;color:#918b82;overflow:hidden;white-space:nowrap;gap:20px}
.fc-surface-area{position:absolute;left:3.5%;right:3.5%;top:11%;bottom:6%;overflow:visible}
.fc-paint-panel{position:absolute;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--panel-line);background:var(--panel-paper);color:var(--panel-ink);transform-origin:center;will-change:transform,opacity;min-width:0;min-height:0}
.fc-paint-header{padding:16px 20px 0;flex-shrink:0;min-width:0}.fc-paint-header h3{font-size:18px;font-weight:500;line-height:1.4;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fc-paint-header p{font-size:10px;line-height:1.6;margin:5px 0 0;color:var(--panel-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fc-paint-chart{position:relative;min-height:0;flex:1;margin:10px 10px 4px;pointer-events:none}.fc-paint-chart svg{width:100%;height:100%;overflow:visible!important}
.fc-paint-source{font-size:9px;line-height:1.5;color:var(--panel-muted);margin:0 20px;padding:7px 0 11px;border-top:1px solid var(--panel-line);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0}
.fc-surface[data-ground=dark]{background:#202020;color:#e7e5df}.fc-surface[data-ground=dark] .fc-surface-footer,.fc-surface[data-ground=dark] .fc-surface-index{color:#a9a69e}
`;

function transitionStyle(effect,incoming,p){
  const q=ease(p),opacity=incoming?q:1-q;
  if(effect==='slide')return {opacity:1,transform:`translateX(${(incoming?1-q:-q)*108}%)`,clip:'none'};
  if(effect==='rise')return {opacity,transform:`translateY(${(incoming?1-q:-q)*17}%)`,clip:'none'};
  if(effect==='zoom')return {opacity,transform:`scale(${incoming?.9+.1*q:1+.08*q})`,clip:'none'};
  if(effect==='wipe')return {opacity:1,transform:'none',clip:`inset(0 ${incoming?(1-q)*100:0}% 0 ${incoming?0:q*100}%)`};
  return {opacity,transform:'none',clip:'none'};
}
export function canvasRenderItems(project,frame){
  const target=project.scenes[frame.index],old=frame.from===null?null:project.scenes[frame.from],items=[];
  if(!old)return target.panels.map(panel=>({key:panel.id,panel,from:null,mix:1,entry:frame.entry,opacity:1,transform:'none',clip:'none'}));
  const shared=new Set(),q=ease(frame.amount);
  for(const panel of target.panels){
    const from=target.transition==='smart'?old.panels.find(p=>p.id===panel.id&&p.assetId===panel.assetId&&((p.view==='native')===(panel.view==='native'))):null;
    if(from){shared.add(from.id);items.push({key:panel.id,panel:{...panel,...Object.fromEntries(['x','y','w','h'].map(k=>[k,from[k]+(panel[k]-from[k])*q]))},target:panel,from,mix:frame.amount,entry:1,opacity:1,transform:'none',clip:'none'});}
    else items.push({key:`in:${panel.id}`,panel,from:null,mix:1,entry:clamp(frame.amount*1.35),...transitionStyle(target.transition,true,frame.amount)});
  }
  const outgoing=old.panels.filter(panel=>!shared.has(panel.id)).map(panel=>({key:`out:${panel.id}`,panel,from:null,mix:1,entry:1,...transitionStyle(target.transition,false,frame.amount)}));
  return [...outgoing,...items];
}
export class CanvasSurface{
  constructor(host,project){
    this.host=host;this.project=project;this.nodes=new Map();this.scenes=[];
    this.root=document.createElement('div');this.root.className='fc-surface';this.root.innerHTML='<h2 class="fc-surface-title"></h2><span class="fc-surface-index"></span><div class="fc-surface-area"></div><footer class="fc-surface-footer"><span></span><span>FORMA / 数相</span></footer>';host.replaceChildren(this.root);this.area=this.root.querySelector('.fc-surface-area');
  }
  reset(project){this.nodes.forEach(n=>n.scene.destroy());this.nodes.clear();this.area.replaceChildren();this.project=project;}
  frame(time,{sceneIndex,staticFrame=false}={}){
    const project=this.project,frame=Number.isInteger(sceneIndex)?{index:sceneIndex,from:null,amount:1,entry:1}:canvasFrame(project,time),size=canvasSize(project.ratio),current=project.scenes[frame.index];
    if(staticFrame){frame.entry=1;frame.amount=1;frame.from=null;}
    this.root.dataset.ground=project.dark?'dark':'light';this.root.dataset.scene=current.id;this.root.querySelector('h2').textContent=current.name;this.root.querySelector('.fc-surface-index').textContent=`${String(frame.index+1).padStart(2,'0')} / ${String(project.scenes.length).padStart(2,'0')}`;this.root.querySelector('.fc-surface-footer>span').textContent=project.name;
    const items=canvasRenderItems(project,frame),used=new Set();
    for(const item of items){
      const {panel}=item,asset=project.assets.find(a=>a.id===panel.assetId),target=item.target||panel,theme=themeFor(asset.options.palette,asset.options.dark,asset.options.colors),width=Math.max(220,size.width*.93*target.w/100-24),height=Math.max(140,size.height*.83*target.h/100-88),signature=`${asset.id}:${panel.view}:${width}:${height}`,key=item.key;used.add(key);
      let node=this.nodes.get(key);
      if(node&&node.signature!==signature){node.scene.destroy();node.element.remove();this.nodes.delete(key);node=null;}
      if(!node){
        const el=document.createElement('article');el.className='fc-paint-panel';el.dataset.canvasPanel=panel.id;el.setAttribute('aria-label',`${findTemplate(asset.doc.template).name}：${asset.doc.title}`);el.style.setProperty('--panel-paper',theme.bg);el.style.setProperty('--panel-ink',theme.fg);el.style.setProperty('--panel-muted',theme.secondary);el.style.setProperty('--panel-line',theme.line);
        el.innerHTML=`<header class="fc-paint-header"><h3>${esc(asset.doc.title)}</h3><p>${esc(asset.doc.subtitle)}${asset.doc.subtitle?' · ':''}${esc(asset.doc.unit)}</p></header><div class="fc-paint-chart"></div><footer class="fc-paint-source">${esc(asset.doc.source.name)}</footer>`;this.area.append(el);
        const chart=el.querySelector('.fc-paint-chart'),options={...asset.options,width,height,progress:1,compact:target.w<65,interactive:false};
        const scene=panel.view==='native'?new ChartScene(chart,asset.doc,options):new MorphChart(chart,asset.doc,{...options,view:panel.view,reducedMotion:true,showLegend:target.w>65});
        node={element:el,scene,signature};this.nodes.set(key,node);
      }
      const intro=panel.view!=='native'&&frame.index===0?ease(item.entry):1;
      node.element.style.left=`${panel.x}%`;node.element.style.top=`${panel.y}%`;node.element.style.width=`${panel.w}%`;node.element.style.height=`${panel.h}%`;node.element.style.opacity=String(item.opacity*intro);node.element.style.transform=item.transform;node.element.style.clipPath=item.clip;
      node.element.style.zIndex=String(items.indexOf(item));node.element.dataset.assetId=asset.id;
      if(panel.view==='native'){if(node.lastEntry!==item.entry)node.scene.render(item.entry);node.lastEntry=item.entry;}else if(item.from&&item.from.view!==panel.view){node.scene.seekTransition(item.from.view,panel.view,item.mix);node.lastView=null;}else if(node.lastView!==panel.view){node.scene.setView(panel.view,{animate:false});node.lastView=panel.view;}
    }
    for(const [key,node]of this.nodes)if(!used.has(key)){node.scene.destroy();node.element.remove();this.nodes.delete(key);}
    return frame;
  }
  destroy(){this.nodes.forEach(n=>n.scene.destroy());this.nodes.clear();this.host.replaceChildren();}
}
