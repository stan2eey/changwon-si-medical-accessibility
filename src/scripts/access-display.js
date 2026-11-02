export const TIME_BINS=[
 {limit:15,label:'15분 이내',color:'#44816c'},
 {limit:30,label:'15분 초과~30분',color:'#becabd'},
 {limit:45,label:'30분 초과~45분',color:'#d6bd83'},
 {limit:60,label:'45분 초과~60분',color:'#c67650'},
 {limit:Infinity,label:'60분 초과',color:'#873726'},
];
export const numeric=v=>v!=null&&Number.isFinite(Number(v));
export function timeColor(t){return numeric(t)?TIME_BINS.find(b=>t<=b.limit).color:'#8d9791'}
export function applyAccessReview(raw,review){
 const out=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,Array.isArray(v)?[...v]:v]));
 for(const i of review.review_indices){
  if(out.status[i]==='sea')continue;
  for(const key of ['score','minutes','count','count_cw','count_outside','second'])out[key][i]=null;
  out.status[i]='route_review';
 }
 return out;
}
export function reviewedRows(rows,review){
 const key=r=>`${r.area}/${r.service}/${r.minutes}`,overrides=new Map(review.district_overrides.map(r=>[key(r),r]));
 return rows.map(r=>overrides.get(key(r))||r);
}
