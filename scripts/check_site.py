"""Check built internal links, anchor targets, map data and accessible control labels."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json
root=Path('dist');base='/changwon-si-medical-accessibility/'
class Page(HTMLParser):
 def __init__(self,p):
  super().__init__();self.refs=[];self.ids=[];self.inputs=[];self.labels=set();self.scripts=[];self.feed(p.read_text(encoding='utf-8'))
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id'in a:self.ids.append(a['id'])
  if tag=='label'and 'for'in a:self.labels.add(a['for'])
  if tag in ('select','input'):self.inputs.append(a)
  if tag=='img':assert 'alt' in a,a
  for k in ['href','src']:
   if k in a:self.refs.append(a[k])
pages={p:Page(p) for p in root.rglob('*.html')};count=0
for p,page in pages.items():
 assert len(page.ids)==len(set(page.ids)),f'duplicate ids: {p}'
 for ref in page.refs:
  u=urlsplit(ref)
  if u.scheme or u.netloc:continue
  if u.path.startswith('/'):
   assert u.path.startswith(base),f'base path missing: {ref}'
   target=root/unquote(u.path[len(base):])
  else:target=p.parent/unquote(u.path) if u.path else p
  if target.is_dir():target=target/'index.html'
  assert target.exists(),f'broken link: {p} -> {ref}'
  if u.fragment and target in pages:assert unquote(u.fragment) in pages[target].ids,f'missing anchor: {ref}'
  count+=1
 for a in page.inputs:
  assert a.get('aria-label')or a.get('id')in page.labels or a.get('type')=='checkbox',f'unlabelled control: {p}/{a}'
main=(root/'index.html').read_text(encoding='utf-8')
for value in ['71.9','6.2','2,532','2,730','86.7','386']:assert value in main,value
assert '<math' in (root/'methods/index.html').read_text(encoding='utf-8')
g=json.loads((root/'data/geometry.json').read_text(encoding='utf-8'))
for ring in g['rings']:
 for lat,lon in ring:assert 34<lat<37 and 127<lon<130,(lat,lon)
print(f'PASS: {len(pages)} pages, {count} local links/assets, anchors, input labels, story figures, MathML, grid coordinates.')
