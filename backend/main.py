from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routes import nodes, paths, search

# Create all database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CheckMyStats API",
    description="Knowledge map API — academic skills to career outcomes",
    version="0.1.0"
)

# CORS — allow frontend dev server and production domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",
        "https://checkmystats.onrender.com",  # update with real domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nodes.router)
app.include_router(paths.router)
app.include_router(search.router)

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "CheckMyStats API is running",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}
