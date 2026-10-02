import {test} from 'node:test';import assert from 'node:assert/strict';import {polygonArea} from 'd3';
import {Window} from 'happy-dom';
import {getExample} from '../../src/forma/catalog.js';import {withRecordIds,recordId} from '../../src/forma/data-identity.js';
import {scientificDocument} from '../../src/forma/scientific-rules.js';
import {layoutCompletionResearch,interpolateCompletionResearchMark} from '../../src/forma/completion-research-morph.js';
import {layoutCompletionNative,interpolateCompletionNativeMark} from '../../src/forma/completion-native-morph.js';
import {layoutConfusion,interpolateConfusionMark} from '../../src/forma/diagnostic-morph.js';
import {pointMix} from '../../src/forma/scientific-geometry.js';
import {layoutUnivariate,interpolateAnalyticalMark} from '../../src/forma/analytical-morph.js';
import {ScientificMorphChart} from '../../src/forma/scientific-morph.js';
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol+Math.max(Math.abs(a),Math.abs(b))*2e-12,`${a} != ${b}`),centroid=pts=>pts.reduce((c,p)=>[c[0]+p[0]/pts.length,c[1]+p[1]/pts.length],[0,0]);
const doc=id=>scientificDocument({doc:withRecordIds(getExample(id),{legacyNamespace:'polish-test:'+id})});
const same=(a,b)=>b.marks.find(n=>n.key===a.key),points=(m,n,q)=>m.points.map((p,i)=>pointMix(p,n.points[i],q));
function covarianceArea(centers){const [mx,my]=centroid(centers),xx=centers.reduce((s,p)=>s+(p[0]-mx)**2,0),yy=centers.reduce((s,p)=>s+(p[1]-my)**2,0),xy=centers.reduce((s,p)=>s+(p[0]-mx)*(p[1]-my),0);return xx*yy-xy*xy;}
function ends(pts){return[pointMix(pts[0],pts[96],.5),pointMix(pts[32],pts[64],.5)];}

test('omics axis changes retain a two-dimensional point cloud and an explicit downward alternate scale',()=>{
 for(const id of ['volcano','ma','manhattan'])for(const [w,h]of [[800,440],[300,220]]){
  const d=doc(id),snapshot=structuredClone(d),a=layoutCompletionResearch(d,'complete-research-'+id,w,h),b=layoutCompletionResearch(d,'complete-research-'+id+'-alternate',w,h);
  assert.ok(b.scales.y.range()[1]>b.scales.y.range()[0],id+' direction');
  for(const q of [.1,.25,.5,.75,.9]){const cloud=a.marks.filter(m=>m.original).map(m=>centroid(points(m,same(m,b),q)));assert.ok(covarianceArea(cloud)>covarianceArea(a.marks.filter(m=>m.original).map(m=>m.point))*.1,id+' collapsed at '+q);}
  for(const m of b.marks.filter(m=>m.original)){near(b.scales.x.invert(m.point[0]),m.projection.x);near(b.scales.y.invert(m.point[1]),m.projection.y);}
  assert.deepEqual(d,snapshot);assert.deepEqual(a.marks.map(m=>m.key),b.marks.map(m=>m.key));
 }
});

test('PCA loading vectors retain radial magnitude through both directions and interrupted turns',()=>{
 const d=doc('biplot'),snapshot=structuredClone(d),a=layoutCompletionResearch(d,'complete-research-biplot'),b=layoutCompletionResearch(d,'complete-research-biplot-alternate');
 for(const [from,to]of [[a,b],[b,a]])for(const m of from.marks.filter(m=>m.role==='observation'&&d.data[m.row].kind==='loading')){
  const n=same(m,to),distance=pts=>{const [start,end]=ends(pts);return Math.hypot(end[0]-start[0],end[1]-start[1]);},expected=distance(m.points);
  for(const q of [.1,.25,.5,.75,.9])near(distance(interpolateCompletionResearchMark(m.points,m,n,q)),expected,1e-5);
  const interrupted=interpolateCompletionResearchMark(m.points,m,n,.37);
  for(const q of [.1,.5,.9])near(distance(interpolateCompletionResearchMark(interrupted,n,m,q)),expected,1e-5);
  assert.strictEqual(interpolateCompletionResearchMark(interrupted,n,m,0),interrupted);assert.strictEqual(interpolateCompletionResearchMark(interrupted,n,m,1),m.points);
 }
 assert.deepEqual(d,snapshot);
});

