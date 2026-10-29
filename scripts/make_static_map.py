from pathlib import Path
import json,html,math
from shapely.geometry import shape
B=Path(__file__).resolve().parents[1];d=json.loads((B/'public/data/boundaries.json').read_text(encoding='utf-8'))
feats=d['boundaries']['features'];geoms=[shape(f['geometry']).simplify(.00045,preserve_topology=True) for f in feats]
x0=min(g.bounds[0] for g in geoms);y0=min(g.bounds[1] for g in geoms);x1=max(g.bounds[2] for g in geoms);y1=max(g.bounds[3] for g in geoms)
scale=min(500/((x1-x0)*.82),540/(y1-y0))
def point(x,y):return 30+(x-x0)*.82*scale,30+(y1-y)*scale
paths=[];labels=[]
for f,g in zip(feats,geoms):
 name=f['properties']['ADM_NM'];polys=[g] if g.geom_type=='Polygon' else list(g.geoms)
 path=' '.join('M'+'L'.join(f'{point(x,y)[0]:.1f},{point(x,y)[1]:.1f}' for x,y in poly.exterior.coords)+'Z' for poly in polys)
 color='#dfe5da';stroke='#f6f5f0'
 if name=='진전면':color='#b14f34'
 if name=='북면':color='#2d6b59'
 paths.append(f'<path d="{path}" fill="{color}" stroke="{stroke}" stroke-width="1.2"><title>{html.escape(name)}</title></path>')
 if name in ('진전면','북면'):
  p=g.representative_point();x,y=point(p.x,p.y);labels.append(f'<circle cx="{x}" cy="{y}" r="4" fill="white"/><text x="{x+10}" y="{y+5}" font-size="16" font-weight="700" fill="white">{name}</text>')
svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 600" role="img" aria-label="창원시 행정구역. 진전면은 주황색, 북면은 녹색으로 강조">'+''.join(paths+labels)+'</svg>'
(B/'public/changwon.svg').write_text(svg,encoding='utf-8')
print('Static map:',len(feats),'districts')
