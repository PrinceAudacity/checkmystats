from fastapi import APIRouter, Depends, Query
from database import get_supabase
from schemas import SkillNodeSummary
from typing import List
from supabase import Client

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/", response_model=List[SkillNodeSummary])
def search_nodes(
    q: str = Query(..., min_length=1, description="Search query"),
    sb: Client = Depends(get_supabase),
):
    q_lower = q.lower()
    nodes_res = sb.table("skill_nodes").select("*").order("tier").execute()
    nodes = nodes_res.data or []
    cat_res = sb.table("categories").select("code, name").execute()
    cat_by_code = {c["code"]: c["name"] for c in (cat_res.data or [])}

    def matches(n):
        if q_lower in (n.get("name") or "").lower():
            return True
        if q_lower in (n.get("summary") or "").lower():
            return True
        if q_lower in (cat_by_code.get(n.get("cat"), "") or "").lower():
            return True
        return False

    results = [n for n in nodes if matches(n)][:20]

    edges_res = sb.table("skill_edges").select("from_id, to_id").execute()
    edges = edges_res.data or []
    prereq_map: dict[str, list[str]] = {}
    unlock_map: dict[str, list[str]] = {}
    for e in edges:
        prereq_map.setdefault(e["to_id"], []).append(e["from_id"])
        unlock_map.setdefault(e["from_id"], []).append(e["to_id"])

    return [
        SkillNodeSummary(
            id=n["id"],
            name=n["name"],
            tier=n["tier"],
            cat=n["cat"],
            hrs=n.get("hrs"),
            asmt_count=n.get("asmt_count", 0),
            edu_level=n.get("edu_level"),
            summary=n.get("summary"),
            mastery=n.get("mastery"),
            prerequisite_ids=prereq_map.get(n["id"], []),
            unlocks_ids=unlock_map.get(n["id"], []),
        )
        for n in results
    ]