test('PCA score circles rotate without shrinking their radial distance or their glyph area',()=>{
 const d=doc('biplot'),a=layoutCompletionResearch(d,'complete-research-biplot'),b=layoutCompletionResearch(d,'complete-research-biplot-alternate');
 for(const m of a.marks.filter(m=>m.role==='observation'&&d.data[m.row].kind==='score')){const n=same(m,b),oldCenter=centroid(m.points),expected=Math.hypot(oldCenter[0]-m.rotationPivot[0],oldCenter[1]-m.rotationPivot[1]);
  for(const q of [.25,.5,.75]){const current=interpolateCompletionResearchMark(m.points,m,n,q),center=centroid(current);near(Math.hypot(center[0]-m.rotationPivot[0],center[1]-m.rotationPivot[1]),expected);near(Math.abs(polygonArea(current)),Math.abs(polygonArea(m.points)),1e-5);}}
});

test('spectrogram cells share one nonzero area ratio, fit the plot and preserve an orthogonal grid and raw power',()=>{
 for(const [w,h]of [[800,440],[300,220]]){const d=doc('spectrogram'),snapshot=structuredClone(d),a=layoutCompletionNative(d,'complete-native-spectrogram',w,h),b=layoutCompletionNative(d,'complete-native-spectrogram-transposed',w,h);
  for(const [from,to]of [[a,b],[b,a]])for(const q of [.1,.25,.5,.75,.9]){const cells=from.marks.filter(m=>m.role==='spectrogram-cell'),centers=[];let areaRatio;
   for(const m of cells){const n=same(m,to),current=interpolateCompletionNativeMark(m.points,m,n,q),area=Math.abs(polygonArea(current));const ratio=area/Math.abs(polygonArea(m.points));if(areaRatio===undefined)areaRatio=ratio;near(ratio,areaRatio);assert.ok(ratio>.15&&ratio<=1+1e-7);for(const [xx,yy]of current){assert.ok(xx>=to.plot.x-1e-7&&xx<=to.plot.x+to.plot.w+1e-7);assert.ok(yy>=to.plot.y-1e-7&&yy<=to.plot.y+to.plot.h+1e-7);}
    const u=[current[32][0]-current[0][0],current[32][1]-current[0][1]],v=[current[64][0]-current[32][0],current[64][1]-current[32][1]];near(u[0]*v[0]+u[1]*v[1],0,1e-5);centers.push(centroid(current));assert.equal(n.value,m.value);assert.equal(n.time,m.time);assert.equal(n.frequency,m.frequency);
   }assert.ok(covarianceArea(centers)>.02*covarianceArea(cells.map(m=>centroid(m.points))),'grid collapsed at '+q);}
  assert.deepEqual(d,snapshot);
 }
});

test('spectrogram rotation resumes from actual displayed cell frames without jumps or clipping',()=>{
 const d=doc('spectrogram'),a=layoutCompletionNative(d,'complete-native-spectrogram'),b=layoutCompletionNative(d,'complete-native-spectrogram-transposed');
 for(const m of a.marks.filter(m=>m.role==='spectrogram-cell')){const n=same(m,b),current=interpolateCompletionNativeMark(m.points,m,n,.37);assert.strictEqual(interpolateCompletionNativeMark(current,n,m,0),current);for(const q of [.15,.5,.85]){const resumed=interpolateCompletionNativeMark(current,n,m,q);assert.ok(Math.abs(polygonArea(resumed))>Math.abs(polygonArea(m.points))*.1);for(const [xx,yy]of resumed){assert.ok(xx>=a.plot.x-1e-7&&xx<=a.plot.x+a.plot.w+1e-7);assert.ok(yy>=a.plot.y-1e-7&&yy<=a.plot.y+a.plot.h+1e-7);}assert.ok(resumed.flat().every(Number.isFinite));}assert.strictEqual(interpolateCompletionNativeMark(current,n,m,1),m.points);}
});

