from fastapi import APIRouter, Depends
from typing import List
from database import get_supabase
from schemas import CategorySchema
from supabase import Client

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/", response_model=List[CategorySchema])
def list_categories(sb: Client = Depends(get_supabase)):
    res = sb.table("categories").select("*").order("sort_order").execute()
    rows = res.data or []
    return [
        CategorySchema(
            code=r["code"],
            name=r["name"],
            color=r["color"],
            sort_order=r["sort_order"],
        )
        for r in rows
    ]
