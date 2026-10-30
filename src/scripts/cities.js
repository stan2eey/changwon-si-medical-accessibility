const base=import.meta.env.BASE_URL,$=s=>document.querySelector(s),fmt=(n,d=1)=>Number(n).toLocaleString('ko-KR',{maximumFractionDigits:d});
async function init(){
 const [w,o]=await Promise.all(['workforce-cities.json','overview.json'].map(f=>fetch(`${base}data/${f}`).then(r=>{if(!r.ok)throw Error(r.status);return r.json()})));
 const params=new URLSearchParams(location.search);
 for(const [key,id] of [['group','city-group'],['subject','city-subject'],['a','city-a'],['b','city-b'],['sort','city-sort']]){if([...$('#'+id).options].some(x=>x.value===params.get(key)))$('#'+id).value=params.get(key)}
 const city=n=>w.cities.find(c=>c.name===n),subject=()=>$('#city-subject').value;
 function render(){
  const s=subject(),group=$('#city-group').value,cw=city('창원').rates[s],avg=Number(o.workforce.find(r=>r['구분']==='의대 보유 비수도권 17개 도시')[s]);
  let entries=group==='summary'?['창원','전국','의대 보유 비수도권 17개 도시','특례시 4곳(수원·고양·용인·화성)'].map((name,i)=>({name:i===2?'17개 비교지역 평균':i===3?'특례시 4곳 평균':name,rate:Number(o.workforce.find(r=>r['구분']===name)[s]),open:i===2?'medical':i===3?'special':null})):w.cities.filter(c=>c.group===group||group==='all'||c.name==='창원').map(c=>({name:c.name,rate:c.rates[s]}));
  entries.sort((a,b)=>$('#city-sort').value==='name'?a.name.localeCompare(b.name,'ko'):($('#city-sort').value==='asc'?1:-1)*(a.rate-b.rate));
  const max=Math.max(...entries.map(e=>e.rate),avg,cw)*1.08;
  $('#city-chart').innerHTML=entries.map(e=>`<button class="city-row ${e.name==='창원'?'is-changwon':''}" data-name="${e.name}" ${e.open?`data-open="${e.open}"`:''}><span>${e.name}${e.open?' ↗':''}</span><span class="city-track"><i class="city-bar" style="width:${100*e.rate/max}%"></i><i class="cw-line" style="left:${100*cw/max}%"></i><i class="avg-line" style="left:${100*avg/max}%"></i></span><strong>${fmt(e.rate)}</strong></button>`).join('');
  $('#city-benchmarks').textContent=`${s}, 창원 ${fmt(cw)}명 / 17개 비교지역 인구가중 평균 ${fmt(avg)}명, 전체 주민 10만 명당`;
  $('#city-chart').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.dataset.open){$('#city-group').value=b.dataset.open;render()}else if(city(b.dataset.name)){$('#city-b').value=b.dataset.name;details();$('#city-detail').scrollIntoView?.({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}});
  details();
 }
 function details(){const a=city($('#city-a').value),b=city($('#city-b').value),s=subject();
  $('#city-cards').innerHTML=[a,b].map(c=>`<article><h3>${c.name}</h3><p>인구 <b>${fmt(c.population,0)}명</b></p><p>${s} 등록인원 <b>${fmt(c.counts[s],0)}명</b></p><p>인구 10만 명당 <strong>${fmt(c.rates[s])}명</strong></p><p class="small">창원과 차이 ${(c.rates[s]-city('창원').rates[s])>0?'+':''}${fmt(c.rates[s]-city('창원').rates[s])}명, 2026.09</p></article>`).join('');
  $('#city-detail-head').innerHTML=`<tr><th scope="col" rowspan="2">진료과</th><th scope="colgroup" colspan="2">${a.name}</th><th scope="colgroup" colspan="2">${b.name}</th><th scope="col" rowspan="2">공급률 차이<br><small>${b.name} − ${a.name}</small></th><th scope="col" rowspan="2">인구수 차이<br><small>${b.name} − ${a.name}<br>(단위 : 명)</small></th></tr><tr><th scope="col">인원 (명)</th><th scope="col">공급률</th><th scope="col">인원 (명)</th><th scope="col">공급률</th></tr>`;
  $('#city-detail-rows').innerHTML=w.subjects.map((s,i)=>`<tr><th scope="row">${s}</th><td>${fmt(a.counts[s],0)}</td><td>${fmt(a.rates[s])}</td><td>${fmt(b.counts[s],0)}</td><td>${fmt(b.rates[s])}</td><td>${fmt(b.rates[s]-a.rates[s])}</td>${i===0?`<td rowspan="${w.subjects.length}" class="population-difference">${fmt(b.population-a.population,0)}</td>`:''}</tr>`).join('');
  $('#city-members').innerHTML=[...new Set([a,b])].map(c=>`<details><summary>${c.name} 세부 지역 (${c.members.length}곳)</summary><div class="table-wrap"><table><thead><tr><th>지역</th><th>인구</th><th>${s} 인원</th><th>10만 명당</th></tr></thead><tbody>${c.members.map(m=>`<tr><th>${m.name}</th><td>${fmt(m.population,0)}</td><td>${fmt(m.counts[s],0)}</td><td>${fmt(m.counts[s]/m.population*100000)}</td></tr>`).join('')}</tbody></table></div></details>`).join('');
  const p=new URLSearchParams({group:$('#city-group').value,subject:s,a:a.name,b:b.name,sort:$('#city-sort').value});history.replaceState(null,'',`${location.pathname}?${p}`);
 }
 for(const id of ['city-group','city-subject','city-sort'])$('#'+id).onchange=render;
 for(const id of ['city-a','city-b'])$('#'+id).onchange=details;
 render();
}
init().catch(()=>document.querySelector('#city-chart').textContent='자료를 불러오지 못했습니다. 아래 CSV에서 도시별 값을 확인할 수 있습니다.');
