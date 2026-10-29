"""Local-only research export. Usage: python scripts/export_research.py <analysis-root>.
No credentials, internal IDs, demographic grid values or source paths are exported.
"""
from pathlib import Path
import csv, json, sys, hashlib, re
import numpy as np
B=Path(sys.argv[1]).resolve(); R=B/'output/reanalysis_20261027';N=B/'output/national_access_20261028'
BASE=Path(__file__).resolve().parents[1];OUT=BASE/'public/data';OUT.mkdir(parents=True,exist_ok=True)
def read(name):return json.loads(name.read_text(encoding='utf-8'))
def csvrows(name):return list(csv.DictReader(name.open(encoding='utf-8-sig')))
def clean(x):
 if isinstance(x,(float,np.floating)):return round(float(x),6) if np.isfinite(x) else None
 if isinstance(x,np.ndarray):return clean(x.tolist())
 if isinstance(x,list):return [clean(v) for v in x]
 if isinstance(x,dict):return {k:clean(v) for k,v in x.items()}
 if isinstance(x,np.integer):return int(x)
 return x
def save(name,data):
 (OUT/name).write_text(json.dumps(clean(data),ensure_ascii=False,separators=(',',':'),allow_nan=False),encoding='utf-8')
a=read(R/'analysis.json');c=read(R/'context.json');g=a['grids'];n=len(g['ids'])
districts=csvrows(R/'읍면동별_접근성과_대체기관.csv')
for row in districts:
 for k in row:
  if k not in ('service','label','area'):row[k]=float(row[k]) if row[k] else None
save('geometry.json',{'ids':g['ids'],'names':g['names'],'rings':g['rings'],'sea':g['sea']})
save('boundaries.json',{'boundaries':c['boundaries'],'gu':c['gu']})
# Whitelist of public professional fields, no API identifiers.
save('facilities.json',[{k:f[k] for k in ['name','kind','area','address','supply','lat','lon','cw']} for f in c['facilities']])
for s in a['services']:
 for cut in ('30','60'):
  save(f'{s}-{cut}.json',{'score':a['scores'][s][cut]['continuous'],**a['reach'][s][cut]})
# Reproduce the existing fertility implementation in isolation; only output destinations change.
# Full source is inspected locally. Its inputs and calculations remain unchanged.
src=B/'scripts/203_birth_demand_sensitivity.py';code=src.read_text(encoding='utf-8')
code=code[:code.index('out=[];dong=[]')]
ns={'__file__':str(src),'__name__':'export_birth_model'}
exec(compile(code,str(src),'exec'),ns)
birth=ns['births'][:n];good=ns['good'];women=ns['fer'][:n]
services=dict(a['services']);services['delivery']=dict(services['delivery'])
services['delivery'].update(demand_label='연간 기대출생아',unit='연간 기대출생아 1만 명당 가중 분만실 병상')
birth_audit=[]
for cut in ('30','60'):
 score=ns['score'](int(cut),ns['dem_b']);score[~good]=np.nan
 reach=a['reach']['delivery'][cut]
 save(f'delivery-{cut}.json',{'score':score,**reach})
 for row in districts:
  if row['service']!='delivery' or row['minutes']!=int(cut):continue
  ix=np.array(g['names'])==row['area'];valid=ix&good
  old_total=row['target_population'];old_over=row['over_population'];old_one=row['one_population']
  row.update(women_population=old_total,women_over=old_over,women_one=old_one)
  row['target_population']=float(birth[ix].sum());row['known_population']=float(birth[valid].sum())
  row['mean']=float(np.sum(score[valid]*birth[valid])/birth[valid].sum()) if birth[valid].sum() else None
  row['over_population']=float(birth[valid&(ns['near']>int(cut))].sum())
  row['one_population']=float(birth[valid&(np.array(reach['count'])==1)].sum())
  sea=np.zeros(n,dtype=bool);sea[g['sea']]=True
  row['sea_population']=float(birth[ix&sea].sum());row['unknown_population']=float(birth[ix&~good&~sea].sum())
  row['low20_population']=None;row['elderly_in_low_area']=None
  row['label']='분만실 병상 · 기대출생아 수요'
 birth_audit.append({'cut':cut,'mean':float(np.sum(score[good]*birth[good])/birth[good].sum())})
