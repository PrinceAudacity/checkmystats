from pydantic import BaseModel
from typing import Optional, List

class NodeBase(BaseModel):
    id: str
    display_name: str
    summary: str
    layer: int
    subject_category: str
    mastery_threshold: Optional[str] = None
    time_estimate_hours: Optional[float] = None
    assessment_count: Optional[int] = None
    x: Optional[float] = None
    y: Optional[float] = None

class NodeSummary(NodeBase):
    prerequisite_ids: List[str] = []
    unlocks_ids: List[str] = []
    overlap_ids: List[str] = []

    class Config:
        from_attributes = True

class GraphResponse(BaseModel):
    nodes: List[NodeSummary]
    edges: List[dict]  # {source: str, target: str, type: str}

class PathResponse(BaseModel):
    path: List[str]  # ordered list of node IDs from start to destination
    total_hours: float
    node_count: int
