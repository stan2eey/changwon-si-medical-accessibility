// DOM-level smoke tests. These do not claim WebGL or visual browser verification.
import {JSDOM} from 'jsdom';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {renderGridSVG} from '../src/scripts/grid-svg.js';
import {waitForGridData} from '../src/scripts/grid-ready.js';
import {sceneOrder,storyFeatures,facilityScenes,specialtyScenes} from '../src/scripts/story-model.js';
const base='/changwon-si-medical-accessibility/';
const load=f=>JSON.parse(fs.readFileSync(`public/data/${f}`,'utf8'));
const tick=()=>new Promise(r=>setTimeout(r,20));
function mount(file,url){
 const dom=new JSDOM(fs.readFileSync(file,'utf8'),{url});
 for(const k of ['window','document','location','history'])globalThis[k]=dom.window[k];
 Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
 globalThis.IntersectionObserver=class{observe(){}disconnect(){}};dom.window.IntersectionObserver=globalThis.IntersectionObserver;
 globalThis.fetch=async url=>({ok:true,json:async()=>load(String(url).split('/data/')[1])});
 return dom;
}
let dom=mount('dist/index.html',`https://example.test${base}`);
let scrollPosition=0,mobile=false;const mapScenes=[];
dom.window.matchMedia=()=>({matches:mobile});globalThis.requestAnimationFrame=cb=>{cb();return 1};
const storyNodes=[...document.querySelectorAll('.scene')];
storyNodes.forEach((node,i)=>{node.querySelector('.scene-copy').getBoundingClientRect=()=>({top:i*1000+300-scrollPosition})});
const story=fs.readFileSync('src/scripts/story.js','utf8').replace(/^import .*?;\r?\n/,`const sceneOrder=${JSON.stringify(sceneOrder)},facilityScenes=${JSON.stringify(facilityScenes)},specialtyScenes=${JSON.stringify(specialtyScenes)};\n`).replace('import.meta.env.BASE_URL',JSON.stringify(base)).replace('init().catch(', 'return init({mapLoader:mockLoader}).catch(');
await new Function('mockLoader',story)(async()=>({createStoryMap:async()=>({setScene:s=>mapScenes.push(s),destroy(){}})}));await tick();
const $=s=>document.querySelector(s);
const bar=$('#compare-bar-0'),dot=$('#supply-dot-0');
const go=s=>{scrollPosition=sceneOrder.indexOf(s)*1000;window.dispatchEvent(new dom.window.Event('scroll'));assert.equal($('.story-run').dataset.scene,s);assert.equal(mapScenes.at(-1),s==='facility-explore'?$('#facility-type').value:s)};
assert.equal($('.story-run').dataset.scene,'cover');assert($('#discovery-chart').hidden);assert.equal($('#compare-value-1').textContent,'—');assert(!document.querySelector('#follow-story'));
assert.deepEqual(storyNodes.map(n=>n.dataset.scene),sceneOrder);
assert(sceneOrder.indexOf('supply-all')<sceneOrder.indexOf('jinjeon'));
assert(sceneOrder.indexOf('count')<sceneOrder.indexOf('rate'));
go('city-facilities');assert.match($('#stage-label').textContent,/창원 소재 의료기관/);
const localFacilities=load('facilities.json').filter(f=>f.cw);
assert.equal(facilityScenes.reduce((sum,step)=>sum+localFacilities.filter(f=>step.kinds.includes(f.kind)).length,0),localFacilities.length);
const featured=['facilities-advanced','facilities-general','facilities-hospital','facilities-clinic','facilities-public'];
assert.deepEqual(sceneOrder.slice(5,10),featured);
for(const scene of featured){go(scene);assert(document.querySelector(`article[data-scene="${scene}"] h2`).textContent.includes('곳'))}
go('facility-explore');
for(const step of facilityScenes){$('#facility-type').value=step.scene;$('#facility-type').dispatchEvent(new dom.window.Event('change'));assert.equal(mapScenes.at(-1),step.scene);assert(!document.querySelector(`[data-facility-panel="${step.scene}"]`).hidden);assert.equal($('.story-run').dataset.scene,'facility-explore')}
assert.equal(facilityScenes.find(s=>s.scene==='facilities-care').kinds.length,1);assert.deepEqual(facilityScenes.find(s=>s.scene==='facilities-mental').kinds,['정신병원']);
for(const step of specialtyScenes){go(step.scene);assert.equal($('#stage-label').textContent,'100m 격자 접근성 점수, 30분 권역');assert(document.querySelector(`article[data-scene="${step.scene}"] .score-scale`))}
assert.equal($('#story-service'),null);assert.equal($('#delivery-type'),null);assert.equal(document.querySelector('article[data-scene="ob-facilities"]'),null);assert.equal(sceneOrder.length,20);
assert.equal(document.querySelector('article[data-scene="jinjeon"] .story-overline').textContent,'응급의학과 전문의가 있는 의료기관 기준');
go('jinjeon');assert($('#discovery-chart').hidden);assert.equal($('.scene[data-scene="population"]'),null);
go('rate');assert.equal($('#compare-value-0').textContent,'71.9%');assert.equal($('#compare-value-1').textContent,'6.2%');assert(!$('#discovery-chart').textContent.includes('2,730'));