test('cost-to-savings flips share one threshold phase across models and avoid a globally flat middle curve',()=>{
 const d=doc('costcurve'),snapshot=structuredClone(d),a=layoutCompletionNative(d,'complete-native-costcurve'),b=layoutCompletionNative(d,'complete-native-costcurve-savings');
 for(const [from,to]of [[a,b],[b,a]])for(const q of [.25,.5,.75]){const marks=from.marks.filter(m=>m.role==='metric-point'),ys=[],phaseByThreshold=new Map();
  for(const m of marks){const n=same(m,to),current=interpolateCompletionNativeMark(m.points,m,n,q),c=centroid(current),oldCenter=centroid(m.points),newCenter=centroid(n.points);ys.push(c[1]);if(Math.abs(newCenter[1]-oldCenter[1])>1e-5){const phase=(c[1]-oldCenter[1])/(newCenter[1]-oldCenter[1]);if(phaseByThreshold.has(m.threshold))near(phase,phaseByThreshold.get(m.threshold));phaseByThreshold.set(m.threshold,phase);}assert.equal(m.recordIds.length,d.data.filter(r=>r.model===m.group).length);}
  assert.ok(Math.max(...ys)-Math.min(...ys)>10,'all models collapsed at '+q);
 }assert.deepEqual(d,snapshot);
});

test('cost sweep connectors stay joined to their exact threshold points and retain stroke width',()=>{
 const d=doc('costcurve'),a=layoutCompletionNative(d,'complete-native-costcurve'),b=layoutCompletionNative(d,'complete-native-costcurve-savings');
 for(const [from,to]of [[a,b],[b,a]])for(const q of [.2,.5,.8])for(const m of from.marks.filter(m=>m.role==='metric-link')){const n=same(m,to),current=interpolateCompletionNativeMark(m.points,m,n,q),[start,end]=ends(current),target=from.marks.find(point=>point.role==='metric-point'&&point.threshold===m.threshold&&point.colorIdentity===m.colorIdentity),targetNext=same(target,to),endCenter=centroid(interpolateCompletionNativeMark(target.points,target,targetNext,q));near(end[0],endCenter[0]);near(end[1],endCenter[1]);const width=Math.hypot(current[0][0]-current[96][0],current[0][1]-current[96][1]);near(width,1.2);assert.ok(start.every(Number.isFinite));}
});

test('positive confusion cells remain visible through denominator changes and zeros never become tokens',()=>{
 const d=doc('confusion');d.data[1].count=0;const snapshot=structuredClone(d),views=['confusion-counts','confusion-bubbles','confusion-rows','confusion-columns'];
 for(const from of views)for(const to of views){const a=layoutConfusion(d,from,800,440),b=layoutConfusion(d,to,800,440);if(a.marks[0].quantity===b.marks[0].quantity)continue;
  for(const m of a.marks){const n=same(m,b),current=interpolateConfusionMark(m.points,m,n,.5),area=Math.abs(polygonArea(current));assert.ok(area>(m.value>0?1: -1e-9));if(m.value===0)near(area,0);assert.equal(m.value,n.value);assert.equal(m.key,n.key);assert.strictEqual(interpolateConfusionMark(m.points,m,n,0),m.points);assert.strictEqual(interpolateConfusionMark(m.points,m,n,1),n.points);const interrupted=interpolateConfusionMark(m.points,m,n,.31);assert.strictEqual(interpolateConfusionMark(interrupted,n,m,0),interrupted);assert.strictEqual(interpolateConfusionMark(interrupted,n,m,1),m.points);assert.ok(interpolateConfusionMark(interrupted,n,m,.5).flat().every(Number.isFinite));}
 }assert.deepEqual(d,snapshot);
});

