// Scene definitions also serve the DOM tests; all numbers come from the public release.
export const sceneOrder=['cover','jinjeon','rate','count','supply-all','supply-ob','supply-peds','elderly','ob-facilities','delivery-facilities','delivery-count','delivery-one','scenario-before','scenario-after'];
export function storyFeatures(g,em,delivery,scenario,lowThreshold){
 const sea=new Set(g.sea);
 return {type:'FeatureCollection',features:g.rings.map((ring,i)=>{
  const coords=ring.map(p=>[p[1],p[0]]);if(JSON.stringify(coords[0])!==JSON.stringify(coords.at(-1)))coords.push(coords[0]);
  const known=em.minutes[i]!=null&&!sea.has(i),dk=delivery.minutes[i]!=null&&!sea.has(i);
  return {type:'Feature',id:i,geometry:{type:'Polygon',coordinates:[coords]},properties:{area:g.names[i],sea:sea.has(i),known,deliveryKnown:dk,before:em.minutes[i]??-1,after:scenario.after_minutes[i]??-1,count:delivery.count[i]??-1,low:em.score[i]!=null&&em.score[i]<=lowThreshold&&!sea.has(i)}};
 })};
}
