"""Align public workforce comparisons with final report 16; spatial results unchanged."""
from pathlib import Path
import csv, json, re, hashlib
import openpyxl

BASE=Path(__file__).resolve().parents[1]
ROOT=BASE.parents[1]/'310_연구_플라토/8. 접근성분석'
RAW=ROOT.parent/'의료 접근성분석 추가데이터/진짜데이터'
OUT=ROOT/'output/national_access_20261028'
num=lambda v:0 if v in (None,'-','') else int(float(str(v).replace(',','')))
specfile=RAW/'354_DT_HIRA4S_20261030074924.xls'
s=specfile.read_bytes().decode('euc-kr','ignore')
rows=[[re.sub(r'<[^>]+>','',c).strip() for c in re.findall(r'<Cell[^>]*>(.*?)</Cell>',r,re.S)] for r in re.findall(r'<Row[^>]*>(.*?)</Row>',s,re.S)]
ix=rows[1].index('2026.2/4'); vals={}; province=None
provinces=['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주']
for r in rows[2:]:
 if len(r)<=ix or r[2]!='전문의 인원현황[명]':continue
 if r[0]=='전체':key=('전체','계')
 elif r[0] in provinces:province=r[0];key=(province,'계')
 else:key=(province,r[0].replace(' ',''))
 vals.setdefault(key,{})[r[1]]=num(r[ix])
docfile=RAW/'시군구_지역별종별_의료인력현황_의사등_2026년2분기.xlsx'
docs=[(r[0],r[1].replace(' ',''),num(r[3])) for r in list(openpyxl.load_workbook(docfile,read_only=True).worksheets[0].iter_rows(values_only=True))[4:] if r and r[2]=='소계' and r[1] not in (None,'','계')]
popfile=ROOT/'2. 인구/주민등록_202609_출생등록2020_2025/202609_202609_연령별인구현황_월간.csv'
for enc in ['utf-8-sig','cp949']:
 try:poprows=list(csv.DictReader(popfile.open(encoding=enc)));break
 except UnicodeDecodeError:pass
pops={}
for r in poprows:
 name=re.sub(r'\s*\(\d{10}\).*','',next(iter(r.values()))).strip()
 pops[name]={'population':num(r['2026년09월_계_총인구수']),'women':num(r['2026년09월_여_총인구수']),'youth':num(r['2026년09월_계_0~9세'])+num(r['2026년09월_계_10~19세'])}
prov={'경상남도':'경남','충청북도':'충북','충청남도':'충남','전북특별자치도':'전북','강원특별자치도':'강원','제주특별자치도':'제주','경기도':'경기','전남광주통합특별시':'광주'}
norm=lambda n:n.replace('시','').replace(' ','')
w=json.loads((BASE/'public/data/workforce-cities.json').read_text(encoding='utf8'))
for c in w['cities']:
 for m in c['members']:
  name=('경상남도 창원시 '+m['name']) if c['name']=='창원' else m['name']
  m.update(pops[name]); parts=name.split();sd=prov.get(parts[0],parts[0][:2]); area=''.join(parts[1:]); prefix=norm(area)
  hits=[k for k in vals if k[0]==sd and k[1]!='계' and (norm(k[1]).startswith(prefix) or sd+norm(k[1])==prefix)]
  if len(hits)>1:
   kids=[k for k in hits if norm(k[1])!=prefix]
   if sum(vals[k].get('계',0) for k in kids)>0:hits=kids
  assert hits,(name,sd,area)
  ds=[d for p,a,d in docs if (prov.get(p,p[:2])==sd) and (norm(a).startswith(prefix) or (sd in ['부산','대구','광주','대전','울산'] and norm(a)==sd+prefix))]
  assert ds,name
  m['counts']={s:sum(ds) if s=='전체 의사' else sum(vals[k].get(s,0) for k in hits) for s in w['subjects']}
 for key in ['population','women','youth']:c[key]=sum(m[key] for m in c['members'])
 c['counts']={s:sum(m['counts'][s] for m in c['members']) for s in w['subjects']}
 c['rates']={s:c['counts'][s]/c['women' if s=='산부인과' else 'youth' if s=='소아청소년과' else 'population']*100000 for s in w['subjects']}
