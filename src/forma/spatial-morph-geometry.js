import {spatialGrid} from './spatial-grid.js';
import {IcosahedronGeometry,Matrix4,Quaternion,Vector3} from 'three';
import {color,interpolateRgb} from 'd3';
import {recordId} from './data-identity.js';

const geometry=new IcosahedronGeometry(1,0);
const sphere=Array.from({length:geometry.attributes.position.count},(_,i)=>new Vector3().fromBufferAttribute(geometry.attributes.position,i).toArray());
geometry.dispose();
const lerp=(a,b,p)=>a+(b-a)*p;
const vectorMix=(a,b,p)=>a.map((v,i)=>lerp(v,b[i],p));
export function spatialPose(doc,view,{norm,basis,center,size}){
  const right=new Vector3(...basis[0]),down=new Vector3(...basis[1]),depth=new Vector3().crossVectors(right,down);
  const matrix=new Matrix4().set(...right.toArray(),0,...down.toArray(),0,...depth.toArray(),0,0,0,0,1);
  const quaternion=new Quaternion().setFromRotationMatrix(matrix).toArray();
  const surface=view==='spatial-surface',bubble=view==='spatial-bubbles',hidden=({'spatial-xy':2,'spatial-xz':1,'spatial-yz':0})[view];
  const maximum=Math.max(...doc.data.map(r=>r.size||0),1);
  const objects=doc.data.map(r=>({id:recordId(r),point:['x','y','z'].map((k,j)=>j===hidden?0:norm[j](r[k])),radius:surface?0:.023*(bubble?2.8*Math.sqrt(r.size/maximum):1),z:r.z}));
  return {objects,quaternion,center,size,surface:surface?1:0,collapse:[0,1,2].map(j=>j===hidden?0:1),triangles:spatialGrid(doc.data)||[]};
}
export function mixSpatialPose(a,b,p){
  if(p===0)return a;if(p===1)return b;
  const aa=new Map(a.objects.map(o=>[o.id,o])),bb=new Map(b.objects.map(o=>[o.id,o]));
  const objects=[...new Set([...aa.keys(),...bb.keys()])].map(id=>{
    const old=aa.get(id),next=bb.get(id),u=old||{...next,radius:0},v=next||{...old,radius:0};
    return {...v,point:vectorMix(u.point,v.point,p),radius:lerp(u.radius,v.radius,p),z:lerp(u.z,v.z,p)};
  });
  return {objects,quaternion:new Quaternion().fromArray(a.quaternion).slerp(new Quaternion().fromArray(b.quaternion),p).toArray(),center:vectorMix(a.center,b.center,p),size:lerp(a.size,b.size,p),surface:lerp(a.surface,b.surface,p),collapse:vectorMix(a.collapse,b.collapse,p),triangles:b.triangles.length?b.triangles:a.triangles};
}

