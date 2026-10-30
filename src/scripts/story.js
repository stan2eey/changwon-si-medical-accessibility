import {sceneOrder,facilityScenes} from './story-model.js';
const base=import.meta.env.BASE_URL;
const $=s=>document.querySelector(s);
const fmt=(v,d=0)=>Number(v).toLocaleString('ko-KR',{maximumFractionDigits:d});
async function init({mapLoader=()=>import('./maps.js')}={}){
 const [o,rows]=await Promise.all(['overview.json','districts.json'].map(f=>fetch(`${base}data/${f}`).then(r=>{if(!r.ok)throw Error(r.status);return r.json()})));
 const run=$('.story-run'),scenes=[...document.querySelectorAll('.scene')];
 const regions=['마산합포구 진전면','의창구 북면'].map(area=>rows.find(r=>r.area===area&&r.service==='code24'&&r.minutes===30));
 const jd=rows.find(r=>r.area==='마산합포구 진동면'&&r.service==='delivery'&&r.minutes===30);
 const eld=o.elderly.find(r=>r.service==='code24');
 let active='',mapController=null;
 const comparisonNames=new Set(['rate','population','count','question']);
 function comparison(mode){
  const ratio=mode==='rate',population=mode==='population',max=ratio?100:population?50000:3000;
  $('#comparison-kicker').textContent=population?'전체 주민, 분모 비교':'응급의학과 전문의 보유기관, 30분';
  $('#comparison-title').textContent=ratio?'30분 초과지역 거주비율':population?'두 지역의 전체 인구':'30분 초과지역 거주인구';
  regions.forEach((r,i)=>{const value=ratio?100*r.over_population/r.target_population:population?r.target_population:r.over_population;$('#compare-value-'+i).textContent=fmt(value,ratio?1:0)+(ratio?'%':'명');$('#compare-bar-'+i).style.width=`${100*value/max}%`});
  $('#comparison-axis').textContent=`(단위 : ${ratio?'%':'명'})`;
  $('#comparison-foot').textContent=ratio?'분모: 각 지역의 전체 주민':population?'창원 주민등록 인구, 2026.09':'격자별 공간배분 인구 합계, 전체 주민 기준';
 }
 function supply(scene){
  const specialty=scene==='supply-ob'?'산부인과':scene==='supply-peds'?'소아청소년과':'전체 의사';
  const names=['창원','전국','의대 보유 비수도권 17개 도시','특례시 4곳(수원·고양·용인·화성)'];
  const values=names.map(name=>Number(o.workforce.find(r=>r['구분']===name)[specialty]));
  const max=Math.ceil(Math.max(...values)/5)*5;
  $('#supply-title').textContent=specialty;$('#supply-max').textContent=max+'명';
  values.forEach((v,i)=>{$('#supply-dot-'+i).setAttribute('cx',String(180+330*v/max));$('#supply-value-'+i).textContent=fmt(v,1)});
 }
 function counter(label,value,unit){$('#scene-counter').hidden=false;$('#counter-label').textContent=label;$('#counter-value').textContent=value;$('#counter-unit').textContent=`(단위 : ${unit})`}
 function setScene(scene){
  if(scene===active)return;active=scene;const facilityStep=facilityScenes.find(s=>s.scene===scene);const fallbackScene=facilityStep?scene:['cover','city-facilities','jinjeon','bukmyeon','elderly','ob-facilities','delivery-facilities','delivery-count','delivery-one'].includes(scene)?scene:'cover';$('#story-fallback img').src=`${base}maps/${fallbackScene}.svg`;$('#story-fallback img').alt=(facilityStep||scene==='city-facilities')?'창원 의료기관 유형별 분포':(scene.startsWith('delivery-')?'분만기관 도달격자':'응급의학과 도달격자')+', 실제 100m 분석결과';run.dataset.scene=scene;scenes.forEach(e=>e.classList.toggle('active',e.dataset.scene===scene));
  $('#story-progress-fill').style.width=`${100*(sceneOrder.indexOf(scene)+1)/sceneOrder.length}%`;
  $('#discovery-chart').hidden=!comparisonNames.has(scene);$('#supply-chart').hidden=!scene.startsWith('supply-');$('#scene-counter').hidden=true;
  $('#map-place').textContent='';$('#stage-label').textContent='차량시간 추정, 등록 전문의 보유기관 기준';$('#stage-legend').textContent='';
  if(comparisonNames.has(scene)){comparison(scene==='question'?'count':scene);$('#map-place').textContent='진전면 / 북면'}
  if(scene.startsWith('supply-')){supply(scene);$('#stage-label').textContent='공급률 비교, 2026.09';$('#map-place').textContent='도시 전체의 공급'}
  if(scene==='cover')$('#stage-label').textContent='';
  if(facilityStep){$('#stage-label').textContent='2026년 10월 수집한 의료기관 등록자료';$('#stage-legend').textContent='● '+facilityStep.label;$('#map-place').textContent=facilityStep.label+' 분포'}
  if(scene==='city-facilities'){$('#stage-label').textContent='창원 소재 의료기관, 2026년 10월 등록자료';$('#stage-legend').textContent='● 창원 소재 의료기관';$('#map-place').textContent='창원 의료기관 분포'}
  if(scene==='jinjeon'||scene==='bukmyeon'){
   const i=scene==='jinjeon'?0:1;$('#map-place').textContent=regions[i].area;$('#stage-legend').textContent='■ 주황: 30분 초과, 녹색: 30분 이내, 회색: 미산출, 보라: 배편';
  }
  if(scene==='elderly'){$('#stage-label').textContent='응급의학과, 30분 접근성 하위20% 경계 이하 (동점 포함)';$('#stage-legend').textContent='■ 공간배분 추정인구, 65세 이상';counter('접근성 하위지역의 고령 주민',fmt(eld.elderly),'명')}
  if(scene==='ob-facilities'||scene.startsWith('delivery-')){
   $('#map-place').textContent='마산합포구 진동면';$('#stage-label').textContent='기관별 지도, 2026.10 수집';
   $('#stage-legend').textContent=scene==='ob-facilities'?'● 산부인과 전문의 보유기관':scene==='delivery-facilities'?'● 분만 분석 대상기관':'거주격자: 주황 0곳, 황금 1곳, 녹색 2곳 이상, 회색 미산출, 보라 배편';
   if(scene==='delivery-one'){counter('진동면 여성 15~49세 중\n30분 내 분만기관 1곳 지역 거주',fmt(100*jd.women_one/jd.women_population,1),'%');$('#stage-legend').textContent='■ 황금색: 1곳인 거주격자 강조, ● 분만 분석 대상기관'}
  }
  mapController?.setScene(scene);
 }
 function sync(){
  const mobile=window.matchMedia('(max-width:850px)').matches,anchor=window.innerHeight*(mobile?.65:.45);
  let next=scenes[0].dataset.scene;for(const scene of scenes){if(scene.querySelector('.scene-copy').getBoundingClientRect().top<=anchor)next=scene.dataset.scene;else break}setScene(next);
 }
 let scheduled=false;
 function requestSync(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;sync()})}
 run.classList.add('story-ready');setScene('cover');sync();
 window.addEventListener('scroll',requestSync,{passive:true});window.addEventListener('resize',requestSync,{passive:true});window.addEventListener('pageshow',requestSync);window.addEventListener('hashchange',requestSync);
 // Data and narration are usable before WebGL initializes, including deep-linked scenes.
 mapLoader().then(m=>m.createStoryMap('narrative-map')).then(controller=>{mapController=controller;$('#story-fallback').hidden=true;mapController.setScene(active);window.addEventListener('pagehide',e=>{if(!e.persisted)controller.destroy()})}).catch(()=>{run.classList.add('map-unavailable');$('#story-fallback').hidden=false});
}
init().catch(()=>document.querySelector('.story-run')?.classList.add('story-load-error'));
