"""Bounded, attributed public-data lookups. No user-controlled URLs are fetched."""
import math
import re
import threading
import time
import unicodedata
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, date, timedelta
from urllib.parse import quote
from html.parser import HTMLParser
import httpx
from fastapi import HTTPException
from ..schemas.planning import Place, Attraction

USER_AGENT = "Travellant/2.0 (https://github.com/Im-Arko/travel-itinerary-planner; itinerary research)"
_cache: OrderedDict = OrderedDict()
_lock = threading.Lock()
_aliases = {"pondicherry": "Puducherry", "pondy": "Puducherry", "bombay": "Mumbai", "calcutta": "Kolkata", "benares": "Varanasi", "banaras": "Varanasi", "nyc": "New York City", "saigon": "Ho Chi Minh City", "bangalore": "Bengaluru"}
_country_aliases = {"usa": "us", "united states of america": "united states", "uk": "gb", "great britain": "united kingdom", "uae": "ae"}


def normalized(value: str) -> str:
    return " ".join("".join(c if c.isalnum() else " " for c in unicodedata.normalize("NFKD", value).casefold() if not unicodedata.combining(c)).split())


def cached(key, ttl, fetch):
    with _lock:
        item = _cache.get(key)
        if item and item[0] > time.monotonic():
            _cache.move_to_end(key)
            return item[1]
    value = fetch()
    with _lock:
        _cache[key] = (time.monotonic() + ttl, value)
        while len(_cache) > 512:
            _cache.popitem(last=False)
    return value


def get_json(url: str, params: dict, timeout=15):
    try:
        with httpx.Client(timeout=httpx.Timeout(timeout, connect=5), headers={"User-Agent": USER_AGENT}, follow_redirects=False) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            if len(response.content) > 2_000_000:
                raise ValueError("Oversized response")
            return response.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(503, "Travel information is temporarily unavailable. Please try again.") from None


def place_from_record(record: dict) -> Place:
    region = record.get("admin1", "")
    label = ", ".join(dict.fromkeys(x for x in (record["name"], region, record.get("country", "")) if x))
    return Place(id=record["id"], name=record["name"], country=record.get("country", ""), country_code=record.get("country_code", ""), region=region,
                 latitude=record["latitude"], longitude=record["longitude"], timezone=record.get("timezone", "UTC"), label=label,
                 source_url=f"https://www.geonames.org/{record['id']}")


def extract_place_query(text: str) -> str:
    text = " ".join(text.strip().split())
    # Remove travel framing, never a geographic qualifier or an internal word.
    text = re.sub(r"^(?:(?:i|we)(?: would| d)? (?:want|would like|like) to |please )?(?:plan (?:me |us )?(?:a |my |our )?(?:trip|holiday|vacation)(?: to| in)? |(?:a |my |our )?(?:trip|holiday|vacation|weekend) (?:to|in) |(?:travel|visit|go)(?: to)? )", "", text, flags=re.I)
    text = re.sub(r"\s+(?:for \d+ (?:days?|nights?)|please)[.!?]*$", "", text, flags=re.I).strip(" .!?")
    parts = text.split(",", 1)
    parts[0] = _aliases.get(normalized(parts[0]), parts[0])
    return ",".join(parts)


def search_places(text: str) -> list[Place]:
    query = extract_place_query(text)
    if len(query) < 2:
        return []
    def fetch():
        data = get_json("https://geocoding-api.open-meteo.com/v1/search", {"name": query, "count": 20, "language": "en", "format": "json"})
        records = [row for row in data.get("results", []) if row.get("feature_code", "").startswith(("PPL", "ADM"))]
        name = normalized(query.split(",")[0])
        # The upstream service supports fuzzy matching. Never turn a nonexistent
        # name into an unrelated destination just because it was the first hit.
        records = [row for row in records if normalized(row["name"]) == name or normalized(_aliases.get(normalized(row["name"]), row["name"])) == name]
        if "," in query:
            qualifiers = [_country_aliases.get(normalized(part), normalized(part)) for part in query.split(",")[1:] if part.strip()]
            records = [row for row in records if all(qualifier in {normalized(row.get(k, "")) for k in ("country", "country_code", "admin1", "admin2", "admin3")} for qualifier in qualifiers)]
        return [place_from_record(row) for row in records[:8]]
    return cached(("geocode", normalized(query)), 86400, fetch)


