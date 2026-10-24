"""Semantic search using JSON embeddings in the application's SQL database.

Only operator-configured Sentence Transformer models run locally. There is no
separate vector server, remote collection configuration, pickle, or executable
model configuration supplied by API clients.
"""
import json
import math
from threading import Lock
from typing import Optional
from sqlalchemy.orm import Session
from ..config import get_settings
from ..database.models import Destination, DestinationEmbedding

settings = get_settings()
_embedder = None
_embedder_lock = Lock()


def _get_embedder():
    global _embedder
    with _embedder_lock:
        if _embedder is None:
            from sentence_transformers import SentenceTransformer
            _embedder = SentenceTransformer(
                settings.embedding_model, trust_remote_code=False,
                model_kwargs={"use_safetensors": True},
            )
    return _embedder


def _build_doc_text(dest: Destination) -> str:
    tags = []
    if dest.tags:
        try:
            parsed = json.loads(dest.tags)
            if isinstance(parsed, list):
                tags = [tag for tag in parsed if isinstance(tag, str)]
        except (ValueError, TypeError):
            pass
    return (
        f"Destination: {dest.name}, {dest.country}. Type: {dest.destination_type}. "
        f"Climate: {dest.climate_type}. Budget: {dest.budget_level}. "
        f"Tags: {', '.join(tags)}. {dest.description}"
    )


def _validated_vector(values) -> list[float]:
    vector = [float(value) for value in values]
    if not 1 <= len(vector) <= 4096 or not all(math.isfinite(value) for value in vector):
        raise ValueError("Invalid embedding")
    return vector


def ingest_destinations(db: Session, destination_ids: Optional[list[int]] = None) -> int:
    query = db.query(Destination)
    if destination_ids is not None:
        query = query.filter(Destination.id.in_(destination_ids))
    destinations = query.order_by(Destination.id).all()
    if not destinations:
        return 0
    embedder = _get_embedder()
    # Bounded batches avoid materializing the whole embedding matrix.
    for offset in range(0, len(destinations), 64):
        batch = destinations[offset:offset + 64]
        vectors = embedder.encode([_build_doc_text(dest) for dest in batch],
                                  show_progress_bar=False, normalize_embeddings=True)
        for dest, values in zip(batch, vectors):
            row = db.get(DestinationEmbedding, dest.id)
            if row is None:
                row = DestinationEmbedding(destination_id=dest.id)
                db.add(row)
            row.model_name = settings.embedding_model
            row.document = _build_doc_text(dest)
            row.embedding = _validated_vector(values)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return len(destinations)


def semantic_search(
    db: Session, query_text: str, n_results: int = 5,
    budget_filter: Optional[str] = None, climate_filter: Optional[str] = None,
    dest_type_filter: Optional[str] = None,
) -> list[dict]:
    query = db.query(Destination, DestinationEmbedding).join(
        DestinationEmbedding, DestinationEmbedding.destination_id == Destination.id
    ).filter(DestinationEmbedding.model_name == settings.embedding_model)
    for column, value in ((Destination.budget_level, budget_filter),
                          (Destination.climate_type, climate_filter),
                          (Destination.destination_type, dest_type_filter)):
        if value and value != "any":
            query = query.filter(column == value)
    if query.first() is None:
        return []
    needle = _validated_vector(_get_embedder().encode(
        [query_text], show_progress_bar=False, normalize_embeddings=True
    )[0])
    needle_norm = math.sqrt(sum(value * value for value in needle))
    if needle_norm == 0:
        return []
    matches = []
    for dest, row in query.yield_per(100):
        vector = _validated_vector(row.embedding)
        if len(vector) != len(needle):
            continue
        norm = math.sqrt(sum(value * value for value in vector))
        if norm == 0:
            continue
        similarity = sum(a * b for a, b in zip(needle, vector)) / (needle_norm * norm)
        matches.append({
            "destination_id": dest.id, "name": dest.name, "country": dest.country,
            "score": round(max(-1.0, min(1.0, similarity)), 4), "document": row.document,
        })
    return sorted(matches, key=lambda item: (-item["score"], item["destination_id"]))[:n_results]


def collection_count(db: Session) -> int:
    return db.query(DestinationEmbedding).filter(
        DestinationEmbedding.model_name == settings.embedding_model
    ).count()
