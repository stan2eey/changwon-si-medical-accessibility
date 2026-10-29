"""Static scene maps rendered directly from the published grid results."""
from pathlib import Path
import json,math,html
root=Path(__file__).resolve().parents[1]/'public'; out=root/'maps';out.mkdir(exist_ok=True)
read=lambda n:json.loads((root/'data'/n).read_text(encoding='utf-8'))
g=read('geometry.json');em=read('code24-30.json');d=read('delivery-30.json');sim=read('scenario-map.json');o=read('overview.json');fac=read('facilities.json');sea=set(g['sea'])
low=next(r['threshold'] for r in o['elderly'] if r['service']=='code24')
def xy(p):return (p[1]*math.cos(math.radians(35.2)),-p[0])
for scene in ['cover','jinjeon','bukmyeon','elderly','ob-facilities','delivery-facilities','delivery-count','delivery-one','scenario-before','scenario-after']:
 area='마산합포구 진전면' if scene in ['jinjeon','scenario-before','scenario-after'] else '의창구 북면' if scene=='bukmyeon' else '마산합포구 진동면' if scene.startswith('delivery-') or scene=='ob-facilities' else ''
 indices=[i for i,n in enumerate(g['names']) if not area or n==area]
 points=[xy(p) for i in indices for p in g['rings'][i]];x0=min(x for x,y in points);y0=min(y for x,y in points);dx=max(x for x,y in points)-x0;dy=max(y for x,y in points)-y0;scale=min(900/dx,650/dy)
 def project(p):
  x,y=xy(p);return (50+(900-dx*scale)/2+(x-x0)*scale,45+(650-dy*scale)/2+(y-y0)*scale)
 body=[]
 for i in indices:
  t=sim['after_minutes'][i] if scene=='scenario-after' else em['minutes'][i]
  c='#806a9b' if i in sea else '#8d9791' if t is None else '#bc492d' if t>30 else '#92b5a1';opacity=1
  if scene.startswith('delivery-') or scene=='ob-facilities':
   c='#dce2d7' if scene.endswith('facilities') else '#806a9b' if i in sea else '#8d9791' if d['minutes'][i] is None else '#bc492d' if d['count'][i]==0 else '#d5a53b' if d['count'][i]==1 else '#4b8b79'
   if scene=='delivery-one' and d['count'][i]!=1:opacity=.18
  if scene=='elderly':
   c='#bc492d' if em['score'][i] is not None and em['score'][i]<=low else '#dce2d7'
  pts=' '.join('%.2f,%.2f'%project(p) for p in g['rings'][i]);body.append(f'<polygon points="{pts}" fill="{c}" opacity="{opacity}" stroke="#fff" stroke-width=".25"/>')
 if scene in ['ob-facilities','delivery-facilities','delivery-count','delivery-one']:
  service='code10' if scene=='ob-facilities' else 'delivery'
  for f in fac:
   if (f['supply'].get(service,0) or 0)>0:
    x,y=project([f['lat'],f['lon']])
    if 0<x<1000 and 0<y<740:body.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="5" fill="#233e36" stroke="white"/><title>{html.escape(f["name"])}</title>')
 if scene=='scenario-after':
  x,y=project(list(reversed(sim['reference_center'])));body.append(f'<path d="M {x} {y-10} l 10 10 -10 10 -10 -10 Z" fill="#765a97" stroke="white"/>')
 title=(area or '창원시')+' · '+('분만기관 도달격자' if scene.startswith('delivery-') else '응급의학과 30분 접근성')
 text=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 760" role="img"><title>{title}</title><rect width="1000" height="760" fill="#e6eadd"/>'+''.join(body)+f'<text x="35" y="735" font-family="sans-serif" font-size="16">{title} · 실제 100m 분석격자</text></svg>'
 (out/(scene+'.svg')).write_text(text,encoding='utf-8')
print('Generated 10 actual-result SVG maps, including delivery and scenario states.')
