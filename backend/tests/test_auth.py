# backend/tests/test_auth.py
from fastapi.testclient import TestClient
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from main import app

client = TestClient(app)

def test_protected_route_requires_auth():
    """User routes must return 401 when no Authorization header is sent."""
    resp = client.get("/user/skills")
    assert resp.status_code == 401

def test_protected_route_rejects_bad_token():
    """User routes must return 401 when an invalid JWT is sent."""
    resp = client.get("/user/skills", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401
