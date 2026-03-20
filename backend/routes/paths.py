from fastapi import APIRouter, Depends, HTTPException, Query
from collections import deque
from database import get_supabase
from schemas import PathResponse
from supabase import Client

router = APIRouter(prefix="/paths", tags=["paths"])


def bfs_path(sb: Client, start_id: str, end_id: str):
    if start_id == end_id:
        return [start_id]

    edges_res = sb.table("skill_edges").select("from_id, to_id").execute()
    edges = edges_res.data or []
    adj: dict[str, list[str]] = {}
    for e in edges:
        adj.setdefault(e["from_id"], []).append(e["to_id"])

    visited = {start_id}
    queue = deque([[start_id]])

    while queue:
        path = queue.popleft()
        current = path[-1]

        for neighbor in adj.get(current, []):
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
    sb: Client = Depends(get_supabase),
):
    start_res = sb.table("skill_nodes").select("id").eq("id", start).execute()
    end_res = sb.table("skill_nodes").select("id").eq("id", end).execute()

    if not start_res.data or len(start_res.data) == 0:
        raise HTTPException(status_code=404, detail=f"Start node '{start}' not found")
    if not end_res.data or len(end_res.data) == 0:
        raise HTTPException(status_code=404, detail=f"End node '{end}' not found")

    path = bfs_path(sb, start, end)

    if not path:
        raise HTTPException(
            status_code=404, detail="No path exists between these nodes"
        )

    nodes_res = sb.table("skill_nodes").select("id, hrs").in_("id", path).execute()
    node_map = {n["id"]: n for n in (nodes_res.data or [])}
    total_hours = sum(node_map.get(nid, {}).get("hrs") or 0 for nid in path)

    return PathResponse(
        path=path,
        total_hours=round(total_hours, 1),
        node_count=len(path),
    )
