"""Build a source-bound itinerary; never turn unknowns into travel facts."""
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from fastapi import HTTPException
from ..schemas.planning import TripRequest
from . import ai_planner, travel_data


def _ordered(venues, place, request, used):
    interests = {interest.lower() for interest in request.interests or []}
    suitable = [v for v in venues if v.id not in used]
    radius = 4 if request.transport == "walking" else 8 if request.transport == "cycling" else 10.5
    suitable = [v for v in suitable if v.place_id == place.id and travel_data.distance_km(place.latitude, place.longitude, v.latitude, v.longitude) <= radius]
    if request.children_ages or request.travel_style == "family":
        suitable = [v for v in suitable if not any(word in (v.name+" "+v.description).lower() for word in ("distillery", "nightclub", "casino", "red-light"))]
    if request.accessibility:
        suitable = [v for v in suitable if not any(word in (v.name+" "+v.description).lower() for word in ("mountain trail", "cliff", "climbing", "stairway"))]
    if request.dietary_needs:
        suitable = [v for v in suitable if not any(word in v.description.lower() for word in ("restaurant", "cafe", "café", "fast food", "food establishment"))]
    return sorted(suitable, key=lambda v: (-sum(c.lower() in interests for c in v.categories), travel_data.distance_km(place.latitude, place.longitude, v.latitude, v.longitude), v.id))


def _cluster(venues, place, transport):
    result = []
    lat, lon = place.latitude, place.longitude
    remaining = list(venues)
    while remaining:
        best = min(remaining, key=lambda v: travel_data.distance_km(lat, lon, v.latitude, v.longitude))
        if transport == "walking" and travel_data.distance_km(lat, lon, best.latitude, best.longitude) > 4:
            break
        result.append(best)
        remaining.remove(best)
        lat, lon = best.latitude, best.longitude
    return result


def _day(place, request, number, venues, start, transfer=False):
    day_date = start + timedelta(days=number-1) if start else None
    venue_list = _cluster(venues, place, request.transport)
    slots = ["morning", "afternoon", "evening"]
    if number == 1 and request.arrival_time:
        hour = request.arrival_time.hour
        slots = [] if hour >= 21 else ["evening"] if hour >= 17 else ["afternoon", "evening"] if hour >= 11 else slots
    if number == request.trip_duration and request.departure_time:
        hour = request.departure_time.hour
        latest = [] if hour < 12 else ["morning"] if hour < 17 else ["morning", "afternoon"]
        slots = [slot for slot in slots if slot in latest]
    if transfer:
        # A transfer route/duration is not booked or verified. Reserve the day
        # rather than assuming sightseeing fits after an intercity flight.
        slots = []
    venue_list = venue_list[:len(slots)]
    activities = []
    lat, lon = place.latitude, place.longitude
    speed = {"walking": 4, "cycling": 12, "driving": 30, "public_transit": 15}[request.transport]
    legs = []
    for index, venue in enumerate(venue_list):
        distance = travel_data.distance_km(lat, lon, venue.latitude, venue.longitude)
        # This is deliberately labelled a lower-bound geographic estimate, not
        # a road route, timetable or claim that a river crossing is possible.
        minutes = max(5, round(distance / speed * 60 * 1.4))
        legs.append({"to": venue.name, "distance_km": round(distance, 2), "estimated_minutes": minutes, "method": "geographic estimate", "status": "unverified_route"})
        activities.append({"slot": slots[index], "attraction_id": venue.id, "place_id": place.id, "name": venue.name, "description": venue.description,
                           "latitude": venue.latitude, "longitude": venue.longitude, "source_url": venue.source_url, "checked_at": venue.checked_at,
                           "opening_hours": venue.opening_hours, "opening_status": "unverified", "accessibility": venue.accessibility, "price": venue.price,
                           "map_url": f"https://www.openstreetmap.org/?mlat={venue.latitude}&mlon={venue.longitude}#map=17/{venue.latitude}/{venue.longitude}", "user_note": ""})
        lat, lon = venue.latitude, venue.longitude
    legacy = {slot: next((f"Visit {a['name']} in {place.name}. {a['description']} Check current opening hours and access before setting out." for a in activities if a["slot"] == slot),
                         "Unscheduled time for meals, rest, arrival/departure or your own plans. No attraction booking is implied.") for slot in ("morning", "afternoon", "evening")}
    if transfer:
        legacy["morning"] = f"Transfer to {place.label}. The route, travel time, tickets and accommodation arrival are not confirmed; this day is reserved for travel."
    needs = []
    if request.dietary_needs:
        needs.append(f"Dietary needs: {request.dietary_needs}. Ask each restaurant directly; kitchen and allergen safety have not been verified.")
    if request.accessibility:
        needs.append("Step-free access is required. Confirm entrances, toilets and transport with each venue; unknown access is never treated as accessible.")
    return {"day_number": number, "date": str(day_date) if day_date else None, "place": place.model_dump(), "theme": f"{place.name}: {venue_list[0].name if venue_list else 'a flexible day'}"[:255],
            **legacy, "accommodation": "Accommodation is not booked or quoted. Choose a suitable base and confirm availability.", "estimated_cost": None,
            "tips": " ".join(needs) or "Check the source pages, opening hours and local transport before you travel.", "activities": activities, "travel_legs": legs,
            "route_status": "estimate_only", "user_note": "", "transfer_day": transfer}