test('integrated research rotations retain exact seek endpoints, nodes and interruption state',async()=>{
 const win=new Window();try{for(const [id,from,to]of [['biplot','complete-research-biplot','complete-research-biplot-alternate'],['spectrogram','complete-native-spectrogram','complete-native-spectrogram-transposed'],['costcurve','complete-native-costcurve','complete-native-costcurve-savings'],['confusion','confusion-counts','confusion-columns']]){
  const d=doc(id),chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:from,width:800,height:440}),original=chart.layout,nodes=new Map([...chart.nodes].map(([key,value])=>[key,value.shape])),seek=chart.setDocument(d,to,{manual:true,effect:'guided'}),next=chart.layout;seek(.5);const custom=id==='biplot'?interpolateCompletionResearchMark:id==='confusion'?interpolateConfusionMark:interpolateCompletionNativeMark;let verified=0;for(const m of original.marks){const n=same(m,next),expected=custom(m.points,m,n,.5);if(expected){assert.deepEqual(chart.current.get(m.key),expected,id+' integrated middle '+m.role);verified++;}}assert.ok(verified>0,id+' custom motion dispatched');const frame=structuredClone([...chart.current]);seek(1);seek(.5);assert.deepEqual([...chart.current],frame,id);seek(0);for(const m of original.marks)assert.deepEqual(chart.current.get(m.key),m.points,id+' source');seek(1);for(const m of next.marks)assert.deepEqual(chart.current.get(m.key),m.points,id+' destination');for(const [key,node]of nodes)assert.equal(chart.nodes.get(key).shape,node);seek(.37);const interrupted=structuredClone([...chart.current]),resume=chart.setDocument(d,from,{manual:true,resume:true});resume(0);assert.deepEqual([...chart.current],interrupted);resume(.5);assert.ok([...chart.current.values()].flat(2).every(Number.isFinite));resume(1);for(const m of chart.layout.marks)assert.deepEqual(chart.current.get(m.key),m.points);chart.destroy();}}
 finally{await win.happyDOM.close();}
});


test('ECDF dormant bins and frequency helpers stay within probability coordinates without losing counts',()=>{
 const d=doc('histogram'),snapshot=structuredClone(d),l=layoutUnivariate(d,'uni-ecdf');
 for(const m of l.marks.filter(m=>m.role==='bin')){near(Math.abs(polygonArea(m.points)),0);assert.equal(m.opacity,0);assert.equal(m.value,l.histogram.bins[m.index].count);assert.equal(m.binToken.count,l.histogram.bins[m.index].count);}
 for(const m of l.marks.filter(m=>['bin','frequency-link'].includes(m.role)))for(const [x,y]of m.points){assert.ok(x>=l.plot.x-.800001&&x<=l.plot.x+l.plot.w+.800001);assert.ok(y>=l.plot.y-.800001&&y<=l.plot.y+l.plot.h+.800001);}
 assert.deepEqual(d,snapshot);
});

test('frequency and cumulative summaries keep positive bin tokens visible and exact endpoints',()=>{
 const d=doc('histogram'),a=layoutUnivariate(d,'uni-frequency'),b=layoutUnivariate(d,'uni-cumulative');
 for(const [from,to]of [[a,b],[b,a]])for(const m of from.marks.filter(m=>m.role==='bin')){const n=same(m,to),current=interpolateAnalyticalMark(m.points,m,n,.5);assert.ok(current);if(n.value>0)assert.ok(Math.abs(polygonArea(current))>1);assert.equal(m.binToken.count,n.binToken.count);assert.equal(m.binToken.cumulative,n.binToken.cumulative);assert.strictEqual(interpolateAnalyticalMark(m.points,m,n,0),m.points);assert.strictEqual(interpolateAnalyticalMark(m.points,m,n,1),n.points);}
});

