// Scene definitions also serve the DOM tests; all numbers come from the public release.
export const facilityScenes=[{"scene": "facilities-advanced", "label": "상급종합병원", "kinds": ["상급종합"]}, {"scene": "facilities-general", "label": "종합병원", "kinds": ["종합병원"]}, {"scene": "facilities-hospital", "label": "병원", "kinds": ["병원"]}, {"scene": "facilities-clinic", "label": "의원", "kinds": ["의원"]}, {"scene": "facilities-care", "label": "요양병원과 정신병원", "kinds": ["요양병원", "정신병원"]}, {"scene": "facilities-dental", "label": "치과병원과 치과의원", "kinds": ["치과병원", "치과의원"]}, {"scene": "facilities-korean-hospital", "label": "한방병원", "kinds": ["한방병원"]}, {"scene": "facilities-korean-clinic", "label": "한의원", "kinds": ["한의원"]}, {"scene": "facilities-public", "label": "보건기관", "kinds": ["보건소", "보건지소", "보건진료소"]}, {"scene": "facilities-midwife", "label": "조산원", "kinds": ["조산원"]}];
export const sceneOrder=["cover", "supply-all", "supply-ob", "supply-peds", "city-facilities", ...facilityScenes.map(s=>s.scene), "jinjeon", "count", "rate", "elderly", "ob-facilities", "delivery-facilities", "delivery-count", "delivery-one"];
export function storyFeatures(g,em,delivery,lowThreshold){
 const sea=new Set(g.sea);
 return {type:'FeatureCollection',features:g.rings.map((ring,i)=>{
  const coords=ring.map(p=>[p[1],p[0]]);if(JSON.stringify(coords[0])!==JSON.stringify(coords.at(-1)))coords.push(coords[0]);
  const known=em.minutes[i]!=null&&!sea.has(i),dk=delivery.minutes[i]!=null&&!sea.has(i);
  return {type:'Feature',id:i,geometry:{type:'Polygon',coordinates:[coords]},properties:{area:g.names[i],sea:sea.has(i),known,deliveryKnown:dk,before:em.minutes[i]??-1,count:delivery.count[i]??-1,low:em.score[i]!=null&&em.score[i]<=lowThreshold&&!sea.has(i)}};
 })};
}
