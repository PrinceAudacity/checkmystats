from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Node
from schemas import NodeSummary, GraphResponse

router = APIRouter(prefix="/nodes", tags=["nodes"])

@router.get("/", response_model=GraphResponse)
def get_all_nodes(db: Session = Depends(get_db)):
    """
    Returns all nodes and all edges.
    This is the primary endpoint for loading the full map.
    """
    nodes = db.query(Node).all()
    edges = []

    for node in nodes:
        for prereq in node.prerequisites:
            edges.append({
                "source": prereq.id,
                "target": node.id,
                "type": "prerequisite"
            })
        for overlap in node.overlaps:
            edges.append({
                "source": node.id,
                "target": overlap.id,
                "type": "overlap"
            })

    node_summaries = []
    for node in nodes:
        summary = NodeSummary(
            id=node.id,
            display_name=node.display_name,
            summary=node.summary,
            layer=node.layer,
            subject_category=node.subject_category,
            mastery_threshold=node.mastery_threshold,
            time_estimate_hours=node.time_estimate_hours,
            assessment_count=node.assessment_count,
            x=node.x,
            y=node.y,
            prerequisite_ids=[p.id for p in node.prerequisites],
            unlocks_ids=[u.id for u in node.unlocks],
            overlap_ids=[o.id for o in node.overlaps],
        )
        node_summaries.append(summary)

    return GraphResponse(nodes=node_summaries, edges=edges)

@router.get("/{node_id}", response_model=NodeSummary)
def get_node(node_id: str, db: Session = Depends(get_db)):
    """Returns a single node with all its relationships."""
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return NodeSummary(
        id=node.id,
        display_name=node.display_name,
        summary=node.summary,
        layer=node.layer,
        subject_category=node.subject_category,
        mastery_threshold=node.mastery_threshold,
        time_estimate_hours=node.time_estimate_hours,
        assessment_count=node.assessment_count,
        x=node.x,
        y=node.y,
        prerequisite_ids=[p.id for p in node.prerequisites],
        unlocks_ids=[u.id for u in node.unlocks],
        overlap_ids=[o.id for o in node.overlaps],
    )
