from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from collections import deque
from database import get_db
from models import Node
from schemas import PathResponse

router = APIRouter(prefix="/paths", tags=["paths"])

def bfs_path(db: Session, start_id: str, end_id: str):
    """
    Breadth-first search through prerequisite edges.
    Finds the shortest prerequisite path from start_id to end_id.
    Returns ordered list of node IDs, or None if no path exists.
    """
    if start_id == end_id:
        return [start_id]

    # Build adjacency map: node -> nodes it unlocks
    all_nodes = db.query(Node).all()
    unlocks_map = {}
    for node in all_nodes:
        unlocks_map[node.id] = [u.id for u in node.unlocks]

    visited = {start_id}
    queue = deque([[start_id]])

    while queue:
        path = queue.popleft()
        current = path[-1]

        for neighbor in unlocks_map.get(current, []):
            if neighbor == end_id:
                return path + [neighbor]
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(path + [neighbor])

    return None

@router.get("/", response_model=PathResponse)
def get_path(
    start: str = Query(..., description="Starting node ID"),
    end: str = Query(..., description="Destination node ID"),
    db: Session = Depends(get_db)
):
    """
    Returns the shortest prerequisite path between two nodes.
    This powers the pathfinding feature — highlight the route to a destination.
    """
    start_node = db.query(Node).filter(Node.id == start).first()
    end_node = db.query(Node).filter(Node.id == end).first()

    if not start_node:
        raise HTTPException(status_code=404, detail=f"Start node '{start}' not found")
    if not end_node:
        raise HTTPException(status_code=404, detail=f"End node '{end}' not found")

    path = bfs_path(db, start, end)

    if not path:
        raise HTTPException(
            status_code=404,
            detail="No path exists between these nodes"
        )

    # Calculate total time estimate along the path
    total_hours = 0.0
    for node_id in path:
        node = db.query(Node).filter(Node.id == node_id).first()
        if node and node.time_estimate_hours:
            total_hours += node.time_estimate_hours

    return PathResponse(
        path=path,
        total_hours=round(total_hours, 1),
        node_count=len(path)
    )
