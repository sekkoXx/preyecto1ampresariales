from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import schemas, crud, models
from ..database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

def require_admin(current_user: models.Usuario = Depends(get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Requiere permisos de administrador")
    return current_user

@router.get("/users", response_model=list[schemas.UsuarioPublico])
def list_users(db: Session = Depends(get_db), admin: models.Usuario = Depends(require_admin)):
    return db.query(models.Usuario).all()

@router.put("/users/{user_id}/approve", response_model=schemas.UsuarioPublico)
def approve_user(user_id: int, is_approved: bool, db: Session = Depends(get_db), admin: models.Usuario = Depends(require_admin)):
    user = crud.update_user_approval(db, user_id, is_approved)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user
