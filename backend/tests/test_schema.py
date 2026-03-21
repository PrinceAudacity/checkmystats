# backend/tests/test_schema.py
from fastapi.testclient import TestClient
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from main import app

client = TestClient(app)

def test_search_returns_display_name():
    """Search results must have display_name and subject_category, not name/cat."""
    resp = client.get("/search/?q=math")
    assert resp.status_code == 200
    data = resp.json()
    if data:
        node = data[0]
        assert "display_name" in node, "Expected display_name, got: " + str(list(node.keys()))
        assert "subject_category" in node
        assert "name" not in node
        assert "cat" not in node

def test_nodes_returns_display_name():
    """Graph endpoint must return nodes with display_name and subject_category."""
    resp = client.get("/nodes/")
    assert resp.status_code == 200
    nodes = resp.json()["nodes"]
    assert len(nodes) > 0
    node = nodes[0]
    assert "display_name" in node
    assert "subject_category" in node
    assert "degree_level" in node
