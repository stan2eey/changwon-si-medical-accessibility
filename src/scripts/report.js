import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist';
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc=worker;
const $=s=>document.querySelector(s),reader=$('#pdf-reader'),viewport=$('#pdf-viewport'),sheet=$('#pdf-sheet'),input=$('#pdf-page'),prev=$('#pdf-prev'),next=$('#pdf-next'),zoom=$('#pdf-zoom'),status=$('#pdf-status'),full=$('#pdf-fullscreen');
const base=import.meta.env.BASE_URL;
let pdf,pageNumber=1,revision=0,renderTask,timer;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function controls(){input.value=pageNumber;prev.disabled=!pdf||pageNumber<=1;next.disabled=!pdf||pageNumber>=pdf.numPages;input.disabled=!pdf}
async function render(direction=0){
 if(!pdf)return;
 const ticket=++revision;
 renderTask?.cancel();
 viewport.setAttribute('aria-busy','true');status.textContent='페이지를 불러오고 있습니다.';
 try{
  const page=await pdf.getPage(pageNumber);if(ticket!==revision)return;
  const natural=page.getViewport({scale:1}),pad=innerWidth<=650?20:40;
  const width=Math.max(120,viewport.clientWidth-pad),height=Math.max(120,viewport.clientHeight-pad);
  const fit=Math.min(width/natural.width,height/natural.height);
  const scale=zoom.value==='fit'?fit:zoom.value==='width'?width/natural.width:width/natural.width*Number(zoom.value);
  const view=page.getViewport({scale}),pixelRatio=Math.max(2,Math.min(devicePixelRatio||1,3));
  const canvas=document.createElement('canvas');canvas.width=Math.floor(view.width*pixelRatio);canvas.height=Math.floor(view.height*pixelRatio);canvas.style.width=view.width+'px';canvas.style.height=view.height+'px';
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label','보고서 '+pageNumber+'페이지');
  renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport:view,transform:[pixelRatio,0,0,pixelRatio,0,0]});
  await renderTask.promise;if(ticket!==revision)return;
  sheet.replaceChildren(canvas);viewport.scrollTop=0;viewport.scrollLeft=0;
  if(direction&&!reduced())canvas.animate([{opacity:.4,transform:'translateX('+direction*24+'px)'},{opacity:1,transform:'translateX(0)'}],{duration:230,easing:'cubic-bezier(.2,.7,.2,1)'});
  status.textContent=pageNumber+' / '+pdf.numPages+'페이지';$('#pdf-error').hidden=true;
 }catch(error){if(ticket===revision&&error.name!=='RenderingCancelledException'){status.textContent='페이지를 불러오지 못했습니다.';$('#pdf-error').hidden=false;console.error(error)}}
 finally{if(ticket===revision)viewport.setAttribute('aria-busy','false')}
}
function go(value){if(!pdf)return;const target=Math.max(1,Math.min(pdf.numPages,Math.trunc(Number(value))||1));const direction=Math.sign(target-pageNumber);pageNumber=target;controls();render(direction)}
prev.addEventListener('click',()=>go(pageNumber-1));next.addEventListener('click',()=>go(pageNumber+1));
input.addEventListener('change',()=>go(input.value));input.addEventListener('keydown',e=>{if(e.key==='Enter'){go(input.value);input.blur()}});
zoom.addEventListener('change',()=>render());
function syncFull(){const active=!!document.fullscreenElement||reader.classList.contains('is-expanded');full.textContent=active?'전체화면 닫기':'전체화면';full.setAttribute('aria-pressed',String(active));setTimeout(()=>render(),60)}
full.addEventListener('click',async()=>{
 try{if(document.fullscreenElement)await document.exitFullscreen();else if(reader.classList.contains('is-expanded')){reader.classList.remove('is-expanded');document.body.classList.remove('reader-expanded')}else if(reader.requestFullscreen)await reader.requestFullscreen();else{reader.classList.add('is-expanded');document.body.classList.add('reader-expanded')}}catch{reader.classList.toggle('is-expanded');document.body.classList.toggle('reader-expanded',reader.classList.contains('is-expanded'))}syncFull();
});
document.addEventListener('fullscreenchange',syncFull);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&reader.classList.contains('is-expanded')){reader.classList.remove('is-expanded');document.body.classList.remove('reader-expanded');syncFull()}if(e.altKey||e.ctrlKey||e.metaKey||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();go(pageNumber+(e.key==='ArrowLeft'?-1:1))}});
let touch;
viewport.addEventListener('touchstart',e=>{touch=e.touches.length===1&&zoom.value==='fit'?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null},{passive:true});
viewport.addEventListener('touchend',e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5)go(pageNumber+(dx<0?1:-1));touch=null},{passive:true});
new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>render(),150)}).observe(viewport);
(async()=>{try{pdf=await getDocument({url:reader.dataset.pdf,cMapUrl:base+'pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:base+'pdfjs/standard_fonts/',wasmUrl:base+'pdfjs/wasm/'}).promise;input.max=pdf.numPages;$('#pdf-total').textContent='/ '+pdf.numPages;controls();await render()}catch(error){status.textContent='보고서를 불러오지 못했습니다.';viewport.setAttribute('aria-busy','false');$('#pdf-error').hidden=false;console.error(error)}})();
