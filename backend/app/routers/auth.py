from datetime import datetime, timedelta, timezone
import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt

from .. import schemas, crud, models
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

SECRET_KEY = os.getenv("NEXPOS_SECRET", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8


# =========================
# PASSWORD
# =========================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


# =========================
# TOKEN
# =========================

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")

        if username is None:
            raise HTTPException(status_code=401, detail="Token inválido")

    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    user = crud.get_user_by_username(db, username)

    if user is None:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")

    return user


# =========================
# ROUTES
# =========================

@router.post("/register", response_model=schemas.UsuarioPublico)
def register(user: schemas.UsuarioCreate, db: Session = Depends(get_db)):

    if user.rol not in ["buyer", "seller"]:
        raise HTTPException(status_code=400, detail="Rol inválido")

    hashed_password = get_password_hash(user.password)

    try:
        return crud.create_user(db, user, hashed_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Error interno")


@router.post("/login", response_model=schemas.Token)
def login(data: schemas.LoginRequest, db: Session = Depends(get_db)):

    user = crud.get_user_by_username(db, data.username)

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    if not user.is_approved:
        raise HTTPException(status_code=403, detail="Usuario no aprobado")

    access_token = create_access_token(
        data={"sub": user.username, "rol": user.rol},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UsuarioPublico)
def get_me(current_user: models.Usuario = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=schemas.UsuarioPublico)
def update_me(
    data: schemas.UsuarioUpdate,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if data.nickname is not None:
            current_user.nickname = data.nickname

        if data.profile_image is not None:
            current_user.profile_image = data.profile_image

        db.commit()
        db.refresh(current_user)

        return current_user

    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error al actualizar usuario")


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Desasociar productos
        for producto in current_user.productos:
            producto.seller_id = None

        db.delete(current_user)
        db.commit()

        return None

    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error al eliminar usuario")