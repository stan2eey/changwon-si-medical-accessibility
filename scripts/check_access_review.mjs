import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {TIME_BINS,timeColor,applyAccessReview,reviewedRows} from '../src/scripts/access-display.js';
const read=f=>JSON.parse(fs.readFileSync(`public/data/${f}`,'utf8'));
const review=read('access-review.json'),g=read('geometry.json'),rows=read('districts.json'),overview=read('overview.json');
assert.equal(review.review_indices.length,5);
assert.deepEqual(review.review_indices.map(i=>g.ids[i]).sort(),[...review.review_grid_ids].sort());
for(const [file,hash]of Object.entries(review.source_hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(`public/data/${file}`)).digest('hex'),hash,`Regenerate access-review.json after updating ${file}`);
const adjusted=reviewedRows(rows,review);
for(const s of Object.keys(overview.services))for(const cut of [30,60]){
 const raw=read(`${s}-${cut}.json`),copy=JSON.stringify(raw),d=applyAccessReview(raw,review);
 assert.equal(JSON.stringify(raw),copy,'Review must not mutate archived results');
 for(const i of review.review_indices){assert.equal(d.status[i],'route_review');for(const key of ['minutes','score','count','count_cw','count_outside','second'])assert.equal(d[key][i],null)}
 const baseline=g.ids.indexOf('라라817823');assert.equal(d.minutes[baseline],raw.minutes[baseline]);
 const c=review.city[s][cut],sum=c.time_population.reduce((a,b)=>a+b,0)+c.unknown+c.review+c.sea;
 assert(Math.abs(sum-c.total)<.01,'City population partition');
 for(const r of adjusted.filter(r=>r.service===s&&r.minutes===cut)){
  assert(Math.abs(r.known_population+r.unknown_population+r.sea_population-r.target_population)<.001);
  assert(r.over_population>=0&&r.one_population>=0&&r.over_population+r.one_population<=r.known_population+.001);
 }
 const known=adjusted.filter(r=>r.service===s&&r.minutes===cut).reduce((v,r)=>v+r.known_population,0);
 assert(Math.abs(known-c.time_population.reduce((a,b)=>a+b,0))<.01);
 assert(review.score_scale[s]>0);
}
assert.equal(timeColor(null),'#8d9791');assert.equal(timeColor(15),TIME_BINS[0].color);assert.equal(timeColor(30),TIME_BINS[1].color);assert.equal(timeColor(45),TIME_BINS[2].color);assert.equal(timeColor(60),TIME_BINS[3].color);assert.equal(timeColor(60.01),TIME_BINS[4].color);
console.log('PASS: source hashes, five uncertain routes withheld, archived inputs unchanged, population partitions, district summaries, fixed time boundaries, shared score scales.');
