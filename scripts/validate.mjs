import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('public/data');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const g=read('geometry.json'),o=read('overview.json'),rows=read('districts.json');
assert.equal(g.ids.length,10099);assert.equal(new Set(g.ids).size,10099);assert.equal(new Set(g.names).size,55);assert.equal(g.sea.length,11);
assert.equal(rows.length,55*9*2);assert.equal(new Set(rows.map(r=>`${r.area}/${r.service}/${r.minutes}`)).size,990);
for(const forbidden of ['total','female','fer1549','peds019','elderly65'])assert(!Object.hasOwn(g,forbidden),`demographic grid field exported: ${forbidden}`);
for(const [s,info] of Object.entries(o.services))for(const c of [30,60]){
 const d=read(`${s}-${c}.json`);
 for(const key of ['score','minutes','count','count_cw','count_outside','second','status'])assert.equal(d[key].length,g.ids.length,`${s}-${c}/${key}`);
 d.score.forEach((v,i)=>assert(v===null||(Number.isFinite(v)&&v>=0),`${s}-${c}/${i}`));
 for(const i of g.sea)assert.equal(d.score[i],null,`sea treated as number: ${s}-${c}/${i}`);
 for(let i=0;i<g.ids.length;i++)if(d.count[i]!=null)assert.equal(d.count[i],d.count_cw[i]+d.count_outside[i]);
 const rs=rows.filter(r=>r.service===s&&r.minutes===c);assert.equal(rs.length,55);
 for(const r of rs){assert(r.target_population>=0);for(const k of ['over_population','one_population','unknown_population','sea_population'])assert(r[k]>=0&&r[k]<=r.target_population+1e-4,`${r.area}/${s}/${c}/${k}`);assert(Math.abs(r.target_population-r.known_population-r.unknown_population-r.sea_population)<.001,`${r.area}/${s}/${c}: denominator mismatch`)}
}
const find=(a,s='code24')=>rows.find(r=>r.area.split(' ').at(-1)===a&&r.service===s&&r.minutes===30);
assert.equal((100*find('진전면').over_population/find('진전면').target_population).toFixed(1),'71.9');
assert.equal((100*find('북면').over_population/find('북면').target_population).toFixed(1),'6.2');
assert(find('북면').over_population>find('진전면').over_population);
const jd=find('진동면','delivery');assert.equal((100*jd.women_one/jd.women_population).toFixed(1),'86.7');
assert(jd.target_population>33&&jd.target_population<34);assert(jd.mean>0);
const cw=o.workforce.find(r=>r['구분']==='창원'),sc=o.workforce.find(r=>r['구분'].startsWith('특례시'));assert(Number(cw['전체 의사'])>Number(sc['전체 의사']));
const scenario=o.scenario.find(r=>r['진료과']==='응급의학과'&&r['지역']==='진전면');assert.equal(Math.round(Number(scenario['30분초과_후'])),386);
const scenarioMap=read('scenario-map.json');assert.equal(scenarioMap.after_minutes.length,g.ids.length);assert(Math.abs(scenarioMap.verified_jinjeon_over-Number(scenario['30분초과_후']))<1e-5);assert(g.ids.includes(scenarioMap.site_grid));
const facilities=read('facilities.json');for(const f of facilities)assert.deepEqual(Object.keys(f).sort(),['name','kind','area','address','supply','lat','lon','cw'].sort());
for(const f of fs.readdirSync(root)){const t=fs.readFileSync(path.join(root,f),'utf8');assert(!/(?:gh[pousr]_[A-Za-z0-9]{25,}|sk-[A-Za-z0-9]{25,}|C:\\\\Users\\\\|serviceKey=|apiKey=|ykiho)/i.test(t),`non-public field or credential pattern in ${f}`)}
console.log('PASS: 990 district rows; 18 grid result files; story figures, denominators, sea exclusions, facility allowlist and disclosure scan.');
