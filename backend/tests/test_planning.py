"""Sourced-planner regressions: no external APIs or production databases."""
import os
os.environ["APP_ENV"] = "test"
os.environ["SECRET_KEY"] = "test-only-C2j8rNV7my5WqZ9Hk3LBd6F4tsX0pA1u"
import json
import unittest
from datetime import datetime, date, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import patch
from fastapi import HTTPException
from starlette.requests import Request
from backend.tests import test_security as security_fixture
from backend.app.database.models import Itinerary, ItineraryDay, PlanningRequest
from backend.app.schemas.planning import TripRequest
from backend.app.security import client_address
from backend.app.services import planning_jobs, travel_data, ai_planner, trip_planner

PLACES = {
    1259425: dict(id=1259425,name="Puducherry",country="India",country_code="IN",admin1="Puducherry",feature_code="PPLA",latitude=11.93381,longitude=79.82979,timezone="Asia/Kolkata"),
    4717560: dict(id=4717560,name="Paris",country="United States",country_code="US",admin1="Texas",feature_code="PPLA2",latitude=33.66094,longitude=-95.55551,timezone="America/Chicago"),
    2988507: dict(id=2988507,name="Paris",country="France",country_code="FR",admin1="Ile-de-France",feature_code="PPLC",latitude=48.85341,longitude=2.3488,timezone="Europe/Paris"),
    2657896: dict(id=2657896,name="Zurich",country="Switzerland",country_code="CH",admin1="Zurich",feature_code="PPLA",latitude=47.36667,longitude=8.55,timezone="Europe/Zurich"),
    3109642: dict(id=3109642,name="Santiago de Compostela",country="Spain",country_code="ES",admin1="Galicia",feature_code="PPLA",latitude=42.88052,longitude=-8.54569,timezone="Europe/Madrid"),
}
Session = security_fixture.Session


