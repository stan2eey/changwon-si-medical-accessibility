export function scoreScale(values){
 const sorted=values.filter(v=>typeof v==='number'&&Number.isFinite(v)).sort((a,b)=>a-b);
 return sorted[Math.floor((sorted.length-1)*.95)]||1;
}
export function scoreColor(value,sea,scale){
 if(sea)return '#806a9b';
 if(typeof value!=='number'||!Number.isFinite(value))return '#8d9791';
 const t=Math.max(0,Math.min(1,value/scale)),low=[202,24,39],high=[255,235,231];
 return `rgb(${low.map((v,i)=>Math.round(v+(high[i]-v)*t)).join(',')})`;
}
export function scoreFeatures(geometry,values){
 const scale=scoreScale(values.score),sea=new Set(geometry.sea);
 return {type:'FeatureCollection',features:geometry.rings.map((ring,i)=>{
  const coordinates=ring.map(p=>[p[1],p[0]]);
  if(JSON.stringify(coordinates[0])!==JSON.stringify(coordinates.at(-1)))coordinates.push(coordinates[0]);
  return {type:'Feature',id:i,geometry:{type:'Polygon',coordinates:[coordinates]},properties:{index:i,score:values.score[i],color:scoreColor(values.score[i],sea.has(i),scale)}};
 })};
}