// Same faceted spheres and linearly triangulated grid as the native 3D library.
// Every frame updates world vertices. There is no screenshot, dissolve or cut.
export class SpatialMorphLayer{
  constructor(chart){
    this.chart=chart;this.paths=new Map();this.root=chart.el('g',{'data-spatial-morph':'','aria-hidden':'true','pointer-events':'none'},chart.svg);
    chart.svg.insertBefore(this.root,chart.markLayer);
    this.grid=chart.el('g',{'data-spatial-grid':''},this.root);this.faces=chart.el('g',{'data-spatial-faces':''},this.root);
    this.lines=Array.from({length:12},()=>chart.el('path',{fill:'none','stroke-width':.6},this.grid));
  }
  draw(pose,layout){
    this.pose=pose;const chart=this.chart,t=chart.theme,q=new Quaternion().fromArray(pose.quaternion),objects=new Map(pose.objects.map(o=>[o.id,o]));
    const rotate=p=>new Vector3(...p).applyQuaternion(q).toArray();
    const project=p=>{const v=rotate(p);return [pose.center[0]+pose.size*v[0],pose.center[1]+pose.size*v[1],v[2]];};
    const marks=new Map(layout.marks.map(m=>[recordId(layout.doc.data[m.row]),m]));
    const zRange=layout.spatialZDomain,paint=o=>layout.doc.template==='surface3d'?interpolateRgb(t.soft,t.accent)((o.z-zRange[0])/(zRange[1]-zRange[0]||1)):chart.markColor(marks.get(o.id)||layout.marks[0]);
    const corners=Array.from({length:8},(_,i)=>[0,1,2].map(j=>(i&(1<<j)?.5:-.5)*pose.collapse[j]));let gi=0;
    for(let i=0;i<8;i++)for(let j=0;j<3;j++)if(!(i&(1<<j))){const a=project(corners[i]),b=project(corners[i|(1<<j)]),line=this.lines[gi++];line.setAttribute('d',`M${a[0]},${a[1]}L${b[0]},${b[1]}`);line.setAttribute('stroke',i===0?t.secondary:t.line);}
    const faces=[];
    const add=(key,points,fill,shaded=false)=>{
      const pp=points.map(project),rp=points.map(rotate),a=new Vector3(...rp[1]).sub(new Vector3(...rp[0])),b=new Vector3(...rp[2]).sub(new Vector3(...rp[0])),normal=a.cross(b);
      if(normal.lengthSq()<1e-15)return;
      if(shaded&&normal.z>=0)return;
      let tint=fill;
      if(shaded){normal.normalize();const light=Math.max(0,normal.dot(new Vector3(-.3,-.5,-1).normalize())),c=color(fill).rgb(),factor=.68+.32*light;tint=`rgb(${Math.round(c.r*factor)},${Math.round(c.g*factor)},${Math.round(c.b*factor)})`;}
      faces.push({key,pp,fill:tint,depth:pp.reduce((sum,v)=>sum+v[2]/3,0),surface:!shaded});
    };
    for(const o of pose.objects)if(o.radius>0)for(let i=0;i<sphere.length;i+=3)add(`point:${o.id}:${i/3}`,sphere.slice(i,i+3).map(v=>v.map((c,j)=>o.point[j]+c*o.radius)),paint(o),true);
    if(pose.surface>0)for(const ids of pose.triangles){
      const rows=ids.map(id=>objects.get(id));if(rows.some(r=>!r))continue;
      // Each native triangle contracts into its owning sample; records never
      // borrow a neighbour's coordinate. The reverse unfolds the same mesh.
      const points=rows.map((r,i)=>i?vectorMix(rows[0].point,r.point,pose.surface):r.point);
      const avg={...rows[0],z:rows.reduce((sum,r)=>sum+r.z/3,0)};
      add(`surface:${JSON.stringify(ids)}`,points,paint(avg));
    }
    faces.sort((a,b)=>b.depth-a.depth||a.key.localeCompare(b.key));
    const active=new Set();for(const face of faces){active.add(face.key);let node=this.paths.get(face.key);if(!node){node=chart.el('path',{'data-spatial-face':face.key},this.faces);this.paths.set(face.key,node);}
      node.setAttribute('d','M'+face.pp.map(v=>v.slice(0,2).map(n=>n.toFixed(3)).join(',')).join('L')+'Z');node.setAttribute('fill',face.fill);node.setAttribute('stroke',face.surface?t.secondary:face.fill);node.setAttribute('stroke-width',face.surface?.25:.18);node.setAttribute('stroke-opacity',face.surface?.24:1);node.setAttribute('display','');this.faces.append(node);
    }
    for(const [key,node]of this.paths)if(!active.has(key))node.setAttribute('display','none');
    // Transparent original keyed contours retain tooltips, edit actions and
    // annotation anchors while faces are globally sorted by camera depth.
    for(const m of layout.marks){const node=chart.nodes.get(m.key),o=objects.get(recordId(layout.doc.data[m.row]));if(!node||!o)continue;const p=project(o.point),radius=o.radius*pose.size,r=Math.max(5,radius);chart.current.set(m.key,pose.contours?.get(m.key)||Array.from({length:128},(_,i)=>{const a=-Math.PI*.75+i/128*Math.PI*2;return [p[0]+Math.cos(a)*radius,p[1]+Math.sin(a)*radius];}));node.shape.setAttribute('d',`M${p[0]-r},${p[1]}a${r},${r} 0 1,0 ${2*r},0a${r},${r} 0 1,0 ${-2*r},0`);node.shape.setAttribute('fill','transparent');node.shape.setAttribute('stroke','none');node.shape.setAttribute('pointer-events','all');node.texture.setAttribute('opacity',0);}
    this.root.setAttribute('data-world-morph','true');
  }
}
