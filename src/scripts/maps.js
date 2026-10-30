import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
// MapLibre v6 needs an explicit bundled worker URL (including the Pages base path).
maplibregl.setWorkerUrl(workerUrl);
export const base=import.meta.env.BASE_URL;
export const fmt=(v,d=1)=>v==null||!Number.isFinite(Number(v))?'미산출':Number(v).toLocaleString('ko-KR',{maximumFractionDigits:d});
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cache=new Map();
export function data(file){if(!cache.has(file))cache.set(file,fetch(`${base}data/${file}`).then(r=>{if(!r.ok)throw new Error(`${file}: HTTP ${r.status}`);return r.json()}).catch(e=>{cache.delete(file);throw e}));return cache.get(file)}
export function createMap(container,{center=[128.56,35.18],zoom=10,interactive=true,onError=()=>{}}={}){
 const key=import.meta.env.PUBLIC_VWORLD_API_KEY;
 if(!key)throw new Error('VWorld web map key is not configured');
 const tile=(layer,extension='png')=>`https://api.vworld.kr/req/wmts/1.0.0/${encodeURIComponent(key)}/${layer}/{z}/{y}/{x}.${extension}`;
 const attribution='<a href="https://www.vworld.kr/" target="_blank" rel="noopener">공간정보 오픈플랫폼(브이월드)</a>';
 const raster=(layer,extension)=>({type:'raster',tiles:[tile(layer,extension)],tileSize:256,maxzoom:19,attribution});
 const map=new maplibregl.Map({container,center,zoom,minZoom:7,maxZoom:19,interactive,attributionControl:{compact:true},style:{version:8,sources:{street:raster('Base'),satellite:raster('Satellite','jpeg'),hybrid:raster('Hybrid')},layers:[{id:'background',type:'background',paint:{'background-color':'#e7ebe2'}},{id:'street',type:'raster',source:'street'},{id:'satellite',type:'raster',source:'satellite',layout:{visibility:'none'}},{id:'hybrid',type:'raster',source:'hybrid',layout:{visibility:'none'}}]}});
 map.addControl(new maplibregl.ScaleControl({unit:'metric'}));
 map.on('error',e=>onError(e.error?.message||'지도 자료 로딩 오류'));
 return map;
}
export const ready=map=>new Promise((resolve,reject)=>{if(map.isStyleLoaded())return resolve();const timer=setTimeout(()=>reject(Error('Map style timeout')),10000);map.once('style.load',()=>{clearTimeout(timer);resolve()})});
export function setBase(map,type){for(const k of ['street','satellite','hybrid'])map.setLayoutProperty(k,'visibility',(k===type||k==='hybrid'&&type==='satellite')?'visible':'none')}
export async function boundaries(map){const b=await data('boundaries.json');map.addSource('boundaries',{type:'geojson',data:b.boundaries});map.addLayer({id:'boundary',type:'line',source:'boundaries',paint:{'line-color':'#68776d','line-width':.6,'line-opacity':.7}});map.addSource('gu',{type:'geojson',data:b.gu});map.addLayer({id:'gu',type:'line',source:'gu',paint:{'line-color':'#263e34','line-width':1.6}})}
export function boundsFor(g,name){const points=g.rings.filter((r,i)=>!name||g.names[i]===name).flat();if(!points.length)return null;return [[Math.min(...points.map(p=>p[1])),Math.min(...points.map(p=>p[0]))],[Math.max(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0]))]]}
export function moveTo(map,bounds){if(bounds)map.fitBounds(bounds,{padding:35,maxZoom:15,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:650})}
export function facilitiesGeo(all,service){return {type:'FeatureCollection',features:all.filter(f=>Number(f.supply[service])>0).map(f=>({type:'Feature',geometry:{type:'Point',coordinates:[f.lon,f.lat]},properties:{name:f.name,area:f.area,kind:f.kind,supply:f.supply[service],address:f.address}}))}}
export function addFacilities(map,geo,currentService=()=>'code24'){map.addSource('facilities',{type:'geojson',data:geo});map.addLayer({id:'facilities',type:'circle',source:'facilities',paint:{'circle-radius':['interpolate',['linear'],['zoom'],8,2.5,14,6],'circle-color':'#173b38','circle-stroke-color':'#fff','circle-stroke-width':1.3}});map.on('mouseenter','facilities',()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave','facilities',()=>map.getCanvas().style.cursor='');map.on('click','facilities',e=>{const p=e.features[0].properties;const s=currentService(),names={code01:'내과',code04:'외과',code10:'산부인과',code11:'소아청소년과',code24:'응급의학과',code07:'심장혈관흉부외과',code02:'신경과',code06:'신경외과'};new maplibregl.Popup().setLngLat(e.lngLat).setHTML(`<h3>${esc(p.name)}</h3>${esc(p.area)}, ${esc(p.kind)}<br>${esc(p.address)}<p>${s==='delivery'?'분만실 병상':esc(names[s]||'선택 진료과')+' 전문의'} ${fmt(p.supply,0)}${s==='delivery'?'병상':'명'}</p>`).addTo(map)})}
export {maplibregl};

// The article owns a single, non-interactive map. Exploration remains a separate page.
export async function createStoryMap(container){
 const [{storyFeatures,facilityScenes,specialtyScenes},g,em,d,fac,o]=await Promise.all([import('./story-model.js'),data('geometry.json'),data('code24-30.json'),data('delivery-30.json'),data('facilities.json'),data('overview.json')]);
 const map=createMap(container,{interactive:false});await ready(map);
 map.setPaintProperty('street','raster-saturation',-.85);map.setPaintProperty('street','raster-opacity',.58);
 const low=o.elderly.find(r=>r.service==='code24').threshold;
 map.addSource('story-grids',{type:'geojson',data:storyFeatures(g,em,d,low)});
 map.addLayer({id:'story-fill',type:'fill',source:'story-grids',layout:{visibility:'none'},paint:{'fill-color':'#bc492d','fill-opacity':.8}});
 map.addLayer({id:'story-outline',type:'line',source:'story-grids',paint:{'line-color':'#fff','line-width':['interpolate',['linear'],['zoom'],9,.1,13,.6,16,1],'line-opacity':.7}});
 await boundaries(map);
 map.addLayer({id:'story-focus',type:'line',source:'boundaries',filter:['==',['get','ADM_NM'],''],paint:{'line-color':'#213f34','line-width':2.3}});
 const localFacilities=fac.filter(f=>f.cw);
 const pointFeatures=list=>({type:'FeatureCollection',features:list.map(f=>({type:'Feature',geometry:{type:'Point',coordinates:[f.lon,f.lat]},properties:{name:f.name}}))});
 map.addSource('story-all-facilities',{type:'geojson',data:pointFeatures(localFacilities)});
 map.addLayer({id:'story-all-facility',type:'circle',source:'story-all-facilities',layout:{visibility:'none'},paint:{'circle-color':'#93999b','circle-radius':2.5,'circle-opacity':.62,'circle-stroke-color':'#fff','circle-stroke-width':.5}});
 map.addSource('story-facilities',{type:'geojson',data:facilitiesGeo(fac,'code24')});
 map.addLayer({id:'story-facility',type:'circle',source:'story-facilities',layout:{visibility:'none'},paint:{'circle-color':'#233e36','circle-radius':['interpolate',['linear'],['zoom'],9,3,13,5.5],'circle-stroke-color':'#fff','circle-stroke-width':1.5}});
 let hospitalLabels=[];
 function positionLabels(){
  const occupied=[],width=map.getContainer().clientWidth,height=map.getContainer().clientHeight;
  for(const {marker,element,facility} of hospitalLabels){
   const point=map.project([facility.lon,facility.lat]),w=element.offsetWidth||120,h=element.offsetHeight||30;
   const choices=[[w/2+14,0],[-w/2-14,0],[0,-h/2-15],[0,h/2+15],[w/2+14,-32],[-w/2-14,32],[w/2+14,38],[-w/2-14,-38]];
   let best=choices[0],bestCost=Infinity;
   for(const offset of choices){const rect={x:point.x+offset[0]-w/2,y:point.y+offset[1]-h/2,w,h};let cost=Math.max(0,8-rect.x)+Math.max(0,rect.x+w-width+8)+Math.max(0,8-rect.y)+Math.max(0,rect.y+h-height+8);cost*=100;for(const r of occupied)if(rect.x<r.x+r.w+5&&rect.x+w+5>r.x&&rect.y<r.y+r.h+5&&rect.y+h+5>r.y)cost+=10000;if(cost<bestCost){bestCost=cost;best=offset}}
   marker.setOffset(best);occupied.push({x:point.x+best[0]-w/2,y:point.y+best[1]-h/2,w,h});
  }
 }
 function showHospitalNames(list){
  hospitalLabels.forEach(item=>item.marker.remove());hospitalLabels=[];
  for(const facility of list){const element=document.createElement('div');element.className='story-hospital-label';element.textContent=facility.name.replace(/^의료법인.*?의료재단/,'');element.title=facility.name;const marker=new maplibregl.Marker({element,anchor:'center'}).setLngLat([facility.lon,facility.lat]).addTo(map);hospitalLabels.push({marker,element,facility})}
  positionLabels();
 }
 map.on('moveend',positionLabels);
 let cameraKey='',lastScene='cover';
 const thresholdColor=field=>['case',['get','sea'],'#806a9b',['<',['get',field],0],'#8d9791',['>',['get',field],30],'#bc492d','#92b5a1'];
 const countColor=['case',['get','sea'],'#806a9b',['!', ['get','deliveryKnown']],'#8d9791',['==',['get','count'],0],'#bc492d',['==',['get','count'],1],'#d5a53b','#4b8b79'];
 function setScene(scene,force=false){
  lastScene=scene;map.resize();let area='',focus='',visible=false,color=thresholdColor('before'),opacity=.8,filter=['has','area'],service='code24',showFac=false;
  if(scene==='jinjeon'){area='마산합포구 진전면';focus='진전면';visible=true;filter=['==',['get','area'],area];showFac=true}
  if(scene==='bukmyeon'){area='의창구 북면';focus='북면';visible=true;filter=['==',['get','area'],area];showFac=true}
  if(scene==='elderly'){visible=true;filter=['get','low'];color='#bc492d'}
  if(['ob-facilities','delivery-facilities','delivery-count','delivery-one'].includes(scene)){area='마산합포구 진동면';focus='진동면';service=scene==='ob-facilities'?'code10':'delivery';showFac=true;visible=scene==='delivery-count'||scene==='delivery-one';filter=['==',['get','area'],area];color=countColor;if(scene==='delivery-one')opacity=['case',['all',['get','deliveryKnown'],['==',['get','count'],1]],.95,.12]}
  map.setFilter('story-focus',['==',['get','ADM_NM'],focus]);map.setFilter('story-fill',filter);map.setFilter('story-outline',filter);map.setLayoutProperty('story-outline','visibility',visible?'visible':'none');map.setLayoutProperty('story-fill','visibility',visible?'visible':'none');map.setPaintProperty('story-fill','fill-color',color);map.setPaintProperty('story-fill','fill-opacity',opacity);
  const facilityStep=facilityScenes.find(s=>s.scene===scene),specialtyStep=specialtyScenes.find(s=>s.scene===scene);
  const whiteMap=Boolean(specialtyStep);
  map.setLayoutProperty('street','visibility',whiteMap?'none':'visible');map.setPaintProperty('background','background-color',whiteMap?'#fff':'#e7ebe2');
  map.setPaintProperty('boundary','line-color',whiteMap?'#d4d9dc':'#68776d');map.setPaintProperty('gu','line-color',whiteMap?'#9aa4aa':'#263e34');
  map.setPaintProperty('story-all-facility','circle-opacity',whiteMap?.22:.62);
  if(scene==='city-facilities'||facilityStep||specialtyStep)showFac=true;
  const facilityData=specialtyStep?facilitiesGeo(localFacilities,specialtyStep.service):(scene==='city-facilities'||facilityStep)?{type:'FeatureCollection',features:fac.filter(f=>f.cw&&(!facilityStep||facilityStep.kinds.includes(f.kind))).map(f=>({type:'Feature',geometry:{type:'Point',coordinates:[f.lon,f.lat]},properties:{name:f.name}}))}:facilitiesGeo(fac,service);
  const overview=scene==='city-facilities',typeView=Boolean(facilityStep);
  map.setLayoutProperty('story-all-facility','visibility',overview||typeView||whiteMap?'visible':'none');
  map.getSource('story-facilities').setData(facilityData);map.setLayoutProperty('story-facility','visibility',showFac&&!overview?'visible':'none');
  map.setPaintProperty('story-facility','circle-color',whiteMap?'#d7242e':typeView?'#c34828':'#233e36');
  map.setPaintProperty('story-facility','circle-radius',whiteMap?8:typeView?(scene==='facilities-advanced'?13:scene==='facilities-general'?10:6):['interpolate',['linear'],['zoom'],9,3,13,5.5]);
  map.setPaintProperty('story-facility','circle-stroke-width',typeView||whiteMap?2:1.5);
  showHospitalNames(['facilities-advanced','facilities-general'].includes(scene)?localFacilities.filter(f=>facilityStep.kinds.includes(f.kind)):[]);

  const nextKey=area||'all';if(nextKey!==cameraKey||force){cameraKey=nextKey;const mobile=matchMedia('(max-width:850px)').matches;const width=map.getContainer().clientWidth;map.fitBounds(boundsFor(g,area),{padding:mobile?{top:35,bottom:35,left:25,right:25}:{top:80,bottom:90,left:Math.round(width*.44),right:50},maxZoom:area?13.2:10.3,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:1100})}
 }
 const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(()=>{cameraKey='';setScene(lastScene,true)});observer?.observe(map.getContainer());
 return {setScene,destroy:()=>{observer?.disconnect();hospitalLabels.forEach(item=>item.marker.remove());map.remove()}};
}
