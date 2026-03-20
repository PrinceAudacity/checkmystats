from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import nodes, paths, search, saved_paths, categories

app = FastAPI(
    title="CheckMyStats API",
    description="STEM skill-mapping API — prerequisite graph, pathfinding, and progress tracking",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://checkmystats.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nodes.router)
app.include_router(paths.router)
app.include_router(search.router)
app.include_router(saved_paths.router)
app.include_router(categories.router)


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "CheckMyStats API v2 is running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