def get_place(place_id: int) -> Place:
    def fetch():
        row = get_json("https://geocoding-api.open-meteo.com/v1/get", {"id": place_id, "language": "en"})
        if not row.get("id") or not row.get("feature_code", "").startswith(("PPL", "ADM")):
            raise HTTPException(422, "Choose a city or region from the destination results.")
        return place_from_record(row)
    return cached(("place", place_id), 86400, fetch)


def resolve_place(text: str | None, place_id: int | None) -> Place:
    if place_id:
        return get_place(place_id)
    candidates = search_places(text or "")
    if not candidates:
        raise HTTPException(422, "We could not resolve that destination. Enter a city and its region or country.")
    if len(candidates) != 1:
        raise HTTPException(422, {"message": "Choose the intended destination, including its region and country.", "candidates": [place.model_dump() for place in candidates]})
    return candidates[0]


def distance_km(a_lat, a_lon, b_lat, b_lon):
    lat1, lat2 = math.radians(a_lat), math.radians(b_lat)
    dlat, dlon = lat2 - lat1, math.radians(b_lon - a_lon)
    return 6371 * 2 * math.asin(min(1, math.sqrt(math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2)))


def attractions(place: Place) -> list[Attraction]:
    def fetch():
        nearby = get_json("https://en.wikipedia.org/w/api.php", {"action": "query", "list": "geosearch", "gscoord": f"{place.latitude}|{place.longitude}", "gsradius": 10000, "gslimit": 100, "format": "json"}, timeout=20)
        excluded = re.compile(r"\b(history of|timeline of|list of|battle of|siege of|operation|school|constituency|airport|railway station|college|university|district|municipality)\b", re.I)
        landmark = re.compile(r"\b(?:ashram|temple|museum|church|cathedral|basilica|beach|park|garden|palace|fort|fortress|monument|memorial|bridge|lighthouse|mosque|shrine|synagogue|square|promenade|market|tower|castle|abbey|opera house|zoo|aquarium|library|statue|gallery|botanical|waterfall|ruins)\b", re.I)
        selected = [row for row in nearby.get("query", {}).get("geosearch", []) if not excluded.search(row["title"])]
        locations = {row["pageid"]: row for row in selected[:80]}
        ids = list(locations)
        def read_batch(batch):
            data = get_json("https://en.wikipedia.org/w/api.php", {"action": "query", "pageids": "|".join(map(str, batch)), "prop": "extracts|pageimages|info", "exintro": 1, "explaintext": 1, "exsentences": 5, "exlimit": 20, "inprop": "url", "piprop": "thumbnail|name", "pithumbsize": 640, "format": "json"}, timeout=20)
            return list(data.get("query", {}).get("pages", {}).values())
        # Two bounded readers avoid one lookup per attraction while respecting
        # the public API. Inspect descriptions too: landmark names vary globally.
        with ThreadPoolExecutor(max_workers=2) as readers:
            pages = [page for batch in readers.map(read_batch, [ids[offset:offset+20] for offset in range(0,len(ids),20)]) for page in batch]
        now = datetime.now(timezone.utc).isoformat()
        result = []
        for row in pages:
            name = row.get("title", "")
            description = row.get("extract", "").strip()
            coords = locations.get(row.get("pageid"))
            definition = re.split(r'\.\s+', description[:350], maxsplit=1)[0]
            if not coords or not description or not landmark.search(name + " " + definition):
                continue
            if re.search(r"residential area|constituenc(?:y|ies)|neighbou?rhood",definition,re.I):
                continue
            if not re.search(r"\b(is|are|houses|stands|comprises|features|lies|situated|located)\b",description[:350],re.I) or re.search(r"demolished|(?:was|were|been) destroyed|no longer exists|dismantled|permanently closed|\bstood\b|private residence|guest house|office building", description[:900], re.I):
                continue
            lat, lon = coords["lat"], coords["lon"]
            if distance_km(place.latitude, place.longitude, lat, lon) > 10.5:
                continue
            words = normalized(name + " " + description)
            categories = [tag for tag, terms in {"History": ("historic", "history", "heritage", "palace", "fort", "castle"), "Art": ("art", "gallery", "museum"), "Beach": ("beach", "coast"), "Wildlife": ("zoo", "wildlife", "aquarium"), "Wellness": ("garden", "park"), "Food": ("market", "food"), "Photography": ("monument", "temple", "church", "cathedral", "mosque", "ashram")}.items() if any(term in words for term in terms)]
            image = row.get("thumbnail", {}).get("source")
            image_file = row.get("pageimage", "")
            if image and (not image.startswith("https://upload.wikimedia.org/") or not re.search(r"\.(?:jpe?g|webp)$",image_file,re.I) or re.search(r"logo|symbol|flag|seal|coat.of.arms|diagram|map\.",image_file,re.I)):
                image = None
            result.append(Attraction(id=f"wikipedia:{row['pageid']}", place_id=place.id, name=name, description=description[:900], latitude=lat, longitude=lon,
                                     source_url=row.get("fullurl") or "https://en.wikipedia.org/wiki/"+quote(name.replace(" ", "_")), image_url=image, image_file=row.get("pageimage"), categories=categories, checked_at=now))
        return result
    return cached(("attractions-v3", place.id), 21600, fetch)