def build(request: TripRequest, phase=lambda value: None, cancelled=lambda: False, excluded_ids=None) -> dict:
    phase("resolving")
    if request.stops:
        stops = [(travel_data.get_place(stop.place_id), stop.days) for stop in request.stops]
    else:
        stops = [(travel_data.resolve_place(request.destination_hint, request.place_id), request.trip_duration)]
    if request.start_date:
        try:
            today = datetime.now(ZoneInfo(stops[0][0].timezone)).date()
        except ZoneInfoNotFoundError:
            today = datetime.now(timezone.utc).date()
        if request.start_date < today:
            raise HTTPException(422, "The trip start date is in the past at your destination.")
    if request.planner_mode == "ai" and not ai_planner.available():
        raise HTTPException(503, "AI planning is unavailable. Choose the sourced guided planner or try again later.")
    used = set(excluded_ids or [])
    days = []
    all_venues = []
    researched = []
    weather = []
    warnings = ["Prices and booking availability are not quoted. Opening hours and accessibility must be checked at the linked sources.",
                "Travel times are geographic estimates, not verified transport routes or timetables."]
    if request.origin:
        warnings.append(f"Travel from {request.origin} to the first destination is not routed or booked. Allow for your actual arrival time.")
    if len(stops) > 1:
        warnings.append("The first day at every later stop is reserved for an unconfirmed transfer. Check tickets, time zones and the date line; no connection is guaranteed.")
    for stop_index, (place, duration) in enumerate(stops):
        if cancelled():
            raise HTTPException(409, "Planning was cancelled.")
        phase("researching")
        venues = travel_data.attractions(place)
        venues = _ordered(venues, place, request, used)
        if not venues:
            raise HTTPException(422, f"We could not find enough sourced attractions near {place.label}. Choose a nearby city or a different destination.")
        all_venues.extend(venues)
        offset = len(days)
        stop_start = request.start_date + timedelta(days=offset) if request.start_date else None
        weather.append(travel_data.forecast(place, stop_start, duration))
        if request.planner_mode == "ai":
            researched.append({"place": place.label, **ai_planner.current_research(place, stop_start)})
        phase("planning")
        for chunk_start in range(0, duration, 7):
            if cancelled():
                raise HTTPException(409, "Planning was cancelled.")
            numbers = list(range(offset + chunk_start + 1, offset + min(chunk_start + 7, duration) + 1))
            remaining = _ordered(venues, place, request, used)
            by_id = {v.id: v for v in remaining}
            if request.planner_mode == "ai" and remaining:
                choice = ai_planner.choose(place, request, remaining, numbers, used)
                selections = {day.day_number: [by_id[key] for key in day.attraction_ids] for day in choice.days}
                if not any(selections.values()):
                    raise HTTPException(502, "The AI plan did not include any sourced activities. Please retry.")
            else:
                count = {"relaxed": 1, "balanced": 2, "active": 3}[request.pace]
                selections = {number: remaining[index*count:(index+1)*count] for index, number in enumerate(numbers)}
            for number in numbers:
                day = _day(place, request, number, selections[number], request.start_date, transfer=stop_index > 0 and number == offset+1)
                used.update(activity["attraction_id"] for activity in day["activities"])
                days.append(day)
    if any(not day["activities"] for day in days):
        warnings.append("Some time is intentionally unscheduled because there were not enough distinct, sourced attractions; no extra venues were invented.")
    label = " → ".join(place.label for place, _ in stops)
    included = {activity["attraction_id"] for day in days for activity in day["activities"]}
    image, credit = None, None
    for venue in [v for v in all_venues if v.id in included and v.image_url][:2]:
        credit = travel_data.image_credit(venue)
        if credit:
            image = venue.image_url
            break
    settings = ai_planner.get_settings()
    provider = settings.llm_provider if request.planner_mode == "ai" else "guided"
    model = (settings.google_model if provider == "google" else settings.openai_model) if request.planner_mode == "ai" else None
    total_budget = round(request.daily_budget * request.travelers * request.trip_duration, 2) if request.daily_budget is not None else None
    return {"schema_version": 2, "title": f"{request.trip_duration} days in {label}"[:255], "destination_name": label[:150],
            "summary": f"A {request.pace} plan for {request.travelers} traveler(s), built from identified places and linked attraction sources. Unconfirmed hours, prices and access remain explicitly unknown.",
            "days": days, "duration_days": request.trip_duration, "image_url": image, "image_source_url": credit["url"] if credit else None, "image_credit": credit,
            "image_kind": "attraction_photo" if image else "illustration", "places": [place.model_dump() for place, _ in stops], "request": request.model_dump(mode="json"),
            "generation": {"mode": request.planner_mode, "provider": provider, "model": model, "created_at": datetime.now(timezone.utc).isoformat()},
            "costs": {"currency": request.currency, "basis": "per_person_per_day", "daily_budget": request.daily_budget, "your_total_budget": total_budget, "estimated_total": None,
                      "status": "not_quoted", "exclusions": "Flights, accommodation, admissions and transfers require current quotes."},
            "total_budget_est": None, "best_time_to_go": "Use the dated forecast below and official local guidance; no season was inferred from a generic template.",
            "packing_tips": ["Bring the documents required for your own nationality and destination; verify official entry rules.", "Pack for the dated forecast and your planned walking or transport.", "Carry venue contact details and verify dietary/accessibility needs before departure."],
            "weather": weather, "current_research": researched, "warnings": warnings,
            "attribution": [{"name": "GeoNames via Open-Meteo", "url": "https://open-meteo.com/en/docs/geocoding-api"}, {"name": "Wikipedia contributors, CC BY-SA; source links identify the original pages and image credits", "url": "https://creativecommons.org/licenses/by-sa/4.0/"}]}
