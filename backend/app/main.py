from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.requests import Request
import os

from .database import engine, Base, SessionLocal
from .routers import auth, admin, products, sales, metrics
from . import crud, models
from .routers.auth import get_password_hash

app = FastAPI(title="NexPOS API", version="2.0.0")

# =========================
# CORS CONFIG
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  #  En producción cambiar esto
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# CREAR TABLAS
# =========================
Base.metadata.create_all(bind=engine)

# =========================
# INIT DB (ADMIN SEGURO)
# =========================
def init_db():
    db = SessionLocal()
    try:
        admin = crud.get_user_by_username(db, "admin")
        if not admin:
            db_user = models.Usuario(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                rol="admin",
                is_approved=True
            )
            db.add(db_user)
            db.commit()
            print("✔ Admin creado automáticamente")
        else:
            print("✔ Admin ya existe")
    except Exception as e:
        db.rollback()
        print(" Error al inicializar DB:", str(e))
    finally:
        db.close()

# =========================
# EVENTO STARTUP
# =========================
@app.on_event("startup")
def on_startup():
    print(" Iniciando NexPOS API...")
    init_db()

# =========================
# MANEJO GLOBAL DE ERRORES
# =========================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(" Error global:", str(exc))
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Error interno del servidor",
            "error": str(exc)  # puedes quitar esto en producción
        }
    )

# =========================
# RUTA RAÍZ
# =========================
@app.get("/")
def root():
    return {
        "message": "NexPOS V2 API activa",
        "status": "ok"
    }

# =========================
# REGISTRO DE ROUTERS
# =========================
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(products.router, prefix="/products", tags=["Productos"])
app.include_router(sales.router, prefix="/sales", tags=["Ventas"])
app.include_router(metrics.router, prefix="/metrics", tags=["Métricas"])