# Check reproduced values against the existing sensitivity output, not against generated output.
checks=csvrows(N/'분만_출산율보정_민감도.csv')
for x,y in zip(birth_audit,checks):assert abs(x['mean']-float(y['보정 평균(예상출생 1만 명당 병상)']))<.00051,(x,y)
save('districts.json',districts)
with (OUT/'districts.csv').open('w',encoding='utf-8-sig',newline='') as f:
 keys=list(dict.fromkeys(k for r in districts for k in r));w=csv.DictWriter(f,fieldnames=keys);w.writeheader();w.writerows(districts)
workforce=csvrows(N/'의대보유도시_인구10만명당_2026_9.csv')
scenario=csvrows(N/'진전면_전문의2명_시나리오.csv')
# Reconstruct the fixed scenario's new travel-time vector without writing to research outputs.
scenario_source=B/'scripts/191_jinjeon_scenario.py'
scenario_code=scenario_source.read_text(encoding='utf-8')
scenario_code=scenario_code[:scenario_code.index('rows=[]')]
sn={'__file__':str(scenario_source),'__name__':'export_scenario'}
exec(compile(scenario_code,str(scenario_source),'exec'),sn)
nearest_before=sn['near']['code24'];nearest_after=np.minimum(nearest_before,sn['tnew'][:n])
valid=sn['good'][:n]&np.isfinite(nearest_before)
after_public=np.where(valid,nearest_after,np.nan)
jj=(np.array(g['names'])=='마산합포구 진전면')&valid
calculated=float(sn['z']['total'][:n][jj&(nearest_after>30)].sum())
expected=float(next(r for r in scenario if r['진료과']=='응급의학과' and r['지역']=='진전면')['30분초과_후'])
assert abs(calculated-expected)<1e-6,(calculated,expected)
site=int(sn['site']);ring=np.array(g['rings'][site]);center=ring[:4].mean(axis=0)
save('scenario-map.json',{'after_minutes':after_public,'site_grid':g['ids'][site],'site_index':site,'reference_center':[center[1],center[0]],'site_note':'표시는 가상입지의 기준격자 중심. 계산 위치는 해당 격자의 도로 접속 노드.','verified_jinjeon_over':calculated})
eld=[]
for s in services:
 if s in ('delivery','code10','code11'):continue
 sc=np.array([np.nan if v is None else v for v in a['scores'][s]['30']['continuous']]);ok=np.isfinite(sc)
 threshold=np.quantile(sc[ok],.2);low=ok&(sc<=threshold)
 eld.append({'service':s,'elderly':float(np.array(g['elderly65'])[low].sum()),'population':float(np.array(g['total'])[low].sum()),'grids':int(low.sum()),'threshold':float(threshold)})
save('overview.json',{'services':services,'workforce':workforce,'scenario':scenario,'elderly':eld,'birth_audit':birth_audit,'dates':{'analysis':'2026-10-27','birth_revision':'2026-10-29','workforce':'2026-09','supply':'2026-10-22~26','population':'창원 2026-09 / 외부 2024','boundary':'SGIS 2025년 2분기'},'gridCount':n})
manifest=[]
for p in [R/'analysis.json',R/'읍면동별_접근성과_대체기관.csv',N/'진전면_전문의2명_시나리오.csv',N/'의대보유도시_인구10만명당_2026_9.csv',src,scenario_source]:
 manifest.append({'name':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
save('provenance.json',{'version':'2026-10-30.1','source_files':manifest,'birth_validation':birth_audit,'notes':['분만 점수는 203번 실행 코드의 기대출생아 수요로 재현','비율 분모는 전체 대상인구. 경로 미확인·배편은 별도 표시','9월 공급률과 10월 상세모형 공급량은 서로 다른 자료 시점','원자료·격자별 세부 인구·내부 기관 ID는 내보내지 않음']})
print('Export verified:',n,'grids;',len(districts),'district/service/time rows')
