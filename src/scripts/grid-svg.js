// Vector fallback uses the same geometry and colors as the WebGL layer.
export function renderGridSVG(container,g,indices,color,select,facilities=[]){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('svg-grid-map');svg.setAttribute('aria-label','100m 분석격자, 격자를 눌러 결과 보기');svg.setAttribute('role','img');
 const cos=Math.cos(35.2*Math.PI/180),points=indices.flatMap(i=>g.rings[i].map(p=>[p[1]*cos,-p[0]]));
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
 let view=[x-w*.05,y-h*.05,w*1.1,h*1.1];
 const apply=()=>svg.setAttribute('viewBox',view.join(' '));apply();
 let drag=null,moved=false;
 svg.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,view:[...view]};moved=false};
 svg.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;if(!moved)return;svg.setPointerCapture?.(e.pointerId);const box=svg.getBoundingClientRect(),unit=Math.max(drag.view[2]/box.width,drag.view[3]/box.height);view=[drag.view[0]-dx*unit,drag.view[1]-dy*unit,drag.view[2],drag.view[3]];apply()};
 svg.onpointerup=svg.onpointercancel=()=>{drag=null;setTimeout(()=>moved=false,0)};
 for(const i of indices){const p=document.createElementNS(ns,'polygon');p.setAttribute('points',g.rings[i].map(p=>`${p[1]*cos},${-p[0]}`).join(' '));p.setAttribute('fill',color(i));p.dataset.index=i;p.onclick=()=>{if(!moved)select(i)};const t=document.createElementNS(ns,'title');t.textContent=`${g.names[i]}, ${g.ids[i]}`;p.append(t);svg.append(p)}
 for(const f of facilities){const cx=f.lon*cos,cy=-f.lat;if(cx<x||cx>x+w||cy<y||cy>y+h)continue;const c=document.createElementNS(ns,'circle');c.setAttribute('cx',cx);c.setAttribute('cy',cy);c.setAttribute('r',Math.min(w,h)/130);c.setAttribute('fill','#173b38');c.setAttribute('stroke','white');c.setAttribute('stroke-width','.8');c.setAttribute('vector-effect','non-scaling-stroke');const t=document.createElementNS(ns,'title');t.textContent=f.label;c.append(t);svg.append(c)}
 container.replaceChildren(svg);
 return {zoom(factor){const [x,y,w,h]=view;view=[x+w*(1-factor)/2,y+h*(1-factor)/2,w*factor,h*factor];apply()},focus(i){const pts=g.rings[i].map(p=>[p[1]*cos,-p[0]]);const cx=pts.reduce((s,p)=>s+p[0],0)/pts.length,cy=pts.reduce((s,p)=>s+p[1],0)/pts.length;view=[cx-.002,cy-.002,.004,.004];apply()},select(i){svg.querySelector('.selected')?.classList.remove('selected');svg.querySelector(`[data-index="${i}"]`)?.classList.add('selected')}};
}
