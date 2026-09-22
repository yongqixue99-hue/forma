import {uiText,uiMarkup,uiMessage} from './locale.js';
import * as THREE from 'three';
import {SVGRenderer} from 'three/addons/renderers/SVGRenderer.js';
import {scaleLinear,extent,max,ticks,color as parseColor} from 'd3';
import {regularGrid,orderedDates} from './volume6-data.js';
import {fmt} from './data.js';
import {boundedLabel} from './chart-readability.js';

const unique=a=>[...new Set(a)],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const short=(s,n)=>[...String(s)].length>n?[...String(s)].slice(0,n-1).join('')+'…':String(s);
const phase=(p,d=0,len=.74)=>1-(1-clamp((p-d)/len,0,1))**3;
const vector=p=>new THREE.Vector3(...p);
// Three accepts RGB colours; CSS alpha belongs to the material opacity.
const materialPaint=(value,opacity=1)=>{const color=parseColor(value),alpha=opacity*(color?.opacity??1);return {color:color?.formatHex()||value,opacity:alpha,transparent:alpha<1};};
export const spatialViews={iso:{azimuth:35,elevation:28},front:{azimuth:0,elevation:0},top:{azimuth:0,elevation:89.9}};
export function cameraState(value={}){value=value&&typeof value==='object'?value:{};return {azimuth:clamp(Number.isFinite(value.azimuth)?value.azimuth:35,-180,180),elevation:clamp(Number.isFinite(value.elevation)?value.elevation:28,0,89.9)};}

