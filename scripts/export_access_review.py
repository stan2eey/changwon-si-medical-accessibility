"""Create an audited display layer; never replace unverified routes with guessed times.
Usage: python scripts/export_access_review.py <analysis-root>
Original research outputs and public historical result files remain unchanged.
"""
from pathlib import Path
import json, sys, hashlib
import numpy as np

B=Path(sys.argv[1]).resolve()
P=Path(__file__).resolve().parents[1]/'public/data'
read=lambda p: json.loads(p.read_text(encoding='utf-8'))
g=read(P/'geometry.json'); overview=read(P/'overview.json'); rows=read(P/'districts.json')
a=read(B/'output/reanalysis_20261027/analysis.json')['grids']
assert a['ids']==g['ids'] and a['names']==g['names']
review_ids=['라라827824','라라826824','라라826823','라라818781','라라818782']
review=np.isin(g['ids'],review_ids); sea=np.isin(np.arange(len(g['ids'])),g['sea'])
names=np.array(g['names']); corrections=[]; city={}; scales={}
services={'code01':'total','code04':'total','code10':'female','code11':'peds019','code24':'total','code07':'total','code02':'total','code06':'total','delivery':'fer1549'}
for s,key in services.items():
    weights=np.array(a[key],float)
    if s=='delivery':
        # Match 203: district expected births distributed in proportion to women 15–49.
        for r in rows:
            if r['service']==s and r['minutes']==30:
                ix=names==r['area']; weights[ix]*=r['target_population']/weights[ix].sum()
    city[s]={}; all_scores=[]
    for cut in (30,60):
        d=read(P/f'{s}-{cut}.json'); times=np.array([np.nan if x is None else x for x in d['minutes']]); scores=np.array([np.nan if x is None else x for x in d['score']]); count=np.array([np.nan if x is None else x for x in d['count']])
        valid=np.isfinite(times)&~sea&~review
        all_scores.extend(scores[valid&np.isfinite(scores)].tolist())
        buckets=[valid&(times<=15),valid&(times>15)&(times<=30),valid&(times>30)&(times<=45),valid&(times>45)&(times<=60),valid&(times>60)]
        populations=[float(weights[m].sum()) for m in buckets]
        unknown=float(weights[~valid&~sea&~review].sum()); pending=float(weights[review&~sea].sum()); sea_pop=float(weights[sea].sum())
        total=sum(r['target_population'] for r in rows if r['service']==s and r['minutes']==cut)
        assert abs(sum(populations)+unknown+pending+sea_pop-total)<.01
        city[s][str(cut)]={'total':total,'time_population':populations,'unknown':unknown,'review':pending,'sea':sea_pop}
        for r in rows:
            if r['service']!=s or r['minutes']!=cut:continue
            ix=(names==r['area'])&review&~sea&np.isfinite(times)
            if not ix.any():continue
            rr=dict(r); removed=float(weights[ix].sum()); oldknown=r['known_population']; newknown=oldknown-removed
            rr.update(review_population=removed,known_population=newknown,unknown_population=r['unknown_population']+removed,
                over_population=max(0,r['over_population']-float(weights[ix&(times>cut)].sum())),
                one_population=max(0,r['one_population']-float(weights[ix&(count==1)].sum())),
                mean=(r['mean']*oldknown-float(np.nansum(scores[ix]*weights[ix])))/newknown if newknown else None)
            assert abs(rr['known_population']+rr['unknown_population']+rr['sea_population']-rr['target_population'])<.001
            corrections.append(rr)
    vals=sorted(all_scores);scales[s]=vals[min(len(vals)-1,int(len(vals)*.95))] if vals else 1
records=read(B/'output/capacity_e2_20261023/grid_resolution.json')['records']
estimated=[{'index':r['index'],'grid':r['grid'],'access_minutes':r['total_access_minutes']} for r in records]
out={'version':'2026-11-02-review-1','review_grid_ids':review_ids,'review_indices':np.flatnonzero(review).tolist(),
     'estimated_connectors':estimated,'district_overrides':corrections,'city':city,'score_scale':scales,
     'method':'경로를 점검한 5개 격자의 결과를 재검증으로 분리. 실제 이동시간 교정은 미완료. 다른 격자의 점수와 공급·경쟁수요 모형은 재산정하지 않음.',
     'source_hashes':{f:hashlib.sha256((P/f).read_bytes()).hexdigest() for f in ['geometry.json','districts.json']+[f'{s}-{c}.json' for s in services for c in (30,60)]}}
(P/'access-review.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'),allow_nan=False),encoding='utf-8')
print('Verified review layer:',len(review_ids),'grids;',len(corrections),'district overrides; 18 population partitions; shared 30/60 score scales.')
