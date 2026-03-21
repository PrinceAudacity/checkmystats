# backend/routes/user.py
from fastapi import APIRouter, Depends, HTTPException
from database import get_supabase
from auth import get_current_user
from pydantic import BaseModel
from supabase import Client
from datetime import datetime, timezone

router = APIRouter(prefix="/user", tags=["user"])


class SkillStatusUpdate(BaseModel):
    status: str  # "not_started" | "in_progress" | "mastered"

    def validate_status(self):
        allowed = {"not_started", "in_progress", "mastered"}
        if self.status not in allowed:
            raise HTTPException(
                status_code=422,
                detail=f"status must be one of {allowed}"
            )


class CareerPathCreate(BaseModel):
    target_id: str


# ── Skill status ─────────────────────────────────────────

@router.get("/skills")
def get_user_skills(
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    """Return a dict of skill_id → status for the current user."""
    try:
        res = sb.table("user_skill_status") \
            .select("skill_id, status") \
            .eq("user_id", user_id) \
            .execute()
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")
    data = res.data or []
    return {row["skill_id"]: row["status"] for row in data}


@router.put("/skills/{skill_id}")
def upsert_user_skill(
    skill_id: str,
    body: SkillStatusUpdate,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    """Upsert a skill status. Timestamps computed server-side."""
    body.validate_status()

    now = datetime.now(timezone.utc).isoformat()
    record = {
        "user_id": user_id,
        "skill_id": skill_id,
        "status": body.status,
    }

    # Check existing record for timestamp logic
    try:
        existing = sb.table("user_skill_status") \
            .select("status, started_at") \
            .eq("user_id", user_id) \
            .eq("skill_id", skill_id) \
            .execute()
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")
    existing_row = (existing.data or [None])[0]

    if body.status == "in_progress":
        if not existing_row or not existing_row.get("started_at"):
            record["started_at"] = now
        record["completed_at"] = None
    elif body.status == "mastered":
        if not existing_row or not existing_row.get("started_at"):
            record["started_at"] = now
        record["completed_at"] = now
    elif body.status == "not_started":
        record["started_at"] = None
        record["completed_at"] = None

    try:
        sb.table("user_skill_status").upsert(
            record, on_conflict="user_id,skill_id"
        ).execute()
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")
    return {"skill_id": skill_id, "status": body.status}


# ── Career paths ─────────────────────────────────────────

@router.get("/careers")
def get_user_careers(
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    """Return list of target_ids for the current user's saved career paths."""
    try:
        res = sb.table("user_career_paths") \
            .select("target_id") \
            .eq("user_id", user_id) \
            .execute()
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")
    return [row["target_id"] for row in (res.data or [])]


@router.post("/careers", status_code=201)
def add_user_career(
    body: CareerPathCreate,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    """Save a career path for the current user. Silently ignores duplicates."""
    try:
        sb.table("user_career_paths").insert({
            "user_id": user_id,
            "target_id": body.target_id,
        }).execute()
    except Exception as e:
        if "23505" not in str(e):
            raise HTTPException(status_code=500, detail="Failed to save career path")
    return {"target_id": body.target_id}


@router.delete("/careers/{career_id}", status_code=200)
def delete_user_career(
    career_id: str,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    """Delete a saved career path for the current user."""
    try:
        res = sb.table("user_career_paths") \
            .delete() \
            .eq("user_id", user_id) \
            .eq("target_id", career_id) \
            .select() \
            .execute()
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")
    if not res.data:
        raise HTTPException(status_code=404, detail="Career path not found")
    return {"deleted": True, "target_id": career_id}
