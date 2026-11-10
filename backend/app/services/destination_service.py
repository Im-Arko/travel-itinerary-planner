"""Resolve a requested place without letting recommendation filters replace it."""
import re
import unicodedata
from fastapi import HTTPException
from sqlalchemy.orm import Session
from ..database.models import Destination


PLACE_ALIASES = {
    "puducherry": "pondicherry", "pondy": "pondicherry",
    "calcutta": "kolkata", "bombay": "mumbai", "bangalore": "bengaluru",
    "benares": "varanasi", "banaras": "varanasi",
    "nyc": "new york city", "new york": "new york city",
    "saigon": "ho chi minh city",
}


def normalize_place(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).casefold()
    value = "".join(character for character in value if not unicodedata.combining(character))
    return " ".join("".join(character if character.isalnum() else " " for character in value).split())


def canonical_place(value: str) -> str:
    key = normalize_place(value)
    return PLACE_ALIASES.get(key, key)


def same_destination(value: str, name: str, country: str = "") -> bool:
    if canonical_place(value) == canonical_place(name):
        return True
    if country and normalize_place(value) == normalize_place(f"{name} {country}"):
        return True
    # Accept a provider adding the selected country's name, but not a different
    # qualifier such as Paris, Texas for a request for Paris, France.
    if country and "," in value:
        place, qualifier = value.rsplit(",", 1)
        return canonical_place(place) == canonical_place(name) and normalize_place(qualifier) == normalize_place(country)
    return False


def resolve_requested_destination(db: Session, hint: str | None) -> dict | None:
    requested = " ".join((hint or "").split())
    if not requested:
        return None

    # This place is supported even when it has not been added to the catalog.
    places = {"pondicherry": {
        "destination_id": None, "name": "Pondicherry", "country": "India",
        "document": "Pondicherry (Puducherry), India: White Town, Promenade Beach, Bharathi Park, Sri Aurobindo Ashram and the Puducherry Museum.",
    }}
    for destination in db.query(Destination).order_by(Destination.id).all():
        places[canonical_place(destination.name)] = {
            "destination_id": destination.id, "name": destination.name, "country": destination.country,
            "document": f"Destination: {destination.name}, {destination.country}. {destination.description}",
        }
    variants = {key: key for key in places}
    variants.update({alias: key for alias, key in PLACE_ALIASES.items() if key in places})
    normalized = normalize_place(requested)
    if normalized in variants:
        return places[variants[normalized]]

    # Keep explicit geographic qualifiers. A catalog's Paris, France must not
    # replace Paris, Texas, and a location outside the catalog is still usable.
    qualified_request = None
    if "," in requested:
        name, qualifier = requested.split(",", 1)
        key = variants.get(normalize_place(name))
        if key:
            place = places[key]
            if normalize_place(qualifier) == normalize_place(place["country"]):
                return place
            qualified_request = requested

    mentions = []
    for variant, key in variants.items():
        for match in re.finditer(r"(?<!\w)" + re.escape(variant) + r"(?!\w)", normalized):
            mentions.append((match.start(), match.end(), key))
    # Prefer a complete name over a shorter name contained inside it.
    keys = {key for start, end, key in mentions if not any(
        other_start <= start and other_end >= end and other_end - other_start > end - start
        for other_start, other_end, _ in mentions
    )}
    if len(keys) > 1:
        raise HTTPException(422, "Please name one destination for this trip.")
    if qualified_request:
        return _uncatalogued_destination(qualified_request)
    if keys:
        # Only extract a shorter place name from travel prose. A bare name such
        # as Santiago de Compostela must not become the catalog's Santiago.
        travel_prose = re.search(r"\b(trip|travel|visit|vacation|holiday|weekend|days|nights)\b", normalized)
        if travel_prose or normalized.startswith(("i ", "we ", "in ", "to ")) or normalized.endswith(" please"):
            return places[keys.pop()]
    return _uncatalogued_destination(requested)


def _uncatalogued_destination(name: str) -> dict:
    if len(name) > 150:
        raise HTTPException(422, "Please enter a destination name of 150 characters or fewer.")
    return {
        "destination_id": None, "name": name, "country": "",
        "document": f"Requested destination: {name}. Plan within this place. Do not substitute a catalog destination or invent verified opening hours or availability.",
    }
