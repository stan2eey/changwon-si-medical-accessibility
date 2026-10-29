import * as maplibregl from 'maplibre-gl';
export const base=import.meta.env.BASE_URL;
export const fmt=(v,d=1)=>v==null||!Number.isFinite(Number(v))?'미산출':Number(v).toLocaleString('ko-KR',{maximumFractionDigits:d});
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cache=new Map();
export function data(file){if(!cache.has(file))cache.set(file,fetch(`${base}data/${file}`).then(r=>{if(!r.ok)throw new Error(`${file}: HTTP ${r.status}`);return r.json()}).catch(e=>{cache.delete(file);throw e}));return cache.get(file)}
export function createMap(container,{center=[128.56,35.18],zoom=10,interactive=true,onError=()=>{}}={}){
 const map=new maplibregl.Map({container,center,zoom,minZoom:7,maxZoom:19,interactive,attributionControl:true,style:{version:8,sources:{street:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'},satellite:{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:18,attribution:'Tiles © Esri — Esri, Maxar, Earthstar Geographics, GIS User Community'}},layers:[{id:'background',type:'background',paint:{'background-color':'#e7ebe2'}},{id:'street',type:'raster',source:'street'},{id:'satellite',type:'raster',source:'satellite',layout:{visibility:'none'}}]}});
 map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');map.addControl(new maplibregl.ScaleControl({unit:'metric'}));
 map.on('error',e=>onError(e.error?.message||'지도 자료 로딩 오류'));
 return map;
}
export const ready=map=>new Promise(resolve=>map.loaded()?resolve():map.once('load',resolve));
export function setBase(map,type){for(const k of ['street','satellite'])map.setLayoutProperty(k,'visibility',k===type?'visible':'none')}
export async function boundaries(map){const b=await data('boundaries.json');map.addSource('boundaries',{type:'geojson',data:b.boundaries});map.addLayer({id:'boundary',type:'line',source:'boundaries',paint:{'line-color':'#68776d','line-width':.6,'line-opacity':.7}});map.addSource('gu',{type:'geojson',data:b.gu});map.addLayer({id:'gu',type:'line',source:'gu',paint:{'line-color':'#263e34','line-width':1.6}})}
export function boundsFor(g,name){const points=g.rings.filter((r,i)=>!name||g.names[i]===name).flat();if(!points.length)return null;return [[Math.min(...points.map(p=>p[1])),Math.min(...points.map(p=>p[0]))],[Math.max(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0]))]]}
export function moveTo(map,bounds){if(bounds)map.fitBounds(bounds,{padding:35,maxZoom:15,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:650})}
export function facilitiesGeo(all,service){return {type:'FeatureCollection',features:all.filter(f=>Number(f.supply[service])>0).map(f=>({type:'Feature',geometry:{type:'Point',coordinates:[f.lon,f.lat]},properties:{name:f.name,area:f.area,kind:f.kind,supply:f.supply[service],address:f.address}}))}}
export function addFacilities(map,geo){map.addSource('facilities',{type:'geojson',data:geo});map.addLayer({id:'facilities',type:'circle',source:'facilities',paint:{'circle-radius':['interpolate',['linear'],['zoom'],8,2.5,14,6],'circle-color':'#173b38','circle-stroke-color':'#fff','circle-stroke-width':1.3}});map.on('mouseenter','facilities',()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave','facilities',()=>map.getCanvas().style.cursor='');map.on('click','facilities',e=>{const p=e.features[0].properties;new maplibregl.Popup().setLngLat(e.lngLat).setHTML(`<h3>${esc(p.name)}</h3>${esc(p.area)} · ${esc(p.kind)}<br>${esc(p.address)}<p>선택 서비스 등록 공급 ${fmt(p.supply,0)}<br><small>전문의: 명 / 분만: 분만실 병상 수<br>실제 운영·진료 가능 여부와 다릅니다.</small></p>`).addTo(map)})}
export {maplibregl};
