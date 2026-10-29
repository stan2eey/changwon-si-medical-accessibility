// A loaded style is not proof that the worker has processed the grid data.
export function waitForGridData(map, timeoutMs=10000){
 return new Promise((resolve,reject)=>{
  let timer;
  const cleanup=()=>{clearTimeout(timer);map.off('sourcedata',check);map.off('render',check);map.off('error',failed)};
  const finish=error=>{cleanup();error?reject(error):resolve()};
  function check(){
   if(map.isSourceLoaded('grids')&&map.querySourceFeatures('grids').length)finish();
  }
  function failed(event){
   if(event.sourceId==='grids'||/worker/i.test(event.error?.message||''))finish(event.error||Error('Grid source failed'));
  }
  map.on('sourcedata',check);map.on('render',check);map.on('error',failed);
  timer=setTimeout(()=>finish(Error('Grid data timeout')),timeoutMs);
  check();
 });
}