function spatial(s,doc){
  const {w,h,theme:t}=s,kind=doc.template,annotated=!s.compact&&w>=700;
  const plotW=annotated?w*.73:w,plotH=Math.max(110,h-61),plotTop=20,aspect=plotW/plotH;
  const halfHeight=.98*Math.max(1,1.1/aspect),scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-aspect*halfHeight,aspect*halfHeight,halfHeight,-halfHeight,.1,30);
  const renderer=new SVGRenderer();renderer.setSize(plotW,plotH);renderer.setPrecision(3);renderer.overdraw=0;renderer.setClearColor(t.bg);
  renderer.domElement.setAttribute('x','0');renderer.domElement.setAttribute('y',String(plotTop));renderer.domElement.setAttribute('data-spatial-renderer',kind);renderer.domElement.setAttribute('aria-hidden','true');
  s.svg.append(renderer.domElement);
  scene.add(new THREE.AmbientLight(0xffffff,.95));const light=new THREE.DirectionalLight(0xffffff,.75);light.position.set(-2,5,4);scene.add(light);
  const materials=[],geometries=[],entries=[],labels=[],updates=[];
  const material=(color,opacity=1)=>{const m=new THREE.MeshLambertMaterial({...materialPaint(color,opacity),side:THREE.DoubleSide});materials.push(m);return m;};
  const geometry=g=>(geometries.push(g),g);
  function wire(points,color=t.line,opacity=1,width=.7){const g=geometry(new THREE.BufferGeometry().setFromPoints(points.map(vector))),m=new THREE.LineBasicMaterial({...materialPaint(color,opacity),linewidth:width});materials.push(m);const line=new THREE.Line(g,m);scene.add(line);return line;}
  const hitLayer=s.group({'data-spatial-hits':''}),labelLayer=s.group({'pointer-events':'none'});
  const addLabel=(position,text,options={})=>{const {axis,dx=0,dy=0,...attrs}=options,el=s.text(0,0,text,{'font-size':s.fs-2,'text-anchor':'middle',stroke:t.bg,'stroke-width':3,'paint-order':'stroke','stroke-linejoin':'round',...attrs},labelLayer);labels.push({position,el,dx,dy,axis,text:String(text)});return el;};
  const groupLegend=names=>names.map((label,i)=>({label:boundedLabel(label,Math.min(180,(w-32)/names.length-29),1,s.fs).lines[0],color:t.color(i)}));
  const range=values=>{let [a,b]=extent(values);if(a===b){const pad=Math.abs(a)*.1||1;a-=pad;b+=pad;}return scaleLinear().domain([a,b]).nice(3).domain();};
  let xd,yd,zd,xNames,yNames,axisNames;
  if(kind==='bars3d'){
    xNames=unique(doc.data.map(r=>r.column));yNames=unique(doc.data.map(r=>r.row));xd=[0,xNames.length-1];yd=[0,yNames.length-1];zd=scaleLinear().domain([0,max(doc.data,r=>r.value)]).nice(3).domain();axisNames=[uiText('列分类'),uiText('行分类'),uiMessage`数值 / ${doc.unit}`];
  }else if(kind==='lines3d'){
    xNames=unique(doc.data.map(r=>r.period));yNames=unique(doc.data.map(r=>r.series));xd=[0,xNames.length-1];yd=[0,yNames.length-1];zd=range([0,...doc.data.map(r=>r.value)]);axisNames=[uiText('时期（等间隔）'),uiText('内容序列'),uiMessage`数值 / ${doc.unit}`];
  }else {xd=range(doc.data.map(r=>r.x));yd=range(doc.data.map(r=>r.y));zd=range(doc.data.map(r=>kind==='surface3d'?r.value:r.z));axisNames=['x','y','z'].map(k=>doc.axes[k]);}
  const sx=scaleLinear(xd,[-.65,.65]),sy=scaleLinear(yd,[.55,-.55]),sz=scaleLinear(zd,[0,.96]);
  const base=[-.76,0,.65];
  // Orthographic projection keeps identical objects the same size at different depths.
  const floor=geometry(new THREE.PlaneGeometry(1.52,1.3)),floorMat=new THREE.MeshBasicMaterial({...materialPaint(t.line,.17),side:THREE.DoubleSide});materials.push(floorMat);const plane=new THREE.Mesh(floor,floorMat);plane.rotation.x=-Math.PI/2;plane.position.y=-.004;scene.add(plane);
  for(let i=0;i<=5;i++){const q=i/5;wire([[-.76+q*1.52,0,-.65],[-.76+q*1.52,0,.65]],t.line,.85,.5);wire([[-.76,0,-.65+q*1.3],[.76,0,-.65+q*1.3]],t.line,.85,.5);}
  wire([base,[.83,0,.65]],t.secondary,1,.8);wire([base,[-.76,0,-.75]],t.secondary,1,.8);wire([base,[-.76,1.06,.65]],t.secondary,1,.8);
  addLabel([.87,0,.65],'X',{fill:t.fg,dy:4,axis:'x'});addLabel([-.76,0,-.8],'Y',{fill:t.fg,dy:4,axis:'y'});addLabel([-.76,1.14,.65],'Z',{fill:t.accent,axis:'z'});
  const axisTicks=(domain,names,position,axis)=>{const values=names?names.map((_,i)=>i):ticks(domain[0],domain[1],3);values.forEach((v,i)=>{if(s.compact&&names&&i%Math.ceil(names.length/3)&&i!==names.length-1)return;addLabel(position(v),names?short(names[i],s.compact?3:5):fmt(v),{dy:axis==='x'?16:3,dx:axis==='x'?0:-7,'text-anchor':axis==='x'?'middle':'end','font-size':s.fs-3,axis});});};
  axisTicks(xd,xNames,v=>[sx(v),0,.65],'x');axisTicks(yd,yNames,v=>[-.8,0,sy(v)],'y');axisTicks(zd,null,v=>[-.84,sz(v),.65],'z');
  const objectMark=(mesh,position,row,index,tip)=>{const hit=s.circle(0,0,6,{fill:'transparent',stroke:'none','data-mark':'spatial-observation','data-index':index,'data-world-x':position[0],'data-world-y':position[1],'data-world-z':position[2]},hitLayer);s.tip(hit,tip);entries.push({mesh,position,row,hit});};
  const groups=['scatter3d','bubble3d'].includes(kind)?unique(doc.data.map(r=>r.group)):[];
  if(kind==='bars3d'){
    const barGeometry=geometry(new THREE.BoxGeometry(1,1,1)),barWidth=Math.min(.18,1.04/xNames.length),barDepth=Math.min(.17,.88/yNames.length);
    doc.data.forEach((r,i)=>{const height=sz(r.value),x=sx(xNames.indexOf(r.column)),z=sy(yNames.indexOf(r.row)),color=r.value===max(doc.data,d=>d.value)?t.accent:t.colors[yNames.indexOf(r.row)%t.colors.length],mesh=new THREE.Mesh(barGeometry,material(color));scene.add(mesh);mesh.position.set(x,height/2,z);mesh.scale.set(barWidth,height,barDepth);mesh.userData={value:r.value,height};updates.push(p=>{const f=phase(p,yNames.indexOf(r.row)*.035,.7);mesh.scale.y=height*f;mesh.position.y=height*f/2;mesh.visible=height>0&&f>0;});objectMark(mesh,[x,height,z],r,i,`${r.row} · ${r.column}\n${r.value} ${doc.unit}`);});
  }else if(kind==='surface3d'){
    const grid=regularGrid(doc.data),positions=grid.rows.flatMap(r=>[sx(r.x),sz(r.value),sy(r.y)]),colors=grid.rows.flatMap(r=>{const c=new THREE.Color(t.soft).lerp(new THREE.Color(t.accent),(r.value-zd[0])/(zd[1]-zd[0]));return[c.r,c.g,c.b];}),indices=[];
    for(let y=0;y<grid.ys.length-1;y++)for(let x=0;x<grid.xs.length-1;x++){const a=y*grid.xs.length+x,b=a+1,c=a+grid.xs.length,d=c+1;indices.push(a,c,b,b,c,d);}
    const geo=geometry(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();const m=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.85});materials.push(m);const mesh=new THREE.Mesh(geo,m);scene.add(mesh);
    const wireMat=new THREE.MeshBasicMaterial({color:t.fg,wireframe:true,transparent:true,opacity:.17});materials.push(wireMat);scene.add(new THREE.Mesh(geo,wireMat));
    updates.push(p=>{const f=phase(p,.04,.8),a=geo.attributes.position;for(let i=0;i<grid.rows.length;i++)a.setY(i,positions[i*3+1]*f);a.needsUpdate=true;});
    grid.rows.forEach((r,i)=>objectMark(null,[sx(r.x),sz(r.value),sy(r.y)],r,i,uiMessage`${doc.axes.x}：${r.x}\n${doc.axes.y}：${r.y}\n${doc.axes.z}：${r.value}\n相邻采样点之间线性连接`));
  }else if(kind==='lines3d'){
    const pointGeometry=geometry(new THREE.IcosahedronGeometry(.019,0));
    yNames.forEach((name,j)=>{const rows=xNames.map(period=>doc.data.find(r=>r.period===period&&r.series===name)),col=t.color(j),mat=material(col),coordinates=rows.map((r,i)=>[sx(i),sz(r.value),sy(j)]);
      rows.forEach((r,i)=>{const mesh=new THREE.Mesh(pointGeometry,mat),position=coordinates[i];mesh.position.copy(vector(position));scene.add(mesh);updates.push(p=>{const f=phase(p,i/rows.length*.55+j*.035,.3);mesh.scale.setScalar(f);mesh.visible=f>0;});objectMark(mesh,position,r,doc.data.indexOf(r),`${r.series} · ${r.period}\n${r.value} ${doc.unit}`);});
      for(let i=1;i<coordinates.length;i++){const a=coordinates[i-1],b=coordinates[i],line=wire([a,a],col,.95,1.4);updates.push(p=>{const f=phase(p,(i-1)/(coordinates.length-1)*.55+j*.035,.3),arr=line.geometry.attributes.position;arr.setXYZ(1,...a.map((v,k)=>v+(b[k]-v)*f));arr.needsUpdate=true;line.visible=f>0;});}
    });s.legend(groupLegend(yNames),16,13);
  }else {
    const rows=kind==='trajectory3d'?orderedDates(doc.data):doc.data,pointGeometry=geometry(new THREE.IcosahedronGeometry(kind==='trajectory3d'?.024:.031,0));
    const pointMaterials=(groups.length?groups:[t.fg,t.accent]).map((g,i)=>material(groups.length?t.color(i):g));
    rows.forEach((r,i)=>{const end=kind==='trajectory3d'&&i===rows.length-1,mesh=new THREE.Mesh(pointGeometry,pointMaterials[groups.length?groups.indexOf(r.group):end?1:0]),position=[sx(r.x),sz(r.z),sy(r.y)];mesh.position.copy(vector(position));scene.add(mesh);updates.push(p=>{const f=phase(p,i/rows.length*.4,.47);mesh.scale.setScalar(f*(kind==='bubble3d'?2.8*Math.sqrt(r.size/max(doc.data,d=>d.size)):end?1.5:1));mesh.visible=f>0;});objectMark(mesh,position,r,i,`${r.label||r.period}${r.group?' · '+r.group:''}\n${doc.axes.x}：${r.x}\n${doc.axes.y}：${r.y}\n${doc.axes.z}：${r.z}${kind==='bubble3d'?'\n'+doc.axes.size+'：'+r.size+uiText('（投影面积）'):''}`);});
    if(kind==='trajectory3d'){
      const coordinates=rows.map(r=>[sx(r.x),sz(r.z),sy(r.y)]);for(let i=1;i<coordinates.length;i++){const a=coordinates[i-1],b=coordinates[i],line=wire([a,a],i===coordinates.length-1?t.accent:t.fg,.9,1.2);updates.push(p=>{const f=phase(p,(i-1)/(coordinates.length-1)*.68,.2),arr=line.geometry.attributes.position;arr.setXYZ(1,...a.map((v,j)=>v+(b[j]-v)*f));arr.needsUpdate=true;line.visible=f>0;});}
      s.text(16,13,uiMessage`起点 ${rows[0].period.slice(5)} → 终点 ${rows.at(-1).period.slice(5)}`,{'font-size':s.fs-2});
    }else s.legend(groupLegend(groups),16,13);
  }
  if(!groups.length&&!['trajectory3d','lines3d'].includes(kind))s.text(16,13,kind==='surface3d'?uiMessage`${doc.data.length} 个采样点 · 线性网格面`:uiText('柱高从零量起'),{'font-size':s.fs-2});
  if(annotated){const left=w*.77,domains=[xd,yd,zd];s.text(left,35,uiText('坐标 / 量程'),{'font-size':11});axisNames.forEach((name,i)=>{const heading=boundedLabel(`${['X','Y','Z'][i]}  ${name}`,w-left-12,2,11);heading.lines.forEach((text,row)=>s.tip(s.text(left,72+i*67+row*14,text,{fill:i===2?t.accent:t.fg,'font-size':11}),name));const names=i===0?xNames:i===1?yNames:null,detail=names?names.join(' · '):`${fmt(domains[i][0])} — ${fmt(domains[i][1])}`,range=s.text(left,98+i*67,short(detail,Math.floor((w-left-16)/10)),{'font-size':10});s.tip(range,detail);s.line(left,112+i*67,w-12,112+i*67,{'stroke-width':.6});});}
  else axisNames.forEach((name,i)=>{const label=s.text(12+i*(w-24)/3,h-5,`${['X','Y','Z'][i]} ${short(name,Math.max(4,Math.floor((w-24)/3/(s.fs-2)*1.35)-2))}`,{'font-size':s.fs-3});s.tip(label,name);});
  if(kind==='bubble3d'){
    const largest=max(doc.data,d=>d.size);
    if(annotated&&h>=310){const left=w*.77,y=Math.min(h-73,286);const heading=s.text(left,y,uiMessage`面积 / ${short(doc.axes.size,15)}`,{'font-size':10});s.tip(heading,doc.axes.size);[largest/4,largest].forEach((value,i)=>{const radius=11*Math.sqrt(value/largest),cx=left+15+i*65,cy=y+28;s.circle(cx,cy,radius,{fill:'none',stroke:t.secondary,'stroke-width':.8});const key=s.text(cx+radius+6,cy+3,fmt(value),{'font-size':9});s.tip(key,`${doc.axes.size}：${value}`);});}
    else {const label=s.text(plotW-12,13,uiMessage`面积：${short(doc.axes.size,Math.max(5,Math.floor((plotW-180)/8)))}`,{'text-anchor':'end','font-size':s.fs-3});s.tip(label,doc.axes.size);}
  }
  let state=cameraState(s.options.camera3d),last='',drag=null;
  function render(p=s.p){
    const signature=`${p}/${state.azimuth}/${state.elevation}`;if(signature===last)return;last=signature;
    updates.forEach(update=>update(p));const az=(state.azimuth+(s.options.orbit?0:10*(1-phase(p))))*Math.PI/180,el=state.elevation*Math.PI/180;
    camera.position.set(Math.sin(az)*Math.cos(el)*5,.45+Math.sin(el)*5,Math.cos(az)*Math.cos(el)*5);camera.lookAt(0,.45,0);camera.updateMatrixWorld();renderer.render(scene,camera);
    const project=position=>{const v=vector(position).project(camera);return{x:(v.x+1)*plotW/2,y:plotTop+(1-v.y)*plotH/2,z:v.z};};
    const origin=project(base),axisEnds={x:[.83,0,.65],y:[-.76,0,-.75],z:[-.76,1.06,.65]},axisLengths=Object.fromEntries(Object.entries(axisEnds).map(([k,v])=>{const q=project(v);return[k,Math.hypot(q.x-origin.x,q.y-origin.y)];})),occupied=[];
    labels.forEach(({position,el,dx,dy,axis,text})=>{const point=project(position),font=+el.getAttribute('font-size'),width=[...text].reduce((n,c)=>n+(c.charCodeAt(0)>255?1:.58),0)*font,anchor=el.getAttribute('text-anchor'),x=clamp(point.x+dx,width+4,plotW-width-4),y=clamp(point.y+dy,28,h-26),left=anchor==='end'?x-width:anchor==='middle'?x-width/2:x,box={x:left,y:y-font,w:width,h:font+3};
      const visible=axisLengths[axis]>38&&!occupied.some(b=>box.x<b.x+b.w+3&&box.x+box.w+3>b.x&&box.y<b.y+b.h+3&&box.y+box.h+3>b.y);if(visible)occupied.push(box);el.setAttribute('x',x);el.setAttribute('y',y);el.setAttribute('opacity',visible?'1':'0');});
    // Transparent hit targets preserve original values, independently of face sorting.
    entries.map(entry=>({...entry,point:project(entry.position)})).sort((a,b)=>b.point.z-a.point.z).forEach(entry=>{entry.hit.setAttribute('cx',entry.point.x);entry.hit.setAttribute('cy',entry.point.y);entry.hit.style.pointerEvents=p>.9?'auto':'none';hitLayer.append(entry.hit);});
    s.svg.setAttribute('data-camera-azimuth',String(state.azimuth));s.svg.setAttribute('data-camera-elevation',String(state.elevation));
  }
  const setCamera=value=>{state=cameraState(value);last='';render();s.options.onCameraChange?.({...state});};
  s.spatial={scene,camera,entries,domains:{x:xd,y:yd,z:zd},setCamera,getCamera:()=>({...state})};s.add(render);
  const listeners=[];
  if(s.options.orbit&&s.options.interactive!==false){
    s.svg.setAttribute('tabindex','0');s.svg.setAttribute('aria-label',uiMessage`${doc.title}。可拖动或用方向键旋转三维视角。`);s.svg.style.touchAction='none';s.svg.style.cursor='grab';
    const on=(name,fn)=>{s.svg.addEventListener(name,fn);listeners.push([name,fn]);};
    on('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,...state};s.svg.setPointerCapture?.(e.pointerId);s.svg.style.cursor='grabbing';});
    on('pointermove',e=>{if(!drag)return;setCamera({azimuth:drag.azimuth+(e.clientX-drag.x)*.4,elevation:drag.elevation+(e.clientY-drag.y)*.3});});
    const end=()=>{drag=null;s.svg.style.cursor='grab';};on('pointerup',end);on('pointercancel',end);on('lostpointercapture',end);
    on('keydown',e=>{const deltas={ArrowLeft:[-6,0],ArrowRight:[6,0],ArrowUp:[0,6],ArrowDown:[0,-6]};if(!deltas[e.key])return;e.preventDefault();const [x,y]=deltas[e.key];setCamera({azimuth:state.azimuth+x,elevation:state.elevation+y});});
  }
  s.cleanups.push(()=>{listeners.forEach(([name,fn])=>s.svg.removeEventListener(name,fn));geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());scene.clear();});
}
export const spatialRenderers={scatter3d:spatial,bars3d:spatial,surface3d:spatial,trajectory3d:spatial,bubble3d:spatial,lines3d:spatial};