test('ECDF unfold never exposes far-offscreen frequency bars in actual intermediate or resumed frames',async()=>{
 const win=new Window();try{const d=doc('histogram');d.source={...d.source,provenance:{edition:'原表',tags:['保留','单位']}};d.data=d.data.map((r,i)=>({...r,originalNote:'样本 '+i,extra:{raw:i}}));const snapshot=structuredClone(d),chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:'uni-cumulative',width:800,height:440}),seek=chart.setDocument(d,'uni-ecdf',{manual:true,effect:'guided'});
  const within=()=>{for(const m of chart.layout.marks.filter(m=>['bin','frequency-link'].includes(m.role))){const points=chart.current.get(m.key);for(const [x,y]of points){assert.ok(x>=chart.layout.plot.x-.800001&&x<=chart.layout.plot.x+chart.layout.plot.w+.800001);assert.ok(y>=chart.layout.plot.y-.800001&&y<=chart.layout.plot.y+chart.layout.plot.h+.800001);}}};
  for(const q of [.15,.4,.5,.65,.75,.9,1]){seek(q);within();}seek(.7);const current=structuredClone([...chart.current]),resume=chart.setDocument(d,'uni-ecdf',{manual:true,resume:true});resume(0);assert.deepEqual([...chart.current],current);for(const q of [.2,.5,.8,1]){resume(q);within();}assert.deepEqual(d,snapshot);assert.deepEqual(chart.doc,snapshot);chart.destroy();
 }finally{await win.happyDOM.close();}
});

test('actual spectrum, lifeline and dose connectors remain attached to their data points during turns and resumed frames',async()=>{
 const win=new Window();try{
  for(const [id,from,to]of [['periodogram','complete-native-periodogram','complete-native-periodogram-cumulative'],['lexis','complete-research-lexis','complete-research-lexis-alternate'],['dose','complete-research-dose','complete-research-dose-alternate']])for(const [aView,bView]of [[from,to],[to,from]])for(const effect of ['guided','smooth','cascade']){
   const d=doc(id),snapshot=structuredClone(d),chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:aView,width:800,height:440}),a=chart.layout,seek=chart.setDocument(d,bView,{manual:true,effect}),b=chart.layout,lines=a.marks.filter(m=>m.ribbonSegment&&m.opacity>0&&same(m,b).opacity>0);let attached=0;
   const verify=()=>{for(const m of lines){const n=same(m,b),[start,end]=ends(chart.current.get(m.key)),fromEnds=ends(m.points),toEnds=ends(n.points),actual=chart.current.get(m.key),width=Math.hypot(actual[0][0]-actual[96][0],actual[0][1]-actual[96][1]),originalWidth=Math.hypot(m.points[0][0]-m.points[96][0],m.points[0][1]-m.points[96][1]);const targetWidth=Math.hypot(n.points[0][0]-n.points[96][0],n.points[0][1]-n.points[96][1]);if(Math.abs(originalWidth-targetWidth)<1e-7)near(width,originalWidth);else assert.ok(width>=Math.min(originalWidth,targetWidth)-1e-7&&width<=Math.max(originalWidth,targetWidth)+1e-7);for(const [i,current]of [[0,start],[1,end]]){const dot=a.marks.find(mark=>mark.radius>0&&mark.opacity>0&&Math.hypot(mark.point[0]-fromEnds[i][0],mark.point[1]-fromEnds[i][1])<1e-7&&same(mark,b).point&&Math.hypot(same(mark,b).point[0]-toEnds[i][0],same(mark,b).point[1]-toEnds[i][1])<1e-7);if(dot){const dotNext=same(dot,b);if(dotNext.opacity>0){const position=centroid(chart.current.get(dot.key));assert.ok(Math.hypot(current[0]-position[0],current[1]-position[1])<1e-7,`${id} ${aView} ${effect} ${m.role} end ${i} detached from ${dot.role}`);attached++;}}}}};
   for(const q of [.3,.7]){seek(q);verify(q);}assert.ok(attached>0,id+' needs actual point attachments');
   if(effect==='guided'){seek(.37);const interrupted=new Map([...chart.current].map(([k,p])=>[k,structuredClone(p)])),resume=chart.setDocument(d,aView,{manual:true,resume:true,effect});resume(0);for(const [k,p]of interrupted)assert.deepEqual(chart.current.get(k),p);resume(.5);for(const m of lines){const [start,end]=ends(chart.current.get(m.key)),displayed=ends(interrupted.get(m.key)),target=ends(m.points);for(const [i,current]of [[0,start],[1,end]]){const expected=pointMix(displayed[i],target[i],.5);near(current[0],expected[0]);near(current[1],expected[1]);}}resume(1);for(const m of chart.layout.marks)assert.deepEqual(chart.current.get(m.key),m.points);}
   assert.deepEqual(d,snapshot);chart.destroy();
  }
 }finally{await win.happyDOM.close();}
});

