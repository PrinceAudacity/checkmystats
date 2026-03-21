from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class CategorySchema(BaseModel):
    code: str
    name: str
    color: str
    sort_order: int

    class Config:
        from_attributes = True


class SkillNodeBase(BaseModel):
    id: str
    name: str
    tier: int
    cat: str
    hrs: Optional[int] = None
    asmt_count: Optional[int] = 0
    edu_level: Optional[str] = None
    summary: Optional[str] = None
    mastery: Optional[str] = None

    class Config:
        from_attributes = True


class SkillNodeSummary(SkillNodeBase):
    prerequisite_ids: List[str] = []
    unlocks_ids: List[str] = []


class EdgeSchema(BaseModel):
    source: str
    target: str

class GraphResponse(BaseModel):
    nodes: List[SkillNodeSummary]
    edges: List[EdgeSchema]
    categories: List[CategorySchema]


class PathResponse(BaseModel):
    path: List[str]
    total_hours: float
    node_count: int


class SavedPathCreate(BaseModel):
    label: Optional[str] = None
    start_id: str
    end_id: str
    path: List[str]
    total_hours: float
    node_count: int


class SavedPathResponse(SavedPathCreate):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class UserSkillStatusSchema(BaseModel):
    user_id: UUID
    skill_id: str
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    hours_logged: Optional[float] = 0

    class Config:
        from_attributes = True


class UserProgressSummary(BaseModel):
    total_nodes: int
    mastered: int
    in_progress: int
    not_started: int
    total_hours: float
    hours_completed: float
