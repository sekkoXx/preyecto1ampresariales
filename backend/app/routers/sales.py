from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from .. import schemas, crud, models
from ..database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/ventas", tags=["ventas"])


@router.get("/", response_model=list[schemas.Venta])
def list_sales(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol not in ["admin", "seller"]:
        raise HTTPException(status_code=403, detail="No autorizado")

    return crud.get_sales(db)


@router.post("/", response_model=schemas.Venta)
def register_sale(
    sale: schemas.VentaCreate,
    db: Session = Depends(get_db),
    user: models.Usuario = Depends(get_current_user)
):
    try:
        buyer_id = user.id if user.rol == "buyer" else None
        return crud.create_sale(db, sale, buyer_id=buyer_id)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="Error en base de datos")


@router.get("/mis-compras", response_model=list[schemas.CompraResumen])
def my_purchases(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != "buyer":
        raise HTTPException(status_code=403, detail="Solo compradores")

    return crud.get_purchase_history(db, current_user.id)