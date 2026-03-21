# CheckMyStats

> A visual knowledge map connecting academic skills to career outcomes.

CheckMyStats shows students exactly where they are in their learning journey,
where they can go, and the precise path to get there.

## Stack

- **Frontend**: React + Vite + D3.js + Tailwind CSS
- **Backend**: Python + FastAPI + SQLAlchemy
- **Auth / DB migrations**: Supabase
- **Containers**: Docker + Docker Compose
- **Deployment**: Render.com

## Quick Start

```bash
# 1. Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Fill in your Supabase credentials in both files

# 2. Start containers
docker-compose up --build

# 3. Seed the database (first run only)
docker-compose exec backend python -m seed.seed_taxonomy
```

Visit http://localhost:5173
API docs: http://localhost:8000/docs

## Project Structure

```
checkmystats/
├── backend/
│   ├── main.py            # FastAPI app + CORS
│   ├── auth.py            # JWT middleware
│   ├── database.py        # SQLAlchemy setup
│   ├── schemas.py         # Pydantic models
│   ├── routes/
│   │   ├── nodes.py       # GET /nodes
│   │   ├── paths.py       # GET /paths
│   │   ├── search.py      # GET /search
│   │   ├── categories.py  # GET /categories
│   │   └── user.py        # /user/skills, /user/careers
│   └── seed/
│       └── seed_taxonomy.py
├── frontend/
│   └── src/
│       ├── components/    # UI (MapCanvas, Sidebar, Header, …)
│       ├── hooks/         # useGraph, useSkillStatus, useCareerPaths, …
│       ├── services/      # api.js (JWT interceptor), supabase.js
│       ├── contexts/      # AuthContext
│       └── utils/         # graph.js, layout.js, constants.js
├── supabase/
│   ├── migrations/        # SQL schema + seed migrations
│   └── functions/         # Edge functions (assessment, resume export)
└── docker-compose.yml
```

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/nodes` | All skill nodes |
| GET | `/paths` | Prerequisite edges |
| GET | `/search` | Search nodes |
| GET | `/categories` | Subject categories |
| GET | `/user/skills` | Authenticated user's skill progress |
| GET/POST | `/user/careers` | Authenticated user's saved careers |

## Team

Built by Howard University's team for the Bank of America Codeathon.