cw=w['cities'][0]
assert cw['counts']==dict(zip(w['subjects'],[2060,379,127,105,116,52,63,30,77])),cw['counts']
assert round(cw['rates']['산부인과'],1)==21.6 and round(cw['rates']['소아청소년과'],1)==77.7
w.update(date='2026-06',population_date='2026-09',scope='건강보험심사평가원 건강보험통계, 2026년 2분기 의사계 및 전문과목별 전문의. 인구는 2026년 9월 주민등록인구. 산부인과는 여성, 소아청소년과는 0~19세, 나머지는 전체 주민 10만 명당 인원.',source={'name':docfile.name+', '+specfile.name,'sha256':[hashlib.sha256(p.read_bytes()).hexdigest() for p in [docfile,specfile]]})
o=json.loads((BASE/'public/data/overview.json').read_text(encoding='utf8'))
target=list(csv.DictReader((OUT/'대상인구기준_산부인과_소아청소년과_2026_9.csv').open(encoding='utf-8-sig')))
report=json.loads((OUT/'전문의_2026Q2_건강보험통계.json').read_text(encoding='utf8'))
aliases={'창원':'창원','전국':'전국','의대 보유 비수도권 17개 도시':'17','특례시 4곳(수원·고양·용인·화성)':'특례','경남 시·군(창원 제외)':'경남외'}
for r in o['workforce']:
 name=r['구분'];city=next((c for c in w['cities'] if c['name']==name),None)
 if city:r.update(city['rates']);continue
 key=aliases.get(name)
 if not key:raise ValueError(name)
 r.update(report['rate'][key])
 if key=='전국':count=sum(d for _,_,d in docs)
 elif key=='17':count=sum(c['counts']['전체 의사'] for c in w['cities'] if c['group']=='medical')
 elif key=='특례':count=sum(c['counts']['전체 의사'] for c in w['cities'] if c['group']=='special')
 else:count=sum(d for p,a,d in docs if p=='경상남도' and not a.startswith('창원'))
 r['전체 의사']=count/float(r['인구'])*100000
for group,key in [('medical','17'),('special','특례')]:
 cities=[c for c in w['cities'] if c['group']==group]
 for s in w['subjects'][1:]:
  denominator=sum(c['women' if s=='산부인과' else 'youth' if s=='소아청소년과' else 'population'] for c in cities)
  rate=sum(c['counts'][s] for c in cities)/denominator*100000
  assert abs(rate-report['rate'][key][s])<1e-6,(group,s,rate,report['rate'][key][s])
for r in o['workforce']:
 for subject in w['subjects']:
  denominator=cw['women' if subject=='산부인과' else 'youth' if subject=='소아청소년과' else 'population']
  r[subject+'_창원기준차이(명)']=(float(r[subject])-cw['rates'][subject])*denominator/100000
o['dates']['workforce']='2026-06'
o['dates']['workforce_population']='2026-09'
provenance=json.loads((BASE/'public/data/provenance.json').read_text(encoding='utf8'))
provenance['version']='2026-10-30.3'
provenance['notes']=[n.replace('9월 공급률과 10월 상세모형 공급량','6월 의료인력 공급률과 10월 상세모형 공급량') for n in provenance['notes']]
provenance['workforce_revision']={'date':'2026-06','population':'2026-09','denominators':{'산부인과':'여성','소아청소년과':'0~19세','나머지':'전체 주민'},'sources':[{'name':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [docfile,specfile,popfile]]}
(BASE/'public/data/provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,separators=(',',':')),encoding='utf8')
for file,obj in [('workforce-cities.json',w),('overview.json',o)]:
 (BASE/'public/data'/file).write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':')),encoding='utf8')
with (BASE/'public/data/workforce-cities.csv').open('w',encoding='utf-8-sig',newline='') as f:
 writer=csv.writer(f);writer.writerow(['도시','의료인력 기준월','인구 기준월','전체 인구','진료과','등록인원','분모 집단','분모 인구','10만 명당 인원'])
 for c in w['cities']:
  for s in w['subjects']:
   key,label=('women','여성') if s=='산부인과' else ('youth','0~19세') if s=='소아청소년과' else ('population','전체 주민')
   writer.writerow([c['name'],w['date'],w['population_date'],c['population'],s,c['counts'][s],label,c[key],c['rates'][s]])
print('Verified 22 cities, five Changwon districts and report comparison groups. Workforce June 2026; population September 2026.')
