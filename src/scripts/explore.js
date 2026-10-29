import {data,createMap,ready,boundaries,setBase,boundsFor,moveTo,facilitiesGeo,addFacilities,fmt,esc,maplibregl} from './maps.js';
const $=s=>document.querySelector(s),params=new URLSearchParams(location.search);
let overview,rows,geometry,facilities,map,values,selected=[],sea,requestId=0,mapReady=false;
const service=()=>$('#service').value,cut=()=>$('#cut').value,metric=()=>$('#metric').value;
const info=()=>overview.services[service()];
const numeric=v=>v!=null&&Number.isFinite(Number(v));
function currentRows(){return [$('#district').value,$('#compare').value].filter((x,i,a)=>x&&a.indexOf(x)===i).map(n=>rows.find(r=>r.area===n&&r.service===service()&&r.minutes===Number(cut()))).filter(Boolean)}
function regionSummary(){
 selected=currentRows();const r=selected[0];if(!r)return;
 const birth=service()==='delivery',unit=birth?'명/년':'명',ratio=r.target_population?100*r.over_population/r.target_population:null;
 $('#region-card').innerHTML=`<h3>${esc(r.area)}</h3><span class="small">${esc(info().label)} · ${cut()}분 기준</span><dl><dt>${birth?'전체 연간 기대출생아':'전체 '+esc(info().demand_label)}</dt><dd>${fmt(r.target_population,1)}${unit}</dd><dt>기준시간 초과지역 ${birth?'기대출생아':'거주인구'}</dt><dd><strong>${fmt(r.over_population,1)}${unit} · ${fmt(ratio,1)}%</strong></dd><dt>경로 미산출 / 배편지역</dt><dd>${fmt(r.unknown_population,1)} / ${fmt(r.sea_population,1)}${unit}</dd></dl><small>${birth?'기대출생아는 출산율을 적용한 추정 수요이며 실제 출생 수가 아닙니다.':'실제 의료이용 또는 응급 수용 여부와 다릅니다.'}</small>`;
 $('#definition').textContent=`${info().label} · ${cut()}분 · 분모: ${info().demand_label}. 점수 단위: ${info().unit}. ${birth?'시간·기관 수의 격자 조건은 동일하며 요약 인구는 기대출생아로 가중합니다.':''}`;
 $('#comparison-rows').innerHTML=selected.map(r=>`<tr><th scope="row">${esc(r.area)}</th><td>${fmt(r.target_population,1)}${unit}</td><td>${fmt(r.over_population,1)}${unit}</td><td>${fmt(100*r.over_population/r.target_population,1)}%</td><td>${fmt(r.one_population,1)}${unit}</td><td>${fmt(r.mean,4)}</td><td>${fmt(r.unknown_population,1)} / ${fmt(r.sea_population,1)}${unit}</td></tr>`).join('');
}
function statusOf(i){return sea.has(i)?'sea':values.status[i]}
function stateText(i){const s=statusOf(i);return s==='sea'?'배편 필요 · 차량모형 제외':s==='unknown'?'경로 또는 입력 미산출':s==='no_car_path'?'차량망 연결 경로 없음':s==='over_threshold'?`${cut()}분 내 도달기관 없음`:'권역 내 기관 도달 확인'}
function color(i,max){const st=statusOf(i);if(st==='sea')return '#806a9b';if(st==='unknown'||st==='no_car_path')return '#8d9791';const t=values.minutes[i],v=values.score[i],n=values.count[i];if(metric()==='threshold')return !numeric(t)?'#8d9791':t>Number(cut())?'#b14f34':'#91b4a2';if(metric()==='count')return !numeric(n)?'#8d9791':n===0?'#b14f34':n===1?'#d4ac4e':'#418274';if(metric()==='time'){if(!numeric(t))return '#8d9791';return t>60?'#873726':t>30?'#c67650':t>15?'#becabd':'#44816c'}if(!numeric(v))return '#8d9791';if(v===0)return '#d4ac4e';const x=Math.min(1,v/max),a=[224,233,215],b=[36,104,82];return `rgb(${a.map((v,k)=>Math.round(v+(b[k]-v)*x)).join(',')})`}
function popup(i,lnglat){const r=values,t=r.minutes[i];new maplibregl.Popup().setLngLat(lnglat).setHTML(`<h3>${esc(geometry.names[i])}<br>${esc(geometry.ids[i])}</h3><b>${esc(info().label)} · ${cut()}분</b><p>최소 차량 추정시간: ${numeric(t)?fmt(t,1)+'분':'미산출'}<br>권역 내 기관: ${fmt(r.count[i],0)}곳<br>창원 ${fmt(r.count_cw[i],0)} / 시외 ${fmt(r.count_outside[i],0)}곳<br>두 번째 기관: ${r.second[i]==null?'60분 내 미확인':fmt(r.second[i],1)+'분'}<br>접근성 점수: ${fmt(r.score[i],4)}<br><small>${esc(info().unit)}</small></p><p>${stateText(i)}</p><small>격자별 성·연령 인구는 공개하지 않습니다. 인구는 공간배분 추정치이며 개인·주택의 결과가 아닙니다.</small>`).addTo(map)}
function renderMap(){
 if(!mapReady||!values)return;
 const sorted=values.score.filter(numeric).sort((a,b)=>a-b),max=sorted[Math.floor(sorted.length*.95)]||1;
 const features=geometry.rings.map((ring,i)=>{const coords=ring.map(p=>[p[1],p[0]]);if(JSON.stringify(coords[0])!==JSON.stringify(coords.at(-1)))coords.push(coords[0]);return {type:'Feature',id:i,geometry:{type:'Polygon',coordinates:[coords]},properties:{index:i,color:color(i,max)}}});
 map.getSource('grids').setData({type:'FeatureCollection',features});map.getSource('facilities').setData(facilitiesGeo(facilities,service()));
 const items=metric()==='threshold'?[['#91b4a2',`${cut()}분 이내`],['#b14f34',`${cut()}분 초과`]]:metric()==='count'?[['#b14f34','0곳'],['#d4ac4e','1곳'],['#418274','2곳 이상']]:metric()==='time'?[['#44816c','15분 이내'],['#becabd','15~30분'],['#c67650','30~60분'],['#873726','60분 초과']]:[['#d4ac4e','0점'],['#e0e9d7','낮은 양수 점수'],['#246852',`${fmt(max,3)}점 이상 (조건별 95분위)`]];
 $('#legend').innerHTML=items.concat([['#8d9791','경로·입력 미산출'],['#806a9b','배편 필요 · 차량모형 제외']]).map(([c,t])=>`<div class="legend-row"><span class="swatch" style="background:${c}"></span>${t}</div>`).join('')+'<div>칠해지지 않은 곳: 분석격자 밖</div>';
 $('#status').textContent=`${fmt(geometry.ids.length,0)}개 격자 · ${info().label} · ${cut()}분 결과`;
}
async function update(){const id=++requestId;regionSummary();values=null;if(mapReady){map.getSource('grids').setData({type:'FeatureCollection',features:[]});map.getSource('facilities').setData({type:'FeatureCollection',features:[]})}$('#status').textContent='선택 조건의 결과를 불러오는 중…';try{const v=await data(`${service()}-${cut()}.json`);if(id!==requestId)return;values=v;renderMap();syncURL()}catch(e){if(id!==requestId)return;$('#status').textContent='결과를 불러오지 못했습니다. 다른 조건을 선택하거나 새로고침해 주세요.'}}
function syncURL(){const p=new URLSearchParams({service:service(),cut:cut(),metric:metric(),district:$('#district').value});if($('#compare').value)p.set('compare',$('#compare').value);p.set('base',$('#basemap').value);if(mapReady){const c=map.getCenter();p.set('lat',c.lat.toFixed(5));p.set('lon',c.lng.toFixed(5));p.set('zoom',map.getZoom().toFixed(2))}history.replaceState(null,'',`${location.pathname}?${p}`)}
async function init(){
 [overview,rows]=await Promise.all([data('overview.json'),data('districts.json')]);
 for(const [key,id]of [['service','service'],['cut','cut'],['metric','metric'],['district','district'],['compare','compare'],['base','basemap']]){const value=params.get(key);if(value!=null&&[...$( '#'+id).options].some(o=>o.value===value))$('#'+id).value=value}
 regionSummary();
 $('#gu').onchange=()=>{const gu=$('#gu').value;[...$('#district').options].forEach(o=>o.hidden=!!gu&&!o.value.startsWith(gu+' '));if(gu&&!$('#district').value.startsWith(gu+' '))$('#district').value=[...$('#district').options].find(o=>!o.hidden).value;regionSummary();if(mapReady)moveTo(map,boundsFor(geometry,$('#district').value));syncURL()};
 $('#district').onchange=()=>{regionSummary();if(mapReady)moveTo(map,boundsFor(geometry,$('#district').value));syncURL()};$('#compare').onchange=()=>{regionSummary();syncURL()};
 for(const id of ['service','cut','metric'])$('#'+id).onchange=update;
 $('#basemap').onchange=()=>{if(mapReady)setBase(map,$('#basemap').value);syncURL()};$('#opacity').oninput=()=>{if(mapReady)map.setPaintProperty('grid-fill','fill-opacity',Number($('#opacity').value))};$('#show-facilities').onchange=()=>{if(mapReady)map.setLayoutProperty('facilities','visibility',$('#show-facilities').checked?'visible':'none')};
 $('#share').onclick=async()=>{syncURL();try{await navigator.clipboard.writeText(location.href);$('#status').textContent='현재 위치·과목·지역·조건의 링크를 복사했습니다.'}catch(e){$('#status').textContent='주소창의 링크를 복사하면 선택한 조건을 공유할 수 있습니다.'}};
 $('#download-selection').onclick=()=>{const fields=['area','service','minutes','target_population','over_population','one_population','mean','unknown_population','sea_population'];const lines=[fields.join(','),...selected.map(r=>fields.map(k=>`"${String(r[k]??'').replaceAll('"','""')}"`).join(','))];const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`changwon-${service()}-${cut()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 await update();
 try{[geometry,facilities]=await Promise.all([data('geometry.json'),data('facilities.json')]);sea=new Set(geometry.sea);map=createMap('map',{onError:()=>{$('#status').textContent='일부 지도 배경이나 자료가 응답하지 않습니다. 지역 결과표는 계속 이용할 수 있습니다.'}});await ready(map);
 map.addSource('grids',{type:'geojson',data:{type:'FeatureCollection',features:[]}});map.addLayer({id:'grid-fill',type:'fill',source:'grids',paint:{'fill-color':['get','color'],'fill-opacity':Number($('#opacity').value)}});map.addLayer({id:'grid-outline',type:'line',source:'grids',minzoom:13,paint:{'line-color':'#ffffff','line-width':.35,'line-opacity':.6}});await boundaries(map);addFacilities(map,facilitiesGeo(facilities,service()));
 map.on('click','grid-fill',e=>{if(map.queryRenderedFeatures(e.point,{layers:['facilities']}).length)return;popup(e.features[0].properties.index,e.lngLat)});map.on('mouseenter','grid-fill',()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave','grid-fill',()=>map.getCanvas().style.cursor='');
 mapReady=true;setBase(map,$('#basemap').value);renderMap();
 const lat=Number(params.get('lat')),lon=Number(params.get('lon')),zoom=Number(params.get('zoom'));
 if(params.has('lat')&&params.has('lon')&&Number.isFinite(lat)&&Math.abs(lat)<=85&&Number.isFinite(lon)&&Math.abs(lon)<=180&&zoom>=7&&zoom<=19)map.jumpTo({center:[lon,lat],zoom});else moveTo(map,boundsFor(geometry,$('#district').value));
 $('#home').onclick=()=>moveTo(map,boundsFor(geometry,''));$('#focus-region').onclick=()=>moveTo(map,boundsFor(geometry,$('#district').value));map.on('moveend',syncURL);
 $('#find-grid').onclick=()=>{const i=geometry.ids.indexOf($('#grid-search').value.trim());if(i<0){$('#grid-feedback').textContent='일치하는 격자번호가 없습니다.';return}const ring=geometry.rings[i],lnglat=[ring[0][1],ring[0][0]];map.jumpTo({center:lnglat,zoom:16});popup(i,lnglat);$('#grid-feedback').textContent=`${geometry.names[i]} · ${geometry.ids[i]}`};
 }catch(e){$('#map').innerHTML='<div class="static-fallback">인터랙티브 지도를 사용할 수 없습니다. 지역 목록과 아래 결과표에서 같은 분석값을 확인하세요.</div>';$('#legend').textContent='지도 대체: 아래 결과표 이용';$('#status').textContent='지역 요약·비교표는 지도 없이 이용할 수 있습니다.'}
}
init().catch(e=>{$('#status').textContent='자료를 불러오지 못했습니다. 자료 페이지의 정적 결과표를 이용해 주세요.'});