def image_credit(venue: Attraction) -> dict | None:
    if not venue.image_url or not venue.image_file:
        return None
    def fetch():
        domain = "commons.wikimedia.org" if "/wikipedia/commons/" in venue.image_url else "en.wikipedia.org"
        try:
            result = get_json(f"https://{domain}/w/api.php", {"action":"query", "titles":"File:"+venue.image_file,"prop":"imageinfo","iiprop":"url|extmetadata","format":"json"})
            info = next(iter(result.get("query",{}).get("pages",{}).values())).get("imageinfo",[{}])[0]
            metadata = info.get("extmetadata",{})
            class TextOnly(HTMLParser):
                def __init__(self): super().__init__(); self.parts=[]
                def handle_data(self,value): self.parts.append(value)
            def plain(key):
                parser=TextOnly();parser.feed(metadata.get(key,{}).get("value", ""));return " ".join("".join(parser.parts).split())[:300]
            artist, license_name = plain("Artist"), plain("LicenseShortName")
            url = info.get("descriptionurl", "")
            if artist and license_name and url.startswith("https://"):
                return {"artist":artist,"license":license_name,"url":url}
        except (HTTPException, StopIteration, IndexError, ValueError):
            pass
        return None
    return cached(("image-credit",venue.image_url,venue.image_file),86400,fetch)


def forecast(place: Place, start: date | None, duration: int) -> dict:
    if not start or start > date.today() + timedelta(days=15):
        return {"status": "unavailable", "reason": "A dated forecast is available only near your travel dates.", "source_url": "https://open-meteo.com/"}
    end = min(start + timedelta(days=duration-1), date.today() + timedelta(days=15))
    try:
        return cached(("forecast", place.id, str(start), str(end)), 3600, lambda: {
            "status": "forecast", "checked_at": datetime.now(timezone.utc).isoformat(), "source_url": "https://open-meteo.com/",
            "data": get_json("https://api.open-meteo.com/v1/forecast", {"latitude": place.latitude, "longitude": place.longitude, "start_date": str(start), "end_date": str(end), "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max", "timezone": place.timezone}),
        })
    except HTTPException:
        return {"status": "unavailable", "reason": "The weather service could not provide a forecast.", "source_url": "https://open-meteo.com/"}