go('count');assert.equal($('#compare-value-1').textContent,'2,730명');assert.strictEqual($('#compare-bar-0'),bar);assert.match($('#comparison-axis').textContent,/\(단위 : 명\)/);
go('supply-ob');assert.match($('#supply-title').textContent,/산부인과/);assert.equal($('#supply-value-0').textContent,'21.6');assert.strictEqual($('#supply-dot-0'),dot);
go('delivery-one');assert($('#scene-counter').hidden);assert(document.querySelector('article[data-scene=delivery-one] h2').textContent.includes('1,548'));assert(document.querySelector('article[data-scene=delivery-one] p').textContent.includes('86.7%'));
assert.equal(document.querySelector('[data-scene="scenario-before"]'),null);assert.equal(document.querySelector('[data-scene="scenario-after"]'),null);assert(document.querySelector('#masan-scenario'));
mobile=true;go('rate');assert.equal($('#compare-value-1').textContent,'6.2%');go('count');assert.equal($('#compare-value-1').textContent,'2,730명');
const features=storyFeatures(load('geometry.json'),load('code24-30.json'),load('delivery-30.json'),load('overview.json').elderly.find(r=>r.service==='code24').threshold).features;
assert.equal(features.length,10099);const one=features.filter(f=>f.properties.area==='마산합포구 진동면'&&f.properties.deliveryKnown&&f.properties.count===1);assert(one.length>0);
dom.window.close();
dom=mount('dist/explore/index.html',`https://example.test${base}explore/?service=code24&cut=30&district=${encodeURIComponent('의창구 북면')}&compare=${encodeURIComponent('마산합포구 진전면')}`);
const mocks={data:async f=>load(f),createMap:()=>{throw Error('WebGL unavailable')},ready(){},boundaries(){},setBase(){},boundsFor(){},moveTo(){},facilitiesGeo(){},addFacilities(){},fmt:(v,d=1)=>v==null?'미산출':Number(v).toLocaleString('ko-KR',{maximumFractionDigits:d}),esc:v=>String(v??'').replaceAll('<','&lt;'),maplibregl:{}};
const source=fs.readFileSync('src/scripts/explore.js','utf8').replace(/^import .*?;\r?\n/gm,'').replace('import.meta.env.BASE_URL',JSON.stringify(base)).replace('init().catch(', 'return init().catch(');
const runExplore=new Function('mocks','renderGridSVG','const {data,createMap,ready,boundaries,setBase,boundsFor,moveTo,facilitiesGeo,addFacilities,fmt,esc,maplibregl,waitForGridData}=mocks;'+source);
mocks.waitForGridData=map=>waitForGridData(map,50);
await runExplore(mocks,renderGridSVG);
assert.match($('#region-card').textContent,/의창구 북면/);assert.match($('#region-card').textContent,/6.2%/);assert.equal($('#comparison-rows').children.length,1);assert.equal($('#compare'),null);assert.equal($('#grid-search'),null);assert.equal($('#find-grid'),null);assert(!new URL(location.href).searchParams.has('compare'));assert($('#map svg polygon'));assert.match($('#status').textContent,/격자 벡터지도/);
$('#service').value='delivery';$('#district').value='마산합포구 진동면';$('#service').dispatchEvent(new dom.window.Event('change'));await tick();assert.match($('#definition').textContent,/기대출생아/);assert.match($('#region-card').textContent,/명\/년/);
$('#gu').value='진해구';$('#gu').dispatchEvent(new dom.window.Event('change'));assert($('#district').value.startsWith('진해구 '));assert.match($('#region-card').textContent,/진해구/);
$('#cut').value='60';$('#cut').dispatchEvent(new dom.window.Event('change'));await tick();assert.match($('#definition').textContent,/60분/);assert.equal(new URL(location.href).searchParams.get('service'),'delivery');assert.equal(new URL(location.href).searchParams.get('cut'),'60');

