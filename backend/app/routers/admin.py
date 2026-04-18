from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional

from .. import schemas, crud, models
from ..database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


# =========================
# PERMISOS
# =========================
def require_admin(current_user: models.Usuario = Depends(get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Requiere permisos de administrador")
    return current_user


# =========================
# LISTAR USUARIOS (CON FILTRO)
# =========================
@router.get("/users", response_model=list[schemas.UsuarioPublico])
def list_users(
    rol: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(require_admin)
):
    query = db.query(models.Usuario)

    if rol:
        query = query.filter(models.Usuario.rol == rol)

    return query.all()


# =========================
# APROBAR / RECHAZAR 
# =========================
@router.put("/users/{user_id}/approve", response_model=schemas.UsuarioPublico)
def approve_user(
    user_id: int,
    is_approved: bool,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(require_admin)
):
    user = crud.get_user_by_id(db, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    try:
        updated = crud.update_user_approval(db, user_id, is_approved)
        return updated
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error al actualizar usuario")


# =========================
# ELIMINAR USUARIO (PRO LEVEL)
# =========================
@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(require_admin)
):
    user = crud.get_user_by_id(db, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if user.rol == "admin":
        raise HTTPException(status_code=400, detail="No puedes eliminar otro admin")

    try:
        db.delete(user)
        db.commit()
        return {"message": "Usuario eliminado correctamente"}
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error al eliminar usuario")