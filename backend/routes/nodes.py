from fastapi import APIRouter, Depends, HTTPException
from database import get_supabase
from schemas import SkillNodeSummary, GraphResponse, EdgeSchema, CategorySchema
from supabase import Client

router = APIRouter(prefix="/nodes", tags=["nodes"])


@router.get("/", response_model=GraphResponse)
def get_all_nodes(sb: Client = Depends(get_supabase)):
    nodes_res = sb.table("skill_nodes").select("*").execute()
    edges_res = sb.table("skill_edges").select("*").execute()
    categories_res = sb.table("categories").select("*").order("sort_order").execute()

    nodes = nodes_res.data or []
    edges = edges_res.data or []
    categories = categories_res.data or []

    prereq_map: dict[str, list[str]] = {}
    unlock_map: dict[str, list[str]] = {}
    for e in edges:
        prereq_map.setdefault(e["to_id"], []).append(e["from_id"])
        unlock_map.setdefault(e["from_id"], []).append(e["to_id"])

    node_summaries = [
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
        for n in nodes
    ]

    edge_list = [
        EdgeSchema(source=e["from_id"], target=e["to_id"])
        for e in edges
    ]

    cat_list = [
        CategorySchema(
            code=c["code"],
            name=c["name"],
            color=c["color"],
            sort_order=c["sort_order"],
        )
        for c in categories
    ]

    return GraphResponse(nodes=node_summaries, edges=edge_list, categories=cat_list)


@router.get("/{node_id}", response_model=SkillNodeSummary)
def get_node(node_id: str, sb: Client = Depends(get_supabase)):
    node_res = sb.table("skill_nodes").select("*").eq("id", node_id).execute()
    if not node_res.data or len(node_res.data) == 0:
        raise HTTPException(status_code=404, detail="Node not found")
    node = node_res.data[0]

    edges_res = sb.table("skill_edges").select("from_id, to_id").execute()
    edges = edges_res.data or []
    prereq_ids = [e["from_id"] for e in edges if e["to_id"] == node_id]
    unlock_ids = [e["to_id"] for e in edges if e["from_id"] == node_id]

    return SkillNodeSummary(
        id=node["id"],
        name=node["name"],
        tier=node["tier"],
        cat=node["cat"],
        hrs=node.get("hrs"),
        asmt_count=node.get("asmt_count", 0),
        edu_level=node.get("edu_level"),
        summary=node.get("summary"),
        mastery=node.get("mastery"),
        prerequisite_ids=prereq_ids,
        unlocks_ids=unlock_ids,
    )
