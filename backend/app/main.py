from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from .database import engine, Base, SessionLocal
from .routers import auth, admin, products, sales, metrics
from . import crud, models
from .auth import get_password_hash

app = FastAPI(title="NexPOS API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

def init_db():
    db = SessionLocal()
    try:
        # Create admin if it doesn't exist
        if not crud.get_user_by_username(db, "admin"):
            db_user = models.Usuario(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                rol="admin",
                is_approved=True
            )
            db.add(db_user)
            db.commit()
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
def root():
    return {"message": "NexPOS V2 API activa"}

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(products.router)
app.include_router(sales.router)
app.include_router(metrics.router)
