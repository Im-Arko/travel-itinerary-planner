"""Exercise a running planner with a disposable account and real providers.

Requires an explicit API origin. Generates three plans and replans one day;
existing accounts/data are never read. The disposable account is removed.
"""
import argparse
import json
import secrets
import time
from uuid import uuid4
import httpx


def check(response, status=200):
    assert response.status_code == status, f'HTTP {response.status_code}: {response.text[:250]}'
    return response.json() if response.content else None


def wait(client, headers, key):
    deadline = time.monotonic()+330
    phase = None
    while time.monotonic() < deadline:
        job = check(client.get('/api/planning/jobs/'+key,headers=headers))
        if job['phase'] != phase:
            phase=job['phase'];print('Planning phase:',phase,flush=True)
        if job['status'] == 'complete':
            return check(client.get('/api/itineraries/'+str(job['itinerary_id']),headers=headers))
        if job['status'] in ('failed','cancelled'):
            raise AssertionError(f"Planning {job['status']}: {job['error']}")
        time.sleep(2)
    raise AssertionError('Planner did not finish within its deadline')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url',required=True)
    args=parser.parse_args()
    username='planner_check_'+secrets.token_hex(6)
    email=username+'@example.com';password=secrets.token_urlsafe(32)
    headers={};registered=False;results=[]
    with httpx.Client(base_url=args.base_url,timeout=35) as client:
        try:
            ready=check(client.get('/ready'))
            assert ready['database']=='available' and ready['ai']=='configured'
            check(client.post('/api/auth/register',json={'username':username,'email':email,'password':password}),201)
            registered=True
            token=check(client.post('/api/auth/login',data={'username':email,'password':password}))['access_token']
            headers={'Authorization':'Bearer '+token}
            check(client.put('/api/preferences/',headers=headers,json={'budget':'moderate','trip_duration':2,'travel_style':'family','interests':['History','Art'],'dietary_needs':'Peanut allergy','accessibility':True,'planning_details':{'tripNotes':'Quiet afternoons'}}))
            first=None
            for query,expected in [('Pondicherry',1259425),('Paris, Texas, USA',4717560),('Zurich, Switzerland',2657896)]:
                places=check(client.get('/api/planning/places',headers=headers,params={'q':query}))
                assert any(place['id']==expected for place in places), query
                key=str(uuid4());payload={'place_id':expected,'trip_duration':2,'planner_mode':'ai','currency':'INR','daily_budget':0}
                before=time.monotonic()
                check(client.post('/api/planning/jobs/'+key,headers=headers,json=payload),202)
                duplicate=check(client.post('/api/planning/jobs/'+key,headers=headers,json=payload),202)
                assert duplicate['request_key']==key
                plan=wait(client,headers,key)
                assert plan['plan']['places'][0]['id']==expected
                assert plan['plan']['generation']['provider']=='google'
                assert plan['plan']['generation']['mode']=='ai'
                assert plan['plan']['costs']['estimated_total'] is None
                assert plan['plan']['costs']['your_total_budget']==0
                activities=[a for day in plan['days'] for a in day['activities']]
                assert activities and all(a['place_id']==expected and a['source_url'].startswith('https://en.wikipedia.org/') for a in activities)
                assert len({a['attraction_id'] for a in activities})==len(activities)
                assert all('Peanut allergy' in day['tips'] for day in plan['days'])
                assert not any(any(name in a['name'] for name in ('Fort Louis','Wellenberg Tower','Golconde Dormitory','History of Zurich')) for a in activities)
                row={'place':plan['destination_name'],'activities':[a['name'] for a in activities],'provider':plan['plan']['generation']['provider'],'seconds':round(time.monotonic()-before,1),'citations':sum(len(item['sources']) for item in plan['plan']['current_research'])}
                results.append(row);print(json.dumps(row),flush=True)
                if first is None:first=plan
            path='/api/itineraries/'+str(first['id'])
            check(client.patch(path,headers=headers,json={'rating':5,'user_notes':'Verify museum hours'}))
            check(client.patch(path,headers=headers,json={'rating':None}))
            assert check(client.get(path,headers=headers))['rating'] is None
            check(client.patch(path+'/days/1',headers=headers,json={'morning':'My personal morning plan','user_note':'Take a rest break'}))
            current=check(client.get(path,headers=headers));other=current['days'][1]
            key=str(uuid4());check(client.post(path+'/days/1/regenerate/'+key,headers=headers),202)
            replanned=wait(client,headers,key)
            assert replanned['days'][1]==other
            assert replanned['days'][0]['activities']!=first['days'][0]['activities']
            assert replanned['days'][0]['user_note']=='Take a rest break'
            page=check(client.get('/api/itineraries/page',headers=headers,params={'limit':1,'skip':2}))
            assert page['total']==3 and len(page['items'])==1
            print('PASS: actual AI, exact places, source-bound activities, idempotency, safety needs, unknown costs, edit/readback, rating clear, day regeneration and pagination',flush=True)
        finally:
            if registered:
                if not headers:
                    token=check(client.post('/api/auth/login',data={'username':email,'password':password}))['access_token']
                    headers={'Authorization':'Bearer '+token}
                check(client.request('DELETE','/api/auth/me',headers=headers,json={'password':password}),204)
                print('PASS: disposable account and its trips removed',flush=True)


if __name__=='__main__':
    main()
