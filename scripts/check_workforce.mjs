import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=f=>JSON.parse(fs.readFileSync(`public/data/${f}.json`,'utf8'));
const w=read('workforce-cities'),o=read('overview'),cw=w.cities.find(c=>c.name==='창원');
assert.equal(w.date,'2026-06');assert.equal(w.population_date,'2026-09');assert.equal(o.dates.workforce,w.date);
assert.deepEqual(w.subjects.map(s=>cw.counts[s]),[2060,379,127,105,116,52,63,30,77]);
assert.deepEqual(cw.members.map(m=>m.counts['전체 의사']),[493,534,277,574,182]);
const den=(c,s)=>c[s==='산부인과'?'women':s==='소아청소년과'?'youth':'population'];
for(const c of w.cities){
 for(const key of ['population','women','youth'])assert.equal(c[key],c.members.reduce((n,m)=>n+m[key],0));
 for(const s of w.subjects){assert.equal(c.counts[s],c.members.reduce((n,m)=>n+m.counts[s],0));assert.equal(c.rates[s],c.counts[s]/den(c,s)*100000)}
}
const expected={'창원':[209.2,21.6,77.7],'전국':[230.2,23.7,86.9],'의대 보유 비수도권 17개 도시':[248.7,25.9,94.2],'특례시 4곳(수원·고양·용인·화성)':[198.1,23.7,78.4],'경남 시·군(창원 제외)':[160.3,15.7,75.4]};
for(const [name,values] of Object.entries(expected))assert.deepEqual(['전체 의사','산부인과','소아청소년과'].map(s=>Number(Number(o.workforce.find(r=>r['구분']===name)[s]).toFixed(1))),values);
for(const r of o.workforce)for(const s of w.subjects)assert(Math.abs(r[s+'_창원기준차이(명)']-(Number(r[s])-cw.rates[s])*den(cw,s)/100000)<1e-9);
console.log('PASS: final-report workforce values, 22-city member sums, five districts, denominator-specific rates and equivalent count differences.');
