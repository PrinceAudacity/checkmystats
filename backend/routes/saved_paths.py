from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from uuid import UUID
from database import get_supabase
from schemas import SavedPathCreate, SavedPathResponse
from supabase import Client

router = APIRouter(prefix="/saved-paths", tags=["saved-paths"])


@router.post("/", response_model=SavedPathResponse, status_code=201)
def create_saved_path(body: SavedPathCreate, sb: Client = Depends(get_supabase)):
    row = {
        "label": body.label,
        "start_id": body.start_id,
        "end_id": body.end_id,
        "path": body.path,
        "total_hours": body.total_hours,
        "node_count": body.node_count,
    }
    res = sb.table("saved_paths").insert(row).execute()
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to save path")
    saved = res.data[0]
    return SavedPathResponse(
        id=saved["id"],
        label=saved.get("label"),
        start_id=saved["start_id"],
        end_id=saved["end_id"],
        path=saved["path"],
        total_hours=saved["total_hours"],
        node_count=saved["node_count"],
        created_at=saved["created_at"],
    )


@router.get("/", response_model=List[SavedPathResponse])
def list_saved_paths(
    label: Optional[str] = Query(None, description="Filter by label substring"),
    sb: Client = Depends(get_supabase),
):
    query = sb.table("saved_paths").select("*").order("created_at", desc=True)
    if label:
        query = query.ilike("label", f"*{label}*")
    res = query.execute()
    rows = res.data or []
    return [
        SavedPathResponse(
            id=r["id"],
            label=r.get("label"),
            start_id=r["start_id"],
            end_id=r["end_id"],
            path=r["path"],
            total_hours=r["total_hours"],
            node_count=r["node_count"],
            created_at=r["created_at"],
        )
        for r in rows
    ]


@router.get("/{path_id}", response_model=SavedPathResponse)
def get_saved_path(path_id: UUID, sb: Client = Depends(get_supabase)):
    res = sb.table("saved_paths").select("*").eq("id", str(path_id)).execute()
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="Saved path not found")
    r = res.data[0]
    return SavedPathResponse(
        id=r["id"],
        label=r.get("label"),
        start_id=r["start_id"],
        end_id=r["end_id"],
        path=r["path"],
        total_hours=r["total_hours"],
        node_count=r["node_count"],
        created_at=r["created_at"],
    )


@router.delete("/{path_id}")
def delete_saved_path(path_id: UUID, sb: Client = Depends(get_supabase)):
    res = sb.table("saved_paths").delete().eq("id", str(path_id)).select().execute()
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="Saved path not found")
    return {"deleted": True}
