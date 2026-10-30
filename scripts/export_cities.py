"""Extract public city aggregates; never infer counts from rounded rates."""
from pathlib import Path
import csv,json,ast,sys,hashlib,re
base=Path(__file__).resolve().parents[1]; root=Path(sys.argv[1])
src=root/'output/national_access_20261028/시군구별_의사수_2026_9.csv'
rows=list(csv.DictReader(src.open(encoding='utf-8-sig')))
tree=ast.parse((root/'scripts/184_medschool_city_workforce.py').read_text(encoding='utf-8'))
med=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='MED' for t in n.targets))
popfile=root/'2. 인구/주민등록_202609_출생등록2020_2025/202609_202609_연령별인구현황_월간.csv'
for enc in ['utf-8-sig','cp949']:
 try: pops=list(csv.reader(popfile.open(encoding=enc)));break
 except UnicodeDecodeError:pass
codes={}
for p in pops[1:]:
 m=re.match(r'(.*?)\s*\((\d{10})\)',p[0])
 if m:codes[m[1].strip()]=m[2]
subjects=[k for k in rows[0] if k not in ['unit','pop']]
groups={'창원':['경상남도 창원시'],**med,**{n:['경기도 '+n+'시'] for n in ['수원','고양','용인','화성']}}
out=[]
for name,units in groups.items():
 selected=[r for r in rows if any(r['unit']==u or r['unit'].startswith(u+' ') for u in units)]
 assert selected,name
 population=sum(int(r['pop']) for r in selected)
 counts={s:sum(int(r[s]) for r in selected) for s in subjects}
 out.append(dict(name=name,group='changwon' if name=='창원' else 'medical' if name in med else 'special',population=population,counts=counts,rates={s:counts[s]/population*100000 for s in subjects},members=[dict(name=r['unit'],code=codes.get(r['unit']),population=int(r['pop']),counts={s:int(r[s]) for s in subjects}) for r in selected]))
gu_source=root/'output/national_access_20261028/창원_구별_기본현황_2026_9.csv'
gu_rows=list(csv.DictReader(gu_source.open(encoding='utf-8-sig')))
cw=next(c for c in out if c['name']=='창원')
cw['members']=[dict(name=r['구'],population=int(r['인구']),counts={s:int(r['의사' if s=='전체 의사' else s]) for s in subjects}) for r in gu_rows if r['구']!='창원시']
assert len(cw['members'])==5
assert sum(m['population'] for m in cw['members'])==cw['population']
for s in subjects:assert sum(m['counts'][s] for m in cw['members'])==cw['counts'][s],s
overview=json.loads((base/'public/data/overview.json').read_text(encoding='utf-8'))
for c in out:
 old=next((r for r in overview['workforce'] if r['구분']==c['name']),None)
 if old:
  assert int(old['인구'])==c['population']
  for s in subjects:assert abs(float(old[s])-c['rates'][s])<.000002
special=[c for c in out if c['group']=='special']
expected=next(r for r in overview['workforce'] if r['구분'].startswith('특례시'))
for s in subjects:assert abs(sum(c['counts'][s] for c in special)/sum(c['population'] for c in special)*100000-float(expected[s]))<.000002
payload=dict(date='2026-09',subjects=subjects,cities=out,source=dict(name=src.name,sha256=hashlib.sha256(src.read_bytes()).hexdigest()),scope='심평원 2026.09 기관별 자료의 의과 일반의·인턴·레지던트·전문의 합계 및 과목별 전문의. 주민등록 인구 2026.09. 원 분석의 기관·행정구역 매칭을 유지.')
(base/'public/data/workforce-cities.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
with (base/'public/data/workforce-cities.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['도시','기준월','인구','진료과','등록인원','인구10만명당'])
 for c in out:
  for s in subjects:w.writerow([c['name'],payload['date'],c['population'],s,c['counts'][s],c['rates'][s]])
print('Verified',len(out),'city aggregates against source counts and published group rates.')
