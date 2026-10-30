export function scoreScale(values){
 const sorted=values.filter(v=>typeof v==='number'&&Number.isFinite(v)).sort((a,b)=>a-b);
 return sorted.at(-1)||1;
}
export function scoreColor(value,sea,scale){
 if(sea)return '#806a9b';
 if(typeof value!=='number'||!Number.isFinite(value))return '#8d9791';
 const stops=[[165,0,38],[244,109,67],[254,224,139],[255,255,191],[102,189,99],[116,173,209],[49,54,149]];
 const position=Math.max(0,Math.min(1,value/scale))*(stops.length-1),index=Math.min(Math.floor(position),stops.length-2),t=position-index;
 return `rgb(${stops[index].map((v,i)=>Math.round(v+(stops[index+1][i]-v)*t)).join(',')})`;
}
export function scoreFeatures(geometry,values){
 const scale=scoreScale(values.score),sea=new Set(geometry.sea);
 return {type:'FeatureCollection',features:geometry.rings.map((ring,i)=>{
  const coordinates=ring.map(p=>[p[1],p[0]]);
  if(JSON.stringify(coordinates[0])!==JSON.stringify(coordinates.at(-1)))coordinates.push(coordinates[0]);
  return {type:'Feature',id:i,geometry:{type:'Polygon',coordinates:[coordinates]},properties:{index:i,score:values.score[i],color:scoreColor(values.score[i],sea.has(i),scale)}};
 })};
}
