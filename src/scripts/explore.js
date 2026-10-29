import {renderGridSVG} from './grid-svg.js';
import {data,createMap,ready,boundaries,setBase,boundsFor,moveTo,facilitiesGeo,addFacilities,fmt,esc,maplibregl} from './maps.js';
const $=s=>document.querySelector(s),params=new URLSearchParams(location.search);
let overview,rows,geometry,facilities,map,values,selected=[],sea,requestId=0,mapReady=false,svgMap,gridIndex=-1;
const service=()=>$('#service').value,cut=()=>$('#cut').value,metric=()=>$('#metric').value;
const info=()=>overview.services[service()];
const numeric=v=>v!=null&&Number.isFinite(Number(v));
function currentRows(){return [$('#district').value,$('#compare').value].filter((x,i,a)=>x&&a.indexOf(x)===i).map(n=>rows.find(r=>r.area===n&&r.service===service()&&r.minutes===Number(cut()))).filter(Boolean)}
function regionSummary(){
 selected=currentRows();const r=selected[0];if(!r)return;
 const birth=service()==='delivery',unit=birth?'명/년':'명',ratio=r.target_population?100*r.over_population/r.target_population:null;
 let detail='';
 if(metric()==='count')detail=`<dt>0곳인 지역</dt><dd>${fmt(r.over_population,1)}${unit}</dd><dt>1곳인 지역</dt><dd>${fmt(r.one_population,1)}${unit}</dd><dt>2곳 이상인 지역</dt><dd>${fmt(Math.max(0,r.known_population-r.over_population-r.one_population),1)}${unit}</dd>`;
 else if(metric()==='score')detail=`<dt>대상인구 가중 평균 점수</dt><dd><strong>${fmt(r.mean,4)}</strong></dd><dt>단위</dt><dd>${esc(info().unit)}</dd>`;
 else if(metric()==='time'){
  const times=values&&geometry?geometry.names.flatMap((n,i)=>n===r.area&&numeric(values.minutes[i])&&!sea.has(i)?[values.minutes[i]]:[]).sort((a,b)=>a-b):[];
  detail=times.length?`<dt>산출격자 시간 범위</dt><dd>${fmt(times[0])}–${fmt(times.at(-1))}분</dd><dt>격자별 중앙값</dt><dd>${fmt((times[Math.floor((times.length-1)/2)]+times[Math.floor(times.length/2)])/2)}분</dd><dt>집계 기준</dt><dd>인구가중 없이 산출격자 ${fmt(times.length,0)}칸</dd>`:'<dt>격자별 차량 추정시간</dt><dd>지도의 한 칸을 선택하세요.</dd>';
 }else detail=`<dt>기준시간 초과지역 ${birth?'기대출생아':'거주인구'}</dt><dd><strong>${fmt(r.over_population,1)}${unit} · ${fmt(ratio,1)}%</strong></dd>`;
 $('#region-card').innerHTML=`<h3>${esc(r.area)}</h3><span class="small">${esc(info().label)} · ${cut()}분 기준</span><dl><dt>${birth?'전체 연간 기대출생아':'전체 '+esc(info().demand_label)}</dt><dd>${fmt(r.target_population,1)}${unit}</dd>${detail}<dt>경로 미산출 / 배편지역</dt><dd>${fmt(r.unknown_population,1)} / ${fmt(r.sea_population,1)}${unit}</dd></dl>`;
 $('#definition').textContent=`${info().label} · ${cut()}분 · ${$('#metric').selectedOptions[0].textContent} · 분모: ${info().demand_label}. 점수 단위: ${info().unit}. ${birth?'시간·기관 수의 격자 조건은 동일하며 요약 인구는 기대출생아로 가중합니다.':''}`;
 $('#comparison-rows').innerHTML=selected.map(r=>`<tr><th scope="row">${esc(r.area)}</th><td>${fmt(r.target_population,1)}${unit}</td><td>${fmt(r.over_population,1)}${unit}</td><td>${fmt(100*r.over_population/r.target_population,1)}%</td><td>${fmt(r.one_population,1)}${unit}</td><td>${fmt(r.mean,4)}</td><td>${fmt(r.unknown_population,1)} / ${fmt(r.sea_population,1)}${unit}</td></tr>`).join('');
}
function statusOf(i){return sea.has(i)?'sea':values.status[i]}
function stateText(i){const s=statusOf(i);return s==='sea'?'배편 필요 · 차량모형 제외':s==='unknown'?'경로 또는 입력 미산출':s==='no_car_path'?'차량망 연결 경로 없음':s==='over_threshold'?`${cut()}분 내 도달기관 없음`:'권역 내 기관 도달 확인'}
function color(i,max){const st=statusOf(i);if(st==='sea')return '#806a9b';if(st==='unknown'||st==='no_car_path')return '#8d9791';const t=values.minutes[i],v=values.score[i],n=values.count[i];if(metric()==='threshold')return !numeric(t)?'#8d9791':t>Number(cut())?'#b14f34':'#91b4a2';if(metric()==='count')return !numeric(n)?'#8d9791':n===0?'#b14f34':n===1?'#d4ac4e':'#418274';if(metric()==='time'){if(!numeric(t))return '#8d9791';return t>60?'#873726':t>30?'#c67650':t>15?'#becabd':'#44816c'}if(!numeric(v))return '#8d9791';if(v===0)return '#d4ac4e';const x=Math.min(1,v/max),a=[224,233,215],b=[36,104,82];return `rgb(${a.map((v,k)=>Math.round(v+(b[k]-v)*x)).join(',')})`}
function clearGrid(){gridIndex=-1;$('#grid-detail').innerHTML='<h2>선택한 100m 격자</h2><p>지도를 확대하고 한 칸을 누르면 시간·기관 수·점수를 확인할 수 있습니다.</p>';if(mapReady)map.setFilter('grid-selected',['==',['get','index'],-1])}
function selectGrid(i,focus=false){
 if(!values||!geometry||i<0)return;const previousArea=$('#district').value;gridIndex=Number(i);
 $('#gu').value=geometry.names[i].split(' ')[0];[...$('#district').options].forEach(o=>o.hidden=!o.value.startsWith($('#gu').value+' '));$('#district').value=geometry.names[i];regionSummary();
 const r=values,t=r.minutes[i];$('#grid-detail').innerHTML=`<h2>${esc(geometry.names[i])} · 선택한 100m 격자</h2><p>${esc(info().label)} · ${cut()}분 권역</p><dl><dt>가장 가까운 기관까지</dt><dd>${numeric(t)?fmt(t,1)+'분 · 차량 추정':'미산출'}</dd><dt>${cut()}분 안의 기관</dt><dd>${fmt(r.count[i],0)}곳</dd><dt>기관 소재지</dt><dd>창원 ${fmt(r.count_cw[i],0)} / 시외 ${fmt(r.count_outside[i],0)}곳</dd><dt>두 번째 기관까지</dt><dd>${r.second[i]==null?'60분 내 미확인':fmt(r.second[i],1)+'분'}</dd><dt>접근성 점수</dt><dd>${fmt(r.score[i],4)}</dd></dl><p class="small">${esc(info().unit)} · 공급량과 주변 경쟁수요를 이동시간으로 가중한 값</p><p class="small">${stateText(i)} · 격자번호 ${esc(geometry.ids[i])}<br>기관 2026.10 수집 · 인구 2026.09 · 공간배분 추정인구 기준</p><a href="${import.meta.env.BASE_URL}methods/#formula" target="_top">산출조건·단위 확인</a>`;
 if(mapReady){map.setFilter('grid-selected',['==',['get','index'],i]);if(focus){const ring=geometry.rings[i];map.jumpTo({center:[ring[0][1],ring[0][0]],zoom:16})}}else{if(!svgMap||previousArea!==geometry.names[i])drawSVG();if(focus)svgMap?.focus(i)}
 svgMap?.select(i);syncURL();
}
function drawSVG(all=false){if(!geometry||!values)return;const sorted=values.score.filter(numeric).sort((a,b)=>a-b),max=sorted[Math.floor(sorted.length*.95)]||1;const indices=geometry.names.flatMap((n,i)=>all||n===$('#district').value?[i]:[]);svgMap=renderGridSVG($('#map'),geometry,indices,i=>color(i,max),i=>selectGrid(i),$('#show-facilities').checked?facilities.filter(f=>Number(f.supply[service()])>0).map(f=>({lat:f.lat,lon:f.lon,label:f.name+' · '+info().label+' '+f.supply[service()]+(service()==='delivery'?'병상':'명')})):[]);if(gridIndex>=0)svgMap.select(gridIndex)}
function focusRegion(){if(!geometry)return;if(mapReady)moveTo(map,boundsFor(geometry,$('#district').value));else drawSVG()}
function renderMap(){
 if(!values||!geometry)return;
 const sorted=values.score.filter(numeric).sort((a,b)=>a-b),max=sorted[Math.floor(sorted.length*.95)]||1;
 const features=geometry.rings.map((ring,i)=>{const coords=ring.map(p=>[p[1],p[0]]);if(JSON.stringify(coords[0])!==JSON.stringify(coords.at(-1)))coords.push(coords[0]);return {type:'Feature',id:i,geometry:{type:'Polygon',coordinates:[coords]},properties:{index:i,color:color(i,max)}}});
 if(mapReady){map.getSource('grids').setData({type:'FeatureCollection',features});map.getSource('facilities').setData(facilitiesGeo(facilities,service()))}else drawSVG();
 const items=metric()==='threshold'?[['#91b4a2',`${cut()}분 이내`],['#b14f34',`${cut()}분 초과`]]:metric()==='count'?[['#b14f34','0곳'],['#d4ac4e','1곳'],['#418274','2곳 이상']]:metric()==='time'?[['#44816c','15분 이내'],['#becabd','15~30분'],['#c67650','30~60분'],['#873726','60분 초과']]:[['#d4ac4e','0점'],['#e0e9d7','낮은 양수 점수'],['#246852',`${fmt(max,3)}점 이상 (조건별 95분위)`]];
 $('#legend').innerHTML=items.concat([['#8d9791','경로·입력 미산출'],['#806a9b','배편 필요 · 차량모형 제외']]).map(([c,t])=>`<div class="legend-row"><span class="swatch" style="background:${c}"></span>${t}</div>`).join('')+'<div>칠해지지 않은 곳: 분석격자 밖</div>';
 $('#status').textContent=`${fmt(geometry.ids.length,0)}개 격자 · ${info().label} · ${cut()}분 결과`;
}
async function update(){const id=++requestId;values=null;regionSummary();$('#grid-detail').innerHTML='<p>선택 조건의 격자 결과를 불러오는 중입니다.</p>';$('#map').setAttribute('aria-busy','true');if(mapReady){map.getSource('grids').setData({type:'FeatureCollection',features:[]});map.getSource('facilities').setData({type:'FeatureCollection',features:[]})}$('#status').textContent='선택 조건의 결과를 불러오는 중…';try{const v=await data(`${service()}-${cut()}.json`);if(id!==requestId)return;values=v;renderMap();regionSummary();if(gridIndex>=0)selectGrid(gridIndex);else clearGrid();$('#map').removeAttribute('aria-busy');syncURL()}catch(e){if(id!==requestId)return;$('#status').textContent='결과를 불러오지 못했습니다. 다른 조건을 선택하거나 새로고침해 주세요.'}}
function syncURL(){const p=new URLSearchParams({service:service(),cut:cut(),metric:metric(),district:$('#district').value});if($('#compare').value)p.set('compare',$('#compare').value);p.set('base',$('#basemap').value);if(gridIndex>=0)p.set('grid_id',geometry.ids[gridIndex]);if(params.get('embed')==='1')p.set('embed','1');if(mapReady){const c=map.getCenter();p.set('lat',c.lat.toFixed(5));p.set('lon',c.lng.toFixed(5));p.set('zoom',map.getZoom().toFixed(2))}history.replaceState(null,'',`${location.pathname}?${p}`)}
async function init(){
 if(params.get('embed')==='1')document.body.classList.add('embed-mode');
 [overview,rows]=await Promise.all([data('overview.json'),data('districts.json')]);
 for(const [key,id]of [['service','service'],['cut','cut'],['metric','metric'],['district','district'],['compare','compare'],['base','basemap']]){const value=params.get(key);if(value!=null&&[...$( '#'+id).options].some(o=>o.value===value))$('#'+id).value=value}
 regionSummary();
 $('#gu').onchange=()=>{const gu=$('#gu').value;[...$('#district').options].forEach(o=>o.hidden=!!gu&&!o.value.startsWith(gu+' '));if(gu&&!$('#district').value.startsWith(gu+' '))$('#district').value=[...$('#district').options].find(o=>!o.hidden).value;regionSummary();clearGrid();focusRegion();syncURL()};
 $('#district').onchange=()=>{regionSummary();clearGrid();focusRegion();syncURL()};$('#compare').onchange=()=>{regionSummary();syncURL()};
 for(const id of ['service','cut','metric'])$('#'+id).onchange=update;
 $('#basemap').onchange=()=>{if(mapReady)setBase(map,$('#basemap').value);syncURL()};$('#opacity').oninput=()=>{if(mapReady)map.setPaintProperty('grid-fill','fill-opacity',Number($('#opacity').value));else $('#map svg')?.style.setProperty('opacity',$('#opacity').value)};$('#show-facilities').onchange=()=>{if(mapReady)map.setLayoutProperty('facilities','visibility',$('#show-facilities').checked?'visible':'none');else drawSVG()};
 $('#share').onclick=async()=>{syncURL();try{const share=new URL(location.href);share.searchParams.delete('embed');await navigator.clipboard.writeText(share.href);$('#status').textContent='선택 격자·지역·과목·조건의 링크를 복사했습니다.'}catch(e){$('#status').textContent='주소창의 링크를 복사하면 선택한 조건을 공유할 수 있습니다.'}};
 $('#download-selection').onclick=()=>{const fields=['area','service','minutes','target_population','over_population','one_population','mean','unknown_population','sea_population'];const lines=[fields.join(','),...selected.map(r=>fields.map(k=>`"${String(r[k]??'').replaceAll('"','""')}"`).join(','))];const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`changwon-${service()}-${cut()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 $('#home').onclick=()=>{if(!geometry)return;if(mapReady)moveTo(map,boundsFor(geometry,''));else drawSVG(true)};
 $('#focus-region').onclick=focusRegion;document.addEventListener('fullscreenchange',()=>{if(mapReady)map.resize()});
 $('#zoom-in').onclick=()=>mapReady?map.zoomIn():svgMap?.zoom(.5);
 $('#zoom-out').onclick=()=>mapReady?map.zoomOut():svgMap?.zoom(2);
 $('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('.map-wrap').requestFullscreen()}catch{const u=new URL(location.href);u.searchParams.delete('embed');window.open(u.href,'_blank','noopener')}};
 $('#find-grid').onclick=()=>{const i=geometry?.ids.indexOf($('#grid-search').value.trim())??-1;if(i<0){$('#grid-feedback').textContent='일치하는 격자번호가 없습니다.';return}selectGrid(i,true);$('#grid-feedback').textContent=`${geometry.names[i]} · ${geometry.ids[i]}`};
 [geometry,facilities]=await Promise.all([data('geometry.json'),data('facilities.json')]);sea=new Set(geometry.sea);
 gridIndex=geometry.ids.indexOf(params.get('grid_id'));if(gridIndex>=0)$('#district').value=geometry.names[gridIndex];
 await update();
 try{
 map=createMap('webgl-map',{onError:()=>{$('#status').textContent='배경지도 일부가 응답하지 않습니다. 분석격자·지역표를 확인하세요.'}});await ready(map);
 map.addSource('grids',{type:'geojson',data:{type:'FeatureCollection',features:[]}});map.addLayer({id:'grid-fill',type:'fill',source:'grids',paint:{'fill-color':['get','color'],'fill-opacity':Number($('#opacity').value)}});
 map.addLayer({id:'grid-outline',type:'line',source:'grids',paint:{'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],9,.1,12,.45,16,1],'line-opacity':.8}});
 await boundaries(map);map.addLayer({id:'grid-selected',type:'line',source:'grids',filter:['==',['get','index'],-1],paint:{'line-color':'#111111','line-width':3}});addFacilities(map,facilitiesGeo(facilities,service()),service);
 map.on('click','grid-fill',e=>{if(map.queryRenderedFeatures(e.point,{layers:['facilities']}).length)return;selectGrid(Number(e.features[0].properties.index))});map.on('mouseenter','grid-fill',()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave','grid-fill',()=>map.getCanvas().style.cursor='');
 mapReady=true;$('#webgl-map').hidden=false;$('#map').hidden=true;setBase(map,$('#basemap').value);renderMap();map.resize();
 const lat=Number(params.get('lat')),lon=Number(params.get('lon')),zoom=Number(params.get('zoom'));
 if(gridIndex>=0)selectGrid(gridIndex,true);else if(params.has('lat')&&params.has('lon')&&Number.isFinite(lat)&&Math.abs(lat)<=85&&Number.isFinite(lon)&&Math.abs(lon)<=180&&zoom>=7&&zoom<=19)map.jumpTo({center:[lon,lat],zoom});else focusRegion();
 map.on('moveend',syncURL);
 map.getCanvas().addEventListener('webglcontextlost',()=>{mapReady=false;$('#webgl-map').hidden=true;$('#map').hidden=false;drawSVG();$('#status').textContent='격자 벡터지도로 전환했습니다. 확대·선택과 결과표를 계속 사용할 수 있습니다.'});
 }catch(e){map?.remove();mapReady=false;$('#webgl-map').hidden=true;$('#map').hidden=false;drawSVG();if(gridIndex>=0)selectGrid(gridIndex,true);$('#status').textContent='격자 벡터지도 · 배경지도 없이도 확대·선택할 수 있습니다.'}

}
init().catch(e=>{$('#status').textContent='자료를 불러오지 못했습니다. 자료 페이지의 정적 결과표를 이용해 주세요.'});
