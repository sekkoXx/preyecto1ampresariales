from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional

from .. import schemas, crud, models
from ..database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/productos", tags=["productos"])


# =========================
# PERMISOS
# =========================
def require_seller_or_admin(current_user: models.Usuario = Depends(get_current_user)):
    if current_user.rol not in ["admin", "seller"]:
        raise HTTPException(status_code=403, detail="Permisos insuficientes")
    return current_user


# =========================
# LISTAR CON FILTROS 
# =========================
@router.get("/", response_model=list[schemas.Producto])
def list_products(
    categoria: Optional[str] = Query(None),
    precio_min: Optional[float] = Query(None, ge=0),
    precio_max: Optional[float] = Query(None, ge=0),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    query = db.query(models.Producto)

    if categoria:
        query = query.filter(models.Producto.categoria.ilike(f"%{categoria}%"))

    if precio_min is not None:
        query = query.filter(models.Producto.precio >= precio_min)

    if precio_max is not None:
        query = query.filter(models.Producto.precio <= precio_max)

    return query.all()


# =========================
# CREAR
# =========================
@router.post("/", response_model=schemas.Producto)
def create_product(
    product: schemas.ProductoCreate,
    db: Session = Depends(get_db),
    user: models.Usuario = Depends(require_seller_or_admin)
):
    try:
        return crud.create_product(db, product, seller_id=user.id)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error al crear producto")


# =========================
# EDITAR
# =========================
@router.put("/{product_id}", response_model=schemas.Producto)
def edit_product(
    product_id: int,
    data: schemas.ProductoCreate,
    db: Session = Depends(get_db),
    user: models.Usuario = Depends(require_seller_or_admin)
):
    db_item = db.query(models.Producto).filter(models.Producto.id == product_id).first()

    if not db_item:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if user.rol != "admin" and db_item.seller_id != user.id:
        raise HTTPException(status_code=403, detail="No autorizado")

    try:
        return crud.update_product(db, product_id, data)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error al actualizar producto")


# =========================
# ELIMINAR
# =========================
@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    user: models.Usuario = Depends(require_seller_or_admin)
):
    db_item = db.query(models.Producto).filter(models.Producto.id == product_id).first()

    if not db_item:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if user.rol != "admin" and db_item.seller_id != user.id:
        raise HTTPException(status_code=403, detail="No autorizado")

    try:
        crud.delete_product(db, product_id)
        return {"message": "Producto eliminado correctamente"}
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error al eliminar producto")