test('actual observation lanes retain their recorded width, endpoints, null responses and ongoing flags',async()=>{
 const win=new Window();try{for(const id of ['swimmer','eventhistory'])for(const effect of ['guided','cascade']){
  const d=doc(id),snapshot=structuredClone(d),from='complete-research-'+id,to=from+'-alternate',chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:from,width:800,height:440}),a=chart.layout,seek=chart.setDocument(d,to,{manual:true,effect});
  for(const q of [.25,.5,.75]){seek(q);for(const m of a.marks.filter(mark=>mark.role==='observation')){const actual=chart.current.get(m.key),width=Math.hypot(actual[0][0]-actual[96][0],actual[0][1]-actual[96][1]),oldWidth=Math.hypot(m.points[0][0]-m.points[96][0],m.points[0][1]-m.points[96][1]);near(width,oldWidth);if(id==='swimmer'){const center=a.marks.find(mark=>mark.identity===m.identity&&mark.role==='window-center'),bandEnds=ends(actual),lineEnds=ends(chart.current.get(center.key));for(let i=0;i<2;i++){near(bandEnds[i][0],lineEnds[i][0]);near(bandEnds[i][1],lineEnds[i][1]);}}}}
  seek(1);for(const m of chart.layout.marks)assert.deepEqual(chart.current.get(m.key),m.points);assert.deepEqual(d,snapshot);assert.deepEqual(chart.doc,snapshot);chart.destroy();
 }}finally{await win.happyDOM.close();}
});

test('actual cost sweep applies the same threshold phase to every model in every primary effect',async()=>{
 const win=new Window();try{for(const effect of ['guided','smooth','cascade']){
  const d=doc('costcurve'),snapshot=structuredClone(d),chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:'complete-native-costcurve',width:800,height:440}),a=chart.layout,seek=chart.setDocument(d,'complete-native-costcurve-savings',{manual:true,effect}),b=chart.layout;
  for(const q of [.25,.5,.75]){seek(q);const phases=new Map(),ys=[];for(const m of a.marks.filter(mark=>mark.role==='metric-point')){const n=same(m,b),from=centroid(m.points),to=centroid(n.points),current=centroid(chart.current.get(m.key));ys.push(current[1]);if(Math.abs(to[1]-from[1])>1e-7){const phase=(current[1]-from[1])/(to[1]-from[1]);if(phases.has(m.threshold))near(phase,phases.get(m.threshold));phases.set(m.threshold,phase);}}assert.ok(Math.max(...ys)-Math.min(...ys)>10);}
  assert.deepEqual(d,snapshot);chart.destroy();
 }}finally{await win.happyDOM.close();}
});
