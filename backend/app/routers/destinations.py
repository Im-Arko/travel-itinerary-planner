import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session

from ..database.session import get_db
from ..database.models import User, Destination
from ..schemas.schemas import DestinationOut, DestinationSearchResult, IngestRequest, IngestResponse
from ..services.auth_service import get_current_user
from ..services import vector_store

router = APIRouter(prefix="/api/destinations", tags=["Destinations"])


@router.get("/", response_model=List[DestinationOut],
            summary="List all destinations in the knowledge base")
def list_destinations(
    budget:       Optional[str] = Query(None),
    climate:      Optional[str] = Query(None),
    dest_type:    Optional[str] = Query(None),
    skip:         int           = Query(0, ge=0),
    limit:        int           = Query(20, ge=1, le=100),
    db:           Session       = Depends(get_db),
    current_user: User          = Depends(get_current_user),
):
    q = db.query(Destination)
    if budget:
        q = q.filter(Destination.budget_level == budget)
    if climate:
        q = q.filter(Destination.climate_type == climate)
    if dest_type:
        q = q.filter(Destination.destination_type == dest_type)
    return q.offset(skip).limit(limit).all()


@router.get("/search", response_model=List[DestinationSearchResult],
            summary="Semantic search destinations using natural language query")
def search_destinations(
    q:            str           = Query(..., description="Natural language search query"),
    budget:       Optional[str] = Query(None),
    climate:      Optional[str] = Query(None),
    dest_type:    Optional[str] = Query(None),
    limit:        int           = Query(5, ge=1, le=20),
    db:           Session       = Depends(get_db),
    current_user: User          = Depends(get_current_user),
):
    results = vector_store.semantic_search(
        query_text       = q,
        n_results        = limit,
        budget_filter    = budget,
        climate_filter   = climate,
        dest_type_filter = dest_type,
    )

    output = []
    for r in results:
        dest = db.query(Destination).filter(Destination.id == r["destination_id"]).first()
        if dest:
            output.append(DestinationSearchResult(
                destination      = DestinationOut.model_validate(dest),
                similarity_score = r["score"],
                match_reason     = f"Matches your query with {r['score']*100:.0f}% semantic similarity",
            ))
    return output


@router.get("/{destination_id}", response_model=DestinationOut,
            summary="Get a single destination by ID")
def get_destination(
    destination_id: int,
    db:             Session = Depends(get_db),
    current_user:   User    = Depends(get_current_user),
):
    dest = db.query(Destination).filter(Destination.id == destination_id).first()
    if not dest:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Destination not found")
    return dest


@router.post("/ingest", response_model=IngestResponse,
             summary="Ingest destinations into the ChromaDB vector store")
def ingest_destinations(
    payload:      IngestRequest,
    db:           Session      = Depends(get_db),
    current_user: User         = Depends(get_current_user),
):
    count = vector_store.ingest_destinations(db, payload.destination_ids)
    return IngestResponse(ingested=count, message=f"Successfully ingested {count} destinations")


@router.get("/vector/count",
            summary="Get count of documents in vector store")
def vector_count(current_user: User = Depends(get_current_user)):
    return {"count": vector_store.collection_count()}
