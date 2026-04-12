from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import schemas, crud, models
from ..database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/productos", tags=["productos"])

def require_seller_or_admin(current_user: models.Usuario = Depends(get_current_user)):
    if current_user.rol not in ["admin", "seller"]:
        raise HTTPException(status_code=403, detail="Permisos insuficientes")
    return current_user

@router.get("/", response_model=list[schemas.Producto])
def list_products(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    # Any logged-in user can read products
    return crud.get_products(db)

@router.post("/", response_model=schemas.Producto)
def create_product(
    product: schemas.ProductoCreate, 
    db: Session = Depends(get_db), 
    user: models.Usuario = Depends(require_seller_or_admin)
):
    return crud.create_product(db, product)

@router.put("/{product_id}", response_model=schemas.Producto)
def edit_product(
    product_id: int, 
    data: schemas.ProductoCreate, 
    db: Session = Depends(get_db), 
    user: models.Usuario = Depends(require_seller_or_admin)
):
    updated = crud.update_product(db, product_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return updated

@router.delete("/{product_id}")
def delete_product(
    product_id: int, 
    db: Session = Depends(get_db), 
    user: models.Usuario = Depends(require_seller_or_admin)
):
    deleted = crud.delete_product(db, product_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"ok": True}
