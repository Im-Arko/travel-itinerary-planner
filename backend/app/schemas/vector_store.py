"""
Vector Store Service
──────────────────────────────────────────────────────────────
Manages destination embeddings in ChromaDB using Sentence Transformers.
Provides semantic similarity search for destination matching.
"""

import json
import logging
from typing import List, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database.models import Destination

logger   = logging.getLogger(__name__)
settings = get_settings()

# ── Lazy singletons ────────────────────────────────────────────

_chroma_client: Optional[chromadb.Client] = None
_collection = None
_embedder: Optional[SentenceTransformer] = None


def _get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        logger.info("Loading sentence transformer model: %s", settings.embedding_model)
        _embedder = SentenceTransformer(settings.embedding_model)
    return _embedder


def _get_collection():
    global _chroma_client, _collection
    if _collection is None:
        _chroma_client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
        )
        _collection = _chroma_client.get_or_create_collection(
            name=settings.chroma_collection_name,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


# ── Build rich text for embedding ──────────────────────────────

def _build_doc_text(dest: Destination) -> str:
    tags_str = ""
    if dest.tags:
        try:
            tags_str = ", ".join(json.loads(dest.tags))
        except Exception:
            tags_str = dest.tags

    return (
        f"Destination: {dest.name}, {dest.country}. "
        f"Type: {dest.destination_type}. "
        f"Climate: {dest.climate_type}. "
        f"Budget: {dest.budget_level}. "
        f"Tags: {tags_str}. "
        f"{dest.description}"
    )


# ── Ingest ─────────────────────────────────────────────────────

def ingest_destinations(db: Session, destination_ids: Optional[List[int]] = None) -> int:
    """
    Embed destination descriptions and upsert into ChromaDB.
    Returns number of documents ingested.
    """
    query = db.query(Destination)
    if destination_ids:
        query = query.filter(Destination.id.in_(destination_ids))
    destinations = query.all()

    if not destinations:
        return 0

    

    embedder   = _get_embedder()

    texts = [_build_doc_text(d) for d in destinations]
    ids   = [f"dest_{d.id}" for d in destinations]
    metas = [
        {
            "destination_id":   str(d.id),
            "name":             d.name,
            "country":          d.country,
            "climate_type":     d.climate_type,
            "destination_type": d.destination_type,
            "budget_level":     d.budget_level,
        }
        for d in destinations
    ]

    embeddings = embedder.encode(texts, show_progress_bar=False).tolist()
    
    collection = _get_collection()

    collection.upsert(
        ids        = ids,
        embeddings = embeddings,
        documents  = texts,
        metadatas  = metas,
    )

    # Save chroma_doc_id back to DB
    for d, doc_id in zip(destinations, ids):
        d.chroma_doc_id = doc_id
    db.commit()

    logger.info("Ingested %d destinations into ChromaDB", len(destinations))
    return len(destinations)


# ── Semantic search ────────────────────────────────────────────

def semantic_search(
    query_text: str,
    n_results: int = 5,
    budget_filter: Optional[str] = None,
    climate_filter: Optional[str] = None,
    dest_type_filter: Optional[str] = None,
) -> List[dict]:
    """
    Encode query and find semantically similar destinations.
    Returns list of {destination_id, name, country, score, document}.
    """
    embedder   = _get_embedder()
    
    collection = _get_collection()
    if collection.count() == 0:
        logger.warning("Semantic search requested with an empty vector collection")
        return []
    # Build ChromaDB where clause
    where_clauses = []
    if budget_filter and budget_filter != "any":
        where_clauses.append({"budget_level": {"$eq": budget_filter}})
    if climate_filter and climate_filter != "any":
        where_clauses.append({"climate_type": {"$eq": climate_filter}})
    if dest_type_filter and dest_type_filter != "any":
        where_clauses.append({"destination_type": {"$eq": dest_type_filter}})

    where = None
    if len(where_clauses) == 1:
        where = where_clauses[0]
    elif len(where_clauses) > 1:
        where = {"$and": where_clauses}

    query_embedding = embedder.encode([query_text], show_progress_bar=False).tolist()

    kwargs = {
        "query_embeddings": query_embedding,
        "n_results":        min(n_results, collection.count() or 1),
        "include":          ["metadatas", "documents", "distances"],
    }
    if where:
        kwargs["where"] = where

    try:
        results = collection.query(**kwargs)
    except Exception:
        logger.exception("ChromaDB query failed")
        return []

    output = []
    metadatas = results.get("metadatas") or [[]]
    documents = results.get("documents") or [[]]
    distances = results.get("distances") or [[]]

    for i, meta in enumerate(metadatas[0]):
        score = 1.0 - results["distances"][0][i]   # cosine → similarity
        output.append({
            "destination_id": int(meta["destination_id"]),
            "name":           meta["name"],
            "country":        meta["country"],
            "score":          round(score, 4),
            "document":       documents[0][i],
        })
    

    return output



def collection_count() -> int:
    try:
        return _get_collection().count()
    except Exception:
        return 0
