from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
from models import Node
from schemas import NodeSummary
from typing import List

router = APIRouter(prefix="/search", tags=["search"])

@router.get("/", response_model=List[NodeSummary])
def search_nodes(
    q: str = Query(..., min_length=1, description="Search query"),
    db: Session = Depends(get_db)
):
    """
    Full-text search across node names and summaries.
    Returns matching nodes ordered by layer (Foundation first).
    """
    results = db.query(Node).filter(
        or_(
            Node.display_name.ilike(f"%{q}%"),
            Node.summary.ilike(f"%{q}%"),
            Node.subject_category.ilike(f"%{q}%")
        )
    ).order_by(Node.layer).limit(20).all()

    return [
        NodeSummary(
            id=n.id,
            display_name=n.display_name,
            summary=n.summary,
            layer=n.layer,
            subject_category=n.subject_category,
            mastery_threshold=n.mastery_threshold,
            time_estimate_hours=n.time_estimate_hours,
            assessment_count=n.assessment_count,
            x=n.x,
            y=n.y,
            prerequisite_ids=[p.id for p in n.prerequisites],
            unlocks_ids=[u.id for u in n.unlocks],
            overlap_ids=[o.id for o in n.overlaps],
        )
        for n in results
    ]