class PlannerTests(unittest.TestCase):
    def setUp(self):
        self.case = security_fixture.SecurityTests("test_registration_and_login")
        self.case.setUp()
        self.client, self.db, self.headers = self.case.client, self.case.db, self.case.headers
        self.owner = self.case.alice.id
        self.patches = [patch.object(planning_jobs, "SessionLocal", Session), patch.object(travel_data, "get_json", side_effect=self.data), patch.object(ai_planner, "available", return_value=True), patch.object(ai_planner, "_post", side_effect=self.provider)]
        for item in self.patches:
            item.start()
        travel_data._cache.clear()

    def tearDown(self):
        for item in reversed(self.patches):
            item.stop()
        self.case.tearDown()

    def data(self, url, params, **kwargs):
        if url.endswith("/search"):
            query = params["name"].split(",")[0]
            if travel_data.normalized(query) == "pondicherry":
                query = "Puducherry"
            return {"results": [record for record in PLACES.values() if travel_data.normalized(record["name"]) == travel_data.normalized(query)]}
        if url.endswith("/get"):
            return dict(PLACES[params["id"]])
        if params.get("list") == "geosearch":
            lat, lon = map(float, params["gscoord"].split("|"))
            place = min(PLACES.values(),key=lambda row:abs(row["latitude"]-lat)+abs(row["longitude"]-lon))
            return {"query": {"geosearch": [{"pageid": place["id"]*100+number,"title": f"{place['name']} Museum {number}","lat":lat+number*0.0001,"lon":lon+number*0.0001} for number in range(1,41)]}}
        if "pageids" in params:
            pages = {}
            for key in params["pageids"].split("|"):
                identifier = int(key)
                place = PLACES[identifier//100]
                name = f"{place['name']} Museum {identifier%100}"
                pages[key] = {"pageid":identifier,"title":name,"extract":f"{name} is a local history museum.","fullurl":f"https://en.wikipedia.org/wiki/{identifier}"}
            return {"query":{"pages":pages}}
        raise AssertionError(f"Unexpected external lookup: {url}")

    def provider(self, url, headers, body):
        if body.get("tools"):
            return {"candidates":[{"content":{"parts":[{"text":"Confirm opening hours on official venue pages."}]},"groundingMetadata":{"groundingChunks":[{"web":{"uri":"https://example.org/official","title":"Official visitor information"}}]}}]}
        data = json.loads(body["contents"][0]["parts"][0]["text"])
        count = data["maximum_stops_per_day"]
        choices = data["candidates"]
        result = {"days":[{"day_number":number,"attraction_ids":[candidate["id"] for candidate in choices[index*count:(index+1)*count]]} for index,number in enumerate(data["day_numbers"])]}
        return {"candidates":[{"finishReason":"STOP","content":{"parts":[{"text":json.dumps(result)}]}}]}

    def generate(self, **changes):
        return self.client.post("/api/itineraries/generate",headers=self.headers,json={"place_id":1259425,"trip_duration":2,"planner_mode":"ai",**changes})

    def test_qualifier_survives_travel_sentence(self):
        result = self.generate(place_id=None,destination_hint="trip to Paris, Texas")
        self.assertEqual(result.status_code,201,result.text)
        self.assertIn("Texas",result.json()["destination_name"])
        self.assertEqual(result.json()["plan"]["places"][0]["country_code"],"US")

    def test_longer_place_name_is_not_truncated(self):
        result = self.generate(place_id=None,destination_hint="I want to visit Santiago de Compostela")
        self.assertEqual(result.status_code,201,result.text)
        self.assertIn("Santiago de Compostela",result.json()["destination_name"])

    def test_multiple_qualifiers_and_country_abbreviations(self):
        result=self.generate(place_id=None,destination_hint='Plan a trip to Paris, Texas, USA')
        self.assertEqual(result.status_code,201,result.text)
        self.assertEqual(result.json()['plan']['places'][0]['id'],4717560)

    def test_multistop_weather_dates_and_transfer_day(self):
        start=date.today()+timedelta(days=2)
        with patch.object(travel_data,'forecast',return_value={'status':'unavailable'}) as weather:
            result=self.generate(trip_duration=4,start_date=str(start),stops=[{'place_id':1259425,'days':2},{'place_id':2657896,'days':2}])
        self.assertEqual(result.status_code,201,result.text)
        self.assertEqual([call.args[1] for call in weather.call_args_list],[start,start+timedelta(days=2)])
        self.assertEqual(result.json()['days'][2]['activities'],[])
        self.assertEqual(result.json()['days'][3]['place']['id'],2657896)

    def test_arrival_departure_time_windows_are_respected(self):
        result=self.generate(arrival_time='14:00',departure_time='10:00')
        self.assertEqual(result.status_code,201,result.text)
        self.assertFalse(any(activity['slot']=='morning' for activity in result.json()['days'][0]['activities']))
        self.assertEqual(result.json()['days'][1]['activities'],[])
        path=f"/api/itineraries/{result.json()['id']}/day-order"
        self.assertEqual(self.client.put(path,headers=self.headers,json={'day_numbers':[2,1]}).status_code,422)

    def test_long_trips_are_chunked_without_repeated_attractions(self):
        result=self.generate(trip_duration=15)
        self.assertEqual(result.status_code,201,result.text)
        days=result.json()['days'];ids=[a['attraction_id'] for day in days for a in day['activities']]
        self.assertEqual(len(days),15)
        self.assertEqual(len(ids),len(set(ids)))

    def test_demolished_attraction_is_not_a_visit(self):
        original=self.data
        def data(url,params,**kwargs):
            result=original(url,params,**kwargs)
            if 'pageids' in params:
                for row in result['query']['pages'].values():
                    row['extract']='This fort was a French fort that stood here. It was destroyed by an army in 1761.'
            return result
        with patch.object(travel_data,'get_json',side_effect=data):
            self.assertEqual(travel_data.attractions(travel_data.get_place(1259425)),[])

    def test_interrupted_jobs_are_discoverable_and_retryable(self):
        key=str(uuid4());job,_=planning_jobs.create(self.db,self.owner,key,TripRequest(place_id=1259425))
        self.assertEqual(self.client.get('/api/planning/active',headers=self.headers).json()['request_key'],key)
        from backend.app.time_utils import utcnow
        job.updated_at=utcnow()-timedelta(minutes=7);self.db.commit()
        result=self.client.get('/api/planning/jobs/'+key,headers=self.headers)
        self.assertEqual(result.json()['status'],'failed')
        self.assertEqual(result.json()['error_code'],503)
        self.assertIsNone(self.client.get('/api/planning/active',headers=self.headers).json())

    def test_fictional_place_is_rejected_without_saving(self):
        result = self.generate(place_id=None,destination_hint="NotARealPlaceXYZ")
        self.assertEqual(result.status_code,422,result.text)
        self.assertEqual(self.db.query(Itinerary).count(),0)
        self.assertEqual(planning_jobs.successful_count(self.db,self.owner),0)

    def test_ambiguous_place_needs_confirmation(self):
        result = self.generate(place_id=None,destination_hint="Paris")
        self.assertEqual(result.status_code,422,result.text)
        self.assertEqual(self.db.query(Itinerary).count(),0)

    def test_puducherry_alias_and_actual_sources(self):
        result = self.generate(place_id=None,destination_hint="Pondicherry, India")
        self.assertEqual(result.status_code,201,result.text)
        plan = result.json()["plan"]
        ids = [activity["attraction_id"] for day in plan["days"] for activity in day["activities"]]
        self.assertEqual(len(ids),len(set(ids)))
        self.assertTrue(ids)
        self.assertTrue(all(activity["place_id"]==1259425 for day in plan["days"] for activity in day["activities"]))
        self.assertTrue(all(activity["source_url"].startswith("https://en.wikipedia.org/") for day in plan["days"] for activity in day["activities"]))

    def test_zurich_stays_near_zurich(self):
        result = self.generate(place_id=2657896)
        self.assertEqual(result.status_code,201,result.text)
        for day in result.json()["days"]:
            for activity in day["activities"]:
                self.assertLess(travel_data.distance_km(47.36667,8.55,activity["latitude"],activity["longitude"]),4)
        self.assertNotIn("Zermatt",result.text)

    def test_safety_preferences_reach_the_plan_and_are_preserved(self):
        result = self.client.put("/api/preferences/",headers=self.headers,json={"dietary_needs":"vegan; peanut allergy","accessibility":True,"destination_type":"cultural","planning_details":{"destinationHint":"Puducherry, India","tripNotes":"quiet mornings"}})
        self.assertEqual(result.status_code,200,result.text)
        changed = self.client.put("/api/preferences/",headers=self.headers,json={"budget":"budget"})
        self.assertTrue(changed.json()["accessibility"])
        self.assertEqual(changed.json()["dietary_needs"],"vegan; peanut allergy")
        self.assertEqual(changed.json()["planning_details"]["tripNotes"],"quiet mornings")
        result = self.generate()
        self.assertEqual(result.status_code,201,result.text)
        self.assertTrue(result.json()["plan"]["request"]["accessibility"])
        self.assertIn("peanut",result.json()["plan"]["request"]["dietary_needs"])
        self.assertIn("not been verified",result.json()["days"][0]["tips"])

    def test_unknown_costs_are_not_fabricated(self):
        result = self.generate(currency="INR",daily_budget=100,travelers=3)
        self.assertEqual(result.status_code,201,result.text)
        costs = result.json()["plan"]["costs"]
        self.assertEqual(costs["your_total_budget"],600)
        self.assertIsNone(costs["estimated_total"])
        self.assertTrue(all(day["estimated_cost"] is None for day in result.json()["days"]))

    def test_invalid_requests_do_not_consume_success_allowance(self):
        for _ in range(5):
            self.assertEqual(self.generate(trip_duration=31).status_code,422)
        self.assertEqual(self.generate().status_code,201)
        self.assertEqual(planning_jobs.successful_count(self.db,self.owner),1)

    def test_idempotency_prevents_duplicate_saves(self):
        key = str(uuid4())
        headers = {**self.headers,"Idempotency-Key":key}
        payload = {"place_id":1259425,"trip_duration":2}
        first = self.client.post("/api/itineraries/generate",headers=headers,json=payload)
        second = self.client.post("/api/itineraries/generate",headers=headers,json=payload)
        self.assertEqual(first.status_code,201,first.text)
        self.assertEqual(first.json()["id"],second.json()["id"])
        self.assertEqual(self.db.query(Itinerary).count(),1)
        conflict = self.client.post("/api/itineraries/generate",headers=headers,json={**payload,"trip_duration":3})
        self.assertEqual(conflict.status_code,409)

    def test_delete_does_not_reset_success_allowance(self):
        for _ in range(5):
            result = self.generate()
            self.assertEqual(result.status_code,201,result.text)
            self.client.delete(f"/api/itineraries/{result.json()['id']}",headers=self.headers)
        self.assertEqual(self.generate().status_code,429)

    def test_provider_failure_is_retryable_and_not_charged(self):
        with patch.object(ai_planner,"_post",side_effect=HTTPException(503,"The AI provider is unavailable.")):
            result = self.generate()
        self.assertEqual(result.status_code,503,result.text)
        self.assertEqual(planning_jobs.successful_count(self.db,self.owner),0)

    def test_incomplete_and_foreign_ids_are_not_saved(self):
        for candidate in ({"finishReason":"MAX_TOKENS","content":{"parts":[]}}, {"finishReason":"STOP","content":{"parts":[{"text":json.dumps({"days":[{"day_number":1,"attraction_ids":["wikipedia:ladakh"]},{"day_number":2,"attraction_ids":[]}]})}]}}):
            with patch.object(ai_planner,"_post",return_value={"candidates":[candidate]}):
                result = self.generate()
            self.assertEqual(result.status_code,502,result.text)
        self.assertEqual(self.db.query(Itinerary).count(),0)

    def test_guided_mode_is_explicit_and_does_not_call_ai(self):
        with patch.object(ai_planner,"_post",side_effect=AssertionError("Guided mode called AI")):
            result = self.generate(planner_mode="guided")
        self.assertEqual(result.status_code,201,result.text)
        self.assertEqual(result.json()["plan"]["generation"]["mode"],"guided")

    def test_zero_cost_and_clear_rating(self):
        itinerary = Itinerary(user_id=self.owner,title="Legacy",destination_name="Puducherry",duration_days=1,budget="moderate",full_itinerary="{}")
        self.db.add(itinerary);self.db.flush()
        self.db.add(ItineraryDay(itinerary_id=itinerary.id,day_number=1,estimated_cost=0));self.db.commit()
        path=f"/api/itineraries/{itinerary.id}"
        self.assertEqual(self.client.get(path,headers=self.headers).json()["days"][0]["estimated_cost"],0)
        self.client.patch(path,headers=self.headers,json={"rating":5})
        cleared=self.client.patch(path,headers=self.headers,json={"rating":None})
        self.assertIsNone(cleared.json()["rating"])

    def test_notes_edits_and_reordering_persist(self):
        result=self.generate()
        self.assertEqual(result.status_code,201,result.text)
        path=f"/api/itineraries/{result.json()['id']}"
        old_first=result.json()["days"][0]["morning"]
        edited=self.client.patch(path+"/days/1",headers=self.headers,json={"morning":"My personal morning plan","user_note":"Take a rest break."})
        self.assertEqual(edited.status_code,200,edited.text)
        self.assertEqual(edited.json()["days"][0]["user_note"],"Take a rest break.")
        reordered=self.client.put(path+"/day-order",headers=self.headers,json={"day_numbers":[2,1]})
        self.assertEqual(reordered.status_code,200,reordered.text)
        self.assertEqual(reordered.json()["days"][1]["morning"],"My personal morning plan")
        self.assertNotEqual(old_first,"My personal morning plan")

    def test_one_day_regeneration_does_not_replace_other_days(self):
        result=self.generate()
        self.assertEqual(result.status_code,201,result.text)
        path=f"/api/itineraries/{result.json()['id']}"
        original=result.json()["days"][1]
        job=self.client.post(path+f"/days/1/regenerate/{uuid4()}",headers=self.headers)
        self.assertEqual(job.status_code,202,job.text)
        progress=self.client.get('/api/planning/jobs/'+job.json()['request_key'],headers=self.headers)
        self.assertEqual(progress.json()['status'],'complete',progress.text)
        updated=self.client.get(path,headers=self.headers)
        self.assertEqual(updated.json()['days'][1],original)
        self.assertNotEqual(updated.json()['days'][0]['activities'],result.json()['days'][0]['activities'])

    def test_cancelled_job_does_not_save_and_is_private(self):
        key=str(uuid4())
        job,_=planning_jobs.create(self.db,self.owner,key,TripRequest(place_id=1259425))
        cancelled=self.client.delete('/api/planning/jobs/'+key,headers=self.headers)
        self.assertEqual(cancelled.json()['status'],'cancelled')
        planning_jobs.run(self.owner,key)
        self.assertEqual(self.db.query(Itinerary).count(),0)
        from backend.app.services.auth_service import create_access_token
        bob={'Authorization':'Bearer '+create_access_token({'sub':str(self.case.bob.id)})}
        self.assertEqual(self.client.get('/api/planning/jobs/'+key,headers=bob).status_code,404)

    def test_favorites_and_lists_are_paginated_on_server(self):
        for index in range(55):
            self.db.add(Itinerary(user_id=self.owner,title=f"Trip {index}",destination_name="Place",duration_days=1,budget="moderate",full_itinerary="{}",is_favorite=index==0))
        self.db.commit()
        result=self.client.get('/api/itineraries/page?skip=48&limit=24',headers=self.headers)
        self.assertEqual(result.json()['total'],55)
        self.assertEqual(len(result.json()['items']),7)
        result=self.client.get('/api/itineraries/page?favorites=true',headers=self.headers)
        self.assertEqual(result.json()['total'],1)
        self.assertEqual(result.json()['items'][0]['title'],'Trip 0')

    def test_filters_are_never_silently_relaxed(self):
        result=self.generate(place_id=None,budget='budget',preferred_climate='cold',destination_type='beach')
        self.assertEqual(result.status_code,422,result.text)
        self.assertIn('not relaxed',result.text)


class ProxyTests(unittest.TestCase):
    def request(self,peer,forwarded):
        return Request({'type':'http','client':(peer,1234),'headers':[(b'x-forwarded-for',forwarded.encode())]})

    def test_direct_clients_cannot_spoof(self):
        self.assertEqual(client_address(self.request('203.0.113.4','192.0.2.8')),'203.0.113.4')

    def test_trusted_proxy_uses_last_untrusted_hop(self):
        self.assertEqual(client_address(self.request('127.0.0.1','192.0.2.8, 203.0.113.4')),'203.0.113.4')
        self.assertEqual(client_address(self.request('127.0.0.1','192.0.2.8, 203.0.113.9')),'203.0.113.9')
