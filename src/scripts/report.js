import {PageFlip} from 'page-flip';
const $=s=>document.querySelector(s),reader=$('#pdf-reader'),viewport=$('#pdf-viewport'),sheet=$('#pdf-sheet'),zoom=$('#pdf-zoom'),status=$('#pdf-status'),full=$('#pdf-fullscreen');
const base=import.meta.env.BASE_URL;
let pages=[],book,pageIndex=0,timer,flipping=false,lastSize='';
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function controls(){
 const first=Math.floor(pageIndex/2)*2+1,last=Math.min(first+1,pages.length);
 $('#book-prev').disabled=!book||first===1;$('#book-next').disabled=!book||last===pages.length;
 status.textContent=(first===last?first:first+'–'+last)+' / '+pages.length+'페이지';
}
function build(){
 if(!pages.length)return;
 const pad=innerWidth<=650?8:16,w=Math.max(160,viewport.clientWidth-pad),h=Math.max(160,viewport.clientHeight-pad),ratio=pages[0].height/pages[0].width;
 const fit=Math.min(w/2,h/ratio);
 const width=Math.floor(zoom.value==='fit'?fit:zoom.value==='width'?w/2:w/2*Number(zoom.value)),height=Math.floor(width*ratio);
 const size=width+':'+height;
 if(size===lastSize&&book)return;lastSize=size;
 if(book){pageIndex=book.getCurrentPageIndex();book.destroy()}
 const element=document.createElement('div');element.className='report-book';sheet.replaceChildren(element);
 const nodes=pages.map((page,i)=>{
  const node=document.createElement('div');node.className='book-page';node.dataset.density='soft';
  const img=document.createElement('img');img.src=base+'reports/'+page.src;img.alt='보고서 '+(i+1)+'페이지';img.draggable=false;img.decoding='async';node.append(img);element.append(node);return node;
 });
 if(nodes.length%2){const blank=document.createElement('div');blank.className='book-page blank-page';blank.setAttribute('aria-label','보고서 끝, 빈 면');element.append(blank);nodes.push(blank)}
 book=new PageFlip(element,{width,height,size:'fixed',usePortrait:false,showCover:false,autoSize:false,flippingTime:reduced()?1:750,drawShadow:!reduced(),maxShadowOpacity:.22,mobileScrollSupport:false,showPageCorners:!reduced(),disableFlipByClick:false,startPage:pageIndex});
 book.on('flip',e=>{pageIndex=e.data;controls()});
 book.on('changeState',e=>{flipping=e.data!=='read';reader.dataset.flipState=e.data});
 book.on('init',()=>{controls();viewport.setAttribute('aria-busy','false')});
 book.loadFromHTML(nodes);controls();viewport.scrollTop=0;viewport.scrollLeft=0;
}
function step(direction){if(!book||flipping)return;if(direction<0&&pageIndex<2||direction>0&&pageIndex+2>=pages.length)return;if(reduced()){direction>0?book.turnToNextPage():book.turnToPrevPage()}else{direction>0?book.flipNext('bottom'):book.flipPrev('bottom')}}
zoom.addEventListener('change',build);
 $('#book-prev').addEventListener('click',()=>step(-1));$('#book-next').addEventListener('click',()=>step(1));
function syncFull(){const active=!!document.fullscreenElement||reader.classList.contains('is-expanded');full.textContent=active?'전체화면 닫기':'전체화면';full.setAttribute('aria-pressed',String(active));setTimeout(build,80)}
full.addEventListener('click',async()=>{
 try{if(document.fullscreenElement)await document.exitFullscreen();else if(reader.classList.contains('is-expanded')){reader.classList.remove('is-expanded');document.body.classList.remove('reader-expanded')}else if(reader.requestFullscreen)await reader.requestFullscreen();else{reader.classList.add('is-expanded');document.body.classList.add('reader-expanded')}}catch{reader.classList.toggle('is-expanded');document.body.classList.toggle('reader-expanded',reader.classList.contains('is-expanded'))}syncFull();
});
document.addEventListener('fullscreenchange',syncFull);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&reader.classList.contains('is-expanded')){reader.classList.remove('is-expanded');document.body.classList.remove('reader-expanded');syncFull()}if(e.altKey||e.ctrlKey||e.metaKey||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();step(e.key==='ArrowLeft'?-1:1)}});
new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(build,180)}).observe(viewport);
(async()=>{try{const response=await fetch(base+'reports/pages.json');if(!response.ok)throw Error(response.status);pages=await response.json();await Promise.all(pages.slice(0,2).map(page=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=reject;img.src=base+'reports/'+page.src})));build()}catch(error){status.textContent='보고서를 불러오지 못했습니다.';viewport.setAttribute('aria-busy','false');$('#pdf-error').hidden=false;console.error(error)}})();