$('#metric').value='count';$('#metric').dispatchEvent(new dom.window.Event('change'));await tick();assert.match($('#region-card').textContent,/0곳인 지역/);assert.match($('#region-card').textContent,/2곳 이상/);
$('#metric').value='score';$('#metric').dispatchEvent(new dom.window.Event('change'));await tick();assert.match($('#region-card').textContent,/가중 평균 점수/);assert(!$('#region-card').textContent.includes('초과지역'));
$('#metric').value='time';$('#metric').dispatchEvent(new dom.window.Event('change'));await tick();assert.match($('#region-card').textContent,/격자별 중앙값/);
const poly=$('#map polygon');const selectedIndex=Number(poly.dataset.index);poly.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));const gridID=load('geometry.json').ids[selectedIndex];assert.equal(new URL(location.href).searchParams.get('grid_id'),gridID);assert.match($('#grid-detail').textContent,/선택한 100m 격자/);assert($('#map polygon.selected'));assert.equal($('#district').value,load('geometry.json').names[selectedIndex]);
const beforeView=$('#map svg').getAttribute('viewBox');$('#zoom-in').click();assert.notEqual($('#map svg').getAttribute('viewBox'),beforeView);$('#map polygon.selected').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));assert.notEqual($('#map svg').getAttribute('viewBox'),beforeView,'selection must retain SVG zoom');
const restoreURL=location.href;dom.window.close();dom=mount('dist/explore/index.html',restoreURL);await runExplore(mocks,renderGridSVG);assert.equal(new URL(location.href).searchParams.get('grid_id'),gridID);assert($('#grid-detail').textContent.includes(gridID));assert($('#map polygon.selected'));
assert(!$('#grid-selection').hidden);assert($('#grid-selection-content').textContent.includes(gridID));assert.equal($('.grid-score').textContent,mocks.fmt(load('delivery-60.json').score[selectedIndex],4));
$('#close-grid-selection').click();assert($('#grid-selection').hidden);$('#map polygon.selected').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));assert(!$('#grid-selection').hidden);
$('#district').value='마산합포구 진전면';$('#district').dispatchEvent(new dom.window.Event('change'));assert(!new URL(location.href).searchParams.has('grid_id'));assert(!$('#map polygon.selected'));
dom.window.close();
// Exercise the map-success path and its click callback without claiming WebGL rendering.
dom=mount('dist/explore/index.html',`https://example.test${base}explore/`);
const events={},filters={},sources={};let camera={lat:35.2,lng:128.5};
const liveMap={addSource:(id,v)=>sources[id]=v,addLayer(){},getSource:id=>({setData:v=>sources[id].data=v}),setFilter:(id,f)=>filters[id]=f,setPaintProperty(){},setLayoutProperty(){},on:(name,...args)=>events[name+(typeof args[0]==='string'?':'+args[0]:'')]=args.at(-1),getCanvas:()=>({style:{},addEventListener(){}}),getCenter:()=>camera,getZoom:()=>15,resize(){},queryRenderedFeatures:()=>[],jumpTo:({center})=>camera={lng:center[0],lat:center[1]},remove(){}};
Object.assign(liveMap,{off(){},isSourceLoaded:()=>true,querySourceFeatures:()=>sources.grids.data.features});
await runExplore({...mocks,createMap:()=>liveMap,addFacilities:()=>sources.facilities={data:null}},renderGridSVG);assert($('#map').hidden);assert(!$('#webgl-map').hidden);assert.equal(sources.grids.data.features.length,10099);
const bukIndex=load('geometry.json').names.indexOf('의창구 북면');events['click:grid-fill']({point:{},features:[{properties:{index:bukIndex}}]});assert.equal($('#district').value,'의창구 북면');assert.equal($('#gu').value,'의창구');assert.equal(filters['grid-selected'][2],bukIndex);assert($('#comparison-rows').textContent.includes('의창구 북면'));assert.equal(new URL(location.href).searchParams.get('grid_id'),load('geometry.json').ids[bukIndex]);
assert(!$('#grid-selection').hidden);assert($('#grid-selection-content').textContent.includes(load('geometry.json').ids[bukIndex]));assert.equal($('.grid-score').textContent,mocks.fmt(load('code24-30.json').score[bukIndex],4));
// A style can load while its worker never produces a grid. Keep the SVG usable.
dom.window.close();dom=mount('dist/explore/index.html',`https://example.test${base}explore/?embed=1`);
liveMap.isSourceLoaded=()=>false;
const pending=runExplore({...mocks,createMap:()=>liveMap,addFacilities:()=>sources.facilities={data:null}},renderGridSVG);
await tick();assert(!$('#map').hidden);assert($('#map svg polygon'));
await pending;assert($('#webgl-map').hidden);assert(!$('#map').hidden);assert($('#map svg polygon'));
$('#map polygon').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));assert.match($('#grid-detail').textContent,/선택한 100m 격자/);
dom.window.close();dom=mount('dist/cities/index.html',`https://example.test${base}cities/`);globalThis.matchMedia=()=>({matches:true});
const citySource=fs.readFileSync('src/scripts/cities.js','utf8').replace('import.meta.env.BASE_URL',JSON.stringify(base)).replace('init().catch(', 'return init().catch(');await new Function(citySource)();assert.equal(document.querySelectorAll('.city-row').length,4);
assert.equal(document.querySelectorAll('#city-members details:first-child tbody tr').length,6);assert.match($('#city-members').textContent,/창원시 전체/);for(const row of document.querySelectorAll('#city-detail-rows tr')){assert.equal(row.children.length,7);const value=i=>Number(row.children[i].textContent.replaceAll(',',''));assert.equal(value(6),value(3)-value(1))}
assert.equal($('#city-detail-head').children.length,2);assert.equal($('#city-detail-rows tr').children.length,7);assert.equal($('#city-detail-rows tr').children[1].textContent,'2,060');assert.equal($('#city-detail-rows tr').children[2].textContent,'209.2');
document.querySelector('[data-open="medical"]').click();assert.equal(document.querySelectorAll('.city-row').length,18);assert.equal($('#city-group').value,'medical');
$('#city-group').value='special';$('#city-group').dispatchEvent(new dom.window.Event('change'));assert.equal(document.querySelectorAll('.city-row').length,5);assert($('#city-chart').textContent.includes('화성'));
$('#city-subject').value='산부인과';$('#city-subject').dispatchEvent(new dom.window.Event('change'));const high=Number(document.querySelector('.city-row strong').textContent);$('#city-sort').value='asc';$('#city-sort').dispatchEvent(new dom.window.Event('change'));assert(Number(document.querySelector('.city-row strong').textContent)<=high);
document.querySelector('[data-name="수원"]').click();assert.equal($('#city-b').value,'수원');assert($('#city-cards').textContent.includes('수원'));assert.equal($('#city-detail-rows').children.length,9);assert.equal(new URL(location.href).searchParams.get('b'),'수원');
const cityData=load('workforce-cities.json');assert.equal(cityData.cities.length,22);for(const c of cityData.cities){for(const s of cityData.subjects){assert.equal(c.counts[s],c.members.reduce((v,m)=>v+m.counts[s],0));assert.equal(c.rates[s],c.counts[s]/c[s==='산부인과'?'women':s==='소아청소년과'?'youth':'population']*100000)}}
dom.window.close();
console.log('PASS: scroll scenes; SVG results under WebGL failure; grid selection, district linkage, zoom retention and shared grid restore; metric-specific summaries; 22-city counts, sorting, drilldown and comparisons.');
