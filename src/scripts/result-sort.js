export function initResultSorting(root=document){
 for(const table of root.querySelectorAll('.region-results')){
  const body=table.tBodies[0];
  for(const button of table.querySelectorAll('button[data-column]')){
   button.addEventListener('click',()=>{
    const column=Number(button.dataset.column),header=button.closest('th');
    const ascending=header.getAttribute('aria-sort')!=='ascending';
    const entries=[...body.rows];
    entries.sort((a,b)=>{
     const x=a.cells[column].dataset.value??'',y=b.cells[column].dataset.value??'';
     if(x===''||y==='')return x==y?0:x===''?1:-1;
     const comparison=column===0?x.localeCompare(y,'ko'):Number(x)-Number(y);
     return (ascending?1:-1)*comparison;
    });
    body.append(...entries);
    for(const other of table.querySelectorAll('button[data-column]')){
     const selected=other===button;
     other.closest('th').setAttribute('aria-sort',selected?(ascending?'ascending':'descending'):'none');
     other.querySelector('.sort-arrow').textContent=selected?(ascending?'↑':'↓'):'↕';
     other.setAttribute('aria-label',`${other.dataset.label}, ${selected&&ascending?'내림차순':'오름차순'} 정렬`);
    }
   });
  }
 }
}
initResultSorting();
