import {JSDOM} from 'jsdom';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const dom=new JSDOM(fs.readFileSync('dist/data/index.html','utf8'));
globalThis.document=dom.window.document;
await import('../src/scripts/result-sort.js');
const tables=[...document.querySelectorAll('.region-results')];
assert.equal(tables.length,18);
for(const table of tables){
 const rows=()=>[...table.tBodies[0].rows];
 const original=rows().map(r=>r.textContent).sort();
 for(let column=0;column<8;column++){
  const button=table.querySelector(`[data-column="${column}"]`);
  for(const direction of [1,-1]){
   button.click();
   assert.equal(button.closest('th').getAttribute('aria-sort'),direction===1?'ascending':'descending');
   const values=rows().map(r=>r.cells[column].dataset.value??'');
   for(let i=1;i<values.length;i++){
    const a=values[i-1],b=values[i];
    if(b==='')continue;
    assert.notEqual(a,'','Missing values must remain last');
    assert(direction*(column===0?a.localeCompare(b,'ko'):Number(a)-Number(b))<=0);
   }
   assert.deepEqual(rows().map(r=>r.textContent).sort(),original);
  }
 }
}
assert.equal(tables[1].querySelector('th').getAttribute('aria-sort'),'none');
dom.window.close();
console.log('PASS: 18 tables, 8 columns, both sort directions, raw numeric order and unchanged row values.');
