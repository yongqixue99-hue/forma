// Keep a coordinate reference only when both its geometry and meaning agree.
// Data-value labels are excluded: they belong to the settled encoding.
export function sameGuideCoordinates(from,to){
 if(!from||!to)return false;
 const frame=layout=>({plot:layout.plot,guides:layout.guides,labels:layout.labels.filter(l=>!l.dataLabel)});
 return JSON.stringify(frame(from))===JSON.stringify(frame(to));
}
export function matchingGuideFrame(from,to){
 if(!from?.doc||!to?.doc||from.doc.family!==to.doc.family)return false;
 if(!['observations','matrix','ordered-estimates','trajectory'].includes(to.doc.family))return false;
 return sameGuideCoordinates(from,to);
}
