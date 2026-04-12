from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import schemas, crud, models
from ..database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/ventas", tags=["ventas"])

@router.get("/", response_model=list[schemas.Venta])
def list_sales(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    return crud.get_sales(db)

@router.post("/", response_model=schemas.Venta)
def register_sale(
    sale: schemas.VentaCreate, 
    db: Session = Depends(get_db), 
    user: models.Usuario = Depends(get_current_user)
):
    try:
        return crud.create_sale(db, sale)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
