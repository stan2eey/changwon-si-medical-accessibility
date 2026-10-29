// DOM-level smoke tests. These do not claim WebGL or visual browser verification.
import {JSDOM} from 'jsdom';
import fs from 'node:fs';
import assert from 'node:assert/strict';
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
const story=fs.readFileSync('src/scripts/story.js','utf8').replace('import.meta.env.BASE_URL',JSON.stringify(base)).replace('init().catch(', 'return init().catch(');
await new Function(story)();
const $=s=>document.querySelector(s);
$('[data-compare="count"]').click();assert.match($('#population-chart').textContent,/2,730/);assert.match($('#population-chart').textContent,/인구/);assert.equal($('#follow-story').getAttribute('aria-pressed'),'false');
$('[data-compare="rate"]').click();assert.match($('#population-chart').textContent,/71.9%/);assert.match($('#population-chart').textContent,/6.2%/);
$('[data-specialty="산부인과"]').click();assert.match($('#workforce-chart').textContent,/산부인과/);assert.match($('#workforce-chart').textContent,/9.5/);
$('[data-scenario="after"]').click();assert.match($('#scenario-chart').textContent,/386명/);
$('[data-scenario="before"]').click();assert.match($('#scenario-chart').textContent,/2,532명/);
dom.window.close();
dom=mount('dist/explore/index.html',`https://example.test${base}explore/?service=code24&cut=30&district=${encodeURIComponent('의창구 북면')}&compare=${encodeURIComponent('마산합포구 진전면')}`);
const mocks={data:async f=>load(f),createMap:()=>{throw Error('WebGL unavailable')},ready(){},boundaries(){},setBase(){},boundsFor(){},moveTo(){},facilitiesGeo(){},addFacilities(){},fmt:(v,d=1)=>v==null?'미산출':Number(v).toLocaleString('ko-KR',{maximumFractionDigits:d}),esc:v=>String(v??'').replaceAll('<','&lt;'),maplibregl:{}};
const source=fs.readFileSync('src/scripts/explore.js','utf8').replace(/^import .*?;\r?\n/,'const {data,createMap,ready,boundaries,setBase,boundsFor,moveTo,facilitiesGeo,addFacilities,fmt,esc,maplibregl}=mocks;\n').replace('init().catch(', 'return init().catch(');
await new Function('mocks',source)(mocks);
assert.match($('#region-card').textContent,/의창구 북면/);assert.match($('#region-card').textContent,/6.2%/);assert.equal($('#comparison-rows').children.length,2);assert.match($('#map').textContent,/사용할 수 없습니다/);
$('#service').value='delivery';$('#district').value='마산합포구 진동면';$('#service').dispatchEvent(new dom.window.Event('change'));await tick();assert.match($('#definition').textContent,/기대출생아/);assert.match($('#region-card').textContent,/명\/년/);
$('#gu').value='진해구';$('#gu').dispatchEvent(new dom.window.Event('change'));assert($('#district').value.startsWith('진해구 '));assert.match($('#region-card').textContent,/진해구/);
$('#cut').value='60';$('#cut').dispatchEvent(new dom.window.Event('change'));await tick();assert.match($('#definition').textContent,/60분/);assert.equal(new URL(location.href).searchParams.get('service'),'delivery');assert.equal(new URL(location.href).searchParams.get('cut'),'60');
dom.window.close();
console.log('PASS: story unit switch, workforce selection, fixed scenario toggle, deep-link restore, two-region table, birth units, district filter, 60-minute update, no-WebGL fallback.');
