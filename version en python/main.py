from datetime import datetime, timedelta, timezone
import os

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import crud
import esquemas
import modelos
from base_de_datos import Base, SessionLocal, engine


app = FastAPI(title="NexPOS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.getenv("NEXPOS_SECRET", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def crear_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verificar_password(password_plano: str, hashed_password: str):
    return pwd_context.verify(password_plano, hashed_password)


def hash_password(password: str):
    return pwd_context.hash(password)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autorizado",
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise unauthorized
    except JWTError:
        raise unauthorized

    usuario = crud.obtener_usuario_por_username(db, username)
    if usuario is None:
        raise unauthorized

    return usuario


def ensure_seed_user(db: Session):
    if not crud.obtener_usuario_por_username(db, "admin"):
        crud.crear_usuario(
            db=db,
            username="admin",
            hashed_password=hash_password("admin123"),
            rol="admin",
        )


@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        ensure_seed_user(db)
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "message": "NexPOS API activa",
        "login_demo": {
            "username": "admin",
            "password": "admin123",
        },
    }


@app.post("/auth/login", response_model=esquemas.Token)
def login(data: esquemas.LoginRequest, db: Session = Depends(get_db)):
    usuario = crud.obtener_usuario_por_username(db, data.username)
    if not usuario or not verificar_password(data.password, usuario.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales invalidas")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = crear_token(
        data={"sub": usuario.username, "rol": usuario.rol},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me", response_model=esquemas.UsuarioPublico)
def get_me(current_user: modelos.Usuario = Depends(get_current_user)):
    return current_user


@app.get("/productos", response_model=list[esquemas.Producto])
def listar_productos(
    db: Session = Depends(get_db),
    current_user: modelos.Usuario = Depends(get_current_user),
):
    _ = current_user
    return crud.obtener_productos(db)


@app.post("/productos", response_model=esquemas.Producto)
def crear_producto(
    producto: esquemas.ProductoCreate,
    db: Session = Depends(get_db),
    current_user: modelos.Usuario = Depends(get_current_user),
):
    _ = current_user
    return crud.crear_producto(db, producto)


@app.put("/productos/{producto_id}", response_model=esquemas.Producto)
def editar_producto(
    producto_id: int,
    datos: esquemas.ProductoCreate,
    db: Session = Depends(get_db),
    current_user: modelos.Usuario = Depends(get_current_user),
):
    _ = current_user
    actualizado = crud.actualizar_producto(db, producto_id, datos)
    if not actualizado:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return actualizado


@app.delete("/productos/{producto_id}")
def borrar_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: modelos.Usuario = Depends(get_current_user),
):
    _ = current_user
    eliminado = crud.eliminar_producto(db, producto_id)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"ok": True}


@app.post("/ventas", response_model=esquemas.Venta)
def registrar_venta(
    venta: esquemas.VentaCreate,
    db: Session = Depends(get_db),
    current_user: modelos.Usuario = Depends(get_current_user),
):
    _ = current_user
    try:
        return crud.crear_venta(db, venta)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/ventas", response_model=list[esquemas.Venta])
def listar_ventas(
    db: Session = Depends(get_db),
    current_user: modelos.Usuario = Depends(get_current_user),
):
    _ = current_user
    return crud.obtener_ventas(db)
