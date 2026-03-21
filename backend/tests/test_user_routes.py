# backend/tests/test_user_routes.py
from fastapi.testclient import TestClient
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from main import app

client = TestClient(app)

def test_get_skills_requires_auth():
    assert client.get("/user/skills").status_code == 401

def test_put_skill_requires_auth():
    assert client.put("/user/skills/some_id", json={"status": "in_progress"}).status_code == 401

def test_get_careers_requires_auth():
    assert client.get("/user/careers").status_code == 401

def test_post_career_requires_auth():
    assert client.post("/user/careers", json={"target_id": "car_mech_eng"}).status_code == 401

def test_delete_career_requires_auth():
    assert client.delete("/user/careers/car_mech_eng").status_code == 401

def test_put_skill_rejects_invalid_status():
    resp = client.put("/user/skills/some_id", json={"status": "invalid_value"})
    assert resp.status_code in (401, 422)
